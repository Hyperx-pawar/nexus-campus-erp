// d:/tenant/app/api/push-subscribe/route.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { subscription, email, tenant_id } = await req.json();

    if (!subscription || !email || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const endpoint = subscription.endpoint;
    
    // First, delete any old subscriptions with this same endpoint to avoid duplicates
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('subscription->>endpoint', endpoint);

    // Now insert the new subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        email,
        tenant_id,
        subscription
      });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
