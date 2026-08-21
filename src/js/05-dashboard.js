"use strict";

/* ============== DASHBOARD ============== */
function renderDashboard(){
  const all = getAllTasks();
  if(state.data.projects.length===0){
    return '<p class="eyebrow">Vue d’ensemble</p>' +
      '<h1 class="page-title">Tableau de bord</h1>' +
      '<p class="page-sub">Toutes les tâches issues de vos projets, au même endroit.</p>' +
      '<div class="empty-state"><h3>Aucun projet encore</h3>' +
      '<p>Créez votre premier projet pour commencer à enregistrer des séances, des pages et des tâches.</p>' +
      '<button class="btn btn-primary" data-action="open-new-project">' + ICONS.plus + ' Créer un projet</button></div>';
  }

  const allVigs = [];
  state.data.projects.forEach(p => {
    (p.vigilances||[]).forEach(v => allVigs.push({ ...v, projectId:p.id, projectName:getProjectPath(p.id), projectColor:p.color }));
  });

  const openTaskCount2 = all.filter(t=>t.statut!=='fait' && t.statut!=='fait (R.A.)').length;
  const raCount = all.filter(t=>t.statut==='fait (R.A.)').length;
  const priorityCount = getPriorityTasks().length;
  const tabsHtml = '<div class="tab-row" style="margin-bottom:22px;">' +
    '<button class="tab-btn' + (state.dashboardTab==='taches'?' active':'') + '" data-action="db-tab-taches">Tâches' +
      (openTaskCount2>0 ? ' <span style="background:var(--navy);color:#fff;font-size:.65rem;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;margin-left:4px;">' + openTaskCount2 + '</span>' : '') +
    '</button>' +
    '<button class="tab-btn' + (state.dashboardTab==='prioritaires'?' active':'') + '" data-action="db-tab-prioritaires">⭐ Prioritaires' +
      (priorityCount>0 ? ' <span style="background:#7A5800;color:#fff;font-size:.65rem;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;margin-left:4px;">' + priorityCount + '</span>' : '') +
    '</button>' +
    '<button class="tab-btn' + (state.dashboardTab==='ra'?' active':'') + '" data-action="db-tab-ra">Rapport d\'activités</button>' +
    '<button class="tab-btn' + (state.dashboardTab==='vigilances'?' active':'') + '" data-action="db-tab-vigilances">Points de vigilance' +
      (allVigs.length>0 ? ' <span style="background:var(--seal-gold);color:#fff;font-size:.65rem;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;margin-left:4px;">' + allVigs.length + '</span>' : '') +
    '</button>' +
  '</div>';

  const header = '<p class="eyebrow">Vue d’ensemble</p>' +
    '<h1 class="page-title">Tableau de bord</h1>' +
    '<p class="page-sub">Toutes les tâches et points de vigilance, tous projets confondus.</p>';

  const body = state.dashboardTab==='vigilances' ? renderVigilancesDashboard(allVigs)
    : state.dashboardTab==='ra' ? renderRaDashboard(all)
    : state.dashboardTab==='prioritaires' ? renderPrioritairesDashboard()
    : renderTasksDashboard(all);

  return header + tabsHtml + body;
}

