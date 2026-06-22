// supabase/functions/cleanup-backups/index.ts
// Native cleanup Edge Function (no-op: retains all backups).
Deno.serve(async (req: Request) => {
  return new Response("Cleanup disabled – all backups retained", { status: 200 });
});
