# ARCHITECTURE — Suivi de Projets (HUG)

## 1. Vue d'ensemble

Application de suivi de projets mono-page (SPA maison, sans framework), en
`localStorage`, hébergée sur GitHub Pages : https://joulsct.github.io/suivi-projets/

Le projet est désormais **modulaire** pour l'édition, mais reste **livré comme
un unique fichier HTML autonome** (contrainte GitHub Pages / partage facile).

```
suivi-projets/
├── index.html          ← FICHIER GÉNÉRÉ, déployé tel quel sur GitHub Pages.
│                          Ne JAMAIS l'éditer à la main : il est écrasé à
│                          chaque exécution de bundle.py.
├── bundle.py            ← Script d'assemblage (src/ → index.html racine).
├── ARCHITECTURE.md      ← Ce document.
├── ÉTAT.md              ← Suivi de session (dernière session / prochaine étape / bugs connus).
└── src/                 ← SOURCE DE VÉRITÉ. C'est ici qu'on édite.
    ├── index.html        ← Template HTML (head, #app, catcher d'erreurs,
    │                        <link>/<script src> vers styles.css et js/*.js).
    ├── styles.css         ← Tout le CSS de l'application (un seul fichier).
    └── js/
        ├── 01-core.js                       constantes, state, utilitaires, accès aux données
        ├── 02-render-root.js                render() racine, sidebar, routeur de vues
        ├── 03-home.js                       vue d'accueil
        ├── 04-calendar.js                   vue calendrier annuel + ses modales
        ├── 05-dashboard.js                  tableau de bord transverse (4 onglets)
        ├── 06-project-view.js               vue projet (onglets Tâches/Séances/Pages)
        ├── 07-seance-page.js                formulaires + vues séance et page
        ├── 08-modals.js                     toutes les fenêtres modales + leurs bindings
        ├── 09-actions-nav-seances-pages.js  actions : navigation, CRUD séances/pages
        ├── 10-actions-projects-export.js    actions : CRUD projets, exports Word/Excel/JSON
        ├── 11-import.js                     import JSON + import Excel/CSV
        ├── 12-reminder-epv.js               rappel d'export hebdo + suivi continu (EPV)
        ├── 13-priority-pv-import.js         modale planification priorités + import PV externe
        ├── 14-event-delegation.js           délégation d'événements globale (gros fichier, volontairement non scindé — voir §3)
        └── 15-init.js                       bootstrap (init() + appel final)
```

### Workflow d'édition

1. On édite **uniquement** les fichiers sous `src/`.
2. On lance `python3 bundle.py` (aucune dépendance externe, stdlib seulement).
3. Ça régénère `index.html` à la racine — c'est ce fichier qu'on commite et
   pousse sur GitHub (branche déployée par Pages).
4. Validation avant commit : `node --check` sur les modules JS concernés, et
   idéalement rouvrir `src/index.html` dans un navigateur pour un test rapide
   (les balises `<script src="js/...">` fonctionnent directement en local,
   pas besoin de bundler pour tester).

### Comment le bundler fonctionne

`bundle.py` part de `src/index.html` (qui contient un `<link rel="stylesheet"
href="styles.css">` et une séquence de `<script src="js/0X-*.js"></script>`),
et :
- remplace le `<link>` par un `<style>...</style>` contenant `styles.css` ;
- remplace toute la séquence de `<script src="js/...">` par un unique
  `<script>"use strict"; …tous les modules concaténés dans l'ordre… </script>`.

Chaque module `js/*.js` porte son propre `"use strict";` en tête (nécessaire
pour que `src/index.html` fonctionne correctement ouvert tel quel en local,
chaque `<script src>` étant sinon en mode non strict). Le bundler retire ces
pragmas individuels et n'en réinjecte qu'un seul en tête du bloc final — le
fichier généré est donc strictement identique en comportement à l'ancien
fichier monolithique.

