#!/bin/bash
# =====================================================================
#  Bandeira Stay - instala o VISUAL NOVO em <sistema>/new/
#  A pasta de producao NAO e tocada. Pode rodar quantas vezes quiser.
#  Uso:  bash instalar-visual-novo.sh [/caminho/para/temporada]
# =====================================================================
set -u

SITE="${1:-}"
if [ -z "$SITE" ]; then
  echo "Procurando a pasta do sistema..."
  for f in $(find / -maxdepth 8 -type f -name index.html -path '*temporada*' \
             -not -path '/proc/*' -not -path '/tmp/*' 2>/dev/null); do
    d=$(dirname "$f")
    if [ -f "$d/manifest.webmanifest" ] && [ -f "$d/logo-nobg.png" ]; then SITE="$d"; break; fi
  done
fi
if [ -z "$SITE" ] || [ ! -f "$SITE/index.html" ]; then
  echo "NAO ACHEI a pasta do sistema."
  echo "Rode de novo passando o caminho, ex.:  bash $0 /var/www/html/temporada"
  exit 1
fi
export SITE
echo "Sistema encontrado em: $SITE"
echo

cp -a "$SITE/index.html" "$SITE/index.html.bak-$(date +%Y%m%d-%H%M%S)" 2>/dev/null
mkdir -p "$SITE/new" || exit 1
echo "Montando a versao nova em $SITE/new/"

python3 - <<'FIM_PATCH'
import io, re, sys, os
site = os.environ["SITE"]
h = io.open(os.path.join(site, "index.html"), encoding="utf-8").read()
falhas = []

def troca(velho, novo, obrigatorio=True, todos=False):
    global h
    if velho in h: h = h.replace(velho, novo) if todos else h.replace(velho, novo, 1)
    elif obrigatorio: falhas.append(velho[:55])

troca('<link rel="apple-touch-icon" href="logo-nobg.png">',
      '<link rel="apple-touch-icon" href="apple-touch-icon.png">')
h = re.sub(r'<link rel="apple-touch-icon" sizes="(180x180|152x152|120x120)" href="logo-nobg\.png">', '', h)
troca('<link rel="icon" type="image/png" href="logo-nobg.png">',
      '<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">')
troca('<img src="logo-nobg.png"', '<img src="icon-512.png"', todos=True)
troca('<meta name="theme-color" content="#2d7a7a">',
      '<meta name="theme-color" content="#2d7a7a" id="metaThemeColor">\n    <meta name="color-scheme" content="light dark">')

boot = "    <script>\n" \
  "    /* aplica o tema salvo antes da primeira pintura - evita o flash branco no iPhone */\n" \
  "    (function(){try{\n" \
  "      var m=localStorage.getItem('bsModo')||'auto',c=localStorage.getItem('bsCor')||'#0B8074',r=document.documentElement;\n" \
  "      var esc=(m==='dark')||(m==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);\n" \
  "      r.setAttribute('data-theme',esc?'dark':'light');\n" \
  "      if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)&&!esc)r.style.setProperty('--bs-brand',c);\n" \
  "    }catch(e){}})();\n" \
  "    </script>\n" \
  '    <link rel="stylesheet" href="skin.css">\n</head>'
if h.count("</head>") == 1: h = h.replace("</head>", boot, 1)
else: falhas.append("</head> nao esta unico")

troca("</body>", '<script src="skin.js"></script>\n</body>')
troca("const url = new URL('movi.html', window.location.href).href;",
      "const url = new URL('../movi.html', window.location.href).href;", obrigatorio=False)

if falhas:
    print("   ERRO: nao encontrei no index.html -> " + "; ".join(falhas)); sys.exit(1)
