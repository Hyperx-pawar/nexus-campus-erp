import { headers } from 'next/headers';

export default async function manifest() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Resolve subdomain (e.g., dpsrkp.localhost:3000 or dpsrkp.nexus-erp-snowy.vercel.app)
  const hostParts = host.split('.');
  const subdomain = hostParts.length > 2 ? hostParts[0].toLowerCase() : '';

  let name = "Campus ERP Portal";
  let shortName = "CampusERP";
  let brandColor = "#2563EB";
  let iconUrl = "/globe.svg";

  if (subdomain === 'iitd') {
    name = "IIT Delhi Campus Portal";
    shortName = "IITD Portal";
    brandColor = "#2563EB";
  } else if (subdomain === 'dpsrkp') {
    name = "DPS RK Puram Portal";
    shortName = "DPS Portal";
    brandColor = "#16A34A";
  } else if (subdomain === 'ststephens') {
    name = "St. Stephen's College Portal";
    shortName = "Stephens Portal";
    brandColor = "#B91C1C";
  }

  return {
    name,
    short_name: shortName,
    description: "Multi-Tenant School & College Management Suite",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: brandColor,
    orientation: "portrait-primary",
    icons: [
      {
        src: iconUrl,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: iconUrl,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
