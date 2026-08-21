"use strict";

/* ============== HOME VIEW ============== */
function getPreparationReminders(){
  // Returns list of upcoming reminders: {event, row, reminderMonth, reminderYear}
  // A reminder is "due this month" if the current real month falls ANYWHERE
  // within the preparation window [event.startMonth - offsetMonths, event.startMonth - 1],
  // not only on its exact first month — mirrors the 'Prép.' band logic used
  // in the calendar grid (04-calendar.js/renderCalendar), so both views agree.
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const results = [];
  const cal = state.data.calendar;
  const events = cal.events.filter(e => e.reminder && e.reminder.active);

  events.forEach(ev => {
    const rem = ev.reminder;
    const offsetMonths = rem.unit === 'semaine' ? Math.ceil(rem.amount / 4.33) : Number(rem.amount)||1;
    const isRecurring = ev.recurring || rem.recurring;
    const remStart = ev.startMonth - offsetMonths;
    const remEnd = ev.startMonth - 1;

    const push = (evYear) => results.push({ event:ev, row: cal.rows.find(r=>r.id===ev.rowId),
      reminderMonth: currentMonth, reminderYear: year,
      eventMonth: ev.startMonth, eventYear: evYear, offsetMonths,
      unit: rem.unit, amount: rem.amount });

    // Occurrence anchored on ev.year (always checked), plus — for recurring
    // events — the occurrence anchored on the current real year (so a
    // recurring event keeps showing every year regardless of the year it
    // was first created in).
    const candidateYears = isRecurring ? [...new Set([ev.year, year])] : [ev.year];
    candidateYears.forEach(evYear => {
      if(evYear !== year) return; // only a window landing in the current real year matters here
      if(remStart >= 0){
        if(currentMonth >= remStart && currentMonth <= remEnd) push(evYear);
      } else if(remEnd >= 0){
        // Window starts in the previous year: only [0, remEnd] falls in evYear
        if(currentMonth >= 0 && currentMonth <= remEnd) push(evYear);
      }
    });

    // Recurring events only: the window may start in December of the
    // current real year and wrap into next year's occurrence (e.g. a
    // February event with 3 months' prep → window Nov-Jan).
    if(isRecurring && remStart < 0){
      const wrapStart = 12 + remStart;
      const wrapEnd = remEnd >= 0 ? 11 : 12 + remEnd;
      if(currentMonth >= wrapStart && currentMonth <= wrapEnd) push(year + 1);
    }
  });
  return results;
}