io.open(os.path.join(site, "new", "index.html"), "w", encoding="utf-8").write(h)
print("   index.html copiado e ajustado (%d KB)" % (len(h)//1024))
FIM_PATCH
if [ $? -ne 0 ]; then echo; echo "PAROU. Nada foi alterado no seu sistema."; exit 1; fi

if [ -f "$SITE/service-worker.js" ]; then
  sed -e "s/const CACHE_NAME = '[^']*';/const CACHE_NAME = 'bandeira-new-v1';/" \
      -e "s|'./movi.html',|'./skin.css',\n    './skin.js',|" \
      "$SITE/service-worker.js" > "$SITE/new/service-worker.js"
  echo "   service-worker.js proprio (cache separado do de producao)"
fi

python3 - <<'FIM_ICONES'
import os, sys
site = os.environ["SITE"]
try:
    from PIL import Image
except ImportError:
    sys.exit(2)
src = os.path.join(site, "logo-nobg.png")
if not os.path.exists(src): sys.exit(2)
logo = Image.open(src).convert("RGBA"); logo = logo.crop(logo.getbbox())
def build(tam, folga, nome):
    c = Image.new("RGBA", (tam, tam), (255,255,255,255))
    l = logo.copy(); alvo = int(tam*(1-folga*2)); l.thumbnail((alvo,alvo), Image.LANCZOS)
    c.paste(l, ((tam-l.width)//2, (tam-l.height)//2), l)
    c.convert("RGB").save(os.path.join(site,"new",nome), "PNG", optimize=True)
build(192,.10,"icon-192.png"); build(512,.10,"icon-512.png"); build(1024,.10,"icon-1024.png")
build(512,.21,"icon-maskable-512.png"); build(180,.09,"apple-touch-icon.png")
print("   icones opacos gerados a partir do seu logo")
FIM_ICONES
if [ $? -ne 0 ]; then
  for n in icon-192.png icon-512.png icon-1024.png icon-maskable-512.png apple-touch-icon.png; do
    cp -f "$SITE/logo-nobg.png" "$SITE/new/$n" 2>/dev/null
  done
  echo "   icones = seu logo atual (pra ficarem perfeitos no iPhone: 'pip3 install pillow' e rode de novo)"
fi

cat > "$SITE/new/manifest.webmanifest" <<'FIM_MANIFEST'
{
  "name": "Bandeira Stay Manager",
  "short_name": "Bandeira Stay",
  "description": "Sistema de gestão de reservas — Bandeira Beach House",
  "lang": "pt-BR",
  "dir": "ltr",
  "start_url": "./index.html",
  "scope": "./",
  "id": "./",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui"],
  "orientation": "any",
  "background_color": "#ffffff",
  "theme_color": "#2d7a7a",
  "categories": ["business", "productivity"],
  "icons": [
    { "src": "icon-192.png",           "sizes": "192x192",   "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png",           "sizes": "512x512",   "type": "image/png", "purpose": "any" },
    { "src": "icon-1024.png",          "sizes": "1024x1024", "type": "image/png", "purpose": "any" },
    { "src": "icon-maskable-512.png",  "sizes": "512x512",   "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Calendário",  "short_name": "Calendário",  "url": "./index.html#calendario", "icons": [{ "src": "icon-192.png", "sizes": "192x192" }] },
    { "name": "Financeiro",  "short_name": "Financeiro",  "url": "./index.html#financeiro", "icons": [{ "src": "icon-192.png", "sizes": "192x192" }] },
    { "name": "Reservas Futuras", "short_name": "Limpeza", "url": "./index.html#reservas",  "icons": [{ "src": "icon-192.png", "sizes": "192x192" }] }
  ]
}
FIM_MANIFEST
echo "   manifest.webmanifest"

cat > "$SITE/new/skin.css" <<'FIM_CSS'
/* =====================================================================
   Bandeira Stay — SKIN v1
   Carregado DEPOIS do CSS original: redesenha o app sem tocar no HTML.
   A cor de destaque vem do seletor de aparência (skin.js) → variáveis --bs-*.
   ===================================================================== */

:root{
  /* base do tema — skin.js sobrescreve --bs-brand* conforme a cor escolhida */
  --bs-brand:#0B8074; --bs-brand-dark:#065F56; --bs-brand-soft:#DFF1ED;
  --bs-brand-ink:#065F56; --bs-on-brand:#fff; --bs-brand-glow:#2ECFB6;
  --bs-rail:#071A1C; --bs-rail-2:#0C2528; --bs-rail-3:#14383A;

  --bs-ground:#EEF2F0; --bs-surface:#fff; --bs-surface-2:#F7FAF8;
  --bs-line:#DCE5E1; --bs-line-2:#C4D2CD;
  --bs-text:#0D1F21; --bs-text-2:#4C625F; --bs-text-3:#7C918D;
  --bs-pos:#177A52; --bs-pos-soft:#E2F2EA;
  --bs-neg:#B23A31; --bs-neg-soft:#FBE8E5;
  --bs-warn:#9A6A05; --bs-warn-soft:#FBF0DA;
  --bs-r:14px; --bs-r-sm:9px;
  --bs-shadow:0 1px 2px rgba(7,26,28,.05), 0 8px 24px -14px rgba(7,26,28,.28);
  --bs-shadow-lg:0 2px 6px rgba(7,26,28,.07), 0 22px 48px -24px rgba(7,26,28,.45);
  --bs-sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;
  --bs-mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;

  /* remapeia as variáveis antigas → o CSS original herda o visual novo de graça */
  --primary-color:var(--bs-brand); --primary-dark:var(--bs-brand-dark);
  --accent-color:var(--bs-brand-glow);
  --text-dark:var(--bs-text); --text-light:var(--bs-text-2);
  --bg-light:var(--bs-ground); --bg-white:var(--bs-surface);
  --border-color:var(--bs-line); --red:var(--bs-neg); --green:var(--bs-pos);
}

html[data-theme="dark"]{
  --bs-ground:#071214; --bs-surface:#0D1E20; --bs-surface-2:#112628;
  --bs-line:#1D3538; --bs-line-2:#2A4A4C;
  --bs-text:#E7F0ED; --bs-text-2:#9FB5B1; --bs-text-3:#7A918D;
  --bs-pos:#3FCB8E; --bs-pos-soft:#0E3327;
  --bs-neg:#F0776A; --bs-neg-soft:#361B18;
  --bs-warn:#E0AE4C; --bs-warn-soft:#332A15;
  --bs-shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 28px -18px rgba(0,0,0,.9);
  --bs-shadow-lg:0 2px 8px rgba(0,0,0,.5), 0 26px 54px -26px rgba(0,0,0,1);
}

*{ -webkit-tap-highlight-color:transparent }
body{
  font-family:var(--bs-sans); background:var(--bs-ground); color:var(--bs-text);
  font-size:15px; line-height:1.5; -webkit-font-smoothing:antialiased;
}
h1,h2,h3,h4{ letter-spacing:-.018em }
::selection{ background:var(--bs-brand); color:var(--bs-on-brand) }
:focus-visible{ outline:2px solid var(--bs-brand); outline-offset:2px; border-radius:6px }
@media (prefers-reduced-motion:reduce){ *{ transition:none!important; animation:none!important } }

/* ---------------------------------------------------------- menu lateral */
.sidebar{
  background:var(--bs-rail); color:#CFE3DF; width:248px; padding:14px 10px 12px;
  border-right:1px solid rgba(255,255,255,.05);
}
.sidebar .logo{ padding:6px 8px 16px!important; justify-content:flex-start!important }
.sidebar .logo > div{
  background:#fff!important; border-radius:13px!important; padding:9px 12px!important;
  box-shadow:0 2px 14px rgba(0,0,0,.28)!important;
}
.sidebar .logo img{ width:104px!important }
.menu-item{
  padding:10px 12px; margin:1px 0; border-radius:10px; font-size:14px; font-weight:550;
  color:#9FBDB8; letter-spacing:-.005em;
}
.menu-item:hover{ background:rgba(255,255,255,.06); color:#EAF5F2 }
.menu-item.active{
  background:var(--bs-rail-3); color:#fff; border-left:0;
  box-shadow:inset 3px 0 0 var(--bs-brand-glow);
}
.main{ margin-left:248px; width:calc(100% - 248px); padding:26px 30px 40px }

/* ---------------------------------------------------------- cabeçalho de página */
.page-header{ margin-bottom:20px; gap:12px; flex-wrap:wrap }
.page-header h2{
  font-size:25px; font-weight:750; color:var(--bs-text); letter-spacing:-.024em;
}
.page-header h3{ font-size:17px; font-weight:700; color:var(--bs-text) }

/* ---------------------------------------------------------- cards */
.card{
  background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:var(--bs-r);
  box-shadow:var(--bs-shadow); padding:20px; margin-bottom:18px;
}
.card h3{ color:var(--bs-text) }
.filter-bar{ padding:14px 16px; gap:12px }
.filter-bar .form-group{ margin-bottom:0 }

/* indicadores */
.indicadores-grid{ grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:13px; margin-bottom:20px }
.indicador-card{
  background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:var(--bs-r);
  box-shadow:var(--bs-shadow); padding:15px 17px; position:relative; overflow:hidden;
}
.indicador-card::before{
  content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--bs-brand); opacity:.55;
}
.indicador-card.clickable:hover{ transform:translateY(-3px); box-shadow:var(--bs-shadow-lg); border-color:var(--bs-line-2) }
.indicador-label{
  font-size:11px; letter-spacing:.06em; color:var(--bs-text-3); font-weight:650; text-transform:uppercase;
}
.indicador-valor{
  font-family:var(--bs-mono); font-size:23px; font-weight:600; color:var(--bs-text); letter-spacing:-.03em;
}
.indicador-valor.red,.valor0red{ color:var(--bs-neg) }
.indicador-valor.green{ color:var(--bs-pos) }

/* analítica */
.analitica-cards{ grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px }
.analitica-card{
  background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:var(--bs-r);
  box-shadow:var(--bs-shadow); padding:18px;
}
.analitica-card-icon{ font-size:24px; opacity:.9 }
.analitica-card-title{ font-size:11px; letter-spacing:.06em; color:var(--bs-text-3); font-weight:650 }
.analitica-card-value{
  font-family:var(--bs-mono); font-size:25px; font-weight:600; color:var(--bs-text); letter-spacing:-.03em;
}
.analitica-card-value.green{ color:var(--bs-pos) } .analitica-card-value.red{ color:var(--bs-neg) }

/* ---------------------------------------------------------- botões */
.btn{
  padding:9px 15px; border-radius:10px; font-size:13.5px; font-weight:600; letter-spacing:-.005em;
  border:1px solid transparent; min-height:38px;
}
.btn:active{ transform:translateY(1px) }
.btn-primary{ background:var(--bs-brand); color:var(--bs-on-brand); box-shadow:0 1px 2px rgba(0,0,0,.10) }
.btn-primary:hover{ background:var(--bs-brand-dark) }
.btn-secondary{ background:var(--bs-surface); color:var(--bs-text); border-color:var(--bs-line-2) }
.btn-secondary:hover{ background:var(--bs-surface-2) }
.btn-outline,.btn-outline-secondary{
  background:var(--bs-surface); color:var(--bs-text-2); border-color:var(--bs-line);
}
.btn-outline:hover,.btn-outline-secondary:hover{ background:var(--bs-surface-2); color:var(--bs-text) }
.btn-link{ background:none; color:var(--bs-text-2); border:0; font-weight:600 }
.btn-link:hover{ color:var(--bs-brand) }
#btnSyncSmoobu{
  background:var(--bs-pos-soft)!important; border:1px solid var(--bs-pos)!important; color:var(--bs-pos)!important;
}

/* ---------------------------------------------------------- formulários */
.form-label{ font-size:12px; font-weight:650; color:var(--bs-text-2); letter-spacing:.02em }
.form-input,.form-select,input[type=text],input[type=password],input[type=number],
input[type=tel],input[type=date],input[type=email],select,textarea{
  background:var(--bs-surface); color:var(--bs-text);
  border:1px solid var(--bs-line); border-radius:10px; padding:10px 12px; font-size:14px;
  font-family:inherit; transition:border-color .15s, box-shadow .15s;
}
.form-input:focus,.form-select:focus,input:focus,select:focus,textarea:focus{
  outline:none; border-color:var(--bs-brand); box-shadow:0 0 0 3px var(--bs-brand-soft);
}
.upload-area{
  border:2px dashed var(--bs-line-2); border-radius:var(--bs-r); background:var(--bs-surface-2);
  transition:border-color .15s, background .15s;
}
.upload-area:hover{ border-color:var(--bs-brand); background:var(--bs-brand-soft) }

/* select2 */
.select2-container--default .select2-selection--multiple,
.select2-container--default .select2-selection--single{
  background:var(--bs-surface)!important; border:1px solid var(--bs-line)!important;
  border-radius:10px!important; min-height:44px;
}
.select2-container--default .select2-selection--multiple .select2-selection__choice{
  background:var(--bs-brand-soft)!important; border:1px solid transparent!important;
  color:var(--bs-brand-ink)!important; border-radius:7px!important; padding:2px 8px!important; font-size:12.5px;
}
.select2-dropdown{
  background:var(--bs-surface)!important; border-color:var(--bs-line)!important;
  border-radius:12px!important; box-shadow:var(--bs-shadow-lg)!important; overflow:hidden;
}
.select2-container--default .select2-results__option{ color:var(--bs-text) }
.select2-container--default .select2-results__option--highlighted[aria-selected]{
  background:var(--bs-brand)!important; color:var(--bs-on-brand)!important;
}
.select2-search__field{ background:var(--bs-surface)!important; color:var(--bs-text)!important }

/* ---------------------------------------------------------- tabelas */
.table-container{ border-radius:var(--bs-r-sm); overflow:auto }
table{ font-size:13.5px }
th{
  background:var(--bs-surface-2); color:var(--bs-text-3); font-size:10.5px; letter-spacing:.07em;
  font-weight:700; padding:10px 14px; border-bottom:1px solid var(--bs-line); position:sticky; top:0; z-index:2;
}
td{ padding:11px 14px; border-bottom:1px solid var(--bs-line); color:var(--bs-text) }
tbody tr:hover td{ background:var(--bs-surface-2) }
tbody tr:last-child td{ border-bottom:0 }
td:has(+td)[align=right], td[style*="right"]{ font-family:var(--bs-mono) }

.unidade-grupo{ border-top:0; margin-top:14px; border:1px solid var(--bs-line); border-radius:var(--bs-r); overflow:hidden }
.unidade-header{
  background:var(--bs-surface-2); border-radius:0; padding:11px 15px;
  border-bottom:1px solid var(--bs-line);
}
.unidade-header:hover{ background:var(--bs-brand-soft) }
.unidade-nome{ color:var(--bs-text); font-size:14px; font-weight:700 }
.unidade-nome::before{ content:""; width:7px; height:7px; border-radius:50%; background:var(--bs-brand) }

/* ---------------------------------------------------------- modais */
.modal-overlay,.cal-modal-overlay,.wa-template-overlay,.quick-reply-overlay{
  background:rgba(6,20,22,.55); backdrop-filter:blur(3px);
}
.modal-content,.cal-modal,.wa-template-modal,.preco-edit-content{
  background:var(--bs-surface); color:var(--bs-text); border:1px solid var(--bs-line);
  border-radius:18px; box-shadow:var(--bs-shadow-lg); padding:26px;
}

/* ---------------------------------------------------------- calendário */
.cal-header h2{ font-size:23px; font-weight:750; letter-spacing:-.024em; color:var(--bs-text) }
.cal-nav button{
  background:var(--bs-surface); border:1px solid var(--bs-line); color:var(--bs-text);
  border-radius:9px; min-width:36px; min-height:36px;
}
.cal-nav button:hover{ background:var(--bs-brand-soft); border-color:var(--bs-brand); color:var(--bs-brand-ink) }
.cal-nav span{ font-weight:700; text-transform:capitalize; color:var(--bs-text) }
.cal-tabs{ gap:6px; border-bottom:1px solid var(--bs-line); padding-bottom:0 }
.cal-tab{
  background:none; border:0; border-radius:9px 9px 0 0; padding:10px 15px; font-size:13.5px;
  font-weight:600; color:var(--bs-text-3); border-bottom:2px solid transparent;
}
.cal-tab:hover{ color:var(--bs-text); background:var(--bs-surface-2) }
.cal-tab.active{ color:var(--bs-brand-ink); border-bottom-color:var(--bs-brand); background:var(--bs-brand-soft) }
.cal-container{ background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:var(--bs-r); box-shadow:var(--bs-shadow) }
.cal-unit-name,.cal-corner{ background:var(--bs-surface-2); color:var(--bs-text); font-weight:650; border-color:var(--bs-line) }
.cal-day-num{ color:var(--bs-text) } .cal-day-name{ color:var(--bs-text-3) }
.cal-sync-btn{
  background:var(--bs-brand); color:var(--bs-on-brand); border:0; border-radius:10px;
  padding:9px 15px; font-weight:650; min-height:38px;
}
.cal-sync-btn:hover{ background:var(--bs-brand-dark) }
.cal-legend{ color:var(--bs-text-2); font-size:12.5px }
.cal-legend-color{ border-radius:4px }

/* preços */
.preco-apt-block,.preco-grid{ background:var(--bs-surface); border-radius:var(--bs-r) }
.preco-box{ background:var(--bs-surface); border-color:var(--bs-line); color:var(--bs-text); border-radius:7px }
.preco-box.today{ border-color:var(--bs-brand); color:var(--bs-brand-ink) }
.preco-box.pending{ background:var(--bs-warn-soft); border-color:var(--bs-warn); color:var(--bs-warn) }
.preco-stub{ background:var(--bs-surface-2); color:var(--bs-text) }
.preco-pending-bar,.preco-bulk-bar{
  background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:12px;
  box-shadow:var(--bs-shadow-lg); color:var(--bs-text);
}
.btn-sync,.btn-salvar{ background:var(--bs-brand); color:var(--bs-on-brand); border-radius:8px; font-weight:650 }
.btn-discard,.btn-cancelar{ background:var(--bs-surface-2); color:var(--bs-text-2); border:1px solid var(--bs-line); border-radius:8px }

/* mensagens + whatsapp */
.msgs-layout,.wa-chat-layout{ border:1px solid var(--bs-line); border-radius:var(--bs-r); overflow:hidden; background:var(--bs-surface) }
.msgs-lista,.wa-chat-sidebar{ background:var(--bs-surface-2); border-right:1px solid var(--bs-line) }
.msgs-lista-header,.wa-chat-sidebar-header,.msgs-conversa-header,.wa-conversa-header{
  background:var(--bs-surface); border-bottom:1px solid var(--bs-line); color:var(--bs-text); font-weight:650;
}
.msgs-thread,.wa-chat-item{ border-bottom:1px solid var(--bs-line) }
.msgs-thread:hover,.wa-chat-item:hover{ background:var(--bs-brand-soft) }
.msgs-thread.active,.wa-chat-item.active{ background:var(--bs-brand-soft); box-shadow:inset 3px 0 0 var(--bs-brand) }
.msgs-thread-nome,.wa-chat-name{ color:var(--bs-text); font-weight:650 }
.msgs-thread-preview,.wa-chat-last-msg{ color:var(--bs-text-3) }
.msgs-conversa-body,.wa-conversa-body{ background:var(--bs-ground) }
.msgs-bubble{ border-radius:14px; box-shadow:0 1px 2px rgba(0,0,0,.06) }
.msgs-bubble.sent,.wa-msg.sent{ background:var(--bs-brand); color:var(--bs-on-brand) }
.msgs-bubble.received,.wa-msg.received{ background:var(--bs-surface); color:var(--bs-text); border:1px solid var(--bs-line) }
.msgs-input-area,.wa-input-area{ background:var(--bs-surface); border-top:1px solid var(--bs-line) }
.msgs-input-area textarea,.wa-input-area textarea{ background:var(--bs-surface-2) }
#msgsEnviarBtn,.wa-send-btn{ background:var(--bs-brand); color:var(--bs-on-brand); border-radius:10px; font-weight:650 }
.wa-btn-green{ background:var(--bs-pos); color:#fff; border-radius:9px }
.wa-btn-gray{ background:var(--bs-surface-2); color:var(--bs-text-2); border:1px solid var(--bs-line); border-radius:9px }
.wa-status-bar,.wa-config-panel{ background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:var(--bs-r) }
.wa-template-card{ background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:12px }
.wa-template-card:hover{ border-color:var(--bs-brand); background:var(--bs-brand-soft) }

/* contatos */
.contatos-header,.contatos-filtros{ gap:10px }
.contatos-filtro-chip{
  background:var(--bs-surface); border:1px solid var(--bs-line); color:var(--bs-text-2);
  border-radius:999px; padding:6px 13px; font-size:12.5px; font-weight:600;
}
.contatos-filtro-chip:hover{ border-color:var(--bs-line-2); color:var(--bs-text) }
.contatos-filtro-chip.active{ background:var(--bs-brand); border-color:var(--bs-brand); color:var(--bs-on-brand) }
.contato-row{ border-bottom:1px solid var(--bs-line); background:var(--bs-surface) }
.contato-row:hover{ background:var(--bs-surface-2) }
.contato-avatar{ background:var(--bs-brand-soft); color:var(--bs-brand-ink); font-weight:700 }
.contato-nome{ color:var(--bs-text); font-weight:650 } .contato-sub,.contato-tel{ color:var(--bs-text-3) }
.contato-menu-popup{ background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:12px; box-shadow:var(--bs-shadow-lg) }
.contato-menu-item:hover{ background:var(--bs-brand-soft) }
.contatos-massa-bar{ background:var(--bs-surface); border:1px solid var(--bs-line); border-radius:12px; box-shadow:var(--bs-shadow-lg) }

/* toasts */
.notif-toast,.quick-reply-sheet{ background:var(--bs-surface); color:var(--bs-text); border:1px solid var(--bs-line); box-shadow:var(--bs-shadow-lg) }
.notif-toast-title{ color:var(--bs-text); font-weight:700 } .notif-toast-body{ color:var(--bs-text-2) }

/* ---------------------------------------------------------- login */
#telaLogin{
  background:
    radial-gradient(120% 90% at 12% 0%, var(--bs-rail-3) 0%, transparent 55%),
    linear-gradient(150deg, var(--bs-rail-2) 0%, var(--bs-rail) 78%)!important;
  padding:24px!important;
  padding-top:calc(24px + env(safe-area-inset-top,0px))!important;
  padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))!important;
}
#telaLogin > div{
  background:var(--bs-surface)!important; border:1px solid var(--bs-line)!important;
  border-radius:20px!important; padding:34px 30px!important; max-width:390px!important;
  box-shadow:0 30px 70px -30px rgba(0,0,0,.7)!important;
}
#telaLogin img{ width:120px!important }
#telaLogin label{ color:var(--bs-text-2)!important; font-size:12.5px!important }
#telaLogin input[type=text],#telaLogin input[type=password]{
  background:var(--bs-surface-2)!important; color:var(--bs-text)!important;
  border:1px solid var(--bs-line)!important; border-radius:11px!important; padding:13px!important;
}
#telaLogin input:focus{ border-color:var(--bs-brand)!important; box-shadow:0 0 0 3px var(--bs-brand-soft)!important }
#telaLogin button{
  background:var(--bs-brand)!important; border-radius:11px!important; font-weight:700!important;
  min-height:48px; box-shadow:0 6px 18px -8px var(--bs-brand)!important;
}
#loginErro{ background:var(--bs-neg-soft)!important; color:var(--bs-neg)!important; border-left-color:var(--bs-neg)!important }

