// Minimal ambient types for the `qrcode` package (no bundled @types).
declare module "qrcode" {
  type ECLevel = "L" | "M" | "Q" | "H";
  interface QRCodeColor {
    dark?: string;
    light?: string;
  }
  interface QRCodeToStringOptions {
    type?: "svg" | "utf8" | "terminal";
    margin?: number;
    width?: number;
    scale?: number;
    errorCorrectionLevel?: ECLevel;
    color?: QRCodeColor;
  }
  interface QRCodeToDataURLOptions {
    margin?: number;
    width?: number;
    scale?: number;
    errorCorrectionLevel?: ECLevel;
    color?: QRCodeColor;
  }
  const QRCode: {
    toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
    toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  };
  export default QRCode;
}
