/**
 * Backend de l'app "CB Puig-Reig Staff".
 *
 * COM POSAR-HO EN MARXA
 * ---------------------
 * 1) Obre el Google Sheet que faràs servir -> Extensions -> Apps Script.
 * 2) Esborra el que hi hagi i enganxa aquest fitxer sencer. Desa.
 * 3) A dalt, tria la funció "setup" i clica ▶ Executar. Això crea totes les
 *    pestanyes amb les capçaleres correctes i hi posa els conceptes inicials.
 *    (La primera vegada Google demanarà permisos: accepta-ho.)
 * 4) Desplega -> Nou desplegament -> tipus "Aplicació web":
 *       Executa com:  Jo (el teu compte)
 *       Qui hi té accés:  Qualsevol persona
 *    Copia la URL que acaba en /exec.
 * 5) Enganxa aquella URL dins d'index.html, a CONFIG.API_URL.
 *
 * SI DESPRÉS CANVIES AQUEST CODI: Desplega -> Gestiona desplegaments ->
 * llapis (editar) -> Versió: Nova versió -> Desplega. Així la URL /exec no
 * canvia i no cal tocar l'index.html.
 */

var FULLS = {
  jugadors:    { nom: 'Jugadors',               capcalera: ['Nom', 'Equip', 'Actiu'] },
  assistencia: { nom: 'Assistencia',            capcalera: ['Data', 'Jugador', 'Assistit', 'Comentari', 'Timestamp'] },
  exercicis:   { nom: 'Entrenaments_exercicis', capcalera: ['Data', 'Concepte', 'Minuts', 'Comentari', 'Timestamp'] },
  conceptes:   { nom: 'Conceptes',              capcalera: ['Concepte', 'Descripcio', 'Treballat_SI_NO', 'Ordre'] },
  partits:     { nom: 'Partits',                capcalera: ['Data', 'Rival', 'Resultat_propi', 'Resultat_rival', 'Local_Visitant'] },
  partitsJug:  { nom: 'Partits_jugadors',       capcalera: ['Data', 'Jugador', 'Minuts_jugats', 'Plus_minus', 'Punts', 'Comentari'] }
};

var CONCEPTES_INICIALS = [
  'TIR', 'ATAC ZONA', 'DEFENSA P&R', 'DEFENSA INDIVIDUAL', 'DEFENSA ZONA',
  'AJUDES I ROTACIONS', 'TRANSICIÓ DEFENSIVA', 'SORTIDES DE PRESSIÓ',
  'TÈCNICA INDIVIDUAL', 'FINALITZACIONS', 'FÍSIC / PREVENCIÓ'
];

/* ------------------------------------------------------------------ *
 *  Preparació del full (executar un sol cop, a mà)                    *
 * ------------------------------------------------------------------ */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(FULLS).forEach(function (clau) {
    var def = FULLS[clau];
    var sh = ss.getSheetByName(def.nom) || ss.insertSheet(def.nom);
    // Només escrivim la capçalera si la fila 1 és buida: així, si ja tens
    // dades al full, executar setup() un segon cop no te les toca.
    if (String(sh.getRange(1, 1).getValue() || '').trim() === '') {
      sh.getRange(1, 1, 1, def.capcalera.length).setValues([def.capcalera]);
      sh.getRange(1, 1, 1, def.capcalera.length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });

  // Conceptes inicials, només si la pestanya encara és buida de dades.
  var conc = ss.getSheetByName(FULLS.conceptes.nom);
  if (conc.getLastRow() < 2) {
    var files = CONCEPTES_INICIALS.map(function (c, i) { return [c, '', 'NO', i + 1]; });
    conc.getRange(2, 1, files.length, 4).setValues(files);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Pestanyes preparades correctament', 'CB Puig-Reig', 5);
}

/* ------------------------------------------------------------------ *
 *  Utilitats                                                          *
 * ------------------------------------------------------------------ */

function full_(clau) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FULLS[clau].nom);
  if (!sh) throw new Error('Falta la pestanya "' + FULLS[clau].nom + '". Executa la funció setup().');
  return sh;
}

