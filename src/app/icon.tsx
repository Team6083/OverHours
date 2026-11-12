import { appIcon } from "@/lib/app-icon";

export const SIZES = [192, 512];

export function generateImageMetadata() {
  return SIZES.map(size => ({ id: String(size), size: { width: size, height: size }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return appIcon(Number(await id));
}
