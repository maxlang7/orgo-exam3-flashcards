const dashboardStorageKey = 'orgo-study-dashboard-v1';
const confidenceLabels = ['Unrated', 'Needs work', 'Getting there', 'Almost solid', 'Solid'];
let dashboardView = 'home';
let studyStorageAvailable = true;
let dashboardProgress = readDashboardProgress();
let currentPka = null;
let pkaRevealed = false;
let lastPracticeTrack = 'reactions';

function readDashboardProgress() {
  const progress = {pkaRatings: {}, days: {}};
  try {
    const saved = JSON.parse(localStorage.getItem(dashboardStorageKey));
    for (const card of pkaDeck) {
      const rating = saved?.pkaRatings?.[card.id];
      if ([1, 2, 3, 4].includes(rating)) progress.pkaRatings[card.id] = rating;
    }
    for (const [day, entries] of Object.entries(saved?.days ?? {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(entries)) continue;
      const validEntries = entries.filter(entry => {
        if (typeof entry !== 'string') return false;
        const [track, value] = entry.split(':');
        const cards = track === 'reaction' ? sheetDeck : track === 'pka' ? pkaDeck : [];
        return cards.some(card => String(card.id) === value);
      });
      if (validEntries.length) progress.days[day] = [...new Set(validEntries)];
    }
  } catch {
    studyStorageAvailable = false;
  }
  return progress;
}

function localStudyDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousStudyDay(date) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return previous;
}

function recordStudyAnswer(track, id, rating) {
  const latest = readDashboardProgress();
  // Preserve work in this tab when browser storage is unavailable.
  if (studyStorageAvailable) dashboardProgress = latest;
  if (track === 'pka') dashboardProgress.pkaRatings[id] = rating;
  const today = localStudyDate(new Date());
  const studied = new Set(dashboardProgress.days[today] ?? []);
  studied.add(`${track}:${id}`);
  dashboardProgress.days[today] = [...studied];
  try {
    localStorage.setItem(dashboardStorageKey, JSON.stringify(dashboardProgress));
    studyStorageAvailable = true;
  } catch {
    studyStorageAvailable = false;
  }
}

