"use strict";

/* ============== MODAL ============== */
function renderModal(){
  let inner, wide = '';
  if(state.modal.type==='import'){ inner = renderImportModalInner(); wide = ' wide'; }
  else if(state.modal.type==='import-json'){ inner = renderImportJsonModalInner(); wide = ' wide'; }
  else if(state.modal.type==='import-excel'){ inner = renderImportExcelModalInner(); wide = ' wide'; }
  else if(state.modal.type==='edit-task'){ inner = renderEditTaskModalInner(); wide = ' wide'; }
  else if(state.modal.type==='confirm-delete'){ inner = renderConfirmDeleteModalInner(); }
  else if(state.modal.type==='cal-event'){ inner = renderCalEventModalInner(); }
  else if(state.modal.type==='cal-row'){ inner = renderCalRowModalInner(); }
  else if(state.modal.type==='vigilance'){ inner = renderVigilanceModalInner(); }
  else if(state.modal.type==='development'){ inner = renderDevelopmentModalInner(); }
  else if(state.modal.type==='priority-schedule'){ inner = renderPriorityScheduleModalInner(); }
  else if(state.modal.type==='pv-import'){ inner = renderPvImportModalInner(); wide = ' wide'; }
  else if(state.modal.type==='project'){ inner = renderProjectModalInner(); wide = ' xwide'; }
  else { inner = '<p style="color:var(--ink-soft);">Type de modale inconnu : '+escapeHtml(String(state.modal.type))+'</p><div class="form-actions"><button class="btn btn-ghost" data-action="close-modal">Fermer</button></div>'; }
  return '<div class="modal-overlay" data-action="close-modal">' +
    '<div class="modal-card' + wide + '" data-action="noop">' + inner + '</div>' +
  '</div>';
}

