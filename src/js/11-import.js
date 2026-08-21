"use strict";

/* ============== IMPORT (JSON) ============== */
function cleanTaskImport(t){
  return {
    id: uid(),
    description: (t && t.description) ? String(t.description) : '',
    responsable: (t && t.responsable) ? String(t.responsable) : '',
    echeance: (t && t.echeance) ? String(t.echeance) : '',
    statut: (t && STATUS_LIST.includes(t.statut)) ? t.statut : 'à faire',
    priority: (t && t.priority) ? true : false,
    priorityFrom: (t && t.priorityFrom) ? String(t.priorityFrom) : null,
    completedAt: (t && t.completedAt) ? String(t.completedAt) : undefined
  };
}
function findOrCreateProjectByName(name, def, parentId){
  const cleanName = (name || 'Projet importé').trim();
  let existing = state.data.projects.find(p =>
    p.name.toLowerCase() === cleanName.toLowerCase() && (p.parentId||null) === (parentId||null));
  if(existing) return existing;
  const id = uid();
  const proj = {
    id, name: cleanName, description: (def && def.description) || '',
    status: (def && def.status) || 'Actif',
    color: (def && def.color) || PROJECT_COLORS[state.data.projects.length % PROJECT_COLORS.length],
    parentId: parentId || null, createdAt: todayStr()
  };
  state.data.projects.push(proj);
  state.data.seances[id] = [];
  state.data.pages[id] = [];
  return proj;
}
function mergeSeancesAndPagesInto(projectId, def){
  (def.seances || []).forEach(s => {
    state.data.seances[projectId].push({
      id: uid(),
      date: s.date || todayStr(),
      participants: Array.isArray(s.participants) ? s.participants.map(String) : [],
      notes: s.notes || '',
      conclusions: (Array.isArray(s.conclusions) ? s.conclusions : []).map(String).filter(c=>c.trim()),
      taches: (Array.isArray(s.taches) ? s.taches : []).map(cleanTaskImport).filter(t=>t.description.trim())
    });
  });
  (def.pages || []).forEach(pg => {
    state.data.pages[projectId].push({
      id: uid(),
      title: pg.title || 'Page importée',
      notes: pg.notes || '',
      source: pg.source === 'onenote' ? 'onenote' : 'manuel',
      createdAt: pg.createdAt || pg.date || todayStr(),
      taches: (Array.isArray(pg.taches) ? pg.taches : []).map(cleanTaskImport).filter(t=>t.description.trim())
    });
  });
}
function importNamePackage(pkg){
  (pkg.projects || []).forEach(def => {
    const proj = findOrCreateProjectByName(def.name, def, null);
    mergeSeancesAndPagesInto(proj.id, def);
    (def.subProjects || []).forEach(subDef => {
      const sub = findOrCreateProjectByName(subDef.name, subDef, proj.id);
      mergeSeancesAndPagesInto(sub.id, subDef);
    });
  });
}
function importFullBackup(pkg){
  // Reset existing data to avoid duplication
  state.data.projects = [];
  state.data.seances = {};
  state.data.pages = {};
  state.data.evolvingPV = {};
  state.data.quickNotes = [];
  state.data.calendar = { rows: [], events: [] };
  if(pkg.calendar && (pkg.calendar.rows || pkg.calendar.events)){
    state.data.calendar.rows = pkg.calendar.rows || [];
    state.data.calendar.events = pkg.calendar.events || [];
  }
  // Quick notes
  if(Array.isArray(pkg.quickNotes)) state.data.quickNotes = pkg.quickNotes;

  // Projects + all sub-data
  const idMap = {};
  pkg.projects.forEach(p => { idMap[p.id] = uid(); });
  pkg.projects.forEach(p => {
    const newId = idMap[p.id];
    state.data.projects.push({
      id: newId,
      name: p.name || 'Projet importé',
      description: p.description || '',
      contacts: p.contacts || '',
      status: p.status || 'Actif',
      color: p.color || PROJECT_COLORS[state.data.projects.length % PROJECT_COLORS.length],
      parentId: p.parentId ? (idMap[p.parentId] || null) : null,
      createdAt: p.createdAt || todayStr(),
      vigilances: Array.isArray(p.vigilances) ? p.vigilances : [],
      developments: Array.isArray(p.developments) ? p.developments : [],
      directTasks: Array.isArray(p.directTasks) ? p.directTasks.map(cleanTaskImport) : []
    });
    // Séances
    state.data.seances[newId] = ((pkg.seances && pkg.seances[p.id]) || []).map(s => ({
      id: uid(), title: s.title || '', date: s.date || todayStr(),
      participants: Array.isArray(s.participants) ? s.participants.map(String) : [],
      notes: s.notes || '',
      conclusions: (Array.isArray(s.conclusions) ? s.conclusions : []).map(String).filter(c=>c.trim()),
      taches: (Array.isArray(s.taches) ? s.taches : []).map(cleanTaskImport)
    }));
    // Pages
    state.data.pages[newId] = ((pkg.pages && pkg.pages[p.id]) || []).map(pg => ({
      id: uid(), title: pg.title || 'Page', notes: pg.notes || '',
      source: pg.source === 'onenote' ? 'onenote' : 'manuel', createdAt: pg.createdAt || todayStr(),
      taches: (Array.isArray(pg.taches) ? pg.taches : []).map(cleanTaskImport)
    }));
    // Suivi continu (evolvingPV)
    const epvSrc = pkg.evolvingPV && pkg.evolvingPV[p.id];
    if(epvSrc && Array.isArray(epvSrc.entries)){
      state.data.evolvingPV[newId] = {
        entries: epvSrc.entries.map(e => ({
          id: uid(), date: e.date || todayStr(),
          participants: Array.isArray(e.participants) ? e.participants : [],
          notes: e.notes || '',
          conclusions: Array.isArray(e.conclusions) ? e.conclusions : [],
          taches: Array.isArray(e.taches) ? e.taches.map(cleanTaskImport) : []
        }))
      };
    }
  });
}
function importPackage(pkg){
  if(!pkg || !Array.isArray(pkg.projects) || pkg.projects.length===0){
    throw new Error('format invalide : un tableau "projects" est attendu.');
  }
  const isFullBackup = pkg.seances && typeof pkg.seances === 'object' && !Array.isArray(pkg.seances);
  if(isFullBackup) importFullBackup(pkg);
  else importNamePackage(pkg);
}
function saveImportJson(){
  const raw = document.getElementById('ij-text').value;
  if(!raw || !raw.trim()){ return; }
  let pkg;
  try{
    pkg = JSON.parse(raw);
  }catch(e){
    showBanner('JSON invalide — vérifiez le format avant de réessayer.');
    return;
  }
  try{
    importPackage(pkg);
  }catch(e){
    showBanner('Import impossible : ' + e.message);
    return;
  }
  state.modal = null;
  state.view = 'dashboard'; state.currentProjectId = null;
  persistAndRender();
  showBanner('Import réussi.');
}