function studyNode(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderConfidence(rating) {
  const group = studyNode('span', 'confidence-indicator');
  group.dataset.level = rating;
  group.append(studyNode('span', 'confidence-label', confidenceLabels[rating]));
  const meter = studyNode('span', 'confidence-meter');
  meter.setAttribute('aria-hidden', 'true');
  for (let level = 1; level <= 4; level++) {
    const dot = studyNode('span', level <= rating ? 'filled' : '');
    meter.append(dot);
  }
  group.append(meter);
  return group;
}

function openReactionPractice(id) {
  lastPracticeTrack = 'reactions';
  showDashboardView('reactions');
  if (id === undefined) return;
  if (options.mode === 'mechanism' && !mechanismFor(id)) {
    options.mode = 'mixed';
    $('practice-mode').value = options.mode;
    try { localStorage.setItem(settingsKey, JSON.stringify(options)); } catch {}
  }
  selected.add(id);
  selectionChanged();
  next(id);
}

function renderKnowledgeMaps() {
  $('reaction-map-count').textContent = `${sheetDeck.length} reactions`;
  $('pka-map-count').textContent = `${pkaDeck.length} values`;
  $('reaction-map').replaceChildren();
  for (const [topic, name] of Object.entries(groupNames)) {
    const section = studyNode('section', 'knowledge-group');
    section.append(studyNode('h3', '', name));
    const grid = studyNode('div', 'knowledge-grid');
    for (const card of sheetDeck.filter(card => topicOf(card) === topic)) {
      const rating = ratings.reaction[card.id] ?? 0;
      const tile = studyNode('button', 'knowledge-card reaction-knowledge-card');
      tile.type = 'button';
      tile.dataset.level = rating;
      tile.setAttribute('aria-label', `${card.name}. ${confidenceLabels[rating]}. Practice reaction.`);
      tile.append(studyNode('span', 'knowledge-name', card.name));
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('knowledge-reaction');
      svg.setAttribute('aria-hidden', 'true');
      renderSheetReaction(svg, card, 'product', true);
      tile.append(svg, renderConfidence(rating));
      tile.addEventListener('click', () => openReactionPractice(card.id));
      grid.append(tile);
    }
    section.append(grid);
    $('reaction-map').append(section);
  }
  $('pka-map').replaceChildren();
  for (const card of pkaDeck) {
    const rating = dashboardProgress.pkaRatings[card.id] ?? 0;
    const tile = studyNode('button', 'knowledge-card pka-knowledge-card');
    tile.type = 'button';
    tile.dataset.level = rating;
    tile.setAttribute('aria-label', `${card.label}. ${confidenceLabels[rating]}. Practice pKa.`);
    tile.append(studyNode('span', 'knowledge-name', card.label));
    const drawing = studyNode('span', 'pka-preview');
    drawing.innerHTML = card.structures[0];
    drawing.querySelector('svg').setAttribute('aria-hidden', 'true');
    tile.append(drawing, renderConfidence(rating));
    tile.addEventListener('click', () => openPkaPractice(card.id));
    $('pka-map').append(tile);
  }
}

function renderStudyActivity(now = new Date()) {
  const today = localStudyDate(now);
  const days = dashboardProgress.days;
  $('home-today').textContent = (days[today] ?? []).length;
  let streakDate = new Date(now);
  // Yesterday's streak remains current until the student has today to continue it.
  if (!days[today]?.length) streakDate = previousStudyDay(streakDate);
  let streak = 0;
  while (days[localStudyDate(streakDate)]?.length) {
    streak++;
    streakDate = previousStudyDay(streakDate);
  }
  $('home-streak').textContent = streak;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const weekStartKey = localStudyDate(weekStart);
  $('home-week').textContent = Object.keys(days).filter(day => day >= weekStartKey && day <= today).length;

  const history = [];
  for (let offset = 27; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 12);
    const entries = days[localStudyDate(date)] ?? [];
    history.push({date, reaction: entries.filter(id => id.startsWith('reaction:')).length,
      pka: entries.filter(id => id.startsWith('pka:')).length});
  }
  const maximum = Math.max(1, ...history.map(day => day.reaction + day.pka));
  $('activity-chart').replaceChildren();
  for (const day of history) {
    const label = `${day.date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} · ${day.reaction} reactions, ${day.pka} pKa values`;
    const column = studyNode('div', 'activity-day');
    column.tabIndex = 0;
    column.setAttribute('role', 'img');
    column.setAttribute('aria-label', label);
    column.dataset.tooltip = label;
    const stack = studyNode('span', 'activity-stack');
    const reactionBar = studyNode('span', 'activity-reaction');
    const pkaBar = studyNode('span', 'activity-pka');
    reactionBar.style.height = `${day.reaction / maximum * 100}%`;
    pkaBar.style.height = `${day.pka / maximum * 100}%`;
    stack.append(reactionBar, pkaBar);
    stack.setAttribute('aria-hidden', 'true');
    column.append(stack);
    $('activity-chart').append(column);
  }
  $('activity-start').textContent = history[0].date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  $('activity-end').textContent = 'Today';
  $('activity-description').textContent = Object.keys(days).length
    ? 'Each card counts once per day.' : 'Your practice will appear here as you rate cards.';
}

function renderWeaknesses() {
  const weaknesses = [
    ...sheetDeck.map(card => ({name: card.name, rating: ratings.reaction[card.id],
      track: 'Reaction', open: () => openReactionPractice(card.id)})),
    ...pkaDeck.map(card => ({name: card.label, rating: dashboardProgress.pkaRatings[card.id],
      track: 'pKa', open: () => openPkaPractice(card.id)}))
  ].filter(card => card.rating > 0 && card.rating < 4).sort((a, b) => a.rating - b.rating).slice(0, 3);
  $('home-weaknesses').replaceChildren();
  for (const card of weaknesses) {
    const button = studyNode('button', 'weakness-card');
    button.type = 'button';
    const text = studyNode('span', 'weakness-name');
    text.append(studyNode('small', '', card.track), studyNode('span', '', card.name));
    button.append(text, renderConfidence(card.rating));
    button.addEventListener('click', card.open);
    $('home-weaknesses').append(button);
  }
  if (!weaknesses.length) {
    $('home-weaknesses').append(studyNode('p', 'muted-copy', 'Your lower-confidence cards will appear here as you practice.'));
  }
}

