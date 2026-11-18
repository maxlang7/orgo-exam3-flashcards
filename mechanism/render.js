function mechanismInner(scene, state) {
  const arrows = state.arrows || [];
  const atomNames = new Map(scene.atoms.map((atom, index) =>
    [atom.id, `${atom.label || atom.element || 'C'} (atom ${index + 1})`]));
  function drawBond([from, to, kind]) {
    if (kind === 'wedge') return `<polygon class="wedge" points="${wedgePoints(scene, from, to)}"/>`;
    const dash = kind === 'dash' ? ' dash' : '';
    const order = kind === 'dash' ? 1 : kind;
    return bondSegment(scene, from, to, order).map(([x1, y1, x2, y2]) =>
      `<line class="bond${dash}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`).join('');
  }
  function drawHit([from, to, order]) {
    const {a, b, len, ux, uy} = bondEnds(scene, from, to);
    const insetA = hitRadius(a) + 2;
    const insetB = hitRadius(b) + 2;
    const scale = Math.min(1, (len - 8) / (insetA + insetB));
    const id = bondId(from, to);
    const selected = state.selectedId === id ? ' is-selected' : '';
    const x1 = a.x + ux * insetA * scale;
    const y1 = a.y + uy * insetA * scale;
    const x2 = b.x - ux * insetB * scale;
    const y2 = b.y - uy * insetB * scale;
    const label = `${order === 2 ? "Double" : order === 3 ? "Triple" : "Single"} bond between ${atomNames.get(from)} and ${atomNames.get(to)}`;
    return `<g class="bond-hit${selected}" data-id="${id}" tabindex="${state.locked ? -1 : 0}" role="button" aria-label="${escapeXml(label)}"><line class="bond-hit-line" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/><line class="bond-select" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/></g>`;
  }
  const drawText = item => `<text class="${item.className}" x="${item.x}" y="${item.y}" text-anchor="middle">${escapeXml(item.text)}</text>`;
  function drawAtom(atom) {
    const selected = state.selectedId === atom.id ? ' is-selected' : '';
    const element = atom.element || 'C';
    const radius = hitRadius(atom);
    const body = atom.label
      ? `<text class="atom-label el-${element}" x="${atom.x}" y="${atom.y}" text-anchor="middle" dy="0.35em">${escapeXml(atom.label)}</text>`
      : '';
    return `<g class="atom${selected}" data-id="${atom.id}" tabindex="${state.locked ? -1 : 0}" role="button" aria-label="${escapeXml(atomNames.get(atom.id))}"><circle class="atom-ring" cx="${atom.x}" cy="${atom.y}" r="${radius - 2}"/>${body}<circle class="atom-hit" cx="${atom.x}" cy="${atom.y}" r="${radius}"/></g>`;
  }
  const owner = new Map();
  scene.molecules.forEach(group => group.atoms.forEach(atom => owner.set(atom.id, group)));
  const groupOf = id => owner.get(isBondId(id) ? bondAtoms(id)[0] : id);
  const shifts = new Map();
  if (state.motion === 'correct') {
    const active = new Set(arrows.flatMap(a => [groupOf(a.from), groupOf(a.to)]));
    // Move the reacting partners toward their shared center, including on stacked layouts.
    const cx = [...active].reduce((sum, g) => sum + g.cx, 0) / active.size;
    const cy = [...active].reduce((sum, g) => sum + g.cy, 0) / active.size;
    for (const group of active) {
      const dx = cx-group.cx, dy = cy-group.cy;
      const scale = Math.min(0.25, 21 / (Math.hypot(dx,dy) || 1));
      shifts.set(group, {x:dx*scale, y:dy*scale-7});
    }
  }
  const molecules = scene.molecules.map(group => {
    const bonds = scene.bonds.filter(([from]) => owner.get(from) === group);
    const shift = shifts.get(group);
    const motion = shift ? feedbackTrack('translate', t => `${shift.x*t} ${shift.y*t}`) : '';
    return `<g class="molecule">${motion}${bonds.map(drawHit).join('')}${bonds.map(drawBond).join('')}${group.atoms.map(drawAtom).join('')}${group.caption ? drawText(group.caption) : ''}</g>`;
  }).join('');
  const separators = scene.texts.filter(item => item.className === 'mech-plus').map(drawText).join('');
  const routedPoints = [];
  const paths = arrows.map(arrow => {
    const curve = curvedArrow(scene, arrow.from, arrow.to, routedPoints);
    const kind = state.locked ? 'good' : 'draft';
    const motion = shifts.size ? feedbackTrack('d', t =>
      arrowPathData(curve, shifts.get(groupOf(arrow.from)), shifts.get(groupOf(arrow.to)), t)) : '';
    return `<path class="mech-arrow is-${kind}" d="${arrowPathData(curve)}" marker-end="url(#arrow-${kind})">${motion}</path>`;
  }).join('');
  return `<defs>

<marker id="arrow-good" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1.7 Q5.5 4.8 11 6 Q5.5 7.2 0 10.3 L3.3 6 Z" fill="#285b40"/></marker>
<marker id="arrow-draft" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1.7 Q5.5 4.8 11 6 Q5.5 7.2 0 10.3 L3.3 6 Z" fill="#475569"/></marker>
</defs><g class="${state.locked ? 'is-locked' : ''} ${state.motion === 'incorrect' ? 'shake' : ''}">${molecules}${separators}${paths}</g>`;
}

// Keep arrow endpoints in sync with the molecules they are attached to.
function feedbackTrack(attribute, frame) {
  const tag = attribute === 'translate' ? 'animateTransform' : 'animate';
  const target = attribute === 'translate' ? 'attributeName="transform" type="translate"' : 'attributeName="d"';
  const values = [0, 1, -0.13, 0].map(frame).join(';');
  return `<${tag} ${target} begin="indefinite" dur="680ms" values="${values}" keyTimes="0;.42;.77;1" calcMode="spline" keySplines=".25 .7 .3 1;.4 0 .35 1;.2 .7 .3 1"/>`;
}

function renderMechanism(svg, view, outcome) {
  const compact = svg.clientWidth > 0 && svg.clientWidth < 460;
  const scene = layoutScene(view.scene, compact);
  svg.setAttribute('viewBox', scene.viewBox);
  const motion = outcome && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? outcome : null;
  svg.innerHTML = mechanismInner(scene, {...view, motion});
  if (motion === 'correct') svg.querySelectorAll('animate, animateTransform').forEach(track => track.beginElement());
}
