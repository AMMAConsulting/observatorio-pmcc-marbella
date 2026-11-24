# -*- coding: utf-8 -*-
"""El mar frente a Marbella.

Temperatura superficial del mar
  NOAA OISST v2.1 (satelite + boyas, rejilla de 0,25 grados), celda centrada en
  36,375 N / 4,875 O, a unos 5 km de la costa de Marbella. Diaria desde 1982,
  via ERDDAP de NOAA CoastWatch, sin clave.

  Olas de calor marinas segun Hobday et al. (2016): al menos 5 dias seguidos
  por encima del percentil 90 de ese dia del ano en 1982-2011 (ventana de
  11 dias).

Nivel del mar
  PSMSL, mareografo de Malaga (estacion 1810), medias anuales RLR en mm.
"""

import datetime
import io
import json
import os

from .comun import get

# Version con longitudes 0-360 (355,125 = -4,875): la _LonPM180 da 503/408 con
# frecuencia. Cada ano tarda ~40 s en servirse.
URL_SST = ("https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.csv?"
           "sst%5B({a}-01-01):1:({b})%5D%5B(0.0)%5D%5B(36.375)%5D%5B(355.125)%5D")
URL_PSMSL = "https://psmsl.org/data/obtaining/rlr.annual.data/1810.rlrdata"
CLIMA = (1982, 2011)


def _pct(vals, p):
    s = sorted(vals)
    k = (len(s) - 1) * p
    f = int(k)
    return s[f] + (s[min(f + 1, len(s) - 1)] - s[f]) * (k - f)


def _anio_sst(a, hasta):
    """Un ano de la celda. Pedir 44 anos de golpe da 408 en ERDDAP."""
    txt = get(URL_SST.format(a=a, b=hasta), timeout=240, reintentos=4, espera=20).decode("utf-8").splitlines()[2:]
    out = []
    for l in txt:
        c = l.split(",")
        if len(c) < 5 or c[4] in ("", "NaN"):
            continue
        out.append([c[0][:10], round(float(c[4]), 3)])
    return out


