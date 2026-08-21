"use strict";

/* ============== WEEKLY EXPORT REMINDER ============== */
const REMINDER_KEY = 'tracker-last-export';
const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function stampExportTime(){
  try { localStorage.setItem(REMINDER_KEY, Date.now().toString()); } catch(e){}
}

async function checkWeeklyReminder(){
  try {
    const last = parseInt(localStorage.getItem(REMINDER_KEY)||'0', 10);
    if(!last || (Date.now() - last) > REMINDER_INTERVAL_MS){
      state.banner = 'Rappel : pensez à exporter vos données (JSON) pour en garder une copie de sauvegarde.';
      state.bannerType = 'warning';
      render();
    }
  } catch(e){}
}

/* ============== EVOLVING PV ============== */
function getEPV(pid){ return (state.data.evolvingPV[pid] && state.data.evolvingPV[pid].entries) || []; }

function renderEvolvingPV(p){
  const pid = p.id;
  const entries = getEPV(pid);
  const viewId = state.evolvingEntryId; // null = latest (edit), else history view
  const latest = entries.length > 0 ? entries[entries.length-1] : null;
  const history = entries.length > 1 ? entries.slice(0, -1).reverse() : [];
  const viewing = viewId ? entries.find(e=>e.id===viewId) : null;

  // ---- Sidebar history ----
  const sidebarHtml =
    '<div class="epv-sidebar">' +
      '<p class="epv-sidebar-title">Historique</p>' +
      (entries.length === 0 ? '<p style="font-size:.76rem;color:var(--ink-soft);">Aucune entrée encore.</p>' : '') +
      (!viewId && latest ?
        '<div class="epv-history-item active">' +
          '<div class="epv-history-date">✎ En cours</div>' +
          '<div class="epv-history-meta">' + fmtDate(latest.date) + '</div>' +
        '</div>' : '') +
      (latest && viewId===null ? '' : '') +
      history.map(e =>
        '<div class="epv-history-item'+(viewId===e.id?' active':'')+'" data-action="epv-view-entry" data-id="'+e.id+'" data-pid="'+pid+'">' +
          '<div class="epv-history-date">'+fmtDate(e.date)+'</div>' +
          '<div class="epv-history-meta">'+(e.participants&&e.participants.length?e.participants.slice(0,2).join(', ')+(e.participants.length>2?' +'+( e.participants.length-2):''):'')+'</div>' +
          '<div class="epv-history-meta">'+(e.conclusions&&e.conclusions.length?e.conclusions.length+' conclusion(s)':'—')+'</div>' +
        '</div>'
      ).join('') +
      (viewId ?
        '<div class="epv-history-item" data-action="epv-view-latest" data-pid="'+pid+'" style="margin-top:8px;border:1px dashed var(--navy);color:var(--navy);font-size:.76rem;text-align:center;">' +
          '← Retour à l\'entrée en cours' +
        '</div>' : '') +
      '<div style="margin-top:12px;border-top:1px solid var(--paper-line);padding-top:10px;">' +
        '<button class="btn btn-primary" style="width:100%;font-size:.76rem;" data-action="epv-new-entry" data-pid="'+pid+'">+ Nouvelle entrée</button>' +
        (entries.length>0 ? '<button class="btn btn-ghost" style="width:100%;font-size:.74rem;margin-top:4px;" data-action="epv-export" data-pid="'+pid+'">⬇ Exporter tout</button>' : '') +
      '</div>' +
    '</div>';

  // ---- Read-only historical view ----
  if(viewing){
    const tachesDone = (viewing.taches||[]).filter(t=>DONE_STATUSES.includes(t.statut));
    const tachesOpen = (viewing.taches||[]).filter(t=>!DONE_STATUSES.includes(t.statut));
    return '<div class="epv-layout">' +
      '<div class="epv-main">' +
        '<div class="epv-read-banner">' +
          '<span>📋 Version archivée — ' + fmtDate(viewing.date) + '</span>' +
          '<button class="btn btn-ghost" style="font-size:.76rem;padding:3px 8px;" data-action="epv-view-latest" data-pid="'+pid+'">← Retour</button>' +
        '</div>' +
        '<div class="epv-card">' +
          '<dl class="pv-meta-grid">' +
            '<dt>Date</dt><dd>'+fmtDate(viewing.date)+'</dd>' +
            '<dt>Participants</dt><dd>'+(viewing.participants&&viewing.participants.length ? escapeHtml(viewing.participants.join(', ')) : '—')+'</dd>' +
          '</dl>' +
          (viewing.notes ? '<hr class="pv-divider"><p class="epv-section-title">Notes</p><p class="pv-notes">'+escapeHtml(viewing.notes)+'</p>' : '') +
          '<hr class="pv-divider"><p class="epv-section-title">Conclusions</p>' +
          ((viewing.conclusions||[]).filter(c=>c&&c.trim()).length ?
            '<div class="pv-conclusions">' + viewing.conclusions.filter(c=>c&&c.trim()).map(c=>'<div class="pv-c">'+fmtText(c)+'</div>').join('') + '</ol>' :
            '<p class="pv-notes" style="color:var(--ink-soft);">Aucune conclusion.</p>') +
          '<hr class="pv-divider"><p class="epv-section-title">Tâches</p>' +
          '<table class="pv-tasks-table"><thead><tr><th>Tâche</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>' +
          [...tachesOpen, ...tachesDone].map(t=>'<tr style="'+(DONE_STATUSES.includes(t.statut)?'opacity:.6;':'')+'"><td>'+escapeHtml(t.description)+'</td><td>'+(t.responsable||'—')+'</td><td>'+fmtDate(t.echeance)+'</td><td>'+escapeHtml(t.statut)+'</td></tr>').join('') +
          '</tbody></table>' +
        '</div>' +
      '</div>' +
      sidebarHtml +
    '</div>';
  }

  // ---- Edit mode (latest or new) ----
  // Use draft if available (preserves unsaved notes/conclusions during re-renders)
  const entry = (state.evolvingEditMode && state._epvDraft) ? state._epvDraft
    : latest || { id:'', date:todayStr(), participants:[], notes:'', conclusions:[''], taches:[] };
  const carried = latest ? (latest.taches||[]).filter(t=>!DONE_STATUSES.includes(t.statut)) : [];
  const editMode = state.evolvingEditMode;
  const hasEntries = entries.length > 0;

  // ---- VIEW mode (saved) — same style as archived entries ----
  if(hasEntries && !editMode){
    const tachesOpen2 = (latest.taches||[]).filter(t=>!DONE_STATUSES.includes(t.statut));
    const tachesDone2 = (latest.taches||[]).filter(t=>DONE_STATUSES.includes(t.statut));
    const allTaches2  = [...tachesOpen2, ...tachesDone2];
    const conclusions2 = (latest.conclusions||[]).filter(c=>c&&c.trim());
    return '<div class="epv-layout">' +
      '<div class="epv-main">' +
        /* Thin green indicator strip + Modifier button above the card */
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<span style="display:flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:.64rem;letter-spacing:.1em;text-transform:uppercase;color:var(--sage);">✓ Entrée en cours · ' + fmtDate(latest.date) + '</span>' +
          '<button class="btn" style="font-size:.76rem;padding:5px 12px;" data-action="epv-enter-edit">✎ Modifier</button>' +
        '</div>' +
        /* Single unified card — identical to archived view */
        '<div class="pv-document" style="max-width:100%;">' +
          '<dl class="pv-meta-grid">' +
            '<dt>Date</dt><dd>' + fmtDate(latest.date) + '</dd>' +
            '<dt>Participants</dt><dd>' + (latest.participants&&latest.participants.length ? escapeHtml(latest.participants.join(', ')) : '—') + '</dd>' +
          '</dl>' +
          (latest.notes ?
            '<hr class="pv-divider"><p class="pv-section-title">Notes</p>' +
            '<div class="pv-notes proj-rich-text">' + fmtText(latest.notes) + '</div>' : '') +
          (conclusions2.length ?
            '<hr class="pv-divider"><p class="pv-section-title">Conclusions</p>' +
            '<div class="pv-conclusions">' + conclusions2.map(c=>'<li>' + fmtText(c) + '</li>').join('') + '</ol>' : '') +
          (allTaches2.length ?
            '<hr class="pv-divider"><p class="pv-section-title">Tâches</p>' +
            '<table class="pv-tasks-table"><thead><tr><th>Tâche</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>' +
            allTaches2.map(t =>
              '<tr style="' + (DONE_STATUSES.includes(t.statut)?'opacity:.6;':'') + '">' +
                '<td>' + fmtText(t.description||'') + '</td>' +
                '<td>' + (t.responsable||'—') + '</td>' +
                '<td>' + (fmtDate(t.echeance||'')||'—') + '</td>' +
                '<td><span class="status-dot"><span class="dot" style="background:'+STATUS_COLOR[t.statut]+'"></span>' + escapeHtml(t.statut) + '</span></td>' +
              '</tr>'
            ).join('') +
            '</tbody></table>' : '') +
        '</div>' +
      '</div>' +
      sidebarHtml +
    '</div>';
  }

  // ---- EDIT mode ----
  const conclusionsHtml = (entry.conclusions && entry.conclusions.length ? entry.conclusions : ['']).map((c,i)=>
    '<div class="dyn-row epv-conclusion-row">' +
      '<div style="flex:1;">' + rteHtml('epv-conclusion-'+i, c, 'Conclusion '+(i+1)+'…') + '</div>' +
      '<button type="button" class="icon-btn" data-action="epv-del-conclusion" data-idx="'+i+'" style="align-self:flex-start;margin-top:8px;">'+ICONS.trash+'</button>' +
    '</div>'
  ).join('');

  const tachesHtml = (entry.taches||[]).length===0 && carried.length===0
    ? '<p style="color:var(--ink-soft);font-size:.82rem;padding:8px 0;">Aucune tâche. Cliquez sur « + Ajouter » pour en créer.</p>'
    : (entry.taches||[]).map((t,i)=>{
        return '<div class="epv-task-row'+((!t._new)&&hasEntries?' carried':'')+'" style="padding:10px 12px;gap:10px;">' +
          '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;flex:1;">' +
            '<input type="text" class="epv-task-desc" data-idx="'+i+'" value="'+escapeHtml(t.description||'')+'" placeholder="Description de la tâche…" style="padding:8px 10px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.86rem;">' +
            '<input type="text" class="epv-task-resp" data-idx="'+i+'" value="'+escapeHtml(t.responsable||'')+'" placeholder="Responsable" style="padding:8px 10px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.84rem;width:110px;">' +
            '<input type="date" class="epv-task-date" data-idx="'+i+'" value="'+escapeHtml(t.echeance||'')+'" style="padding:7px 8px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.82rem;">' +
            '<button type="button" title="Pas déchéance" data-action="clear-prev-date" style="padding:5px 8px;border-radius:6px;border:1px solid var(--paper-line);background:none;font-size:.72rem;color:var(--ink-soft);cursor:pointer;white-space:nowrap;">∅</button>' +
            '<select class="status-select epv-task-statut" data-idx="'+i+'" style="border-left:3px solid '+STATUS_COLOR[t.statut]+';color:'+STATUS_COLOR[t.statut]+';">' +
              STATUS_LIST.map(s=>'<option value="'+s+'"'+(t.statut===s?' selected':'')+'>'+s+'</option>').join('') +
            '</select>' +
          '</div>' +
          (!t._new && hasEntries ? '<span class="epv-carried-badge" style="align-self:center;">↻ reportée</span>' : '') +
          '<button type="button" class="icon-btn" data-action="epv-del-task" data-idx="'+i+'" style="align-self:center;">'+ICONS.trash+'</button>' +
        '</div>';
      }).join('');

  return '<div class="epv-layout">' +
    '<div class="epv-main">' +
      (!hasEntries ? '<div style="background:var(--blush);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:.82rem;color:var(--ink-soft);">💡 Première entrée du suivi continu. Cliquez sur <strong>+ Nouvelle entrée</strong> les prochaines fois pour repartir de la précédente.</div>' : '') +
      '<div class="epv-card">' +
        '<div class="form-grid2" style="margin-bottom:14px;">' +
          '<div class="form-row"><label>Date</label><input type="date" id="epv-date" value="'+entry.date+'"></div>' +
          '<div class="form-row"><label>Participants</label><input type="text" id="epv-participants" value="'+escapeHtml((entry.participants||[]).join(', '))+'" placeholder="JA, NB, DF…"></div>' +
        '</div>' +
        '<div class="form-row"><label>Notes de séance</label>' + rteHtml('epv-notes', entry.notes||'', 'Points abordés, échanges, décisions…') + '</div>' +
      '</div>' +
      '<div class="epv-card">' +
        '<p class="epv-section-title">Conclusions</p>' +
        '<div class="dyn-list" id="epv-conclusions-list" style="display:flex;flex-direction:column;gap:10px;">' + conclusionsHtml + '</div>' +
        '<button class="add-link" data-action="epv-add-conclusion" style="margin-top:10px;">' + ICONS.plus + ' Ajouter une conclusion</button>' +
      '</div>' +
      '<div class="epv-card">' +
        '<p class="epv-section-title">Tâches' + (carried.length&&hasEntries?' <span style="font-family:var(--font-mono);font-size:.64rem;color:var(--seal-gold);">— '+carried.length+' reportée(s)</span>':'') + '</p>' +
        '<div id="epv-tasks-list" style="display:flex;flex-direction:column;gap:8px;">' + tachesHtml + '</div>' +
        '<button class="add-link" data-action="epv-add-task" data-pid="'+pid+'" style="margin-top:10px;">' + ICONS.plus + ' Ajouter une tâche</button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:4px;">' +
        '<button class="btn btn-primary" data-action="epv-save" data-pid="'+pid+'">✓ Enregistrer</button>' +
        (hasEntries ? '<button class="btn btn-danger" data-action="epv-delete-latest" data-pid="'+pid+'">Supprimer cette entrée</button>' : '') +
      '</div>' +
    '</div>' +
    sidebarHtml +
  '</div>';
}