/* ============== EXCEL / CSV IMPORT ============== */
function renderImportExcelModalInner(){
  return '<h3>Importer depuis Excel ou CSV</h3>' +
    '<p class="help-text">Sélectionnez un fichier <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong>.<br>' +
    'Colonnes attendues (noms flexibles, non sensible à la casse) :<br>' +
    '<code style="font-size:.78rem;">Projet · Sous-projet · Description · Responsable · Échéance · Statut · Origine</code><br>' +
    'Les colonnes manquantes sont ignorées. Les tâches importées sont regroupées dans une page horodatée par projet.</p>' +
    '<div class="form-row"><label>Fichier</label>' +
      '<input type="file" id="xl-file" accept=".xlsx,.xls,.csv" style="padding:8px;border:1px solid var(--paper-line);border-radius:6px;background:var(--blush);width:100%;font-family:inherit;">' +
    '</div>' +
    '<div id="xl-preview" style="margin-top:8px;color:var(--ink-soft);font-size:.82rem;"></div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-import-excel">Importer</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

function normalizeHeader(h){
  return String(h||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'');
}

function matchCol(headers, ...variants){
  for(const v of variants){
    const norm = normalizeHeader(v);
    const idx = headers.findIndex(h => normalizeHeader(h) === norm);
    if(idx >= 0) return idx;
  }
  return -1;
}

function importFromExcel(){
  const fileInput = document.getElementById('xl-file');
  if(!fileInput || !fileInput.files || !fileInput.files[0]){
    showBanner('Veuillez sélectionner un fichier.', 'error'); return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      let rows = [];
      if(file.name.toLowerCase().endsWith('.csv')){
        // Parse CSV manually
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        const sep = lines[0].includes(';') ? ';' : ',';
        rows = lines.map(l => l.split(sep).map(c => c.replace(/^"|"$/g,'').trim()));
      } else {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      }
      if(rows.length < 2){ showBanner('Fichier vide ou sans données.', 'error'); return; }

      const headers = rows[0];
      const iProjet     = matchCol(headers, 'Projet', 'Project', 'Projet principal');
      const iSous       = matchCol(headers, 'Sous-projet', 'Sous projet', 'Subproject');
      const iDesc       = matchCol(headers, 'Description', 'Tâche', 'Tache', 'Task', 'Titre');
      const iResp       = matchCol(headers, 'Responsable', 'Responsible', 'Assigné', 'Assigne');
      const iDate       = matchCol(headers, 'Échéance', 'Echeance', 'Due date', 'Deadline', 'Date');
      const iStatut     = matchCol(headers, 'Statut', 'Status', 'État', 'Etat');
      const iOrigine    = matchCol(headers, 'Origine', 'Source', 'Notes', 'Note');

      if(iDesc < 0){ showBanner('Colonne "Description" ou "Tâche" introuvable.', 'error'); return; }

      // Group by project (and sub-project)
      const byKey = {}; // key = "project|||subproject"
      rows.slice(1).forEach(row => {
        const desc = String(row[iDesc]||'').trim();
        if(!desc) return;
        const projet = iProjet>=0 ? String(row[iProjet]||'').trim() : 'Import Excel';
        const sous   = iSous>=0   ? String(row[iSous]||'').trim()   : '';
        const resp   = iResp>=0   ? String(row[iResp]||'').trim()   : '';
        let echeance = iDate>=0   ? String(row[iDate]||'').trim()   : '';
        const rawStatut = iStatut>=0 ? String(row[iStatut]||'').trim().toLowerCase() : '';
        const origine = iOrigine>=0 ? String(row[iOrigine]||'').trim() : '';

        // Normalize status
        let statut = 'à faire';
        if(['fait','done','terminé','termine','completed','yes','oui'].some(s=>rawStatut.includes(s))) statut = 'fait';
        else if(['cours','cours','progress','en cours'].some(s=>rawStatut.includes(s))) statut = 'en cours';

        // Normalize date
        if(echeance && /^\d{5}$/.test(echeance)){
          // Excel serial date
          const d = XLSX.SSF.parse_date_code(Number(echeance));
          if(d) echeance = d.y + '-' + String(d.m).padStart(2,'0') + '-' + String(d.d).padStart(2,'0');
        }

        const key = projet + '|||' + sous;
        if(!byKey[key]) byKey[key] = { projet, sous, tasks:[] };
        byKey[key].tasks.push({ id:uid(), description:desc, responsable:resp, echeance, statut, _note:origine });
      });

      const totalTasks = Object.values(byKey).reduce((a,v)=>a+v.tasks.length,0);
      if(totalTasks===0){ showBanner('Aucune tâche valide trouvée.', 'error'); return; }

      const importDate = todayStr();
      const importLabel = 'Import Excel — ' + fmtDate(importDate);

      Object.entries(byKey).forEach(([key, group])=>{
        const { projet, sous, tasks } = group;
        // Find or create project
        let projObj = state.data.projects.find(p => p.name.toLowerCase()===projet.toLowerCase() && !p.parentId);
        if(!projObj){
          const pid = uid();
          projObj = { id:pid, name:projet, description:'', status:'Actif', color:PROJECT_COLORS[state.data.projects.length % PROJECT_COLORS.length], parentId:null, createdAt:importDate };
          state.data.projects.push(projObj);
          state.data.seances[pid] = [];
          state.data.pages[pid] = [];
        }
        let targetId = projObj.id;
        // If sub-project specified, find or create it
        if(sous){
          let subObj = state.data.projects.find(p => p.name.toLowerCase()===sous.toLowerCase() && p.parentId===projObj.id);
          if(!subObj){
            const sid = uid();
            subObj = { id:sid, name:sous, description:'', status:'Actif', color:projObj.color, parentId:projObj.id, createdAt:importDate };
            state.data.projects.push(subObj);
            state.data.seances[sid] = [];
            state.data.pages[sid] = [];
          }
          targetId = subObj.id;
        }
        // Add page with tasks
        if(!state.data.pages[targetId]) state.data.pages[targetId] = [];
        state.data.pages[targetId].push({
          id: uid(),
          title: importLabel + (sous ? ' (' + sous + ')' : ''),
          notes: 'Tâches importées depuis Excel/CSV le ' + fmtDate(importDate) + '.',
          source: 'manuel',
          createdAt: importDate,
          taches: tasks.map(t=>({ id:t.id, description:t.description, responsable:t.responsable, echeance:t.echeance, statut:t.statut }))
        });
      });

      state.modal = null;
      state.view = 'dashboard';
      persistAndRender();
      showBanner(totalTasks + ' tâche(s) importée(s) depuis Excel.', 'success');
    } catch(err){
      showBanner('Erreur lors de la lecture du fichier : ' + err.message, 'error');
    }
  };
  if(file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file, 'UTF-8');
  else reader.readAsArrayBuffer(file);
}

