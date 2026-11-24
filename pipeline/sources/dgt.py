# -*- coding: utf-8 -*-
"""DGT: matriculaciones de turismos en Marbella por tecnologia, y puntos de
recarga publicos del Punto de Acceso Nacional.

Matriculaciones
  Microdatos mensuales MATRABA de la DGT (un ZIP de ~17 MB por mes con todas
  las matriculaciones de Espana, en ancho fijo y Latin-1). Se cuentan los
  turismos (COD_TIPO 40) domiciliados en Marbella (COD_MUNICIPIO_INE_VEH 29069)
  segun su categoria electrica. Incluye usados de importacion, que tambien se
  matriculan por primera vez en Espana.

  Cada mes contado se guarda en pipeline/cache/dgt_matriculaciones.json, asi
  que la Action solo descarga los meses nuevos.

Puntos de recarga
  XML DATEX II v3 del Punto de Acceso Nacional (DGT/MITECO, ~85 MB, sin clave).
  Se cuentan los puntos cuyo emplazamiento cae dentro del limite municipal y se
  guarda una foto por dia en pipeline/cache/recarga_historico.json, para que la
  evolucion se vaya construyendo.
"""

import datetime
import io
import json
import os
import xml.etree.ElementTree as ET
import zipfile

from .comun import get, ok, aviso

INE = "29069"
URL_MES = "https://www.dgt.es/microdatos/salida/{y}/{m}/vehiculos/matriculaciones/export_mensual_mat_{y}{m:02d}.zip"
URL_RECARGA = "https://nap.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml"
DESDE = (2021, 1)

# Posiciones (base 0) del registro MATRABA, comprobadas contra el fichero de
# octubre de 2026: el municipio de BILBAO (48020) empieza en la 192.
P_TIPO = (91, 93)
P_PROP = (93, 94)
P_INE = (192, 197)
P_NOMBRE = (197, 227)
P_CAT_ELEC = (453, 457)


def _clasificar(linea):
    cat = linea[P_CAT_ELEC[0]:P_CAT_ELEC[1]].strip()
    prop = linea[P_PROP[0]:P_PROP[1]]
    if cat == "BEV" or (prop == "2" and cat not in ("PHEV", "REEV", "HEV")):
        return "bev"
    if cat in ("PHEV", "REEV"):
        return "phev"
    if cat == "HEV":
        return "hev"
    return "combustion"


def _mes(y, m):
    raw = get(URL_MES.format(y=y, m=m), timeout=300)
    z = zipfile.ZipFile(io.BytesIO(raw))
    texto = z.open(z.namelist()[0]).read().decode("latin-1")
    cuenta = {"bev": 0, "phev": 0, "hev": 0, "combustion": 0}
    nombre_ok = False
    for linea in texto.split("\n"):
        if len(linea) < P_CAT_ELEC[1] or linea[P_INE[0]:P_INE[1]] != INE:
            continue
        if not nombre_ok:
            # Si la DGT mueve columnas, el nombre deja de cuadrar y se para aqui
            nombre = linea[P_NOMBRE[0]:P_NOMBRE[1]].strip().upper()
            if "MARBELLA" not in nombre:
                raise RuntimeError(f"el registro de {INE} no dice Marbella ({nombre!r}): "
                                   "la DGT ha cambiado el formato")
            nombre_ok = True
        if linea[P_TIPO[0]:P_TIPO[1]] != "40":
            continue
        cuenta[_clasificar(linea)] += 1
    if not nombre_ok:
        raise RuntimeError("ningun registro de Marbella en el fichero")
    return cuenta


