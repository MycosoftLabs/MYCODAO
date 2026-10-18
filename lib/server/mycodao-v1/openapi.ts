/** Minimal OpenAPI 3.1 description of the public mycodao/v1 gateway (types: packages/mycodao-sdk). */

const list = (summary: string, params: Array<{ name: string; description: string }> = []) => ({
  get: {
    summary,
    parameters: params.map((p) => ({ name: p.name, in: "query", required: false, schema: { type: "string" }, description: p.description })),
    responses: { "200": { description: "Page envelope: { items, next_cursor, count, source, generated_at }" }, "503": { description: "Upstream unavailable" } },
  },
});

const authed = (method: "get" | "post", summary: string) => ({
  [method]: {
    summary,
    security: [{ supabaseBearer: [] }],
    responses: { "200": { description: "OK" }, "401": { description: "Sign in required" }, "503": { description: "Rewards service unavailable" } },
  },
});

export const MYCODAO_V1_OPENAPI = {
  openapi: "3.1.0",
  info: {
    title: "MycoDAO v1",
    version: "1.0.0",
    description:
      "Public API for Blocks v2, site v2 and the MYCO iOS/Android app. Content records live in MINDEX (schema mycodao); species rewards are proxied from the species-tokenization service.",
  },
  servers: [{ url: "https://blocks.mycodao.com/api/mycodao/v1" }, { url: "http://127.0.0.1:3020/api/mycodao/v1" }],
  components: {
    securitySchemes: { supabaseBearer: { type: "http", scheme: "bearer", description: "Supabase access token" } },
  },
  paths: {
    "/health": { get: { summary: "Gateway, MINDEX and rewards service status", responses: { "200": { description: "V1Health" } } } },
    "/routes": list("Release classification for each surface (ready, beta, private)"),
    "/pulse": list("Pulse feed: reviewed editorial items plus sourced live items", [
      { name: "feed", description: "progress | research | funding | catalog | markets | community" },
      { name: "pillar", description: "nature | science | money" },
      { name: "cursor", description: "Opaque cursor from next_cursor" },
      { name: "limit", description: "1-100" },
    ]),
    "/markets": list("MYCO first, then relevant bio and SOL/BTC/ETH rows with unit, currency, source and time"),
    "/projects": list("Projects"),
    "/projects/{slug}": { get: { summary: "Project with public milestones, funding needs and updates", responses: { "200": { description: "ProjectDetail" }, "404": { description: "Not found" } } } },
    "/funding-needs": list("Documented funding needs with stage (target to paid)"),
    "/organizations": list("Curated directory", [
      { name: "type", description: "society | lab | grower | funder | dao | other" },
      { name: "relationship", description: "independent_resource | documented_collaborator | funding_recipient" },
    ]),
    "/media": list("MycoPOD originals and curated external shows", [{ name: "ownership", description: "original | external" }]),
    "/myco": { get: { summary: "MYCO spec, utilities by release stage, and market quote", responses: { "200": { description: "MycoOverview" } } } },
    "/fungip/offerings": list("FungIP offerings with rights holder, permission basis and disclosure"),
    "/catalog": list("Tissue Catalog records", [
      { name: "record_type", description: "observation | stored_specimen | viable_culture | sequence | reference" },
      { name: "region", description: "san_diego | southern_california | pacific_northwest" },
      { name: "q", description: "Search text" },
      { name: "cursor", description: "Opaque cursor" },
    ]),
    "/rewards/status": { get: { summary: "Rewards service status (network, execution mode)", responses: { "200": { description: "RewardsStatus" } } } },
    "/rewards/me": authed("get", "Signed-in account: verified wallets and submitted observations"),
    "/rewards/history": authed("get", "Signed-in account reward history"),
    "/rewards/wallet/challenge": authed("post", "Request a wallet-link message to sign in Phantom (body: { wallet })"),
    "/rewards/wallet/verify": authed("post", "Submit the signed message (body: { wallet, nonce, signatureBase64 })"),
    "/rewards/discoveries": authed("post", "Submit an observation against a MINDEX taxon"),
  },
} as const;
