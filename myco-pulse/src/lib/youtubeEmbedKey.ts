/** Client-side stable key for YouTube iframe (playlist vs single video). */
export function youtubeEmbedStableKey(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    const list = url.searchParams.get("list");
    const v = url.pathname.split("/").filter(Boolean).pop();
    return list ? `pl-${list}` : `v-${v ?? embedUrl}`;
  } catch {
    return embedUrl;
  }
}
