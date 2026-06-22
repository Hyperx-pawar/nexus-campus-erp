// d:/tenant/app/api/send-push/route.js
import { createClient } from '@supabase/supabase-js';
import webpush from '@/lib/web-push-helper';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { email, title, body, url } = await req.json();

    if (!email || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all subscriptions for this email
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('email', email);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active subscriptions for this email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/dashboard'
    });

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          return { success: true, id: sub.id };
        } catch (err) {
          // If subscription has expired or is no longer valid, delete it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          throw err;
        }
      })
    );

    const sentCount = results.filter(r => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ success: true, sentCount, total: subs.length }), {
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
