"use strict";

/* ============== SEANCE EDIT FORM ============== */
function renderSeanceEditForm(){
  const p = getProject(state.currentProjectId);
  if(!p){ state.view='dashboard'; return renderDashboard(); }
  const d = state.draftSeance;
  const isNew = !state.currentSeanceId;

  const conclusionsRows = d.conclusions.map((c, i) =>
    '<div class="dyn-row" style="align-items:flex-start;gap:8px;">' +
      '<div style="flex:1;">' + rteHtml('s-conclusion-'+i, c, 'Conclusion '+(i+1)+'…') + '</div>' +
      '<button class="icon-btn" data-action="remove-conclusion" data-idx="'+i+'" title="Supprimer" style="margin-top:8px;">' + ICONS.trash + '</button>' +
    '</div>'
  ).join('');

  const taskRows = d.taches.map((t, i) => taskRowHtml(t, i)).join('');

  return '<button class="btn btn-ghost" data-action="cancel-seance-edit">' + ICONS.back + ' Annuler</button>' +
    '<p class="eyebrow" style="margin-top:18px;">' + escapeHtml(p.name) + '</p>' +
    '<h1 class="page-title">' + (isNew ? 'Nouvelle séance' : 'Modifier la séance') + '</h1>' +
    '<p class="page-sub">Renseignez la séance : le procès-verbal sera généré automatiquement.</p>' +

    '<div class="form-card">' +
      '<div class="form-row"><label>Titre de la séance (optionnel)</label><input type="text" id="f-title" value="'+escapeHtml(d.title||'')+'" placeholder="Ex : Coordination mensuelle, Revue technique, Comité pilotage…"></div>' +
      '<div class="form-grid2">' +
        '<div class="form-row"><label>Date de la séance</label><input type="date" id="f-date" value="'+escapeHtml(d.date)+'"></div>' +
        '<div class="form-row"><label>Participants (séparés par une virgule)</label><input type="text" id="f-participants" value="'+escapeHtml(state.draftParticipants)+'" placeholder="Ex : Marie Dubois, Karim Haddad"></div>' +
      '</div>' +
      '<div class="form-row"><label>Points abordés / notes (facultatif)</label>' + rteHtml('f-notes', d.notes||'', 'Contexte, points discutés, remarques…') + '</div>' +

      '<div class="section-label">Conclusions</div>' +
      '<div class="dyn-list" id="conclusions-list">' + conclusionsRows + '</div>' +
      '<button class="add-link" data-action="add-conclusion">' + ICONS.plus + ' Ajouter une conclusion</button>' +

      '<div class="section-label">Tâches à faire</div>' +
      '<div class="dyn-list" id="tasks-list">' + taskRows + '</div>' +
      '<button class="add-link" data-action="add-task">' + ICONS.plus + ' Ajouter une tâche</button>' +

      '<div class="form-actions">' +
        '<button class="btn btn-primary" data-action="save-seance">Enregistrer et générer le PV</button>' +
        '<button class="btn btn-ghost" data-action="cancel-seance-edit">Annuler</button>' +
      '</div>' +
    '</div>';
}

