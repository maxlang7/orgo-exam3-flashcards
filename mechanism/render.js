function mechanismInner(scene, state) {
  const arrows = state.arrows || [];
  const bonds = scene.bonds.map(([from, to, kind]) => {
    if (kind === 'wedge') return `<polygon class="wedge" points="${wedgePoints(scene, from, to)}"/>`;
    const dash = kind === 'dash' ? ' dash' : '';
    const order = kind === 'dash' ? 1 : kind;
    return bondSegment(scene, from, to, order).map(([x1, y1, x2, y2]) =>
      `<line class="bond${dash}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`).join('');
  }).join('');
  const hits = scene.bonds.map(([from, to]) => {
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
    const label = `bond between ${atomById(scene, from).name} and ${atomById(scene, to).name}`;
    return `<g class="bond-hit${selected}" data-id="${id}" tabindex="${state.locked ? -1 : 0}" role="button" aria-label="${escapeXml(label)}"><line class="bond-hit-line" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/><line class="bond-select" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/></g>`;
  }).join('');
  const notes = (scene.texts || []).map(item =>
    `<text class="${item.className}" x="${item.x}" y="${item.y}" text-anchor="middle">${escapeXml(item.text)}</text>`).join('');
  const paths = arrows.map(arrow => {
    const kind = arrow.kind === 'bad' ? 'bad' : 'good';
    return `<path class="mech-arrow is-${kind}" d="${arrowPath(scene, arrow.from, arrow.to, autoBend(scene, arrow.from, arrow.to))}" marker-end="url(#arrow-${kind})"/>`;
  }).join('');
  const atoms = scene.atoms.map(atom => {
    const selected = state.selectedId === atom.id ? ' is-selected' : '';
    const element = atom.element || 'C';
    const radius = hitRadius(atom);
    const body = atom.label
      ? `<text class="atom-label el-${element}" x="${atom.x}" y="${atom.y}" text-anchor="middle" dy="0.35em">${escapeXml(atom.label)}</text>`
      : '';
    return `<g class="atom${selected}" data-id="${atom.id}" tabindex="${state.locked ? -1 : 0}" role="button" aria-label="${escapeXml(atom.name)}"><circle class="atom-ring" cx="${atom.x}" cy="${atom.y}" r="${radius - 2}"/>${body}<circle class="atom-hit" cx="${atom.x}" cy="${atom.y}" r="${radius}"/></g>`;
  }).join('');
  return `<defs>

<marker id="arrow-good" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1.2 L11 6 L1 10.8 Z" fill="#285b40"/></marker>
<marker id="arrow-bad" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1.2 L11 6 L1 10.8 Z" fill="#9c3b3b"/></marker>
</defs><g class="${state.locked ? 'is-locked' : ''}">${hits}${bonds}${notes}${paths}${atoms}</g>`;
}

function renderMechanism(svg, view) {
  const compact = svg.clientWidth > 0 && svg.clientWidth < 460;
  const scene = layoutScene(view.scene, compact);
  svg.setAttribute('viewBox', scene.viewBox);
  svg.innerHTML = mechanismInner(scene, view);
}
