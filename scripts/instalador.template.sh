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
__MANIFEST__
FIM_MANIFEST
echo "   manifest.webmanifest"

cat > "$SITE/new/skin.css" <<'FIM_CSS'
__CSS__
FIM_CSS
echo "   skin.css   ($(wc -c < "$SITE/new/skin.css" | tr -d ' ') bytes)"

cat > "$SITE/new/skin.js" <<'FIM_JS'
__JS__
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
