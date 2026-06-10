#!/usr/bin/env bash
# =============================================================================
# MycoDAO BLOCKS — Blue/Green zero-downtime deploy (blocks.mycodao.com)
# =============================================================================
# Run on VM 192.168.0.198 as user mycosoft.
#
#   DEPLOY_DIR=/opt/mycodao scripts/blue-green-deploy.sh
#   DEPLOY_DIR=/opt/mycodao scripts/blue-green-deploy.sh --rollback
#
# Flow: build idle slot → health 3× → nginx reload → flip state → stop old slot
# =============================================================================
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/mycodao}"
STATE_DIR="${STATE_DIR:-/opt/mycodao/state}"
NGINX_DIR="${NGINX_DIR:-/opt/mycodao/nginx}"
LOG_FILE="${LOG_FILE:-/tmp/mycodao-deploys.log}"
COMPOSE_FILES=("-f" "docker-compose.yml" "-f" "docker-compose.blue-green.yml")
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-240}"
HEALTH_STREAK="${HEALTH_STREAK:-3}"
ROLLBACK_WINDOW="${ROLLBACK_WINDOW:-300}"
PUBLIC_HOST="${PUBLIC_HOST:-blocks.mycodao.com}"
CF_ZONE_ID="${CF_ZONE_ID:-}"
CF_API_TOKEN="${CF_API_TOKEN:-}"

load_deploy_env() {
  local f="${DEPLOY_ENV_FILE:-/opt/mycodao/deploy.env}"
  if [[ -f "$f" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$f"
    set +a
  fi
  CF_ZONE_ID="${CF_ZONE_ID:-${CLOUDFLARE_ZONE_ID:-}}"
  CF_API_TOKEN="${CF_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
}

c_red=$'\033[0;31m'; c_grn=$'\033[0;32m'; c_ylw=$'\033[1;33m'; c_blu=$'\033[0;34m'; c_clr=$'\033[0m'
_ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "${c_blu}[$(_ts)]${c_clr} $*" | tee -a "$LOG_FILE"; }
ok()  { echo "${c_grn}[$(_ts)] OK${c_clr} $*" | tee -a "$LOG_FILE"; }
warn(){ echo "${c_ylw}[$(_ts)] WARN${c_clr} $*" | tee -a "$LOG_FILE"; }
err() { echo "${c_red}[$(_ts)] ERR${c_clr} $*" | tee -a "$LOG_FILE" 1>&2; }

load_deploy_env
mkdir -p "$STATE_DIR" "$NGINX_DIR/conf.d" "$(dirname "$LOG_FILE")"

ACTIVE_FILE="$STATE_DIR/active-slot"
if [[ -s "$ACTIVE_FILE" ]]; then
  ACTIVE=$(tr -d '[:space:]' < "$ACTIVE_FILE")
  [[ "$ACTIVE" == "blue" || "$ACTIVE" == "green" ]] || { err "Invalid active-slot: $ACTIVE"; exit 3; }
else
  ACTIVE="blue"
fi
IDLE=$([[ "$ACTIVE" == "blue" ]] && echo "green" || echo "blue")

MODE="cutover"
case "${1:-}" in
  --rollback) MODE="rollback" ;;
  --verify)   MODE="verify" ;;
  --bootstrap) MODE="bootstrap" ;;
  --cutover|"") MODE="cutover" ;;
  *) err "Unknown arg: $1"; exit 4 ;;
esac

cd "$DEPLOY_DIR"
compose() { docker compose "${COMPOSE_FILES[@]}" "$@"; }

install_nginx_base_conf() {
  local src="$DEPLOY_DIR/deploy/nginx/nginx.conf"
  local dst="$NGINX_DIR/nginx.conf"
  [[ -f "$src" ]] || { err "Missing $src"; return 1; }
  cp "$src" "$dst"
  ok "nginx base → $dst"
}

render_nginx_conf_for() {
  local target="$1"
  local tmpl="$DEPLOY_DIR/deploy/nginx/conf.d/blocks.conf.template"
  local out="$NGINX_DIR/conf.d/blocks.conf"
  sed "s|__ACTIVE_SLOT__|$target|g" "$tmpl" > "$out"
  ok "nginx upstream → mycodao-$target"
}

reload_proxy() {
  local out rc
  out=$(docker exec mycodao-proxy sh -c 'nginx -t' 2>&1) && rc=0 || rc=$?
  echo "$out" | tee -a "$LOG_FILE" >/dev/null
  (( rc == 0 )) || { err "nginx -t failed"; return 1; }
  docker exec mycodao-proxy nginx -s reload
  ok "nginx reloaded"
}