function renderHome(){
  const today = new Date();
  const days = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const greeting = 'Bonjour — ' + days[today.getDay()] + ' ' + today.getDate() + ' ' + MONTHS_FR[today.getMonth()] + ' ' + today.getFullYear();

  const topProjects = state.data.projects.filter(p=>!p.parentId);
  const allTasksCount = getAllTasks().filter(t=>!DONE_STATUSES.includes(t.statut)).length;
  const overdueCount = getAllTasks().filter(isOverdue).length;
  const prepReminders = getPreparationReminders();
  const qn = state.data.quickNotes || [];

  const priorityTasks = getPriorityTasks();

  // ---- Priority panel ----
  const priorityPanel = priorityTasks.length === 0 ? '' :
    '<div style="background:linear-gradient(135deg,#FFFBF0,#FFF8E6);border:1px solid #E8C850;border-radius:var(--radius);padding:16px 20px;margin-bottom:24px;box-shadow:var(--shadow-sm);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<span style="font-family:var(--font-mono);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:#7A5800;display:flex;align-items:center;gap:6px;">⭐ Tâches prioritaires ' +
          '<span style="background:#7A5800;color:#fff;border-radius:8px;padding:1px 7px;font-size:.64rem;">' + priorityTasks.length + '</span>' +
        '</span>' +
        '<button class="btn btn-ghost" style="font-size:.74rem;padding:4px 10px;border-color:#E8C850;" data-action="open-prioritaires-tab">Voir toutes →</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">' +
      priorityTasks.slice(0,9).map(t => {
        const overdue = isOverdue(t);
        return '<div style="background:rgba(255,255,255,.85);border:1px solid ' + (overdue ? '#E8C0B0' : '#E8D870') + ';border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:6px;">' +
          '<span style="font-size:.86rem;font-weight:500;color:var(--ink);">' + escapeHtml(t.description) + '</span>' +
          '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
            '<span style="font-family:var(--font-mono);font-size:.66rem;color:var(--ink-soft);">' + escapeHtml(t.projectPath) + '</span>' +
            (t.echeance ? '<span style="font-family:var(--font-mono);font-size:.66rem;color:' + (overdue ? 'var(--stamp-red)' : 'var(--ink-soft)') + ';">' + fmtDate(t.echeance) + (overdue ? ' ⚠' : '') + '</span>' : '') +
            '<span style="font-family:var(--font-mono);font-size:.62rem;padding:1px 6px;border-radius:8px;background:' + STATUS_COLOR[t.statut] + '22;color:' + STATUS_COLOR[t.statut] + ';">' + escapeHtml(t.statut) + '</span>' +
          '</div>' +
          '<div style="display:flex;gap:6px;margin-top:2px;">' +
            '<button class="btn btn-ghost" style="font-size:.74rem;padding:4px 9px;" data-action="open-edit-task" data-task-id="' + t.taskId + '" data-project-id="' + t.projectId + '" data-origin="' + t.origin + '" data-seance-id="' + (t.seanceId||'') + '" data-page-id="' + (t.pageId||'') + '">✏ Modifier</button>' +
            '<button class="btn btn-ghost" style="font-size:.74rem;padding:4px 9px;color:var(--sage);" data-action="prio-mark-done" data-task-id="' + t.taskId + '" data-project-id="' + t.projectId + '">✓ Traiter</button>' +
            '<button class="btn btn-ghost" style="font-size:.74rem;padding:4px 9px;color:var(--ink-soft);" data-action="toggle-priority" data-task-id="' + t.taskId + '" data-project-id="' + t.projectId + '" data-origin="' + t.origin + '" data-seance-id="' + (t.seanceId||'') + '" data-page-id="' + (t.pageId||'') + '">⭐ Déprioritiser</button>' +
          '</div>' +
        '</div>';
      }).join('') +
      '</div>' +
      (priorityTasks.length > 9 ? '<p style="font-family:var(--font-mono);font-size:.68rem;color:#7A5800;margin:10px 0 0;text-align:right;">+ ' + (priorityTasks.length - 9) + ' autre(s) <button class=\"btn btn-ghost\" style=\"font-size:.68rem;padding:2px 6px;\" data-action=\"open-dashboard\">voir tout</button></p>' : '') +
    '</div>';

  // ---- Project bricks ----
  let bricksHtml = '';
  if(topProjects.length===0){
    bricksHtml = '<div class="empty-state" style="margin-bottom:28px;"><h3>Aucun projet</h3><p>Créez votre premier projet pour commencer.</p>' +
      '<button class="btn btn-primary" data-action="open-new-project">' + ICONS.plus + ' Créer un projet</button></div>';
  } else {
    bricksHtml = '<div class="home-grid">' +
      topProjects.map(p => {
        const children = getChildren(p.id);
        const allProjT = getProjectTasks(p.id, true);
        const openT = allProjT.filter(t=>!DONE_STATUSES.includes(t.statut)).length;
        const overdueT = allProjT.filter(isOverdue).length;
        const priorityT = allProjT.filter(t=>t.priority && !DONE_STATUSES.includes(t.statut)).length;
        const vigs = p.vigilances||[];
        const hasVig = vigs.length > 0;
        const anyChildVig = children.some(c=>(c.vigilances||[]).length>0);
        return '<div class="proj-brick" data-action="open-project" data-id="'+p.id+'">' +
          '<div class="proj-brick-header" style="background:'+p.color+'"></div>' +
          '<div class="proj-brick-body">' +
            '<p class="proj-brick-name">'+escapeHtml(p.name)+'</p>' +
            '<p class="proj-brick-desc">'+(p.contacts?escapeHtml(stripHtml(p.contacts)):p.description?escapeHtml(stripHtml(p.description)):'—')+'</p>' +
            (allProjT.length>0?('<div class="proj-brick-progress"><div class="proj-brick-progress-bar" style="width:'+Math.round((allProjT.filter(t=>DONE_STATUSES.includes(t.statut)).length/allProjT.length)*100)+'%"></div></div>'):'') +
            '<div class="proj-brick-stats">' +
              (openT>0?'<span class="proj-brick-stat open">'+openT+' tâche'+(openT>1?'s':'')+' ouverte'+(openT>1?'s':'')+'</span>':'<span class="proj-brick-stat">0 tâche ouverte</span>') +
              (overdueT>0?'<span class="proj-brick-stat overdue">'+overdueT+' en retard</span>':'') +
              (priorityT>0?'<span class="proj-brick-stat" style="background:#FFF8E6;color:#7A5800;border:1px solid #E8D870;">⭐ '+priorityT+' prioritaire'+(priorityT>1?'s':'')+'</span>':'') +
              (children.length>0?'<span class="proj-brick-stat">'+children.length+' axe'+(children.length>1?'s':'')+'</span>':'') +
            '</div>' +
            '<div class="proj-brick-footer">' +
              '<span class="proj-brick-vig '+(hasVig||anyChildVig?'warn':'ok')+'">' +
                (hasVig||anyChildVig?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Vigilance':'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>OK') +
              '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }
  // Quick notes
  const notes = (qn).slice().reverse(); // most recent first
  const notesHtml = '<div class="quick-notes">' +
    '<div class="quick-notes-header">' +
      '<span class="quick-notes-title">Notes &amp; à pister</span>' +
      (qn.filter(n=>n.done).length>0 ? '<button class="btn btn-ghost" style="font-size:.74rem;padding:3px 8px;" data-action="clear-done-notes">Supprimer terminées</button>' : '') +
    '</div>' +
    '<div class="quick-note-add">' +
      '<input type="text" id="qn-input" placeholder="Pister… noter… rappeler…" value="'+escapeHtml(state.homeNoteInput||'')+'">' +
      '<button class="btn btn-primary" style="padding:8px 14px;" data-action="add-quick-note">'+ICONS.plus+'</button>' +
    '</div>' +
    (notes.length===0
      ? '<p class="quick-notes-empty">Aucune note pour l\u2019instant.</p>'
      : '<div class="quick-notes-list">' +
          notes.map(n =>
            '<div class="quick-note-item'+(n.done?' done':'')+'">' +
              '<input type="checkbox" class="quick-note-check" data-action="toggle-quick-note" data-id="'+n.id+'"'+(n.done?' checked':'')+' title="Marquer comme fait">' +
              '<span class="quick-note-text">'+escapeHtml(n.text)+'</span>' +
              '<span class="quick-note-date">'+fmtDate(n.createdAt)+'</span>' +
              '<button class="quick-note-del" data-action="delete-quick-note" data-id="'+n.id+'" title="Supprimer">✕</button>' +
            '</div>'
          ).join('') +
        '</div>'
    ) +
  '</div>';

  const statsBar = '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">' +
    '<div style="background:var(--card);border:1px solid var(--paper-line);border-radius:8px;padding:12px 16px;display:flex;gap:10px;align-items:center;box-shadow:var(--shadow-sm);">' +
      '<span style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--navy);">'+topProjects.length+'</span>' +
      '<span style="font-family:var(--font-mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-soft);">Projet'+(topProjects.length>1?'s':'')+'</span>' +
    '</div>' +
    '<div style="background:var(--card);border:1px solid var(--paper-line);border-radius:8px;padding:12px 16px;display:flex;gap:10px;align-items:center;box-shadow:var(--shadow-sm);cursor:pointer;" data-action="db-tab-taches-home">' +
      '<span style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--navy);">'+allTasksCount+'</span>' +
      '<span style="font-family:var(--font-mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-soft);">Tâche'+(allTasksCount>1?'s':'')+' ouverte'+(allTasksCount>1?'s':'')+'</span>' +
    '</div>' +
    (overdueCount>0 ?
    '<div style="background:#FDEAEA;border:1px solid #E8BABA;border-radius:8px;padding:12px 16px;display:flex;gap:10px;align-items:center;box-shadow:var(--shadow-sm);cursor:pointer;" data-action="db-overdue-home">' +
      '<span style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--stamp-red);">'+overdueCount+'</span>' +
      '<span style="font-family:var(--font-mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;color:var(--stamp-red);">En retard</span>' +
    '</div>' : '') +
    /* ---- Preparation card ---- */
    '<div style="background:'+(prepReminders.length>0?'#FFF8EC':'var(--card)')+';border:1px solid '+(prepReminders.length>0?'#EECF80':'var(--paper-line)')+';border-radius:8px;padding:12px 16px;display:flex;gap:10px;align-items:center;box-shadow:var(--shadow-sm);min-width:160px;">' +
      '<span style="font-size:1.2rem;">🔔</span>' +
      '<div>' +
        '<div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:'+(prepReminders.length>0?'var(--seal-gold)':'var(--ink-soft)')+';line-height:1;">' +
          (prepReminders.length>0 ? prepReminders.length+' à préparer' : '—') +
        '</div>' +
        '<div style="font-family:var(--font-mono);font-size:.64rem;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-soft);">Préparation du mois</div>' +
      '</div>' +
    '</div>' +
    /* ---- Priority tasks card (always visible, clickable) ---- */
    '<div style="background:'+(priorityTasks.length>0?'#FFFBF0':'var(--card)')+';border:1px solid '+(priorityTasks.length>0?'#E8D870':'var(--paper-line)')+';border-radius:8px;padding:12px 16px;display:flex;gap:10px;align-items:center;box-shadow:var(--shadow-sm);min-width:160px;cursor:pointer;" data-action="open-prioritaires-tab">' +
      '<span style="font-size:1.2rem;">⭐</span>' +
      '<div>' +
        '<div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:'+(priorityTasks.length>0?'#7A5800':'var(--ink-soft)')+';line-height:1;">' +
          (priorityTasks.length>0 ? priorityTasks.length+' prioritaire'+(priorityTasks.length>1?'s':'') : '—') +
        '</div>' +
        '<div style="font-family:var(--font-mono);font-size:.64rem;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-soft);">Tâches prioritaires</div>' +
      '</div>' +
  '</div>' +
  '</div>' +
  /* ---- Preparation detail panel (if any) ---- */
  (prepReminders.length>0 ?
    '<div style="background:#FFF8EC;border:1px solid #EECF80;border-radius:var(--radius);padding:14px 18px;margin-bottom:20px;box-shadow:var(--shadow-sm);">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
        '<span style="font-size:1rem;">🔔</span>' +
        '<span style="font-family:var(--font-mono);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--seal-gold);font-weight:600;">Préparation projets du mois</span>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;">' +
        prepReminders.map(r => {
          const rowLabel = r.row ? r.row.label : 'Activité inconnue';
          const evMonth = CAL_MONTHS_SHORT[r.event.startMonth];
          const unitPlural = r.unit==='mois' ? 'mois' : (r.unit + (r.amount>1?'s':''));
          const before = r.amount + ' ' + unitPlural + ' avant';
          return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,.7);border-radius:7px;border:1px solid #EED880;">' +
            '<span style="font-size:.85rem;">📋</span>' +
            '<div style="flex:1;">' +
              '<div style="font-weight:600;font-size:.86rem;color:var(--ink);">'+escapeHtml(r.event.text||rowLabel)+'</div>' +
              '<div style="font-family:var(--font-mono);font-size:.68rem;color:var(--ink-soft);">'+escapeHtml(rowLabel)+' · Prévu en '+evMonth+' · Rappel '+before+(r.event.recurring||r.event.reminder.recurring?' · ↻ annuel':'')+'</div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>'
  : '');



  return '<p class="eyebrow">Vue d\'ensemble</p>' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
      '<h1 class="page-title" style="margin:0;">Accueil</h1>' +
      '<span style="font-family:var(--font-mono);font-size:.74rem;color:var(--ink-soft);">'+greeting+'</span>' +
    '</div>' +
    '<p class="page-sub">Vos projets en un coup d\'œil.</p>' +
    statsBar +
    priorityPanel +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin-bottom:32px;">' +
      '<div>' +
        '<p class="home-section-title">Projets</p>' +
        bricksHtml +
      '</div>' +
      '<div>' +
        '<p class="home-section-title">Notes rapides</p>' +
        notesHtml +
      '</div>' +
    '</div>' +
    '<div style="border-top:2px solid var(--paper-line);padding-top:24px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
        '<p class="home-section-title" style="margin:0;">Calendrier annuel</p>' +
        '<span style="font-family:var(--font-mono);font-size:.68rem;color:var(--ink-soft);">Cliquez sur une cellule pour ajouter · <strong>↻</strong> = rappel annuel automatique · Cliquez sur un intitulé de ligne pour le modifier</span>' +
      '</div>' +
      renderCalendar(false) +
    '</div>';
}


