const key = 'orgo-exam3-confidence-v1';
const mechanismKey = 'orgo-exam3-mechanism-confidence-v1';
function loadRatings(storageKey) {
  const ratings = {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const card of deck) {
      if ([1, 2, 3, 4].includes(saved?.[card.id])) ratings[card.id] = saved[card.id];
    }
  } catch {}
  return ratings;
}
const ratings = {reaction: loadRatings(key), mechanism: loadRatings(mechanismKey)};
function ratingGroup() { return options.mode === 'mechanism' ? 'mechanism' : 'reaction'; }
const $ = id => document.getElementById(id);
const settingsKey = 'orgo-exam3-settings-v1';
const options = {mode: 'mixed', topic: 'all', order: 'adaptive'};
try {
  const stored = JSON.parse(localStorage.getItem(settingsKey));
  for (const [name, allowed] of Object.entries({mode: ['mixed','reagents','product','mechanism'], topic: ['all','alkenes','alkynes','alcohols','halides','epoxides','carbonyls'], order: ['adaptive','random']})) {
    if (stored && allowed.includes(stored[name])) options[name] = stored[name];
  }
} catch {}
const topicOf = card => card.id <= 12 ? 'alkenes' : card.id <= 18 ? 'alkynes' : card.id <= 28 ? 'alcohols' : card.id <= 31 ? 'halides' : card.id <= 36 ? 'epoxides' : 'carbonyls';
const selectionKey = 'orgo-exam3-selected-v1';
let selected = new Set(deck.filter(card => options.topic === 'all' || topicOf(card) === options.topic).map(card => card.id));
try {
  const saved = JSON.parse(localStorage.getItem(selectionKey));
  if (Array.isArray(saved)) selected = new Set(saved.filter(id => deck.some(card => card.id === id)));
} catch {}
function activeDeck() { return deck.filter(card => selected.has(card.id)); }
function practiceDeck() {
  const cards = activeDeck();
  return options.mode === 'mechanism' ? cards.filter(card => mechanismFor(card.id)) : cards;
}
function updateProgress() {
  const pool = practiceDeck();
  const noun = options.mode === 'mechanism' ? 'mechanisms' : 'reactions';
  const rated = pool.filter(card => ratings[ratingGroup()][card.id]).length;
  $('progress-meter').max = Math.max(pool.length, 1);
  $('progress-meter').value = rated;
  $('progress').textContent = `${rated} / ${pool.length} ${noun} rated`;
}
let current, mode, revealed = false, last = null, count = 0, attempt = null;
function save() { try { localStorage.setItem(options.mode === 'mechanism' ? mechanismKey : key, JSON.stringify(ratings[ratingGroup()])); } catch {} }
function choose() {
  const available = practiceDeck();
  const candidates = available.length > 1 ? available.filter(card => card.id !== last) : available;
  const weights = candidates.map(card => options.order === 'random' ? 1 : [8, 5, 3, 1][(ratings[ratingGroup()][card.id] || 1) - 1]);
  let pick = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  return candidates.find((card, index) => (pick -= weights[index]) < 0) || candidates.at(-1);
}
function updateVisibility() {
  const label = revealed ? 'Complete reaction with reagents and products.' : mode === 'reagents'
    ? 'Starting structure and product. Work out the reagents.'
    : 'Starting structure and reagents. Work out the product.';
  $('reaction').setAttribute('aria-label', label);
  renderReagentRoutes($('reaction'), current, mode, revealed);
}
function next(requestedId) {
  $('feedback').hidden = options.mode === 'mechanism';
  revealed = false;
  updateProgress();
  const pool = practiceDeck();
  const noSelection = activeDeck().length === 0;
  const noMechanism = options.mode === 'mechanism' && !noSelection && pool.length === 0;
  $('empty-selection').hidden = !noSelection && !noMechanism;
  $('empty-selection').textContent = noMechanism
    ? 'None of the selected reactions has a mechanism drawing yet.'
    : 'Select at least one reaction in Practice settings.';
  $('study-card').hidden = pool.length === 0;
  if (!pool.length) { current = null; return; }
  current = pool.find(card => card.id === requestedId) || choose(); last = current.id; count++;
  $('jump-card').value = current.id;
  $('original-notes').open = false;
  $('answer').src = current.image;
  $('session-count').textContent = `Card ${String(count).padStart(2, '0')}`;
  updateProgress();
  if (options.mode === 'mechanism') { startMechanism(); return; }
  attempt = null;
  $('mechanism').hidden = true;
  $('practice-content').hidden = false;
  mode = options.mode === 'mixed' ? (Math.random() < .5 ? 'reagents' : 'product') : options.mode;
  $('mode-label').textContent = mode === 'reagents' ? 'Conditions' : 'Product recall';
  $('question').textContent = mode === 'reagents' ? 'What reagents and conditions are needed?' : 'What product forms?';
  $('instruction').textContent = mode === 'reagents' && reagentRoutes.get(current.id).length > 1 ? 'Give any one valid set of conditions.' : '';
  $('practice-content').classList.remove('zoomed');
  $('reaction-zoom').textContent = 'Enlarge diagram';
  $('reaction-zoom').setAttribute('aria-pressed', 'false');
  $('solution').hidden = true; $('reveal').hidden = false;
  updateVisibility();
}
function startMechanism() {
  $('mechanism').classList.remove('zoomed');
  $('mech-zoom').setAttribute('aria-pressed', 'false');
  $('mech-zoom').textContent = 'Enlarge drawing';
  attempt = createAttempt(mechanismFor(current.id));
  $('practice-content').hidden = true;
  $('mechanism').hidden = false;
  $('reveal').hidden = true;
  $('mode-label').textContent = 'Mechanism practice · In development';
  $('question').textContent = current.name;
  paintMechanism();
}
function paintMechanism(outcome) {
  const view = attempt.view();
  renderMechanism($('mech-svg'), view, outcome);
  $('instruction').textContent = view.prompt;
  $('mech-step').textContent = view.finished ? 'Product' : `Step ${view.stepNumber} of ${view.stepCount}`;
  $('mech-flow').hidden = view.locked;
  $('mech-from').classList.toggle('active', !view.selectedId);
  $('mech-to').classList.toggle('active', Boolean(view.selectedId));
  const companions = (view.scene.annotations || []).filter(item => item.formula).map(item => item.formula);
  $('mech-companions').hidden = !companions.length;
  $('mech-companions').textContent = companions.join(' · ');
  $('arrow-count').hidden = view.finished;
  $('arrow-count').textContent = view.arrowCount === 0 ? '0 arrows · Workup' : `${view.arrowCount} ${view.arrowCount === 1 ? 'arrow' : 'arrows'}`;
  $('mech-status').textContent = view.status;
  $('mech-status').classList.toggle('is-bad', view.bad);
  $('mech-undo').disabled = !view.canUndo;
  $('mech-reveal').hidden = view.locked;
  $('mech-show').disabled = !view.locked && !view.canCheck;
  $('mech-show').hidden = view.finished;
  $('mech-show').textContent = view.locked ? (view.stepNumber === view.stepCount ? 'See product' : 'Next step') : 'Check step';
  $('solution').hidden = !view.finished;
  if (view.finished) revealed = true;
}
function onMechanismAtom(id) {
  if (!attempt || attempt.click(id).ignored) return;
  const keyboardFocus = $('mech-svg').contains(document.activeElement);
  paintMechanism();
  if (keyboardFocus) {
    const target = attempt.view().locked ? $('mech-show') : $('mech-svg').querySelector(`[data-id="${CSS.escape(id)}"]`);
    target?.focus();
  }
}
function reveal() {
  if (options.mode === 'mechanism' || !current || revealed) return;
  revealed = true; updateVisibility();
  $('solution').hidden = false; $('reveal').hidden = true;
}
function rate(rating) {
  if (!current || !revealed || ![1, 2, 3, 4].includes(rating)) return;
  ratings[ratingGroup()][current.id] = rating; save();
  $('feedback').textContent = `Saved · ${rating * 25}% confidence`;
  next();
}
$('reveal').onclick = reveal;
document.querySelectorAll('[data-rating]').forEach(button => button.onclick = () => rate(Number(button.dataset.rating)));
$('reset').onclick = () => {
  if (confirm(`Clear all ${ratingGroup()} confidence ratings on this device?`)) {
    ratings[ratingGroup()] = {}; save(); $('feedback').textContent = 'Progress cleared. Start fresh.'; next();
  }
};
for (const [name, id] of Object.entries({mode: 'practice-mode', order: 'practice-order'})) {
  $(id).value = options[name];
  $(id).onchange = () => {
    options[name] = $(id).value;
    try { localStorage.setItem(settingsKey, JSON.stringify(options)); } catch {}
    updateJumpList();
    $('feedback').textContent = 'Practice options updated.';
    next();
  };
}
const groupNames = {alkenes:'Alkenes', alkynes:'Alkynes', alcohols:'Alcohols', halides:'Alkyl halides', epoxides:'Epoxides', carbonyls:'Carbonyls'};
const cardInputs = new Map(), groupInputs = new Map();
function updateJumpList() {
  $('jump-label').hidden = options.mode !== 'mechanism';
  if ($('jump-label').hidden) return;
  const pool = practiceDeck();
  $('jump-card').replaceChildren(...pool.map(card => new Option(card.name, card.id)));
  $('jump-card').disabled = !pool.length;
  if (current) $('jump-card').value = current.id;
}
$('jump-card').onchange = () => next(Number($('jump-card').value));
function selectionChanged() {
  updateJumpList();
  try { localStorage.setItem(selectionKey, JSON.stringify([...selected])); } catch {}
  for (const [id, input] of cardInputs) input.checked = selected.has(id);
  for (const [topic, input] of groupInputs) {
    const cards = deck.filter(card => topicOf(card) === topic);
    const total = cards.filter(card => selected.has(card.id)).length;
    input.checked = total === cards.length;
    input.indeterminate = total > 0 && total < cards.length;
  }
  $('selection-count').textContent = `${selected.size} / ${deck.length} selected`;
  updateProgress();
  if (!current || !selected.has(current.id)) next();
}
for (const [topic, name] of Object.entries(groupNames)) {
  const group = document.createElement('fieldset');
  const legend = document.createElement('legend');
  const groupLabel = document.createElement('label');
  const groupInput = document.createElement('input');
  groupInput.type = 'checkbox'; groupInput.checked = true;
  groupLabel.append(groupInput, document.createTextNode(name)); legend.append(groupLabel); group.append(legend);
  groupInputs.set(topic, groupInput);
  groupInput.onchange = () => {
    for (const card of deck.filter(card => topicOf(card) === topic)) groupInput.checked ? selected.add(card.id) : selected.delete(card.id);
    selectionChanged();
  };
  for (const card of deck.filter(card => topicOf(card) === topic)) {
    const label = document.createElement('label'); label.className = 'reaction-choice';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = selected.has(card.id);
    input.onchange = () => { input.checked ? selected.add(card.id) : selected.delete(card.id); selectionChanged(); };
    label.append(input, document.createTextNode(card.name));
    group.append(label); cardInputs.set(card.id, input);
  }
  $('reaction-checklist').append(group);
}
$('select-all').onclick = () => { selected = new Set(deck.map(card => card.id)); selectionChanged(); };
$('clear-all').onclick = () => { selected.clear(); selectionChanged(); };
$('mech-svg').addEventListener('click', event => {
  const target = event.target.closest('.atom, .bond-hit');
  if (target) onMechanismAtom(target.dataset.id);
});
$('mech-svg').addEventListener('keydown', event => {
  const target = event.target.closest && event.target.closest('.atom, .bond-hit');
  if (!target || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  event.stopPropagation();
  onMechanismAtom(target.dataset.id);
});
$('mech-zoom').onclick = () => {
  const enlarged = $('mechanism').classList.toggle('zoomed');
  $('mech-zoom').setAttribute('aria-pressed', String(enlarged));
  $('mech-zoom').textContent = enlarged ? 'Fit drawing' : 'Enlarge drawing';
  paintMechanism();
};
$('mech-undo').onclick = () => {
  if (!attempt) return;
  attempt.undo();
  paintMechanism();
};
$('mech-reveal').onclick = () => {
  if (!attempt) return;
  attempt.reveal();
  paintMechanism();
  $('mech-show').focus();
};
$('mech-show').onclick = () => {
  if (!attempt) return;
  if (attempt.view().locked) {
    attempt.advance();
    paintMechanism();
  } else {
    paintMechanism(attempt.check());
  }
};
document.addEventListener('keydown', event => {
  if (['SELECT', 'INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable) return;
  if (options.mode === 'mechanism' && current && attempt && (event.ctrlKey || event.metaKey)
      && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (attempt.view().canUndo) $('mech-undo').click();
    return;
  }
  if (event.target.closest && event.target.closest('#mech-svg')) return;
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (options.mode === 'mechanism') {
    if (revealed && /^[1-4]$/.test(event.key)) { event.preventDefault(); rate(Number(event.key)); }
    return;
  }
  if (event.code === 'Space' && !['BUTTON', 'SUMMARY'].includes(event.target.tagName)) { event.preventDefault(); reveal(); }
  else if (/^[1-4]$/.test(event.key)) { event.preventDefault(); rate(Number(event.key)); }
});
const narrowLayout = window.matchMedia('(max-width: 800px)');
function sizeSettingsPanel() { $('settings-panel').open = !narrowLayout.matches; }
sizeSettingsPanel();
narrowLayout.addEventListener('change', sizeSettingsPanel);
$('reaction-zoom').onclick = () => {
  const enlarged = $('practice-content').classList.toggle('zoomed');
  $('reaction-zoom').setAttribute('aria-pressed', String(enlarged));
  $('reaction-zoom').textContent = enlarged ? 'Fit diagram' : 'Enlarge diagram';
};
selectionChanged();

window.matchMedia('(max-width: 600px)').addEventListener('change', () => { if (attempt && current) paintMechanism(); });