/* ============== SEANCE VIEW (GENERATED PV) ============== */
function renderSeanceView(){
  const p = getProject(state.currentProjectId);
  if(!p){ state.view='dashboard'; return renderDashboard(); }
  const s = getSeances(p.id).find(x => x.id === state.currentSeanceId);
  if(!s){ state.view='project'; return renderProjectView(); }
  const idx = seanceIndexLabel(p.id, s.id);
  const conclusions = (s.conclusions||[]).filter(c=>c && c.trim());
  const taches = s.taches||[];
  const participants = s.participants && s.participants.length ? s.participants.join(', ') : '—';

  const sortedTachesSeance = [...taches].sort((a,b)=>{
    const aDone=DONE_STATUSES.includes(a.statut)?1:0, bDone=DONE_STATUSES.includes(b.statut)?1:0;
    if(aDone!==bDone) return aDone-bDone;
    return (a.echeance||'9999').localeCompare(b.echeance||'9999');
  });
  const tasksHtml = taches.length===0
    ? '<p class="pv-notes">Aucune tâche associée à cette séance.</p>'
    : '<table class="pv-tasks-table"><thead><tr><th>Tâche</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>' +
        sortedTachesSeance.map((t, idx) => {
          const overdue = isOverdue(t);
          const isDone = DONE_STATUSES.includes(t.statut);
          const prevDone = idx>0 && DONE_STATUSES.includes(sortedTachesSeance[idx-1].statut);
          const sep = (isDone && !prevDone && idx>0)
            ? '<tr><td colspan="4" style="padding:0;"><div style="padding:5px 8px;background:#F6F9FD;border-top:2px solid var(--paper-line);font-family:var(--font-mono);font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);">✓ Terminées</div></td></tr>'
            : '';
          return sep + '<tr style="'+(isDone?'opacity:.6;':'')+'"><td>'+(isDone?'<s style="color:var(--ink-soft)">':'')+escapeHtml(t.description)+(isDone?'</s>':'')+'</td>' +
            '<td>'+(t.responsable?escapeHtml(t.responsable):'—')+'</td>' +
            '<td>'+fmtDate(t.echeance)+(overdue?'<span class="overdue-flag">RETARD</span>':'')+'</td>' +
            '<td><span class="status-dot"><span class="dot" style="background:'+STATUS_COLOR[t.statut]+'"></span>'+escapeHtml(t.statut)+'</span></td></tr>';
        }).join('') +
      '</tbody></table>';

  return '<button class="btn btn-ghost no-print" data-action="back-to-seances" data-id="'+p.id+'">' + ICONS.back + ' ' + escapeHtml(p.name) + '</button>' +
    '<div class="pv-wrap" style="margin-top:18px;">' +
      '<div class="pv-document">' +
        '<div class="pv-stamp">DOSSIER ' + projectRef(p.id) + '<br>PV N°' + idx + '</div>' +
        '<p class="pv-doctitle">Procès-verbal de séance</p>' +
        '<h1 class="pv-title">' + escapeHtml(p.name) + ' — ' + (s.title ? escapeHtml(s.title) : 'Séance n°' + idx) + '</h1>' +
        '<dl class="pv-meta-grid">' +
          '<dt>Date</dt><dd>' + fmtDate(s.date) + '</dd>' +
          '<dt>Participants</dt><dd>' + escapeHtml(participants) + '</dd>' +
        '</dl>' +
        (s.notes ? '<hr class="pv-divider"><p class="pv-section-title">Points abordés</p><p class="pv-notes">'+fmtText(s.notes)+'</p>' : '') +
        '<hr class="pv-divider">' +
        '<p class="pv-section-title">Conclusions</p>' +
        (conclusions.length ? '<div class="pv-conclusions">' + conclusions.map(c=>'<div class="pv-c">'+fmtText(c)+'</div>').join('') + '</ol>' : '<p class="pv-notes">Aucune conclusion enregistrée.</p>') +
        '<hr class="pv-divider">' +
        '<p class="pv-section-title">Tâches à réaliser</p>' +
        tasksHtml +
        '<div class="pv-actions no-print">' +
          '<button class="btn" data-action="edit-seance" data-pid="'+p.id+'" data-id="'+s.id+'">' + ICONS.edit + ' Modifier</button>' +
          '<button class="btn" data-action="print-pv">' + ICONS.printer + ' Imprimer / PDF</button>' +
          '<button class="btn btn-danger" data-action="delete-seance" data-pid="'+p.id+'" data-id="'+s.id+'">' + ICONS.trash + ' Supprimer</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

/* ============== PAGE EDIT FORM ============== */
function renderPageEditForm(){
  const p = getProject(state.currentProjectId);
  if(!p){ state.view='dashboard'; return renderDashboard(); }
  const d = state.draftPage;
  const isNew = !state.currentPageId;
  const taskRows = d.taches.map((t,i)=>taskRowHtml(t,i)).join('');

  return '<button class="btn btn-ghost" data-action="cancel-page-edit">' + ICONS.back + ' Annuler</button>' +
    '<p class="eyebrow" style="margin-top:18px;">' + escapeHtml(p.name) + '</p>' +
    '<h1 class="page-title">' + (isNew ? 'Nouvelle page' : 'Modifier la page') + '</h1>' +
    '<p class="page-sub">Une page libre pour vos notes, avec ses propres tâches.</p>' +

    '<div class="form-card">' +
      '<div class="form-row"><label>Titre de la page</label><input type="text" id="pg-title" value="'+escapeHtml(d.title)+'" placeholder="Ex : Notes de cadrage"></div>' +
      '<div class="form-row"><label>Contenu</label>' + rteHtml('pg-notes', d.notes||'', 'Vos notes…') + '</div>' +

      '<div class="section-label">Tâches</div>' +
      '<div class="dyn-list" id="tasks-list">' + taskRows + '</div>' +
      '<button class="add-link" data-action="add-task">' + ICONS.plus + ' Ajouter une tâche</button>' +

      '<div class="form-actions">' +
        '<button class="btn btn-primary" data-action="save-page">Enregistrer</button>' +
        '<button class="btn btn-ghost" data-action="cancel-page-edit">Annuler</button>' +
      '</div>' +
    '</div>';
}

/* ============== PAGE VIEW ============== */
function renderPageView(){
  const p = getProject(state.currentProjectId);
  if(!p){ state.view='dashboard'; return renderDashboard(); }
  const pg = getPages(p.id).find(x => x.id === state.currentPageId);
  if(!pg){ state.view='project'; return renderProjectView(); }
  const taches = pg.taches||[];

  const sortedTachesPage = [...taches].sort((a,b)=>{
    const aDone=DONE_STATUSES.includes(a.statut)?1:0, bDone=DONE_STATUSES.includes(b.statut)?1:0;
    if(aDone!==bDone) return aDone-bDone;
    return (a.echeance||'9999').localeCompare(b.echeance||'9999');
  });
  const tasksHtml = taches.length===0
    ? '<p class="pv-notes">Aucune tâche associée à cette page.</p>'
    : '<table class="pv-tasks-table"><thead><tr><th>Tâche</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>' +
        sortedTachesPage.map((t, idx) => {
          const overdue = isOverdue(t);
          const isDone = DONE_STATUSES.includes(t.statut);
          const prevDone = idx>0 && DONE_STATUSES.includes(sortedTachesPage[idx-1].statut);
          const sep = (isDone && !prevDone && idx>0)
            ? '<tr><td colspan="4" style="padding:0;"><div style="padding:5px 8px;background:#F6F9FD;border-top:2px solid var(--paper-line);font-family:var(--font-mono);font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);">✓ Terminées</div></td></tr>'
            : '';
          return sep + '<tr style="'+(isDone?'opacity:.6;':'')+'"><td>'+(isDone?'<s style="color:var(--ink-soft)">':'')+escapeHtml(t.description)+(isDone?'</s>':'')+'</td>' +
            '<td>'+(t.responsable?escapeHtml(t.responsable):'—')+'</td>' +
            '<td>'+fmtDate(t.echeance)+(overdue?'<span class="overdue-flag">RETARD</span>':'')+'</td>' +
            '<td><span class="status-dot"><span class="dot" style="background:'+STATUS_COLOR[t.statut]+'"></span>'+escapeHtml(t.statut)+'</span></td></tr>';
        }).join('') +
      '</tbody></table>';

  return '<button class="btn btn-ghost no-print" data-action="back-to-pages" data-id="'+p.id+'">' + ICONS.back + ' ' + escapeHtml(p.name) + '</button>' +
    '<div class="pv-wrap" style="margin-top:18px;">' +
      '<div class="pv-document">' +
        '<div class="page-source-badge">' + (pg.source==='onenote' ? 'Importé de OneNote' : 'Page manuelle') + '</div>' +
        '<p class="pv-doctitle">Page · ' + fmtDate(pg.createdAt) + '</p>' +
        '<h1 class="pv-title">' + escapeHtml(pg.title) + '</h1>' +
        '<hr class="pv-divider">' +
        '<p class="pv-section-title">Contenu</p>' +
        '<p class="pv-notes">' + (pg.notes && pg.notes.trim() ? fmtText(pg.notes) : 'Page vide.') + '</p>' +
        '<hr class="pv-divider">' +
        '<p class="pv-section-title">Tâches</p>' +
        tasksHtml +
        '<div class="pv-actions no-print">' +
          '<button class="btn" data-action="edit-page" data-pid="'+p.id+'" data-id="'+pg.id+'">' + ICONS.edit + ' Modifier</button>' +
          '<button class="btn" data-action="print-pv">' + ICONS.printer + ' Imprimer / PDF</button>' +
          '<button class="btn btn-danger" data-action="delete-page" data-pid="'+p.id+'" data-id="'+pg.id+'">' + ICONS.trash + ' Supprimer</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

