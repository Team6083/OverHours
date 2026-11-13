import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OverHours",
    short_name: "OverHours",
    description: "Time and Attendance System",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [192, 512].flatMap(size => [
      { src: `/icons/icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" as const },
      { src: `/icons/maskable-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" as const },
    ]),
  };
}
