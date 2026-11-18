function mechanismInner(scene, state) {
  const arrows = state.arrows || [];
  const atomNames = new Map(scene.atoms.map((atom, index) =>
    [atom.id, `${atom.label || atom.element || 'C'} (atom ${index + 1})`]));
  function drawBond([from, to, kind]) {
    if (kind === 'wedge') return `<polygon class="wedge" points="${wedgePoints(scene, from, to)}"/>`;
    return bondSegment(scene, from, to, kind).map(([x1, y1, x2, y2]) =>
      `<line class="bond" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`).join('');
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
    if (state.static) return body;
    return `<g class="atom${selected}" data-id="${atom.id}" tabindex="${state.locked ? -1 : 0}" role="button" aria-label="${escapeXml(atomNames.get(atom.id))}"><circle class="atom-ring" cx="${atom.x}" cy="${atom.y}" r="${radius - 2}"/>${body}<circle class="atom-hit" cx="${atom.x}" cy="${atom.y}" r="${radius}"/></g>`;
  }
  const owner = new Map();
  scene.molecules.forEach(group => group.atoms.forEach(atom => owner.set(atom.id, group)));
  const molecules = scene.molecules.map(group => {
    const bonds = scene.bonds.filter(([from]) => owner.get(from) === group);
    const hits = state.static ? '' : bonds.map(drawHit).join('');
    return `<g class="molecule">${hits}${bonds.map(drawBond).join('')}${group.atoms.map(drawAtom).join('')}${group.caption ? drawText(group.caption) : ''}</g>`;
  }).join('');
  const separators = scene.texts.filter(item => item.className === 'mech-plus').map(drawText).join('');
  if (state.static) return molecules + separators;
  const routedPoints = [];
  const paths = arrows.map((arrow, index) => {
    const curve = curvedArrow(scene, arrow.from, arrow.to, routedPoints);
    const kind = index === state.mistakeIndex ? 'mistake' : state.locked ? 'good' : 'draft';
    return `<path class="mech-arrow is-${kind}" d="${arrowPathData(curve)}" marker-end="url(#arrow-${kind})"/>`;
  }).join('');
  return `<defs>

<marker id="arrow-good" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1.7 Q5.5 4.8 11 6 Q5.5 7.2 0 10.3 L3.3 6 Z" fill="#285b40"/></marker>
<marker id="arrow-draft" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1.7 Q5.5 4.8 11 6 Q5.5 7.2 0 10.3 L3.3 6 Z" fill="#475569"/></marker>
<marker id="arrow-mistake" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1.7 Q5.5 4.8 11 6 Q5.5 7.2 0 10.3 L3.3 6 Z" fill="#a1382b"/></marker>
</defs><g class="${state.locked ? 'is-locked' : ''} ${state.motion === 'incorrect' ? 'shake' : ''}">${molecules}${separators}${paths}</g>`;
}

function renderMechanism(svg, view, outcome, speed = 1) {
  const compact = svg.clientWidth > 0 && svg.clientWidth < 460;
  const scene = layoutScene(view.scene, compact);
  svg.setAttribute('viewBox', scene.viewBox);
  svg.style.setProperty('--shake-duration', `${320 / (speed || 1)}ms`);
  const motion = speed && outcome && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? outcome : null;
  svg.innerHTML = mechanismInner(scene, {...view, motion});
}
