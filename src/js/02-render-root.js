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
    // La mini-liste "Échéances à venir" a son propre défilement interne,
    // distinct de celui de main.content — sans ça, chaque re-rendu (ex. un
    // glisser-déposer) le remettait à zéro, donnant l'impression que la
    // liste "remonte en haut" à chaque action.
    const upcomingListEl = document.getElementById('upcoming-list');
    const upcomingScrollTop = upcomingListEl ? upcomingListEl.scrollTop : 0;
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
    const newUpcomingList = document.getElementById('upcoming-list');
    if(newUpcomingList) newUpcomingList.scrollTop = upcomingScrollTop;
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
    '<div class="sidebar-search">' +
      '<input type="text" id="global-search-input" placeholder="Rechercher…" autocomplete="off" value="'+escapeHtml(state.searchQuery||'')+'">' +
      (state.searchQuery ? '<button class="clear-search-btn" data-action="clear-search" title="Effacer la recherche">✕</button>' : '') +
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
  if(state.searchQuery && state.searchQuery.trim()) return renderSearchResults();
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

/* ============== RECHERCHE GLOBALE ============== */
function searchAll(query){
  const q = (query||'').trim().toLowerCase();
  const results = { projects:[], tasks:[], seances:[], pages:[], vigilances:[], events:[], notes:[], epv:[] };
  if(!q) return results;

  state.data.projects.forEach(p => {
    const hayP = [p.name||'', stripHtml(p.description||''), stripHtml(p.contacts||'')].join(' ').toLowerCase();
    if(hayP.includes(q)) results.projects.push(p);
    (p.vigilances||[]).forEach(v => { if(stripHtml(v.text||'').toLowerCase().includes(q)) results.vigilances.push({ project:p, text:v.text, isDev:false }); });
    (p.developments||[]).forEach(d => { if(stripHtml(d.text||'').toLowerCase().includes(q)) results.vigilances.push({ project:p, text:d.text, isDev:true }); });

    getSeances(p.id).forEach(s => {
      const hayS = [s.title||'', stripHtml(s.notes||''), (s.conclusions||[]).map(stripHtml).join(' ')].join(' ').toLowerCase();
      if(hayS.includes(q)) results.seances.push({ project:p, seance:s });
    });
    getPages(p.id).forEach(pg => {
      const hayPg = [pg.title||'', stripHtml(pg.notes||'')].join(' ').toLowerCase();
      if(hayPg.includes(q)) results.pages.push({ project:p, page:pg });
    });
    getEPV(p.id).forEach(entry => {
      const hayE = [stripHtml(entry.notes||''), (entry.conclusions||[]).map(stripHtml).join(' ')].join(' ').toLowerCase();
      if(hayE.includes(q)) results.epv.push({ project:p, entry });
    });
  });

  getAllTasks().forEach(t => {
    const hayT = [(t.description||''), (t.responsable||'')].join(' ').toLowerCase();
    if(hayT.includes(q)) results.tasks.push(t);
  });

  (state.data.calendar && state.data.calendar.events || []).forEach(ev => {
    const hayEv = [(ev.text||''), (ev.responsable||'')].join(' ').toLowerCase();
    if(hayEv.includes(q)) results.events.push(ev);
  });

  (state.data.quickNotes||[]).forEach(n => {
    if((n.text||'').toLowerCase().includes(q)) results.notes.push(n);
  });

  return results;
}

function renderSearchResults(){
  const q = (state.searchQuery||'').trim();
  const r = searchAll(q);
  const total = r.projects.length + r.tasks.length + r.seances.length + r.pages.length + r.vigilances.length + r.events.length + r.notes.length + r.epv.length;

  function card(action, attrs, icon, title, sub){
    return '<div data-action="'+action+'" '+attrs+' style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--card);border:1px solid var(--paper-line);border-radius:8px;cursor:pointer;">' +
      '<span style="font-size:.9rem;flex-shrink:0;">'+icon+'</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:600;font-size:.86rem;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+title+'</div>' +
        (sub ? '<div style="font-family:var(--font-mono);font-size:.7rem;color:var(--ink-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+sub+'</div>' : '') +
      '</div>' +
    '</div>';
  }
  function section(title, items, fn){
    if(!items.length) return '';
    return '<div style="margin-bottom:22px;">' +
      '<p class="home-section-title">'+escapeHtml(title)+' <span style="font-family:var(--font-mono);font-size:.68rem;color:var(--ink-soft);">('+items.length+')</span></p>' +
      '<div style="display:flex;flex-direction:column;gap:6px;">' + items.map(fn).join('') + '</div>' +
    '</div>';
  }

  const body = total===0
    ? '<p style="color:var(--ink-soft);font-size:.9rem;">Aucun résultat pour « '+escapeHtml(q)+' ».</p>'
    : section('Projets', r.projects, p =>
        card('open-project', 'data-id="'+p.id+'"', '📁', escapeHtml(p.name), escapeHtml(p.status||''))) +
      section('Tâches', r.tasks, t =>
        card('open-edit-task', 'data-task-id="'+t.taskId+'" data-project-id="'+t.projectId+'" data-origin="'+t.origin+'" data-seance-id="'+(t.seanceId||'')+'" data-page-id="'+(t.pageId||'')+'"', '☑', escapeHtml(t.description), escapeHtml(t.projectPath)+(t.echeance?' · '+fmtDate(t.echeance):''))) +
      section('Vigilances &amp; perspectives', r.vigilances, v =>
        card('open-project', 'data-id="'+v.project.id+'"', v.isDev?'➡':'⚠', escapeHtml(stripHtml(v.text).slice(0,120)), escapeHtml(v.project.name))) +
      section('Séances (PV)', r.seances, x =>
        card('open-seance', 'data-pid="'+x.project.id+'" data-id="'+x.seance.id+'"', '🗒', escapeHtml(x.seance.title||'Séance'), escapeHtml(x.project.name)+' · '+fmtDate(x.seance.date))) +
      section('Pages', r.pages, x =>
        card('open-page', 'data-pid="'+x.project.id+'" data-id="'+x.page.id+'"', '📄', escapeHtml(x.page.title), escapeHtml(x.project.name))) +
      section('Suivi continu', r.epv, x =>
        card('open-project', 'data-id="'+x.project.id+'"', '↻', escapeHtml(stripHtml(x.entry.notes||'').slice(0,120)||'(entrée sans notes)'), escapeHtml(x.project.name)+' · '+fmtDate(x.entry.date))) +
      section('Événements du calendrier', r.events, ev =>
        card('edit-cal-event', 'data-id="'+ev.id+'"', '📅', escapeHtml(ev.text||''), (ev.responsable?escapeHtml(ev.responsable)+' · ':'')+CAL_MONTHS_SHORT[ev.startMonth]+' '+ev.year)) +
      section('Notes rapides', r.notes, n =>
        card('open-home', '', '📝', escapeHtml(n.text), fmtDate(n.createdAt)));

  return '<p class="eyebrow">Recherche</p>' +
    '<h1 class="page-title">Résultats pour « '+escapeHtml(q)+' »</h1>' +
    '<p class="page-sub">'+total+' résultat'+(total>1?'s':'')+'</p>' +
    body;
}

