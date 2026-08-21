"use strict";



/* ============== ICONS ============== */
const ICONS = {
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  printer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  layers:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
};

const PROJECT_COLORS = [
  /* Bleus */ '#1A4A7A','#2E86C1','#5DADE2','#AED6F1',
  /* Verts */ '#1A7A5A','#27AE60','#82E0AA','#A9DFBF',
  /* Rouges/roses */ '#A6383A','#E74C3C','#F1948A','#F8BBD9',
  /* Violets */ '#6B4C9A','#8E44AD','#BB8FCE','#D7BDE2',
  /* Oranges/dorés */ '#A87A00','#E67E22','#F0B27A','#FAD7A0',
  /* Teals/ardoises */ '#2E6E73','#17A589','#76D7C4','#4B5563'
];
const STATUS_LIST = ['à faire','en cours','fait (R.A.)','fait','non réalisé'];
const STATUS_COLOR = {'à faire':'#6A7A8E','en cours':'#C07820','fait (R.A.)':'#7755AA','fait':'#1A7A5A','non réalisé':'#9A4040'};

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/* ============== STATE ============== */
let state = {
  view: 'loading',
  currentProjectId: null,
  currentSeanceId: null,
  currentPageId: null,
  projectTab: 'seances',
  evolvingEntryId: null,
  evolvingEditMode: true,
  dragProjectId: null,
  homeNoteInput: '',
  calYear: new Date().getFullYear(),          // 'seances' | 'pages'
  draftSeance: null,
  draftPage: null,
  draftParticipants: '',
  _epvDraft: null,
  modal: null,                     // {type:'project'|'import', editing, parentId, projectId}
  dashboardFilters: { projet:'all', statut:'all', responsable:'all', origine:'all', onlyOverdue:false },
  dashboardTab: 'taches',
  raYear: null,
  // Column config: each entry = { key, label, visible }
  dashSort: { col: null, dir: 1 },
  projSort: { col: null, dir: 1 },
  pendingDelete: null,  // { action, args, message }
  data: { projects: [], seances: {}, pages: {} },
  banner: null
};

