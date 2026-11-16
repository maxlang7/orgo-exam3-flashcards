const key = 'orgo-exam3-confidence-v1';
let state = {};
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && typeof saved === 'object') {
    for (const card of deck) if ([1, 2, 3, 4].includes(saved[card.id])) state[card.id] = saved[card.id];
  }
} catch {}
const $ = id => document.getElementById(id);
const settingsKey = 'orgo-exam3-settings-v1';
const options = {mode: 'mixed', topic: 'all', order: 'adaptive'};
try {
  const stored = JSON.parse(localStorage.getItem(settingsKey));
  for (const [name, allowed] of Object.entries({mode: ['mixed','reagents','product'], topic: ['all','alkenes','alkynes','alcohols','halides','epoxides','carbonyls'], order: ['adaptive','random']})) {
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
function updateProgress() {
  $('progress').textContent = `${activeDeck().filter(card => state[card.id]).length} / ${activeDeck().length} reactions rated`;
}
let current, mode, revealed = false, last = null, count = 0;
function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }
function choose() {
  const available = activeDeck();
  const candidates = available.length > 1 ? available.filter(card => card.id !== last) : available;
  const weights = candidates.map(card => options.order === 'random' ? 1 : [8, 5, 3, 1][(state[card.id] || 1) - 1]);
  let pick = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  return candidates.find((card, index) => (pick -= weights[index]) < 0) || candidates.at(-1);
}
function updateVisibility() {
  $('mask').hidden = revealed;
  $('mask').style.display = revealed ? 'none' : '';
}
function drawReaction() {
  $('reaction-image').setAttribute('href', current.reaction);
  const [x, y, width, height] = current.masks[mode];
  for (const [name, value] of Object.entries({x, y, width, height})) $('mask-cover').setAttribute(name, value);
  $('mask-box').setAttribute('x', x + 12);
  $('mask-box').setAttribute('width', width - 24);
  $('mask-label').setAttribute('x', x + width / 2);
  $('mask-label').textContent = mode === 'reagents' ? '? Conditions' : '? Product';
  $('reaction').setAttribute('aria-label', mode === 'reagents' ? 'Starting structure and product. Work out the reagents.' : 'Starting structure and reagents. Work out the product.');
  updateVisibility();
}
function next() {
  revealed = false;
  updateProgress();
  $('empty-selection').hidden = activeDeck().length > 0;
  $('study-card').hidden = activeDeck().length === 0;
  if (!activeDeck().length) { current = null; return; }
  current = choose(); last = current.id; count++;
  mode = options.mode === 'mixed' ? (Math.random() < .5 ? 'reagents' : 'product') : options.mode;
  $('mode-label').textContent = mode === 'reagents' ? 'Recall the conditions' : 'Predict the product';
  $('question').textContent = mode === 'reagents' ? 'What reagents and conditions are needed?' : 'What product forms?';
  $('solution').hidden = true; $('reveal').hidden = false;
  $('original-notes').open = false;
  updateProgress();
  $('session-count').textContent = `Practice ${String(count).padStart(2, '0')}`;
  drawReaction();
  $('answer').src = current.image;
  updateVisibility();
}
function reveal() {
  if (!current || revealed) return;
  revealed = true; updateVisibility();
  $('solution').hidden = false; $('reveal').hidden = true;
}
function rate(rating) {
  if (!current || !revealed || ![1, 2, 3, 4].includes(rating)) return;
  state[current.id] = rating; save();
  $('feedback').textContent = `Saved · ${rating * 25}% confidence. ${options.order === 'random' ? 'Continuing with equal card selection.' : rating < 3 ? 'You’ll see that reaction more often.' : rating === 4 ? 'That reaction will appear less often.' : 'Keep practicing to make it stick.'}`;
  next();
}
$('reveal').onclick = reveal;
document.querySelectorAll('[data-rating]').forEach(button => button.onclick = () => rate(Number(button.dataset.rating)));
$('reset').onclick = () => {
  if (confirm('Clear all confidence ratings on this device?')) {
    state = {}; save(); $('feedback').textContent = 'Progress cleared. Start fresh.'; next();
  }
};
for (const [name, id] of Object.entries({mode: 'practice-mode', order: 'practice-order'})) {
  $(id).value = options[name];
  $(id).onchange = () => {
    options[name] = $(id).value;
    try { localStorage.setItem(settingsKey, JSON.stringify(options)); } catch {}
    $('feedback').textContent = 'Practice options updated.';
    next();
  };
}
const groupNames = {alkenes:'Alkenes', alkynes:'Alkynes', alcohols:'Alcohols', halides:'Alkyl halides', epoxides:'Epoxides', carbonyls:'Carbonyls'};
const cardInputs = new Map(), groupInputs = new Map();
function selectionChanged() {
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
    label.append(input, document.createTextNode(card.name)); group.append(label); cardInputs.set(card.id, input);
  }
  $('reaction-checklist').append(group);
}
$('select-all').onclick = () => { selected = new Set(deck.map(card => card.id)); selectionChanged(); };
$('clear-all').onclick = () => { selected.clear(); selectionChanged(); };
selectionChanged();
document.addEventListener('keydown', event => {
  if (['SELECT', 'INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable) return;
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space' && event.target.tagName !== 'SUMMARY') { event.preventDefault(); reveal(); }
  else if (/^[1-4]$/.test(event.key)) { event.preventDefault(); rate(Number(event.key)); }
});