---

## 2. Modèle de données

Racine (`state.data`, persistée dans `localStorage['tracker-data']`) :

```js
{
  projects: [ Project, ... ],
  seances: { [projectId]: [ Seance, ... ] },
  pages:   { [projectId]: [ Page, ... ] },
  quickNotes: [ { id, text, done, createdAt }, ... ],
  calendar: { rows: [...], events: [...] },
  evolvingPV: { [projectId]: { entries: [ EpvEntry, ... ] } }
}
```

**Project**
```js
{
  id, name, description, contacts, status,   // 'Actif' | 'En pause' | 'Terminé'
  color,           // hex, tiré de PROJECT_COLORS
  parentId,        // null (top-level) ou id d'un projet top-level — 2 niveaux MAX
  directTasks: [Task],
  vigilances: [{ text }],      // text = HTML riche (issu de l'éditeur RTE)
  developments: [{ text }]     // idem — "perspectives de développement"
}
```

**Task** (structure commune, quelle que soit son origine — séance / page /
directe / EPV) :
```js
{
  id, description, responsable, echeance,   // 'YYYY-MM-DD' ou ''
  statut,          // ∈ STATUS_LIST = ['à faire','en cours','fait (R.A.)','fait','non réalisé']
  priority,        // bool
  priorityFrom,    // date ou null — priorité différée
  completedAt      // date ou null, posée automatiquement par setTaskStatut()
}
```
Terminé = `DONE_STATUSES = ['fait','fait (R.A.)','non réalisé']`. **Toujours**
utiliser `setTaskStatut(task, newStatut)` pour changer un statut (gère
`completedAt` automatiquement) plutôt que d'assigner `task.statut` directement.

**Seance** (PV de séance) :
```js
{ id, title, date, participants: [string], notes: html, conclusions: [html], taches: [Task] }
```

**Page** (page libre) :
```js
{ id, title, notes: html, source, taches: [Task] }
```

**EpvEntry** (une entrée du « suivi continu ») :
```js
{ id, date, notes: html, conclusions: [html], taches: [Task] }
```

Pas d'identifiants séquentiels : tout objet créé utilise `uid()` (UUID natif,
ou repli horodaté si `crypto.randomUUID` indisponible).

### Origine d'une tâche

Une tâche peut vivre à 4 endroits différents : `project.directTasks[]`, une
`seance.taches[]`, une `page.taches[]`, ou une `epvEntry.taches[]`. Cette
origine n'est **jamais garantie fiable dans les attributs `data-origin` /
`data-seance-id` du DOM** (bug historique : certains rendus — notamment
`renderTachesTab`, l'onglet « Tâches » du projet — ne renseignent pas
correctement `data-seance-id`). **Toute action qui doit localiser une tâche
précise pour la modifier/supprimer/déplacer doit chercher par `id` dans les 4
emplacements possibles**, avec repli en cascade, plutôt que de faire confiance
aveuglément aux hints d'origine. Voir le pattern déjà utilisé dans
`delete-task` et dans le déplacement de tâche (`save-edit-task`), tous deux
dans `14-event-delegation.js`.

### Texte riche (HTML)

Les champs suivants sont du **HTML stocké tel quel** (produit par l'éditeur
`contenteditable` maison, voir `rteHtml()` dans `08-modals.js`), jamais du
texte brut : `seance.notes`, `seance.conclusions[]`, `page.notes`,
`epvEntry.notes`, `epvEntry.conclusions[]`, `vigilance.text`,
`development.text`.

- Pour les **afficher**, utiliser `fmtText()` (jamais `escapeHtml()`, qui les
  ferait apparaître en clair — voir bug corrigé en juillet 2026).
- Pour un **aperçu texte brut** (cartes, listes), utiliser `stripHtml()`.
- Le collage dans ces champs est forcé en texte brut (voir listener `paste`
  dans `14-event-delegation.js`) pour éviter d'importer du HTML parasite
  (bordures, styles Outlook/Word résiduels).

