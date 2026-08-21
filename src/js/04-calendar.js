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
    const labelCell = '<td class="cal-row-label col-label" data-action="edit-cal-row" data-id="'+row.id+'" title="Modifier ce groupe" style="cursor:pointer;">' +
      '<div class="cal-row-label-inner">' +
        escapeHtml(row.label) +
        (row.sub ? '<span class="cal-row-label-sub">'+escapeHtml(row.sub)+'</span>' : '') +
      '</div>' +
    '</td>';

    const monthCells = CAL_MONTHS_SHORT.map((_,mi) => {
      const monthEvents = events.filter(e=>e.rowId===row.id && mi>=e.startMonth && mi<=e.endMonth);
      // Preparation period events (lighter color, striped)
      // Includes wrap-around into current year for recurring events' NEXT occurrence
      const prepEvents = events.filter(e=>{
        if(e.rowId!==row.id) return false;
        if(!(e.reminder && e.reminder.active)) return false;
        const isRecurring = e.recurring || (e.reminder && e.reminder.recurring);
        const offsetMonths = e.reminder.unit==='semaine' ? Math.ceil(e.reminder.amount/4.33) : Number(e.reminder.amount)||1;

        const remStart = e.startMonth - offsetMonths;
        const remEnd   = e.startMonth - 1;

        const notOverlap = !monthEvents.find(ev=>ev.id===e.id);

        // Case 1: prep fully within the current year
        if(remStart >= 0 && remEnd >= 0){
          return mi >= remStart && mi <= remEnd && notOverlap;
        }

        // Case 2: prep spans year boundary (remStart < 0, remEnd >= 0)
        // → Part of prep is in current year: months [0, remEnd]
        // → Part of prep was in previous year: not shown here
        // → ALSO: if recurring, next year's occurrence preps [12+remStart, 11] in current year
        if(remStart < 0 && remEnd >= 0){
          // Current year's occurrence: months 0 to remEnd (e.g. Jan for Feb event)
          if(mi >= 0 && mi <= remEnd && notOverlap) return true;
          // Next year's occurrence (recurring): wrap from year end
          if(isRecurring){
            const wrapStart = 12 + remStart; // e.g. Nov=10 for 3-month prep before Feb
            if(mi >= wrapStart && mi <= 11 && notOverlap) return true;
          }
          return false;
        }

        // Case 3: prep entirely in previous year (remEnd < 0)
        // → if recurring, next year's occurrence wraps: [12+remStart, 11]
        if(remStart < 0 && remEnd < 0){
          if(isRecurring){
            const wrapStart = 12 + remStart;
            const wrapEnd   = 12 + remEnd;
            return mi >= wrapStart && mi <= wrapEnd && notOverlap;
          }
          return false;
        }

        return false;
      });

      let cellContent = '';
      let cellStyle = '';
      let cellAction = 'data-action="add-cal-event" data-row-id="'+row.id+'" data-month="'+mi+'"';

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
          '</span>';
          cellAction = 'data-action="edit-cal-event" data-id="'+ev.id+'"';
        }
      });

      if(monthEvents.length===0 && prepEvents.length===0){
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
    '<th class="cal-th-label col-label">Groupe de projet</th>' +
    CAL_MONTHS_SHORT.map((m,i)=>'<th class="cal-th-month col-month'+(i===currentMonth?' current-month':'')+'">' + m + '</th>').join('') +
  '</tr></thead>';

  const legend = '<div class="cal-legend">' +
    CAL_COLORS.map(c=>'<span class="cal-legend-chip"><span class="cal-legend-swatch '+c.key+'"></span>'+c.label+'</span>').join('') +
    '<span class="cal-legend-chip" style="margin-left:8px;"><span style="font-size:.82rem;">↻</span>Rappel annuel</span>' +
  '</div>';

  const emptyHint = rows.length===0
    ? '<div class="empty-state small" style="margin-top:12px;"><p style="margin:0;">Ajoutez des groupes avec le bouton <strong>+ Ajouter un groupe</strong> pour commencer à planifier votre année.</p></div>'
    : '';

  const controls = '<div class="cal-year-bar">' +
    '<button class="cal-year-btn" data-action="cal-prev-year">← '+(year-1)+'</button>' +
    '<span class="cal-year-display">'+year+'</span>' +
    '<button class="cal-year-btn" data-action="cal-next-year">'+(year+1)+' →</button>' +
    '<button class="btn btn-primary no-print" data-action="add-cal-row" style="margin-left:10px;font-size:.78rem;padding:6px 12px;">+ Groupe</button>' +
    '<button class="btn no-print" data-action="print-pv" style="font-size:.78rem;padding:6px 12px;">Imprimer</button>' +
  '</div>';

  if(standalone){
    return '<p class="eyebrow">Planning</p>' +
      '<h1 class="page-title">Calendrier annuel</h1>' +
      '<p class="page-sub">Cliquez sur une cellule pour ajouter un événement · <strong>↻</strong> = rappel annuel automatique · Cliquez sur un intitulé de groupe pour le modifier</p>' +
      controls + legend +
      '<div class="cal-wrap"><table class="cal-table">' + thead + '<tbody>' + tableBody + '</tbody></table></div>' +
      emptyHint;
  }
  // Inline version for home
  return controls + legend +
    '<div class="cal-wrap"><table class="cal-table">' + thead + '<tbody>' + tableBody + '</tbody></table></div>' +
    emptyHint;
}

