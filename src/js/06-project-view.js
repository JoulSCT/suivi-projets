"use strict";

/* ============== PROJECT VIEW ============== */
function renderProjectView(){
  const p = getProject(state.currentProjectId);
  if(!p){ state.view='dashboard'; return renderDashboard(); }

  let breadcrumb = '';
  if(p.parentId){
    const parent = getProject(p.parentId);
    if(parent){
      breadcrumb = '<p class="project-ref">SOUS-PROJET DE <button class="breadcrumb-link" data-action="open-project" data-id="'+parent.id+'">' + escapeHtml(parent.name) + '</button> · DOSSIER ' + projectRef(p.id) + '</p>';
    }
  } else {
    breadcrumb = '<p class="project-ref">DOSSIER ' + projectRef(p.id) + '</p>';
  }

  const vigilances = p.vigilances || [];
  const hasVig = vigilances.length > 0;
  const vigIcon = hasVig
    ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const developments = p.developments || [];
  const hasDev = developments.length > 0;
  const vigSection = '<div class="vigilance-block '+(hasVig?'has-points':'no-points')+'">' +
    '<div class="vigilance-header">' +
      '<div class="vigilance-title">' + vigIcon + 'Points de vigilance</div>' +
      '<button class="btn btn-ghost no-print" data-action="add-vigilance" data-id="'+p.id+'" style="font-size:.78rem;padding:5px 10px;">' + ICONS.plus + ' Ajouter</button>' +
    '</div>' +
    (vigilances.length===0
      ? '<p class="vigilance-empty">Aucun point de vigilance — tout est en ordre.</p>'
      : '<ul class="vigilance-list">' +
          vigilances.map((v,i) =>
            '<li class="vigilance-item">' +
              '<span class="vigilance-bullet"></span>' +
              '<span class="vigilance-text">' + fmtText(v.text) + '</span>' +
              '<div class="vigilance-actions no-print">' +
                '<button class="icon-btn" data-action="edit-vigilance" data-id="'+p.id+'" data-idx="'+i+'" title="Modifier">' + ICONS.edit + '</button>' +
                '<button class="icon-btn" data-action="delete-vigilance" data-id="'+p.id+'" data-idx="'+i+'" title="Supprimer">' + ICONS.trash + '</button>' +
              '</div>' +
            '</li>'
          ).join('') +
        '</ul>'
    ) +
  '</div>';

  const devSection = '<div class="dev-block '+(hasDev?'has-points':'no-points')+'">' +
    '<div class="vigilance-header">' +
      '<div class="dev-title">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        'Perspectives de d\u00e9veloppement' +
      '</div>' +
      '<button class="btn btn-ghost no-print" data-action="add-development" data-id="'+p.id+'" style="font-size:.78rem;padding:5px 10px;">' + ICONS.plus + ' Ajouter</button>' +
    '</div>' +
    (developments.length===0
      ? '<p style="color:#1A3A6A;font-size:.82rem;margin:0;">Aucune perspective de d\u00e9veloppement enregistr\u00e9e.</p>'
      : '<ul class="vigilance-list">' +
          developments.map((d,i) =>
            '<li class="vigilance-item" style="border-color:#C8DCF0;">' +
              '<span class="vigilance-bullet" style="background:var(--navy);opacity:.7;"></span>' +
              '<span class="vigilance-text">' + fmtText(d.text) + '</span>' +
              '<div class="vigilance-actions no-print">' +
                '<button class="icon-btn" data-action="edit-development" data-id="'+p.id+'" data-idx="'+i+'" title="Modifier">' + ICONS.edit + '</button>' +
                '<button class="icon-btn" data-action="delete-development" data-id="'+p.id+'" data-idx="'+i+'" title="Supprimer">' + ICONS.trash + '</button>' +
              '</div>' +
            '</li>'
          ).join('') +
        '</ul>'
    ) +
  '</div>';

  let subSection = '';
  if(!p.parentId){
    const children = getChildren(p.id);
    let grid = '';
    if(children.length){
      grid = '<div class="subproj-grid">' + children.map(c => {
        const n = openTaskCount(c.id);
        return '<div class="subproj-card" data-action="open-project" data-id="'+c.id+'">' +
          '<div class="subproj-card-top">' +
            '<span style="display:flex;align-items:flex-start;gap:6px;font-weight:500;font-size:.88rem;flex:1;min-width:0;">' +
              '<span class="swatch" style="background:'+c.color+';flex-shrink:0;margin-top:4px;"></span>' +
              '<span style="overflow-wrap:break-word;hyphens:auto;line-height:1.4;" lang="fr">'+escapeHtml(c.name)+'</span>' +
            '</span>' +
            '<div class="subproj-card-actions no-print">' +
              '<button class="icon-btn" data-action="open-edit-project" data-id="'+c.id+'" title="Modifier">' + ICONS.edit + '</button>' +
              '<button class="icon-btn" data-action="delete-project" data-id="'+c.id+'" title="Supprimer">' + ICONS.trash + '</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-family:var(--font-mono);font-size:.72rem;color:var(--ink-soft);">' + (n>0 ? n + ' tâche(s) ouverte(s)' : 'tout terminé') + '</div>' +
        '</div>';
      }).join('') + '</div>';
    }
    subSection = '<div class="section-block">' +
      '<div class="section-heading"><h2>Sous-projets</h2>' +
        '<button class="btn btn-ghost no-print" data-action="open-new-subproject" data-id="'+p.id+'">' + ICONS.plus + ' Ajouter un sous-projet</button>' +
      '</div>' +
      (grid || '<p style="color:var(--ink-soft);font-size:.85rem;">Aucun sous-projet pour l’instant.</p>') +
    '</div>';
  }

  // Compute open task count for the badge on the tab
  const allProjTasks = getProjectTasks(p.id, true);
  const openCount = allProjTasks.filter(t=>!DONE_STATUSES.includes(t.statut)).length;
  const hasPriority = allProjTasks.some(t=>t.priority && !DONE_STATUSES.includes(t.statut));
  const children = getChildren(p.id);
  const hasChildren = children.length > 0;

  const tabsHtml = '<div class="tab-row no-print">' +
    '<button class="tab-btn' + (state.projectTab==='seances'?' active':'') + '" data-action="set-tab-seances">Séances (PV)</button>' +
    '<button class="tab-btn' + (state.projectTab==='suivi'?' active':'') + '" data-action="set-tab-suivi">↻ Suivi continu</button>' +
    '<button class="tab-btn' + (state.projectTab==='pages'?' active':'') + '" data-action="set-tab-pages">Pages</button>' +
    '<button class="tab-btn' + (state.projectTab==='taches'?' active':'') + '" data-action="set-tab-taches">Tâches' +
      (openCount>0 ? ' <span style="background:'+(hasPriority?'var(--stamp-red)':'var(--navy)')+';color:#fff;font-size:.65rem;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;margin-left:4px;">'+openCount+'</span>' : '') +
    '</button>' +
  '</div>';

  const tabContent = state.projectTab==='pages' ? renderPagesTab(p)
    : state.projectTab==='taches' ? renderTachesTab(p, hasChildren)
    : state.projectTab==='suivi' ? renderEvolvingPV(p)
    : renderSeancesTab(p);

  return '<button class="btn btn-ghost no-print" data-action="open-dashboard" style="margin-bottom:18px;">' + ICONS.back + ' Tableau de bord</button>' +
    '<div class="project-header">' +
      '<div class="accent-stripe" style="background:'+p.color+'"></div>' +
      '<div class="project-header-top">' +
        '<div style="flex:1;min-width:0;">' +
          breadcrumb +
          '<h1 class="project-name">' + escapeHtml(p.name) + '</h1>' +
          ((p.contacts || p.description) ?
            '<div style="display:grid;grid-template-columns:'+(p.contacts && p.description?'1fr 1fr':'1fr')+';gap:16px;margin-top:10px;">' +
              (p.contacts ?
                '<div>' +
                  '<p style="font-family:var(--font-mono);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 5px;">Personnes en charge</p>' +
                  '<div style="font-size:.84rem;color:var(--ink);line-height:1.6;" class="proj-rich-text">' + fmtText(p.contacts) + '</div>' +
                '</div>' : '') +
              (p.description ?
                '<div>' +
                  '<p style="font-family:var(--font-mono);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 5px;">Objectifs</p>' +
                  '<div style="font-size:.84rem;color:var(--ink);line-height:1.6;" class="proj-rich-text">' + fmtText(p.description) + '</div>' +
                '</div>' : '') +
            '</div>'
          : '') +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0;">' +
          '<span class="project-status-badge">' + escapeHtml(p.status) + '</span>' +
          '<div class="project-actions no-print">' +
            '<button class="icon-btn" data-action="open-edit-project" data-id="'+p.id+'" title="Modifier le projet">' + ICONS.edit + '</button>' +
            '<button class="icon-btn" data-action="delete-project" data-id="'+p.id+'" title="Supprimer le projet">' + ICONS.trash + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    subSection +
    vigSection +
    devSection +
    tabsHtml +
    tabContent;
}

