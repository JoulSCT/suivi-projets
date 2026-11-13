"use strict";

/* ============== EVENT DELEGATION ============== */
document.getElementById('app').addEventListener('click', function(e){
  const el = e.target.closest('[data-action]');
  if(!el) return;
  // Don't fire click during a drag operation
  if(state.dragProjectId && el.classList.contains('project-tab')) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');
  const pid = el.getAttribute('data-pid');
  const idx = el.getAttribute('data-idx');

  // Quitter le mode "résultats de recherche" dès qu'une action de
  // navigation (ou toute autre action) est déclenchée — sauf celle qui
  // sert justement à effacer la recherche.
  if(action !== 'clear-search') state.searchQuery = '';

  switch(action){
    case 'clear-search': state.searchQuery=''; render(); break;
    case 'open-dashboard': openDashboard(); break;
    case 'open-home': openHome(); break;
    case 'open-calendar': openCalendar(); break;
    case 'open-project': openProject(id); break;

    case 'cal-prev-year': state.calYear--; render(); break;
    case 'cal-next-year': state.calYear++; render(); break;

    case 'add-cal-event-standalone':
      state.modal = { type:'cal-event', isNew:true, rowId:null, event:{ colorClass:'ec-rose', text:'', year:state.calYear } };
      render(); break;
    case 'add-cal-note': {
      const noteRowId = el.getAttribute('data-row-id');
      const noteMonth = Number(el.getAttribute('data-month'));
      const noteYear = Number(el.getAttribute('data-year'));
      if(e.target.closest('.cal-event')) break;
      state.modal = { type:'cal-note', isNew:true, note:{ rowId:noteRowId, month:noteMonth, year:noteYear, text:'' } };
      render(); break;
    }
    case 'edit-cal-note': {
      const noteToEdit = (state.data.calendar.cellNotes||[]).find(n=>n.id===id);
      if(noteToEdit) { state.modal = { type:'cal-note', isNew:false, note:{...noteToEdit} }; render(); }
      break;
    }
    case 'save-cal-note': {
      const noteText = document.getElementById('cn-text').value.trim();
      const nm = state.modal.note;
      if(!state.data.calendar.cellNotes) state.data.calendar.cellNotes = [];
      if(!noteText){
        // Empty text: remove the note if it existed, otherwise just close.
        state.data.calendar.cellNotes = state.data.calendar.cellNotes.filter(n=>n.id!==nm.id);
      } else if(state.modal.isNew){
        state.data.calendar.cellNotes.push({ id:uid(), rowId:nm.rowId, year:nm.year, month:nm.month, text:noteText });
      } else {
        const n = state.data.calendar.cellNotes.find(x=>x.id===nm.id);
        if(n) n.text = noteText;
      }
      state.modal=null; persistAndRender(); break;
    }
    case 'delete-cal-note': {
      const nm2 = state.modal.note;
      state.data.calendar.cellNotes = (state.data.calendar.cellNotes||[]).filter(n=>n.id!==nm2.id);
      state.modal=null; persistAndRender(); break;
    }
    case 'edit-cal-event': {
      e.stopPropagation();
      const ev2 = state.data.calendar.events.find(x=>x.id===id);
      if(ev2) state.modal = { type:'cal-event', isNew:false, event:{...ev2} };
      render(); break;
    }
    case 'save-cal-event': {
      const m2 = state.modal;
      const text = document.getElementById('ce-text').value.trim();
      const responsable = document.getElementById('ce-responsable').value.trim();
      const category = document.getElementById('ce-category').value.trim();
      const start = Number(document.getElementById('ce-start').value);
      const end = Math.max(start, Number(document.getElementById('ce-end').value));
      const yearVal = Number(document.getElementById('ce-year').value) || state.calYear;
      const colorClass = document.getElementById('ce-color').value;
      const recurring = document.getElementById('ce-recurring') ? document.getElementById('ce-recurring').checked : false;
      const reminderOn = document.getElementById('ce-reminder-on') && document.getElementById('ce-reminder-on').checked;
      const reminder = reminderOn ? {
        active: true,
        amount: Number(document.getElementById('ce-rem-amount').value)||1,
        unit: document.getElementById('ce-rem-unit').value||'mois',
        recurring: document.getElementById('ce-rem-recurring') ? document.getElementById('ce-rem-recurring').checked : false
      } : { active: false };
      if(!text) { state.modal=null; render(); break; }
      if(m2.isNew){
        // No existing row to attach to: create one to match this event
        // (a row is always 1:1 with its defining event — no separate
        // "group creation" step anymore).
        const newRowId = uid();
        state.data.calendar.rows.push({ id:newRowId, label:text, sub:responsable, category });
        state.data.calendar.events.push({ id:uid(), rowId:newRowId, year:yearVal, startMonth:start, endMonth:end, colorClass, text, responsable, recurring, reminder });
      } else {
        const ev3 = state.data.calendar.events.find(x=>x.id===m2.event.id);
        if(ev3){
          ev3.text=text; ev3.responsable=responsable; ev3.startMonth=start; ev3.endMonth=end; ev3.year=yearVal; ev3.colorClass=colorClass; ev3.recurring=recurring; ev3.reminder=reminder;
          const r = state.data.calendar.rows.find(x=>x.id===ev3.rowId);
          if(r){ r.label=text; r.sub=responsable; r.category=category; }
        }
      }
      state.modal=null; persistAndRender(); break;
    }
    case 'delete-cal-event': {
      const evId = state.modal.event && state.modal.event.id;
      state.modal = { type:'confirm-delete', message:'Supprimer cet événement et toutes ses notes ?',
        pendingAction:()=>{
          const delEv = state.data.calendar.events.find(x=>x.id===evId);
          const delRowId = delEv && delEv.rowId;
          state.data.calendar.events = state.data.calendar.events.filter(x=>x.id!==evId);
          if(delRowId){
            state.data.calendar.rows = state.data.calendar.rows.filter(r=>r.id!==delRowId);
            state.data.calendar.cellNotes = (state.data.calendar.cellNotes||[]).filter(n=>n.rowId!==delRowId);
          }
          state.modal=null; persistAndRender();
        }
      };
      render(); break;
    }

    case 'add-quick-note': {
      const inp = document.getElementById('qn-input');
      const text = inp ? inp.value.trim() : state.homeNoteInput;
      if(text){
        if(!state.data.quickNotes) state.data.quickNotes = [];
        state.data.quickNotes.push({ id:uid(), text, done:false, createdAt:todayStr() });
        state.homeNoteInput = '';
        persistAndRender();
      }
      break;
    }
    case 'toggle-quick-note': {
      const note = (state.data.quickNotes||[]).find(n=>n.id===id);
      if(note){ note.done = !note.done; persistAndRender(); }
      break;
    }
    case 'edit-quick-note': {
      state.editingQuickNoteId = id;
      render();
      const editInp = document.querySelector('.quick-note-edit-input[data-id="'+id+'"]');
      if(editInp){ editInp.focus(); editInp.select(); }
      break;
    }
    case 'delete-quick-note': {
      const vidx2 = el.getAttribute('data-id');
      state.modal = { type:'confirm-delete', message:'Supprimer cette note ?',
        pendingAction:()=>{ state.data.quickNotes=(state.data.quickNotes||[]).filter(n=>n.id!==vidx2); state.modal=null; persistAndRender(); }
      };
      render(); break;
    }
    case 'clear-done-notes': {
      state.modal = { type:'confirm-delete', message:'Supprimer toutes les notes terminées ?',
        pendingAction:()=>{ state.data.quickNotes=(state.data.quickNotes||[]).filter(n=>!n.done); state.modal=null; persistAndRender(); }
      };
      render(); break;
    }

    case 'open-seance': openSeance(pid, id); break;
    case 'new-seance': newSeance(id); break;
    case 'edit-seance': editSeance(pid, id); break;
    case 'edit-page': editPage(pid, id); break;
    case 'delete-seance': deleteSeance(pid, id); break;
    case 'cancel-seance-edit': state.view = state.currentSeanceId ? 'seance-view' : 'project'; state.draftSeance=null; render(); break;
    case 'save-seance': saveSeance(); break;
    case 'add-conclusion': {
      const list3 = document.getElementById('conclusions-list');
      if(list3){
        const idx4 = list3.querySelectorAll('.rte-body[id^="s-conclusion-"]').length;
        const rteid2 = 's-conclusion-'+idx4;
        const row5 = document.createElement('div');
        row5.className='dyn-row'; row5.style.cssText='align-items:flex-start;gap:8px;';
        row5.innerHTML = '<div style="flex:1;">'+rteHtml(rteid2,'','Conclusion '+(idx4+1)+'…')+'</div>'+
          '<button type="button" class="icon-btn" data-action="remove-conclusion" data-idx="'+idx4+'" style="margin-top:8px;">'+ICONS.trash+'</button>';
        list3.appendChild(row5);
        // Wire RTE buttons for the new conclusion
        row5.querySelectorAll('[data-rte]').forEach(btn=>{
          btn.addEventListener('mousedown',function(e){
            e.preventDefault();
            const el2=document.getElementById(this.getAttribute('data-rte-target'));
            if(!el2) return; el2.focus();
            const cmd=this.getAttribute('data-rte'), col=this.getAttribute('data-rte-color');
            if(cmd==='highlight') document.execCommand('backColor',false,col);
            else if(cmd==='removeFormat'){document.execCommand('removeFormat',false,null);document.execCommand('backColor',false,'transparent');}
            else document.execCommand(cmd,false,null);
          });
        });
        document.getElementById(rteid2).focus();
      }
      break;
    }
    case 'remove-conclusion':
      state.draftSeance.conclusions.splice(Number(idx),1);
      if(state.draftSeance.conclusions.length===0) state.draftSeance.conclusions.push('');
      render(); break;

    case 'open-page': openPage(pid, id); break;
    case 'new-page': newPage(id); break;
    case 'back-to-pages':
      state.view='project'; state.currentPageId=null; state.projectTab='pages'; render(); break;
    case 'back-to-seances':
      state.view='project'; state.currentSeanceId=null; state.projectTab='seances'; render(); break;
    case 'delete-page': deletePage(pid, id); break;
    case 'cancel-page-edit': state.view = state.currentPageId ? 'page-view' : 'project'; state.projectTab='pages'; state.draftPage=null; render(); break;
    case 'save-page': savePage(); break;
    case 'open-import-modal': state.modal = { type:'import', projectId:id }; render(); break;
    case 'save-import': saveImport(); break;
    case 'open-import-pv-modal':
      state.modal = { type:'pv-import', pv:null }; render();
      // Wire the file input after render
      setTimeout(()=>{
        const inp = document.getElementById('pv-file-input');
        if(inp) inp.addEventListener('change', function(){
          const file = this.files[0]; if(!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            try {
              const pv = JSON.parse(ev.target.result);
              state.modal = { type:'pv-import', pv };
              render();
            } catch(e){ showBanner('Fichier JSON invalide : '+e.message); }
          };
          reader.readAsText(file);
        });
      }, 100);
      break;

    case 'save-pv-import': {
      const pv2 = state.modal.pv; if(!pv2) break;
      // Collect group→project assignments
      const selectors = document.querySelectorAll('.pv-proj-select');
      const groupMap = {};
      selectors.forEach(sel => { groupMap[sel.getAttribute('data-groupe')] = sel.value; });

      // Collect checked tasks
      const checkboxes = document.querySelectorAll('.pv-task-check');
      const allImportTasks = [...(pv2.taches||[]).map(t=>({...t,_done:false})), ...(pv2.tachesTerminees||[]).map(t=>({...t,_done:true}))];
      let imported = 0;
      const byProject = {};

      // Group checked tasks by target project
      let taskIdx = 0;
      const groupKeys = {};
      allImportTasks.forEach((t,i) => {
        const nom = t.projet||'(Non attribué)';
        if(!groupKeys[nom]) groupKeys[nom]=0;
        const key2 = encodeURIComponent(nom)+'-'+groupKeys[nom];
        groupKeys[nom]++;
        const cb = [...checkboxes].find(c=>c.getAttribute('data-key')===key2);
        if(!cb || !cb.checked) return;
        const pid = groupMap[nom];
        if(!pid) return;
        if(!byProject[pid]) byProject[pid]=[];
        const statut = PV_STATUT_MAP[t.statut]||(t._done?'fait (R.A.)':'à faire');
        byProject[pid].push({ id:uid(), description:t.titre||t.description||'', responsable:'', echeance:'', statut, priority:false, completedAt: t._done?(pv2.date||todayStr()):undefined });
        imported++;
      });

      // Create one séance per project with its tasks
      const notes2 = [pv2.pointsForts, pv2.pointsVigilance, pv2.notesDiverses].filter(Boolean).join('\n\n');
      Object.entries(byProject).forEach(([pid, tasks]) => {
        if(!state.data.seances[pid]) state.data.seances[pid]=[];
        state.data.seances[pid].push({ id:uid(), title:pv2.document||'PV importé', date:pv2.date||todayStr(), participants:[], notes:notes2, conclusions:pv2.datesCles?[pv2.datesCles]:[], taches:tasks });
      });

      state.modal=null; persistAndRender();
      showBanner(imported+' tâche(s) importée(s) dans '+Object.keys(byProject).length+' projet(s).','success');
      break;
    }

    case 'save-pv-import-all': {
      const pv3 = state.modal.pv; if(!pv3) break;
      const targetId2 = document.getElementById('pv-target-project')?.value;
      const targetProj2 = getProject(targetId2);
      if(!targetProj2){ showBanner('Veuillez choisir un projet cible.'); break; }
      if(!state.data.seances[targetId2]) state.data.seances[targetId2] = [];
      const allTaches = [
        ...(pv3.taches||[]).map(t=>({ id:uid(), description:t.titre||'', responsable:'', echeance:'', statut: PV_STATUT_MAP[t.statut]||'à faire', priority:false })),
        ...(pv3.tachesTerminees||[]).map(t=>({ id:uid(), description:t.titre||'', responsable:'', echeance:'', statut:'fait (R.A.)', completedAt:pv3.date||todayStr(), priority:false }))
      ];
      const notes2 = [pv3.pointsForts, pv3.pointsVigilance, pv3.notesDiverses].filter(Boolean).join('\n\n');
      state.data.seances[targetId2].push({
        id:uid(), title: pv3.document||'PV importé',
        date: pv3.date||todayStr(), participants:[],
        notes: notes2, conclusions: pv3.datesCles ? [pv3.datesCles] : [],
        taches: allTaches
      });
      state.modal=null; persistAndRender();
      showBanner('PV archivé dans « '+targetProj2.name+' » avec toutes les tâches.','success');
      break;
    }
    case 'open-import-json-modal':
      state.modal = { type:'import-json' }; render(); break;
    case 'save-import-json': saveImportJson(); break;

    case 'add-task': {
      const arr = currentDraftTasks();
      if(arr){
        if(state.view==='seance-edit') collectSeanceDraft();
        arr.push({ id:uid(), description:'', responsable:'', echeance:'', statut:'à faire', priority:false });
        render();
      }
      break;
    }
    case 'remove-task': {
      const arr = currentDraftTasks();
      if(arr){
        if(state.view==='seance-edit') collectSeanceDraft();
        arr.splice(Number(idx),1);
        render();
      }
      break;
    }

    case 'set-tab-seances': state.projectTab='seances'; render(); break;
    case 'set-tab-suivi': state.projectTab='suivi'; state.evolvingEntryId=null; render(); break;

    case 'epv-view-entry': state.evolvingEntryId=id; render(); break;
    case 'epv-view-latest': state.evolvingEntryId=null; render(); break;

    case 'epv-new-entry': {
      const pid2 = el.getAttribute('data-pid');
      const entries2 = getEPV(pid2);
      const last = entries2.length ? entries2[entries2.length-1] : null;
      if(last && document.getElementById('epv-date')){
        Object.assign(last, epvCollectEntry(pid2));
      }
      const carried2 = last ? (last.taches||[]).filter(t=>!DONE_STATUSES.includes(t.statut)).map(t=>({...t, id:uid()})) : [];
      if(!state.data.evolvingPV[pid2]) state.data.evolvingPV[pid2] = { entries:[] };
      state.data.evolvingPV[pid2].entries.push({
        id: uid(), date: todayStr(),
        participants: last ? [...(last.participants||[])] : [],
        notes: last ? (last.notes||'') : '',
        conclusions: last && (last.conclusions||[]).filter(c=>c&&c.trim()).length
          ? [...last.conclusions.filter(c=>c&&c.trim()), '']
          : [''],
        taches: carried2
      });
      state.evolvingEntryId = null;
      state.evolvingEditMode = true;
      persistAndRender(); break;
    }
    case 'epv-save': {
      const pid3 = el.getAttribute('data-pid');
      if(!state.data.evolvingPV[pid3]) state.data.evolvingPV[pid3] = { entries:[] };
      const entries3 = state.data.evolvingPV[pid3].entries;
      const collected = epvCollectEntry(pid3);
      if(entries3.length === 0){
        entries3.push({ id:uid(), ...collected });
      } else {
        const last3 = entries3[entries3.length-1];
        Object.assign(last3, collected);
      }
      state.evolvingEditMode = false;
      state._epvDraft = null;
      persistAndRender();
      break;
    }
    case 'epv-enter-edit': state.evolvingEditMode = true; render(); break;
    case 'epv-delete-latest': {
      const pid4 = el.getAttribute('data-pid');
      state.modal = { type:'confirm-delete', message:'Supprimer cette entrée de suivi ? Les données seront perdues.',
        pendingAction:()=>{
          if(state.data.evolvingPV[pid4] && state.data.evolvingPV[pid4].entries.length)
            state.data.evolvingPV[pid4].entries.pop();
          state.modal=null; persistAndRender();
        }
      }; render(); break;
    }
    case 'epv-add-conclusion': {
      const list = document.getElementById('epv-conclusions-list');
      if(list){
        const idx2 = list.querySelectorAll('.rte-body[id^="epv-conclusion-"]').length;
        const rteid = 'epv-conclusion-'+idx2;
        const row = document.createElement('div');
        row.className='dyn-row epv-conclusion-row';
        row.style.cssText='gap:8px;align-items:flex-start;';
        row.innerHTML = '<div style="flex:1;">'+rteHtml(rteid,'','Conclusion '+(idx2+1)+'…')+'</div>'+
          '<button type="button" class="icon-btn" data-action="epv-del-conclusion" data-idx="'+idx2+'" style="margin-top:8px;">'+ICONS.trash+'</button>';
        list.appendChild(row);
        // Wire the new RTE buttons
        row.querySelectorAll('[data-rte]').forEach(btn=>{
          btn.addEventListener('mousedown',function(e){
            e.preventDefault();
            const el2=document.getElementById(this.getAttribute('data-rte-target'));
            if(!el2) return; el2.focus();
            const cmd=this.getAttribute('data-rte'), color2=this.getAttribute('data-rte-color');
            if(cmd==='highlight') document.execCommand('backColor',false,color2);
            else if(cmd==='removeFormat'){document.execCommand('removeFormat',false,null);document.execCommand('backColor',false,'transparent');}
            else document.execCommand(cmd,false,null);
          });
        });
        document.getElementById(rteid).focus();
      } break;
    }
    case 'epv-del-conclusion': {
      const row2 = el.closest('.dyn-row'); if(row2) row2.remove(); break;
    }
    case 'epv-add-task': {
      const list2 = document.getElementById('epv-tasks-list');
      if(list2){
        const idx3 = list2.querySelectorAll('.epv-task-desc').length;
        const row3 = document.createElement('div');
        row3.className='epv-task-row';
        row3.style.cssText='padding:10px 12px;gap:8px;flex-direction:column;';
        row3.innerHTML =
          '<div style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:8px;align-items:center;width:100%;">' +
            '<input type="text" class="epv-task-desc" data-idx="'+idx3+'" placeholder="Description de la tâche…" style="padding:8px 10px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.86rem;">' +
            '<input type="text" class="epv-task-resp" data-idx="'+idx3+'" placeholder="Responsable" style="padding:8px 10px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.84rem;width:110px;">' +
            '<input type="date" class="epv-task-date" data-idx="'+idx3+'" style="padding:7px 8px;border-radius:6px;border:1px solid var(--paper-line);font-family:inherit;font-size:.82rem;">' +
            '<button type="button" title="Pas d\'échéance" style="padding:5px 8px;border-radius:6px;border:1px solid var(--paper-line);background:none;font-size:.72rem;color:var(--ink-soft);cursor:pointer;white-space:nowrap;" data-action="clear-prev-date">∅</button>' +
            '<select class="status-select epv-task-statut" data-idx="'+idx3+'" style="border-left:3px solid '+STATUS_COLOR['à faire']+';color:'+STATUS_COLOR['à faire']+';">' +
              STATUS_LIST.map(s=>'<option>'+s+'</option>').join('') +
            '</select>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:.8rem;cursor:pointer;color:var(--ink-soft);">' +
              '<input type="checkbox" class="epv-task-priority" data-idx="'+idx3+'" style="width:13px;height:13px;accent-color:#7A5800;" onchange="const w=this.closest(\'.epv-task-row\').querySelector(\'.epv-prio-date-wrap\');if(w)w.style.display=this.checked?\'flex\':\'none\'"> ⭐ Prioritaire' +
            '</label>' +
            '<div class="epv-prio-date-wrap" style="display:none;align-items:center;gap:8px;">' +
              '<label style="display:flex;align-items:center;gap:5px;font-size:.78rem;color:var(--ink-soft);">' +
                '<input type="radio" class="epv-prio-when" value="now" checked style="accent-color:#7A5800;"> Maintenant' +
              '</label>' +
              '<label style="display:flex;align-items:center;gap:5px;font-size:.78rem;color:var(--ink-soft);">' +
                '<input type="radio" class="epv-prio-when" value="later" style="accent-color:#7A5800;"> À partir du' +
                '<input type="date" class="epv-prio-date" style="padding:4px 7px;border:1px solid var(--paper-line);border-radius:5px;font-family:inherit;font-size:.78rem;margin-left:4px;">' +
              '</label>' +
            '</div>' +
            '<button type="button" class="icon-btn" data-action="epv-del-task" style="margin-left:auto;">'+ICONS.trash+'</button>' +
          '</div>';
        list2.appendChild(row3);
        row3.querySelector('input').focus();
      } break;
    }
    case 'epv-del-task': {
      const row4 = el.closest('.epv-task-row'); if(row4) row4.remove(); break;
    }
    case 'epv-export': {
      epvExport(el.getAttribute('data-pid')); break;
    }
    case 'set-tab-pages': state.projectTab='pages'; render(); break;
    case 'set-tab-taches': state.projectTab='taches'; render(); break;

    case 'open-prioritaires-tab':
      state.view='dashboard'; state.dashboardTab='prioritaires'; state.currentProjectId=null; render(); break;
    case 'db-tab-taches': state.dashboardTab='taches'; render(); break;
    case 'db-tab-taches-home':
      state.view='dashboard'; state.dashboardTab='taches'; state.currentProjectId=null;
      state.dashboardFilters = { projet:'all', statut:'all', origine:'all', responsable:'all', onlyOverdue:false };
      render(); break;
    case 'db-overdue-home':
      state.view='dashboard'; state.dashboardTab='taches'; state.currentProjectId=null;
      state.dashboardFilters = { projet:'all', statut:'all', origine:'all', responsable:'all', onlyOverdue:true };
      render(); break;
    case 'db-tab-vigilances': state.dashboardTab='vigilances'; render(); break;
    case 'db-tab-ra': state.dashboardTab='ra'; render(); break;
    case 'db-tab-prioritaires': state.dashboardTab='prioritaires'; render(); break;
    case 'print-ra': window.print(); break;

    case 'add-direct-task': {
      const descEl = document.getElementById('direct-task-desc'); const desc = (descEl ? descEl.value : '').trim();
      if(!desc) break;
      const proj = getProject(el.getAttribute('data-pid'));
      if(!proj) break;
      if(!proj.directTasks) proj.directTasks = [];
      const isPrio = document.getElementById('direct-task-priority') && document.getElementById('direct-task-priority').checked;
      const prioWhen = document.querySelector('[name="direct-prio-when"]:checked');
      const prioDate = document.getElementById('direct-prio-date') && document.getElementById('direct-prio-date').value;
      proj.directTasks.push({
        id: uid(),
        description: desc,
        responsable: (document.getElementById('direct-task-resp')||{}).value||'',
        echeance: (document.getElementById('direct-task-date')||{}).value||'',
        statut: (document.getElementById('direct-task-statut')||{}).value||'à faire',
        priority: isPrio || false,
        priorityFrom: (isPrio && prioWhen && prioWhen.value==='later' && prioDate) ? prioDate : null
      });
      persistAndRender(); break;
    }
    case 'prio-mark-done': {
      const pmId = el.getAttribute('data-task-id');
      const pmPid = el.getAttribute('data-project-id');
      state.modal = {
        type: 'confirm-delete',
        message: 'Marquer cette tâche comme traitée ?\n\nAjouter au Rapport d\'Activités ?',
        confirmLabel: '✓ Traiter + R.A.',
        cancelLabel: '✓ Traiter sans R.A.',
        pendingAction: () => {
          let pmTask = null;
          for(const s of getSeances(pmPid)){ pmTask=(s.taches||[]).find(x=>x.id===pmId); if(pmTask) break; }
          if(!pmTask) for(const pg of getPages(pmPid)){ pmTask=(pg.taches||[]).find(x=>x.id===pmId); if(pmTask) break; }
          if(!pmTask){ const p=getProject(pmPid); pmTask=(p&&p.directTasks||[]).find(x=>x.id===pmId); }
          if(!pmTask) getEPV(pmPid).forEach(e=>{ if(!pmTask) pmTask=(e.taches||[]).find(x=>x.id===pmId); });
          if(pmTask){ setTaskStatut(pmTask,'fait (R.A.)'); pmTask.priority=false; }
          state.modal=null; persistAndRender();
        },
        secondaryAction: () => {
          let pmTask = null;
          for(const s of getSeances(pmPid)){ pmTask=(s.taches||[]).find(x=>x.id===pmId); if(pmTask) break; }
          if(!pmTask) for(const pg of getPages(pmPid)){ pmTask=(pg.taches||[]).find(x=>x.id===pmId); if(pmTask) break; }
          if(!pmTask){ const p=getProject(pmPid); pmTask=(p&&p.directTasks||[]).find(x=>x.id===pmId); }
          if(!pmTask) getEPV(pmPid).forEach(e=>{ if(!pmTask) pmTask=(e.taches||[]).find(x=>x.id===pmId); });
          if(pmTask){ setTaskStatut(pmTask,'fait'); pmTask.priority=false; }
          state.modal=null; persistAndRender();
        }
      };
      render(); break;
    }
    case 'toggle-priority': {
      const tpId     = el.getAttribute('data-task-id');
      const tpProjId = el.getAttribute('data-project-id');
      // Find the task first to know its current priority state
      let foundTask = null;
      for(const s of getSeances(tpProjId)){ foundTask=(s.taches||[]).find(x=>x.id===tpId); if(foundTask) break; }
      if(!foundTask) for(const pg of getPages(tpProjId)){ foundTask=(pg.taches||[]).find(x=>x.id===tpId); if(foundTask) break; }
      if(!foundTask){ const proj=getProject(tpProjId); foundTask=(proj&&proj.directTasks||[]).find(x=>x.id===tpId); }
      if(!foundTask){ const epv=state.data.evolvingPV[tpProjId]; if(epv) for(const entry of (epv.entries||[])){ foundTask=(entry.taches||[]).find(x=>x.id===tpId); if(foundTask) break; } }

      if(!foundTask) break;
      if(foundTask.priority){
        // Deactivating — do it immediately
        foundTask.priority = false; foundTask.priorityFrom = null;
        persistAndRender();
      } else {
        // Activating — open scheduling modal
        state.modal = { type:'priority-schedule', taskId:tpId, projectId:tpProjId };
        render();
      }
      break;
    }
    case 'confirm-priority-now': {
      const m = state.modal; if(!m) break;
      const t = findTaskById(m.taskId, m.projectId);
      if(t){ t.priority = true; t.priorityFrom = null; }
      state.modal = null; persistAndRender(); break;
    }
    case 'confirm-priority-later': {
      const m = state.modal; if(!m) break;
      const dateVal = document.getElementById('prio-date')?.value;
      if(!dateVal){ showBanner('Veuillez choisir une date.'); break; }
      const t = findTaskById(m.taskId, m.projectId);
      if(t){ t.priority = true; t.priorityFrom = dateVal; }
      state.modal = null; persistAndRender();
      showBanner('Tâche planifiée en prioritaire à partir du '+fmtDate(dateVal)+'.','success');
      break;
    }
    case 'delete-task': {
      const dtTaskId  = el.getAttribute('data-task-id');
      const dtProjId  = el.getAttribute('data-project-id');
      const dtOrigin  = el.getAttribute('data-origin');
      const dtSeance  = el.getAttribute('data-seance-id');
      const dtPage    = el.getAttribute('data-page-id');
      function removeTask(arr){ const i=arr.findIndex(x=>x.id===dtTaskId); if(i>=0) arr.splice(i,1); }
      state.modal = { type:'confirm-delete', message:'Supprimer définitivement cette tâche ?',
        pendingAction:()=>{
          if(dtOrigin==='page' && dtPage){
            const pg=getPages(dtProjId).find(x=>x.id===dtPage); if(pg) removeTask(pg.taches||[]);
          } else if(dtOrigin==='seance' && dtSeance){
            const s=getSeances(dtProjId).find(x=>x.id===dtSeance); if(s) removeTask(s.taches||[]);
          } else {
            const proj3=getProject(dtProjId);
            if(proj3&&(proj3.directTasks||[]).find(x=>x.id===dtTaskId)) removeTask(proj3.directTasks);
            else {
              let found = false;
              for(const s of getSeances(dtProjId)){ if(s.taches&&s.taches.find(x=>x.id===dtTaskId)){removeTask(s.taches);found=true;break;} }
              if(!found) for(const pg of getPages(dtProjId)){ if(pg.taches&&pg.taches.find(x=>x.id===dtTaskId)){removeTask(pg.taches);break;} }
              if(!found) getEPV(dtProjId).forEach(entry=>{ if(entry.taches&&entry.taches.find(x=>x.id===dtTaskId)) removeTask(entry.taches); });
            }
          }
          state.modal=null; persistAndRender();
        }
      }; render(); break;
    }
    case 'open-edit-task': {
      const projectId = el.getAttribute('data-project-id');
      const taskId    = el.getAttribute('data-task-id');
      const origin    = el.getAttribute('data-origin');
      const seanceId  = el.getAttribute('data-seance-id');
      const pageId    = el.getAttribute('data-page-id');
      let foundTask = null;
      if(origin === 'page' && pageId){
        const pg = getPages(projectId).find(x=>x.id===pageId);
        if(pg) foundTask = (pg.taches||[]).find(x=>x.id===taskId);
      } else if(origin === 'seance' && seanceId){
        const s = getSeances(projectId).find(x=>x.id===seanceId);
        if(s) foundTask = (s.taches||[]).find(x=>x.id===taskId);
      }
      if(!foundTask){
        for(const s of getSeances(projectId)){
          foundTask = (s.taches||[]).find(x=>x.id===taskId);
          if(foundTask) break;
        }
      }
      if(!foundTask){
        for(const pg of getPages(projectId)){
          foundTask = (pg.taches||[]).find(x=>x.id===taskId);
          if(foundTask) break;
        }
      }
      if(!foundTask){
        const proj = getProject(projectId);
        foundTask = (proj && proj.directTasks||[]).find(x=>x.id===taskId) || null;
      }
      if(!foundTask){
        getEPV(projectId).forEach(entry => {
          if(!foundTask) foundTask = (entry.taches||[]).find(x=>x.id===taskId) || null;
        });
      }
      if(foundTask){
        state.modal = { type:'edit-task', task:foundTask, projectId, origin, seanceId, pageId };
        render();
      }
      break;
    }
    case 'save-edit-task': {
      const m = state.modal;
      if(!m || !m.task) break;
      m.task.description = document.getElementById('et-desc').value.trim();
      m.task.responsable  = document.getElementById('et-resp').value.trim();
      const noDate = document.getElementById('et-no-date') && document.getElementById('et-no-date').checked;
      m.task.echeance = noDate ? '' : document.getElementById('et-date').value;
      setTaskStatut(m.task, document.getElementById('et-statut').value);

      // Handle move to another project
      const moveToggle = document.getElementById('et-move-toggle');
      const moveTarget = document.getElementById('et-move-target');
      if(moveToggle && moveToggle.checked && moveTarget && moveTarget.value){
        const targetProjId = moveTarget.value;
        const targetProj = getProject(targetProjId);
        if(targetProj && targetProjId !== m.projectId){
          // Remove from current location — try origin hint first, then search every
          // possible location by actual task id (robust even if origin/seanceId is stale).
          const taskCopy = { ...m.task, id: m.task.id };
          const srcProj = getProject(m.projectId);
          let removed = false;
          if(m.origin==='page' && m.pageId){
            const pg = getPages(m.projectId).find(x=>x.id===m.pageId);
            if(pg && (pg.taches||[]).find(x=>x.id===taskCopy.id)){ pg.taches = pg.taches.filter(x=>x.id!==taskCopy.id); removed = true; }
          } else if(m.origin==='seance' && m.seanceId){
            const s = getSeances(m.projectId).find(x=>x.id===m.seanceId);
            if(s && (s.taches||[]).find(x=>x.id===taskCopy.id)){ s.taches = s.taches.filter(x=>x.id!==taskCopy.id); removed = true; }
          }
          if(!removed && srcProj && (srcProj.directTasks||[]).find(x=>x.id===taskCopy.id)){
            srcProj.directTasks = srcProj.directTasks.filter(x=>x.id!==taskCopy.id);
            removed = true;
          }
          if(!removed){
            for(const s of getSeances(m.projectId)){
              if((s.taches||[]).find(x=>x.id===taskCopy.id)){ s.taches = s.taches.filter(x=>x.id!==taskCopy.id); removed = true; break; }
            }
          }
          if(!removed){
            for(const pg of getPages(m.projectId)){
              if((pg.taches||[]).find(x=>x.id===taskCopy.id)){ pg.taches = pg.taches.filter(x=>x.id!==taskCopy.id); removed = true; break; }
            }
          }
          if(!removed){
            getEPV(m.projectId).forEach(entry => {
              if(!removed && (entry.taches||[]).find(x=>x.id===taskCopy.id)){
                entry.taches = entry.taches.filter(x=>x.id!==taskCopy.id);
                removed = true;
              }
            });
          }
          // Add to target project's directTasks
          if(!targetProj.directTasks) targetProj.directTasks = [];
          targetProj.directTasks.push({ ...taskCopy });
          showBanner('Tâche déplacée vers « ' + targetProj.name + ' »', 'success');
        }
      }

      state.modal = null;
      persistAndRender();
      break;
    }

    case 'open-new-project': openNewProjectModal(null); break;
    case 'open-new-subproject': openNewProjectModal(id); break;
    case 'open-edit-project': openEditProjectModal(id); break;
    case 'clear-prev-date': {
      const prev = el.previousElementSibling;
      if(prev && prev.type==='date') prev.value='';
      break;
    }
    case 'close-modal': closeModal(); break;
    case 'save-project': saveProjectModal(id || null); break;
    case 'delete-project': deleteProject(id); break;

    case 'add-vigilance':
      state.modal = { type:'vigilance', projectId:id, idx:null }; render(); break;
    case 'edit-vigilance':
      state.modal = { type:'vigilance', projectId:el.getAttribute('data-id'), idx:Number(idx) }; render(); break;
    case 'delete-vigilance': {
      const vigProjId = el.getAttribute('data-id');
      const vigIdx = Number(idx);
      state.modal = { type:'confirm-delete', message:'Supprimer ce point de vigilance ?',
        pendingAction: () => {
          const p = getProject(vigProjId);
          if(p && p.vigilances) p.vigilances.splice(vigIdx, 1);
          state.modal = null;
          persistAndRender();
        }
      };
      render(); break;
    }
    case 'confirm-delete-ok': {
      if(state.modal && state.modal.pendingAction){
        state.modal.pendingAction();
      } else {
        state.modal = null; render();
      }
      break;
    }
    case 'confirm-secondary-ok': {
      if(state.modal && state.modal.secondaryAction){
        state.modal.secondaryAction();
      } else {
        state.modal = null; render();
      }
      break;
    }
    case 'save-vigilance': {
      const vigEl = document.getElementById('vig-text');
      const text = vigEl ? (vigEl.innerHTML||vigEl.value||'').replace(/&nbsp;/g,' ').trim() : '';
      if(!text) return;
      const pid = el.getAttribute('data-id');
      const vidx = el.getAttribute('data-idx');
      const p = getProject(pid);
      if(!p.vigilances) p.vigilances = [];
      if(vidx !== '' && vidx !== null && vidx !== undefined){
        p.vigilances[Number(vidx)] = { text };
      } else {
        p.vigilances.push({ text });
      }
      state.modal = null;
      persistAndRender();
      break;
    }

    case 'add-development':
      state.modal = { type:'development', projectId:id, idx:null }; render(); break;
    case 'edit-development':
      state.modal = { type:'development', projectId:el.getAttribute('data-id'), idx:Number(idx) }; render(); break;
    case 'delete-development': {
      const devProjId = el.getAttribute('data-id');
      const devIdx = Number(idx);
      state.modal = { type:'confirm-delete', message:'Supprimer cette perspective de d\u00e9veloppement ?',
        pendingAction: () => {
          const proj = getProject(devProjId);
          if(proj && proj.developments) proj.developments.splice(devIdx, 1);
          state.modal = null; persistAndRender();
        }
      };
      render(); break;
    }
    case 'save-development': {
      const devEl = document.getElementById('dev-text');
      const devText = devEl ? (devEl.innerHTML||devEl.value||'').replace(/&nbsp;/g,' ').trim() : '';
      if(!devText) break;
      const devPid = el.getAttribute('data-id');
      const devVidx = el.getAttribute('data-idx');
      const devProj = getProject(devPid);
      if(!devProj.developments) devProj.developments = [];
      if(devVidx !== '' && devVidx !== null && devVidx !== undefined){
        devProj.developments[Number(devVidx)] = { text: devText };
      } else {
        devProj.developments.push({ text: devText });
      }
      state.modal = null; persistAndRender(); break;
    }

    case 'export-json': exportJson(); break;
    case 'export-excel': exportExcel(); break;
    case 'export-ra-excel': exportRaExcel(); break;
    case 'export-ra-word': exportRaWord(); break;
    case 'open-import-excel-modal': state.modal = { type:'import-excel' }; render(); break;
    case 'save-import-excel': importFromExcel(); break;
    case 'export-json-from-reminder': exportJson(); state.banner=null; render(); break;
    case 'dismiss-reminder': state.banner=null; stampExportTime(); render(); break;
    case 'reset-data': resetData(); break;

    case 'sort-col': {
      const col = el.getAttribute('data-col');
      if(state.dashSort.col === col){ state.dashSort.dir *= -1; }
      else { state.dashSort.col = col; state.dashSort.dir = 1; }
      render(); break;
    }
    case 'proj-sort-col': {
      const col = el.getAttribute('data-col');
      if(state.projSort.col === col){ state.projSort.dir *= -1; }
      else { state.projSort.col = col; state.projSort.dir = 1; }
      render(); break;
    }
    case 'print-pv': {
      const calHtml = document.querySelector('.cal-wrap');
      if(calHtml){
        const o = '\x3c', c = '\x3e';
        const w = window.open('','_blank','width=1200,height=800');
        if(w){
          w.document.write(o+'html'+c+o+'head'+c+o+'title'+c+'Calendrier '+state.calYear+o+'/title'+c+
            o+'style'+c+
            'body{font-family:Arial,sans-serif;font-size:11px;}' +
            'table{border-collapse:collapse;width:100%;}' +
            'th,td{border:1px solid #ccc;padding:3px 5px;vertical-align:top;}' +
            'th{background:#eef;font-size:10px;text-transform:uppercase;letter-spacing:.05em;}' +
            '.ec-rose{background:#F2C4CA;}.ec-mauve{background:#D4B8E0;}.ec-sage{background:#B8D4C0;}' +
            '.ec-blush{background:#F0D4C4;}.ec-teal{background:#B4D8D4;}.ec-lavender{background:#C8C0E0;}' +
            '.ec-peach{background:#F4C8B0;}.ec-mint{background:#B8E0D0;}' +
            '.cal-event{padding:2px 5px;border-radius:3px;font-size:10px;margin:1px 0;}' +
            '.prep-block{opacity:.5;font-style:italic;}' +
            o+'/style'+c+
            o+'/head'+c+o+'body'+c+
            o+'h2 style="margin:0 0 12px;font-family:Georgia,serif;"'+c+'Calendrier '+state.calYear+o+'/h2'+c+
            calHtml.innerHTML+
            o+'/body'+c+o+'/html'+c);
          w.document.close();
          w.print();
        }
      } else { window.print(); }
      break;
    }

    case 'filter-overdue':
      state.dashboardFilters.onlyOverdue = !state.dashboardFilters.onlyOverdue; render(); break;

    case 'dash-filter-reset':
      state.dashboardFilters.statut = 'all'; state.dashboardFilters.onlyOverdue = false; render(); break;
    case 'dash-filter-statut': {
      const value = el.getAttribute('data-value');
      state.dashboardFilters.onlyOverdue = false;
      state.dashboardFilters.statut = (state.dashboardFilters.statut === value) ? 'all' : value;
      render(); break;
    }
    case 'dash-filter-overdue':
      state.dashboardFilters.statut = 'all';
      state.dashboardFilters.onlyOverdue = !state.dashboardFilters.onlyOverdue;
      render(); break;
  }
});

