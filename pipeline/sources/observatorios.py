# -*- coding: utf-8 -*-
"""Datos que ya publican otros observatorios de AMMA, leidos de su web.

En vez de volver a descargar REDIAM, Hidrosur, AEMET o Copernicus, se lee lo
que esos observatorios ya publican (y mantienen con sus propias Actions):

  - Hidrico La Concepcion: embalse diario (REDIAM) y lluvia diaria (Hidrosur).
  - Sostenibilidad: clima mensual de AEMET (estacion 6083X Marbella) y series
    de satelite (NDVI de Sentinel-2, temperatura de superficie, NO2 de
    Sentinel-5P).
"""

import datetime
import json
import re

from .comun import get, get_json

HIDRICO = "https://ammaconsulting.github.io/observatorio-hidrico-concepcion/data/data.js"
SOSTENIBILIDAD = "https://ammaconsulting.github.io/observatorio-sostenibilidad-marbella/data/"

# Anos hidrologicos que se dibujan (octubre-septiembre)
ANIOS_HIDRO = 15
DIAS_EMBALSE = 365 * 10


def _js(url):
    txt = get(url).decode("utf-8")
    m = re.search(r"window\.\w+\s*=\s*(\{.*\})\s*;?\s*$", txt, re.S)
    return json.loads(m.group(1))


def _fechas(inicio, n):
    d0 = datetime.date.fromisoformat(inicio)
    return [(d0 + datetime.timedelta(days=i)).isoformat() for i in range(n)]


def hidrico():
    d = _js(HIDRICO)
    ed = d["embalse_diario"]
    fechas = _fechas(ed["inicio"], len(ed["porcentaje"]))
    corte = max(0, len(fechas) - DIAS_EMBALSE)
    embalse = {
        "x": fechas[corte:],
        "porcentaje": ed["porcentaje"][corte:],
        "volumen": ed["volumen"][corte:],
        "ultimo": d["embalse"],
    }

    ll = d["lluvia_diaria"]
    dias = _fechas(ll["inicio"], len(ll["series"]["024P01"]))
    nombres = {e["id"]: e["nombre"] for e in ll["estaciones"]}

    def anual(sensor):
        tot = {}
        cnt = {}
        for f, v in zip(dias, ll["series"][sensor]):
            y, m = int(f[:4]), int(f[5:7])
            ah = y + 1 if m >= 10 else y          # ano hidrologico que acaba en septiembre
            if v is not None:
                tot[ah] = tot.get(ah, 0) + v
                cnt[ah] = cnt.get(ah, 0) + 1
        return tot, cnt

    hoy = datetime.date.today()
    ah_actual = hoy.year + 1 if hoy.month >= 10 else hoy.year
    anios = list(range(ah_actual - ANIOS_HIDRO + 1, ah_actual + 1))
    lluvia = {"x": [f"{a - 1}-{str(a)[2:]}" for a in anios], "series": {}, "nombres": {}}
    for s in ("024P01", "016P01"):
        tot, cnt = anual(s)
        # Un ano con menos del 90 % de dias medidos se deja sin dato (salvo el actual, en curso)
        lluvia["series"][s] = [round(tot[a], 1) if a in tot and (cnt[a] >= 329 or a == ah_actual) else None
                               for a in anios]
        lluvia["nombres"][s] = nombres.get(s, s)
    lluvia["en_curso"] = lluvia["x"][-1]

    ult = 120
    lluvia_reciente = {"x": dias[-ult:], "v": ll["series"]["024P01"][-ult:],
                       "estacion": nombres.get("024P01", "024P01")}
    return {"embalse": embalse, "lluvia_anual": lluvia, "lluvia_reciente": lluvia_reciente,
            "actualizado": d["meta"]["actualizado"]}


def sostenibilidad():
    out = {}
    c = get_json(SOSTENIBILIDAD + "clima_aemet.json")
    s = c["serie"]
    # La serie publicada llega hasta diciembre con los meses futuros vacios
    while s and s[-1].get("valor") is None and s[-1].get("precipitacion_mm") is None:
        s = s[:-1]
    out["clima"] = {
        "x": [p["periodo"] for p in s],
        "media": [p.get("valor") for p in s],
        "maxima": [p.get("temperatura_maxima_media") for p in s],
        "minima": [p.get("temperatura_minima_media") for p in s],
        "precipitacion": [p.get("precipitacion_mm") for p in s],
        "estacion": c.get("estacion", {}),
    }
    for clave, fichero in (("ndvi", "ndvi_municipal"), ("lst", "lst_municipal"),
                           ("no2", "no2_troposferico")):
        j = get_json(SOSTENIBILIDAD + fichero + ".json")
        out[clave] = {"x": [p["periodo"] for p in j["serie"]],
                      "v": [p.get("valor") for p in j["serie"]],
                      "unidad": j.get("unidad")}
    return out


def limite_municipal():
    return get_json(SOSTENIBILIDAD + "limite_municipal.geojson")
