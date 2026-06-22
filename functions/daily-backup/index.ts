// supabase/functions/daily-backup/index.ts
// Native daily backup Edge Function using database RPC and Storage upload.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  try {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const filename = `${date}_daily.json`;

    // 1. Export database to JSON
    const { data: dbJson, error: rpcError } = await supabase.rpc("export_database_to_json");
    if (rpcError) throw rpcError;

    // 2. Upload to storage
    const { error: uploadError } = await supabase.storage.from("backups").upload(
      filename,
      JSON.stringify(dbJson, null, 2),
      {
        contentType: "application/json",
        upsert: true,
      }
    );
    if (uploadError) throw uploadError;

    return new Response(JSON.stringify({ success: true, filename }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
