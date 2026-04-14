// Supabase Edge Function: admin-users
// Permite operações administrativas na tabela `usuarios` bypassando RLS,
// usando a SUPABASE_SERVICE_ROLE_KEY (armazenada como secret no Supabase).
//
// Ações:
//   - createUser   { usuario, senha, unidades_permitidas?, tipo? }
//   - updateUser   { id, fields }
//   - deleteUser   { id }
//   - listUsers    {}
//
// Segurança: esta função só deve ser chamada por clientes autenticados (já existe
// um login próprio no app, que protege `adminToken`). Em produção, considere validar
// um header X-Admin-Token pra evitar uso indevido.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN") || ""; // opcional

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados" }, 500);
    }

    // Opcional: exige um token admin no header
    if (ADMIN_TOKEN) {
      const provided = req.headers.get("x-admin-token") || "";
      if (provided !== ADMIN_TOKEN) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const action = body.action || "createUser";

    if (action === "createUser") {
      const { usuario, senha, unidades_permitidas, tipo } = body;
      if (!usuario || !senha) return json({ error: "usuario e senha são obrigatórios" }, 400);

      const { data, error } = await supabase.from("usuarios").insert({
        usuario,
        senha,
        tipo: tipo || "viewer",
        unidades_permitidas: (Array.isArray(unidades_permitidas) && unidades_permitidas.length > 0)
          ? unidades_permitidas : null,
        ativo: true,
      }).select().maybeSingle();

      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, user: data });
    }

    if (action === "updateUser") {
      const { id, fields } = body;
      if (!id || !fields) return json({ error: "id e fields são obrigatórios" }, 400);
      const { data, error } = await supabase.from("usuarios").update(fields).eq("id", id).select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, user: data });
    }

    if (action === "deleteUser") {
      const { id } = body;
      if (!id) return json({ error: "id é obrigatório" }, 400);
      const { error } = await supabase.from("usuarios").delete().eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "listUsers") {
      const { data, error } = await supabase.from("usuarios").select("*").order("usuario");
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, users: data });
    }

    return json({ error: "Ação desconhecida: " + action }, 400);

  } catch (err) {
    return json({ error: String((err as any)?.message || err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
