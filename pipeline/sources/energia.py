# -*- coding: utf-8 -*-
"""Electricidad en Andalucia (REE).

Electricidad
  REE · REData, estructura de la generacion por tecnologia en el sistema
  electrico de Andalucia (geo_id 4), mensual desde 2015. Sin clave.

Se descarto MoMo (ISCIII, mortalidad atribuible al calor): su fichero publico
  acaba en diciembre de 2021.
"""

import datetime
import io
import json
import os

from .comun import get, get_json, ok

REE = ("https://apidatos.ree.es/es/datos/generacion/estructura-generacion?"
       "start_date={y}-01-01T00:00&end_date={y}-12-31T23:59&time_trunc=month"
       "&geo_trunc=electric_system&geo_limit=ccaa&geo_ids=4")
RENOVABLES = {"Hidráulica", "Eólica", "Solar fotovoltaica", "Solar térmica", "Otras renovables"}
GRUPOS = {"Solar fotovoltaica": "Solar fotovoltaica", "Eólica": "Eólica", "Solar térmica": "Solar térmica",
          "Ciclo combinado": "Ciclo combinado (gas)", "Cogeneración": "Cogeneración",
          "Carbón": "Carbón"}


def electricidad():
    hoy = datetime.date.today()
    por_mes = {}
    for y in range(2015, hoy.year + 1):
        d = get_json(REE.format(y=y))
        for tec in d.get("included", []):
            t = tec["attributes"]["title"]
            for p in tec["attributes"]["values"]:
                m = p["datetime"][:7]
                por_mes.setdefault(m, {})[t] = p["value"]
    meses = sorted(m for m, v in por_mes.items() if v.get("Generación total"))
    out = {"x": meses, "renovable_pct": [], "series": {g: [] for g in list(GRUPOS.values()) + ["Resto"]}}
    for m in meses:
        v = por_mes[m]
        tot = v["Generación total"]
        ren = sum(v.get(t, 0) for t in RENOVABLES)
        out["renovable_pct"].append(round(ren / tot * 100, 1))
        usado = 0
        for t, g in GRUPOS.items():
            out["series"][g].append(round(v.get(t, 0) / 1000, 1))       # GWh
            usado += v.get(t, 0)
        out["series"]["Resto"].append(round((tot - usado) / 1000, 1))
    # Anual (solo anos completos)
    anios = sorted({m[:4] for m in meses if sum(1 for k in meses if k[:4] == m[:4]) == 12})
    out["anual"] = {"x": anios, "renovable_pct": []}
    for a in anios:
        ren = sum(sum(por_mes[m].get(t, 0) for t in RENOVABLES) for m in meses if m[:4] == a)
        tot = sum(por_mes[m]["Generación total"] for m in meses if m[:4] == a)
        out["anual"]["renovable_pct"].append(round(ren / tot * 100, 1))
    return out


