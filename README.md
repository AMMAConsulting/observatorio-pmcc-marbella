# Observatorio del Plan Municipal contra el Cambio Climático · Marbella

**Web:** https://ammaconsulting.github.io/observatorio-pmcc-marbella/

Seguimiento del PMCC de Marbella (borrador v00, noviembre de 2025): objetivos 2030,
movilidad baja en emisiones, agua, clima, territorio y las 15 actuaciones del plan.
Montado sobre el kit común de observatorios de AMMA (`assets/` no se toca).

## Fuentes

| Sección | Fuente | Ritmo | Cómo |
|---|---|---|---|
| Objetivos 2030 | Junta de Andalucía · Huella de Carbono de los Municipios (HCM), transcrita de los anexos del borrador del PMCC | Anual (el plan llega a 2021) | `pipeline/sources/plan.py`, a mano cuando la Junta publique un año nuevo |
| Movilidad | DGT · microdatos mensuales de matriculaciones (MATRABA) | Mensual | `sources/dgt.py`; caché por mes en `pipeline/cache/dgt_matriculaciones.json` |
| Movilidad | Punto de Acceso Nacional (DGT/MITECO) · puntos de recarga, DATEX II | Diario | `sources/dgt.py`; foto diaria en `pipeline/cache/recarga_historico.json` |
| Agua | REDIAM + Red Hidrosur, vía el [observatorio hídrico](https://ammaconsulting.github.io/observatorio-hidrico-concepcion/) | Diario | `sources/observatorios.py` |
| Clima y territorio | AEMET (6083X) y Copernicus, vía el [observatorio de sostenibilidad](https://ammaconsulting.github.io/observatorio-sostenibilidad-marbella/) | Mensual | `sources/observatorios.py` |

## Actualización

La Action `actualizar-datos.yml` corre cada día a las 07:30 UTC, ejecuta
`python pipeline/build_data.py` y publica `data/data.js` y la caché si cambian.
Si una fuente falla, esa parte conserva los datos publicados; si la recolección
cae por debajo del 90 % de los valores vigentes, no se publica nada.

## Pendiente

- Estado, fechas y presupuesto de las 15 actuaciones: dependen de que el Ayuntamiento los informe.
- Consumos municipales (alumbrado, edificios, autoconsumo): requieren autorización del Ayuntamiento en Datadis.
- Calidad del aire en estación: la Junta dejó de publicar las páginas diarias en 2021; se usa NO₂ por satélite.
