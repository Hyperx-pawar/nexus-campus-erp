// d:/tenant/scripts/create_backup_bucket.ts
// Deno script that creates a Supabase storage bucket named "backups"
// Uses the credentials from the .env file (SUPABASE_URL, SUPABASE_ANON_KEY)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.2";
import { config } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Load env vars (fallback to process.env for safety)
const env = await config({ export: true }).catch(() => Deno.env.toObject());
const supabaseUrl = env["SUPABASE_URL"];
const supabaseKey = env["SUPABASE_ANON_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureBucket(name: string) {
  // Try to create; if it already exists Supabase returns an error with code "bucket_exists"
  const { data, error } = await supabase.storage.createBucket(name, {
    public: false,
    allowedMimeTypes: ["application/octet-stream"],
  });
  if (error) {
    // If bucket already exists, ignore; otherwise surface the error
    if (error.message.includes("already exists")) {
      console.log(`Bucket "${name}" already exists`);
    } else {
      console.error("Failed to create bucket:", error.message);
      Deno.exit(1);
    }
  } else {
    console.log(`Bucket "${name}" created successfully`);
  }
}

await ensureBucket("backups");