---

## 3. Conventions à respecter

- **Langue** : tout le code (variables, fonctions, commentaires) mélange
  anglais (identifiants techniques) et français (libellés UI, quelques
  commentaires) — c'est l'existant, on ne renomme pas rétroactivement.
- **Style** : pas de framework, pas de build step pour le développement
  courant (seul `bundle.py`, en stdlib pure, est nécessaire). Le HTML est
  généré via concaténation de chaînes de caractères (pas de template engine,
  pas de JSX) — rester cohérent avec ce pattern dans le code existant.
- **Rendu** : l'app suit un pattern `state` global + `render()` qui
  réécrit `#app.innerHTML` en entier à chaque changement (pas de diffing).
  Toute mutation de `state.data` doit être suivie d'un appel à
  `persistAndRender()` (render + sauvegarde localStorage), sauf cas
  particuliers déjà gérés (ex. formulaires en édition libre, voir
  `currentDraftTasks()`).
- **Délégation d'événements** : tous les clics passent par UN SEUL listener
  sur `#app` avec un grand `switch(action)` basé sur l'attribut
  `data-action` (voir `14-event-delegation.js`). Ne pas attacher de listener
  `click` ad hoc sur un élément individuel sauf nécessité technique (ex. drag
  & drop, géré séparément dans `attachDynamicValues()` car nécessite un accès
  direct aux éléments DOM après rendu).
- **Pas de dépendance externe non désirée** : la seule lib externe est
  `xlsx.js` (SheetJS, via CDN, pour les exports/imports Excel). Ne pas
  ajouter d'autre dépendance sans validation explicite.
- **Ne jamais réécrire un bloc entier "pour nettoyer"** : toute modification
  doit être chirurgicale (recherche exacte + remplacement ciblé), jamais une
  réécriture globale d'une fonction ou d'un fichier, même pour une
  "simplification" — le risque de régression silencieuse est jugé plus
  important que le gain de lisibilité.
- **`index.html` à la racine ne s'édite jamais à la main** — c'est un
  artefact généré par `bundle.py`. Toute édition manuelle y sera perdue au
  prochain bundle.

---

## 4. Pièges connus / zones fragiles

1. **Origine de tâche non fiable dans le DOM** (voir §2 ci-dessus) — toujours
   chercher par id avec repli en cascade plutôt que de faire confiance à
   `data-origin`/`data-seance-id`/`data-page-id` dans `renderTachesTab`.
2. **Hiérarchie de projets limitée à 2 niveaux.** `getChildren()` et l'UI de
   la sidebar ne gèrent qu'un seul niveau d'imbrication. Un projet ayant déjà
   des sous-projets ne doit pas lui-même devenir sous-projet (le sélecteur de
   parent dans la modale projet le bloque déjà — voir `renderProjectModalInner`
   dans `08-modals.js`) : ne pas retirer cette garde sans revoir tout
   l'affichage de la sidebar en profondeur.
