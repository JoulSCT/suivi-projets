"use strict";

/* ============== PRIORITY SCHEDULE MODAL ============== */
function renderPriorityScheduleModalInner(){
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowStr = tomorrow.toISOString().slice(0,10);
  return '<h3>\u2b50 Rendre prioritaire</h3>' +
    '<p style="color:var(--ink-soft);font-size:.88rem;margin-bottom:20px;">À partir de quand cette tâche doit-elle apparaître dans les prioritaires ?</p>' +
    '<div style="display:flex;flex-direction:column;gap:10px;">' +
      '<button class="btn btn-primary" data-action="confirm-priority-now" style="justify-content:flex-start;padding:14px 18px;">' +
        '<span style="font-size:1.1rem;margin-right:8px;">\u26a1</span>' +
        '<span><strong style="display:block;">Maintenant</strong><span style="font-size:.78rem;opacity:.85;">Apparaît immédiatement dans les prioritaires</span></span>' +
      '</button>' +
      '<div style="background:var(--blush);border-radius:8px;padding:14px 16px;">' +
        '<p style="margin:0 0 10px;font-weight:500;font-size:.88rem;">\ud83d\udcc5 À une date future</p>' +
        '<input type="date" id="prio-date" value="'+tomorrowStr+'" min="'+tomorrowStr+'" style="padding:8px 10px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.86rem;width:100%;">' +
        '<p style="font-size:.76rem;color:var(--ink-soft);margin:6px 0 0;">La tâche sera marquée \u2b50 mais n\'apparaîtra qu\'à partir de cette date.</p>' +
      '</div>' +
    '</div>' +
    '<div class="form-actions">' +
      '<button class="btn" data-action="confirm-priority-later" style="background:#F0F5FF;border-color:var(--navy);color:var(--navy);">Planifier pour cette date</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

/* ============== PV IMPORT ============== */
const PV_STATUT_MAP = { 'a_traiter':'à faire','en_cours':'en cours','realise':'fait (R.A.)','termine':'fait','non_realise':'non réalisé' };

function pvFindProject(nomProjet){
  // Try to match project name (case-insensitive, partial)
  if(!nomProjet) return null;
  const norm = s => s.toLowerCase().replace(/[@\-\s]/g,'');
  const projects = state.data.projects;
  return projects.find(p=>norm(p.name)===norm(nomProjet))
    || projects.find(p=>norm(p.name).includes(norm(nomProjet)) || norm(nomProjet).includes(norm(p.name)))
    || null;
}

function renderPvImportModalInner(){
  const pv = state.modal.pv;
  if(!pv){
    // File selector step
    return '<h3>Importer un PV</h3>' +
      '<p style="color:var(--ink-soft);font-size:.88rem;margin-bottom:16px;">Sélectionnez un fichier <strong>.json</strong> exporté depuis votre outil de PV.</p>' +
      '<div style="border:2px dashed var(--paper-line);border-radius:8px;padding:32px;text-align:center;">' +
        '<input type="file" id="pv-file-input" accept=".json" style="display:none;">' +
        '<button class="btn btn-primary" onclick="document.getElementById(\'pv-file-input\').click()">📂 Choisir un fichier .json</button>' +
        '<p style="margin:10px 0 0;font-family:var(--font-mono);font-size:.7rem;color:var(--ink-soft);">Format : PV-TLM-SC-JA-AAAA-MM-JJ.json</p>' +
      '</div>' +
      '<div class="form-actions"><button class="btn btn-ghost" data-action="close-modal">Annuler</button></div>';
  }

  // Preview step
  const projects = state.data.projects;
  const taches = pv.taches || [];
  const tachesT = pv.tachesTerminees || [];

  const projectSelect = '<select id="pv-target-project" style="width:100%;padding:8px 10px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.86rem;margin-bottom:4px;">' +
    '<option value="">— Choisir le projet cible —</option>' +
    projects.map(p=>'<option value="'+p.id+'">'+(p.parentId?'— ':'')+escapeHtml(p.name)+'</option>').join('') +
  '</select>';

  const taskRows = (tasks, isDone) => tasks.map((t,i) => {
    const statut = PV_STATUT_MAP[t.statut] || 'à faire';
    const key = isDone ? 'done-'+i : 'todo-'+i;
    return '<div style="background:var(--card);border:1px solid var(--paper-line);border-radius:8px;padding:10px 14px;margin-bottom:8px;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">' +
        '<div style="flex:1;">' +
          '<p style="font-weight:500;font-size:.86rem;margin:0 0 3px;">'+escapeHtml(t.titre||t.description||'')+'</p>' +
          '<p style="font-family:var(--font-mono);font-size:.66rem;color:var(--ink-soft);margin:0;">'+escapeHtml(t.ligne||t.projet||'')+'</p>' +
          (t.note ? '<p style="font-size:.8rem;color:var(--ink-soft);margin:4px 0 0;">'+escapeHtml(t.note)+'</p>' : '') +
        '</div>' +
        '<span style="font-family:var(--font-mono);font-size:.66rem;padding:2px 8px;border-radius:8px;background:'+STATUS_COLOR[statut]+'22;color:'+STATUS_COLOR[statut]+';white-space:nowrap;">'+statut+'</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-top:10px;">' +
        '<label style="display:flex;align-items:center;gap:5px;font-size:.8rem;cursor:pointer;font-family:var(--font-body);text-transform:none;letter-spacing:0;">' +
          '<input type="radio" name="pv-task-'+key+'" value="import" checked style="accent-color:var(--navy);"> ' +
          (isDone ? 'Importer (R.A.)' : 'Créer comme tâche active') +
        '</label>' +
        '<label style="display:flex;align-items:center;gap:5px;font-size:.8rem;cursor:pointer;font-family:var(--font-body);text-transform:none;letter-spacing:0;">' +
          '<input type="radio" name="pv-task-'+key+'" value="ignore" style="accent-color:var(--navy);"> Ignorer' +
        '</label>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<h3>Prévisualisation du PV</h3>' +
    '<div style="background:var(--blush);border-radius:8px;padding:12px 14px;margin-bottom:16px;">' +
      '<p style="font-family:var(--font-mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);margin:0 0 6px;">Document</p>' +
      '<p style="font-weight:600;margin:0 0 2px;">'+escapeHtml(pv.document||'PV')+'</p>' +
      '<p style="font-family:var(--font-mono);font-size:.74rem;color:var(--ink-soft);margin:0;">'+fmtDate(pv.date||'')+'</p>' +
    '</div>' +
    (pv.pointsForts ? '<div class="form-row"><label>Points forts</label><p style="font-size:.86rem;padding:8px 10px;background:var(--card);border-radius:6px;border:1px solid var(--paper-line);">'+escapeHtml(pv.pointsForts)+'</p></div>' : '') +
    (pv.pointsVigilance ? '<div class="form-row"><label>Points de vigilance</label><p style="font-size:.86rem;padding:8px 10px;background:var(--card);border-radius:6px;border:1px solid var(--paper-line);">'+escapeHtml(pv.pointsVigilance)+'</p></div>' : '') +
    (pv.notesDiverses ? '<div class="form-row"><label>Notes diverses</label><p style="font-size:.86rem;padding:8px 10px;background:var(--card);border-radius:6px;border:1px solid var(--paper-line);">'+escapeHtml(pv.notesDiverses)+'</p></div>' : '') +
    (pv.datesCles ? '<div class="form-row"><label>Dates clés</label><p style="font-size:.86rem;padding:8px 10px;background:var(--card);border-radius:6px;border:1px solid var(--paper-line);">'+escapeHtml(pv.datesCles)+'</p></div>' : '') +
    '<div class="form-row"><label>Projet cible dans le suivi</label>'+projectSelect+'</div>' +
    (taches.length ? '<p class="section-label" style="color:var(--navy);">Tâches actives ('+taches.length+')</p>' + taskRows(taches, false) : '') +
    (tachesT.length ? '<p class="section-label" style="color:var(--sage);">Tâches terminées ('+tachesT.length+')</p>' + taskRows(tachesT, true) : '') +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-pv-import">✓ Importer la sélection</button>' +
      '<button class="btn" data-action="save-pv-import-all" style="background:#F0FAF5;border-color:#B8DEC8;color:var(--sage);">📋 Tout garder en séance</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