/* ---------------------------------------------------------- seletor de aparência */
.bs-fab{
  position:fixed; right:16px; bottom:calc(16px + env(safe-area-inset-bottom,0px)); z-index:4200;
  width:46px; height:46px; border-radius:50%; border:1px solid var(--bs-line);
  background:var(--bs-surface); color:var(--bs-text); font-size:19px; cursor:pointer;
  box-shadow:var(--bs-shadow-lg); display:grid; place-items:center;
}
.bs-fab:active{ transform:scale(.94) }
.bs-panel{
  position:fixed; right:16px; bottom:calc(72px + env(safe-area-inset-bottom,0px)); z-index:4201;
  width:290px; max-width:calc(100vw - 32px); background:var(--bs-surface);
  border:1px solid var(--bs-line); border-radius:18px; box-shadow:var(--bs-shadow-lg);
  padding:16px; display:none; color:var(--bs-text);
}
.bs-panel.open{ display:block; animation:bsPop .16s ease-out }
@keyframes bsPop{ from{ opacity:0; transform:translateY(8px) scale(.97) } }
.bs-panel h4{ font-size:12px; text-transform:uppercase; letter-spacing:.07em; color:var(--bs-text-3);
  margin:0 0 9px; font-weight:700 }
.bs-panel h4:not(:first-child){ margin-top:18px }
.bs-swatches{ display:grid; grid-template-columns:repeat(6,1fr); gap:8px }
.bs-sw{ aspect-ratio:1; border-radius:50%; border:2px solid transparent; cursor:pointer; padding:0;
  outline:2px solid transparent; outline-offset:2px; transition:transform .12s, outline-color .12s }