/* ============== UTILS ============== */
function uid(){ return (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2); }
const DONE_STATUSES = ['fait','fait (R.A.)','non réalisé'];
function setTaskStatut(task, newStatut){
  const wasDone = DONE_STATUSES.includes(task.statut);
  const becomesDone = DONE_STATUSES.includes(newStatut);
  task.statut = newStatut;
  if(becomesDone && !task.completedAt) task.completedAt = todayStr();
  if(!becomesDone) task.completedAt = null;
}
// Strip all HTML tags → plain text for card previews
function stripHtml(s){
  if(!s) return '';
  return s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
function fmtText(s){
  if(!s) return '';
  // Decode entities first in case HTML was double-encoded
  const decoded = s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
  if(decoded.includes('<')){
    return decoded
      .replace(/<div><br\s*\/?><\/div>/gi, '<br>')
      .replace(/<div>/gi, '<br>')
      .replace(/<\/div>/gi, '')
      .replace(/^<br>/, '');
  }
  return escapeHtml(decoded).replace(/\n/g,'<br>');
}
function todayStr(){ return new Date().toISOString().slice(0,10); }
function fmtDate(iso){
  if(!iso) return '—';
  const parts = iso.split('-').map(Number);
  if(parts.length<3 || !parts[1]) return iso;
  return parts[2] + ' ' + MONTHS_FR[parts[1]-1] + ' ' + parts[0];
}
function escapeHtml(s){
  if(s===undefined || s===null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function isOverdue(task){ return task.echeance && !DONE_STATUSES.includes(task.statut) && task.echeance < todayStr(); }
function defaultData(){ return { projects: [], seances: {}, pages: {}, quickNotes: [], calendar: { rows:[], events:[] }, evolvingPV: {} }; }

function getProject(id){ return state.data.projects.find(p => p.id === id); }
function getChildren(id){ return state.data.projects.filter(p => p.parentId === id); }
function getSeances(projectId){ return state.data.seances[projectId] || []; }
function getPages(projectId){ return state.data.pages[projectId] || []; }
function sortedSeances(projectId){
  return getSeances(projectId).slice().sort((a,b) => (a.date||'').localeCompare(b.date||''));
}
function seanceIndexLabel(projectId, seanceId){
  const list = sortedSeances(projectId);
  const i = list.findIndex(s => s.id === seanceId);
  return i === -1 ? '?' : i+1;
}
function projectRef(projectId){
  const i = state.data.projects.findIndex(p => p.id === projectId);
  return 'PRJ-' + String(i+1).padStart(2,'0');
}
function getProjectPath(id){
  const p = getProject(id);
  if(!p) return '';
  if(p.parentId){
    const parent = getProject(p.parentId);
    if(parent) return parent.name + ' › ' + p.name;
  }
  return p.name;
}
function openTaskCount(projectId){
  let n = 0;
  const proj = getProject(projectId);
  (proj && proj.directTasks || []).forEach(t => { if(!DONE_STATUSES.includes(t.statut)) n++; });
  getSeances(projectId).forEach(s => (s.taches||[]).forEach(t => { if(!DONE_STATUSES.includes(t.statut)) n++; }));
  getPages(projectId).forEach(pg => (pg.taches||[]).forEach(t => { if(!DONE_STATUSES.includes(t.statut)) n++; }));
  getEPV(projectId).forEach(entry => (entry.taches||[]).forEach(t => { if(!DONE_STATUSES.includes(t.statut)) n++; }));
  return n;
}

function getAllTasks(){
  const out = [];
  state.data.projects.forEach(p => {
    sortedSeances(p.id).forEach((s, idx) => {
      (s.taches||[]).forEach(t => {
        out.push({
          projectId: p.id, projectPath: getProjectPath(p.id), projectColor: p.color,
          origin: 'seance', originLabel: s.title || 'PV n°' + (idx+1), source: null,
          seanceId: s.id, pageId: null,
          taskId: t.id, description: t.description, responsable: t.responsable,
          echeance: t.echeance, statut: t.statut, priority: t.priority || false, priorityFrom: t.priorityFrom||null, completedAt: t.completedAt
        });
      });
    });
    getPages(p.id).forEach(pg => {
      (pg.taches||[]).forEach(t => {
        out.push({
          projectId: p.id, projectPath: getProjectPath(p.id), projectColor: p.color,
          origin: 'page', originLabel: 'Page : ' + pg.title, source: pg.source || 'manuel',
          seanceId: null, pageId: pg.id,
          taskId: t.id, description: t.description, responsable: t.responsable,
          echeance: t.echeance, statut: t.statut, priority: t.priority || false, priorityFrom: t.priorityFrom||null, completedAt: t.completedAt
        });
      });
    });
    // Direct project tasks
    (p.directTasks||[]).forEach(t => {
      out.push({
        projectId: p.id, projectPath: getProjectPath(p.id), projectColor: p.color,
        origin: 'direct', originLabel: '— Direct', source: null,
        seanceId: null, pageId: null,
        taskId: t.id, description: t.description, responsable: t.responsable,
        echeance: t.echeance, statut: t.statut, priority: t.priority || false, priorityFrom: t.priorityFrom||null, completedAt: t.completedAt
      });
    });
    // Suivi continu (evolvingPV)
    getEPV(p.id).forEach(entry => {
      (entry.taches||[]).forEach(t => {
        out.push({
          projectId: p.id, projectPath: getProjectPath(p.id), projectColor: p.color,
          origin: 'epv', originLabel: 'Suivi : ' + (entry.date||''), source: null,
          seanceId: null, pageId: null, epvId: entry.id,
          taskId: t.id, description: t.description, responsable: t.responsable,
          echeance: t.echeance, statut: t.statut, priority: t.priority || false, priorityFrom: t.priorityFrom||null, completedAt: t.completedAt
        });
      });
    });
  });
  return out;
}

/* ============== ONE NOTE IMPORT PARSER ============== */
function parseOneNoteText(raw){
  const lines = raw.split(/\r?\n/);
  const checkboxRegex = /^\s*(?:[-*•]\s*)?(\[x\]|\[X\]|\[\s?\]|☑|✔|✓|☐|□|❑)\s*(.+)$/;
  const doneMarkers = ['[x]','[X]','☑','✔','✓'];
  const tasks = [];
  lines.forEach(line => {
    const m = line.match(checkboxRegex);
    if(m){
      const text = m[2].trim();
      if(text){
        tasks.push({ id: uid(), description: text, responsable: '', echeance: '', statut: doneMarkers.includes(m[1]) ? 'fait' : 'à faire' });
      }
    }
  });
  return tasks;
}

/* ============== STORAGE ============== */
async function loadData(){
  try{
    const raw = localStorage.getItem('tracker-data');
    const parsed = raw ? JSON.parse(raw) : defaultData();
    parsed.projects = parsed.projects || [];
    parsed.seances = parsed.seances || {};
    parsed.pages = parsed.pages || {};
    parsed.quickNotes = parsed.quickNotes || [];
    parsed.calendar = parsed.calendar || { rows:[], events:[] };
    parsed.calendar.rows = parsed.calendar.rows || [];
    parsed.calendar.events = parsed.calendar.events || [];
    parsed.evolvingPV = parsed.evolvingPV || {};
    state.data = parsed;
  }catch(e){
    state.data = defaultData();
  }
}
async function saveData(){
  try{
    localStorage.setItem('tracker-data', JSON.stringify(state.data));
  }catch(e){
    showBanner("Échec de la sauvegarde — stockage local plein ou indisponible.");
  }
}
function persistAndRender(){ render(); saveData(); }
function showBanner(msg, type){
  state.banner = msg;
  state.bannerType = type || 'error';
  render();
  setTimeout(()=>{ state.banner = null; render(); }, type==='info' ? 8000 : 4000);
}

/* ============== SHARED MARKUP HELPERS ============== */
function taskRowHtml(t,i){
  return '<div class="epv-task-row" style="padding:10px 12px;gap:8px;flex-direction:column;">' +
    '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;flex:1;width:100%;">' +
      '<input type="text" data-field="task-desc" data-idx="'+i+'" value="'+escapeHtml(t.description||'')+'" placeholder="Description de la tâche…" style="padding:8px 10px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.86rem;">' +
      '<input type="text" data-field="task-resp" data-idx="'+i+'" value="'+escapeHtml(t.responsable||'')+'" placeholder="Responsable" style="padding:8px 10px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.84rem;width:130px;">' +
      '<input type="date" data-field="task-date" data-idx="'+i+'" value="'+escapeHtml(t.echeance||'')+'" style="padding:7px 8px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.82rem;">' +
      '<button type="button" title="Pas d\'échéance" style="padding:6px 8px;border-radius:6px;border:1px solid var(--paper-line);background:none;font-size:.76rem;color:var(--ink-soft);cursor:pointer;white-space:nowrap;" data-action="clear-prev-date">∅ Aucune</button>' +
      '<select data-field="task-statut" data-idx="'+i+'" class="status-select" style="border-left:3px solid '+STATUS_COLOR[t.statut||'à faire']+';color:'+STATUS_COLOR[t.statut||'à faire']+';">' +
        STATUS_LIST.map(s=>'<option value="'+s+'"'+(t.statut===s?' selected':'')+'>'+s+'</option>').join('') +
      '</select>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:12px;">' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:.8rem;cursor:pointer;color:var(--ink-soft);">' +
        '<input type="checkbox" class="epv-task-priority" data-idx="'+i+'" style="width:13px;height:13px;accent-color:#7A5800;"' + (t.priority?' checked':'') + ' onchange="const w=this.closest(\'.epv-task-row\').querySelector(\'.epv-prio-date-wrap\');if(w)w.style.display=this.checked?\'flex\':\'none\'"> ⭐ Prioritaire' +
      '</label>' +
      '<div class="epv-prio-date-wrap" style="display:'+(t.priority&&t.priorityFrom?'flex':'none')+';align-items:center;gap:8px;">' +
        '<label style="display:flex;align-items:center;gap:5px;font-size:.78rem;color:var(--ink-soft);">' +
          '<input type="radio" class="epv-prio-when" value="now"'+(t.priorityFrom?'':' checked')+' style="accent-color:#7A5800;"> Maintenant' +
        '</label>' +
        '<label style="display:flex;align-items:center;gap:5px;font-size:.78rem;color:var(--ink-soft);">' +
          '<input type="radio" class="epv-prio-when" value="later"'+(t.priorityFrom?' checked':'')+' style="accent-color:#7A5800;"> À partir du' +
          '<input type="date" class="epv-prio-date" value="'+escapeHtml(t.priorityFrom||'')+'" style="padding:4px 7px;border:1px solid var(--paper-line);border-radius:5px;font-family:inherit;font-size:.78rem;margin-left:4px;">' +
        '</label>' +
      '</div>' +
      '<button class="icon-btn" data-action="remove-task" data-idx="'+i+'" title="Supprimer" style="margin-left:auto;color:var(--stamp-red);opacity:.6;">' + ICONS.trash + '</button>' +
    '</div>' +
  '</div>';
}
function currentDraftTasks(){
  if(state.view==='seance-edit' && state.draftSeance) return state.draftSeance.taches;
  if(state.view==='page-edit' && state.draftPage) return state.draftPage.taches;
  return null;
}

