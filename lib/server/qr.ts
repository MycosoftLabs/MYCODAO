/** Server-side QR generation (offline-capable; no CDN dependency at print time). */
import QRCode from "qrcode";

export async function qrSvg(
  text: string,
  opts?: { margin?: number; width?: number; dark?: string; light?: string },
): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: opts?.margin ?? 0,
    width: opts?.width,
    errorCorrectionLevel: "M",
    color: { dark: opts?.dark ?? "#000000", light: opts?.light ?? "#ffffff" },
  });
}

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
