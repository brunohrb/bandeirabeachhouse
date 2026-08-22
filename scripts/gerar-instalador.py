#!/usr/bin/env python3
"""Regera scripts/instalar-visual-novo.sh embutindo a skin atual.

Rode sempre que mexer em new/skin.css, new/skin.js ou new/manifest.webmanifest:
    python3 scripts/gerar-instalador.py
O script gerado e autossuficiente: instala o visual novo numa VM sem baixar nada.
"""
import io, os
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ler = lambda p: io.open(os.path.join(raiz, p), encoding="utf-8").read().rstrip()

saida = (ler("scripts/instalador.template.sh")
         .replace("__CSS__", ler("new/skin.css"))
         .replace("__JS__", ler("new/skin.js"))
         .replace("__MANIFEST__", ler("new/manifest.webmanifest")))
destino = os.path.join(raiz, "scripts/instalar-visual-novo.sh")
io.open(destino, "w", encoding="utf-8").write(saida + "\n")
print("gerado: %s (%d KB)" % (destino, len(saida) // 1024))
