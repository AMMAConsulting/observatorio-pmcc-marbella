# -*- coding: utf-8 -*-
"""Colector del Observatorio del Plan Municipal contra el Cambio Climatico de
Marbella: reune las fuentes y escribe data/data.js.

    python pipeline/build_data.py

Reglas del kit que se respetan:
  1. Solo lectura: GET contra fuentes publicas y nada mas.
  2. Un fallo de una fuente no tumba el panel: esa parte se queda con los datos
     que ya habia publicados y el resto se actualiza.
  3. Nunca se publica un data.js peor que el vigente (corte en el 90 %).
"""

import datetime
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sources import dgt, observatorios, plan              # noqa: E402
from sources.comun import escribir_js, paso, ok, aviso     # noqa: E402

MUNICIPIO = "Marbella"
INE_MUNICIPIO = "29069"

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "data", "data.js")
CACHE = os.path.join(RAIZ, "pipeline", "cache")


def _vigente():
    if not os.path.exists(SALIDA):
        return None
    try:
        txt = open(SALIDA, encoding="utf-8").read()
        m = re.search(r"window\.\w+\s*=\s*(\{.*\});?\s*$", txt, re.S)
        return json.loads(m.group(1)) if m else None
    except Exception:                                             # noqa: BLE001
        return None


def recoger(previo):
    previo = previo or {}
    datos = {"meta": {
        "municipio": MUNICIPIO, "ine": INE_MUNICIPIO,
        "actualizado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }}
    fallos = []

    def bloque(nombre, fn, *claves):
        """Ejecuta una fuente; si falla, conserva lo que habia publicado."""
        try:
            r = fn()
            for k in claves:
                datos[k] = r[k] if len(claves) > 1 else r
            return True
        except Exception as e:                                    # noqa: BLE001
            fallos.append(f"{nombre}: {e}")
            aviso(f"{nombre}: {e}")
            for k in claves:
                if k in previo:
                    datos[k] = previo[k]
            return False

    paso("Plan (linea base HCM, transcrita del borrador)")
    datos["plan"] = plan.datos()
    ok(f"difusas 2005-2021, reduccion {datos['plan']['reduccion_difusas_pct']} %")

    paso("Observatorio hidrico (REDIAM + Hidrosur)")
    if bloque("hidrico", observatorios.hidrico, "hidrico"):
        ok(f"embalse {datos['hidrico']['embalse']['ultimo']['fecha']}, lluvia hasta {datos['hidrico']['lluvia_reciente']['x'][-1]}")

    paso("Observatorio de sostenibilidad (AEMET + Copernicus)")
    if bloque("sostenibilidad", observatorios.sostenibilidad, "sostenibilidad"):
        s = datos["sostenibilidad"]
        ok(f"clima hasta {s['clima']['x'][-1]}, NDVI hasta {s['ndvi']['x'][-1]}")

    paso("DGT - matriculaciones de turismos")
    if bloque("matriculaciones", lambda: dgt.matriculaciones(
            os.path.join(CACHE, "dgt_matriculaciones.json")), "matriculaciones"):
        ok(f"{len(datos['matriculaciones']['x'])} meses, ultimo {datos['matriculaciones']['x'][-1]}")

    paso("Punto de Acceso Nacional - puntos de recarga")
    bloque("recarga", lambda: dgt.recarga(observatorios.limite_municipal(),
                                          os.path.join(CACHE, "recarga_historico.json")), "recarga")

    datos["meta"]["fallos"] = fallos
    return datos, fallos


def _contar_valores(obj):
    if isinstance(obj, dict):
        return sum(_contar_valores(v) for v in obj.values())
    if isinstance(obj, list):
        return sum(1 if isinstance(v, (int, float)) else _contar_valores(v) for v in obj)
    return 0


def main():
    print(f"== Observatorio PMCC {MUNICIPIO} - recoleccion ==")
    previo = _vigente()
    datos, fallos = recoger(previo)
    nuevos = _contar_valores(datos)
    if previo is not None:
        antes = _contar_valores(previo)
        if antes and nuevos < antes * 0.9:
            aviso(f"ABORTADO: {nuevos} valores frente a {antes} publicados "
                  f"({nuevos / antes:.0%}). No se sobrescribe data.js.")
            return 1
    paso("Escritura")
    escribir_js(SALIDA, datos)
    if fallos:
        aviso(f"{len(fallos)} fuente(s) con incidencia: " + "; ".join(fallos))
    print(f"\nListo. {nuevos} valores.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