function renderPrioritairesDashboard(){
  const tasks = getPriorityTasks().sort((a,b)=>{
    const ea=a.echeance||'9999', eb=b.echeance||'9999'; return ea.localeCompare(eb);
  });
  if(tasks.length===0) return '<div class="empty-state"><h3>Aucune tâche prioritaire</h3><p>Marquez des tâches ⭐ depuis les tableaux de tâches de chaque projet.</p></div>';
  const rows = tasks.map(t=>{
    const overdue = isOverdue(t);
    return '<tr class="'+(overdue?'is-overdue':'')+'">' +
      '<td><span class="proj-tag"><span class="swatch" style="background:'+t.projectColor+'"></span>'+escapeHtml(t.projectPath)+'</span></td>' +
      '<td class="task-desc-cell" data-action="open-edit-task" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'">' + escapeHtml(t.description) + '</td>' +
      '<td>'+(t.responsable||'—')+'</td>' +
      '<td>'+fmtDate(t.echeance)+(overdue?'<span class="overdue-flag">EN RETARD</span>':'')+'</td>' +
      '<td><select class="status-select" style="border-left:3px solid '+STATUS_COLOR[t.statut]+';color:'+STATUS_COLOR[t.statut]+';" data-field="dash-task-statut" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'">' +
        STATUS_LIST.map(s=>'<option value="'+s+'"'+(t.statut===s?' selected':'')+'>'+s+'</option>').join('') +
      '</select></td>' +
      '<td class="no-print" style="white-space:nowrap;">' +
        '<button class="priority-star on" data-action="toggle-priority" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'" title="Retirer la priorité">⭐</button>' +
        '<button class="icon-btn" data-action="open-edit-task" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'" title="Modifier">'+ICONS.edit+'</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  return '<table class="ledger">' +
    '<thead><tr><th>Projet</th><th>Tâche</th><th>Responsable</th><th>Échéance</th><th>Statut</th><th class="no-print"></th></tr></thead>' +
    '<tbody>'+rows+'</tbody></table>';
}

function renderRaDashboard(all){
  const raTasks = all.filter(t=>t.statut==='fait (R.A.)')
    .sort((a,b)=>{
      const da = a.completedAt||a.echeance||'0000', db = b.completedAt||b.echeance||'0000';
      return db.localeCompare(da);
    });

  if(raTasks.length===0){
    return '<div class="empty-state"><h3>Aucune tâche marquée \u00ab\u00a0Fait (R.A.)\u00a0\u00bb</h3>' +
      '<p>Marquez des tâches avec le statut <strong>Fait (R.A.)</strong> pour les retrouver ici et générer votre rapport d\'activités annuel.</p></div>';
  }

  const years = [...new Set(raTasks.map(t=>(t.completedAt||t.echeance||'').slice(0,4)).filter(Boolean))].sort().reverse();
  const currentYear = new Date().getFullYear().toString();
  if(!state.raYear) state.raYear = years.includes(currentYear) ? currentYear : (years[0]||currentYear);
  const selYear = state.raYear;

  const filtered = raTasks.filter(t=>{
    if(selYear==='all') return true;
    const y = (t.completedAt||t.echeance||'').slice(0,4);
    return y===selYear;
  });

  const byProject = {};
  filtered.forEach(t=>{
    if(!byProject[t.projectPath]) byProject[t.projectPath] = { color:t.projectColor, tasks:[] };
    byProject[t.projectPath].tasks.push(t);
  });

  const yearOptions = '<option value="all">Toutes les années</option>' +
    years.map(y=>'<option value="'+y+'"'+(selYear===y?' selected':'')+'>'+y+'</option>').join('');

  const groups = Object.entries(byProject).map(([projName, grp])=>{
    const rows = grp.tasks.map(t=>
      '<tr>' +
        '<td>'+escapeHtml(t.originLabel)+'</td>' +
        '<td>'+escapeHtml(t.description)+'</td>' +
        '<td>'+(t.responsable?escapeHtml(t.responsable):'—')+'</td>' +
        '<td style="font-family:var(--font-mono);font-size:.78rem;">'+(t.completedAt?fmtDate(t.completedAt):(t.echeance?fmtDate(t.echeance):'—'))+'</td>' +
      '</tr>'
    ).join('');
    return '<div style="margin-bottom:28px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="width:10px;height:10px;border-radius:50%;background:'+grp.color+';flex-shrink:0;display:inline-block;"></span>' +
        '<span style="font-family:var(--font-display);font-weight:600;font-size:1rem;">'+escapeHtml(projName)+'</span>' +
        '<span style="font-family:var(--font-mono);font-size:.7rem;color:var(--ink-soft);">\u00b7 '+grp.tasks.length+' réalisation(s)</span>' +
      '</div>' +
      '<table class="ledger"><thead><tr><th>Origine</th><th>Réalisation</th><th>Responsable</th><th>Date réalisation</th></tr></thead>' +
      '<tbody>'+rows+'</tbody></table>' +
    '</div>';
  }).join('');

  const totalCount = filtered.length;
  const projCount = Object.keys(byProject).length;
  const summaryBadge = '<div style="display:flex;gap:16px;margin-bottom:8px;flex-wrap:wrap;">' +
    '<span style="font-family:var(--font-mono);font-size:.78rem;color:#6B4C9A;background:#F3F0FF;padding:4px 10px;border-radius:4px;">' + totalCount + ' réalisation(s)</span>' +
    '<span style="font-family:var(--font-mono);font-size:.78rem;color:var(--ink-soft);background:var(--blush);padding:4px 10px;border-radius:4px;">' + projCount + ' projet(s)</span>' +
  '</div>';

  const exportBar = '<div class="ra-export-bar no-print">' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
      '<span style="font-family:var(--font-mono);font-size:.72rem;color:var(--ink-soft);">ANNÉE</span>' +
      '<select class="filter" data-action="ra-filter-year">' + yearOptions + '</select>' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button class="btn" data-action="export-ra-excel">' + ICONS.download + ' Excel</button>' +
      '<button class="btn" data-action="export-ra-word">' + ICONS.download + ' Word</button>' +
      '<button class="btn" data-action="print-ra">' + ICONS.printer + ' Imprimer</button>' +
    '</div>' +
  '</div>';

  const printHeader = '<div class="ra-print-header">' +
    '<h2 style="font-family:var(--font-display);font-size:1.4rem;margin:0 0 4px;">Rapport d\'activités' + (selYear!=='all'?' '+selYear:'') + '</h2>' +
    '<p style="margin:0;color:var(--ink-soft);font-size:.84rem;">Généré le ' + fmtDate(todayStr()) + ' \u2014 ' + totalCount + ' réalisation(s) sur ' + projCount + ' projet(s)</p>' +
  '</div>';

  return exportBar + printHeader + summaryBadge + groups;
}

function renderVigilancesDashboard(allVigs){
  if(allVigs.length===0){
    return '<div class="empty-state"><h3>Aucun point de vigilance</h3>' +
      '<p>Ouvrez un projet et ajoutez des points de vigilance pour les retrouver ici.</p></div>';
  }
  const byProject = {};
  allVigs.forEach(v => {
    if(!byProject[v.projectId]) byProject[v.projectId] = { name:v.projectName, color:v.projectColor, items:[] };
    byProject[v.projectId].items.push(v);
  });
  const rows = allVigs.map(v =>
    '<tr>' +
      '<td><span class="proj-tag"><span class="swatch" style="background:' + v.projectColor + '"></span>' + escapeHtml(v.projectName) + '</span></td>' +
      '<td><span style="display:flex;align-items:flex-start;gap:8px;">' +
        '<span style="width:7px;height:7px;border-radius:50%;background:var(--seal-gold);flex-shrink:0;margin-top:5px;display:inline-block;"></span>' +
        fmtText(v.text) +
      '</span></td>' +
      '<td class="no-print"><button class="btn btn-ghost" style="font-size:.76rem;padding:4px 10px;" data-action="open-project" data-id="' + v.projectId + '">Ouvrir</button></td>' +
    '</tr>'
  );
  return '<div class="vigilance-block" style="margin-bottom:22px;">' +
      '<div class="vigilance-header">' +
        '<div class="vigilance-title">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
          allVigs.length + ' point' + (allVigs.length>1?'s':'') + ' de vigilance sur ' + Object.keys(byProject).length + ' projet' + (Object.keys(byProject).length>1?'s':'') +
        '</div>' +
      '</div>' +
    '</div>' +
    '<table class="ledger">' +
      '<thead><tr><th>Projet</th><th>Point de vigilance</th><th class="no-print"></th></tr></thead>' +
      '<tbody>' + rows.join('') + '</tbody>' +
    '</table>';
}

function renderTasksDashboard(all){
  const total = all.length;
  const aFaire = all.filter(t=>t.statut==='à faire').length;
  const enCours = all.filter(t=>t.statut==='en cours').length;
  const fait = all.filter(t=>t.statut==='fait').length;
  const enRetard = all.filter(isOverdue).length;
  const aFaireOk = aFaire - all.filter(t=>t.statut==='à faire' && isOverdue(t)).length;
  const enCoursOk = enCours - all.filter(t=>t.statut==='en cours' && isOverdue(t)).length;

  const f = state.dashboardFilters;
  const s = state.dashSort;
  const responsables = [...new Set(all.map(t=>t.responsable).filter(Boolean))].sort();
  const projectOptions = [];
  state.data.projects.filter(p=>!p.parentId).forEach(p=>{
    projectOptions.push({ id:p.id, label:p.name });
    getChildren(p.id).forEach(c=>projectOptions.push({ id:c.id, label:'— ' + c.name }));
  });

  // Sort key → value extractor
  function sortVal(t, col){
    switch(col){
      case 'projet':      return t.projectPath.toLowerCase();
      case 'origine':     return t.originLabel.toLowerCase();
      case 'tache':       return t.description.toLowerCase();
      case 'responsable': return (t.responsable||'').toLowerCase();
      case 'echeance':    return t.echeance||'9999-99-99';
      case 'statut':      return t.statut;
      default:            return t.echeance||'9999-99-99';
    }
  }

  let rows = all.filter(t => {
    if(f.projet!=='all' && t.projectId!==f.projet) return false;
    if(f.statut!=='all' && t.statut!==f.statut) return false;
    if(f.responsable!=='all' && t.responsable!==f.responsable) return false;
    if(f.origine!=='all' && t.origin!==f.origine) return false;
    if(f.onlyOverdue && !isOverdue(t)) return false;
    return true;
  }).sort((a,b)=>{
    // Done tasks always go to the bottom
    const aDone = DONE_STATUSES.includes(a.statut) ? 1 : 0;
    const bDone = DONE_STATUSES.includes(b.statut) ? 1 : 0;
    if(aDone !== bDone) return aDone - bDone;
    // Within each group, apply the selected column sort
    const va = sortVal(a, s.col||'echeance');
    const vb = sortVal(b, s.col||'echeance');
    return va < vb ? -s.dir : va > vb ? s.dir : 0;
  });

  // Column definitions with sort keys
  const COLS = [
    { key:'projet',      label:'Projet' },
    { key:'origine',     label:'Origine' },
    { key:'tache',       label:'Tâche' },
    { key:'responsable', label:'Responsable' },
    { key:'echeance',    label:'Échéance' },
    { key:'statut',      label:'Statut' }
  ];

  function thClass(key){ return 'sortable' + (s.col===key ? (s.dir===1?' sort-asc':' sort-desc') : ''); }

  const tableHeaders = COLS.map(c =>
    '<th class="'+thClass(c.key)+'" data-action="sort-col" data-col="'+c.key+'">'+c.label+'</th>'
  ).join('') + '<th class="no-print"></th>';

  const tableBody = rows.length===0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:24px;">Aucune tâche ne correspond à ces filtres.</td></tr>'
    : rows.map((t, idx) => {
        const overdue = isOverdue(t);
        const isDone = DONE_STATUSES.includes(t.statut);
        const prevIsDone = idx > 0 && DONE_STATUSES.includes(rows[idx-1].statut);
        const separator = (isDone && !prevIsDone && idx > 0)
          ? '<tr><td colspan="7" style="padding:0;"><div style="display:flex;align-items:center;gap:10px;padding:7px 14px;background:#F6F9FD;border-top:2px solid var(--paper-line);border-bottom:1px solid var(--paper-line);"><span style="font-family:var(--font-mono);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);">✓ Tâches terminées</span></div></td></tr>'
          : '';
        return separator +
          '<tr class="'+(overdue?'is-overdue':'')+'" style="'+(isDone?'opacity:.6;':'') +'">' +
          '<td><span class="proj-tag"><span class="swatch" style="background:'+t.projectColor+'"></span>'+escapeHtml(t.projectPath)+'</span></td>' +
          '<td>'+escapeHtml(t.originLabel)+(t.source==='onenote'?'<span class="source-chip">OneNote</span>':'')+'</td>' +
          '<td class="task-desc-cell" data-action="open-edit-task" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'">'+(isDone?'<span style="text-decoration:line-through;color:var(--ink-soft);">':'')+escapeHtml(t.description)+(isDone?'</span>':'')+'</td>' +
          '<td>'+(t.responsable?escapeHtml(t.responsable):'<span style="color:var(--ink-soft)">—</span>')+'</td>' +
          '<td>'+fmtDate(t.echeance)+(overdue?'<span class="overdue-flag">EN RETARD</span>':'')+'</td>' +
          '<td><select class="status-select" style="border-left:3px solid '+STATUS_COLOR[t.statut]+';color:'+STATUS_COLOR[t.statut]+';" data-field="dash-task-statut" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'">' +
            STATUS_LIST.map(ss=>'<option value="'+ss+'"'+(t.statut===ss?' selected':'')+'>'+ss+'</option>').join('') +
          '</select></td>' +
          '<td class="no-print" style="white-space:nowrap;">' +
            '<button class="priority-star'+(t.priority?' on':'')+'" data-action="toggle-priority" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'" title="'+(t.priority?(t.priorityFrom&&t.priorityFrom>todayStr()?'Planifié le '+fmtDate(t.priorityFrom)+' — clic pour retirer':'Retirer la priorité'):'Marquer comme prioritaire')+'">'+((t.priority&&t.priorityFrom&&t.priorityFrom>todayStr())?'🕐':'⭐')+'</button>' +
            '<button class="icon-btn" data-action="open-edit-task" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'" title="Modifier">'+ICONS.edit+'</button>' +
            '<button class="icon-btn" data-action="delete-task" data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'" title="Supprimer" style="color:var(--stamp-red);opacity:.6;">'+ICONS.trash+'</button>' +
          '</td>' +
        '</tr>';
      }).join('');

  function cardClass(name){ return (name==='total'&&f.statut==='all'&&!f.onlyOverdue)||(name==='overdue'&&f.onlyOverdue)||(name===f.statut&&!f.onlyOverdue)?' active':''; }

  const statusBar = total===0 ? '' :
    '<div class="status-bar">' +
      (fait?'<div class="status-bar-segment" style="width:'+(fait/total*100)+'%;background:'+STATUS_COLOR['fait']+';"></div>':'') +
      (enCoursOk?'<div class="status-bar-segment" style="width:'+(enCoursOk/total*100)+'%;background:'+STATUS_COLOR['en cours']+';"></div>':'') +
      (aFaireOk?'<div class="status-bar-segment" style="width:'+(aFaireOk/total*100)+'%;background:'+STATUS_COLOR['à faire']+';"></div>':'') +
      (enRetard?'<div class="status-bar-segment" style="width:'+(enRetard/total*100)+'%;background:var(--stamp-red);"></div>':'') +
    '</div>' +
    '<div class="status-legend">' +
      '<span class="status-legend-item" data-action="dash-filter-statut" data-value="fait"><span class="dot" style="background:'+STATUS_COLOR['fait']+'"></span>Terminées · '+fait+'</span>' +
      '<span class="status-legend-item" data-action="dash-filter-statut" data-value="en cours"><span class="dot" style="background:'+STATUS_COLOR['en cours']+'"></span>En cours · '+enCours+'</span>' +
      '<span class="status-legend-item" data-action="dash-filter-statut" data-value="à faire"><span class="dot" style="background:'+STATUS_COLOR['à faire']+'"></span>À faire · '+aFaire+'</span>' +
      (enRetard?'<span class="status-legend-item" data-action="dash-filter-overdue"><span class="dot" style="background:var(--stamp-red)"></span>En retard · '+enRetard+'</span>':'') +
    '</div>';

  return '<div class="stat-row">' +
      '<div class="stat-card'+cardClass('total')+'" data-action="dash-filter-reset"><div class="stat-num">'+total+'</div><div class="stat-label">Total</div></div>' +
      '<div class="stat-card'+cardClass('à faire')+'" data-action="dash-filter-statut" data-value="à faire"><div class="stat-num">'+aFaire+'</div><div class="stat-label">À faire</div></div>' +
      '<div class="stat-card'+cardClass('en cours')+'" data-action="dash-filter-statut" data-value="en cours"><div class="stat-num">'+enCours+'</div><div class="stat-label">En cours</div></div>' +
      '<div class="stat-card'+cardClass('fait')+'" data-action="dash-filter-statut" data-value="fait"><div class="stat-num">'+fait+'</div><div class="stat-label">Terminées</div></div>' +
      '<div class="stat-card overdue'+cardClass('overdue')+'" data-action="dash-filter-overdue"><div class="stat-num">'+enRetard+'</div><div class="stat-label">En retard</div></div>' +
    '</div>' +
    statusBar +
    '<div class="filter-row">' +
      '<select class="filter" data-action="filter-projet"><option value="all"'+(f.projet==='all'?' selected':'')+'>Tous les projets</option>'+projectOptions.map(o=>'<option value="'+o.id+'"'+(f.projet===o.id?' selected':'')+'>'+escapeHtml(o.label)+'</option>').join('')+'</select>' +
      '<select class="filter" data-action="filter-statut"><option value="all"'+(f.statut==='all'?' selected':'')+'>Tous les statuts</option>'+STATUS_LIST.map(ss=>'<option value="'+ss+'"'+(f.statut===ss?' selected':'')+'>'+ss+'</option>').join('')+'</select>' +
      '<select class="filter" data-action="filter-origine"><option value="all"'+(f.origine==='all'?' selected':'')+'>Toutes les origines</option><option value="seance"'+(f.origine==='seance'?' selected':'')+'>Séances (PV)</option><option value="page"'+(f.origine==='page'?' selected':'')+'>Pages</option></select>' +
      '<select class="filter" data-action="filter-responsable"><option value="all"'+(f.responsable==='all'?' selected':'')+'>Tous les responsables</option>'+responsables.map(r=>'<option value="'+escapeHtml(r)+'"'+(f.responsable===r?' selected':'')+'>'+escapeHtml(r)+'</option>').join('')+'</select>' +
      '<label class="filter-check"><input type="checkbox" data-action="filter-overdue"'+(f.onlyOverdue?' checked':'')+'>Uniquement en retard</label>' +
    '</div>' +
    '<table class="ledger"><thead><tr>'+tableHeaders+'</tr></thead><tbody>'+tableBody+'</tbody></table>';
}

