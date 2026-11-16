const key = 'orgo-exam3-confidence-v1';
let state = {};
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && typeof saved === 'object') {
    for (const card of deck) if ([1, 2, 3, 4].includes(saved[card.id])) state[card.id] = saved[card.id];
  }
} catch {}
const $ = id => document.getElementById(id);
let current, mode, revealed = false, last = null, count = 0;
function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }
function choose() {
  const candidates = deck.filter(card => card.id !== last);
  const weights = candidates.map(card => [8, 5, 3, 1][(state[card.id] || 1) - 1]);
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
  $('mask-label').textContent = mode === 'reagents' ? '? Reagents' : '? Product';
  $('reaction').setAttribute('aria-label', mode === 'reagents' ? 'Starting structure and product. Work out the reagents.' : 'Starting structure and reagents. Work out the product.');
  updateVisibility();
}
function next() {
  current = choose(); last = current.id; count++; revealed = false;
  mode = Math.random() < .5 ? 'reagents' : 'product';
  $('mode-label').textContent = mode === 'reagents' ? 'Find the reagents' : 'Predict the product';
  $('question').textContent = mode === 'reagents' ? 'What completes this transformation?' : 'What product forms?';
  $('solution').hidden = true; $('reveal').hidden = false;
  document.querySelector('details').open = false;
  $('progress').textContent = `${Object.keys(state).length} / ${deck.length} reactions rated`;
  $('session-count').textContent = `Practice ${String(count).padStart(2, '0')}`;
  drawReaction();
  $('answer').src = current.image;
  updateVisibility();
}
function reveal() {
  if (revealed) return;
  revealed = true; updateVisibility();
  $('solution').hidden = false; $('reveal').hidden = true;
}
function rate(rating) {
  if (!revealed || ![1, 2, 3, 4].includes(rating)) return;
  state[current.id] = rating; save();
  $('feedback').textContent = `Saved · ${rating * 25}% confidence. ${rating < 3 ? 'You’ll see that reaction more often.' : rating === 4 ? 'That reaction will appear less often.' : 'Keep practicing to make it stick.'}`;
  next();
}
$('reveal').onclick = reveal;
document.querySelectorAll('[data-rating]').forEach(button => button.onclick = () => rate(Number(button.dataset.rating)));
$('reset').onclick = () => {
  if (confirm('Clear all confidence ratings on this device?')) {
    state = {}; save(); $('feedback').textContent = 'Progress cleared. Start fresh.'; next();
  }
};
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space' && event.target.tagName !== 'SUMMARY') { event.preventDefault(); reveal(); }
  else if (/^[1-4]$/.test(event.key)) { event.preventDefault(); rate(Number(event.key)); }
});
next();