function renderStudyHome() {
  renderStudyActivity();
  renderWeaknesses();
  renderKnowledgeMaps();
  $('local-storage-status').textContent = studyStorageAvailable
    ? 'Saved in this browser.' : 'Browser storage is unavailable. Progress is kept while this page stays open.';
}

function showDashboardView(view) {
  stopMorph();
  dashboardView = view;
  $('study-home').hidden = view !== 'home';
  $('reaction-workbench').hidden = view !== 'reactions';
  $('pka-practice').hidden = view !== 'pka';
  for (const button of document.querySelectorAll('[data-study-view]')) {
    if (button.dataset.studyView === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (view === 'home') renderStudyHome();
  if (view === 'reactions' && attempt) paintMechanism();
  window.scrollTo(0, 0);
}

function setDashboardBeta(enabled) {
  document.querySelector('h1').textContent = enabled ? 'Organic chemistry' : 'Reaction Flashcard Trainer';
  $('study-navigation').hidden = !enabled;
  if (enabled) showDashboardView('home');
  else {
    stopMorph();
    dashboardView = 'reactions';
    $('study-home').hidden = true;
    $('pka-practice').hidden = true;
    $('reaction-workbench').hidden = false;
    if (attempt) paintMechanism();
  }
}

function choosePkaCard() {
  const candidates = pkaDeck.filter(card => card.id !== currentPka?.id);
  const weights = candidates.map(card => [8, 5, 3, 1][(dashboardProgress.pkaRatings[card.id] ?? 1) - 1]);
  let pick = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  return candidates.find((card, index) => (pick -= weights[index]) < 0) ?? candidates.at(-1);
}

function nextPkaCard(id) {
  currentPka = pkaDeck.find(card => card.id === id) ?? choosePkaCard();
  pkaRevealed = false;
  $('pka-answer').hidden = true;
  $('pka-answer').textContent = `${currentPka.label} · ${currentPka.answer}`;
  $('pka-reveal').hidden = false;
  $('pka-rating').hidden = true;
  const variant = Math.floor(Math.random() * currentPka.structures.length);
  $('pka-structure').innerHTML = currentPka.structures[variant];
}

function openPkaPractice(id) {
  lastPracticeTrack = 'pka';
  nextPkaCard(id);
  showDashboardView('pka');
}

function revealPka() {
  if (!currentPka || pkaRevealed) return;
  pkaRevealed = true;
  $('pka-answer').hidden = false;
  $('pka-reveal').hidden = true;
  $('pka-rating').hidden = false;
}

function ratePka(rating) {
  if (!currentPka || !pkaRevealed) return;
  recordStudyAnswer('pka', currentPka.id, rating);
  $('pka-feedback').textContent = `Saved · ${rating * 25}% confidence`;
  nextPkaCard();
}

$('jump-in').addEventListener('click', () => {
  if (lastPracticeTrack === 'pka') openPkaPractice();
  else openReactionPractice();
});
for (const button of document.querySelectorAll('[data-study-view]')) {
  button.addEventListener('click', () => {
    const view = button.dataset.studyView;
    if (view === 'reactions') openReactionPractice();
    else if (view === 'pka') openPkaPractice();
    else showDashboardView('home');
  });
}
$('pka-next').addEventListener('click', () => nextPkaCard());
$('pka-reveal').addEventListener('click', revealPka);
for (const button of document.querySelectorAll('[data-pka-rating]')) {
  button.addEventListener('click', () => ratePka(Number(button.dataset.pkaRating)));
}
document.addEventListener('keydown', event => {
  if (!sheetBeta || dashboardView !== 'pka' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (['SELECT', 'INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable) return;
  if (event.code === 'Space' && !['BUTTON', 'SUMMARY'].includes(event.target.tagName)) {
    event.preventDefault();
    revealPka();
  } else if (/^[1-4]$/.test(event.key) && pkaRevealed) {
    event.preventDefault();
    ratePka(Number(event.key));
  }
});
window.addEventListener('storage', event => {
  if (event.key === dashboardStorageKey || event.key === null) dashboardProgress = readDashboardProgress();
  if (event.key === key || event.key === null) ratings.reaction = loadRatings(key);
  if (sheetBeta && dashboardView === 'home') renderStudyHome();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && sheetBeta && dashboardView === 'home') renderStudyHome();
});
