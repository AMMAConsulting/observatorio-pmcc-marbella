# -*- coding: utf-8 -*-
"""Series climaticas largas para ver como cambia el clima.

Temperatura y precipitacion
  NOAA GHCN-Daily, estacion SP000006155 MALAGA AEROPUERTO (indicativo OMM
  08482, AEMET 6155A): temperatura maxima, minima y precipitacion diarias desde
  mayo de 1942. Es la serie larga y homogenea mas cercana a Marbella (unos
  50 km). Dominio publico, sin clave. Llega con unas semanas de retraso.
  Se descartan los valores con bandera de calidad (QFLAG).

  Periodo de referencia: 1961-1990 (normal climatologica de la OMM, la que se
  usa para hablar de calentamiento).

CO2 atmosferico
  NOAA GML, Mauna Loa: media mensual. Es la referencia mundial de la
  concentracion de CO2.
"""

import csv
import datetime
import io

from .comun import get

URL_GHCN = "https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access/SP000006155.csv"
URL_CO2 = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv"
REF = (1961, 1990)
MIN_DIAS = 330          # un ano necesita 330 dias medidos para contar


def _valor(fila, campo):
    v = (fila.get(campo) or "").strip()
    if not v:
        return None
    attrs = (fila.get(campo + "_ATTRIBUTES") or "").split(",")
    if len(attrs) > 1 and attrs[1].strip():            # QFLAG: dato dudoso
        return None
    return int(v) / 10.0


def _media(a):
    a = [x for x in a if x is not None]
    return sum(a) / len(a) if a else None


def temperatura_y_lluvia():
    txt = get(URL_GHCN, timeout=300).decode("utf-8")
    dias = []
    for f in csv.DictReader(io.StringIO(txt)):
        dias.append((f["DATE"], _valor(f, "TMAX"), _valor(f, "TMIN"), _valor(f, "PRCP")))
    ultimo = dias[-1][0]

    # ---- Anual (ano natural) para temperatura
    por_anio = {}
    for d, tx, tn, _ in dias:
        if tx is None or tn is None:
            continue
        por_anio.setdefault(int(d[:4]), []).append((tx, tn))
    anios = sorted(a for a, v in por_anio.items() if len(v) >= MIN_DIAS)
    anual = {"x": [str(a) for a in anios], "media": [], "maxima_abs": [],
             "dias30": [], "dias35": [], "noches20": [], "noches25": []}
    for a in anios:
        v = por_anio[a]
        anual["media"].append(round(_media([(x + n) / 2 for x, n in v]), 2))
        anual["maxima_abs"].append(max(x for x, _ in v))
        anual["dias30"].append(sum(1 for x, _ in v if x >= 30))
        anual["dias35"].append(sum(1 for x, _ in v if x >= 35))
        anual["noches20"].append(sum(1 for _, n in v if n >= 20))
        anual["noches25"].append(sum(1 for _, n in v if n >= 25))
    ref = [m for a, m in zip(anios, anual["media"]) if REF[0] <= a <= REF[1]]
    normal = sum(ref) / len(ref)
    anual["anomalia"] = [round(m - normal, 2) for m in anual["media"]]
    anual["normal"] = round(normal, 2)
    for k in ("dias30", "dias35", "noches20", "noches25"):
        r = [v for a, v in zip(anios, anual[k]) if REF[0] <= a <= REF[1]]
        anual[k + "_normal"] = round(sum(r) / len(r), 1)

    # ---- Mensual: temperatura media y anomalia frente a su mes 1961-1990
    por_mes = {}
    for d, tx, tn, pr in dias:
        e = por_mes.setdefault(d[:7], {"t": [], "p": [], "n": 0})
        e["n"] += 1
        if tx is not None and tn is not None:
            e["t"].append((tx + tn) / 2)
        if pr is not None:
            e["p"].append(pr)
    meses = sorted(por_mes)
    normal_mes, lluvia_normal_mes = {}, {}
    for mm in range(1, 13):
        t = [_media(por_mes[k]["t"]) for k in meses
             if int(k[5:7]) == mm and REF[0] <= int(k[:4]) <= REF[1] and len(por_mes[k]["t"]) >= 25]
        p = [sum(por_mes[k]["p"]) for k in meses
             if int(k[5:7]) == mm and REF[0] <= int(k[:4]) <= REF[1] and len(por_mes[k]["p"]) >= 25]
        normal_mes[mm] = sum(t) / len(t)
        lluvia_normal_mes[mm] = sum(p) / len(p)
    mensual = {"x": [], "media": [], "anomalia": [], "lluvia": []}
    for k in meses:
        e = por_mes[k]
        t = _media(e["t"]) if len(e["t"]) >= 25 else None
        mensual["x"].append(k)
        mensual["media"].append(None if t is None else round(t, 2))
        mensual["anomalia"].append(None if t is None else round(t - normal_mes[int(k[5:7])], 2))
        mensual["lluvia"].append(round(sum(e["p"]), 1) if len(e["p"]) >= 25 else None)

    # ---- Precipitacion por ano hidrologico (octubre-septiembre)
    hid = {}
    for d, _, _, pr in dias:
        y, m = int(d[:4]), int(d[5:7])
        ah = y + 1 if m >= 10 else y
        if pr is not None:
            hid.setdefault(ah, []).append(pr)
    ahs = sorted(a for a, v in hid.items() if len(v) >= MIN_DIAS)
    lluvia = {"x": [f"{a - 1}-{str(a)[2:]}" for a in ahs],
              "total": [round(sum(hid[a]), 1) for a in ahs],
              "dias30": [sum(1 for v in hid[a] if v >= 30) for a in ahs],
              "max_diaria": [max(hid[a]) for a in ahs]}
    r = [t for a, t in zip(ahs, lluvia["total"]) if REF[0] < a <= REF[1] + 1]
    lluvia["normal"] = round(sum(r) / len(r), 1)
    r = [t for a, t in zip(ahs, lluvia["dias30"]) if REF[0] < a <= REF[1] + 1]
    lluvia["dias30_normal"] = round(sum(r) / len(r), 2)

    # ---- Sequia: lluvia de los ultimos 12 meses en % de lo normal
    normal_12 = sum(lluvia_normal_mes.values())
    seq = {"x": [], "pct": []}
    for i in range(11, len(meses)):
        ventana = [mensual["lluvia"][j] for j in range(i - 11, i + 1)]
        if any(v is None for v in ventana):
            continue
        seq["x"].append(meses[i])
        seq["pct"].append(round(sum(ventana) / normal_12 * 100, 1))
    seq["normal_mm"] = round(normal_12, 1)

    return {"estacion": "Málaga Aeropuerto (OMM 08482)", "ultimo_dia": ultimo,
            "referencia": f"{REF[0]}-{REF[1]}", "anual": anual, "mensual": mensual,
            "lluvia": lluvia, "sequia": seq}


def co2():
    txt = get(URL_CO2).decode("utf-8")
    lineas = [l for l in txt.splitlines() if l and not l.startswith("#")]
    cab = lineas[0].split(",")
    iy, im, iv = cab.index("year"), cab.index("month"), cab.index("average")
    x, v = [], []
    for l in lineas[1:]:
        c = l.split(",")
        val = float(c[iv])
        if val < 0:
            continue
        x.append(f"{int(c[iy])}-{int(c[im]):02d}")
        v.append(round(val, 2))
    return {"x": x, "v": v}
