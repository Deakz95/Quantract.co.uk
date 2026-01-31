declare module "qrcode" {
  export function toDataURL(
    text: string,
    options?: {
      errorCorrectionLevel?: "L" | "M" | "Q" | "H";
      type?: string;
      margin?: number;
      width?: number;
      color?: { dark?: string; light?: string };
    }
  ): Promise<string>;

  export function toBuffer(
    text: string,
    options?: {
      errorCorrectionLevel?: "L" | "M" | "Q" | "H";
      type?: string;
      margin?: number;
      width?: number;
      color?: { dark?: string; light?: string };
    }
  ): Promise<Buffer>;
}
