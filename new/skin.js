/* =====================================================================
   Bandeira Stay — motor de aparência
   Cor de destaque escolhida pelo usuário + claro/escuro/automático.
   Tudo derivado de UMA cor: o resto da paleta é calculado em HSL.
   Guarda a preferência no aparelho (localStorage) — cada pessoa tem a sua.
   ===================================================================== */
(function () {
  "use strict";

  var KEY_COR = "bsCor", KEY_MODO = "bsModo";
  var PADRAO = "#0B8074";

  var PRESETS = [
    ["#0B8074", "Teal"],    ["#0F766E", "Esmeralda"], ["#2563EB", "Azul"],
    ["#4F46E5", "Índigo"],  ["#7C3AED", "Roxo"],      ["#BE185D", "Framboesa"],
    ["#B91C1C", "Vermelho"],["#C2410C", "Laranja"],   ["#B4622E", "Areia"],
    ["#A16207", "Âmbar"],   ["#15803D", "Verde"],     ["#475569", "Grafite"]
  ];

  /* ---------------------------------------------------------- cor: utilidades */
  function hex2rgb(h) {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgb2hsl(c) {
    var r = c.r/255, g = c.g/255, b = c.b/255;
    var mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
    var h = 0, s = 0, l = (mx+mn)/2;
    if (d) {
      s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
      if (mx === r) h = ((g-b)/d + (g < b ? 6 : 0));
      else if (mx === g) h = (b-r)/d + 2;
      else h = (r-g)/d + 4;
      h *= 60;
    }
    return { h: h, s: s*100, l: l*100 };
  }
  function hsl(h, s, l) {
    return "hsl(" + Math.round(h) + " " + Math.round(clamp(s,0,100)) + "% " + Math.round(clamp(l,0,100)) + "%)";
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function luminancia(c) {
    function f(v){ v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); }
    return .2126*f(c.r) + .7152*f(c.g) + .0722*f(c.b);
  }
  function ehValida(v) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v||"")); }

  /* ---------------------------------------------------------- aplica a cor */
  function aplicarCor(hexCor) {
    if (!ehValida(hexCor)) hexCor = PADRAO;
    var rgb = hex2rgb(hexCor), c = rgb2hsl(rgb), st = document.documentElement.style;
    var escuro = document.documentElement.getAttribute("data-theme") === "dark";
    var sobre = luminancia(rgb) > .45 ? "#101010" : "#ffffff";   // texto legível em cima da cor

    if (escuro) {
      st.setProperty("--bs-brand",      hsl(c.h, clamp(c.s, 45, 82), clamp(c.l + 22, 52, 70)));
      st.setProperty("--bs-brand-dark", hsl(c.h, clamp(c.s, 45, 82), clamp(c.l + 32, 62, 78)));
      st.setProperty("--bs-brand-soft", hsl(c.h, clamp(c.s * .55, 18, 40), 17));
      st.setProperty("--bs-brand-ink",  hsl(c.h, clamp(c.s, 40, 70), 80));
      st.setProperty("--bs-on-brand",   hsl(c.h, 40, 10));
    } else {
      st.setProperty("--bs-brand",      hexCor);
      st.setProperty("--bs-brand-dark", hsl(c.h, clamp(c.s + 6, 20, 95), clamp(c.l - 11, 12, 45)));
      st.setProperty("--bs-brand-soft", hsl(c.h, clamp(c.s * .55, 22, 62), 94));
      st.setProperty("--bs-brand-ink",  hsl(c.h, clamp(c.s + 8, 25, 95), clamp(c.l - 14, 14, 40)));
      st.setProperty("--bs-on-brand",   sobre);
    }
    st.setProperty("--bs-brand-glow", hsl(c.h, clamp(c.s, 45, 85), 62));
    st.setProperty("--bs-rail",   hsl(c.h, clamp(c.s * .45, 12, 40), 7));
    st.setProperty("--bs-rail-2", hsl(c.h, clamp(c.s * .45, 12, 40), 11));
    st.setProperty("--bs-rail-3", hsl(c.h, clamp(c.s * .45, 12, 40), 20));

    // barra de status do iPhone / Android acompanha o tema
    var meta = document.getElementById("metaThemeColor") ||
               document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", escuro ? "#071214" : hexCor);
  }

  /* ---------------------------------------------------------- claro / escuro */
  function aplicarModo(modo) {
    var raiz = document.documentElement;
    if (modo === "auto" || !modo) {
      var prefereEscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      raiz.setAttribute("data-theme", prefereEscuro ? "dark" : "light");
      raiz.setAttribute("data-modo", "auto");
    } else {
      raiz.setAttribute("data-theme", modo);
      raiz.setAttribute("data-modo", modo);
    }
  }

  function ler(k, padrao) { try { return localStorage.getItem(k) || padrao; } catch (e) { return padrao; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var corAtual  = ler(KEY_COR, PADRAO);
  var modoAtual = ler(KEY_MODO, "auto");

  function repintar() { aplicarModo(modoAtual); aplicarCor(corAtual); }
  repintar();

  // se estiver no automático, segue o aparelho quando ele troca de tema
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var aoTrocar = function () { if (modoAtual === "auto") repintar(); };
    if (mq.addEventListener) mq.addEventListener("change", aoTrocar);
    else if (mq.addListener) mq.addListener(aoTrocar);
  }

  /* ---------------------------------------------------------- painel */
  function montarPainel() {
    if (document.getElementById("bsFab")) return;

    var fab = document.createElement("button");
    fab.id = "bsFab"; fab.className = "bs-fab"; fab.type = "button";
    fab.title = "Aparência"; fab.setAttribute("aria-label", "Aparência"); fab.textContent = "🎨";

    var painel = document.createElement("div");
    painel.id = "bsPanel"; painel.className = "bs-panel";
    painel.innerHTML =
      '<h4>Cor do sistema</h4><div class="bs-swatches" id="bsSw"></div>' +
      '<div class="bs-custom"><input type="color" id="bsCustom" value="' + corAtual + '">' +
      '<span>Outra cor</span><code id="bsHex">' + corAtual.toUpperCase() + '</code></div>' +
      '<h4>Aparência</h4><div class="bs-modes">' +
        '<button class="bs-mode" data-modo="light" type="button">☀️ Claro</button>' +
        '<button class="bs-mode" data-modo="dark" type="button">🌙 Escuro</button>' +
        '<button class="bs-mode" data-modo="auto" type="button">📱 Automático</button>' +
      '</div><button class="bs-reset" id="bsReset" type="button">Voltar ao padrão</button>';

    document.body.appendChild(fab);
    document.body.appendChild(painel);

    var sw = painel.querySelector("#bsSw");
    PRESETS.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "bs-sw"; b.type = "button"; b.style.background = p[0];
      b.title = p[1]; b.setAttribute("aria-label", p[1]); b.dataset.cor = p[0];
      b.addEventListener("click", function () { definirCor(p[0]); });
      sw.appendChild(b);
    });

    function marcar() {
      painel.querySelectorAll(".bs-sw").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.cor.toLowerCase() === corAtual.toLowerCase()));
      });
      painel.querySelectorAll(".bs-mode").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.modo === modoAtual));
      });
      var hexEl = painel.querySelector("#bsHex");
      if (hexEl) hexEl.textContent = corAtual.toUpperCase();
      var inp = painel.querySelector("#bsCustom");
      if (inp && ehValida(corAtual)) inp.value = corAtual;
    }

    function definirCor(v) { corAtual = v; gravar(KEY_COR, v); repintar(); marcar(); }

    painel.querySelector("#bsCustom").addEventListener("input", function (e) { definirCor(e.target.value); });
    painel.querySelectorAll(".bs-mode").forEach(function (b) {
      b.addEventListener("click", function () { modoAtual = b.dataset.modo; gravar(KEY_MODO, modoAtual); repintar(); marcar(); });
    });
    painel.querySelector("#bsReset").addEventListener("click", function () {
      modoAtual = "auto"; gravar(KEY_MODO, modoAtual); definirCor(PADRAO);
    });

    fab.addEventListener("click", function (e) { e.stopPropagation(); painel.classList.toggle("open"); marcar(); });
    document.addEventListener("click", function (e) {
      if (painel.classList.contains("open") && !painel.contains(e.target) && e.target !== fab) painel.classList.remove("open");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") painel.classList.remove("open"); });

    var tag = document.createElement("div");
    tag.className = "bs-tag"; tag.textContent = "versão nova";
    document.body.appendChild(tag);

    marcar();
  }

  /* ---------------------------------------------------------- atalhos do PWA (#calendario etc.) */
  function irPelaHash() {
    var id = (location.hash || "").replace("#", "");
    if (!id || typeof window.showPage !== "function") return;
    var alvo = document.querySelector('.menu-item[onclick*="\'' + id + "'\"]");
    if (document.getElementById(id)) window.showPage(id, alvo || null);
  }

  function iniciar() {
    montarPainel();
    setTimeout(irPelaHash, 600);          // depois que o login/app montam
    window.addEventListener("hashchange", irPelaHash);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
