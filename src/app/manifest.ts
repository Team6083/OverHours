import type { MetadataRoute } from "next";

import { SIZES } from "./icon";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OverHours",
    short_name: "OverHours",
    description: "Time and Attendance System",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: SIZES.flatMap(size => (["any", "maskable"] as const).map(purpose => ({
      src: `/icon/${size}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose,
    }))),
  };
}
