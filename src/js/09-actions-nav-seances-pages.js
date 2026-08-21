"use strict";

/* ============== ACTIONS : NAVIGATION ============== */
function openProject(id){
  state.view='project'; state.currentProjectId=id; state.currentSeanceId=null; state.currentPageId=null; state.projectTab='seances'; state.projSort={col:null,dir:1}; state.evolvingEntryId=null; render();
}
function openDashboard(){
  state.view='dashboard'; state.currentProjectId=null; state.currentSeanceId=null; state.currentPageId=null; render();
}
function openHome(){
  state.view='home'; state.currentProjectId=null; render();
}

/* ============== ACTIONS : SEANCES ============== */
function newDraftSeance(){ return { title: '', date: todayStr(), participants: [], notes: '', conclusions: [''], taches: [] }; }
function openSeance(pid, sid){
  state.view='seance-view'; state.currentProjectId=pid; state.currentSeanceId=sid; render();
}
function newSeance(pid){
  state.view='seance-edit'; state.currentProjectId=pid; state.currentSeanceId=null;
  state.draftSeance = newDraftSeance(); state.draftParticipants=''; render();
}
function editSeance(pid, sid){
  try{
    const s = getSeances(pid).find(x=>x.id===sid);
    if(!s){ showBanner('Séance introuvable (id: '+sid+')'); return; }
    state.view='seance-edit'; state.currentProjectId=pid; state.currentSeanceId=sid;
    state.draftSeance = {
      title: s.title || '',
      date: s.date || todayStr(), participants: (s.participants||[]).slice(),
      notes: s.notes || '', conclusions: (s.conclusions && s.conclusions.length) ? s.conclusions.slice() : [''],
      taches: (s.taches||[]).map(t=>({...t}))
    };
    state.draftParticipants = (s.participants||[]).join(', ');
    render();
  }catch(err){ showBanner('Erreur Modifier séance: '+err.message); }
}
function deleteSeance(pid, sid){
  state.modal = { type:'confirm-delete', message:'Supprimer cette séance et son PV ? Cette action est irréversible.',
    pendingAction: () => {
      state.data.seances[pid] = getSeances(pid).filter(s=>s.id!==sid);
      if(state.currentSeanceId===sid){ state.view='project'; state.currentSeanceId=null; }
      state.modal = null;
      persistAndRender();
    }
  };
  render();
}
function collectSeanceDraft(){
  // Saves current form values into state.draftSeance before any re-render
  const d = state.draftSeance;
  if(!d) return;
  const titleEl = document.getElementById('f-title');
  if(titleEl) d.title = titleEl.value.trim();
  const dateEl = document.getElementById('f-date');
  if(dateEl) d.date = dateEl.value;
  const partEl = document.getElementById('f-participants');
  if(partEl){ d.participants = partEl.value.split(',').map(s=>s.trim()).filter(Boolean); state.draftParticipants = partEl.value; }
  const notesEl = document.getElementById('f-notes');
  if(notesEl) d.notes = (notesEl.innerHTML||notesEl.value||'').replace(/&nbsp;/g,' ').trim();
  // Collect all conclusion RTEs
  const conclusions = [];
  let ci = 0;
  while(document.getElementById('s-conclusion-'+ci)){
    const cel = document.getElementById('s-conclusion-'+ci);
    conclusions.push((cel.innerHTML||cel.value||'').replace(/&nbsp;/g,' ').trim());
    ci++;
  }
  if(conclusions.length) d.conclusions = conclusions;
}

