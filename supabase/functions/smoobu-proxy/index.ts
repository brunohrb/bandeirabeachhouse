// Supabase Edge Function: Proxy para API do Smoobu
// Acoes: getReservations, getApartments, createBlock, createReservation, deleteReservation, updateReservation, getRates, updateRates

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SMOOBU_API_KEY = Deno.env.get("SMOOBU_API_KEY");
    if (!SMOOBU_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SMOOBU_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const action = body.action || "getReservations";

    // === ACAO: Buscar reservas ===
    if (action === "getReservations") {
      const { from, to, page = 1 } = body;
      if (!from || !to) {
        return new Response(
          JSON.stringify({ error: "Parameters 'from' and 'to' are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const params = new URLSearchParams({
        pageSize: "100", page: String(page),
        arrivalFrom: from, arrivalTo: to, showCancellation: "true",
      });

      const smoobuRes = await fetch(
        `https://login.smoobu.com/api/reservations?${params}`,
        { headers: { "Api-Key": SMOOBU_API_KEY, "Cache-Control": "no-cache" } }
      );

      if (!smoobuRes.ok) {
        const text = await smoobuRes.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${smoobuRes.status}`, details: text.slice(0, 500) }),
          { status: smoobuRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await smoobuRes.json();
      const items = data.reservations || data.bookings || [];

      const reservas = items.map((r: any) => {
        const arrival = r.arrival || r["check-in"] || "";
        const departure = r.departure || r["check-out"] || "";
        const isCancelled = r.type === "cancellation" || r.type === "cancelled" || String(r.status || "").toLowerCase().includes("cancel");
        const firstName = (r.firstname || r["first-name"] || r.firstName || "").trim();
        const lastName = (r.lastname || r["last-name"] || r.lastName || "").trim();
        const fullName = (r["guest-name"] || r.guestName || r.guest_name || (firstName + (lastName ? " " + lastName : "")) || "").trim();
        return {
          id: String(r.id),
          hospede: fullName,
          email: (r.email || r["guest-email"] || r.guestEmail || "").trim(),
          telefone: (r.phone || r["phone-number"] || r.phoneNumber || r.mobile || r["guest-phone"] || "").trim(),
          chegada: arrival, partida: departure,
          unidade: (r.apartment?.name || r.unit?.name || r.property?.name || "N/A").trim(),
          receita: parseFloat(r.totalPrice || r.total_price || r.price || r.amount || 0) || 0,
          comissao: parseFloat(r.commission || r.channelCommission || 0) || 0,
          canal: (r.channel?.name || r["channel-name"] || "").trim() || "Direto",
          numHospedes: (parseInt(r.adults || 0) + parseInt(r.children || 0)) || 1,
          status: isCancelled ? "cancelada" : "ativa",
        };
      });

      return new Response(
        JSON.stringify({ reservas, totalItems: data.total_items || items.length, pageCount: data.page_count || 1, currentPage: page }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Listar apartamentos do Smoobu ===
    if (action === "getApartments") {
      const res = await fetch("https://login.smoobu.com/api/apartments", {
        headers: { "Api-Key": SMOOBU_API_KEY }
      });
      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const data = await res.json();
      const apartments = (data.apartments || []).map((a: any) => ({ id: a.id, name: a.name }));
      return new Response(
        JSON.stringify({ apartments }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Listar canais/portais disponiveis no Smoobu ===
    if (action === "getChannels") {
      const res = await fetch("https://login.smoobu.com/api/channels", {
        headers: { "Api-Key": SMOOBU_API_KEY }
      });
      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const data = await res.json();
      return new Response(
        JSON.stringify({ channels: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Criar bloqueio no Smoobu ===
    if (action === "createBlock") {
      const { apartmentId, arrivalDate, departureDate } = body;
      if (!apartmentId || !arrivalDate || !departureDate) {
        return new Response(
          JSON.stringify({ error: "apartmentId, arrivalDate and departureDate are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch("https://login.smoobu.com/api/reservations", {
        method: "POST",
        headers: {
          "Api-Key": SMOOBU_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          arrivalDate: arrivalDate,
          departureDate: departureDate,
          apartmentId: apartmentId,
          channelId: 70,
          firstName: "Bloqueio",
          lastName: "Sistema",
          email: "bloqueio@bandeira.com",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ success: true, reservation: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Criar reserva no Smoobu (direta/manual) ===
    if (action === "createReservation") {
      const { apartmentId, arrivalDate, departureDate, firstName, lastName, email, price, notice, adults, children, channelId } = body;
      if (!apartmentId || !arrivalDate || !departureDate) {
        return new Response(
          JSON.stringify({ error: "apartmentId, arrivalDate and departureDate are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const reqBody: Record<string, unknown> = {
        arrivalDate,
        departureDate,
        apartmentId,
        firstName: firstName || "Hospede",
        lastName: lastName || "Direto",
        email: email || "reserva@bandeira.com",
      };
      if (channelId) reqBody.channelId = channelId;
      if (price) reqBody.price = price;
      if (notice) reqBody.notice = notice;
      if (adults) reqBody.adults = adults;
      if (children) reqBody.children = children;

      const res = await fetch("https://login.smoobu.com/api/reservations", {
        method: "POST",
        headers: {
          "Api-Key": SMOOBU_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ success: true, reservation: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Excluir reserva no Smoobu ===
    if (action === "deleteReservation") {
      const { reservationId } = body;
      if (!reservationId) {
        return new Response(
          JSON.stringify({ error: "reservationId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`https://login.smoobu.com/api/reservations/${reservationId}`, {
        method: "DELETE",
        headers: { "Api-Key": SMOOBU_API_KEY },
      });

      // Smoobu retorna 204 No Content em caso de sucesso
      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Atualizar reserva no Smoobu ===
    if (action === "updateReservation") {
      const { reservationId, arrivalDate, departureDate, firstName, lastName, email, price, notice } = body;
      if (!reservationId) {
        return new Response(
          JSON.stringify({ error: "reservationId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateBody: Record<string, unknown> = {};
      if (arrivalDate) updateBody.arrivalDate = arrivalDate;
      if (departureDate) updateBody.departureDate = departureDate;
      if (firstName) updateBody.firstName = firstName;
      if (lastName) updateBody.lastName = lastName;
      if (email) updateBody.email = email;
      if (price !== undefined) updateBody.price = price;
      if (notice) updateBody.notice = notice;

      const res = await fetch(`https://login.smoobu.com/api/reservations/${reservationId}`, {
        method: "PUT",
        headers: {
          "Api-Key": SMOOBU_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ success: true, reservation: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Buscar precos/tarifas de um apartamento ===
    if (action === "getRates") {
      const { apartmentId, startDate, endDate } = body;
      if (!apartmentId || !startDate || !endDate) {
        return new Response(
          JSON.stringify({ error: "apartmentId, startDate and endDate are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const params = new URLSearchParams();
      params.append("start_date", startDate);
      params.append("end_date", endDate);
      params.append("apartments[]", String(apartmentId));

      const res = await fetch(
        `https://login.smoobu.com/api/rates?${params}`,
        { headers: { "Api-Key": SMOOBU_API_KEY } }
      );

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ rates: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Atualizar precos/tarifas de um apartamento ===
    if (action === "updateRates") {
      const { apartmentId, dateRange } = body;
      if (!apartmentId || !dateRange) {
        return new Response(
          JSON.stringify({ error: "apartmentId and dateRange are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Formato correto: apartments + operations com dates
      // dates: "YYYY-MM-DD" para dia unico ou "YYYY-MM-DD:YYYY-MM-DD" para range
      const dateStr = dateRange.start_date === dateRange.end_date
        ? dateRange.start_date
        : `${dateRange.start_date}:${dateRange.end_date}`;

      const operation: Record<string, unknown> = {
        dates: [dateStr],
      };
      if (dateRange.daily_price) operation.daily_price = Number(dateRange.daily_price);
      if (dateRange.min_length_of_stay) operation.min_length_of_stay = Number(dateRange.min_length_of_stay);

      const ratesBody = {
        apartments: [Number(apartmentId)],
        operations: [operation],
      };

      const res = await fetch("https://login.smoobu.com/api/rates", {
        method: "POST",
        headers: {
          "Api-Key": SMOOBU_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ratesBody),
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ success: true, result: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Buscar threads de mensagens ===
    if (action === "getThreads") {
      const { page = 1, pageSize = 50 } = body;
      const params = new URLSearchParams({
        page_number: String(page),
        page_size: String(pageSize),
      });

      const res = await fetch(
        `https://login.smoobu.com/api/threads?${params}`,
        { headers: { "Api-Key": SMOOBU_API_KEY } }
      );

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ threads: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Buscar mensagens de uma reserva ===
    if (action === "getMessages") {
      const { reservationId, page = 1 } = body;
      if (!reservationId) {
        return new Response(
          JSON.stringify({ error: "reservationId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const params = new URLSearchParams({ page: String(page) });
      const res = await fetch(
        `https://login.smoobu.com/api/reservations/${reservationId}/messages?${params}`,
        { headers: { "Api-Key": SMOOBU_API_KEY } }
      );

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ messages: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Enviar mensagem para hospede ===
    if (action === "sendMessage") {
      const { reservationId, messageBody, subject } = body;
      if (!reservationId || !messageBody) {
        return new Response(
          JSON.stringify({ error: "reservationId and messageBody are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const msgBody: Record<string, unknown> = { messageBody };
      if (subject) msgBody.subject = subject;

      const res = await fetch(
        `https://login.smoobu.com/api/reservations/${reservationId}/messages/send-message-to-guest`,
        {
          method: "POST",
          headers: {
            "Api-Key": SMOOBU_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(msgBody),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({ error: `Smoobu API ${res.status}`, details: text.slice(0, 500) }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let data;
      try { data = await res.json(); } catch { data = { sent: true }; }
      return new Response(
        JSON.stringify({ success: true, result: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACAO: Proxy para Evolution API (WhatsApp) ===
    if (action === "whatsappProxy") {
      const { waUrl, waApiKey, waInstanceName, waEndpoint, waMethod, waBody } = body;
      if (!waUrl || !waApiKey || !waEndpoint) {
        return new Response(
          JSON.stringify({ error: "waUrl, waApiKey and waEndpoint are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const url = waUrl.replace(/\/$/, "") + waEndpoint;
      const fetchOpts: RequestInit = {
        method: waMethod || "GET",
        headers: {
          "apikey": waApiKey,
          "Content-Type": "application/json",
        },
      };

      if (waMethod && waMethod !== "GET" && waBody) {
        fetchOpts.body = JSON.stringify(waBody);
      }

      try {
        const res = await fetch(url, fetchOpts);
        const contentType = res.headers.get("content-type") || "";
        let data;
        if (contentType.includes("application/json")) {
          data = await res.json();
        } else {
          data = { text: await res.text() };
        }

        return new Response(
          JSON.stringify(data),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (fetchErr: any) {
        return new Response(
          JSON.stringify({ error: "Evolution API error: " + (fetchErr.message || "unknown"), endpoint: waEndpoint }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Unknown action: " + action }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
