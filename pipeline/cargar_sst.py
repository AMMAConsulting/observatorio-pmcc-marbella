# -*- coding: utf-8 -*-
"""Rellena la cache de temperatura del mar (NOAA OISST, 1982-hoy) por tramos.

    python pipeline/cargar_sst.py [segundos]

El servidor ERDDAP de NOAA tarda varios minutos por ano y a veces da 503, asi
que la carga inicial se hace en pasadas con tope de tiempo (Action
cargar-sst.yml). Cada ano se guarda en cuanto llega. Cuando la serie esta
completa, cada pasada solo vuelve a pedir los dos ultimos anos.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sources import mar  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(RAIZ, "pipeline", "cache", "sst_diaria.json")

if __name__ == "__main__":
    tope = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
    try:
        r = mar.temperatura_mar(CACHE, presupuesto_s=tope)
        print(f"Serie completa hasta {r['ultimo_dia']}")
    except Exception as e:                                        # noqa: BLE001
        print(f"Pasada terminada sin completar: {e}")
    sys.exit(0)