.bs-sw:hover{ transform:scale(1.13) }
.bs-sw[aria-pressed="true"]{ outline-color:var(--bs-brand) }
.bs-modes{ display:flex; gap:6px }
.bs-mode{ flex:1; padding:8px 6px; border-radius:9px; border:1px solid var(--bs-line);
  background:var(--bs-surface-2); color:var(--bs-text-2); font-size:12.5px; font-weight:600; cursor:pointer }
.bs-mode[aria-pressed="true"]{ background:var(--bs-brand); border-color:var(--bs-brand); color:var(--bs-on-brand) }
.bs-custom{ display:flex; align-items:center; gap:10px; margin-top:10px;
  padding:9px 11px; border:1px solid var(--bs-line); border-radius:11px; background:var(--bs-surface-2) }
.bs-custom input[type=color]{ width:34px; height:34px; padding:0; border:0; background:none; cursor:pointer; border-radius:8px }
.bs-custom span{ font-size:12.5px; color:var(--bs-text-2); font-weight:600 }
.bs-custom code{ font-family:var(--bs-mono); font-size:11.5px; color:var(--bs-text-3); margin-left:auto }
.bs-reset{ width:100%; margin-top:14px; padding:9px; border-radius:10px; border:1px solid var(--bs-line);
  background:none; color:var(--bs-text-3); font-size:12.5px; font-weight:600; cursor:pointer }