3. **`14-event-delegation.js` est volontairement resté un fichier unique et
   volumineux** (~950 lignes, un seul gros `switch(action)` sans clause
   `default`). Il serait techniquement possible de le scinder en plusieurs
   `switch(action){...}` consécutifs répartis par fichier fonctionnel (le
   comportement resterait identique, aucune clause `default` ne risque
   d'avaler les cas non gérés), mais ça n'a pas été fait lors de la
   réorganisation initiale (risque de réattribution manuelle jugé trop élevé
   pour le gain). À reconsidérer si l'édition des actions devient un point de
   friction récurrent.
4. **Deux CSS blocks « conclusions » se ressemblent mais sont différents** :
   `.pv-c` (bloc conclusion, avec bordure gauche navy intentionnelle) est
   différent de `.vigilance-text`/`.proj-rich-text` (texte riche sans
   bordure). Une règle défensive existe (`.pv-c *, .pv-notes *,
   .vigilance-text *, .proj-rich-text *{border:none !important;
   background:transparent !important;}`) pour neutraliser tout résidu de
   mise en forme parasite provenant d'un ancien collage Word/Outlook déjà
   enregistré en base — ne pas la retirer sans comprendre pourquoi elle
   existe (voir historique de session, bug des « traits bleus »).
5. **Le compteur de tâches d'un projet parent agrège ses sous-projets**
   (`projectTabHtml()` dans `02-render-root.js`), mais `openTaskCount()`
   lui-même (dans `01-core.js`) ne compte QUE les tâches directes d'un projet
   donné (pas ses enfants) — c'est intentionnel et split en 2 endroits
   différents : ne pas fusionner ces deux logiques sans vérifier tous les
   appelants de `openTaskCount()`.
6. **Export Word/Excel du RA** (`10-actions-projects-export.js`) dépend de la
   structure exacte des champs de `Task` — toute évolution du modèle Task
   (nouveau champ, renommage) doit être répercutée dans `exportRaExcel()` et
   `exportRaWord()`, qui ne sont pas générées dynamiquement à partir du
   schéma.
7. **`localStorage` a une limite de taille** (~5-10 Mo selon navigateur) —
   `saveData()` échoue silencieusement (avec bannière d'erreur) si atteinte ;
   pas de mécanisme de compaction/archivage automatique à ce jour.

---

## 5. Carte fonctionnalité → fichier

| Je veux modifier… | Fichier(s) à ouvrir |
|---|---|
| Couleurs, polices, styles visuels génériques | `src/styles.css` |
| Structure du `<head>`, polices Google Fonts, lib xlsx CDN | `src/index.html` |
| Catcher d'erreurs global | `src/index.html` (script inline) |
| Constantes (statuts, couleurs, mois), état global, fonctions utilitaires (`fmtText`, `escapeHtml`, `uid`…), accès aux données (`getProject`, `getSeances`…), sauvegarde localStorage | `js/01-core.js` |
| Rendu racine, sidebar (liste des projets, compteurs), routeur de vues | `js/02-render-root.js` |
| Page d'accueil (rappels, notes rapides, briques projets) | `js/03-home.js` |
| Calendrier annuel (grille, événements, lignes) | `js/04-calendar.js` |
| Tableau de bord (tâches transverses, vigilances globales, RA, prioritaires) | `js/05-dashboard.js` |
| Vue d'un projet (en-tête, onglets Tâches/Séances/Pages, vigilances, perspectives) | `js/06-project-view.js` |
| Formulaire et affichage d'une séance (PV) ou d'une page | `js/07-seance-page.js` |
| N'importe quelle fenêtre modale (édition tâche, projet, vigilance, import…) | `js/08-modals.js` |
| Navigation, CRUD séances/pages (créer/éditer/supprimer) | `js/09-actions-nav-seances-pages.js` |
| CRUD projets, export Word/Excel/JSON | `js/10-actions-projects-export.js` |
| Import JSON (sauvegarde complète ou partielle) ou Excel/CSV | `js/11-import.js` |
| Rappel hebdomadaire d'export, suivi continu (EPV) | `js/12-reminder-epv.js` |
| Planification des priorités, import d'un PV externe (JSON) | `js/13-priority-pv-import.js` |
| **Comportement d'un clic/changement/collage/touche** (`data-action="..."`) | `js/14-event-delegation.js` |
| Séquence de démarrage de l'app | `js/15-init.js` |
| Assemblage final en un seul fichier | `bundle.py` |

---

## 6. Carte des impacts (fichier/fonction → qui en dépend)

À utiliser après une modification pour savoir quoi tester avant de
considérer le travail terminé.

### `01-core.js` (fondations — quasi tout en dépend)
- `state` : lu/muté par la quasi-totalité des fichiers.
- `getProject`, `getChildren`, `getSeances`, `getPages`, `getAllTasks`,
  `openTaskCount` : utilisés par `02-render-root.js` (sidebar, compteurs),
  `03-home.js`, `05-dashboard.js`, `06-project-view.js`, `09`, `10`, `11`,
  `12`, `14`. → **Tester : sidebar (compteurs), vue projet, tableau de bord,
  export.**
- `setTaskStatut` : utilisé partout où un statut de tâche change (`06`, `08`
  modale édition tâche, `14` changement de statut inline). → **Tester :
  changement de statut depuis n'importe quel tableau de tâches, vérifier que
  `completedAt` se pose/s'efface correctement.**
- `fmtText`/`stripHtml`/`escapeHtml` : utilisés par tout affichage de texte
  riche (`03`, `05`, `06`, `07`, `08`, `12`). → **Tester : affichage des
  vigilances, perspectives, notes de séance/page/EPV, conclusions de PV.**
- `persistAndRender`/`saveData` : appelés après quasi toute action mutante
  dans `09`, `10`, `11`, `12`, `13`, `14`. → **Tester : rafraîchir la page
  après une action, vérifier la persistance.**

### `02-render-root.js`
- `render()` : appelé après chaque action mutante (voir `persistAndRender`).
  → **Tester : toute navigation, tout changement d'état visible.**
- `projectTabHtml` : dépend de `openTaskCount` + `getChildren`
  (`01-core.js`). → **Tester : badges de compteur dans la sidebar après
  ajout/suppression/déplacement de tâche ou de sous-projet.**

### `06-project-view.js`
- `getProjectTasks` : utilisé par `renderTachesTab` (même fichier) ET par
  `10-actions-projects-export.js` (exports). → **Tester : onglet Tâches du
  projet ET les exports Word/Excel/JSON du même projet après modification.**

### `08-modals.js`
- `attachDynamicValues` : rattache les listeners dynamiques (drag & drop
  sidebar, boutons RTE, sélecteurs de couleur) après **chaque** `render()` —
  appelé depuis `02-render-root.js`. Toute nouvelle modale ou tout nouvel
  élément interactif nécessitant un binding post-rendu doit être ajouté ici.
  → **Tester : toute nouvelle modale a bien ses boutons actifs après
  ouverture.**
- `rteHtml` : structure de l'éditeur riche, utilisée par `07`, `08`
  (vigilance/développement), `12` (EPV). → **Tester : la barre d'outils RTE
  fonctionne dans les 4 contextes (séance, page, vigilance/dev, EPV).**

### `14-event-delegation.js`
- Point d'entrée unique de toute interaction utilisateur (clic, changement,
  saisie, collage, touche). Une régression ici peut silencieusement casser
  une action isolée sans erreur JS visible (le `case` correspondant ne fait
  simplement rien). → **Tester systématiquement l'action précise modifiée
  (pas seulement "l'app se charge") après toute modification de ce fichier.**
- `save-edit-task` (déplacement de tâche) : dépend de `getSeances`,
  `getPages`, `getEPV`, `getProject` (recherche en cascade). → **Tester :
  déplacer une tâche depuis chacune des 4 origines possibles (directe,
  séance, page, EPV) vers un autre projet, vérifier qu'elle n'est ni
  dupliquée ni perdue.**

### `bundle.py`
- Dépend de la structure exacte de `src/index.html` (présence du `<link
  rel="stylesheet" href="styles.css">` et de la séquence de `<script
  src="js/...">`). Renommer/déplacer un fichier JS nécessite de mettre à
  jour `src/index.html` en conséquence (le glob `js/*.js` suit l'ordre
  alphabétique — d'où le préfixe numérique `0X-`). → **Tester : après tout
  ajout/retrait/renommage de module, relancer `bundle.py` et vérifier
  `node --check` sur le script extrait.**