document.getElementById('app').addEventListener('change', function(e){
  const t = e.target;
  if(t.matches('[data-action="filter-projet"]')){ state.dashboardFilters.projet = t.value; render(); return; }
  if(t.matches('[data-action="filter-statut"]')){ state.dashboardFilters.statut = t.value; render(); return; }
  if(t.matches('[data-action="filter-origine"]')){ state.dashboardFilters.origine = t.value; render(); return; }
  if(t.matches('[data-action="filter-responsable"]')){ state.dashboardFilters.responsable = t.value; render(); return; }
  if(t.matches('[data-action="ra-filter-year"]')){ state.raYear = t.value; render(); return; }
  if(t.matches('[data-action="toggle-quick-note"]')){
    const note = (state.data.quickNotes||[]).find(n=>n.id===t.getAttribute('data-id'));
    if(note){ note.done = t.checked; persistAndRender(); }
    return;
  }
  if(t.matches('.quick-note-edit-input')){
    const note = (state.data.quickNotes||[]).find(n=>n.id===t.getAttribute('data-id'));
    const newText = t.value.trim();
    if(note && newText) note.text = newText;
    state.editingQuickNoteId = null;
    persistAndRender();
    return;
  }

  if(t.matches('[data-field="task-statut"]') || t.matches('[data-field="task-date"]')){
    const arr = currentDraftTasks();
    if(!arr) return;
    const i = Number(t.getAttribute('data-idx'));
    if(t.matches('[data-field="task-statut"]')) arr[i].statut = t.value;
    if(t.matches('[data-field="task-date"]')) arr[i].echeance = t.value;
  }

  if(t.matches('.epv-task-priority')){
    const arr = currentDraftTasks();
    if(arr){
      const i = Number(t.getAttribute('data-idx'));
      if(arr[i]){
        arr[i].priority = t.checked;
        if(!t.checked) arr[i].priorityFrom = null;
      }
    }
  }
  if(t.matches('.epv-prio-when') || t.matches('.epv-prio-date')){
    const arr = currentDraftTasks();
    if(arr){
      const row = t.closest('.epv-task-row');
      const idxInput = row && row.querySelector('.epv-task-priority');
      const i = idxInput ? Number(idxInput.getAttribute('data-idx')) : NaN;
      if(arr[i] && arr[i].priority){
        const whenLater = row.querySelector('.epv-prio-when[value="later"]');
        const dateVal = row.querySelector('.epv-prio-date');
        arr[i].priorityFrom = (whenLater && whenLater.checked && dateVal && dateVal.value) ? dateVal.value : null;
      }
    }
  }

  if(t.matches('[data-field="dash-task-statut"]')){
    const projectId = t.getAttribute('data-project-id');
    const taskId = t.getAttribute('data-task-id');
    const newStatut = t.value;
    const proj = getProject(projectId);
    let task = proj ? (proj.directTasks||[]).find(x=>x.id===taskId) : null;
    if(!task){
      for(const s of getSeances(projectId)){ task = (s.taches||[]).find(x=>x.id===taskId); if(task) break; }
    }
    if(!task){
      for(const pg of getPages(projectId)){ task = (pg.taches||[]).find(x=>x.id===taskId); if(task) break; }
    }
    if(!task){
      for(const entry of getEPV(projectId)){ task = (entry.taches||[]).find(x=>x.id===taskId); if(task) break; }
    }
    if(task) setTaskStatut(task, newStatut);
    persistAndRender();
  }

  if(t.matches('[data-field="proj-task-statut"]')){
    const projectId = t.getAttribute('data-project-id');
    const taskId    = t.getAttribute('data-task-id');
    const isPage    = t.getAttribute('data-is-page') === '1';
    const pageId    = t.getAttribute('data-page-id');
    const newStatut = t.value;
    if(isPage){
      const pg = getPages(projectId).find(x=>x.id===pageId);
      if(pg){ const task=(pg.taches||[]).find(x=>x.id===taskId); if(task) setTaskStatut(task, newStatut); }
    } else {
      for(const s of getSeances(projectId)){
        const task = (s.taches||[]).find(x=>x.id===taskId);
        if(task){ setTaskStatut(task, newStatut); break; }
      }
    }
    persistAndRender();
  }
});

