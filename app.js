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
  var CL = D.clima_largo || {};
  var MAR = D.mar || {};
  var NM = D.nivel_mar || {};
  var CO2 = D.co2 || { x: [], v: [] };
  var EL = D.electricidad || {};

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
  var fFecha = function (iso) { return iso ? iso.split('-').reverse().join('/') : ''; };
  /* Media de una serie anual entre dos años (incluidos), sobre los años con dato */
  var mediaAnios = function (o, k, a0, a1) {
    var v = (o.x || []).map(function (x, i) { return (+x >= a0 && +x <= a1) ? o[k][i] : null; }).filter(function (x) { return x != null; });
    return v.length ? v.reduce(function (p, c) { return p + c; }, 0) / v.length : null;
  };
  var anioMax = function (o, k) {
    var i = -1, m = -Infinity;
    (o[k] || []).forEach(function (v, j) { if (v != null && v > m) { m = v; i = j; } });
    return i < 0 ? null : o.x[i];
  };
  /* Media móvil de los n últimos valores (exige el 80 % con dato) */
  var movil = function (a, n) {
    return (a || []).map(function (_, i) {
      if (i < n - 1) return null;
      var v = a.slice(i - n + 1, i + 1).filter(function (x) { return x != null; });
      return v.length >= n * 0.8 ? +(v.reduce(function (p, c) { return p + c; }, 0) / v.length).toFixed(2) : null;
    });
  };
  /* Franjas de calentamiento (Ed Hawkins): una franja por año, de azul (más frío
     que 1961-1990) a rojo (más cálido). Lectura de un vistazo; las cifras exactas
     están en la tarjeta de anomalía anual. */
  var franjas = function (a) {
    if (!a.x || !a.x.length) return '';
    var x0 = +a.x[0], x1 = +a.x[a.x.length - 1], n = x1 - x0 + 1, w = 10;
    var porAnio = {}; a.x.forEach(function (x, i) { porAnio[x] = a.anomalia[i]; });
    var color = function (v) {
      if (v == null) return 'var(--surface-sunk)';
      var t = Math.max(-1, Math.min(1, v / 2));          /* ±2 °C satura el color */
      var azul = [33, 102, 172], rojo = [178, 24, 43], blanco = [247, 247, 247];
      var c = t < 0 ? azul : rojo, k = Math.abs(t);
      return 'rgb(' + blanco.map(function (b, j) { return Math.round(b + (c[j] - b) * k); }).join(',') + ')';
    };
    var rects = '';
    for (var y = x0; y <= x1; y++) {
      var v = porAnio[String(y)];
      rects += '<rect x="' + (y - x0) * w + '" y="0" width="' + w + '" height="60" fill="' + color(v) + '"><title>' + y + ': ' +
        (v == null ? 'sin dato' : F.signo(v, 2) + ' °C') + '</title></rect>';
    }
    return '<div class="pmcc-franjas"><div class="t">Franjas de calentamiento de Málaga, ' + x0 + '-' + x1 + '</div>' +
      '<div class="s">Cada franja es un año: azul, más frío que la media de 1961-1990; rojo, más cálido. Pasa el ratón para ver la cifra.</div>' +
      '<svg viewBox="0 0 ' + n * w + ' 60" preserveAspectRatio="none" role="img" aria-label="Franjas de calentamiento de Málaga">' + rects + '</svg>' +
      '<div class="e"><span>' + x0 + '</span><span>' + x1 + '</span></div>' +
      '<div class="f">Fuente: <a href="' + F_GHCN.url + '" target="_blank" rel="noopener">' + esc(F_GHCN.txt) + '</a></div></div>';
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* --------------------------------------------------------------- Fuentes */
  var F_HCM = { txt: 'Junta de Andalucía · Huella de Carbono de los Municipios (HCM), vía borrador del PMCC', url: 'https://portalrediam.cica.es/geonetwork/srv/api/records/13ba8c67-df0c-4b26-80ca-03911ff6ae2e' };
  var F_DGT = { txt: 'DGT · microdatos mensuales de matriculaciones', url: 'https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-mensual.html' };
  var F_NAP = { txt: 'Punto de Acceso Nacional (DGT/MITECO) · puntos de recarga', url: 'https://nap.dgt.es/en/dataset/puntos-de-recarga-electrica-para-vehiculos' };
  var F_HID = { txt: 'REDIAM y Red Hidrosur, vía Observatorio hídrico de La Concepción', url: 'https://ammaconsulting.github.io/observatorio-hidrico-concepcion/' };
  var F_AEMET = { txt: 'AEMET OpenData · estación 6083X Marbella, vía Observatorio de sostenibilidad', url: 'https://ammaconsulting.github.io/observatorio-sostenibilidad-marbella/' };
  var F_PLAN = { txt: 'Borrador del PMCC de Marbella (v00, nov. 2025), tabla 41 · marco: Ley 8/2018 de Andalucía', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-15238' };
  var F_SAT = { txt: 'Copernicus (Sentinel-2, Sentinel-3/Landsat, Sentinel-5P), vía Observatorio de sostenibilidad', url: 'https://ammaconsulting.github.io/observatorio-sostenibilidad-marbella/' };

  var F_GHCN = { txt: 'NOAA GHCN-Daily · Málaga Aeropuerto (OMM 08482)', url: 'https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily' };
  var F_SST = { txt: 'NOAA OISST v2.1 · celda frente a Marbella', url: 'https://www.ncei.noaa.gov/products/optimum-interpolation-sst' };
  var F_PSMSL = { txt: 'PSMSL · mareógrafo de Málaga (estación 1810)', url: 'https://psmsl.org/data/obtaining/stations/1810.php' };
  var F_REE = { txt: 'Red Eléctrica · REData, sistema eléctrico andaluz', url: 'https://www.ree.es/es/datos/generacion/estructura-generacion' };
  var F_CO2 = { txt: 'NOAA Global Monitoring Laboratory · Mauna Loa', url: 'https://gml.noaa.gov/ccgg/trends/' };

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

    /* ------------------------------------------------------- Resumen --- */
    {
      id: 'resumen', nombre: 'Resumen',
      titulo: 'Cómo está cambiando el clima en Marbella',
      desc: 'Las series más largas disponibles para la Costa del Sol, comparadas con el clima de referencia 1961-1990. ' +
        'La temperatura y la lluvia son de la estación de Málaga Aeropuerto (desde 1942, a unos 50 km), la única con una serie larga y continua; el mar se mide frente a la costa de Marbella.',
      render: function () {
        var a = CL.anual || { x: [] };
        var dec = mediaAnios(a, 'anomalia', 2016, 2025);
        var mA = (MAR.anual || {});
        var kpis = [
          { label: 'Noches tropicales en ' + ult(a.x) + ' (media 1961-1990: ' + F.num(a.noches20_normal, 0) + ')', valor: ult(a.noches20), serie: (a.noches20 || []).slice(-30) },
          { label: 'Días de 30 °C o más en ' + ult(a.x) + ' (media 1961-1990: ' + F.num(a.dias30_normal, 0) + ')', valor: ult(a.dias30), serie: (a.dias30 || []).slice(-30) },
          NM.mm_anio != null ? { label: 'Subida del nivel del mar en Málaga (' + NM.desde + '-' + NM.hasta + ')', valor: NM.mm_anio, unidad: 'mm/año', formato: function (v) { return F.num(v, 1); } } : null,
          MAR.ultima_anomalia != null ? { label: 'Mar frente a Marbella el ' + fFecha(MAR.ultimo_dia) + ', frente a lo normal', valor: MAR.ultima_anomalia, unidad: '°C', formato: function (v) { return F.signo(v, 1); } } : null
        ].filter(Boolean);
        return {
          hero: {
            valor: dec, label: 'Más cálida la última década (2016-2025) que el clima de referencia 1961-1990, en temperatura media anual',
            formato: function (v) { return F.signo(v, 2) + ' °C'; },
            extra: [
              { label: 'Año más cálido de la serie', valor: anioMax(a, 'media'), formato: function (v) { return v; } },
              { label: 'Noches tropicales al año (2016-2025)', valor: mediaAnios(a, 'noches20', 2016, 2025), formato: function (v) { return F.num(v, 0) + ' (antes ' + F.num(a.noches20_normal, 0) + ')'; } },
              { label: 'CO₂ en la atmósfera, ' + Obs.periodo(ult(CO2.x), 'mes'), valor: ult(CO2.v), formato: function (v) { return F.num(v, 1) + ' ppm'; } }
            ]
          },
          kpis: kpis,
          cards: [
            {
              titulo: 'Temperatura media anual en Málaga desde 1943', sub: '°C. La línea discontinua es la media de 1961-1990',
              chips: [CH_DIA], fuente: F_GHCN, ancho: 'full',
              nota: 'Años con menos de 330 días medidos, sin dato (1942 y 1946). La media de 10 años suaviza la variación de un año a otro.',
              spec: {
                type: 'line', xType: 'anual', x: a.x, zoom: false, yFormat: 'dec1',
                series: [{ name: 'Media anual', data: a.media }, { name: 'Media de 10 años', data: movil(a.media, 10) }],
                ref: a.normal, refLabel: 'Media 1961-1990: ' + F.num(a.normal, 1) + ' °C'
              }
            },
            {
              titulo: 'Noches tropicales por año', sub: 'Noches con mínima de 20 °C o más',
              chips: [CH_DIA], fuente: F_GHCN,
              spec: { type: 'bar', xType: 'anual', x: a.x, zoom: false, yFormat: 'num', series: [{ name: 'Noches tropicales', data: a.noches20 }], ref: a.noches20_normal, refLabel: 'Media 1961-1990' }
            },
            {
              titulo: 'Días de calor por año', sub: 'Días con máxima de 30 °C o más',
              chips: [CH_DIA], fuente: F_GHCN,
              spec: { type: 'bar', xType: 'anual', x: a.x, zoom: false, yFormat: 'num', series: [{ name: 'Días ≥ 30 °C', data: a.dias30 }], ref: a.dias30_normal, refLabel: 'Media 1961-1990' }
            }
          ],
          extra: franjas(a)
        };
      }
    },

    /* --------------------------------------------------- Temperatura --- */
    {
      id: 'temperatura', nombre: 'Temperatura',
      titulo: 'Temperatura: medias, calor extremo y noches',
      desc: 'Indicadores de calor que el plan identifica entre los riesgos más graves (temperaturas extremas, salud, turismo). ' +
        'Serie diaria de Málaga Aeropuerto desde 1942 (NOAA GHCN-Daily), comparada con la media de 1961-1990, y la estación de AEMET en Marbella para los últimos años.',
      render: function () {
        var a = CL.anual || { x: [] }, m = CL.mensual || { x: [] };
        var desde = Math.max(0, (m.x || []).indexOf('1990-01'));
        var lx = ultX(C.x, C.media);
        return {
          kpis: [
            { label: 'Anomalía de temperatura, ' + Obs.periodo(ultX(m.x, m.anomalia), 'mes') + ' (Málaga)', valor: ult(m.anomalia), unidad: '°C', formato: function (v) { return F.signo(v, 1); } },
            { label: 'Días de 35 °C o más en ' + ult(a.x) + ' (media 1961-1990: ' + F.num(a.dias35_normal, 0) + ')', valor: ult(a.dias35) },
            { label: 'Noches de 25 °C o más en ' + ult(a.x) + ' (media 1961-1990: ' + F.num(a.noches25_normal, 1) + ')', valor: ult(a.noches25) },
            { label: 'Temperatura media en Marbella, ' + Obs.periodo(lx, 'mes'), valor: ult(C.media), unidad: '°C', formato: function (v) { return F.num(v, 1); } }
          ],
          cards: [
            {
              titulo: 'Anomalía de temperatura de cada año', sub: '°C respecto a la media de 1961-1990 (por encima de 0, más cálido)',
              chips: [CH_DIA], fuente: F_GHCN, ancho: 'full',
              spec: { type: 'line', xType: 'anual', x: a.x, zoom: false, yFormat: 'dec1', series: [{ name: 'Anomalía', data: a.anomalia }], ref: 0, refLabel: 'Media 1961-1990' }
            },
            {
              titulo: 'Anomalía de temperatura de cada mes', sub: '°C respecto a la media de ese mes en 1961-1990, desde 1990',
              chips: [CH_DIA], fuente: F_GHCN, ancho: 'full',
              spec: { type: 'line', xType: 'mes', x: (m.x || []).slice(desde), yFormat: 'dec1', zoomDesde: 70, series: [{ name: 'Anomalía', data: (m.anomalia || []).slice(desde) }], ref: 0, refLabel: 'Media del mes' }
            },
            {
              titulo: 'Días de calor intenso por año', sub: 'Días con máxima de 35 °C o más',
              chips: [CH_DIA], fuente: F_GHCN,
              spec: { type: 'bar', xType: 'anual', x: a.x, zoom: false, yFormat: 'num', series: [{ name: 'Días ≥ 35 °C', data: a.dias35 }], ref: a.dias35_normal, refLabel: 'Media 1961-1990' }
            },
            {
              titulo: 'Noches tórridas por año', sub: 'Noches con mínima de 25 °C o más',
              chips: [CH_DIA], fuente: F_GHCN,
              spec: { type: 'bar', xType: 'anual', x: a.x, zoom: false, yFormat: 'num', series: [{ name: 'Noches ≥ 25 °C', data: a.noches25 }] }
            },
            {
              titulo: 'Temperatura máxima absoluta de cada año', sub: '°C',
              chips: [CH_DIA], fuente: F_GHCN,
              spec: { type: 'line', xType: 'anual', x: a.x, zoom: false, yFormat: 'dec1', series: [{ name: 'Máxima del año', data: a.maxima_abs }] }
            },
            {
              titulo: 'Temperatura mensual en Marbella', sub: 'Estación de AEMET 6083X: media, media de máximas y de mínimas (°C)',
              chips: [CH_MES], fuente: F_AEMET,
              nota: 'Serie corta (desde 2017) y con meses sin dato: sirve para seguir el año en curso, no la tendencia.',
              spec: {
                type: 'line', xType: 'mes', x: C.x, yFormat: 'dec1',
                series: [{ name: 'Máxima media', data: C.maxima }, { name: 'Media', data: C.media }, { name: 'Mínima media', data: C.minima }]
              }
            }
          ]
        };
      }
    },

    /* ------------------------------------------------ Lluvia y sequía --- */
    {
      id: 'lluvia', nombre: 'Lluvia y sequía',
      titulo: 'Lluvia, sequía y lluvias torrenciales',
      desc: 'Sequía e inundaciones por lluvias torrenciales son dos de los impactos que el plan prioriza. ' +
        'Precipitación diaria de Málaga Aeropuerto desde 1942, por año hidrológico (octubre-septiembre), comparada con 1961-1990.',
      render: function () {
        var l = CL.lluvia || { x: [] }, s = CL.sequia || { x: [] };
        var desde = Math.max(0, (s.x || []).indexOf('1990-01'));
        return {
          hero: {
            valor: ult(s.pct), label: 'Lluvia de los últimos 12 meses (hasta ' + Obs.periodo(ult(s.x), 'mes') + ') respecto a lo normal de 1961-1990',
            formato: function (v) { return F.num(v, 0) + ' %'; },
            extra: [
              { label: 'Lluvia normal en 12 meses', valor: s.normal_mm, formato: function (v) { return F.num(v, 0) + ' mm'; } },
              { label: 'Último año hidrológico completo (' + ult(l.x) + ')', valor: ult(l.total), formato: function (v) { return F.num(v, 0) + ' mm'; } }
            ]
          },
          cards: [
            {
              titulo: 'Sequía: lluvia de los últimos 12 meses', sub: '% sobre lo normal de 1961-1990, desde 1990 (por debajo de 100, más seco de lo normal)',
              chips: [CH_DIA], fuente: F_GHCN, ancho: 'full',
              spec: { type: 'line', xType: 'mes', x: (s.x || []).slice(desde), yFormat: 'num', desdeCero: true, series: [{ name: '% de lo normal', data: (s.pct || []).slice(desde) }], ref: 100, refLabel: 'Lo normal' }
            },
            {
              titulo: 'Lluvia por año hidrológico', sub: 'mm de octubre a septiembre',
              chips: [CH_DIA], fuente: F_GHCN, ancho: 'full',
              spec: { type: 'bar', xType: 'cat', x: l.x, zoom: false, yFormat: 'num', series: [{ name: 'Lluvia', data: l.total }], ref: l.normal, refLabel: 'Media 1961-1990: ' + F.num(l.normal, 0) + ' mm' }
            },
            {
              titulo: 'Días de lluvia torrencial por año', sub: 'Días con 30 mm o más',
              chips: [CH_DIA], fuente: F_GHCN,
              spec: { type: 'bar', xType: 'cat', x: l.x, zoom: false, yFormat: 'num', series: [{ name: 'Días ≥ 30 mm', data: l.dias30 }], ref: l.dias30_normal, refLabel: 'Media 1961-1990' }
            },
            {
              titulo: 'Lluvia máxima en un día', sub: 'mm, el día más lluvioso de cada año hidrológico',
              chips: [CH_DIA], fuente: F_GHCN,
              spec: { type: 'bar', xType: 'cat', x: l.x, zoom: false, yFormat: 'num', series: [{ name: 'Máximo diario', data: l.max_diaria }] }
            }
          ]
        };
      }
    },

    /* ------------------------------------------------------------ Mar --- */
    {
      id: 'mar', nombre: 'Mar',
      titulo: 'El mar: temperatura, olas de calor marinas y nivel',
      desc: 'Temperatura superficial del mar frente a Marbella (NOAA OISST, satélite y boyas, desde 1982) comparada con 1982-2011, y nivel medio del mar en el mareógrafo de Málaga (PSMSL). ' +
        'Una ola de calor marina son al menos cinco días seguidos por encima del 90 % de los valores habituales de esa fecha (criterio de Hobday et al., 2016). ' +
        'Afectan a la pesca, a la proliferación de algas y medusas y al balance sedimentario de las playas (actuación A-05).',
      render: function () {
        var cards = [];
        var kpis = [];
        var hero = null;
        if (MAR.anual) {
          var ma = MAR.anual, mm = MAR.mensual, r = MAR.reciente;
          hero = {
            valor: MAR.ultimo_valor, label: 'Temperatura del mar frente a Marbella el ' + fFecha(MAR.ultimo_dia),
            formato: function (v) { return F.num(v, 1) + ' °C'; },
            extra: [
              { label: 'Frente a lo normal de esa fecha', valor: MAR.ultima_anomalia, formato: function (v) { return F.signo(v, 1) + ' °C'; } },
              { label: 'Días en ola de calor marina en ' + MAR.ultimo_dia.slice(0, 4), valor: ma.dias_ola_en_curso, formato: F.num },
              { label: 'Media 1982-1991 frente a 2016-2025', valor: (mediaAnios(ma, 'media', 2016, 2025) - mediaAnios(ma, 'media', 1982, 1991)), formato: function (v) { return F.signo(v, 2) + ' °C'; } }
            ]
          };
          cards.push(
            {
              titulo: 'Temperatura del mar en los últimos 120 días', sub: '°C, frente a la media y al umbral de ola de calor de cada fecha (1982-2011)',
              chips: [CH_DIA], fuente: F_SST, ancho: 'full',
              spec: { type: 'line', xType: 'cat', x: r.x, yFormat: 'dec1', zoom: false,
                      series: [{ name: 'Temperatura del mar', data: r.sst }, { name: 'Umbral de ola de calor (p90)', data: r.p90 }, { name: 'Media 1982-2011', data: r.clima }] }
            },
            {
              titulo: 'Temperatura media del mar por año', sub: '°C frente a Marbella',
              chips: [CH_DIA], fuente: F_SST,
              spec: { type: 'line', xType: 'anual', x: ma.x, zoom: false, yFormat: 'dec1', series: [{ name: 'Media anual', data: ma.media }, { name: 'Media de 10 años', data: movil(ma.media, 10) }] }
            },
            {
              titulo: 'Días de ola de calor marina por año', sub: 'Días dentro de una ola de calor marina',
              chips: [CH_DIA], fuente: F_SST,
              spec: { type: 'bar', xType: 'anual', x: ma.x, zoom: false, yFormat: 'num', series: [{ name: 'Días', data: ma.dias_ola }] }
            },
            {
              titulo: 'Anomalía mensual de la temperatura del mar', sub: '°C respecto a la media de esa fecha en 1982-2011',
              chips: [CH_DIA], fuente: F_SST, ancho: 'full',
              spec: { type: 'line', xType: 'mes', x: mm.x, yFormat: 'dec1', zoomDesde: 60, series: [{ name: 'Anomalía', data: mm.anomalia }], ref: 0, refLabel: 'Media 1982-2011' }
            }
          );
        }
        if (NM.x) {
          kpis.push({ label: 'Nivel medio del mar en Málaga, ' + NM.hasta, valor: ult(NM.v), unidad: 'mm', formato: F.num });
          kpis.push({ label: 'Tendencia ' + NM.desde + '-' + NM.hasta, valor: NM.mm_anio, unidad: 'mm/año', formato: function (v) { return F.num(v, 1); } });
          cards.push({
            titulo: 'Nivel medio del mar en Málaga', sub: 'mm (referencia local del mareógrafo, RLR) y tendencia lineal',
            chips: [CH_ANUAL], fuente: F_PSMSL, ancho: 'full',
            nota: 'Los años sin dato (1996, 2001, 2021) no tienen cobertura suficiente en el mareógrafo. La cifra en mm es relativa a la referencia del mareógrafo: lo que importa es su evolución.',
            spec: { type: 'line', xType: 'anual', x: NM.x, yFormat: 'num', series: [{ name: 'Nivel medio anual', data: NM.v }, { name: 'Tendencia', data: NM.tendencia }] }
          });
        }
        return { hero: hero, kpis: kpis, cards: cards,
                 nota: MAR.anual ? null : 'La temperatura del mar frente a Marbella (diaria desde 1982) se está cargando por primera vez: el servidor de NOAA tarda varios minutos por año. Aparecerá aquí en cuanto esté completa.' };
      }
    },

    /* -------------------------------------------------------- Energía --- */
    {
      id: 'energia', nombre: 'Energía',
      titulo: 'Electricidad renovable en Andalucía',
      desc: 'Contexto del objetivo 2 del plan (42 % de renovables en 2030): cómo se genera la electricidad en el sistema eléctrico andaluz, del que se abastece Marbella. ' +
        'Es generación regional, no el consumo del municipio. Datos mensuales de Red Eléctrica.',
      render: function () {
        var e = EL.x ? EL : null;
        if (!e) return { nota: 'Los datos de Red Eléctrica no están disponibles ahora mismo.' };
        var lx = ult(e.x);
        return {
          hero: {
            valor: ult(e.anual.renovable_pct), label: 'Electricidad generada con renovables en Andalucía en ' + ult(e.anual.x),
            formato: fPct,
            extra: [
              { label: 'En ' + e.anual.x[0], valor: e.anual.renovable_pct[0], formato: fPct },
              { label: 'Último mes (' + Obs.periodo(lx, 'mes') + ')', valor: ult(e.renovable_pct), formato: fPct }
            ]
          },
          cards: [
            {
              titulo: 'Peso de las renovables en la generación', sub: '% mensual en Andalucía',
              chips: [CH_MES], fuente: F_REE, ancho: 'full',
              spec: { type: 'line', xType: 'mes', x: e.x, yFormat: 'pct', desdeCero: true, series: [{ name: 'Renovables', data: e.renovable_pct }, { name: 'Media de 12 meses', data: movil(e.renovable_pct, 12) }] }
            },
            {
              titulo: 'Generación por tecnología', sub: 'GWh al mes en Andalucía',
              chips: [CH_MES], fuente: F_REE, ancho: 'full',
              nota: '«Resto»: hidráulica, otras renovables, residuos y otras no renovables.',
              spec: {
                type: 'stack', xType: 'mes', x: e.x, yFormat: 'num',
                series: ['Solar fotovoltaica', 'Eólica', 'Solar térmica', 'Ciclo combinado (gas)', 'Cogeneración', 'Carbón', 'Resto'].map(function (k) { return { name: k, data: e.series[k] }; })
              }
            },
            {
              titulo: 'Renovables por año', sub: '% de la generación anual en Andalucía',
              chips: [CH_ANUAL], fuente: F_REE,
              spec: { type: 'bar', xType: 'anual', x: e.anual.x, yFormat: 'pct', series: [{ name: 'Renovables', data: e.anual.renovable_pct }] }
            },
            {
              titulo: 'CO₂ en la atmósfera', sub: 'ppm, media mensual en Mauna Loa (referencia mundial)',
              chips: [CH_MES], fuente: F_CO2,
              spec: { type: 'line', xType: 'mes', x: CO2.x, yFormat: 'num', series: [{ name: 'CO₂', data: CO2.v }] }
            }
          ]
        };
      }
    },

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
    subtitulo: 'Cómo cambia el clima de Marbella y cómo avanza su plan, con fuentes oficiales que se actualizan solas',
    secciones: SECCIONES,
    actualizado: (D.meta || {}).actualizado,
    fuentes: [F_GHCN, F_SST, F_PSMSL, F_REE, F_CO2, F_HCM, F_DGT, F_NAP, F_HID, F_AEMET, F_SAT],
    metodologia: 'Un proceso automático (<code>pipeline/build_data.py</code>) se ejecuta cada día en GitHub Actions. Descarga la serie diaria de Málaga Aeropuerto desde 1942 (NOAA GHCN-Daily), la temperatura del mar frente a Marbella (NOAA OISST), el nivel del mar del mareógrafo de Málaga (PSMSL), la generación eléctrica andaluza (Red Eléctrica) y el CO₂ de Mauna Loa (NOAA); ' +
      'el clima de referencia es 1961-1990 (1982-2011 en el mar, cuya serie empieza en 1982). También descarga las matriculaciones de la DGT y los puntos de recarga del Punto de Acceso Nacional, ' +
      'y lee los datos que publican los observatorios hídrico y de sostenibilidad de AMMA (REDIAM, Red Hidrosur, AEMET y Copernicus). ' +
      'La línea base de emisiones y energía está transcrita de los anexos del borrador del PMCC (herramienta HCM de la Junta de Andalucía) y se actualizará cuando la Junta publique años nuevos. ' +
      'Cada tarjeta enlaza a su fuente y permite ver los datos en tabla y descargarlos en CSV.',
    pie: 'Observatorio elaborado por AMMA Consulting. Los datos son de las fuentes citadas; su tratamiento y presentación, de este observatorio.'
  });

  Obs.estado('Datos actualizados el ' + new Date((D.meta || {}).actualizado || Date.now()).toLocaleDateString('es-ES'), 'live');

})();