.bs-reset:hover{ color:var(--bs-text); background:var(--bs-surface-2) }
.bs-tag{ position:fixed; left:12px; bottom:calc(12px + env(safe-area-inset-bottom,0px)); z-index:4200;
  background:var(--bs-warn-soft); color:var(--bs-warn); border:1px solid var(--bs-warn);
  font-size:10.5px; font-weight:700; letter-spacing:.06em; padding:4px 9px; border-radius:999px;
  text-transform:uppercase; pointer-events:none }

/* ---------------------------------------------------------- mobile / iPhone */
@media (max-width:768px){
  /* topo compacto: logo à esquerda, ☰ à direita (antes gastava 1/4 da tela) */
  .sidebar{ display:flex; flex-wrap:wrap; align-items:center; column-gap:10px }
  .sidebar .logo{ order:1; flex:1 1 auto; padding:0!important; margin:0!important }
  .sidebar .logo > div{ padding:5px 9px!important; border-radius:10px!important }
  .sidebar .logo img{ width:48px!important }
  /* botões voltam a caber lado a lado (o CSS antigo forçava 100% de largura) */
  .main .btn{ width:auto!important; flex:1 1 auto; min-width:132px }
  .flex.gap-16{ flex-direction:row!important; flex-wrap:wrap; gap:9px }
  .page-header{ align-items:flex-start }
  .menu-toggle{
    order:2; display:grid!important; place-items:center; padding:0!important;
    min-height:42px; min-width:42px; font-size:21px; border-radius:11px;
    background:rgba(255,255,255,.08); color:#EAF5F2;
  }
  .sidebar .menu-item{ order:3; flex:0 0 100% }
  .sidebar.open{ padding-bottom:10px; max-height:82vh; overflow-y:auto }
  /* coluna fixa das tabelas seguia branca no modo escuro */
  table th:first-child, table td:first-child{ background:var(--bs-surface)!important }
  .sidebar{
    width:100%; padding:calc(env(safe-area-inset-top,0px) + 10px) 10px 8px;
    position:sticky; top:0; border-right:0; border-bottom:1px solid rgba(255,255,255,.07);
  }
  .main{ margin-left:0; width:100%; padding:14px 14px calc(28px + env(safe-area-inset-bottom,0px)) }
  .menu-item{ font-size:15px; padding:12px 14px }
  .page-header h2{ font-size:21px }
  .card{ padding:16px; border-radius:12px }
  .indicadores-grid{ grid-template-columns:repeat(2,1fr); gap:10px }
  .indicador-valor{ font-size:19px }
  .analitica-cards{ grid-template-columns:1fr }
  .cal-tabs{ overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none }
  .cal-tabs::-webkit-scrollbar{ display:none }
  .cal-tab{ white-space:nowrap; flex:0 0 auto }
  .btn{ min-height:44px }               /* alvo de toque iOS */
  .modal-content,.cal-modal{ border-radius:18px; padding:20px;
    max-height:calc(100vh - 40px); overflow-y:auto; -webkit-overflow-scrolling:touch }
  .msgs-layout,.wa-chat-layout{ flex-direction:column }
  .bs-panel{ right:12px; left:12px; width:auto }
}
@media (max-width:420px){ .indicadores-grid{ grid-template-columns:1fr } }