function saveSeance(){
  const d = state.draftSeance;
  d.date = document.getElementById('f-date').value;
  d.title = (document.getElementById('f-title') && document.getElementById('f-title').value.trim()) || '';
  d.participants = document.getElementById('f-participants').value.split(',').map(s=>s.trim()).filter(Boolean);
  const fNotesEl = document.getElementById('f-notes'); d.notes = fNotesEl ? (fNotesEl.innerHTML||fNotesEl.value||'').replace(/&nbsp;/g,' ').trim() : '';

  // Collect conclusions from RTE contenteditable divs
  const collectedConclusions = [];
  let ci = 0;
  while(document.getElementById('s-conclusion-'+ci)){
    const el = document.getElementById('s-conclusion-'+ci);
    const val = (el.innerHTML||el.value||'').replace(/&nbsp;/g,' ').trim();
    if(val) collectedConclusions.push(val);
    ci++;
  }
  // Fallback: use draftSeance conclusions if no RTE divs found
  const cleanConclusions = collectedConclusions.length ? collectedConclusions : d.conclusions.map(c=>(c||'').trim()).filter(Boolean);

  const pid = state.currentProjectId;
  if(!state.data.seances[pid]) state.data.seances[pid] = [];
  let seanceId = state.currentSeanceId;
  const cleanTasks = d.taches.filter(t=>t.description && t.description.trim());

  if(seanceId){
    const s = state.data.seances[pid].find(x=>x.id===seanceId);
    Object.assign(s, { title:d.title||'', date:d.date, participants:d.participants, notes:d.notes, conclusions:cleanConclusions, taches:cleanTasks });
  } else {
    seanceId = uid();
    state.data.seances[pid].push({ id:seanceId, title:d.title||'', date:d.date, participants:d.participants, notes:d.notes, conclusions:cleanConclusions, taches:cleanTasks });
  }
  state.view='seance-view'; state.currentSeanceId=seanceId; state.draftSeance=null;
  persistAndRender();
}

/* ============== ACTIONS : PAGES ============== */
function openPage(pid, pageId){
  state.view='page-view'; state.currentProjectId=pid; state.currentPageId=pageId; render();
}
function newPage(pid){
  state.view='page-edit'; state.currentProjectId=pid; state.currentPageId=null;
  state.draftPage = { title:'', notes:'', taches:[] }; render();
}
function editPage(pid, pageId){
  try{
    const pg = getPages(pid).find(x=>x.id===pageId);
    if(!pg){ showBanner('Page introuvable (id: '+pageId+')'); return; }
    state.view='page-edit'; state.currentProjectId=pid; state.currentPageId=pageId;
    state.draftPage = { title: pg.title||'', notes: pg.notes||'', taches: (pg.taches||[]).map(t=>({...t})), source: pg.source||'manual' };
    render();
  }catch(err){ showBanner('Erreur Modifier page: '+err.message); }
}
function deletePage(pid, pageId){
  state.modal = { type:'confirm-delete', message:'Supprimer définitivement cette page ? Cette action est irréversible.',
    pendingAction: () => {
      state.data.pages[pid] = getPages(pid).filter(x=>x.id!==pageId);
      if(state.currentPageId===pageId){ state.view='project'; state.currentPageId=null; }
      state.modal = null;
      persistAndRender();
    }
  };
  render();
}
function savePage(){
  const d = state.draftPage;
  const title = document.getElementById('pg-title').value.trim();
  if(!title) return;
  d.title = title;
  const pgNotesEl = document.getElementById('pg-notes'); d.notes = pgNotesEl ? (pgNotesEl.innerHTML||pgNotesEl.value||'').replace(/&nbsp;/g,' ').trim() : '';

  const pid = state.currentProjectId;
  if(!state.data.pages[pid]) state.data.pages[pid] = [];
  const cleanTasks = d.taches.filter(t=>t.description && t.description.trim());
  let pageId = state.currentPageId;

  if(pageId){
    const pg = state.data.pages[pid].find(x=>x.id===pageId);
    Object.assign(pg, { title:d.title, notes:d.notes, taches:cleanTasks });
  } else {
    pageId = uid();
    state.data.pages[pid].push({ id:pageId, title:d.title, notes:d.notes, source:'manuel', createdAt: todayStr(), taches: cleanTasks });
  }
  state.view='page-view'; state.currentPageId=pageId; state.draftPage=null;
  persistAndRender();
}
function saveImport(){
  const pid = state.modal.projectId;
  const title = document.getElementById('im-title').value.trim() || ('Page importée le ' + fmtDate(todayStr()));
  const text = document.getElementById('im-text').value;
  if(!text || !text.trim()){ return; }
  const tasks = parseOneNoteText(text);
  if(!state.data.pages[pid]) state.data.pages[pid] = [];
  const pageId = uid();
  state.data.pages[pid].push({ id:pageId, title, notes:text, source:'onenote', createdAt: todayStr(), taches: tasks });
  state.modal = null;
  state.currentProjectId = pid; state.view='page-view'; state.currentPageId = pageId; state.projectTab='pages';
  persistAndRender();
}

