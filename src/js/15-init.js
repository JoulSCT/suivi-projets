"use strict";

/* ============== INIT ============== */
async function init(){
  try {
    render();
    await loadData();
    state.view = 'home';
    render();
    await checkWeeklyReminder();
    if(!state.banner && state.data.projects.length === 0){
      showBanner('Aucun projet trouvé dans cet outil. Si vous attendiez de retrouver des projets existants, utilisez « Importer (JSON) » pour les restaurer depuis une sauvegarde.', 'info');
    }
  } catch(err) {
    const root = document.getElementById('app');
    if(root) root.innerHTML = '<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;">' +
      '<div style="padding:32px;font-family:monospace;color:#A6383A;max-width:600px;">' +
      '<strong>Erreur d\'initialisation :</strong><br>' + (err && err.message ? err.message : String(err)) +
      (err && err.stack ? '<pre style="margin-top:12px;font-size:.72rem;overflow:auto;white-space:pre-wrap;">' + err.stack + '</pre>' : '') +
      '</div></div>';
  }
}
init();