function renderCalEventModalInner(){
  const m = state.modal;
  const ev = m.event || {};
  const rem = ev.reminder || {};
  const rows = state.data.calendar.rows;
  const months = CAL_MONTHS_SHORT;
  const title = m.isNew ? 'Nouvel événement' : 'Modifier l\'événement';
  const hasReminder = rem.active === true;

  return '<h3>'+title+'</h3>' +
    '<div class="form-row"><label>Texte</label><input type="text" id="ce-text" value="'+escapeHtml(ev.text||'')+'" placeholder="Ex : Envoi questionnaire, Démarrage pilote…"></div>' +
    '<div class="form-row"><label>Groupe de projet</label><select id="ce-row"><option value="">— Choisir —</option>' + rows.map(r=>'<option value="'+r.id+'"'+((ev.rowId||m.rowId)===r.id?' selected':'')+'>'+escapeHtml(r.label)+'</option>').join('') + '</select></div>' +
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

function renderCalRowModalInner(){
  const row = state.modal.row || {};
  const isEdit = !!row.id;
  const categories = [...new Set((state.data.calendar.rows||[]).map(r=>r.category||'').filter(Boolean))];
  const months = CAL_MONTHS_SHORT;

  return '<h3>'+(isEdit?'Modifier le groupe':'Nouveau groupe'+(row.label?' : '+escapeHtml(row.label):''))+'</h3>' +

    /* ---- Row info ---- */
    '<div style="background:var(--blush);border-radius:8px;padding:14px 16px;margin-bottom:14px;">' +
      '<p style="font-family:var(--font-mono);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 10px;">Groupe de projet</p>' +
      '<div class="form-row"><label>Intitulé</label><input type="text" id="cr-label" value="'+escapeHtml(row.label||'')+'" placeholder="Ex : Projet Kubuta, Atelier numérique…" autofocus></div>' +
      '<div class="form-grid2">' +
        '<div class="form-row"><label>Sous-titre / responsables</label><input type="text" id="cr-sub" value="'+escapeHtml(row.sub||'')+'" placeholder="Ex : JA/NB"></div>' +
        '<div class="form-row"><label>Catégorie</label>' +
          '<input type="text" id="cr-cat" value="'+escapeHtml(row.category||'')+'" placeholder="Ex : HUMANITAIRE" list="cr-cat-list">' +
          '<datalist id="cr-cat-list">'+categories.map(c=>'<option value="'+escapeHtml(c)+'">').join('')+'</datalist>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ---- Event creation (only for new rows) ---- */
    (!isEdit ? (
      '<div style="border:1px solid var(--paper-line);border-radius:8px;padding:14px 16px;background:#FAFCFF;">' +
        '<label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:.86rem;color:var(--ink);font-family:var(--font-body);text-transform:none;letter-spacing:0;margin-bottom:0;" id="ev-toggle-label">' +
          '<input type="checkbox" id="cr-add-event" style="width:15px;height:15px;accent-color:var(--navy);" onchange="document.getElementById(\'cr-ev-fields\').style.display=this.checked?\'block\':\'none\'">' +
          '<span><strong>Ajouter un premier événement sur ce groupe</strong></span>' +
        '</label>' +
        '<div id="cr-ev-fields" style="display:none;margin-top:14px;">' +
          '<div class="form-row"><label>Texte de l\'événement</label><input type="text" id="cr-ev-text" placeholder="Ex : Envoi questionnaire, Démarrage pilote…"></div>' +
          '<div class="form-grid2">' +
            '<div class="form-row"><label>Mois de début</label><select id="cr-ev-start">'+months.map((mo,i)=>'<option value="'+i+'">'+mo+'</option>').join('')+'</select></div>' +
            '<div class="form-row"><label>Mois de fin</label><select id="cr-ev-end">'+months.map((mo,i)=>'<option value="'+i+'">'+mo+'</option>').join('')+'</select></div>' +
          '</div>' +
          '<div class="form-row"><label>Couleur</label>' +
            '<div style="display:flex;gap:7px;flex-wrap:wrap;" id="cr-ev-color-picker">' +
              CAL_COLORS.map(c=>'<button type="button" class="cal-legend-swatch '+c.key+'" style="width:26px;height:26px;border-radius:6px;border:3px solid transparent;cursor:pointer;transition:transform .1s;" data-row-color="'+c.key+'" title="'+c.label+'"></button>').join('') +
            '</div>' +
            '<input type="hidden" id="cr-ev-color" value="ec-rose">' +
          '</div>' +
          '<div class="form-row" style="background:var(--blush);border-radius:7px;padding:10px 12px;">' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;text-transform:none;letter-spacing:0;font-size:.84rem;color:var(--ink);font-family:var(--font-body);">' +
              '<input type="checkbox" id="cr-ev-recurring" style="width:14px;height:14px;accent-color:var(--navy);">' +
              '↻ Rappel annuel (répéter chaque année)' +
            '</label>' +
          '</div>' +
          '<div style="border:1px solid var(--paper-line);border-radius:7px;padding:12px;margin-top:8px;">' +
            '<label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:.82rem;color:var(--ink);font-family:var(--font-body);text-transform:none;letter-spacing:0;margin-bottom:0;">' +
              '<input type="checkbox" id="cr-ev-reminder" style="width:14px;height:14px;accent-color:var(--seal-gold);" onchange="document.getElementById(\'cr-rem-fields\').style.display=this.checked?\'block\':\'none\'">' +
              '🔔 Ajouter un rappel de préparation' +
            '</label>' +
            '<div id="cr-rem-fields" style="display:none;margin-top:10px;">' +
              '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
                '<span style="font-family:var(--font-mono);font-size:.65rem;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);">Combien de temps avant ?</span>' +
                '<input type="number" id="cr-rem-amount" min="1" max="52" value="1" style="width:56px;padding:5px 8px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.84rem;">' +
                '<select id="cr-rem-unit" style="padding:5px 10px;border:1px solid var(--paper-line);border-radius:6px;font-family:inherit;font-size:.84rem;">' +
                  '<option value="semaine">semaine(s)</option><option value="mois" selected>mois</option>' +
                '</select>' +
              '</div>' +
              '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;margin-top:8px;font-size:.8rem;color:var(--ink-soft);font-family:var(--font-body);text-transform:none;letter-spacing:0;">' +
                '<input type="checkbox" id="cr-rem-recurring" style="width:13px;height:13px;accent-color:var(--seal-gold);">' +
                '↻ Ce rappel est lui aussi annuel' +
              '</label>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    ) : '') +

    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-action="save-cal-row">Enregistrer</button>' +
      (isEdit ? '<button class="btn btn-danger" data-action="delete-cal-row" data-id="'+(row.id||'')+'">Supprimer le groupe</button>' : '') +
      '<button class="btn btn-ghost" data-action="close-modal">Annuler</button>' +
    '</div>';
}