/* modo instalado (PWA) — some com o que é de navegador */
@media (display-mode:standalone){
  body{ overscroll-behavior-y:none }
  .bs-tag{ display:none }
}
FIM_CSS
echo "   skin.css   ($(wc -c < "$SITE/new/skin.css" | tr -d ' ') bytes)"

cat > "$SITE/new/skin.js" <<'FIM_JS'
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
FIM_JS
echo "   skin.js    ($(wc -c < "$SITE/new/skin.js" | tr -d ' ') bytes)"

chown -R --reference="$SITE/index.html" "$SITE/new" 2>/dev/null \
  || chown -R "$(stat -c '%U:%G' "$SITE/index.html" 2>/dev/null)" "$SITE/new" 2>/dev/null
chmod -R a+rX "$SITE/new" 2>/dev/null
echo "   permissoes copiadas do sistema atual"

echo
echo "-------------------------------------------------------------"
ls -la "$SITE/new" | tail -n +2
echo "-------------------------------------------------------------"
grep -q 'skin.css' "$SITE/new/index.html" && echo "OK  index.html novo esta chamando o visual novo"
grep -q 'skin.css' "$SITE/index.html"     && echo "ATENCAO: producao foi alterada!" \
                                          || echo "OK  producao (index.html de cima) intacta"
echo
echo "PRONTO -> https://imoveis.texnet.com.br/temporada/new/"
echo "Na primeira vez abra em aba anonima (ou Ctrl+Shift+R) por causa do cache."