function epvCollectEntry(pid){
  const date = document.getElementById('epv-date').value || todayStr();
  const participants = document.getElementById('epv-participants').value.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
  // Read notes from RTE contenteditable
  const notesEl = document.getElementById('epv-notes');
  const notes = notesEl ? (notesEl.innerHTML||notesEl.value||'').replace(/&nbsp;/g,' ').trim() : '';
  // Read conclusions from RTE contenteditable divs
  const conclusions = [];
  let ci = 0;
  while(document.getElementById('epv-conclusion-'+ci)){
    const el = document.getElementById('epv-conclusion-'+ci);
    const val = (el.innerHTML||el.value||'').replace(/&nbsp;/g,' ').trim();
    if(val) conclusions.push(val);
    ci++;
  }
  const taskDescs = document.querySelectorAll('.epv-task-desc');
  const taskResps = document.querySelectorAll('.epv-task-resp');
  const taskDates = document.querySelectorAll('.epv-task-date');
  const taskStatuts = document.querySelectorAll('.epv-task-statut');
  const taskPrios = document.querySelectorAll('.epv-task-priority');
  const taskPrioWhens = document.querySelectorAll('.epv-prio-when');
  const taskPrioDates = document.querySelectorAll('.epv-prio-date');
  const taches = [...taskDescs].map((el,i)=>{
    const isPrio = taskPrios[i] && taskPrios[i].checked;
    const prioWhenEls = taskPrioWhens[i] ? el.closest('.epv-task-row').querySelectorAll('.epv-prio-when') : [];
    const prioWhen = [...prioWhenEls].find(r=>r.checked);
    const prioDate = taskPrioDates[i] ? taskPrioDates[i].value : '';
    return {
      id: uid(), description: el.value.trim(),
      responsable: taskResps[i] ? taskResps[i].value.trim() : '',
      echeance: taskDates[i] ? taskDates[i].value : '',
      statut: taskStatuts[i] ? taskStatuts[i].value : 'à faire',
      priority: isPrio || false,
      priorityFrom: (isPrio && prioWhen && prioWhen.value==='later' && prioDate) ? prioDate : null
    };
  }).filter(t=>t.description);
  return { date, participants, notes, conclusions, taches };
}