/** Totes les files de dades d'una pestanya (sense la capçalera). */
function files_(clau) {
  var sh = full_(clau);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, FULLS[clau].capcalera.length).getValues();
}

function formatData_(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(val || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;            // ja ve bé
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(s)) {        // 12/10/2026 -> ISO
    var p = s.split(/[\/-]/);
    return p[2] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[0]).slice(-2);
  }
  var d = new Date(s);
  return isNaN(d) ? s : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/** Interpreta SI / SÍ / TRUE / X / 1 com a "sí". Qualsevol altra cosa, no. */
function esSi_(val) {
  if (val === true) return true;
  var s = String(val || '').trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'S' || s === 'TRUE' || s === 'X' || s === '1' || s === 'VERTADER';
}

function num_(val) {
  if (val === '' || val === null || val === undefined) return null;
  var n = Number(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ *
 *  Lectures                                                           *
 * ------------------------------------------------------------------ */

function llegeixJugadors_() {
  return files_('jugadors')
    .filter(function (r) { return String(r[0] || '').trim() !== ''; })
    .map(function (r) {
      return { nom: String(r[0]).trim(), equip: String(r[1] || '').trim(), actiu: esSi_(r[2]) };
    });
}

function llegeixConceptes_() {
  var llista = files_('conceptes')
    .filter(function (r) { return String(r[0] || '').trim() !== ''; })
    .map(function (r, i) {
      return {
        concepte: String(r[0]).trim(),
        descripcio: String(r[1] || '').trim(),
        treballat: esSi_(r[2]),
        ordre: num_(r[3]) === null ? i + 1 : num_(r[3])
      };
    });
  llista.sort(function (a, b) { return a.ordre - b.ordre; });
  return llista;
}

function llegeixAssistencia_(data) {
  return files_('assistencia')
    .filter(function (r) { return String(r[1] || '').trim() !== '' && (!data || formatData_(r[0]) === data); })
    .map(function (r) {
      return {
        data: formatData_(r[0]),
        jugador: String(r[1]).trim(),
        assistit: esSi_(r[2]),
        comentari: String(r[3] || '')
      };
    });
}

function llegeixExercicis_(data) {
  return files_('exercicis')
    .filter(function (r) { return String(r[1] || '').trim() !== '' && (!data || formatData_(r[0]) === data); })
    .map(function (r) {
      return {
        data: formatData_(r[0]),
        concepte: String(r[1]).trim(),
        minuts: num_(r[2]) || 0,
        comentari: String(r[3] || '')
      };
    });
}

function llegeixPartits_() {
  var llista = files_('partits')
    .filter(function (r) { return String(r[0] || '').trim() !== '' || String(r[1] || '').trim() !== ''; })
    .map(function (r) {
      return {
        data: formatData_(r[0]),
        rival: String(r[1] || '').trim(),
        propi: num_(r[2]),
        rivalPunts: num_(r[3]),
        localVisitant: String(r[4] || '').trim()
      };
    });
  llista.sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; }); // el més recent primer
  return llista;
}

function llegeixPartitJugadors_(data, rival) {
  return files_('partitsJug')
    .filter(function (r) { return String(r[1] || '').trim() !== '' && formatData_(r[0]) === data; })
    .map(function (r) {
      return {
        data: formatData_(r[0]),
        jugador: String(r[1]).trim(),
        minuts: num_(r[2]),
        plusMinus: num_(r[3]),
        punts: num_(r[4]),
        comentari: String(r[5] || '')
      };
    });
}

