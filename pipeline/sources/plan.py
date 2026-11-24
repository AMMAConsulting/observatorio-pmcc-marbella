# -*- coding: utf-8 -*-
"""Linea base del Plan Municipal contra el Cambio Climatico (PMCC) de Marbella.

Estos valores NO se descargan: estan transcritos de los anexos del borrador del
plan (v00, noviembre de 2025), que a su vez salen de la herramienta Huella de
Carbono de los Municipios de Andalucia (HCM) de la Junta. La HCM no tiene una
descarga automatizable, asi que la serie se actualiza a mano cuando la Junta
publique un ano nuevo (y se anota aqui la procedencia).

Comprobaciones hechas al transcribir:
  - Emisiones difusas por actividad: la suma de 2005 da 412.677 y la de 2021
    346.984, igual que el total del plan.
  - 2008: consumo electrico 1.032.409 MWh y 2013: difusas 330.617,66 y
    2,36 t/hab, igual que el texto del plan.
"""

ANIOS = list(range(2005, 2022))   # 2005..2021: el plan usa 2021 como ultimo ano

EMISIONES = {
    "x": [str(a) for a in ANIOS],
    # tCO2e
    "totales": [866277.44, 871005.73, 889800.46, 822551.23, 692705.70, 592880.26,
                619752.09, 651997.59, 563743.20, 605109.14, 687069.56, 660001.41,
                722639.03, 709650.12, 629201.19, 506137.96, 556384.49],
    "difusas": [412677.12, 421312.53, 430925.56, 409587.63, 367351.02, 350552.58,
                338055.52, 334517.38, 330617.66, 359177.21, 358535.16, 352444.92,
                353741.90, 354736.41, 361250.15, 319336.69, 346984.38],
    # tCO2e por habitante
    "difusas_hab": [3.30, 3.34, 3.35, 3.09, 2.71, 2.55, 2.42, 2.37, 2.36, 2.58,
                    2.56, 2.50, 2.50, 2.49, 2.48, 2.16, 2.32],
}

# Objetivo O1: -55 % de difusas en 2030 respecto a 2005
META_DIFUSAS_2030 = round(EMISIONES["difusas"][0] * 0.45, 0)

# Emisiones difusas por actividad, 2005 frente a 2021 (tCO2e)
DIFUSAS_ACTIVIDAD = {
    "x": ["Transporte", "Aguas residuales", "Residuos",
          "Combustibles", "Gases fluorados", "Agricultura"],
    "2005": [272769.49, 43803.80, 28403.14, 35472.04, 31433.24, 136.80 + 658.61],
    "2021": [221956.17, 44318.82, 39117.63, 24083.96, 16668.26, 255.20 + 584.35],
}

# Consumo de energia electrica por sector (MWh), 2005..2021
ELECTRICIDAD = {
    "x": [str(a) for a in ANIOS],
    "residencial": [469850, 506108, 505629, 513688, 466692, 460167, 443654.29, 441832.75,
                    429262.25, 417375.69, 439726.92, 448771, 457514.29, 473370.07,
                    458295.54, 435020.95, 456396.02],
    "comercio": [333050, 383907, 386398, 387731, 307257, 303473, 294360.24, 282854.32,
                 276668.93, 275931.40, 284215.14, 286535, 287001.27, 282139.53,
                 281861.03, 219028.20, 246120.91],
    "total": [927608, 1022030, 1019722, 1032409, 903763, 865456, 853625.98, 858054.61,
              803881.15, 806334.20, 821336.01, 854323.57, 857900.31, 865643.20,
              864358.19, 747205.11, 808494.66],
}

# Energia final, tendencial y renovables (MWh). El plan solo calcula 2019-2021.
ENERGIA = {
    "x": ["2019", "2020", "2021"],
    "final": [1976623.06, 1634381.32, 1855428.09],
    "tendencial": [None, 2003109.80, 2029550.85],
    "renovables": [115867.18, 128214.78, 149573.35],
}

# Plan de accion (tabla 41 del borrador)
ACTUACIONES = [
    ("M-01", "L1 Marbella baja en carbono", "Zona de Bajas Emisiones"),
    ("M-02", "L1 Marbella baja en carbono", "Red de vías ciclistas y movilidad personal"),
    ("M-03", "L1 Marbella baja en carbono", "Electrificación de flota municipal y transporte público"),
    ("M-04", "L1 Marbella baja en carbono", "Eficiencia energética en alumbrado exterior"),
    ("M-05", "L1 Marbella baja en carbono", "Rehabilitación energética de edificios municipales"),
    ("M-06", "L1 Marbella baja en carbono", "Despliegue de autoconsumo fotovoltaico"),
    ("A-01", "L2 Marbella resiliente", "Ciclo integral del agua y eficiencia en riego"),
    ("A-02", "L2 Marbella resiliente", "Renaturalización urbana y corredores verdes"),
    ("A-03", "L2 Marbella resiliente", "Adecuación climática de espacios públicos (sombra)"),
    ("A-04", "L2 Marbella resiliente", "Red de saneamiento y pluviales"),
    ("A-05", "L2 Marbella resiliente", "Protección y regeneración del borde costero"),
    ("T-01", "L3 Gobernanza", "Compra pública verde e innovadora"),
    ("T-02", "L3 Gobernanza", "Plan de sensibilización y cultura climática"),
    ("T-03", "L3 Gobernanza", "Sello de calidad «Marbella Sostenible»"),
    ("T-04", "L3 Gobernanza", "Oficina Técnica de Cambio Climático"),
]


def datos():
    e = EMISIONES
    base, ult = e["difusas"][0], e["difusas"][-1]
    en = ENERGIA
    return {
        "emisiones": e,
        "meta_difusas_2030": META_DIFUSAS_2030,
        "reduccion_difusas_pct": round((ult - base) / base * 100, 1),
        "difusas_actividad": DIFUSAS_ACTIVIDAD,
        "electricidad": ELECTRICIDAD,
        "energia": en,
        "renovables_pct": [round(r / f * 100, 1) for r, f in zip(en["renovables"], en["final"])],
        "ahorro_tendencial_pct": [None if t is None else round((f - t) / t * 100, 1)
                                  for f, t in zip(en["final"], en["tendencial"])],
        "actuaciones": [{"cod": c, "linea": l, "nombre": n} for c, l, n in ACTUACIONES],
    }
