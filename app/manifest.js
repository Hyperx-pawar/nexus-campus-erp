import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export default async function manifest() {
  const headersList = await headers();
  const host = (headersList.get('host') || '').toLowerCase();
  
  // Resolve subdomain (e.g., dpsrkp.localhost:3000 or dpsrkp.nexus-erp-snowy.vercel.app)
  const hostParts = host.split('.');
  const subdomain = hostParts.length > 2 ? hostParts[0].toLowerCase() : '';

  let name = "Campus ERP Portal";
  let shortName = "CampusERP";
  let brandColor = "#2563EB";
  let iconUrl = "/globe.svg";

  let matchedTenant = null;

  // 1. Try querying Supabase database
  try {
    const supabase = await createClient();
    const { data: dbTenants } = await supabase.from('tenants').select('*');
    if (dbTenants && dbTenants.length > 0) {
      // Match custom_domain (exact match)
      matchedTenant = dbTenants.find(t => t.custom_domain && t.custom_domain.toLowerCase() === host);
      
      // Match subdomain
      if (!matchedTenant && subdomain) {
        matchedTenant = dbTenants.find(t => t.subdomain.toLowerCase() === subdomain);
      }
    }
  } catch (err) {
    console.warn("Manifest: Supabase connection failed, using local mock resolver.");
  }

  // 2. Local fallback list matching
  if (!matchedTenant) {
    const mockTenants = [
      { subdomain: 'iitd', customDomain: 'portal.iitd.ac.in', name: 'IIT Delhi Campus Portal', shortName: 'IITD Portal', brandColor: '#2563EB' },
      { subdomain: 'dpsrkp', customDomain: 'portal.dpsrkp.in', name: 'DPS RK Puram Portal', shortName: 'DPS Portal', brandColor: '#16A34A' },
      { subdomain: 'ststephens', customDomain: 'stephens.edu', name: "St. Stephen's College Portal", shortName: 'Stephens Portal', brandColor: '#B91C1C' },
    ];

    matchedTenant = mockTenants.find(t => t.customDomain && t.customDomain.toLowerCase() === host);
    if (!matchedTenant && subdomain) {
      matchedTenant = mockTenants.find(t => t.subdomain.toLowerCase() === subdomain);
    }
  }

  if (matchedTenant) {
    name = matchedTenant.name;
    // Handle database field vs mock field
    shortName = matchedTenant.shortName || matchedTenant.short_name || (matchedTenant.name.includes('(') ? matchedTenant.name.split(' (')[0] : matchedTenant.name);
    brandColor = matchedTenant.brandColor || matchedTenant.brand_color || '#2563EB';
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
