/* ============================================================================
   app.js — Observatorio del Plan Municipal contra el Cambio Climático (PMCC)
   de Marbella. Declaración de secciones, KPI y tarjetas; assets/ no se toca.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.DATOS || {};
  var F = Obs.fmt;
  var P = D.plan || {};
  var H = D.hidrico || {};
  var S = D.sostenibilidad || {};
  var M = D.matriculaciones || {};
  var R = D.recarga || null;

  var ult = function (a) {
    if (!a) return null;
    for (var i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i];
    return null;
  };
  var ultX = function (x, a) {
    if (!a) return null;
    for (var i = a.length - 1; i >= 0; i--) if (a[i] != null) return x[i];
    return null;
  };
  var suma = function (a) { return (a || []).reduce(function (s, v) { return s + (v || 0); }, 0); };
  var fPct = function (v, d) { return F.pct(v, d == null ? 1 : d); };
  var fSigno = function (v) { return v == null ? '—' : F.signo(v, 1) + ' %'; };
  var fT = function (v) { return F.num(v, 0) + ' t'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* --------------------------------------------------------------- Fuentes */
  var F_HCM = { txt: 'Junta de Andalucía · Huella de Carbono de los Municipios (HCM), vía borrador del PMCC', url: 'https://portalrediam.cica.es/geonetwork/srv/api/records/13ba8c67-df0c-4b26-80ca-03911ff6ae2e' };
  var F_DGT = { txt: 'DGT · microdatos mensuales de matriculaciones', url: 'https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-mensual.html' };
  var F_NAP = { txt: 'Punto de Acceso Nacional (DGT/MITECO) · puntos de recarga', url: 'https://nap.dgt.es/en/dataset/puntos-de-recarga-electrica-para-vehiculos' };
  var F_HID = { txt: 'REDIAM y Red Hidrosur, vía Observatorio hídrico de La Concepción', url: 'https://ammaconsulting.github.io/observatorio-hidrico-concepcion/' };
  var F_AEMET = { txt: 'AEMET OpenData · estación 6083X Marbella, vía Observatorio de sostenibilidad', url: 'https://ammaconsulting.github.io/observatorio-sostenibilidad-marbella/' };
  var F_PLAN = { txt: 'Borrador del PMCC de Marbella (v00, nov. 2025), tabla 41 · marco: Ley 8/2018 de Andalucía', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-15238' };
  var F_SAT = { txt: 'Copernicus (Sentinel-2, Sentinel-3/Landsat, Sentinel-5P), vía Observatorio de sostenibilidad', url: 'https://ammaconsulting.github.io/observatorio-sostenibilidad-marbella/' };

  var CH_ANUAL = { txt: 'Anual' };
  var CH_MES = { txt: 'Mensual', tipo: 'live' };
  var CH_DIA = { txt: 'Diario', tipo: 'live' };

  /* ----------------------------------------------- Cálculos de movilidad */
  var mTot = (M.x || []).map(function (_, i) { return M.bev[i] + M.phev[i] + M.hev[i] + M.combustion[i]; });
  var mEnch = (M.x || []).map(function (_, i) { return mTot[i] ? +((M.bev[i] + M.phev[i]) / mTot[i] * 100).toFixed(1) : null; });
  var mEnch12 = (M.x || []).map(function (_, i) {
    if (i < 11) return null;
    var e = 0, t = 0;
    for (var j = i - 11; j <= i; j++) { e += M.bev[j] + M.phev[j]; t += mTot[j]; }
    return t ? +(e / t * 100).toFixed(1) : null;
  });

  /* ------------------------------------------------- Cálculos de clima */
  var C = S.clima || { x: [] };
  /* Anomalía de cada mes frente a la media de ese mes en toda la serie disponible */
  var mediaMes = {};
  (C.x || []).forEach(function (p, i) {
    var mm = p.slice(5, 7), v = C.media[i];
    if (v == null) return;
    (mediaMes[mm] = mediaMes[mm] || []).push(v);
  });
  Object.keys(mediaMes).forEach(function (k) { var a = mediaMes[k]; mediaMes[k] = suma(a) / a.length; });
  var anomalia = (C.x || []).map(function (p, i) {
    var v = C.media[i]; return v == null ? null : +(v - mediaMes[p.slice(5, 7)]).toFixed(1);
  });

  /* ---------------------------------------------------------- Secciones */
  var SECCIONES = [

    /* ------------------------------------------------------- Objetivos -- */
    {
      id: 'objetivos', nombre: 'Objetivos 2030',
      titulo: 'Los objetivos del plan: dónde está Marbella',
      desc: 'El PMCC fija cuatro objetivos para 2030 siguiendo la Ley 8/2018 de Andalucía y el Plan Andaluz de Acción por el Clima. ' +
        'Los tres primeros se miden con el inventario de la Junta (HCM), que se publica una vez al año y con varios años de retraso: ' +
        'el borrador del plan (noviembre de 2025) llega hasta 2021. Estas cifras se actualizan cuando la Junta publica un año nuevo.',
      render: function () {
        var e = P.emisiones || {};
        var rp = P.renovables_pct || [], at = P.ahorro_tendencial_pct || [];
        var resto = (P.electricidad && P.electricidad.x || []).map(function (_, i) {
          var el = P.electricidad; return Math.round(el.total[i] - el.residencial[i] - el.comercio[i]);
        });
        return {
          hero: {
            valor: P.reduccion_difusas_pct, label: 'Reducción de las emisiones difusas entre 2005 y 2021. Meta para 2030: −55 %',
            formato: fSigno,
            extra: [
              { label: 'Emisiones difusas en 2021', valor: ult(e.difusas), formato: fT },
              { label: 'Meta de difusas en 2030', valor: P.meta_difusas_2030, formato: fT },
              { label: 'Por habitante en 2021', valor: ult(e.difusas_hab), formato: function (v) { return F.num(v, 2) + ' t'; } }
            ]
          },
          kpis: [
            { label: 'O1 · Emisiones difusas frente a 2005', valor: P.reduccion_difusas_pct, formato: fSigno, serie: e.difusas },
            { label: 'O2 · Renovables en la energía final (meta 42 %)', valor: ult(rp), formato: fPct, serie: rp },
            { label: 'O3 · Consumo frente al tendencial (meta −39,5 %)', valor: ult(at), formato: fSigno },
            { label: 'Consumo eléctrico en 2021', valor: ult((P.electricidad || {}).total), unidad: 'MWh', serie: (P.electricidad || {}).total }
          ],
          cards: [
            {
              titulo: 'Emisiones difusas y meta para 2030', sub: 'Toneladas de CO₂ equivalente, 2005–2021',
              chips: [CH_ANUAL], fuente: F_HCM, ancho: 'full',
              nota: 'Las difusas son las que no están en el comercio europeo de derechos de emisión: transporte, edificios, residuos, agua, agricultura y gases fluorados. La meta es el 45 % del valor de 2005.',
              spec: {
                type: 'line', xType: 'anual', x: e.x, yFormat: 'num', desdeCero: true,
                series: [{ name: 'Emisiones difusas', data: e.difusas }],
                ref: P.meta_difusas_2030, refLabel: 'Meta 2030: ' + F.num(P.meta_difusas_2030) + ' t'
              }
            },
            {
              titulo: 'De dónde salen las emisiones difusas', sub: 'tCO₂e por actividad, 2005 frente a 2021',
              chips: [CH_ANUAL], fuente: F_HCM,
              nota: '«Combustibles»: gasóleo, GLP y fuelóleo en calderas e instalaciones fijas. «Agricultura» incluye la ganadería.',
              spec: {
                type: 'bar', xType: 'cat', x: (P.difusas_actividad || {}).x, yFormat: 'num', xTodas: true,
                series: [
                  { name: '2005', data: (P.difusas_actividad || {})['2005'] },
                  { name: '2021', data: (P.difusas_actividad || {})['2021'] }
                ]
              }
            },
            {
              titulo: 'Emisiones difusas por habitante', sub: 'tCO₂e por habitante',
              chips: [CH_ANUAL], fuente: F_HCM,
              spec: { type: 'line', xType: 'anual', x: e.x, yFormat: 'dec2', series: [{ name: 'Por habitante', data: e.difusas_hab }] }
            },
            {
              titulo: 'Consumo de electricidad por sector', sub: 'MWh al año',
              chips: [CH_ANUAL], fuente: F_HCM, ancho: 'full',
              nota: '«Resto» agrupa la Administración, la industria, la agricultura y otros usos.',
              spec: {
                type: 'stack', xType: 'anual', x: (P.electricidad || {}).x, yFormat: 'num',
                series: [
                  { name: 'Residencial', data: (P.electricidad || {}).residencial },
                  { name: 'Comercio y servicios', data: (P.electricidad || {}).comercio },
                  { name: 'Resto', data: resto }
                ]
              }
            },
            {
              titulo: 'Peso de las renovables en la energía final', sub: 'Objetivo 2: 42 % en 2030',
              chips: [CH_ANUAL], fuente: F_HCM,
              nota: 'El plan solo calcula 2019, 2020 y 2021.',
              spec: {
                type: 'bar', xType: 'anual', x: (P.energia || {}).x, yFormat: 'pct',
                yMax: 45, series: [{ name: 'Renovables', data: rp }], ref: 42, refLabel: 'Meta 2030: 42 %'
              }
            },
            {
              titulo: 'Consumo de energía final frente al tendencial', sub: 'MWh. Objetivo 3: quedar un 39,5 % por debajo en 2030',
              chips: [CH_ANUAL], fuente: F_HCM,
              spec: {
                type: 'line', xType: 'anual', x: (P.energia || {}).x, yFormat: 'num', desdeCero: true,
                series: [
                  { name: 'Consumo real', data: (P.energia || {}).final },
                  { name: 'Tendencial', data: (P.energia || {}).tendencial }
                ]
              }
            }
          ]
        };
      }
    },

    /* ------------------------------------------------------ Movilidad --- */
    {
      id: 'movilidad', nombre: 'Movilidad',
      titulo: 'Movilidad baja en emisiones',
      desc: 'Seguimiento de las actuaciones M-01 (Zona de Bajas Emisiones) y M-03 (electrificación). El transporte es el 64 % de las emisiones difusas de Marbella. ' +
        'Se cuentan los turismos matriculados con domicilio en Marbella según su tecnología, y los puntos de recarga públicos dentro del término municipal.',
      render: function () {
        var lx = ultX(M.x, M.bev);
        var cards = [
          {
            titulo: 'Turismos matriculados por tecnología', sub: 'Matriculaciones al mes con domicilio en Marbella',
            chips: [CH_MES], fuente: F_DGT, ancho: 'full',
            nota: 'Incluye los usados de importación, que se matriculan por primera vez en España. BEV: eléctrico de batería; PHEV: híbrido enchufable (incluye autonomía extendida); HEV: híbrido no enchufable.',
            spec: {
              type: 'stack', xType: 'mes', x: M.x, yFormat: 'num',
              series: [
                { name: 'Eléctrico (BEV)', data: M.bev },
                { name: 'Híbrido enchufable (PHEV)', data: M.phev },
                { name: 'Híbrido (HEV)', data: M.hev },
                { name: 'Combustión', data: M.combustion }
              ]
            }
          },
          {
            titulo: 'Cuota de turismos enchufables', sub: 'BEV + PHEV sobre el total de turismos matriculados',
            chips: [CH_MES], fuente: F_DGT,
            spec: {
              type: 'line', xType: 'mes', x: M.x, yFormat: 'pct', desdeCero: true,
              series: [{ name: 'Mensual', data: mEnch }, { name: 'Últimos 12 meses', data: mEnch12 }]
            }
          }
        ];
        if (R) {
          cards.push({
            titulo: 'Puntos de recarga públicos por potencia', sub: 'Dentro del término municipal, a ' + R.fecha.split('-').reverse().join('/'),
            chips: [CH_DIA], fuente: F_NAP,
            spec: {
              type: 'barh', x: ['Hasta 22 kW', 'De 22 a 50 kW', '50 kW o más'], yFormat: 'num',
              series: [{ name: 'Puntos', data: [R.bandas.lenta, R.bandas.rapida, R.bandas.ultrarrapida] }]
            }
          });
          if (R.historico && R.historico.x.length >= 7) {
            cards.push({
              titulo: 'Evolución de los puntos de recarga', sub: 'Foto diaria desde que funciona el observatorio',
              chips: [CH_DIA], fuente: F_NAP,
              spec: { type: 'line', xType: 'cat', x: R.historico.x, yFormat: 'num', series: [{ name: 'Puntos', data: R.historico.puntos }] }
            });
          }
        }
        return {
          hero: {
            valor: ult(mEnch12), label: 'Turismos enchufables sobre el total matriculado en los últimos 12 meses (hasta ' + Obs.periodo(lx, 'mes') + ')',
            formato: fPct,
            extra: [
              { label: 'Eléctricos (BEV) en 12 meses', valor: suma((M.bev || []).slice(-12)), formato: F.num },
              { label: 'Híbridos enchufables en 12 meses', valor: suma((M.phev || []).slice(-12)), formato: F.num },
              { label: 'Turismos matriculados en 12 meses', valor: suma(mTot.slice(-12)), formato: F.num }
            ]
          },
          kpis: [
            { label: 'Eléctricos (BEV), ' + Obs.periodo(lx, 'mes'), valor: ult(M.bev), serie: (M.bev || []).slice(-24) },
            { label: 'Híbridos enchufables, ' + Obs.periodo(lx, 'mes'), valor: ult(M.phev), serie: (M.phev || []).slice(-24) },
            R ? { label: 'Puntos de recarga públicos', valor: R.puntos } : null,
            R ? { label: 'Potencia de recarga instalada', valor: R.kw, unidad: 'kW' } : null
          ].filter(Boolean),
          cards: cards
        };
      }
    },

    /* ----------------------------------------------------------- Agua --- */
    {
      id: 'agua', nombre: 'Agua',
      titulo: 'Agua: sequía y lluvias intensas',
      desc: 'Seguimiento de la actuación A-01 (ciclo integral del agua) y de dos riesgos que el plan prioriza: la sequía y las inundaciones por lluvias torrenciales. ' +
        'El embalse de La Concepción abastece a Marbella; la lluvia se mide en el pluviómetro de la EDAR de Marbella de la Red Hidrosur.',
      render: function () {
        var em = H.embalse || {}, u = em.ultimo || {};
        var la = H.lluvia_anual || { series: {}, nombres: {} };
        var lr = H.lluvia_reciente || {};
        return {
          hero: {
            valor: u.porcentaje, label: 'Reserva del embalse de La Concepción a ' + (u.fecha || '').split('-').reverse().join('/'),
            formato: fPct,
            extra: [
              { label: 'Volumen embalsado', valor: u.volumen, formato: function (v) { return F.num(v, 2) + ' hm³'; } },
              { label: 'Capacidad', valor: u.capacidad, formato: function (v) { return F.num(v, 2) + ' hm³'; } },
              { label: 'Lluvia en el año hidrológico ' + (la.en_curso || ''), valor: ult(la.series['024P01']), formato: function (v) { return F.num(v, 0) + ' mm'; } }
            ]
          },
          kpis: [
            { label: 'Lluvia en los últimos 30 días (EDAR Marbella)', valor: suma((lr.v || []).slice(-30)), unidad: 'mm', dec: 1, formato: function (v) { return F.num(v, 1); } },
            { label: 'Día más lluvioso de los últimos 120', valor: Math.max.apply(null, (lr.v || [0]).map(function (v) { return v || 0; })), unidad: 'mm', formato: function (v) { return F.num(v, 1); } }
          ],
          cards: [
            {
              titulo: 'Reserva del embalse de La Concepción', sub: 'Porcentaje de la capacidad, últimos 10 años',
              chips: [CH_DIA], fuente: F_HID, ancho: 'full',
              spec: { type: 'line', xType: 'cat', x: em.x, yFormat: 'pct', desdeCero: true, yMax: 100, zoomDesde: 70, series: [{ name: 'Reserva', data: em.porcentaje }] }
            },
            {
              titulo: 'Lluvia por año hidrológico', sub: 'mm de octubre a septiembre',
              chips: [CH_DIA], fuente: F_HID,
              nota: 'El último año está en curso. Los años con menos del 90 % de días medidos se dejan sin dato.',
              spec: {
                type: 'bar', xType: 'cat', x: la.x, yFormat: 'num',
                series: [
                  { name: la.nombres['024P01'] || 'EDAR Marbella', data: la.series['024P01'] },
                  { name: la.nombres['016P01'] || 'Presa de La Concepción', data: la.series['016P01'] }
                ]
              }
            },
            {
              titulo: 'Lluvia diaria reciente', sub: 'mm al día, últimos 120 días (' + (lr.estacion || 'EDAR Marbella') + ')',
              chips: [CH_DIA], fuente: F_HID,
              spec: { type: 'bar', xType: 'cat', x: lr.x, yFormat: 'dec1', zoom: false, series: [{ name: 'Lluvia', data: lr.v }] }
            }
          ]
        };
      }
    },

    /* ---------------------------------------------------------- Clima --- */
    {
      id: 'clima', nombre: 'Clima',
      titulo: 'Temperaturas y precipitación',
      desc: 'El riesgo de temperaturas extremas es uno de los que más pesa en el análisis del plan (actuación A-03, sombra en espacios públicos). ' +
        'Datos mensuales de la estación de AEMET en Marbella (6083X). La anomalía compara cada mes con la media de ese mismo mes en la serie disponible desde 2017, que es corta: sirve para ver meses anómalos, no para medir una tendencia climática.',
      render: function () {
        var lx = ultX(C.x, C.media);
        return {
          kpis: [
            { label: 'Temperatura media, ' + Obs.periodo(lx, 'mes'), valor: ult(C.media), unidad: '°C', formato: function (v) { return F.num(v, 1); }, serie: (C.media || []).slice(-24) },
            { label: 'Anomalía frente a su mes', valor: ult(anomalia), unidad: '°C', formato: function (v) { return F.signo(v, 1); } },
            { label: 'Máxima media del mes', valor: ult(C.maxima), unidad: '°C', formato: function (v) { return F.num(v, 1); } },
            { label: 'Precipitación del mes', valor: ultX(C.x, C.precipitacion) === lx ? ult(C.precipitacion) : null, unidad: 'mm', formato: function (v) { return F.num(v, 1); } }
          ],
          cards: [
            {
              titulo: 'Temperatura mensual', sub: 'Media, media de las máximas y media de las mínimas (°C)',
              chips: [CH_MES], fuente: F_AEMET, ancho: 'full',
              nota: 'Los meses sin dato de la estación quedan en blanco.',
              spec: {
                type: 'line', xType: 'mes', x: C.x, yFormat: 'dec1',
                series: [
                  { name: 'Máxima media', data: C.maxima },
                  { name: 'Media', data: C.media },
                  { name: 'Mínima media', data: C.minima }
                ]
              }
            },
            {
              titulo: 'Anomalía de temperatura', sub: '°C respecto a la media del mismo mes (por encima de 0, más cálido)',
              chips: [CH_MES], fuente: F_AEMET,
              spec: { type: 'line', xType: 'mes', x: C.x, yFormat: 'dec1', series: [{ name: 'Anomalía', data: anomalia }], ref: 0, refLabel: 'Media del mes' }
            },
            {
              titulo: 'Precipitación mensual', sub: 'mm',
              chips: [CH_MES], fuente: F_AEMET,
              spec: { type: 'bar', xType: 'mes', x: C.x, yFormat: 'num', series: [{ name: 'Precipitación', data: C.precipitacion }] }
            }
          ]
        };
      }
    },

    /* ------------------------------------------------------ Territorio -- */
    {
      id: 'territorio', nombre: 'Territorio',
      titulo: 'Vegetación, calor urbano y aire, vistos desde satélite',
      desc: 'Indicadores de contexto para las actuaciones A-02 (renaturalización), A-03 (adecuación climática de espacios públicos) y M-01 (Zona de Bajas Emisiones). ' +
        'Son medias sobre todo el término municipal: muestran la tendencia del municipio, no el efecto de una obra concreta. ' +
        'Las páginas diarias de la estación de calidad del aire Marbella Arco dejaron de publicarse en 2021, así que el NO₂ se sigue por satélite.',
      render: function () {
        var n = S.ndvi || {}, l = S.lst || {}, o = S.no2 || {};
        return {
          kpis: [
            { label: 'Vegetación (NDVI), ' + Obs.periodo(ultX(n.x, n.v), 'mes'), valor: ult(n.v), formato: function (v) { return F.num(v, 3); }, serie: (n.v || []).slice(-24) },
            { label: 'Temperatura de superficie, ' + Obs.periodo(ultX(l.x, l.v), 'mes'), valor: ult(l.v), unidad: '°C', formato: function (v) { return F.num(v, 1); }, serie: (l.v || []).slice(-24) },
            { label: 'NO₂ troposférico, ' + Obs.periodo(ultX(o.x, o.v), 'mes'), valor: ult(o.v), unidad: 'µmol/m²', formato: function (v) { return F.num(v, 1); }, serie: (o.v || []).slice(-24), invertir: true }
          ],
          cards: [
            {
              titulo: 'Índice de vegetación (NDVI)', sub: 'Media municipal mensual, Sentinel-2',
              chips: [CH_MES], fuente: F_SAT, ancho: 'full',
              spec: { type: 'line', xType: 'mes', x: n.x, yFormat: 'dec2', series: [{ name: 'NDVI', data: n.v }] }
            },
            {
              titulo: 'Temperatura de superficie', sub: 'Media municipal mensual (°C)',
              chips: [CH_MES], fuente: F_SAT,
              nota: 'Es la temperatura del suelo y los tejados vista desde el satélite, no la del aire.',
              spec: { type: 'line', xType: 'mes', x: l.x, yFormat: 'dec1', series: [{ name: 'Temperatura de superficie', data: l.v }] }
            },
            {
              titulo: 'Dióxido de nitrógeno (NO₂) troposférico', sub: 'Media municipal mensual, Sentinel-5P (µmol/m²)',
              chips: [CH_MES], fuente: F_SAT,
              spec: { type: 'line', xType: 'mes', x: o.x, yFormat: 'dec1', series: [{ name: 'NO₂', data: o.v }] }
            }
          ]
        };
      }
    },

    /* ------------------------------------------------------------ Plan -- */
    {
      id: 'plan', nombre: 'Plan de acción',
      titulo: 'Las 15 actuaciones del plan',
      desc: 'Actuaciones de la tabla 41 del borrador del PMCC, en tres líneas estratégicas. ' +
        'Su grado de ejecución, cronograma y presupuesto (apartado 9 del plan) dependen de que cada área municipal lo informe: hoy no existe una fuente pública para ello.',
      render: function () {
        var act = P.actuaciones || [];
        var lineas = [], cuenta = {};
        act.forEach(function (a) { if (!(a.linea in cuenta)) { lineas.push(a.linea); cuenta[a.linea] = 0; } cuenta[a.linea]++; });
        var filas = act.map(function (a) {
          return '<tr><td><b>' + esc(a.cod) + '</b></td><td>' + esc(a.nombre) + '</td><td>' + esc(a.linea) + '</td><td>Pendiente de que el área informe</td></tr>';
        }).join('');
        return {
          cards: [
            {
              titulo: 'Actuaciones por línea estratégica', sub: 'Número de actuaciones',
              chips: [CH_ANUAL], fuente: F_PLAN,
              spec: { type: 'donut', x: lineas, yFormat: 'num', series: [{ name: 'Actuaciones', data: lineas.map(function (l) { return cuenta[l]; }) }] }
            }
          ],
          extra: '<div class="obs-note">El estado de cada actuación se mostrará aquí cuando el Ayuntamiento lo comunique (estado, fechas, presupuesto ejecutado e indicador de ejecución).</div>' +
            '<div class="pmcc-actuaciones"><table>' +
            '<thead><tr><th style="text-align:left">Código</th><th style="text-align:left">Actuación</th><th style="text-align:left">Línea</th><th style="text-align:left">Estado</th></tr></thead>' +
            '<tbody>' + filas + '</tbody></table></div>'
        };
      }
    }
  ];

  /* ----------------------------------------------------------- Arranque -- */
  Obs.init({
    titulo: 'Observatorio del Plan Municipal contra el Cambio Climático · Marbella',
    subtitulo: 'Objetivos 2030, movilidad, agua, clima y territorio, con fuentes oficiales que se actualizan solas',
    secciones: SECCIONES,
    actualizado: (D.meta || {}).actualizado,
    fuentes: [F_HCM, F_DGT, F_NAP, F_HID, F_AEMET, F_SAT],
    metodologia: 'Un proceso automático (<code>pipeline/build_data.py</code>) se ejecuta cada día en GitHub Actions: descarga las matriculaciones de la DGT y los puntos de recarga del Punto de Acceso Nacional, ' +
      'y lee los datos que publican los observatorios hídrico y de sostenibilidad de AMMA (REDIAM, Red Hidrosur, AEMET y Copernicus). ' +
      'La línea base de emisiones y energía está transcrita de los anexos del borrador del PMCC (herramienta HCM de la Junta de Andalucía) y se actualizará cuando la Junta publique años nuevos. ' +
      'Cada tarjeta enlaza a su fuente y permite ver los datos en tabla y descargarlos en CSV.',
    pie: 'Observatorio elaborado por AMMA Consulting. Los datos son de las fuentes citadas; su tratamiento y presentación, de este observatorio.'
  });

  Obs.estado('Datos actualizados el ' + new Date((D.meta || {}).actualizado || Date.now()).toLocaleDateString('es-ES'), 'live');

})();