def temperatura_mar(ruta_cache, presupuesto_s=120):
    if not os.path.exists(ruta_cache):
        # La carga inicial (1982-hoy) se hace aparte: el servidor tarda varios
        # minutos por ano y no cabe en la Action diaria.
        raise RuntimeError("pendiente de la carga inicial de la serie (pipeline/cache/sst_diaria.json)")
    cache = json.load(open(ruta_cache, encoding="utf-8"))
    hoy = datetime.date.today()
    inicio = datetime.datetime.now()
    for a in range(1982, hoy.year + 1):
        # Tope de tiempo por ejecucion: el servidor tarda minutos por ano. La
        # carga inicial la hace la Action cargar-sst.yml en varias pasadas.
        if (datetime.datetime.now() - inicio).total_seconds() > presupuesto_s and str(a) not in cache:
            break
        # Los anos cerrados se guardan; el en curso (y el anterior, por si hay
        # correcciones tardias de NOAA) se vuelven a pedir siempre.
        if str(a) in cache and a < hoy.year - 1:
            continue
        hasta = f"{a}-12-31" if a < hoy.year else "last"
        try:
            cache[str(a)] = _anio_sst(a, hasta)
        except Exception:                                         # noqa: BLE001
            if str(a) not in cache:
                raise
        # Se guarda tras cada ano: si el servidor corta a mitad, no se pierde lo bajado
        os.makedirs(os.path.dirname(ruta_cache), exist_ok=True)
        json.dump(cache, open(ruta_cache, "w", encoding="utf-8"), separators=(",", ":"))
    os.makedirs(os.path.dirname(ruta_cache), exist_ok=True)
    json.dump(cache, open(ruta_cache, "w", encoding="utf-8"), separators=(",", ":"))
    faltan = [a for a in range(1982, hoy.year + 1) if str(a) not in cache]
    if faltan:
        raise RuntimeError(f"serie incompleta, faltan {len(faltan)} anos (desde {faltan[0]}); "
                           "se completa en las proximas ejecuciones")
    serie = [(datetime.date.fromisoformat(d), v) for a in sorted(cache) for d, v in cache[a]]

    # Climatologia por dia del ano (1-365), con ventana de +-5 dias
    por_doy = {}
    for d, v in serie:
        if CLIMA[0] <= d.year <= CLIMA[1]:
            por_doy.setdefault(min(d.timetuple().tm_yday, 365), []).append(v)
    clim, p90 = {}, {}
    for doy in range(1, 366):
        ventana = []
        for k in range(doy - 5, doy + 6):
            ventana += por_doy.get((k - 1) % 365 + 1, [])
        clim[doy] = sum(ventana) / len(ventana)
        p90[doy] = _pct(ventana, 0.9)

    # Dias de ola de calor marina
    sobre = [(d, v > p90[min(d.timetuple().tm_yday, 365)]) for d, v in serie]
    en_ola = [False] * len(sobre)
    i = 0
    while i < len(sobre):
        if sobre[i][1]:
            j = i
            while j < len(sobre) and sobre[j][1]:
                j += 1
            if j - i >= 5:
                for k in range(i, j):
                    en_ola[k] = True
            i = j
        else:
            i += 1

    hoy = serie[-1][0]
    anios = sorted({d.year for d, _ in serie if d.year < hoy.year})
    anual = {"x": [str(a) for a in anios], "media": [], "anomalia": [], "dias_ola": []}
    for a in anios:
        vs = [v for d, v in serie if d.year == a]
        an = [v - clim[min(d.timetuple().tm_yday, 365)] for d, v in serie if d.year == a]
        anual["media"].append(round(sum(vs) / len(vs), 2))
        anual["anomalia"].append(round(sum(an) / len(an), 2))
        anual["dias_ola"].append(sum(1 for (d, _), o in zip(serie, en_ola) if d.year == a and o))
    anual["dias_ola_en_curso"] = sum(1 for (d, _), o in zip(serie, en_ola) if d.year == hoy.year and o)

    # Mensual
    por_mes = {}
    for d, v in serie:
        e = por_mes.setdefault(d.strftime("%Y-%m"), [[], []])
        e[0].append(v)
        e[1].append(v - clim[min(d.timetuple().tm_yday, 365)])
    meses = sorted(por_mes)
    mensual = {"x": meses,
               "media": [round(sum(por_mes[m][0]) / len(por_mes[m][0]), 2) for m in meses],
               "anomalia": [round(sum(por_mes[m][1]) / len(por_mes[m][1]), 2) for m in meses]}

    # Ultimos 120 dias frente a la climatologia y su percentil 90
    rec = serie[-120:]
    reciente = {"x": [d.isoformat() for d, _ in rec], "sst": [round(v, 2) for _, v in rec],
                "clima": [round(clim[min(d.timetuple().tm_yday, 365)], 2) for d, _ in rec],
                "p90": [round(p90[min(d.timetuple().tm_yday, 365)], 2) for d, _ in rec]}
    return {"ultimo_dia": hoy.isoformat(), "ultimo_valor": round(serie[-1][1], 2),
            "ultima_anomalia": round(serie[-1][1] - clim[min(hoy.timetuple().tm_yday, 365)], 2),
            "en_ola_hoy": en_ola[-1], "referencia": f"{CLIMA[0]}-{CLIMA[1]}",
            "anual": anual, "mensual": mensual, "reciente": reciente}


def nivel_mar():
    txt = get(URL_PSMSL).decode("utf-8")
    x, v = [], []
    for l in txt.splitlines():
        c = [s.strip() for s in l.split(";")]
        if len(c) < 2 or not c[0]:
            continue
        mm = int(c[1])
        x.append(str(int(float(c[0]))))
        v.append(None if mm == -99999 else mm)
    # Tendencia lineal (minimos cuadrados) sobre los anos con dato
    pts = [(int(a), b) for a, b in zip(x, v) if b is not None]
    n = len(pts)
    mx = sum(a for a, _ in pts) / n
    my = sum(b for _, b in pts) / n
    pend = sum((a - mx) * (b - my) for a, b in pts) / sum((a - mx) ** 2 for a, _ in pts)
    base = [round(my + pend * (int(a) - mx), 1) for a in x]
    return {"x": x, "v": v, "tendencia": base, "mm_anio": round(pend, 2),
            "desde": pts[0][0], "hasta": pts[-1][0]}