/* Return all tasks for a project (and optionally its sub-projects), enriched with origin info */
function getProjectTasks(projectId, includeChildren){
  const out = [];
  const ids = includeChildren ? [projectId, ...getChildren(projectId).map(c=>c.id)] : [projectId];
  ids.forEach(pid => {
    const proj = getProject(pid);
    const label = pid === projectId ? null : proj ? proj.name : null;
    // Direct project tasks
    (proj && proj.directTasks || []).forEach(t => {
      out.push({ ...t, _pid:pid, _subLabel:label, _origin:'— Direct', _date:proj.createdAt, _isDirect:true });
    });
    sortedSeances(pid).forEach((s, idx) => {
      (s.taches||[]).forEach(t => {
        out.push({ ...t, _pid:pid, _subLabel:label, _origin:s.title?escapeHtml(s.title):'Séance n°'+(idx+1), _date:s.date });
      });
    });
    getPages(pid).forEach(pg => {
      (pg.taches||[]).forEach(t => {
        out.push({ ...t, _pid:pid, _subLabel:label, _origin:'Page : '+pg.title, _date:pg.createdAt, _pageId:pg.id, _isPage:true });
      });
    });
    // Suivi continu (evolvingPV)
    getEPV(pid).forEach((entry, idx) => {
      (entry.taches||[]).forEach(t => {
        out.push({ ...t, _pid:pid, _subLabel:label, _origin:'Suivi : '+(entry.date||''), _date:entry.date, _epvId:entry.id, _isEpv:true });
      });
    });
  });
  return out;
}