function renderConfirmDeleteModalInner(){
  const msg = state.modal.message || 'Confirmer la suppression ?';
  const confirmLabel = state.modal.confirmLabel || 'Supprimer définitivement';
  const cancelLabel = state.modal.cancelLabel || null;
  const isDelete = !state.modal.confirmLabel; // default is a delete modal
  return '<h3 style="color:'+(isDelete?'var(--stamp-red)':'var(--navy)')+';display:flex;align-items:center;gap:8px;">' +
    (isDelete ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/></svg>Supprimer' : '✓ Confirmer') +
    '</h3>' +
    '<p style="margin:10px 0 22px;color:var(--ink-soft);white-space:pre-line;">' + escapeHtml(msg) + '</p>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" style="'+(isDelete?'background:var(--stamp-red);border-color:var(--stamp-red);':'')+'" data-action="confirm-delete-ok">' + escapeHtml(confirmLabel) + '</button>' +
      (cancelLabel ? '<button class="btn" style="background:#F0FAF5;border-color:#B8DEC8;color:var(--sage);" data-action="confirm-secondary-ok">' + escapeHtml(cancelLabel) + '</button>' : '') +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

function renderEditTaskModalInner(){
  const m = state.modal;
  const t = m.task;
  // Build all projects + sub-projects list for the move selector
  const allProjects = state.data.projects.map(p => ({
    id: p.id,
    label: (p.parentId ? '— ' : '') + p.name
  }));
  return '<h3>Modifier la tâche</h3>' +
    '<div class="form-row"><label>Description</label>' +
      '<textarea id="et-desc" style="min-height:70px;">'+escapeHtml(t.description||'')+'</textarea>' +
    '</div>' +
    '<div class="form-grid2">' +
      '<div class="form-row"><label>Responsable</label>' +
        '<input type="text" id="et-resp" value="'+escapeHtml(t.responsable||'')+'" placeholder="Nom ou initiales">' +
      '</div>' +
      '<div class="form-row"><label>Échéance</label>' +
        '<div style="display:flex;flex-direction:column;gap:6px;">' +
          '<input type="date" id="et-date" value="'+escapeHtml(t.echeance||'')+'"' + (!t.echeance ? ' disabled style="opacity:.4;"' : '') + '>' +
          '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:.82rem;color:var(--ink-soft);font-family:var(--font-body);text-transform:none;letter-spacing:0;">' +
            '<input type="checkbox" id="et-no-date"' + (!t.echeance ? ' checked' : '') + ' style="width:14px;height:14px;" onchange="const d=document.getElementById(\'et-date\');d.disabled=this.checked;d.style.opacity=this.checked?\'.4\':\'1\';if(this.checked)d.value=\'\';">' +
            'Pas d\'échéance fixée' +
          '</label>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="form-row"><label>Statut</label>' +
      '<select id="et-statut">' +
        STATUS_LIST.map(s=>'<option value="'+s+'"'+(t.statut===s?' selected':'')+'>'+s+'</option>').join('') +
      '</select>' +
    '</div>' +
    '<div class="form-row" style="background:var(--blush);border-radius:8px;padding:10px 14px;">' +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;text-transform:none;letter-spacing:0;font-size:.84rem;font-family:var(--font-body);margin-bottom:6px;">' +
        '<input type="checkbox" id="et-move-toggle" style="width:14px;height:14px;" onchange="document.getElementById(\'et-move-target\').style.display=this.checked?\'block\':\'none\'">' +
        '↪ Déplacer vers un autre projet / sous-projet' +
      '</label>' +
      '<select id="et-move-target" style="display:none;width:100%;padding:7px 10px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.86rem;">' +
        '<option value="">— Choisir le projet cible —</option>' +
        allProjects.map(p=>'<option value="'+p.id+'">'+escapeHtml(p.label)+'</option>').join('') +
      '</select>' +
    '</div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-edit-task">Enregistrer</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}


function renderDevelopmentModalInner(){
  const m = state.modal;
  const isEdit = m.idx !== null && m.idx !== undefined;
  const current = isEdit ? ((getProject(m.projectId).developments||[])[m.idx] || {}) : {};
  return '<h3>' + (isEdit ? 'Modifier la perspective' : 'Nouvelle perspective de d\u00e9veloppement') + '</h3>' +
    '<div class="form-row"><label>Perspective de d\u00e9veloppement</label>' +
      rteHtml('dev-text', current.text || '', 'Ex : Envisager une extension aux pharmacies r\u00e9gionales en 2027\u2026') +
    '</div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-development" data-id="'+m.projectId+'" data-idx="'+(isEdit?m.idx:'')+'">Enregistrer</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

function renderVigilanceModalInner(){
  const m = state.modal;
  const isEdit = m.idx !== null && m.idx !== undefined;
  const current = isEdit ? ((getProject(m.projectId).vigilances||[])[m.idx] || {}) : {};
  return '<h3>' + (isEdit ? 'Modifier le point de vigilance' : 'Nouveau point de vigilance') + '</h3>' +
    '<div class="form-row"><label>Point de vigilance ou de développement</label>' +
      rteHtml('vig-text', current.text || '', 'Ex : Risque de retard sur MonEspacePro si les accès ne sont pas validés en mars.') +
    '</div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-vigilance" data-id="'+m.projectId+'" data-idx="'+(isEdit?m.idx:'')+'">Enregistrer</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

function rteHtml(id, value, placeholder){
  // Convert plain text with \n to HTML for the editor
  const html = value ? (value.includes('<') ? value : value.replace(/\n/g,'<br>')) : '';
  const HIGHLIGHT_COLORS = [
    {c:'#FFF176',l:'Jaune'},
    {c:'#FFB3BA',l:'Rose'},
    {c:'#B3D9FF',l:'Bleu'},
    {c:'#B3FFB3',l:'Vert'},
    {c:'#FFD9B3',l:'Orange'},
    {c:'#E0B3FF',l:'Mauve'}
  ];
  return '<div class="rte-wrap">' +
    '<div class="rte-toolbar" data-rte-toolbar="'+id+'">' +
      '<button type="button" class="rte-btn" data-rte="bold" data-rte-target="'+id+'" title="Gras"><strong>G</strong></button>' +
      '<button type="button" class="rte-btn" data-rte="italic" data-rte-target="'+id+'" title="Italique"><em>I</em></button>' +
      '<button type="button" class="rte-btn" data-rte="underline" data-rte-target="'+id+'" title="Souligné"><u>S</u></button>' +
      '<div class="rte-sep"></div>' +
      HIGHLIGHT_COLORS.map(h=>'<button type="button" class="rte-color" style="background:'+h.c+';" data-rte="highlight" data-rte-color="'+h.c+'" data-rte-target="'+id+'" title="Surligner en '+h.l+'"></button>').join('') +
      '<div class="rte-sep"></div>' +
      '<button type="button" class="rte-btn" data-rte="insertUnorderedList" data-rte-target="'+id+'" title="Liste à puces — cliquer à nouveau ou Maj+Entrée pour sortir">• —</button>' +
      '<button type="button" class="rte-btn" data-rte="insertOrderedList" data-rte-target="'+id+'" title="Liste numérotée — cliquer à nouveau ou Maj+Entrée pour sortir">1.</button>' +
      '<div class="rte-sep"></div>' +
      '<button type="button" class="rte-btn" style="font-size:.74rem;" data-rte="removeFormat" data-rte-target="'+id+'" title="Effacer le format">✕</button>' +
    '</div>' +
    '<div class="rte-body" id="'+id+'" contenteditable="true" data-placeholder="'+escapeHtml(placeholder)+'">'+html+'</div>' +
  '</div>';
}

function renderProjectModalInner(){
  const editing = state.modal.editing;
  const name = editing ? editing.name : '';
  const desc = editing ? (editing.description||'') : '';
  const contacts = editing ? (editing.contacts||'') : '';
  const status = editing ? editing.status : 'Actif';
  const color = editing ? editing.color : PROJECT_COLORS[state.data.projects.length % PROJECT_COLORS.length];
  const parentId = !editing ? state.modal.parentId : null;
  let parentNote = '';
  if(parentId){
    const parent = getProject(parentId);
    if(parent) parentNote = '<p class="help-text">Sous-projet de <strong>' + escapeHtml(parent.name) + '</strong></p>';
  }

  // In edit mode: allow re-attaching this project to another parent, or making it independent.
  let parentSelector = '';
  if(editing){
    const ownChildren = getChildren(editing.id);
    if(ownChildren.length){
      parentSelector = '<div class="form-row"><label>Projet parent</label>' +
        '<p class="help-text">Ce projet a ' + ownChildren.length + ' sous-projet(s) : il doit rester indépendant. Déplacez d\u2019abord ses sous-projets pour pouvoir le rattacher ailleurs.</p></div>';
    } else {
      const candidateParents = state.data.projects.filter(pp => !pp.parentId && pp.id !== editing.id);
      parentSelector = '<div class="form-row"><label>Projet parent</label>' +
        '<select id="m-parent">' +
          '<option value="">— Aucun (projet indépendant) —</option>' +
          candidateParents.map(pp=>'<option value="'+pp.id+'"'+(editing.parentId===pp.id?' selected':'')+'>'+escapeHtml(pp.name)+'</option>').join('') +
        '</select>' +
      '</div>';
    }
  }

  return '<h3>' + (editing ? 'Modifier le projet' : (parentId ? 'Nouveau sous-projet' : 'Nouveau projet')) + '</h3>' +
    parentNote +
    '<div class="form-row"><label>Nom du projet</label><input type="text" id="m-name" value="'+escapeHtml(name)+'" placeholder="Ex : Refonte du site web"></div>' +
    '<div class="form-grid2">' +
      '<div class="form-row"><label>Personnes en charge</label>' + rteHtml('m-contacts', contacts, 'Ex :\n- J. Aeberli (SCT)\n- D. Fachinotti (DSI)') + '</div>' +
      '<div class="form-row"><label>Objectifs / Description</label>' + rteHtml('m-desc', desc, 'Objectif, périmètre, contexte…') + '</div>' +
    '</div>' +
    '<div class="form-row"><label>Statut</label><select id="m-status">' +
      ['Actif','En pause','Terminé'].map(o=>'<option value="'+o+'"'+(status===o?' selected':'')+'>'+o+'</option>').join('') +
    '</select></div>' +
    parentSelector +
    '<div class="form-row"><label>Couleur</label><div class="swatch-picker" id="m-swatch-picker">' +
      PROJECT_COLORS.map(c => '<button type="button" class="swatch-option' + (c===color?' selected':'') + '" data-color="'+c+'" style="background:'+c+'"></button>').join('') +
    '</div></div>' +
    '<input type="hidden" id="m-color" value="'+color+'">' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-project" data-id="'+(editing?editing.id:'')+'">Enregistrer</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

function renderImportModalInner(){
  return '<h3>Importer une page OneNote</h3>' +
    '<p class="help-text">Dans OneNote, ouvrez la page, faites <strong>Ctrl+A</strong> puis <strong>Ctrl+C</strong>, puis collez le contenu ci-dessous. Les lignes commençant par une case (☐ ☑ [ ] [x]) seront reconnues comme des tâches et apparaîtront dans le tableau de bord avec un repère « OneNote ».</p>' +
    '<div class="form-row"><label>Titre de la page</label><input type="text" id="im-title" placeholder="Ex : Réunion fournisseurs — notes"></div>' +
    '<div class="form-row"><label>Contenu collé</label><textarea id="im-text" style="min-height:180px;" placeholder="Collez ici le contenu de votre page OneNote…"></textarea></div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-import">Importer</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

function renderImportJsonModalInner(){
  return '<h3>Importer des données (JSON)</h3>' +
    '<div style="background:#FFF8E6;border:1px solid #E8D870;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:.84rem;color:#7A5800;">\u26a0\ufe0f Un export complet <strong>remplace toutes les donn\u00e9es actuelles</strong>. Exportez d\u2019abord si n\u00e9cessaire.</div>' +
    '<div class="form-row"><textarea id="ij-text" style="min-height:200px;font-family:var(--font-mono);font-size:.8rem;" placeholder="{&quot;projects&quot;:[...],&quot;seances&quot;:{...},&quot;calendar&quot;:{...}}"></textarea></div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-import-json">Importer</button>' +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

function attachDynamicValues(){
  // Sidebar project drag-and-drop reordering
  document.querySelectorAll('.project-tab[draggable]').forEach(btn => {
    btn.addEventListener('dragstart', e => {
      state.dragProjectId = btn.getAttribute('data-proj-id');
      btn.classList.add('drag-source');
      e.dataTransfer.effectAllowed = 'move';
    });
    btn.addEventListener('dragend', () => {
      btn.classList.remove('drag-source','drag-over-top','drag-over-bottom');
      document.querySelectorAll('.project-tab').forEach(b=>b.classList.remove('drag-over-top','drag-over-bottom'));
    });
    btn.addEventListener('dragover', e => {
      e.preventDefault();
      // Only allow drop among same-level projects
      if(!state.dragProjectId || state.dragProjectId === btn.getAttribute('data-proj-id')) return;
      const dragProj = getProject(state.dragProjectId);
      const overProj = getProject(btn.getAttribute('data-proj-id'));
      if(!dragProj || !overProj || dragProj.parentId !== overProj.parentId) return;
      document.querySelectorAll('.project-tab').forEach(b=>b.classList.remove('drag-over-top','drag-over-bottom'));
      const rect = btn.getBoundingClientRect();
      const isTop = e.clientY < rect.top + rect.height / 2;
      btn.classList.add(isTop ? 'drag-over-top' : 'drag-over-bottom');
    });
    btn.addEventListener('dragleave', () => {
      btn.classList.remove('drag-over-top','drag-over-bottom');
    });
    btn.addEventListener('drop', e => {
      e.preventDefault();
      btn.classList.remove('drag-over-top','drag-over-bottom');
      const fromId = state.dragProjectId;
      const toId = btn.getAttribute('data-proj-id');
      if(!fromId || fromId === toId) return;
      const projects = state.data.projects;
      const fromIdx = projects.findIndex(p=>p.id===fromId);
      const toIdx   = projects.findIndex(p=>p.id===toId);
      if(fromIdx < 0 || toIdx < 0) return;
      // Only reorder within same level
      if(projects[fromIdx].parentId !== projects[toIdx].parentId) return;
      const rect = btn.getBoundingClientRect();
      const insertBefore = e.clientY < rect.top + rect.height / 2;
      const [moved] = projects.splice(fromIdx, 1);
      const newToIdx = projects.findIndex(p=>p.id===toId);
      projects.splice(insertBefore ? newToIdx : newToIdx+1, 0, moved);
      state.dragProjectId = null;
      persistAndRender();
    });
  });

  // Rich text editor toolbar buttons (includes séance conclusions, epv conclusions, project fields)
  document.querySelectorAll('[data-rte]').forEach(btn => {
    btn.addEventListener('mousedown', function(e){
      e.preventDefault();
      const targetId = this.getAttribute('data-rte-target');
      const cmd = this.getAttribute('data-rte');
      const color = this.getAttribute('data-rte-color');
      const el = document.getElementById(targetId);
      if(!el) return;
      el.focus();
      if(cmd === 'highlight'){
        document.execCommand('backColor', false, color);
      } else if(cmd === 'removeFormat'){
        document.execCommand('removeFormat', false, null);
        document.execCommand('backColor', false, 'transparent');
      } else {
        document.execCommand(cmd, false, null);
      }
    });
  });
  if(state.modal && state.modal.type==='project'){
    const picker = document.getElementById('m-swatch-picker');
    if(picker){
      picker.querySelectorAll('.swatch-option').forEach(btn => {
        btn.addEventListener('click', () => {
          picker.querySelectorAll('.swatch-option').forEach(b=>b.classList.remove('selected'));
          btn.classList.add('selected');
          document.getElementById('m-color').value = btn.getAttribute('data-color');
        });
      });
    }
  }
  if(state.modal && state.modal.type==='cal-event'){
    const picker = document.getElementById('ce-color-picker');
    if(picker){
      picker.querySelectorAll('[data-color]').forEach(btn => {
        btn.addEventListener('click', () => {
          picker.querySelectorAll('[data-color]').forEach(b=>b.style.borderColor='transparent');
          btn.style.borderColor='var(--navy)';
          document.getElementById('ce-color').value = btn.getAttribute('data-color');
        });
      });
    }
  }
  if(state.modal && state.modal.type==='cal-row'){
    const picker = document.getElementById('cr-ev-color-picker');
    if(picker){
      picker.querySelectorAll('[data-row-color]').forEach(btn => {
        btn.addEventListener('click', () => {
          picker.querySelectorAll('[data-row-color]').forEach(b=>b.style.borderColor='transparent');
          btn.style.borderColor='var(--navy)';
          document.getElementById('cr-ev-color').value = btn.getAttribute('data-row-color');
        });
      });
    }
  }
}

