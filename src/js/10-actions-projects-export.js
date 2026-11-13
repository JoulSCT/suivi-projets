"use strict";

/* ============== ACTIONS : PROJECTS ============== */
function openNewProjectModal(parentId){ state.modal = { type:'project', editing:null, parentId: parentId || null }; render(); }
function openEditProjectModal(id){ state.modal = { type:'project', editing: getProject(id), parentId:null }; render(); }
function closeModal(){ state.modal=null; render(); }
function saveProjectModal(existingId){
  const name = document.getElementById('m-name').value.trim();
  if(!name){ return; }
  function readRte(id){
    const el = document.getElementById(id);
    if(!el) return '';
    // Normalize: &nbsp; → space, <div><br></div> → <br>, trim
    return (el.innerHTML || el.value || '')
      .replace(/&nbsp;/g, ' ')
      .replace(/<div><br\s*\/?><\/div>/gi, '<br>')
      .replace(/^<br>|<br>$/g, '')
      .trim();
  }
  const description = readRte('m-desc');
  const contacts    = readRte('m-contacts');
  const status = document.getElementById('m-status').value;
  const color = document.getElementById('m-color').value;
  if(existingId){
    const p = getProject(existingId);
    Object.assign(p, { name, description, contacts, status, color });
    const parentSelect = document.getElementById('m-parent');
    if(parentSelect){
      const newParentId = parentSelect.value || null;
      if(newParentId !== (p.parentId || null)){
        p.parentId = newParentId;
        const newParent = newParentId ? getProject(newParentId) : null;
        showBanner(newParent ? 'Projet rattaché à « ' + newParent.name + ' »' : 'Projet rendu indépendant', 'success');
      }
    }
  } else {
    const id = uid();
    const parentId = state.modal.parentId || null;
    state.data.projects.push({ id, name, description, contacts, status, color, parentId, createdAt: todayStr() });
    state.data.seances[id] = [];
    state.data.pages[id] = [];
    state.currentProjectId = id; state.view='project'; state.projectTab='seances';
  }
  state.modal=null;
  persistAndRender();
}
function deleteProject(id){
  const children = getChildren(id);
  const msg = children.length
    ? 'Supprimer ce projet, ses ' + children.length + ' sous-projet(s) et toutes leurs séances, pages et tâches ?'
    : 'Supprimer ce projet ainsi que toutes ses séances, pages et tâches ?';
  state.modal = { type:'confirm-delete', message: msg,
    pendingAction: () => {
      const idsToDelete = [id, ...children.map(c=>c.id)];
      state.data.projects = state.data.projects.filter(p=>!idsToDelete.includes(p.id));
      idsToDelete.forEach(pid=>{ delete state.data.seances[pid]; delete state.data.pages[pid]; });
      if(idsToDelete.includes(state.currentProjectId)){ state.view='dashboard'; state.currentProjectId=null; }
      state.modal = null;
      persistAndRender();
    }
  };
  render();
}