/** Dates amb entrenament registrat, de la més recent a la més antiga. */
function resumEntrenaments_() {
  var perData = {};
  llegeixExercicis_(null).forEach(function (e) {
    if (!e.data) return;
    if (!perData[e.data]) perData[e.data] = { data: e.data, minuts: 0, conceptes: [] };
    perData[e.data].minuts += Number(e.minuts || 0);
    perData[e.data].conceptes.push(e.concepte);
  });
  return Object.keys(perData).sort().reverse().map(function (d) { return perData[d]; });
}

/** Dies amb llista passada, amb el recompte de presents. */
function resumAssistencia_() {
  var perData = {};
  llegeixAssistencia_(null).forEach(function (a) {
    if (!a.data) return;
    if (!perData[a.data]) perData[a.data] = { data: a.data, total: 0, presents: 0 };
    perData[a.data].total++;
    if (a.assistit) perData[a.data].presents++;
  });
  return Object.keys(perData).sort().reverse().map(function (d) { return perData[d]; });
}

/* ------------------------------------------------------------------ *
 *  doGet                                                              *
 * ------------------------------------------------------------------ */

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var accio = p.action || 'config';
    var data = p.data ? formatData_(p.data) : '';

    switch (accio) {
      case 'config':
        return json_({
          ok: true,
          jugadors: llegeixJugadors_(),
          conceptes: llegeixConceptes_()
        });

      case 'assistencia':
        return json_({ ok: true, data: data, registres: llegeixAssistencia_(data) });

      case 'assistencia_resum':
        return json_({ ok: true, dies: resumAssistencia_() });

      case 'entrenaments':
        return json_({ ok: true, data: data, exercicis: llegeixExercicis_(data) });

      case 'entrenaments_resum':
        return json_({ ok: true, dies: resumEntrenaments_() });

      case 'partits':
        return json_({ ok: true, partits: llegeixPartits_() });

      case 'partit_detall':
        return json_({
          ok: true,
          data: data,
          jugadors: llegeixPartitJugadors_(data, p.rival || '')
        });

      // Tot el que necessita la pantalla d'Inici, en una sola crida.
      case 'inici':
        var partits = llegeixPartits_();
        var diesEntr = resumEntrenaments_();
        var diesAssist = resumAssistencia_();
        var conceptes = llegeixConceptes_();
        return json_({
          ok: true,
          jugadorsActius: llegeixJugadors_().filter(function (j) { return j.actiu; }).length,
          ultimaAssistencia: diesAssist.length ? diesAssist[0] : null,
          ultimEntrenament: diesEntr.length ? diesEntr[0] : null,
          ultimPartit: partits.length ? partits[0] : null,
          totalPartits: partits.length,
          conceptesTreballats: conceptes.filter(function (c) { return c.treballat; }).length,
          conceptesTotal: conceptes.length
        });

      default:
        return json_({ ok: false, error: 'Acció desconeguda: ' + accio });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* ------------------------------------------------------------------ *
 *  doPost                                                             *
 * ------------------------------------------------------------------ */

function doPost(e) {
  // Un candau evita que dues persones desant alhora es trepitgin les files.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json_({ ok: false, error: 'El full està ocupat, torna-ho a provar.' });
  }

  try {
    var body = JSON.parse(e.postData.contents);
    switch (body.tipus) {
      case 'assistencia':       return desaAssistencia_(body);
      case 'entrenament':       return desaEntrenament_(body);
      case 'concepte_treballat':return marcaConcepte_(body);
      default:
        return json_({ ok: false, error: 'Tipus desconegut: ' + body.tipus });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/** Esborra les files d'una pestanya que siguin d'una data concreta. */
function esborraFilesDeData_(clau, data) {
  var sh = full_(clau);
  if (sh.getLastRow() < 2) return 0;
  var dades = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var esborrades = 0;
  // De baix cap a dalt: així els índexs de les files que queden no es mouen.
  for (var i = dades.length - 1; i >= 0; i--) {
    if (formatData_(dades[i][0]) === data) {
      sh.deleteRow(i + 2);
      esborrades++;
    }
  }
  return esborrades;
}

function desaAssistencia_(body) {
  var data = formatData_(body.data);
  var registres = body.registres || [];
  if (!data) return json_({ ok: false, error: 'Falta la data.' });
  if (!registres.length) return json_({ ok: false, error: 'No hi ha cap jugador a desar.' });

  var jaExisteix = llegeixAssistencia_(data).length > 0;
  // Sense permís explícit per sobreescriure, no toquem res i avisem l'app.
  if (jaExisteix && !body.sobreescriure) {
    return json_({ ok: false, existeix: true, error: 'Ja hi ha assistència desada per aquest dia.' });
  }
  if (jaExisteix) esborraFilesDeData_('assistencia', data);

  var ara = new Date();
  var files = registres.map(function (r) {
    return [data, String(r.jugador || '').trim(), r.assistit ? 'SI' : 'NO', String(r.comentari || ''), ara];
  });
  var sh = full_('assistencia');
  sh.getRange(sh.getLastRow() + 1, 1, files.length, 5).setValues(files);

  return json_({ ok: true, files: files.length, sobreescrit: jaExisteix });
}

function desaEntrenament_(body) {
  var data = formatData_(body.data);
  var exercicis = body.exercicis || [];
  if (!data) return json_({ ok: false, error: 'Falta la data.' });
  if (!exercicis.length) return json_({ ok: false, error: 'No hi ha cap exercici a desar.' });

  var jaExisteix = llegeixExercicis_(data).length > 0;
  if (jaExisteix && !body.sobreescriure) {
    return json_({ ok: false, existeix: true, error: 'Ja hi ha un entrenament desat per aquest dia.' });
  }
  if (jaExisteix) esborraFilesDeData_('exercicis', data);

  var ara = new Date();
  var files = exercicis.map(function (x) {
    return [data, String(x.concepte || '').trim(), num_(x.minuts) || 0, String(x.comentari || ''), ara];
  });
  var sh = full_('exercicis');
  sh.getRange(sh.getLastRow() + 1, 1, files.length, 5).setValues(files);

  // Marcar sols els conceptes treballats avui, mai desmarcar-ne cap: un
  // concepte treballat un altre dia ha de continuar sortint com a fet.
  marcaConceptesComATreballats_(exercicis.map(function (x) { return String(x.concepte || '').trim(); }));

  return json_({ ok: true, files: files.length, sobreescrit: jaExisteix });
}

function marcaConceptesComATreballats_(noms) {
  var sh = full_('conceptes');
  if (sh.getLastRow() < 2) return;
  var rang = sh.getRange(2, 1, sh.getLastRow() - 1, 3);
  var dades = rang.getValues();
  var canviat = false;
  dades.forEach(function (fila) {
    if (noms.indexOf(String(fila[0] || '').trim()) !== -1 && !esSi_(fila[2])) {
      fila[2] = 'SI';
      canviat = true;
    }
  });
  if (canviat) rang.setValues(dades);
}

function marcaConcepte_(body) {
  var nom = String(body.concepte || '').trim();
  if (!nom) return json_({ ok: false, error: 'Falta el concepte.' });

  var sh = full_('conceptes');
  if (sh.getLastRow() < 2) return json_({ ok: false, error: 'No hi ha conceptes al full.' });

  var rang = sh.getRange(2, 3, sh.getLastRow() - 1, 1);      // columna Treballat_SI_NO
  var noms = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var valors = rang.getValues();

  for (var i = 0; i < noms.length; i++) {
    if (String(noms[i][0] || '').trim() === nom) {
      valors[i][0] = body.treballat ? 'SI' : 'NO';
      rang.setValues(valors);
      return json_({ ok: true, concepte: nom, treballat: !!body.treballat });
    }
  }
  return json_({ ok: false, error: 'Concepte no trobat: ' + nom });
}