document.getElementById('app').addEventListener('input', function(e){
  const t = e.target;
  if(t.matches('[data-field="task-desc"]')){
    const arr = currentDraftTasks(); if(arr) arr[Number(t.getAttribute('data-idx'))].description = t.value;
  } else if(t.matches('[data-field="task-resp"]')){
    const arr = currentDraftTasks(); if(arr) arr[Number(t.getAttribute('data-idx'))].responsable = t.value;
  } else if(t.id === 'f-participants'){
    state.draftParticipants = t.value;
  } else if(t.id === 'f-date' && state.draftSeance){
    state.draftSeance.date = t.value;
  } else if(t.id === 'f-notes' && state.draftSeance){
    state.draftSeance.notes = t.value;
  } else if(t.id === 'pg-title' && state.draftPage){
    state.draftPage.title = t.value;
  } else if(t.id === 'pg-notes' && state.draftPage){
    state.draftPage.notes = t.value;
  } else if(t.id === 'qn-input'){
    state.homeNoteInput = t.value;
  } else if(t.id === 'global-search-input'){
    state.searchQuery = t.value;
    const pos = t.selectionStart;
    render();
    const el2 = document.getElementById('global-search-input');
    if(el2){ el2.focus(); try{ el2.setSelectionRange(pos, pos); }catch(e2){} }
  }
});

