"use strict";

/* ============== CALENDAR VIEW ============== */
const CAL_MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const CAL_COLORS = [
  { key:'ec-rose',    label:'Rose' },
  { key:'ec-mauve',   label:'Mauve' },
  { key:'ec-sage',    label:'Sauge' },
  { key:'ec-blush',   label:'Blush' },
  { key:'ec-teal',    label:'Teal' },
  { key:'ec-lavender',label:'Lavande' },
  { key:'ec-peach',   label:'Pêche' },
  { key:'ec-mint',    label:'Menthe' }
];
const CAL_COLOR_BG = {
  'ec-rose':'#F2C4CA','ec-mauve':'#D4B8E0','ec-sage':'#B8D4C0',
  'ec-blush':'#F0D4C4','ec-teal':'#B4D8D4','ec-lavender':'#C8C0E0',
  'ec-peach':'#F4C8B0','ec-mint':'#B8E0D0'
};
const CAL_COLOR_PREP = {
  'ec-rose':'rgba(242,196,202,0.4)','ec-mauve':'rgba(212,184,224,0.4)','ec-sage':'rgba(184,212,192,0.4)',
  'ec-blush':'rgba(240,212,196,0.4)','ec-teal':'rgba(180,216,212,0.4)','ec-lavender':'rgba(200,192,224,0.4)',
  'ec-peach':'rgba(244,200,176,0.4)','ec-mint':'rgba(184,224,208,0.4)'
};

function openCalendar(){ state.view='calendarView'; render(); }