function renderTachesTab(p, hasChildren){
  const ps = state.projSort;

  function projSortVal(t, col){
    switch(col){
      case 'origine':     return (t._origin||'').toLowerCase();
      case 'tache':       return (t.description||'').toLowerCase();
      case 'responsable': return (t.responsable||'').toLowerCase();
      case 'echeance':    return t.echeance||'9999-99-99';
      case 'statut':      return t.statut;
      default:            return t.echeance||'9999-99-99';
    }
  }

  const tasks = getProjectTasks(p.id, hasChildren)
    .sort((a,b) => {
      const aDone = DONE_STATUSES.includes(a.statut) ? 1 : 0;
      const bDone = DONE_STATUSES.includes(b.statut) ? 1 : 0;
      if(aDone !== bDone) return aDone - bDone;
      const va = projSortVal(a, ps.col||'echeance');
      const vb = projSortVal(b, ps.col||'echeance');
      return va < vb ? -ps.dir : va > vb ? ps.dir : 0;
    });

  const aFaire = tasks.filter(t=>t.statut==='à faire').length;
  const enCours = tasks.filter(t=>t.statut==='en cours').length;
  const fait    = tasks.filter(t=>DONE_STATUSES.includes(t.statut)).length;
  const enRetard= tasks.filter(isOverdue).length;
  const total   = tasks.length;

  const bar = total===0 ? '' :
    '<div style="display:flex;gap:14px;margin-bottom:18px;flex-wrap:wrap;">' +
      ['à faire','en cours','fait'].map(s => {
        const n = tasks.filter(t=>t.statut===s).length;
        return '<span style="font-family:var(--font-mono);font-size:.72rem;color:var(--ink-soft);display:flex;align-items:center;gap:5px;">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:'+STATUS_COLOR[s]+';display:inline-block;"></span>' + s + ' · ' + n + '</span>';
      }).join('') +
      (enRetard ? '<span style="font-family:var(--font-mono);font-size:.72rem;color:var(--stamp-red);display:flex;align-items:center;gap:5px;">'+
        '<span style="width:8px;height:8px;border-radius:50%;background:var(--stamp-red);display:inline-block;"></span>en retard · '+enRetard+'</span>' : '') +
    '</div>';

  const rows = tasks.map((t, idx) => {
    const overdue = isOverdue(t);
    const isDone = DONE_STATUSES.includes(t.statut);
    const prevIsDone = idx > 0 && DONE_STATUSES.includes(tasks[idx-1].statut);
    const separator = (isDone && !prevIsDone && idx > 0)
      ? '<tr><td colspan="6" style="padding:0;"><div style="padding:7px 14px;background:#F6F9FD;border-top:2px solid var(--paper-line);border-bottom:1px solid var(--paper-line);font-family:var(--font-mono);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);">✓ Tâches terminées</div></td></tr>'
      : '';
    const subCol = t._subLabel
      ? '<span style="font-size:.76rem;color:var(--ink-soft);display:block;">' + escapeHtml(t._subLabel) + '</span>'
      : '';
    return separator +
      '<tr class="'+(overdue?'is-overdue':'')+'" style="'+(isDone?'opacity:.6;':'')+'">' +
      '<td>' + subCol + escapeHtml(t._origin) + '<br><span style="color:var(--ink-soft);font-size:.74rem;">' + fmtDate(t._date) + '</span></td>' +
      '<td class="task-desc-cell" data-action="open-edit-task" data-task-id="'+t.id+'" data-project-id="'+t._pid+'" data-origin="'+(t._isPage?'page':'seance')+'" data-seance-id="" data-page-id="'+(t._pageId||'')+'">'+(isDone?'<span style="text-decoration:line-through;color:var(--ink-soft);">':'')+escapeHtml(t.description)+(isDone?'</span>':'')+'</td>' +
      '<td>' + (t.responsable ? escapeHtml(t.responsable) : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
      '<td>' + fmtDate(t.echeance) + (overdue ? '<span class="overdue-flag">EN RETARD</span>' : '') + '</td>' +
      '<td><select class="status-select" style="border-left:3px solid '+STATUS_COLOR[t.statut]+';color:'+STATUS_COLOR[t.statut]+';" ' +
        'data-field="proj-task-statut" ' +
        'data-project-id="'+t._pid+'" ' +
        'data-task-id="'+t.id+'" ' +
        'data-is-page="'+(t._isPage?'1':'0')+'" ' +
        'data-page-id="'+(t._pageId||'')+'"> ' +
        STATUS_LIST.map(s=>'<option value="'+s+'"'+(t.statut===s?' selected':'')+'>'+s+'</option>').join('') +
      '</select></td>' +
      '<td class="no-print" style="white-space:nowrap;">' +
        '<button class="priority-star'+(t.priority?' on':'')+'" data-action="toggle-priority" ' +
          'data-task-id="'+t.id+'" data-project-id="'+t._pid+'" ' +
          'data-origin="'+(t._isPage?'page':'seance')+'" data-seance-id="" data-page-id="'+(t._pageId||'')+'" ' +
          'title="'+(t.priority?'Retirer la priorité':'Marquer comme prioritaire')+'">⭐</button>' +
        '<button class="icon-btn" data-action="open-edit-task" ' +
          'data-task-id="'+t.id+'" data-project-id="'+t._pid+'" ' +
          'data-origin="'+(t._isPage?'page':'seance')+'" data-seance-id="" data-page-id="'+(t._pageId||'')+'" ' +
          'title="Modifier">'+ICONS.edit+'</button>' +
        '<button class="icon-btn" data-action="delete-task" ' +
          'data-task-id="'+t.id+'" data-project-id="'+t._pid+'" ' +
          'data-origin="'+(t._isPage?'page':'seance')+'" data-seance-id="" data-page-id="'+(t._pageId||'')+'" ' +
          'title="Supprimer" style="color:var(--stamp-red);opacity:.6;">'+ICONS.trash+'</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  function pThClass(key){ return 'sortable' + (ps.col===key ? (ps.dir===1?' sort-asc':' sort-desc') : ''); }

  // Inline add task form
  const addForm = '<div style="background:var(--blush);border:1px solid var(--paper-line);border-radius:var(--radius);padding:14px 16px;margin-bottom:14px;">' +
    '<p style="font-family:var(--font-mono);font-size:.64rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 10px;">Nouvelle tâche</p>' +
    '<div style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:8px;align-items:center;margin-bottom:10px;">' +
      '<input type="text" id="direct-task-desc" placeholder="Description de la tâche…" style="padding:8px 10px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.86rem;">' +
      '<input type="text" id="direct-task-resp" placeholder="Responsable" style="padding:8px 10px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.84rem;width:110px;">' +
      '<input type="date" id="direct-task-date" style="padding:7px 8px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.82rem;">' +
      '<select id="direct-task-statut" class="status-select" style="border-left:3px solid '+STATUS_COLOR['à faire']+';color:'+STATUS_COLOR['à faire']+';">' +
        STATUS_LIST.map(s=>'<option value="'+s+'">'+s+'</option>').join('') +
      '</select>' +
      '<button class="btn btn-primary" data-action="add-direct-task" data-pid="'+p.id+'" style="white-space:nowrap;">'+ICONS.plus+' Ajouter</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">' +
      '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:.82rem;color:var(--ink-soft);font-family:var(--font-body);text-transform:none;letter-spacing:0;" id="direct-prio-label">' +
        '<input type="checkbox" id="direct-task-priority" style="width:14px;height:14px;accent-color:#7A5800;" onchange="document.getElementById(\'direct-prio-date-wrap\').style.display=this.checked?\'flex\':\'none\'">' +
        '⭐ Marquer comme prioritaire' +
      '</label>' +
      '<div id="direct-prio-date-wrap" style="display:none;align-items:center;gap:8px;">' +
        '<span style="font-size:.82rem;color:var(--ink-soft);">Afficher à partir du :</span>' +
        '<label style="display:flex;align-items:center;gap:5px;font-size:.8rem;cursor:pointer;font-family:var(--font-body);text-transform:none;letter-spacing:0;color:var(--ink-soft);">' +
          '<input type="radio" name="direct-prio-when" value="now" checked style="accent-color:#7A5800;"> Maintenant' +
        '</label>' +
        '<label style="display:flex;align-items:center;gap:5px;font-size:.8rem;cursor:pointer;font-family:var(--font-body);text-transform:none;letter-spacing:0;color:var(--ink-soft);">' +
          '<input type="radio" name="direct-prio-when" value="later" style="accent-color:#7A5800;"> Date :' +
          '<input type="date" id="direct-prio-date" style="padding:4px 7px;border:1px solid var(--paper-line);border-radius:5px;font-family:inherit;font-size:.8rem;margin-left:4px;">' +
        '</label>' +
      '</div>' +
    '</div>' +
  '</div>';

  return bar + addForm +
    (tasks.length === 0
      ? '<p style="color:var(--ink-soft);font-size:.86rem;padding:8px 0;">Aucune tâche pour ce projet. Utilisez le formulaire ci-dessus pour en créer une.</p>'
      : '<table class="ledger">' +
          '<thead><tr>' +
            '<th class="'+pThClass('origine')+'" data-action="proj-sort-col" data-col="origine">Origine</th>' +
            '<th class="'+pThClass('tache')+'" data-action="proj-sort-col" data-col="tache">Tâche</th>' +
            '<th class="'+pThClass('responsable')+'" data-action="proj-sort-col" data-col="responsable">Responsable</th>' +
            '<th class="'+pThClass('echeance')+'" data-action="proj-sort-col" data-col="echeance">Échéance</th>' +
            '<th class="'+pThClass('statut')+'" data-action="proj-sort-col" data-col="statut">Statut</th>' +
            '<th class="no-print"></th>' +
          '</tr></thead>' +
          '<tbody>'+rows+'</tbody>' +
        '</table>'
    );
}

function renderSeancesTab(p){
  const seances = sortedSeances(p.id).slice().reverse();
  let seanceList;
  if(seances.length===0){
    seanceList = '<div class="empty-state small"><h3>Aucune séance enregistrée</h3>' +
      '<p>Ajoutez une première séance pour générer son procès-verbal et lister ses tâches.</p>' +
      '<button class="btn btn-primary" data-action="new-seance" data-id="'+p.id+'">' + ICONS.plus + ' Nouvelle séance</button></div>';
  } else {
    seanceList = '<div class="seance-grid">' + seances.map(s => {
      const idx = seanceIndexLabel(p.id, s.id);
      const taches = s.taches || [];
      const open = taches.filter(t=>t.statut!=='fait').length;
      const conclusions = (s.conclusions||[]).filter(c=>c && c.trim());
      const preview = conclusions.length ? escapeHtml(stripHtml(conclusions[0])) + (conclusions.length>1 ? '  ·  +' + (conclusions.length-1) + ' autre(s)' : '') : 'Aucune conclusion enregistrée.';
      return '<div class="seance-card" data-action="open-seance" data-pid="'+p.id+'" data-id="'+s.id+'">' +
        '<div class="seance-card-top">' +
          '<span class="seance-title">' + (s.title ? escapeHtml(s.title) : 'Séance n°' + idx) + '</span>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
            '<span class="seance-date">' + fmtDate(s.date) + '</span>' +
            '<div class="seance-card-actions no-print">' +
              '<button class="icon-btn" data-action="edit-seance" data-pid="'+p.id+'" data-id="'+s.id+'" title="Modifier">' + ICONS.edit + '</button>' +
              '<button class="icon-btn" data-action="delete-seance" data-pid="'+p.id+'" data-id="'+s.id+'" title="Supprimer" style="color:var(--stamp-red);opacity:.6;">' + ICONS.trash + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p class="seance-preview">' + preview + '</p>' +
        '<div class="seance-badges">' +
          '<span class="mini-badge">' + taches.length + ' tâche(s)</span>' +
          (open>0 ? '<span class="mini-badge">' + open + ' en cours/à faire</span>' : '<span class="mini-badge">tout terminé</span>') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }
  return '<div class="btn-row no-print"><button class="btn btn-primary" data-action="new-seance" data-id="'+p.id+'">' + ICONS.plus + ' Nouvelle séance</button></div>' + seanceList;
}

function renderPagesTab(p){
  const pages = getPages(p.id).slice().reverse();
  let pageList;
  if(pages.length===0){
    pageList = '<div class="empty-state small"><h3>Aucune page enregistrée</h3>' +
      '<p>Créez une page manuellement ou importez le contenu d’une page OneNote.</p></div>';
  } else {
    pageList = '<div class="seance-grid">' + pages.map(pg => {
      const taches = pg.taches || [];
      const open = taches.filter(t=>t.statut!=='fait').length;
      const snippet = stripHtml(pg.notes||'').slice(0,140);
      return '<div class="seance-card" data-action="open-page" data-pid="'+p.id+'" data-id="'+pg.id+'">' +
        '<div class="seance-card-top">' +
          '<span class="seance-title">' + escapeHtml(pg.title) + '</span>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
            '<span class="seance-date">' + (pg.source==='onenote' ? 'OneNote' : 'Page') + '</span>' +
            '<div class="seance-card-actions no-print">' +
              '<button class="icon-btn" data-action="edit-page" data-pid="'+p.id+'" data-id="'+pg.id+'" title="Modifier">' + ICONS.edit + '</button>' +
              '<button class="icon-btn" data-action="delete-page" data-pid="'+p.id+'" data-id="'+pg.id+'" title="Supprimer" style="color:var(--stamp-red);opacity:.6;">' + ICONS.trash + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p class="seance-preview">' + (snippet ? escapeHtml(snippet) + '…' : 'Page vide.') + '</p>' +
        '<div class="seance-badges">' +
          '<span class="mini-badge">' + taches.length + ' tâche(s)</span>' +
          (open>0 ? '<span class="mini-badge">' + open + ' en cours/à faire</span>' : (taches.length ? '<span class="mini-badge">tout terminé</span>' : '')) +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }
  return '<div class="btn-row no-print">' +
      '<button class="btn btn-primary" data-action="new-page" data-id="'+p.id+'">' + ICONS.plus + ' Nouvelle page</button>' +
      '<button class="btn" data-action="open-import-modal" data-id="'+p.id+'">' + ICONS.upload + ' Importer depuis OneNote</button>' +
    '</div>' + pageList;
}

