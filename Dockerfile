# MycoDAO Next.js — production image (standalone output)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS pulse_deps
WORKDIR /app/myco-pulse
COPY myco-pulse/package.json myco-pulse/package-lock.json ./
# npm ci fails on Alpine when lock omits Linux-only optional deps (e.g. utf-8-validate)
RUN npm install --ignore-scripts --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=pulse_deps /app/myco-pulse/node_modules ./myco-pulse/node_modules
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3004
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/config/blocks-producer ./config/blocks-producer
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3004
CMD ["node", "server.js"]
