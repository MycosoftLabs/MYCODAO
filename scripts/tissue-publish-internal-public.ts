/**
 * One-shot: promote internal tissue rows to public visibility.
 * Run from MYCODAO root: npx tsx scripts/tissue-publish-internal-public.ts
 */
import { publishInternalTissueCatalog } from "../lib/server/biobank";

async function main() {
  const counts = await publishInternalTissueCatalog();
  console.log("Published internal → public:", counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