document.getElementById('app').addEventListener('paste', function(e){
  // Force plain-text paste inside rich text editors to avoid importing
  // stray formatting (borders, nested quotes, Outlook/Word markup) that
  // would otherwise pollute the display (e.g. stray left-border bars).
  if(!e.target.classList || !e.target.classList.contains('rte-body')) return;
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
  const html = escapeHtml(text).replace(/\r\n|\r|\n/g, '<br>');
  document.execCommand('insertHTML', false, html);
});

document.getElementById('app').addEventListener('keydown', function(e){
  // Shift+Enter in RTE body: exit list or insert soft line break
  if(e.key === 'Enter' && e.shiftKey && e.target.classList.contains('rte-body')){
    e.preventDefault();
    const sel = window.getSelection();
    if(sel && sel.rangeCount){
      const node = sel.anchorNode;
      const el2 = node && (node.nodeType===3 ? node.parentElement : node);
      const inUl = el2 && el2.closest('ul');
      const inOl = el2 && el2.closest('ol');
      if(inUl){ document.execCommand('insertUnorderedList'); }
      else if(inOl){ document.execCommand('insertOrderedList'); }
      else { document.execCommand('insertHTML', false, '<br>'); }
    }
    return;
  }
  if(e.key === 'Enter' && e.target.id === 'direct-task-desc'){
    const addBtn = document.querySelector('[data-action="add-direct-task"]'); if(addBtn) addBtn.click();
    return;
  }
  if(e.key === 'Enter' && e.target.classList.contains('quick-note-edit-input')){
    e.target.blur();
    return;
  }
  if(e.key === 'Escape' && e.target.classList.contains('quick-note-edit-input')){
    state.editingQuickNoteId = null;
    render();
    return;
  }
  if(e.key === 'Escape' && e.target.id === 'global-search-input'){
    state.searchQuery = '';
    render();
    return;
  }
  if(e.key === 'Enter' && e.target.id === 'qn-input'){
    const text = e.target.value.trim();
    if(text){
      if(!state.data.quickNotes) state.data.quickNotes = [];
      state.data.quickNotes.push({ id:uid(), text, done:false, createdAt:todayStr() });
      state.homeNoteInput = '';
      persistAndRender();
    }
  }
});

