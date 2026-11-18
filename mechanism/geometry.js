function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[char]));
}

function atomById(scene, id) {
  return scene.atoms.find(atom => atom.id === id);
}

function bondId(a, b) {
  return `bond:${[a, b].sort().join('|')}`;
}

function isBondId(id) {
  return typeof id === 'string' && id.startsWith('bond:');
}

function bondAtoms(id) {
  return id.slice(5).split('|');
}

function knownTarget(scene, id) {
  if (atomById(scene, id)) return true;
  if (!isBondId(id)) return false;
  return scene.bonds.some(([from, to]) => bondId(from, to) === id);
}

function hitRadius(atom) {
  if (!atom.label) return 15;
  const size = [...atom.label].length;
  if (size >= 3) return 24;
  if (size === 2) return 20;
  return 16;
}

function bondEnds(scene, fromId, toId) {
  const a = atomById(scene, fromId);
  const b = atomById(scene, toId);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return {a, b, dx, dy, len, ux: dx / len, uy: dy / len};
}

function bondSegment(scene, fromId, toId, order) {
  const {a, b, len, ux, uy} = bondEnds(scene, fromId, toId);
  const x1 = a.x + ux * bondGap(a, ux, uy);
  const y1 = a.y + uy * bondGap(a, ux, uy);
  const x2 = b.x - ux * bondGap(b, ux, uy);
  const y2 = b.y - uy * bondGap(b, ux, uy);
  if (order !== 2 && order !== 3) return [[x1, y1, x2, y2]];
  const ox = -uy * 3.6;
  const oy = ux * 3.6;
  if (order === 2 && !a.label && !b.label) {
    return [[x1, y1, x2, y2], [x1+ux*5+2*ox, y1+uy*5+2*oy, x2-ux*5+2*ox, y2-uy*5+2*oy]];
  }
  if (order === 2) return [[x1 + ox, y1 + oy, x2 + ox, y2 + oy], [x1 - ox, y1 - oy, x2 - ox, y2 - oy]];
  return [[x1, y1, x2, y2], [x1 + ox * 1.7, y1 + oy * 1.7, x2 + ox * 1.7, y2 + oy * 1.7], [x1 - ox * 1.7, y1 - oy * 1.7, x2 - ox * 1.7, y2 - oy * 1.7]];
}

function wedgePoints(scene, fromId, toId) {
  const {a, b, len, ux, uy} = bondEnds(scene, fromId, toId);
  const px = -uy;
  const py = ux;
  const start = bondGap(a, ux, uy) + 1;
  const end = len - bondGap(b, ux, uy);
  const half = 5.5;
  const x0 = a.x + ux * start;
  const y0 = a.y + uy * start;
  const x1 = a.x + ux * end;
  const y1 = a.y + uy * end;
  return [[x0, y0], [x1 + px * half, y1 + py * half], [x1 - px * half, y1 - py * half]]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function pointOf(scene, id) {
  if (isBondId(id)) {
    const [a, b] = bondAtoms(id);
    const A = atomById(scene, a);
    const B = atomById(scene, b);
    if (!A || !B) return null;
    return {x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, gap: 2};
  }
  const atom = atomById(scene, id);
  if (!atom) return null;
  return {x: atom.x, y: atom.y, gap: labelGap(atom)};
}

function labelGap(atom) {
  if (!atom.label) return 14;
  const n = [...atom.label].length;
  if (n >= 3) return 30;
  if (n === 2) return 26;
  return 16;
}

function collapseArrow(scene, fromId, toId, bend) {
  const [left, right] = bondAtoms(fromId);
  if (toId !== left && toId !== right) return null;
  const far = atomById(scene, toId === left ? right : left);
  const near = atomById(scene, toId);
  const lx = near.x - far.x;
  const ly = near.y - far.y;
  const llen = Math.hypot(lx, ly) || 1;
  const ux = lx / llen;
  const uy = ly / llen;
  const px = -uy;
  const py = ux;
  const side = Math.sign(bend || 1);
  const x1 = (far.x + near.x) / 2;
  const y1 = (far.y + near.y) / 2;
  const endGap = Math.min(llen / 4, labelGap(near));
  const x2 = near.x - ux * endGap * 0.3 + px * endGap * side;
  const y2 = near.y - uy * endGap * 0.3 + py * endGap * side;
  const cx = x1 + px * 34 * side;
  const cy = y1 + py * 34 * side;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function arrowPath(scene, fromId, toId, bend) {
  const alongBond = isBondId(fromId) && collapseArrow(scene, fromId, toId, bend);
  if (alongBond) return alongBond;
  const a = pointOf(scene, fromId);
  const b = pointOf(scene, toId);
  if (!a || !b) return '';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const room = Math.max(16, len - 18);
  const want = a.gap + b.gap + 2;
  const scale = want > room ? room / want : 1;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const cx = mx + -dy / len * bend;
  const cy = my + dx / len * bend;
  const end = (point, gap) => {
    const vx = cx - point.x;
    const vy = cy - point.y;
    const vlen = Math.hypot(vx, vy) || 1;
    return [point.x + vx / vlen * gap, point.y + vy / vlen * gap];
  };
  const [x1, y1] = end(a, a.gap * scale);
  const [x2, y2] = end(b, (b.gap + 2) * scale);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function centerOf(scene, id) {
  if (isBondId(id)) {
    const [a, b] = bondAtoms(id);
    const A = atomById(scene, a);
    const B = atomById(scene, b);
    if (!A || !B) return null;
    return {x: (A.x + B.x) / 2, y: (A.y + B.y) / 2};
  }
  const atom = atomById(scene, id);
  return atom ? {x: atom.x, y: atom.y} : null;
}

function crowdAt(scene, x, y, ignore) {
  let score = 0;
  for (const atom of scene.atoms) {
    if (ignore.has(atom.id)) continue;
    const d = Math.hypot(atom.x - x, atom.y - y);
    score += 1 / (d * d + 40);
  }
  return score;
}

function autoBend(scene, fromId, toId) {
  const a = centerOf(scene, fromId);
  const b = centerOf(scene, toId);
  if (!a || !b) return 42;
  const ignore = new Set(isBondId(fromId) ? bondAtoms(fromId) : [fromId]);
  ignore.add(toId);
  if (isBondId(fromId) && collapseArrow(scene, fromId, toId, 1)) {
    const [left, right] = bondAtoms(fromId);
    const farId = toId === left ? right : left;
    const far = atomById(scene, farId);
    const near = atomById(scene, toId);
    const lx = near.x - far.x;
    const ly = near.y - far.y;
    const llen = Math.hypot(lx, ly) || 1;
    const px = -ly / llen;
    const py = lx / llen;
    const mx = (far.x + near.x) / 2;
    const my = (far.y + near.y) / 2;
    const plus = crowdAt(scene, mx + px * 24, my + py * 24, ignore);
    const minus = crowdAt(scene, mx - px * 24, my - py * 24, ignore);
    return plus <= minus ? 34 : -34;
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const amount = Math.max(34, Math.min(78, len * 0.16));
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const px = -dy / len;
  const py = dx / len;
  const plus = crowdAt(scene, mx + px * amount, my + py * amount, ignore);
  const minus = crowdAt(scene, mx - px * amount, my - py * amount, ignore);
  const bend = plus <= minus ? amount : -amount;
  return Math.round(bend);
}