function epvExport(pid){
  const entries = getEPV(pid);
  if(!entries.length) return;
  const p = getProject(pid);
  const o = '\x3c', c = '\x3e';
  let body = '';
  entries.forEach((e,i) => {
    body += o+'h2'+c+'Entrée '+(i+1)+' — '+fmtDate(e.date)+o+'/h2'+c;
    if(e.participants&&e.participants.length) body += o+'p'+c+'Participants : '+escapeHtml(e.participants.join(', '))+o+'/p'+c;
    if(e.notes) body += o+'h3'+c+'Notes'+o+'/h3'+c+o+'p style="white-space:pre-wrap;"'+c+escapeHtml(e.notes)+o+'/p'+c;
    if(e.conclusions&&e.conclusions.filter(c2=>c2&&c2.trim()).length){
      body += o+'h3'+c+'Conclusions'+o+'/h3'+c+o+'ol'+c+e.conclusions.filter(c2=>c2&&c2.trim()).map(cc=>o+'li'+c+escapeHtml(stripHtml(cc))+o+'/li'+c).join('')+o+'/ol'+c;
    }
    if(e.taches&&e.taches.length){
      body += o+'h3'+c+'Tâches'+o+'/h3'+c+o+'table border="1" cellpadding="5" style="border-collapse:collapse;width:100%"'+c+
        o+'tr'+c+o+'th'+c+'Tâche'+o+'/th'+c+o+'th'+c+'Responsable'+o+'/th'+c+o+'th'+c+'Échéance'+o+'/th'+c+o+'th'+c+'Statut'+o+'/th'+c+o+'/tr'+c+
        e.taches.map(t=>o+'tr'+c+o+'td'+c+escapeHtml(t.description||'')+o+'/td'+c+o+'td'+c+(t.responsable||'—')+o+'/td'+c+o+'td'+c+(fmtDate(t.echeance)||'—')+o+'/td'+c+o+'td'+c+escapeHtml(t.statut)+o+'/td'+c+o+'/tr'+c).join('')+
        o+'/table'+c;
    }
    body += o+'hr'+c;
  });
  const doc = o+'html xmlns:w="urn:schemas-microsoft-com:office:word"'+c+
    o+'head'+c+o+'meta charset="UTF-8"'+c+o+'style'+c+'body{font-family:Arial;font-size:11pt;} h2{color:#1A4A7A;} h3{color:#557A98;font-size:10pt;}'+o+'/style'+c+o+'/head'+c+
    o+'body'+c+o+'h1 style="color:#1A4A7A;"'+c+'Suivi continu — '+escapeHtml(p?p.name:pid)+o+'/h1'+c+body+o+'/body'+c+o+'/html'+c;
  const blob = new Blob(['\uFEFF'+doc], {type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='suivi-continu-'+(p?p.name.replace(/\s+/g,'-'):'projet')+'.doc';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