wait_healthy() {
  local slot="$1"
  local cid="mycodao-${slot}"
  local deadline=$(( $(date +%s) + HEALTH_TIMEOUT )) streak=0
  log "Health $cid ($HEALTH_STREAK×, ${HEALTH_TIMEOUT}s)"
  while (( $(date +%s) < deadline )); do
    if docker exec "$cid" node -e \
      "require('http').get('http://127.0.0.1:3004${HEALTH_PATH}',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" \
      >/dev/null 2>&1; then
      streak=$((streak + 1))
      (( streak >= HEALTH_STREAK )) && { ok "$slot healthy"; return 0; }
    else
      streak=0
    fi
    sleep 3
  done
  err "$slot unhealthy"; docker logs --tail 60 "$cid" | tee -a "$LOG_FILE"; return 1
}

purge_cloudflare() {
  if [[ -z "$CF_ZONE_ID" || -z "$CF_API_TOKEN" ]]; then
    warn "CF_ZONE_ID/CF_API_TOKEN unset — skip Cloudflare purge"
    return 0
  fi
  local resp
  resp=$(curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"purge_everything":true}') || { err "CF purge network error"; return 1; }
  echo "$resp" | grep -q '"success":true' && ok "Cloudflare purged" || { err "CF purge failed: $resp"; return 1; }
}

stop_slot() {
  local slot="$1"
  local cid="mycodao-${slot}"
  docker ps --format '{{.Names}}' | grep -qx "$cid" || return 0
  docker stop -t 30 "$cid" >/dev/null || true
  docker rm -f "$cid" >/dev/null || true
  ok "Stopped $cid"
}

if [[ "$MODE" == "bootstrap" ]]; then
  log "Bootstrap blue/green stack"
  export COMPOSE_BAKE=false
  export DOCKER_BUILDKIT=0
  install_nginx_base_conf
  render_nginx_conf_for "blue"
  docker stop mycodao-app mycodao-green 2>/dev/null || true
  docker rm -f mycodao-app mycodao-green 2>/dev/null || true
  export MYCODAO_IMAGE_BLUE="mycodao:blue"
  compose build mycodao-blue
  if [[ -f scripts/seed-blocks-producer-data.sh ]]; then
    chmod +x scripts/seed-blocks-producer-data.sh
    MYCODAO_DATA_DIR="${MYCODAO_DATA_DIR:-/opt/mycodao/data}" bash scripts/seed-blocks-producer-data.sh "$DEPLOY_DIR" || true
  fi
  compose up -d mycodao-proxy mycodao-blue
  wait_healthy blue
  echo "blue" > "$ACTIVE_FILE"
  purge_cloudflare || true
  ok "Bootstrap complete — proxy on :3004, active=blue"
  exit 0
fi

if [[ "$MODE" == "verify" ]]; then
  slot=$(curl -sSI "https://${PUBLIC_HOST}/healthz" --max-time 10 \
    | awk -F': *' 'tolower($1)=="x-active-slot"{gsub("\r",""); print tolower($2)}' || true)
  log "Public X-Active-Slot=${slot:-unknown} (expected $ACTIVE)"
  exit 0
fi

if [[ "$MODE" == "rollback" ]]; then
  log "Rollback $ACTIVE → $IDLE"
  install_nginx_base_conf
  render_nginx_conf_for "$IDLE"
  compose --profile green up -d "mycodao-$IDLE" 2>/dev/null || compose up -d "mycodao-$IDLE"
  wait_healthy "$IDLE"
  reload_proxy
  echo "$IDLE" > "$ACTIVE_FILE"
  purge_cloudflare || true
  ok "Rolled back to $IDLE"
  exit 0
fi

# ───── CUTOVER ───────────────────────────────────────────────────────────────
TAG="mycodao:${IDLE}-$(date +%Y%m%d%H%M%S)"
log "Cutover active=$ACTIVE idle=$IDLE tag=$TAG"

git pull --ff-only origin main || warn "git pull failed — building current tree"

if [[ -f scripts/seed-blocks-producer-data.sh ]]; then
  chmod +x scripts/seed-blocks-producer-data.sh
  MYCODAO_DATA_DIR="${MYCODAO_DATA_DIR:-/opt/mycodao/data}" bash scripts/seed-blocks-producer-data.sh "$DEPLOY_DIR" \
    || warn "producer preset sync failed — check /opt/mycodao/data permissions"
fi

export COMPOSE_BAKE=false
export DOCKER_BUILDKIT=0
install_nginx_base_conf

if [[ "$IDLE" == "green" ]]; then
  export MYCODAO_IMAGE_GREEN="$TAG"
  compose --profile green build mycodao-green
  compose --profile green up -d mycodao-green
else
  export MYCODAO_IMAGE_BLUE="$TAG"
  compose build mycodao-blue
  compose up -d mycodao-blue
fi

wait_healthy "$IDLE"
render_nginx_conf_for "$IDLE"
reload_proxy
echo "$IDLE" > "$ACTIVE_FILE"
purge_cloudflare || true

log "Rollback window ${ROLLBACK_WINDOW}s — keeping $ACTIVE alive"
sleep "$ROLLBACK_WINDOW"
stop_slot "$ACTIVE"
ok "Cutover complete — active=$IDLE"