function exportJson(isAuto){
  const blob = new Blob([JSON.stringify(state.data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = isAuto ? 'suivi-projets-sauvegarde-auto-'+todayStr()+'.json' : 'suivi-projets-export.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  stampExportTime();
  if(isAuto){
    showBanner('Sauvegarde automatique effectuée (fichier JSON téléchargé).', 'info');
  } else {
    showBanner('Export téléchargé. Prochaine sauvegarde recommandée dans 7 jours.', 'success');
  }
}

function getRaFilteredTasks(){
  const all = getAllTasks();
  // Classification ordonnée par projet (top-level) puis sous-projet, puis
  // date de réalisation décroissante au sein d'un même groupe.
  const raTasks = all.filter(t=>t.statut==='fait (R.A.)')
    .map(t=>{
      const proj = getProject(t.projectId);
      const isChild = !!(proj && proj.parentId);
      const parent = isChild ? getProject(proj.parentId) : null;
      return Object.assign({}, t, {
        projectName: parent ? parent.name : (proj ? proj.name : ''),
        subProjectName: isChild ? (proj ? proj.name : '') : ''
      });
    })
    .sort((a,b)=>{
      const pc = a.projectName.localeCompare(b.projectName, 'fr');
      if(pc !== 0) return pc;
      const sc = a.subProjectName.localeCompare(b.subProjectName, 'fr');
      if(sc !== 0) return sc;
      const da=a.completedAt||a.echeance||'0000',db=b.completedAt||b.echeance||'0000';
      return db.localeCompare(da);
    });
  const selYear = state.raYear || new Date().getFullYear().toString();
  if(selYear==='all') return raTasks;
  return raTasks.filter(t=>{ const y=(t.completedAt||t.echeance||'').slice(0,4); return y===selYear; });
}

function exportExcel(){
  if(typeof XLSX === 'undefined'){ showBanner('SheetJS non disponible. Vérifiez votre connexion.', 'error'); return; }
  const wb = XLSX.utils.book_new();

  /* ---- Sheet 1 : Toutes les tâches ---- */
  const allTasks = getAllTasks();
  const taskHeader = ['Projet', 'Sous-projet', 'Origine', 'Description', 'Responsable', 'Échéance', 'Statut', 'Date réalisation'];
  const taskRows = allTasks.map(t => {
    const p = getProject(t.projectId);
    const isChild = p && p.parentId;
    const parent = isChild ? getProject(p.parentId) : null;
    return [
      parent ? parent.name : (p ? p.name : ''),
      isChild ? (p ? p.name : '') : '',
      t.originLabel,
      t.description,
      t.responsable || '',
      t.echeance || '',
      t.statut,
      t.completedAt || ''
    ];
  });
  const wsAll = XLSX.utils.aoa_to_sheet([taskHeader, ...taskRows]);
  wsAll['!cols'] = [22,18,20,50,16,14,14,14].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, wsAll, 'Toutes les tâches');

  /* ---- Sheet 2 : Points de vigilance ---- */
  const vigHeader = ['Projet', 'Point de vigilance'];
  const vigRows = [];
  state.data.projects.forEach(p => {
    (p.vigilances||[]).forEach(v => {
      vigRows.push([getProjectPath(p.id), v.text]);
    });
  });
  if(vigRows.length > 0){
    const wsVig = XLSX.utils.aoa_to_sheet([vigHeader, ...vigRows]);
    wsVig['!cols'] = [{wch:28},{wch:80}];
    XLSX.utils.book_append_sheet(wb, wsVig, 'Vigilances');
  }

  /* ---- Sheet 3 : Rapport d'activités (Fait R.A., toutes années) ---- */
  // Classification ordonnée par projet puis sous-projet, colonnes identiques
  // (voir aussi getRaFilteredTasks utilisé par les exports RA dédiés) — mais
  // sans filtre d'année : cette feuille fait partie de l'export complet.
  const raTasks = getAllTasks().filter(t => t.statut === 'fait (R.A.)')
    .map(t=>{
      const proj = getProject(t.projectId);
      const isChild = !!(proj && proj.parentId);
      const parent = isChild ? getProject(proj.parentId) : null;
      return Object.assign({}, t, {
        projectName: parent ? parent.name : (proj ? proj.name : ''),
        subProjectName: isChild ? (proj ? proj.name : '') : ''
      });
    })
    .sort((a,b)=>{
      const pc = a.projectName.localeCompare(b.projectName, 'fr');
      if(pc !== 0) return pc;
      const sc = a.subProjectName.localeCompare(b.subProjectName, 'fr');
      if(sc !== 0) return sc;
      return (b.completedAt||'').localeCompare(a.completedAt||'');
    });
  if(raTasks.length > 0){
    const raHeader = ['Projet', 'Sous-projet', 'Origine', 'Réalisation', 'Responsable', 'Date réalisation'];
    const raRows = raTasks.map(t => [t.projectName, t.subProjectName, t.originLabel, t.description, t.responsable||'', t.completedAt||t.echeance||'']);
    const wsRa = XLSX.utils.aoa_to_sheet([raHeader, ...raRows]);
    wsRa['!cols'] = [{wch:24},{wch:24},{wch:20},{wch:50},{wch:16},{wch:16}];
    XLSX.utils.book_append_sheet(wb, wsRa, 'Rapport activités');
  }

  /* ---- Sheets par projet (top-level) ---- */
  state.data.projects.filter(p => !p.parentId).forEach(p => {
    const projTasks = getProjectTasks(p.id, true);
    if(projTasks.length === 0) return;
    const header = ['Axe', 'Origine', 'Description', 'Responsable', 'Échéance', 'Statut'];
    const rows = projTasks
      .sort((a,b) => (a.echeance||'9999').localeCompare(b.echeance||'9999'))
      .map(t => {
        const sub = t._subLabel || '';
        return [sub, t._origin, t.description, t.responsable||'', t.echeance||'', t.statut];
      });
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{wch:18},{wch:20},{wch:52},{wch:16},{wch:14},{wch:14}];
    // Truncate sheet name to 31 chars (Excel limit)
    const sheetName = p.name.slice(0,31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const filename = 'suivi-projets-' + todayStr() + '.xlsx';
  XLSX.writeFile(wb, filename);
  stampExportTime();
  showBanner('Export Excel téléchargé.', 'success');
}

function exportRaExcel(){
  const tasks = getRaFilteredTasks();
  const selYear = state.raYear || new Date().getFullYear().toString();
  const label = selYear==='all' ? 'Toutes années' : selYear;
  const BOM = '\uFEFF';
  const rows = [['Projet','Sous-projet','Origine','Réalisation','Responsable','Date de réalisation']];
  tasks.forEach(t => rows.push([
    t.projectName, t.subProjectName, t.originLabel, t.description,
    t.responsable||'',
    t.completedAt||t.echeance||''
  ]));
  const csv = BOM + rows.map(r => r.map(c => '"' + String(c||'').replace(/"/g,'""') + '"').join(';')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='rapport-activites-'+label+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportRaWord(){
  const tasks = getRaFilteredTasks();
  const selYear = state.raYear || new Date().getFullYear().toString();
  const label = selYear==='all' ? '' : ' '+selYear;
  // Groupes ordonnés par projet puis sous-projet (déjà triés par
  // getRaFilteredTasks) — on respecte cet ordre sans re-grouper par un
  // simple objet (qui ne garantit pas l'ordre d'insertion de façon fiable
  // une fois les clés mélangées).
  const groups = [];
  tasks.forEach(t=>{
    const last = groups[groups.length-1];
    if(last && last.projectName===t.projectName && last.subProjectName===t.subProjectName){
      last.tasks.push(t);
    } else {
      groups.push({ projectName:t.projectName, subProjectName:t.subProjectName, tasks:[t] });
    }
  });
  const td = 'border:1px solid #ccc;padding:6px 10px;';
  const o = '\x3c'; const c = '\x3e'; // < et > via hex pour éviter toute confusion avec le parseur HTML
  // Largeurs de colonnes fixes et identiques pour TOUTES les sections, afin
  // que les tableaux de chaque projet soient visuellement alignés entre eux.
  const colgroup = o+'colgroup'+c +
    o+'col style="width:18%;"'+c + o+'col style="width:42%;"'+c +
    o+'col style="width:20%;"'+c + o+'col style="width:20%;"'+c +
    o+'/colgroup'+c;
  let lastProjectHeading = null;
  const projectSections = groups.map(g=>{
    const rows = g.tasks.map(t=>
      o+'tr'+c+
      o+'td style="'+td+'"'+c+(t.originLabel||'')+o+'/td'+c+
      o+'td style="'+td+'"'+c+(t.description||'')+o+'/td'+c+
      o+'td style="'+td+'"'+c+(t.responsable||'')+o+'/td'+c+
      o+'td style="'+td+'"'+c+(t.completedAt||t.echeance||'')+o+'/td'+c+
      o+'/tr'+c
    ).join('');
    const heading = g.projectName !== lastProjectHeading
      ? o+'h2 style="font-family:Arial;font-size:13pt;color:#1F3A5C;margin:18pt 0 4pt;"'+c+escapeHtml(g.projectName)+o+'/h2'+c
      : '';
    lastProjectHeading = g.projectName;
    const subHeading = g.subProjectName
      ? o+'h3 style="font-family:Arial;font-size:11pt;color:#2E86C1;margin:4pt 0 6pt;"'+c+escapeHtml(g.subProjectName)+o+'/h3'+c
      : '';
    return heading + subHeading +
      o+'table style="border-collapse:collapse;width:100%;table-layout:fixed;font-family:Arial;font-size:10pt;"'+c+
      colgroup+
      o+'thead'+c+o+'tr style="background:#E8EFF5;"'+c+
      o+'th style="'+td+'text-align:left;"'+c+'Origine'+o+'/th'+c+
      o+'th style="'+td+'text-align:left;"'+c+'Réalisation'+o+'/th'+c+
      o+'th style="'+td+'text-align:left;"'+c+'Responsable'+o+'/th'+c+
      o+'th style="'+td+'text-align:left;"'+c+'Date'+o+'/th'+c+
      o+'/tr'+c+o+'/thead'+c+
      o+'tbody'+c+rows+o+'/tbody'+c+o+'/table'+c;
  }).join('');
  const docHtml = [
    o+'html xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:w="urn:schemas-microsoft-com:office:word"',
    ' xmlns="http://www.w3.org/TR/REC-html40"'+c,
    o+'head'+c+o+'meta charset="UTF-8"'+c,
    o+'style'+c+'body{font-family:Arial;font-size:11pt;} h1{font-size:16pt;} h2{font-size:13pt;}'+o+'/style'+c,
    o+'/head'+c+o+'body'+c,
    o+'h1 style="font-family:Arial;color:#1F3A5C;"'+c+'Rapport d\'activités'+label+o+'/h1'+c,
    o+'p style="color:#666;font-size:10pt;"'+c+'Généré le '+fmtDate(todayStr())+' \u2014 '+tasks.length+' réalisation(s)'+o+'/p'+c,
    o+'hr'+c+projectSections,
    o+'/body'+c+o+'/html'+c
  ].join('');
  const blob = new Blob(['\uFEFF'+docHtml], {type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='rapport-activites'+(label||'')+'.doc';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
function resetData(){
  state.modal = { type:'confirm-delete', message:'Réinitialiser toutes les données ? Tous les projets, séances, pages et tâches seront définitivement supprimés.',
    pendingAction: () => {
      state.data = defaultData();
      state.view='dashboard'; state.currentProjectId=null; state.currentSeanceId=null; state.currentPageId=null;
      state.modal = null;
      persistAndRender();
    }
  };
  render();
}

