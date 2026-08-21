"use strict";

/* ============== RENDER : ROOT ============== */
function render(){
  try {
    // Save EPV edit form before re-rendering (prevents note erasure)
    if(state.evolvingEditMode && state.currentProjectId && document.getElementById('epv-notes')){
      state._epvDraft = epvCollectEntry(state.currentProjectId);
    }
    const root = document.getElementById('app');
    if(!root) return;
    const main = document.querySelector('main.content');
    const scrollTop = main ? main.scrollTop : 0;
    root.innerHTML =
      renderSidebar() +
      '<main class="content">' +
        '<div class="view-enter">' + renderMain() + '</div>' +
      '</main>' +
      (state.modal ? renderModal() : '') +
      (state.banner ? '<div class="banner' + (state.bannerType==='success'?' success':state.bannerType==='info'?' info':state.bannerType==='warning'?' warning':'') + '">' +
        escapeHtml(state.banner) +
        (state.bannerType==='warning' ?
          '<div class="banner-actions">' +
            '<button class="banner-btn" data-action="export-json-from-reminder">Exporter maintenant</button>' +
            '<button class="banner-btn" data-action="dismiss-reminder">Plus tard</button>' +
          '</div>' : '') +
      '</div>' : '');
    attachDynamicValues();
    // Restore scroll position if staying in same view, else reset to top
    const newMain = document.querySelector('main.content');
    if(newMain){
      if(state._lastView === state.view && state._lastProjId === state.currentProjectId){
        newMain.scrollTop = scrollTop;
      }
      state._lastView = state.view;
      state._lastProjId = state.currentProjectId;
    }
  } catch(err) {
    const root = document.getElementById('app');
    if(root) root.innerHTML = '<div style="padding:32px;font-family:monospace;color:#A6383A;">' +
      '<strong>Erreur de rendu :</strong><br>' + escapeHtml(err.message) +
      '<pre style="margin-top:12px;font-size:.75rem;overflow:auto;">' + escapeHtml(err.stack||'') + '</pre></div>';
  }
}

function isProjectViewActive(){
  return ['project','seance-edit','seance-view','page-edit','page-view'].includes(state.view);
}

function projectTabHtml(p, isSub){
  const isActive = isProjectViewActive() && state.currentProjectId === p.id;
  const children = isSub ? [] : getChildren(p.id);
  const n = openTaskCount(p.id) + children.reduce((sum, c) => sum + openTaskCount(c.id), 0);
  const hasVig = p.vigilances && p.vigilances.length > 0;
  return '<button class="project-tab' + (isSub?' sub':'') + (isActive?' active':'') + '" ' +
    'draggable="true" data-proj-id="' + p.id + '" data-proj-parent="' + (p.parentId||'') + '" ' +
    'data-action="open-project" data-id="' + p.id + '">' +
    '<span class="swatch" style="background:' + p.color + '"></span>' +
    '<span class="pname">' + escapeHtml(p.name) + '</span>' +
    (hasVig ? '<span class="vig-dot" title="'+p.vigilances.length+' point(s) de vigilance">!</span>' : '') +
    (n>0 ? '<span class="pcount">' + n + '</span>' : '') +
  '</button>';
}

function renderSidebar(){
  if(state.view==='loading') return '<aside class="sidebar"></aside>';
  const topLevel = state.data.projects.filter(p => !p.parentId);
  let projectItems = '';
  if(topLevel.length===0){
    projectItems = '<div class="empty-projects-hint">Aucun projet pour l’instant. Créez-en un pour commencer.</div>';
  } else {
    projectItems = topLevel.map(p => {
      const children = getChildren(p.id);
      let html = projectTabHtml(p, false);
      if(children.length){
        html += '<div class="sub-project-group">' + children.map(c=>projectTabHtml(c, true)).join('') + '</div>';
      }
      return html;
    }).join('');
  }
  return '<aside class="sidebar">' +
    '<div class="sidebar-header">' +
      '<p class="brand-mark">Suivi de Projets</p>' +
      '<p class="brand-sub">Procès-verbaux &amp; tâches</p>' +
    '</div>' +
    '<div class="nav-dashboard">' +
      '<button class="nav-item' + (state.view==='home'?' active':'') + '" data-action="open-home">' + ICONS.dashboard + '<span>Accueil</span></button>' +
      '<button class="nav-item' + (['dashboard','calendar'].includes(state.view)?' active':'') + '" data-action="open-dashboard">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' +
        '<span>Tableau de bord</span>' +
      '</button>' +
    '</div>' +
    '<div class="project-list-label">Projets</div>' +
    '<div class="project-list">' + projectItems + '</div>' +
    '<div class="sidebar-footer">' +
      '<button class="footer-btn" data-action="open-new-project">' + ICONS.plus + '<span>Nouveau projet</span></button>' +
      '<button class="footer-btn" style="color:#E8C850;" data-action="open-import-pv-modal">' + ICONS.upload + '<span>Importer un PV</span></button>' +
      '<button class="footer-btn" data-action="open-import-json-modal">' + ICONS.upload + '<span>Importer (JSON)</span></button>' +
      '<button class="footer-btn" data-action="open-import-excel-modal">' + ICONS.upload + '<span>Importer (Excel/CSV)</span></button>' +
      '<button class="footer-btn" data-action="export-json">' + ICONS.download + '<span>Exporter (JSON)</span></button>' +
      '<button class="footer-btn" data-action="export-excel">' + ICONS.download + '<span>Exporter (Excel)</span></button>' +
      '<button class="footer-btn" data-action="reset-data">' + ICONS.refresh + '<span>Réinitialiser</span></button>' +
    '</div>' +
  '</aside>';
}

function renderMain(){
  switch(state.view){
    case 'loading': return '<p class="page-sub">Chargement…</p>';
    case 'home': return renderHome();
    case 'dashboard': return renderDashboard();
    case 'project': return renderProjectView();
    case 'seance-edit': return renderSeanceEditForm();
    case 'seance-view': return renderSeanceView();
    case 'page-edit': return renderPageEditForm();
    case 'page-view': return renderPageView();
    default: return '';
  }
}

function findTaskById(taskId, projectId){
  for(const s of getSeances(projectId)){ const t=(s.taches||[]).find(x=>x.id===taskId); if(t) return t; }
  for(const pg of getPages(projectId)){ const t=(pg.taches||[]).find(x=>x.id===taskId); if(t) return t; }
  const proj=getProject(projectId); const dt=(proj&&proj.directTasks||[]).find(x=>x.id===taskId); if(dt) return dt;
  const epv=state.data.evolvingPV[projectId];
  if(epv) for(const entry of (epv.entries||[])){ const t=(entry.taches||[]).find(x=>x.id===taskId); if(t) return t; }
  return null;
}

function getPriorityTasks(){
  const today = todayStr();
  return getAllTasks().filter(t =>
    t.priority && !DONE_STATUSES.includes(t.statut) &&
    (!t.priorityFrom || t.priorityFrom <= today)
  );
}
function getPriorityTasksScheduled(){
  const today = todayStr();
  return getAllTasks().filter(t =>
    t.priority && !DONE_STATUSES.includes(t.statut) && t.priorityFrom && t.priorityFrom > today
  );
}