function renderCalendar(standalone){
  const year = state.calYear;
  const cal = state.data.calendar;
  const rows = cal.rows;
  // Include events for this year OR recurring events from any year
  const events = cal.events.filter(e => e.year===year || e.recurring===true);
  const currentMonth = new Date().getFullYear()===year ? new Date().getMonth() : -1;

  const categories = [...new Set(rows.map(r=>r.category||'').filter(Boolean))];
  const uncategorized = rows.filter(r=>!r.category);
  const grouped = categories.map(cat => ({ cat, rows: rows.filter(r=>r.category===cat) }));

  function renderRow(row){
    const definingEvent = cal.events.find(e=>e.rowId===row.id);
    const labelCell = '<td class="cal-row-label col-label" data-action="edit-cal-event" data-id="'+(definingEvent?definingEvent.id:'')+'" title="Modifier cet événement" style="cursor:pointer;">' +
      '<div class="cal-row-label-inner">' +
        escapeHtml(row.label) +
        (row.sub ? '<span class="cal-row-label-sub">'+escapeHtml(row.sub)+'</span>' : '') +
      '</div>' +
    '</td>';

    const monthCells = CAL_MONTHS_SHORT.map((_,mi) => {
      const monthEvents = events.filter(e=>e.rowId===row.id && mi>=e.startMonth && mi<=e.endMonth);
      // Preparation period events (lighter color, striped).
      // Looks at cal.events directly (not the year-prefiltered `events`) so
      // that a non-recurring event dated for NEXT year, whose prep window
      // bleeds backward into the tail of THIS year, is still found — the
      // year-prefiltered `events` array would exclude it entirely.
      const prepEvents = cal.events.filter(e=>{
        if(e.rowId!==row.id) return false;
        if(!(e.reminder && e.reminder.active)) return false;
        if(monthEvents.find(ev=>ev.id===e.id)) return false; // don't draw prep over the event's own bar
        const isRecurring = e.recurring || (e.reminder && e.reminder.recurring);
        const offsetMonths = e.reminder.unit==='semaine' ? Math.ceil(e.reminder.amount/4.33) : Number(e.reminder.amount)||1;
        const remStart = e.startMonth - offsetMonths;
        const remEnd   = e.startMonth - 1;

        // Portion of the window landing in the SAME year as the occurrence
        // being considered (e.g. remStart=-2,remEnd=0 → only month 0 lands
        // in this year, the rest spilled into the previous year).
        function directPortionMatches(){
          if(remStart >= 0) return mi >= remStart && mi <= remEnd;
          if(remEnd >= 0) return mi >= 0 && mi <= remEnd;
          return false;
        }
        // Portion of the window that spilled backward into the year BEFORE
        // the occurrence (e.g. remStart=-3,remEnd=-1 → all 3 months are in
        // the previous year: [12+remStart, 12+remEnd]).
        function bleedPortionMatches(){
          if(remStart >= 0) return false;
          const wrapStart = 12 + remStart;
          const wrapEnd = remEnd >= 0 ? 11 : 12 + remEnd;
          return mi >= wrapStart && mi <= wrapEnd;
        }

        if(isRecurring){
          // Recurring events repeat identically every year: this tab is
          // simultaneously "this occurrence's year" (direct portion) and
          // "the year before next occurrence" (bleed portion for the NEXT
          // year's prep, landing in this year's tail months).
          return directPortionMatches() || bleedPortionMatches();
        }
        // Non-recurring: only one real occurrence, fixed to e.year.
        if(e.year === year) return directPortionMatches();
        if(e.year === year + 1) return bleedPortionMatches();
        return false;
      });

      const cellNote = (cal.cellNotes||[]).find(n=>n.rowId===row.id && n.year===year && n.month===mi);

      let cellContent = '';
      let cellStyle = '';
      let cellAction = cellNote
        ? 'data-action="edit-cal-note" data-id="'+cellNote.id+'"'
        : 'data-action="add-cal-note" data-row-id="'+row.id+'" data-month="'+mi+'" data-year="'+year+'"';
      if(cellNote){
        cellStyle = 'cursor:pointer;';
        cellContent = '<div style="min-height:42px;display:flex;align-items:center;padding:4px 6px;font-size:.72rem;color:var(--ink-soft);font-style:italic;">'+escapeHtml(cellNote.text)+'</div>';
      }

      // Only show prep from the FIRST matching event per cell to avoid color conflicts
      const firstPrepEv = prepEvents[0] || null;
      if(firstPrepEv){
        const prepBg = CAL_COLOR_PREP[firstPrepEv.colorClass||'ec-rose']||'rgba(224,224,224,0.4)';
        cellStyle = 'background:'+prepBg+';padding:0;cursor:pointer;';
        cellAction = 'data-action="edit-cal-event" data-id="'+firstPrepEv.id+'"';
        cellContent = '<div style="min-height:42px;display:flex;align-items:center;padding:4px 6px;font-size:.66rem;font-style:italic;color:rgba(0,0,0,.4);">Prép.</div>';
      }

      monthEvents.forEach(ev => {
        const isStart = ev.startMonth===mi;
        const isEnd = ev.endMonth===mi;
        const isSolo = isStart && isEnd;
        const isMid = !isStart && !isEnd;
        const bg = CAL_COLOR_BG[ev.colorClass||'ec-rose']||'#E0E0E0';

        if(isMid || isEnd){
          // Full-cell fill via td background — no inner div needed
          cellStyle = 'background:'+bg+';padding:0;cursor:pointer;';
          cellAction = 'data-action="edit-cal-event" data-id="'+ev.id+'"';
          cellContent = '';
        } else {
          // Start cell: color on td, text on top
          cellStyle = 'background:'+bg+';padding:4px 6px;cursor:pointer;border-radius:'+(isSolo?'8px':'8px 0 0 8px')+';';
          cellContent += '<span style="font-size:.7rem;font-weight:500;line-height:1.3;word-break:break-word;display:block;">' +
            escapeHtml(ev.text||'') + (ev.recurring ? ' <span title="Rappel annuel" style="opacity:.7;">↻</span>' : '') +
          '</span>' +
          (ev.responsable ? '<span style="font-size:.62rem;opacity:.7;display:block;margin-top:1px;">'+escapeHtml(ev.responsable)+'</span>' : '');
          cellAction = 'data-action="edit-cal-event" data-id="'+ev.id+'"';
        }
      });

      if(monthEvents.length===0 && prepEvents.length===0 && !cellNote){
        cellContent = '<div class="cal-add-hint">+</div>';
      }
      return '<td class="cal-cell'+(mi===currentMonth?' current-month-cell':'')+'" style="'+cellStyle+'" '+cellAction+'>' + cellContent + '</td>';
    }).join('');

    return '<tr>' + labelCell + monthCells + '</tr>';
  }

  let tableBody = '';
  uncategorized.forEach(r => { tableBody += renderRow(r); });
  grouped.forEach(({cat, rows:catRows}) => {
    tableBody += '<tr class="cal-category-row"><td colspan="13">'+escapeHtml(cat)+'</td></tr>';
    catRows.forEach(r => { tableBody += renderRow(r); });
  });

  const thead = '<thead><tr>' +
    '<th class="cal-th-label col-label">Événement</th>' +
    CAL_MONTHS_SHORT.map((m,i)=>'<th class="cal-th-month col-month'+(i===currentMonth?' current-month':'')+'">' + m + '</th>').join('') +
  '</tr></thead>';

  const emptyHint = rows.length===0
    ? '<div class="empty-state small" style="margin-top:12px;"><p style="margin:0;">Ajoutez un événement avec le bouton <strong>+ Nouvel événement</strong> pour commencer à planifier votre année.</p></div>'
    : '';

  const controls = '<div class="cal-year-bar">' +
    '<button class="cal-year-btn" data-action="cal-prev-year">← '+(year-1)+'</button>' +
    '<span class="cal-year-display">'+year+'</span>' +
    '<button class="cal-year-btn" data-action="cal-next-year">'+(year+1)+' →</button>' +
    '<button class="btn btn-primary no-print" data-action="add-cal-event-standalone" style="margin-left:10px;font-size:.78rem;padding:6px 12px;">+ Nouvel événement</button>' +
    '<button class="btn no-print" data-action="print-pv" style="font-size:.78rem;padding:6px 12px;">Imprimer</button>' +
  '</div>';

  if(standalone){
    return '<p class="eyebrow">Planning</p>' +
      '<h1 class="page-title">Calendrier annuel</h1>' +
      '<p class="page-sub">Cliquez sur une case pour y ajouter une note libre · <strong>↻</strong> = rappel annuel automatique · Cliquez sur un événement pour le modifier</p>' +
      controls +
      '<div class="cal-wrap"><table class="cal-table">' + thead + '<tbody>' + tableBody + '</tbody></table></div>' +
      emptyHint;
  }
  // Inline version for home
  return controls +
    '<div class="cal-wrap"><table class="cal-table">' + thead + '<tbody>' + tableBody + '</tbody></table></div>' +
    emptyHint;
}

