// Supabase Edge Function: notify-push
// Envia notificações push reais (funcionam mesmo com o app fechado)
// para todos os dispositivos registrados na tabela `push_subscriptions`.
//
// DEPENDE DE SETUP PRÉVIO:
//  1. Gerar VAPID keys (npx web-push generate-vapid-keys)
//  2. Adicionar secrets no Supabase: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
//  3. Criar tabela no Supabase:
//     create table push_subscriptions (
//       id uuid primary key default gen_random_uuid(),
//       endpoint text unique not null,
//       p256dh text not null,
//       auth text not null,
//       user_label text,
//       created_at timestamptz default now()
//     );
//  4. No frontend (index.html), subscrever ao push manager com a VAPID_PUBLIC_KEY
//     e POST pra este endpoint com action=subscribe.
//  5. Criar um database webhook (ou trigger) em `reservas` INSERT que POSTe
//     pra este endpoint com action=notify.
//
// Ações:
//   - subscribe   { subscription: PushSubscriptionJSON, label? }
//   - unsubscribe { endpoint }
//   - notify      { title, body, payload? }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@bandeirastay.com";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
      return json({ error: "Variáveis de ambiente ausentes (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)" }, 500);
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const body = await req.json();
    const action = body.action || "notify";

    if (action === "subscribe") {
      const sub = body.subscription;
      if (!sub || !sub.endpoint || !sub.keys) return json({ error: "Subscription inválida" }, 400);
      const { error } = await supabase.from("push_subscriptions").upsert({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_label: body.label || null,
      }, { onConflict: "endpoint" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "unsubscribe") {
      const endpoint = body.endpoint;
      if (!endpoint) return json({ error: "endpoint obrigatório" }, 400);
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      return json({ ok: true });
    }

    if (action === "notify") {
      const { title, body: corpo, payload } = body;
      if (!title) return json({ error: "title obrigatório" }, 400);
      const { data: subs } = await supabase.from("push_subscriptions").select("*");
      const msg = JSON.stringify({ title, body: corpo || "", payload: payload || {} });
      let ok = 0, fail = 0;
      await Promise.all((subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification({
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          }, msg);
          ok++;
        } catch (e: any) {
          fail++;
          // Remove subscription inválida
          if (e.statusCode === 404 || e.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
      }));
      return json({ ok: true, sent: ok, failed: fail });
    }

    return json({ error: "Ação desconhecida: " + action }, 400);

  } catch (err: any) {
    return json({ error: String(err?.message || err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