def matriculaciones(ruta_cache):
    cache = {}
    if os.path.exists(ruta_cache):
        cache = json.load(open(ruta_cache, encoding="utf-8"))
    hoy = datetime.date.today()
    y, m = DESDE
    nuevos = 0
    while (y, m) < (hoy.year, hoy.month):
        clave = f"{y}-{m:02d}"
        if clave not in cache:
            try:
                cache[clave] = _mes(y, m)
                nuevos += 1
                ok(f"DGT {clave}: {sum(cache[clave].values())} turismos")
            except Exception as e:                               # noqa: BLE001
                # El mes en curso o el anterior pueden no estar publicados aun
                aviso(f"DGT {clave}: {e}")
                break
        m += 1
        if m == 13:
            y, m = y + 1, 1
    if nuevos:
        os.makedirs(os.path.dirname(ruta_cache), exist_ok=True)
        json.dump(dict(sorted(cache.items())), open(ruta_cache, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=0)
    x = sorted(cache)
    return {"x": x, **{k: [cache[p][k] for p in x] for k in ("bev", "phev", "hev", "combustion")}}


# ----------------------------------------------------------- Puntos de recarga

def _dentro(lon, lat, poligonos):
    """Punto en poligono (rayo), sobre los anillos exteriores e interiores."""
    def en_anillo(anillo):
        dentro = False
        j = len(anillo) - 1
        for i in range(len(anillo)):
            xi, yi = anillo[i][0], anillo[i][1]
            xj, yj = anillo[j][0], anillo[j][1]
            if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
                dentro = not dentro
            j = i
        return dentro
    for pol in poligonos:
        if en_anillo(pol[0]) and not any(en_anillo(h) for h in pol[1:]):
            return True
    return False


def _poligonos(geojson):
    out = []
    for f in geojson.get("features", [geojson]):
        g = f.get("geometry", f)
        if g["type"] == "Polygon":
            out.append(g["coordinates"])
        elif g["type"] == "MultiPolygon":
            out.extend(g["coordinates"])
    return out


def _local(tag):
    return tag.rsplit("}", 1)[-1]


def recarga(limite_geojson, ruta_hist):
    poligonos = _poligonos(limite_geojson)
    xs = [p[0] for pol in poligonos for p in pol[0]]
    ys = [p[1] for pol in poligonos for p in pol[0]]
    caja = (min(xs), max(xs), min(ys), max(ys))

    raw = get(URL_RECARGA, timeout=600)
    emplazamientos = puntos = 0
    potencia_kw = 0.0
    bandas = {"lenta": 0, "rapida": 0, "ultrarrapida": 0}
    for _, el in ET.iterparse(io.BytesIO(raw), events=("end",)):
        if _local(el.tag) != "energyInfrastructureSite":
            continue
        lat = lon = None
        for sub in el.iter():
            n = _local(sub.tag)
            if n == "latitude" and lat is None:
                lat = float(sub.text)
            elif n == "longitude" and lon is None:
                lon = float(sub.text)
        if (lat is not None and caja[0] <= lon <= caja[1] and caja[2] <= lat <= caja[3]
                and _dentro(lon, lat, poligonos)):
            emplazamientos += 1
            for rp in el.iter():
                if _local(rp.tag) != "refillPoint":
                    continue
                pot = [float(c.text) for c in rp.iter() if _local(c.tag) == "maxPowerAtSocket" and c.text]
                kw = max(pot) / 1000 if pot else 0
                puntos += 1
                potencia_kw += kw
                bandas["lenta" if kw < 22.1 else "rapida" if kw < 50 else "ultrarrapida"] += 1
        el.clear()
    if not puntos:
        raise RuntimeError("ningun punto de recarga dentro del limite municipal")
    ok(f"recarga: {emplazamientos} emplazamientos, {puntos} puntos, {potencia_kw:,.0f} kW")

    hist = {}
    if os.path.exists(ruta_hist):
        hist = json.load(open(ruta_hist, encoding="utf-8"))
    hoy = datetime.date.today().isoformat()
    hist[hoy] = {"emplazamientos": emplazamientos, "puntos": puntos, "kw": round(potencia_kw)}
    os.makedirs(os.path.dirname(ruta_hist), exist_ok=True)
    json.dump(dict(sorted(hist.items())), open(ruta_hist, "w", encoding="utf-8"), indent=0)
    xh = sorted(hist)
    return {
        "emplazamientos": emplazamientos, "puntos": puntos, "kw": round(potencia_kw),
        "bandas": bandas, "fecha": hoy,
        "historico": {"x": xh, "puntos": [hist[d]["puntos"] for d in xh],
                      "kw": [hist[d]["kw"] for d in xh]},
    }