function renderCalEventModalInner(){
  const m = state.modal;
  const ev = m.event || {};
  const rem = ev.reminder || {};
  const rows = state.data.calendar.rows;
  const currentRow = ev.rowId ? rows.find(r=>r.id===ev.rowId) : null;
  const existingCategories = [...new Set(rows.map(r=>r.category).filter(Boolean))];
  const months = CAL_MONTHS_SHORT;
  const title = m.isNew ? 'Nouvel événement' : 'Modifier l\'événement';
  const hasReminder = rem.active === true;

  return '<h3>'+title+'</h3>' +
    '<div class="form-row"><label>Texte</label><input type="text" id="ce-text" value="'+escapeHtml(ev.text||'')+'" placeholder="Ex : Envoi questionnaire, Démarrage pilote…"></div>' +
    '<div class="form-row"><label>Responsable</label><input type="text" id="ce-responsable" value="'+escapeHtml(ev.responsable||'')+'" placeholder="Ex : JA, NB…"></div>' +
    '<div class="form-row"><label>Catégorie</label><input type="text" id="ce-category" list="ce-category-list" value="'+escapeHtml((currentRow&&currentRow.category)||'')+'" placeholder="Ex : HUMANITAIRE, ADMINISTRATIF… (facultatif)">' +
      '<datalist id="ce-category-list">' + existingCategories.map(c=>'<option value="'+escapeHtml(c)+'">').join('') + '</datalist>' +
    '</div>' +
    '<div class="form-grid2">' +
      '<div class="form-row"><label>Mois de début</label><select id="ce-start">' + months.map((mo,i)=>'<option value="'+i+'"'+(ev.startMonth===i?' selected':'')+'>'+mo+'</option>').join('') + '</select></div>' +
      '<div class="form-row"><label>Mois de fin</label><select id="ce-end">' + months.map((mo,i)=>'<option value="'+i+'"'+(ev.endMonth===i?' selected':'')+'>'+mo+'</option>').join('') + '</select></div>' +
    '</div>' +
    '<div class="form-row"><label>Année</label><input type="number" id="ce-year" value="'+(ev.year||state.calYear)+'" min="2000" max="2100" style="width:120px;"></div>' +
    '<div class="form-row"><label>Couleur</label><div style="display:flex;gap:8px;flex-wrap:wrap;" id="ce-color-picker">' +
      CAL_COLORS.map(c=>'<button type="button" class="cal-legend-swatch '+c.key+'" style="width:28px;height:28px;border-radius:6px;border:3px solid '+(ev.colorClass===c.key?'var(--navy)':'transparent')+';cursor:pointer;transition:transform .1s;" data-color="'+c.key+'" title="'+c.label+'"></button>').join('') +
    '</div><input type="hidden" id="ce-color" value="'+(ev.colorClass||'ec-rose')+'"></div>' +

    /* ---- Recurring toggle ---- */
    '<div class="form-row" style="background:var(--blush);border-radius:8px;padding:12px 14px;margin-bottom:12px;">' +
      '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;text-transform:none;letter-spacing:0;font-size:.86rem;color:var(--ink);font-family:var(--font-body);">' +
        '<input type="checkbox" id="ce-recurring"'+(ev.recurring?' checked':'')+' style="width:16px;height:16px;accent-color:var(--navy);">' +
        '<span><strong style="display:block;font-size:.86rem;">↻ Rappel annuel</strong>' +
        '<span style="font-size:.76rem;color:var(--ink-soft);">Cet événement sera affiché automatiquement chaque année</span></span>' +
      '</label>' +
    '</div>' +

    /* ---- Preparation reminder ---- */
    '<div style="border:1px solid var(--paper-line);border-radius:8px;padding:14px 16px;background:#FAFCFF;">' +
      '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;text-transform:none;letter-spacing:0;font-size:.86rem;color:var(--ink);font-family:var(--font-body);margin-bottom:'+(hasReminder?'14px':'0')+'">' +
        '<input type="checkbox" id="ce-reminder-on"'+(hasReminder?' checked':'')+' style="width:16px;height:16px;accent-color:var(--seal-gold);" onchange="document.getElementById(\'rem-fields\').style.display=this.checked?\'block\':\'none\'">' +
        '<span><strong style="display:block;font-size:.86rem;">🔔 Ajouter un rappel de préparation</strong>' +
        '<span style="font-size:.76rem;color:var(--ink-soft);">Apparaîtra dans « Préparation projets du mois » au moment choisi</span></span>' +
      '</label>' +
      '<div id="rem-fields" style="display:'+(hasReminder?'block':'none')+';margin-top:10px;">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<label style="font-family:var(--font-mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);">Combien de temps avant l\'événement ?</label>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input type="number" id="ce-rem-amount" min="1" max="52" value="'+(rem.amount||1)+'" style="width:60px;padding:6px 8px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.86rem;">' +
            '<select id="ce-rem-unit" style="padding:6px 10px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.86rem;">' +
              '<option value="semaine"'+(rem.unit==='semaine'?' selected':'')+'>semaine(s)</option>' +
              '<option value="mois"'+(!rem.unit||rem.unit==='mois'?' selected':'')+'>mois</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:10px;font-size:.82rem;color:var(--ink-soft);font-family:var(--font-body);text-transform:none;letter-spacing:0;">' +
          '<input type="checkbox" id="ce-rem-recurring"'+(rem.recurring?' checked':'')+' style="width:14px;height:14px;accent-color:var(--seal-gold);">' +
          '↻ Ce rappel est lui aussi annuel' +
        '</label>' +
      '</div>' +
    '</div>' +

    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-cal-event">Enregistrer</button>' +
      (!m.isNew ? '<button class="btn btn-danger" data-action="delete-cal-event">Supprimer</button>' : '') +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

function renderCalNoteModalInner(){
  const m = state.modal;
  const note = m.note || {};
  const row = state.data.calendar.rows.find(r=>r.id===note.rowId);
  const rowLabel = row ? row.label : '';
  const monthLabel = CAL_MONTHS_SHORT[note.month] || '';

  return '<h3>'+(m.isNew ? 'Ajouter une note' : 'Modifier la note')+'</h3>' +
    '<p style="font-family:var(--font-mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);margin:0 0 12px;">'+escapeHtml(rowLabel)+' · '+monthLabel+' '+(note.year||'')+'</p>' +
    '<div class="form-row"><label>Texte libre</label><textarea id="cn-text" rows="3" placeholder="Ex : créer formulaire, envoi formulaire…" autofocus>'+escapeHtml(note.text||'')+'</textarea></div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-cal-note">Enregistrer</button>' +
      (!m.isNew ? '<button class="btn btn-danger" data-action="delete-cal-note">Supprimer</button>' : '') +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

