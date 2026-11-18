// First click is where the electrons leave: a bond or an atom. Second click is the
// atom they go to. Bond-electron arrows must start on the bond itself.
//
// Angles use standard position, 0° east and 90° north, with y growing downward.
// Carbon chains are ordinary zigzags, 120° at each carbon. A carbonyl carbon
// keeps that chain. The oxygen and the incoming group sit above it, 50° apart.
// Water is 104.5°. C-Mg-Br is linear, and a drawn CH2-CH3 bend is 109.5°.

const mechanisms = buildMechanisms();

function mechanismFor(id) {
  return mechanisms.find(item => item.cardId === id) || null;
}

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
  const x1 = a.x + ux * (a.pad || 0);
  const y1 = a.y + uy * (a.pad || 0);
  const x2 = b.x - ux * (b.pad || 0);
  const y2 = b.y - uy * (b.pad || 0);
  if (order !== 2 && order !== 3) return [[x1, y1, x2, y2]];
  const ox = -uy * 3.6;
  const oy = ux * 3.6;
  if (order === 2) return [[x1 + ox, y1 + oy, x2 + ox, y2 + oy], [x1 - ox, y1 - oy, x2 - ox, y2 - oy]];
  return [[x1, y1, x2, y2], [x1 + ox * 1.7, y1 + oy * 1.7, x2 + ox * 1.7, y2 + oy * 1.7], [x1 - ox * 1.7, y1 - oy * 1.7, x2 - ox * 1.7, y2 - oy * 1.7]];
}

function wedgePoints(scene, fromId, toId) {
  const {a, b, len, ux, uy} = bondEnds(scene, fromId, toId);
  const px = -uy;
  const py = ux;
  const start = (a.pad || 0) + 1;
  const end = len - (b.pad || 0);
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
  const off = 22 * Math.sign(bend || 1);
  const farClear = far.label ? labelGap(far) : (far.pad || 8);
  const nearClear = near.label ? labelGap(near) + 2 : (near.pad || 12);
  let start = farClear + 8;
  let end = llen - nearClear;
  if (end - start < 32) {
    end = llen - Math.min(nearClear, llen * 0.28);
    start = end - 34;
    if (start < llen * 0.12) start = llen * 0.12;
    if (end > llen - 8) end = llen - 8;
    if (end < start + 18) end = Math.min(llen - 6, start + 18);
  }
  const x1 = far.x + ux * start + px * off;
  const y1 = far.y + uy * start + py * off;
  const x2 = far.x + ux * end + px * off * 0.4;
  const y2 = far.y + uy * end + py * off * 0.4;
  const cx = (x1 + x2) / 2 + px * off * 0.4;
  const cy = (y1 + y2) / 2 + py * off * 0.4;
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
    return `<path class="mech-arrow is-${kind}" d="${arrowPath(scene, arrow.from, arrow.to, arrow.bend)}" marker-end="url(#arrow-${kind})"/>`;
  }).join('');
  const atoms = scene.atoms.map(atom => {
    const selected = state.selectedId === atom.id ? ' is-selected' : '';
    const element = atom.element || 'C';
    const radius = hitRadius(atom);
    const body = atom.label
      ? `<text class="atom-label el-${element}" x="${atom.x}" y="${atom.y}" text-anchor="middle" dy="0.35em">${escapeXml(atom.label)}</text>`
      : `<circle class="atom-dot el-${element}" cx="${atom.x}" cy="${atom.y}" r="4"/>`;
    return `<g class="atom${selected}" data-id="${atom.id}" tabindex="${state.locked ? -1 : 0}" role="button" aria-label="${escapeXml(atom.name)}"><circle class="atom-ring" cx="${atom.x}" cy="${atom.y}" r="${radius - 2}"/>${body}<circle class="atom-hit" cx="${atom.x}" cy="${atom.y}" r="${radius}"/></g>`;
  }).join('');
  return `<defs>
<style>
.bond{stroke:#24302b;stroke-width:2.15;stroke-linecap:round;pointer-events:none}
.bond.dash{stroke-dasharray:5 4}
.wedge{fill:#24302b;stroke:#24302b;stroke-width:.6;stroke-linejoin:round;pointer-events:none}
.bond-hit-line{stroke:transparent;stroke-width:16;stroke-linecap:round;cursor:pointer}
.bond-select{stroke:transparent;stroke-width:7;stroke-linecap:round;pointer-events:none}
.bond-hit.is-selected .bond-select{stroke:#285b40;stroke-opacity:.55}
.bond-hit:hover .bond-select,.bond-hit:focus-visible .bond-select{stroke:#7ea88a;stroke-opacity:.8}
.atom-label{font-family:system-ui,sans-serif;font-size:18px;font-weight:600;stroke:#fff;stroke-width:6px;paint-order:stroke fill}
.atom-dot{stroke:#fff;stroke-width:2;paint-order:stroke fill}
.el-C{fill:#24302b}
.el-O{fill:#d6453d}
.el-H{fill:#5c6b73}
.el-Mg{fill:#0f8a62}
.el-Br{fill:#b4532a}
.el-N{fill:#2f62b5}
.el-S{fill:#c2a033}
.el-Cl{fill:#1f9d57}
.el-F{fill:#1f9d57}
.el-P{fill:#d4782a}
.el-B{fill:#e09a3e}
.el-Al{fill:#7d8b99}
.el-Si{fill:#6b7280}
.el-Hg{fill:#8d7ca8}
.el-Cr{fill:#3d8b8b}
.el-Na{fill:#6d4ec2}
.el-Os{fill:#5c6b8a}
.el-I{fill:#7a4ea3}
.el-Li{fill:#5b4b8a}
.atom-hit{fill:transparent;cursor:pointer}
.atom-ring{fill:none;stroke:transparent;stroke-width:2}
.atom:hover .atom-ring,.atom:focus-visible .atom-ring{stroke:#8eaf96}
.atom.is-selected .atom-ring{stroke:#285b40}
.mech-arrow{fill:none;stroke-width:2.4;stroke-linecap:round;pointer-events:none}
.mech-arrow.is-good{stroke:#285b40}
.mech-arrow.is-bad{stroke:#9c3b3b}
.mech-plus{font-family:system-ui,sans-serif;font-size:26px;fill:#65776c;pointer-events:none}
.mech-salt{font-family:system-ui,sans-serif;font-size:16px;font-weight:600;fill:#65776c;pointer-events:none}
</style>
<marker id="arrow-good" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1.2 L11 6 L1 10.8 Z" fill="#285b40"/></marker>
<marker id="arrow-bad" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1.2 L11 6 L1 10.8 Z" fill="#9c3b3b"/></marker>
</defs><g class="${state.locked ? 'is-locked' : ''}">${hits}${bonds}${notes}${paths}${atoms}</g>`;
}

function renderMechanism(svg, view) {
  svg.setAttribute('viewBox', '0 0 760 440');
  svg.innerHTML = mechanismInner(view.scene, view);
}

function arrowIdentity(spec) {
  return `${spec.sources[0].from}>${spec.to}`;
}

function viableChoices(step, placed) {
  const used = placed.map(arrow => arrow.key);
  const alive = [];
  step.choices.forEach((choice, index) => {
    const pool = choice.arrows.map(arrowIdentity);
    const fits = used.every(key => {
      const at = pool.indexOf(key);
      if (at < 0) return false;
      pool.splice(at, 1);
      return true;
    });
    if (fits) alive.push(index);
  });
  return alive;
}

function locate(step, from, to) {
  for (const choice of step.choices) {
    for (const spec of choice.arrows) {
      const source = spec.sources.find(item => item.from === from);
      if (source && spec.to === to) return {key: arrowIdentity(spec), bend: source.bend};
    }
  }
  return null;
}

function judgeArrow(step, placed, from, to) {
  const found = locate(step, from, to);
  if (found && placed.some(arrow => arrow.key === found.key)) return {ok: false, duplicate: true};
  if (!found || !viableChoices(step, placed.concat([{key: found.key}])).length) {
    const swapped = locate(step, to, from);
    const backwards = Boolean(swapped && !placed.some(arrow => arrow.key === swapped.key));
    return {ok: false, backwards};
  }
  const next = placed.concat([{key: found.key}]);
  const done = viableChoices(step, next).every(index => step.choices[index].arrows.length === next.length);
  return {ok: true, bend: found.bend, key: found.key, done};
}

function createAttempt(mech) {
  let stepIndex = 0;
  let placed = [];
  let pending = null;
  let peeked = false;
  let anyPeek = false;
  let finished = false;
  let stepComplete = false;
  let wrong = null;
  let status = mech.steps[0].open;
  let bad = false;

  function step() { return mech.steps[stepIndex]; }
  function scene() { return mech.scenes[finished ? mech.doneScene : step().scene]; }
  function shownArrows() {
    if (!peeked) return [];
    const alive = viableChoices(step(), placed);
    const spec = step().choices[alive[0] || 0].arrows;
    return spec.filter(arrow => !placed.some(item => item.key === arrowIdentity(arrow)))
      .map(arrow => ({from: arrow.sources[0].from, to: arrow.to, bend: arrow.sources[0].bend, kind: 'good'}));
  }

  return {
    click(id) {
      if (finished || peeked || stepComplete) return {ignored: true, doneStep: false};
      if (!knownTarget(scene(), id)) return {ignored: true, doneStep: false};
      wrong = null;
      bad = false;
      if (!pending) {
        pending = id;
        status = 'Now click the atom those electrons go to.';
        return {ignored: false, doneStep: false};
      }
      if (pending === id) {
        pending = null;
        status = placed.length ? 'Selection cleared.' : step().open;
        return {ignored: false, doneStep: false};
      }
      const from = pending;
      pending = null;
      const verdict = judgeArrow(step(), placed, from, id);
      if (verdict.duplicate) {
        status = 'That arrow is already drawn.';
        return {ignored: false, doneStep: false};
      }
      if (!verdict.ok) {
        wrong = {from, to: id, bend: 36, kind: 'bad'};
        bad = true;
        status = verdict.backwards
          ? 'Those are backwards. First click the bond or atom the electrons leave.'
          : 'That pair does not match this step.';
        return {ignored: false, doneStep: false};
      }
      placed.push({from, to: id, bend: verdict.bend, key: verdict.key, kind: 'good'});
      if (verdict.done) {
        stepComplete = true;
        status = 'Those arrows match.';
        return {ignored: false, doneStep: true};
      }
      const remain = step().choices[0].arrows.length - placed.length;
      status = `That arrow matches. ${remain} ${remain === 1 ? 'arrow' : 'arrows'} still to draw.`;
      return {ignored: false, doneStep: false};
    },
    undo() {
      if (finished || peeked) return;
      wrong = null;
      bad = false;
      stepComplete = false;
      if (pending) {
        pending = null;
        status = placed.length ? 'Selection cleared.' : step().open;
        return;
      }
      if (!placed.length) return;
      placed.pop();
      status = placed.length ? 'Last arrow removed.' : step().open;
    },
    reveal() {
      if (finished || peeked || stepComplete) return;
      peeked = true;
      anyPeek = true;
      pending = null;
      wrong = null;
      bad = false;
      status = 'Correct arrows for this step.';
    },
    advance() {
      if (!stepComplete || peeked || finished) return;
      stepComplete = false;
      placed = [];
      pending = null;
      wrong = null;
      bad = false;
      if (stepIndex < mech.steps.length - 1) {
        stepIndex++;
        status = step().open;
      } else finish();
    },
    continueAfterPeek() {
      if (!peeked || finished) return;
      peeked = false;
      placed = [];
      pending = null;
      wrong = null;
      stepComplete = false;
      bad = false;
      if (stepIndex < mech.steps.length - 1) {
        stepIndex++;
        status = step().open;
      } else finish();
    },
    view() {
      const arrows = [
        ...placed.map(arrow => ({...arrow, kind: 'good'})),
        ...(wrong ? [wrong] : []),
        ...shownArrows()
      ];
      return {
        scene: scene(),
        arrows,
        stepNumber: stepIndex + 1,
        stepCount: mech.steps.length,
        selectedId: pending,
        locked: peeked || finished || stepComplete,
        peeked,
        finished,
        stepComplete,
        bad,
        status,
        canUndo: !finished && !peeked && (placed.length > 0 || pending !== null),
        source: mech.source,
        prompt: finished
          ? (anyPeek ? 'Correct arrows were shown before this was finished. Rate it as it went.' : 'Every arrow matched. Rate how confident you were.')
          : stepComplete || peeked ? 'Review the arrows before continuing.' : 'Choose the atom or bond supplying the electrons, then the atom receiving them.'
      };
    }
  };

  function finish() {
    finished = true;
    bad = false;
    status = anyPeek ? 'Correct arrows were shown before this was finished.' : mech.doneStatus;
  }
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

function finalize(mech) {
  for (const step of mech.steps) {
    const scene = mech.scenes[step.scene];
    for (const choice of step.choices) {
      for (const spec of choice.arrows) {
        for (const source of spec.sources) {
          if (source.bend == null) source.bend = autoBend(scene, source.from, spec.to);
        }
      }
    }
  }
  return mech;
}

function buildMechanisms() {
  const L = 76;
  const P = (x, y, deg, len = L) => {
    const r = deg * Math.PI / 180;
    return [Math.round((x + len * Math.cos(r)) * 10) / 10, Math.round((y - len * Math.sin(r)) * 10) / 10];
  };
  const padFor = label => {
    if (!label) return 5;
    if (label === 'H') return 14;
    const n = [...label].length;
    if (n >= 3) return 22;
    if (n === 2) return 18;
    return 16;
  };
  function A(id, xy, opts = {}) {
    const label = opts.label;
    const atom = {
      id, x: xy[0], y: xy[1],
      element: opts.element || 'C',
      pad: opts.pad || padFor(label),
      name: opts.name || id
    };
    if (label) atom.label = label;
    return atom;
  }
  function sprout(base, deg, opts, len) {
    return A(opts.id, P(base.x, base.y, deg, len), opts);
  }
  function zz(specs, x, y, heading) {
    const atoms = [];
    let dir = heading;
    specs.forEach((spec, i) => {
      atoms.push(A(spec.id, [round1(x), round1(y)], spec));
      if (i < specs.length - 1) {
        const n = P(x, y, dir);
        x = n[0];
        y = n[1];
        dir += i % 2 === 0 ? -60 : 60;
      }
    });
    return atoms;
  }
  function round1(n) { return Math.round(n * 10) / 10; }
  function T(x, y, text, className = 'mech-salt') { return {x, y, text, className}; }
  function plus(x, y) { return T(x, y, '+', 'mech-plus'); }
  function join(...parts) {
    const atoms = [], bonds = [], texts = [];
    for (const p of parts) {
      if (!p) continue;
      if (p.atoms) atoms.push(...p.atoms);
      if (p.bonds) bonds.push(...p.bonds);
      if (p.texts) texts.push(...p.texts);
    }
    return {atoms, bonds, texts};
  }
  function leave(to, a, b) {
    const id = `bond:${[a, b].sort().join('|')}`;
    return {to, sources: [{from: id}]};
  }
  function lone(to, from) { return {to, sources: [{from}]}; }
  function step(scene, open, choices) {
    const list = choices[0] && choices[0].arrows ? choices : [{arrows: choices}];
    return {scene, open, choices: list};
  }
  function protonate(oId) {
    return [
      {arrows: [lone('h1', oId), leave('oW', 'h1', 'oW')]},
      {arrows: [lone('h2', oId), leave('oW', 'h2', 'oW')]}
    ];
  }
  function mech(cardId, source, doneStatus, scenes, steps, doneScene = 'product') {
    return {cardId, source, doneStatus, doneScene, scenes, steps};
  }
  function water(x, y, open = 170) {
    const o = A('oW', [x, y], {label: 'O', element: 'O', name: 'water oxygen', pad: 16});
    const h1 = A('h1', P(x, y, open + 52.2, 62), {label: 'H', element: 'H', name: 'a hydrogen of water', pad: 14});
    const h2 = A('h2', P(x, y, open - 52.2, 62), {label: 'H', element: 'H', name: 'the other hydrogen of water', pad: 14});
    return {atoms: [h1, o, h2], bonds: [['h1', 'oW', 1], ['oW', 'h2', 1]]};
  }
  function hydronium(x, y) {
    const o = A('oA', [x, y], {label: 'O', element: 'O', name: 'hydronium oxygen', pad: 16});
    const h = A('hA', P(x, y, 180, 62), {label: 'H', element: 'H', name: 'the acidic hydrogen', pad: 14});
    const h2 = A('hA2', P(x, y, 55, 62), {label: 'H', element: 'H', name: 'a hydrogen of hydronium', pad: 14});
    const h3 = A('hA3', P(x, y, -55, 62), {label: 'H', element: 'H', name: 'a hydrogen of hydronium', pad: 14});
    return {atoms: [h, o, h2, h3], bonds: [['hA', 'oA', 1], ['oA', 'hA2', 1], ['oA', 'hA3', 1]], texts: [plus(x + 34, y - 26)]};
  }
  function propene(x, y) {
    const atoms = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'more substituted alkene carbon'},
      {id: 'c3', name: 'less substituted alkene carbon'}
    ], x, y, 28);
    return {atoms, bonds: [['c1', 'c2', 1], ['c2', 'c3', 2]]};
  }
  function chain3(x, y) {
    return zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the end carbon'}
    ], x, y, 28);
  }
  function grin(x, y) {
    const cA = A('cAlpha', [x, y], {name: 'carbon bonded to magnesium'});
    const cB = A('cBeta', P(x, y, 250.5, 72), {label: 'H₃C', name: 'methyl of the Grignard', pad: 22});
    const mg = A('mg', P(x, y, 0, 76), {label: 'Mg', element: 'Mg', name: 'magnesium', pad: 18});
    const br = A('br', P(mg.x, mg.y, 0, 74), {label: 'Br', element: 'Br', name: 'bromine', pad: 16});
    return {atoms: [cB, cA, mg, br], bonds: [['cAlpha', 'cBeta', 1], ['cAlpha', 'mg', 1], ['mg', 'br', 1]]};
  }
  function capAt(x, y, parts) {
    const c = A(parts.id || 'cC', [x, y], {name: parts.name || 'the central carbon'});
    const left = sprout(c, 210, parts.left);
    const right = sprout(c, 330, parts.right, parts.rightLen);
    const upL = sprout(c, 115, parts.upL, parts.upLen || 72);
    const upR = sprout(c, 65, parts.upR, parts.upLen || 72);
    const bonds = [
      [left.id, c.id, 1],
      [c.id, right.id, parts.rightOrder || 1],
      [c.id, upL.id, 1],
      [c.id, upR.id, 1]
    ];
    return {c, left, right, upL, upR, atoms: [left, c, right, upL, upR], bonds};
  }
  function ketone(x, y, right) {
    const c = A('cCO', [x, y], {name: 'carbonyl carbon'});
    const left = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'methyl carbon', pad: 22});
    const r = sprout(c, 330, right);
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 72);
    return {c, left, r, o, atoms: [left, c, r, o], bonds: [['meL', 'cCO', 1], ['cCO', right.id, 1], ['cCO', 'oCO', 2]]};
  }

  function ring5(cx, cy, order01 = 2) {
    const ids = ['r0', 'r1', 'r2', 'r3', 'r4'];
    const atoms = ids.map((id, i) => A(id, P(cx, cy, 90 - i * 72, 70), {name: 'a ring carbon'}));
    const bonds = ids.map((id, i) => [id, ids[(i + 1) % 5], i === 0 ? order01 : 1]);
    return {atoms, bonds};
  }
  function outward(cx, cy, atom, dist) {
    const dx = atom.x - cx;
    const dy = atom.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [round1(atom.x + dx / len * dist), round1(atom.y + dy / len * dist)];
  }
  function midOut(cx, cy, a, b, dist) {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [round1(mx + dx / len * dist), round1(my + dy / len * dist)];
  }
  function ipa(x, y, spec) {
    const atoms = chain3(x, y);
    const o = sprout(atoms[1], 90, spec, 70);
    return {atoms: [...atoms, o], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', spec.id, 1]], o, c2: atoms[1]};
  }
  function primary(x, y, spec, heading = 28) {
    const atoms = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the end carbon'}
    ], x, y, heading);
    const end = sprout(atoms[2], heading, spec, 68);
    return {atoms: [...atoms, end], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', spec.id, 1]], end, c3: atoms[2], c2: atoms[1]};
  }
  function br2(x, y) {
    const a = A('brA', [x, y], {label: 'Br', element: 'Br', name: 'the nearer bromine', pad: 16});
    const b = A('brB', P(x, y, 0, 72), {label: 'Br', element: 'Br', name: 'the leaving bromine', pad: 16});
    return {atoms: [a, b], bonds: [['brA', 'brB', 1]]};
  }
  function hbrMol(x, y) {
    const h = A('hX', [x, y], {label: 'H', element: 'H', name: 'hydrogen of HBr', pad: 14});
    const br = A('brX', P(x, y, 0, 70), {label: 'Br', element: 'Br', name: 'bromine of HBr', pad: 16});
    return {atoms: [h, br], bonds: [['hX', 'brX', 1]]};
  }
  function epoxide(x, y) {
    const o = A('oE', [x, y], {label: 'O', element: 'O', name: 'epoxide oxygen', pad: 16});
    const cM = A('cM', P(x, y, 240, 66), {name: 'more substituted epoxide carbon'});
    const cL = A('cL', P(x, y, 300, 66), {name: 'less substituted epoxide carbon'});
    const me = sprout(cM, 195, {id: 'me', label: 'H₃C', name: 'methyl carbon', pad: 22}, 70);
    return {atoms: [o, cM, cL, me], bonds: [['oE', 'cM', 1], ['oE', 'cL', 1], ['cM', 'cL', 1], ['cM', 'me', 1]], o, cM, cL};
  }
  function borane(x, y) {
    const b = A('bN', [x, y], {label: 'B', element: 'B', name: 'boron', pad: 16});
    const h = A('hB', P(x, y, 180, 64), {label: 'H', element: 'H', name: 'the hydrogen that adds', pad: 14});
    const h2 = A('hB2', P(x, y, 55, 60), {label: 'H', element: 'H', name: 'a hydrogen on boron', pad: 14});
    const h3 = A('hB3', P(x, y, -55, 60), {label: 'H', element: 'H', name: 'a hydrogen on boron', pad: 14});
    return {atoms: [h, b, h2, h3], bonds: [['hB', 'bN', 1], ['bN', 'hB2', 1], ['bN', 'hB3', 1]]};
  }
  function alkyneInternal(x, y) {
    const cL = A('cL', [x, y], {label: 'H₃C', name: 'left methyl carbon', pad: 22});
    const c1 = A('c1', P(x, y, 0, 74), {name: 'left alkyne carbon'});
    const c2 = A('c2', P(c1.x, c1.y, 0, 66), {name: 'right alkyne carbon'});
    const cR = A('cR', P(c2.x, c2.y, 0, 74), {label: 'H₃C', name: 'right methyl carbon', pad: 22});
    return {atoms: [cL, c1, c2, cR], bonds: [['cL', 'c1', 1], ['c1', 'c2', 3], ['c2', 'cR', 1]], c1, c2};
  }
  function terminalYne(x, y) {
    const cR = A('cR', [x, y], {label: 'H₃C', name: 'the alkyl carbon', pad: 22});
    const c1 = A('c1', P(x, y, 0, 74), {name: 'the inner alkyne carbon'});
    const c2 = A('c2', P(c1.x, c1.y, 0, 66), {name: 'the terminal alkyne carbon'});
    const h = A('hT', P(c2.x, c2.y, 0, 60), {label: 'H', element: 'H', name: 'the terminal hydrogen', pad: 14});
    return {atoms: [cR, c1, c2, h], bonds: [['cR', 'c1', 1], ['c1', 'c2', 3], ['c2', 'hT', 1]], c2, h};
  }

  const mechanisms = [];

  {
    const reactants = join(propene(120, 230), hydronium(590, 200), {texts: [plus(450, 220)]});
    const base = chain3(150, 240);
    const hAdd = sprout(base[2], -55, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen that added', pad: 14}, 58);
    const cation = join(
      {atoms: [...base, hAdd], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'hAdd', 1]], texts: [plus(base[1].x + 22, base[1].y - 28)]},
      water(610, 230)
    );
    const ox = chain3(150, 250);
    const oAdd = sprout(ox[1], 95, {id: 'oAdd', label: 'O', element: 'O', name: 'oxonium oxygen', pad: 16}, 68);
    const hP = sprout(oAdd, 40, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on the oxonium', pad: 14}, 56);
    const hQ = sprout(oAdd, 145, {id: 'hQ', label: 'H', element: 'H', name: 'the other hydrogen on the oxonium', pad: 14}, 56);
    const oxonium = join(
      {atoms: [...ox, oAdd, hP, hQ], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAdd', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1]], texts: [plus(oAdd.x + 16, oAdd.y - 34)]},
      water(630, 280, 190)
    );
    const product = ipa(190, 240, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    mechanisms.push(mech(1,
      'Propene with catalytic sulfuric acid and water. The proton goes to the end carbon, and water attacks the more substituted carbon.',
      'The product is propan-2-ol.',
      {reactants, cation, oxonium, product},
      [
        step('reactants', 'The pi bond takes the proton. This step takes 2 arrows.', [
          leave('hA', 'c2', 'c3'),
          leave('oA', 'hA', 'oA')
        ]),
        step('cation', 'Water attacks the carbocation. This step takes 1 arrow.', [lone('c2', 'oW')]),
        step('oxonium', 'Another water takes a proton from the oxonium. This step takes 2 arrows.', [
          {arrows: [lone('hP', 'oW'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oW'), leave('oAdd', 'hQ', 'oAdd')]}
        ])
      ]));
  }

  {
    const hg = A('hg', [560, 190], {label: 'Hg', element: 'Hg', name: 'mercury', pad: 18});
    const oAc = A('oAc', P(560, 190, 20, 70), {label: 'OAc', element: 'O', name: 'the acetate that leaves', pad: 22});
    const reactants = join(propene(110, 240), {atoms: [hg, oAc], bonds: [['hg', 'oAc', 1]], texts: [plus(430, 230), T(560, 250, 'OAc')]});
    const base = chain3(160, 230);
    const brg = A('hg', midOut(160, 230, base[1], base[2], 54), {label: 'Hg⁺', element: 'Hg', name: 'mercury in the mercurinium', pad: 20});
    const cation = join(
      {atoms: [...base, brg], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'hg', 1], ['c3', 'hg', 1]]},
      water(630, 250)
    );
    const organo = chain3(150, 250);
    const oAdd = sprout(organo[1], 95, {id: 'oAdd', label: 'O', element: 'O', name: 'oxonium oxygen', pad: 16}, 66);
    const hP = sprout(oAdd, 35, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on oxygen', pad: 14}, 54);
    const hQ = sprout(oAdd, 150, {id: 'hQ', label: 'H', element: 'H', name: 'the other hydrogen on oxygen', pad: 14}, 54);
    const hg2 = sprout(organo[2], -40, {id: 'hg', label: 'Hg', element: 'Hg', name: 'mercury', pad: 18}, 68);
    const opened = join(
      {atoms: [...organo, oAdd, hP, hQ, hg2], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAdd', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1], ['c3', 'hg', 1]], texts: [plus(oAdd.x + 14, oAdd.y - 32)]},
      water(640, 300, 200)
    );
    const merc = chain3(140, 240);
    const oh = sprout(merc[1], 90, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18}, 68);
    const hg3 = sprout(merc[2], -35, {id: 'hg', label: 'Hg', element: 'Hg', name: 'mercury', pad: 18}, 66);
    const hN = A('hN', [560, 180], {label: 'H', element: 'H', name: 'hydride from borohydride', pad: 14});
    const bN = A('bN', P(560, 180, 0, 70), {label: 'B', element: 'B', name: 'boron of borohydride', pad: 16});
    const replace = join(
      {atoms: [...merc, oh, hg3, hN, bN], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oH', 1], ['c3', 'hg', 1], ['hN', 'bN', 1]], texts: [plus(470, 210)]},
    );
    const product = ipa(190, 240, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    mechanisms.push(mech(2,
      'Oxymercuration of propene, then NaBH4. Water attacks the more substituted carbon of the mercurinium. Borohydride replaces mercury with hydrogen.',
      'The product is propan-2-ol, with no rearrangement.',
      {reactants, cation, opened, replace, product},
      [
        step('reactants', 'The pi bond bonds to mercury, mercury bonds to the other carbon, and acetate leaves. This step takes 3 arrows.', [
          leave('hg', 'c2', 'c3'),
          lone('c3', 'hg'),
          leave('oAc', 'hg', 'oAc')
        ]),
        step('cation', 'Water attacks the more substituted carbon and that carbon lets go of mercury. This step takes 2 arrows.', [
          lone('c2', 'oW'),
          leave('hg', 'c2', 'hg')
        ]),
        step('opened', 'Water takes a proton from the oxonium. This step takes 2 arrows.', [
          {arrows: [lone('hP', 'oW'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oW'), leave('oAdd', 'hQ', 'oAdd')]}
        ]),
        step('replace', 'The hydride replaces mercury. This step takes 2 arrows.', [
          leave('c3', 'hN', 'bN'),
          leave('hg', 'c3', 'hg')
        ])
      ]));
  }

  {
    const reactants = join(propene(120, 240), borane(580, 200), {texts: [plus(450, 220)]});
    const added = chain3(160, 240);
    const b = sprout(added[2], -20, {id: 'bN', label: 'B', element: 'B', name: 'boron', pad: 16}, 68);
    const hOn = sprout(added[1], 100, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen from borane', pad: 14}, 58);
    const oPer = A('oPer', [560, 170], {label: 'O⁻', element: 'O', name: 'the nucleophilic peroxide oxygen', pad: 18});
    const oFar = A('oFar', P(560, 170, 15, 64), {label: 'O', element: 'O', name: 'the far peroxide oxygen', pad: 16});
    const hPer = sprout(oFar, 70, {id: 'hPer', label: 'H', element: 'H', name: 'the peroxide hydrogen', pad: 14}, 54);
    const boraneScene = join(
      {atoms: [...added, b, hOn, oPer, oFar, hPer], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'bN', 1], ['c2', 'hAdd', 1], ['oPer', 'oFar', 1], ['oFar', 'hPer', 1]], texts: [plus(450, 200)]}
    );
    const attached = chain3(150, 250);
    const b2 = sprout(attached[2], 10, {id: 'bN', label: 'B', element: 'B', name: 'boron', pad: 16}, 64);
    const o1 = sprout(b2, 80, {id: 'oPer', label: 'O', element: 'O', name: 'the peroxide oxygen on boron', pad: 16}, 60);
    const o2 = sprout(o1, 20, {id: 'oFar', label: 'O', element: 'O', name: 'the far peroxide oxygen', pad: 16}, 60);
    const h2 = sprout(attached[1], 110, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen from borane', pad: 14}, 56);
    const migrate = {atoms: [...attached, b2, o1, o2, h2], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'bN', 1], ['bN', 'oPer', 1], ['oPer', 'oFar', 1], ['c2', 'hAdd', 1]]};
    const ester = chain3(160, 240);
    const oAlk = sprout(ester[2], 20, {id: 'oAlk', label: 'O', element: 'O', name: 'the oxygen now on carbon', pad: 16}, 64);
    const b3 = sprout(oAlk, 20, {id: 'bN', label: 'B', element: 'B', name: 'boron', pad: 16}, 62);
    const ho = A('oHO', [560, 200], {label: 'O⁻', element: 'O', name: 'hydroxide oxygen', pad: 18});
    const cleavage = join(
      {atoms: [...ester, oAlk, b3, ho], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oAlk', 1], ['oAlk', 'bN', 1]], texts: [plus(470, 230)]}
    );
    const product = primary(180, 230, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18}, 28);
    mechanisms.push(mech(3,
      'Hydroboration of propene, then alkaline peroxide. Boron bonds to the less substituted carbon. Oxidation puts the hydroxyl there with retention.',
      'The product is propan-1-ol. Workup protonates the alkoxide.',
      {reactants, boraneScene, migrate, cleavage, product},
      [
        step('reactants', 'The addition is concerted. Boron bonds to the end carbon and hydrogen bonds to the middle carbon. This step takes 2 arrows.', [
          leave('bN', 'c2', 'c3'),
          leave('c2', 'hB', 'bN')
        ]),
        step('boraneScene', 'Peroxide attacks boron. This step takes 1 arrow.', [lone('bN', 'oPer')]),
        step('migrate', 'The carbon migrates from boron to oxygen and the peroxide bond breaks. This step takes 2 arrows.', [
          leave('oPer', 'c3', 'bN'),
          leave('oFar', 'oPer', 'oFar')
        ]),
        step('cleavage', 'Hydroxide frees the alkoxide from boron. This step takes 2 arrows.', [
          lone('bN', 'oHO'),
          leave('oAlk', 'oAlk', 'bN')
        ])
      ]));
  }

  {
    const reactants = join(propene(130, 230), hbrMol(560, 200), {texts: [plus(440, 220)]});
    const base = chain3(160, 240);
    const hAdd = sprout(base[2], -50, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen that added', pad: 14}, 58);
    const br = A('brX', [600, 230], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20});
    const cation = join(
      {atoms: [...base, hAdd, br], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'hAdd', 1]], texts: [plus(base[1].x + 20, base[1].y - 28)]}
    );
    const product = ipa(190, 240, {id: 'brP', label: 'Br', element: 'Br', name: 'the bromine on carbon', pad: 16});
    mechanisms.push(mech(4,
      'HBr adds to propene. The proton goes to the end carbon and bromide attacks the more substituted carbon.',
      'The product is 2-bromopropane.',
      {reactants, cation, product},
      [
        step('reactants', 'The pi bond takes the proton and the H-Br bond breaks. This step takes 2 arrows.', [
          leave('hX', 'c2', 'c3'),
          leave('brX', 'hX', 'brX')
        ]),
        step('cation', 'Bromide attacks the carbocation. This step takes 1 arrow.', [lone('c2', 'brX')])
      ]));
  }

  {
    const ring = ring5(190, 220);
    const reactants = join(ring, br2(560, 200), {texts: [plus(430, 210)]});
    const a = ring.atoms[0];
    const b = ring.atoms[1];
    const brPlus = A('brA', midOut(190, 220, a, b, 36), {label: 'Br⁺', element: 'Br', name: 'bromonium bromine', pad: 20});
    const brFree = A('brB', [620, 300], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20});
    const bonds = [['r0', 'r1', 1], ['r1', 'r2', 1], ['r2', 'r3', 1], ['r3', 'r4', 1], ['r4', 'r0', 1], ['r0', 'brA', 1], ['r1', 'brA', 1]];
    const bromonium = {atoms: [...ring.atoms, brPlus, brFree], bonds};
    const brW = A('brW', outward(190, 220, a, 46), {label: 'Br', element: 'Br', name: 'bromine on a wedge', pad: 16});
    const brD = A('brD', outward(190, 220, b, 46), {label: 'Br', element: 'Br', name: 'bromine on a dash', pad: 16});
    const product = {
      atoms: [...ring.atoms, brW, brD],
      bonds: [['r0', 'r1', 1], ['r1', 'r2', 1], ['r2', 'r3', 1], ['r3', 'r4', 1], ['r4', 'r0', 1], ['r0', 'brW', 'wedge'], ['r1', 'brD', 'dash']]
    };
    mechanisms.push(mech(5,
      'Bromine adds to cyclopentene. The bromonium ion opens from the opposite face, so the bromines are trans.',
      'The product is the trans dibromide.',
      {reactants, bromonium, product},
      [
        step('reactants', 'The pi bond makes the bromonium and the other bromine leaves. This step takes 3 arrows.', [
          leave('brA', 'r0', 'r1'),
          leave('brB', 'brA', 'brB'),
          lone('r1', 'brA')
        ]),
        step('bromonium', 'Bromide attacks a ring carbon from the back and that carbon lets go of the bridge. This step takes 2 arrows.', [
          lone('r0', 'brB'),
          leave('brA', 'r0', 'brA')
        ])
      ]));
  }

  {
    const reactants = join(propene(120, 230), br2(540, 190), water(640, 300, 150), {texts: [plus(420, 210)]});
    const base = chain3(150, 230);
    const brPlus = A('brA', midOut(base[1].x, base[1].y, base[1], base[2], 48), {label: 'Br⁺', element: 'Br', name: 'bromonium bromine', pad: 20});
    const bromonium = join(
      {atoms: [...base, brPlus], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'brA', 1], ['c3', 'brA', 1]]},
      water(620, 250)
    );
    const opened = chain3(150, 250);
    const oAdd = sprout(opened[1], 100, {id: 'oAdd', label: 'O', element: 'O', name: 'oxonium oxygen', pad: 16}, 66);
    const hP = sprout(oAdd, 40, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on oxygen', pad: 14}, 54);
    const hQ = sprout(oAdd, 155, {id: 'hQ', label: 'H', element: 'H', name: 'the other hydrogen on oxygen', pad: 14}, 54);
    const br = sprout(opened[2], -30, {id: 'brA', label: 'Br', element: 'Br', name: 'bromine', pad: 16}, 66);
    const oxonium = join(
      {atoms: [...opened, oAdd, hP, hQ, br], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAdd', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1], ['c3', 'brA', 1]], texts: [plus(oAdd.x + 12, oAdd.y - 32)]},
      water(640, 300, 200)
    );
    const chain = chain3(180, 240);
    const oh = sprout(chain[1], 100, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18}, 68);
    const brP = sprout(chain[2], -25, {id: 'brP', label: 'Br', element: 'Br', name: 'bromine', pad: 16}, 66);
    const product = {atoms: [...chain, oh, brP], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oH', 1], ['c3', 'brP', 1]]};
    mechanisms.push(mech(6,
      'Bromine and water with propene. Water attacks the more substituted carbon of the bromonium ion.',
      'The product is the bromohydrin, with OH on the middle carbon and Br on the end.',
      {reactants, bromonium, oxonium, product},
      [
        step('reactants', 'The pi bond makes the bromonium and bromide leaves. This step takes 3 arrows.', [
          leave('brA', 'c2', 'c3'),
          leave('brB', 'brA', 'brB'),
          lone('c3', 'brA')
        ]),
        step('bromonium', 'Water attacks the more substituted carbon and that carbon lets go of bromine. This step takes 2 arrows.', [
          lone('c2', 'oW'),
          leave('brA', 'c2', 'brA')
        ]),
        step('oxonium', 'Water takes a proton from the oxonium. This step takes 2 arrows.', [
          {arrows: [lone('hP', 'oW'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oW'), leave('oAdd', 'hQ', 'oAdd')]}
        ])
      ]));
  }

  function peracid(x, y) {
    const c = A('cP', [x, y], {name: 'peracid carbonyl carbon'});
    const oC = sprout(c, 90, {id: 'oC', label: 'O', element: 'O', name: 'peracid carbonyl oxygen', pad: 16}, 62);
    const oL = sprout(c, 330, {id: 'oL', label: 'O', element: 'O', name: 'the inner peroxide oxygen', pad: 16}, 60);
    const oE = sprout(oL, 10, {id: 'oEp', label: 'O', element: 'O', name: 'the electrophilic peroxide oxygen', pad: 16}, 58);
    const h = sprout(oE, -45, {id: 'hP', label: 'H', element: 'H', name: 'the peroxide hydrogen', pad: 14}, 52);
    const r = sprout(c, 180, {id: 'rP', label: 'R', name: 'the peracid group', pad: 16}, 64);
    return {atoms: [r, c, oC, oL, oE, h], bonds: [['rP', 'cP', 1], ['cP', 'oC', 2], ['cP', 'oL', 1], ['oL', 'oEp', 1], ['oEp', 'hP', 1]]};
  }
  function alkeneChain(x, y) {
    const atoms = zz([
      {id: 'cR', label: 'R', name: 'the substituent', pad: 16},
      {id: 'c1', name: 'one alkene carbon'},
      {id: 'c2', name: 'the other alkene carbon'},
      {id: 'cM', label: 'H₃C', name: 'the methyl carbon', pad: 22}
    ], x, y, 30);
    return {atoms, bonds: [['cR', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cM', 1]], c1: atoms[1], c2: atoms[2]};
  }

  {
    const alk = alkeneChain(80, 230);
    const reactants = join(alk, peracid(500, 200), {texts: [plus(390, 220)]});
    const o = A('oE', [250, 150], {label: 'O', element: 'O', name: 'epoxide oxygen', pad: 16});
    const c1 = A('c1', [210, 230], {name: 'one epoxide carbon'});
    const c2 = A('c2', [290, 230], {name: 'the other epoxide carbon'});
    const r = sprout(c1, 200, {id: 'cR', label: 'R', name: 'the substituent', pad: 16}, 68);
    const me = sprout(c2, -20, {id: 'cM', label: 'H₃C', name: 'the methyl carbon', pad: 22}, 70);
    const product = {atoms: [o, c1, c2, r, me], bonds: [['oE', 'c1', 1], ['oE', 'c2', 1], ['c1', 'c2', 1], ['c1', 'cR', 'wedge'], ['c2', 'cM', 'dash']]};
    mechanisms.push(mech(7,
      'mCPBA epoxidizes the alkene in one concerted step. The two new carbon-oxygen bonds are syn.',
      'The product is the epoxide.',
      {reactants, product},
      [
        step('reactants', 'All four arrows happen together. This step takes 4 arrows.', [
          leave('oEp', 'c1', 'c2'),
          leave('oC', 'oL', 'oEp'),
          leave('hP', 'cP', 'oC'),
          leave('c2', 'oEp', 'hP')
        ])
      ]));
  }

  {
    const alk = alkeneChain(70, 250);
    const os = A('os', [520, 190], {label: 'Os', element: 'Os', name: 'osmium', pad: 18});
    const o1 = sprout(os, 160, {id: 'o1', label: 'O', element: 'O', name: 'one oxygen that adds', pad: 16}, 64);
    const o2 = sprout(os, 20, {id: 'o2', label: 'O', element: 'O', name: 'the other oxygen that adds', pad: 16}, 64);
    const o3 = sprout(os, 250, {id: 'o3', label: 'O', element: 'O', name: 'an oxo ligand', pad: 16}, 58);
    const reactants = join(alk, {atoms: [os, o1, o2, o3], bonds: [['os', 'o1', 2], ['os', 'o2', 2], ['os', 'o3', 2]], texts: [plus(390, 220), T(560, 250, 'O')]});
    const esterAtoms = alkeneChain(90, 250).atoms;
    const os2 = A('os', [300, 150], {label: 'Os', element: 'Os', name: 'osmium', pad: 18});
    const e1 = esterAtoms[1];
    const e2 = esterAtoms[2];
    const oo1 = A('o1', [e1.x, e1.y - 62], {label: 'O', element: 'O', name: 'oxygen bonded to carbon and osmium', pad: 16});
    const oo2 = A('o2', [e2.x, e2.y - 62], {label: 'O', element: 'O', name: 'the other oxygen of the osmate', pad: 16});
    const osmate = join(
      {atoms: [...esterAtoms, os2, oo1, oo2], bonds: [['cR', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cM', 1], ['c1', 'o1', 1], ['c2', 'o2', 1], ['o1', 'os', 1], ['o2', 'os', 1]]},
      water(620, 240)
    );
    const diol = alkeneChain(140, 260);
    const oh1 = sprout(diol.c1, 90, {id: 'oH1', label: 'OH', element: 'O', name: 'one hydroxyl', pad: 18}, 64);
    const oh2 = sprout(diol.c2, 70, {id: 'oH2', label: 'OH', element: 'O', name: 'the other hydroxyl', pad: 18}, 64);
    const product = {atoms: [...diol.atoms, oh1, oh2], bonds: [['cR', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cM', 1], ['c1', 'oH1', 'wedge'], ['c2', 'oH2', 'wedge']]};
    mechanisms.push(mech(8,
      'Osmium tetroxide adds syn to the alkene. Bisulfite and water then free the diol. The sheet also writes pyridine.',
      'The product is the syn diol.',
      {reactants, osmate, product},
      [
        step('reactants', 'Both oxygens add at once. This step takes 2 arrows.', [
          leave('o1', 'c1', 'c2'),
          leave('c2', 'os', 'o2')
        ]),
        step('osmate', 'Water protonates an osmate oxygen and that oxygen lets go of osmium. The other oxygen is freed the same way. This step takes 2 arrows.', [
          lone('h1', 'o1'),
          leave('os', 'o1', 'os')
        ])
      ]));
  }

  {
    const alk = propene(100, 240);
    const reactants = join(alk, peracid(500, 190), {texts: [plus(380, 210)]});
    const ep = epoxide(200, 200);
    const ho = A('oHO', [560, 240], {label: 'O⁻', element: 'O', name: 'hydroxide', pad: 18});
    const epScene = join(ep, {atoms: [ho], bonds: [], texts: [plus(430, 250)]});
    const opened = chain3(160, 250);
    const oAlk = sprout(opened[1], 110, {id: 'oAlk', label: 'O⁻', element: 'O', name: 'alkoxide oxygen', pad: 18}, 66);
    const ohNew = sprout(opened[2], -20, {id: 'oNew', label: 'OH', element: 'O', name: 'the new hydroxyl', pad: 18}, 66);
    const alkoxide = join(
      {atoms: [...opened, oAlk, ohNew], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAlk', 1], ['c3', 'oNew', 1]]},
      water(630, 250)
    );
    const chain = chain3(180, 250);
    const ohM = sprout(chain[1], 110, {id: 'oH', label: 'OH', element: 'O', name: 'hydroxyl on the middle carbon', pad: 18}, 66);
    const ohE = sprout(chain[2], -20, {id: 'oE2', label: 'OH', element: 'O', name: 'hydroxyl on the end carbon', pad: 18}, 66);
    const product = {atoms: [...chain, ohM, ohE], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oH', 'dash'], ['c3', 'oE2', 'wedge']]};
    mechanisms.push(mech(9,
      'mCPBA makes the epoxide, then hydroxide opens it at the less substituted carbon. The diol is anti.',
      'The product is the trans diol.',
      {reactants, epScene, alkoxide, product},
      [
        step('reactants', 'The epoxidation arrows happen together. This step takes 4 arrows.', [
          leave('oEp', 'c2', 'c3'),
          leave('oC', 'oL', 'oEp'),
          leave('hP', 'cP', 'oC'),
          leave('c3', 'oEp', 'hP')
        ]),
        step('epScene', 'Hydroxide attacks the less substituted carbon and that carbon lets go of the epoxide oxygen. This step takes 2 arrows.', [
          lone('cL', 'oHO'),
          leave('oE', 'cL', 'oE')
        ]),
        step('alkoxide', 'Water protonates the alkoxide. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const alk = propene(120, 240);
    const cC = A('cCar', [540, 190], {name: 'carbene carbon'});
    const reactants = join(alk, {atoms: [cC], bonds: [], texts: [plus(430, 220), T(575, 190, ':CH₂')]});
    const base = chain3(180, 250);
    const cN = A('cN', midOut(base[1].x, base[1].y, base[1], base[2], 52), {name: 'the new cyclopropane carbon'});
    const product = {atoms: [...base, cN], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'cN', 1], ['c3', 'cN', 1]]};
    mechanisms.push(mech(10,
      'The sheet allows CH2I2 with zinc copper, or diazomethane. This drawing is the free carbene from diazomethane adding in one step.',
      'The product is the cyclopropane.',
      {reactants, product},
      [
        step('reactants', 'The pi bond and the carbene lone pair each make one carbon-carbon bond. This step takes 2 arrows.', [
          leave('cCar', 'c2', 'c3'),
          lone('c3', 'cCar')
        ])
      ]));
  }

  {
    const h = A('hC', [140, 200], {label: 'H', element: 'H', name: 'the hydrogen of chloroform', pad: 14});
    const c = A('cCl', P(140, 200, 0, 64), {name: 'the chloroform carbon'});
    const cl1 = sprout(c, 45, {id: 'cl1', label: 'Cl', element: 'Cl', name: 'a chlorine that stays', pad: 16}, 64);
    const cl2 = sprout(c, -40, {id: 'cl2', label: 'Cl', element: 'Cl', name: 'a chlorine that stays', pad: 16}, 62);
    const cl3 = sprout(c, 115, {id: 'cl3', label: 'Cl', element: 'Cl', name: 'the chlorine that leaves', pad: 16}, 64);
    const oB = A('oB', [360, 170], {label: 'O⁻', element: 'O', name: 'tert-butoxide oxygen', pad: 18});
    const prep = {atoms: [h, c, cl1, cl2, cl3, oB], bonds: [['hC', 'cCl', 1], ['cCl', 'cl1', 1], ['cCl', 'cl2', 1], ['cCl', 'cl3', 1]], texts: [T(400, 210, 'tBu')]};
    const carbene = A('cCar', [540, 200], {name: 'dichlorocarbene carbon'});
    const clA = sprout(carbene, 140, {id: 'cl1', label: 'Cl', element: 'Cl', name: 'a chlorine on the carbene', pad: 16}, 60);
    const clB = sprout(carbene, 40, {id: 'cl2', label: 'Cl', element: 'Cl', name: 'a chlorine on the carbene', pad: 16}, 60);
    const alk = propene(120, 250);
    const add = join(alk, {atoms: [carbene, clA, clB], bonds: [['cCar', 'cl1', 1], ['cCar', 'cl2', 1]], texts: [plus(400, 230)]});
    const base = chain3(170, 260);
    const cN = A('cN', midOut(base[1].x, base[1].y, base[1], base[2], 50), {name: 'the cyclopropane carbon'});
    const clP1 = sprout(cN, 80, {id: 'clP1', label: 'Cl', element: 'Cl', name: 'a chlorine', pad: 16}, 58);
    const clP2 = sprout(cN, 20, {id: 'clP2', label: 'Cl', element: 'Cl', name: 'a chlorine', pad: 16}, 58);
    const product = {atoms: [...base, cN, clP1, clP2], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'cN', 1], ['c3', 'cN', 1], ['cN', 'clP1', 1], ['cN', 'clP2', 1]]};
    mechanisms.push(mech(11,
      'tert-Butoxide takes the proton from chloroform, chloride leaves, and dichlorocarbene adds to the alkene.',
      'The product is the dichlorocyclopropane.',
      {prep, add, product},
      [
        step('prep', 'Butoxide takes the proton and chloride leaves from the same carbon. This step takes 2 arrows.', [
          lone('hC', 'oB'),
          leave('cl3', 'cCl', 'cl3')
        ]),
        step('add', 'The carbene adds to both alkene carbons. This step takes 2 arrows.', [
          leave('cCar', 'c2', 'c3'),
          lone('c3', 'cCar')
        ])
      ]));
  }

  {
    const alk = alkeneChain(90, 250);
    const oM = A('oM', [500, 200], {label: 'O', element: 'O', name: 'the central oxygen of ozone', pad: 16});
    const oL = sprout(oM, 170, {id: 'oL', label: 'O⁻', element: 'O', name: 'one terminal oxygen of ozone', pad: 18}, 62);
    const oR = sprout(oM, 10, {id: 'oR', label: 'O', element: 'O', name: 'the other terminal oxygen of ozone', pad: 16}, 62);
    const reactants = join(alk, {atoms: [oM, oL, oR], bonds: [['oL', 'oM', 1], ['oM', 'oR', 2]], texts: [plus(400, 210), plus(oM.x, oM.y - 28)]});
    const mol = alkeneChain(140, 250);
    const mL = A('oL', [mol.c1.x - 10, mol.c1.y - 70], {label: 'O', element: 'O', name: 'an oxygen of the molozonide', pad: 16});
    const mM = A('oM', [(mol.c1.x + mol.c2.x) / 2, mol.c1.y - 110], {label: 'O', element: 'O', name: 'the middle oxygen of the molozonide', pad: 16});
    const mR = A('oR', [mol.c2.x + 10, mol.c2.y - 70], {label: 'O', element: 'O', name: 'an oxygen of the molozonide', pad: 16});
    const moloz = {atoms: [...mol.atoms, mL, mM, mR], bonds: [['cR', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cM', 1], ['c1', 'oL', 1], ['oL', 'oM', 1], ['oM', 'oR', 1], ['oR', 'c2', 1]]};
    const s = A('sD', [520, 200], {label: 'S', element: 'S', name: 'sulfur of dimethyl sulfide', pad: 16});
    const me1 = sprout(s, 60, {id: 'meS1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 68);
    const me2 = sprout(s, -60, {id: 'meS2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 68);
    const ald1c = A('k1', [120, 200], {name: 'one carbonyl carbon'});
    const ald1o = sprout(ald1c, 90, {id: 'ok1', label: 'O', element: 'O', name: 'that carbonyl oxygen', pad: 16}, 64);
    const ald1r = sprout(ald1c, 210, {id: 'rk1', label: 'R', name: 'the substituent', pad: 16}, 66);
    const oxC = A('k2', [280, 230], {name: 'carbonyl oxide carbon'});
    const oxO = sprout(oxC, 80, {id: 'oIn', label: 'O', element: 'O', name: 'the inner oxygen of the carbonyl oxide', pad: 16}, 60);
    const oxT = sprout(oxO, 10, {id: 'oOut', label: 'O', element: 'O', name: 'the terminal oxygen of the carbonyl oxide', pad: 16}, 58);
    const oxR = sprout(oxC, 200, {id: 'rk2', label: 'H₃C', name: 'the methyl on the carbonyl oxide', pad: 22}, 66);
    const reduce = join(
      {atoms: [ald1c, ald1o, ald1r, oxC, oxO, oxT, oxR, s, me1, me2], bonds: [['k1', 'ok1', 2], ['rk1', 'k1', 1], ['k2', 'oIn', 2], ['oIn', 'oOut', 1], ['rk2', 'k2', 1], ['sD', 'meS1', 1], ['sD', 'meS2', 1]], texts: [plus(430, 180)]}
    );
    const p1 = A('p1', [160, 200], {name: 'one aldehyde carbon'});
    const po1 = sprout(p1, 90, {id: 'po1', label: 'O', element: 'O', name: 'an aldehyde oxygen', pad: 16}, 64);
    const pr1 = sprout(p1, 210, {id: 'pr1', label: 'R', name: 'the substituent', pad: 16}, 66);
    const p2 = A('p2', [340, 210], {name: 'the other aldehyde carbon'});
    const po2 = sprout(p2, 90, {id: 'po2', label: 'O', element: 'O', name: 'the other aldehyde oxygen', pad: 16}, 64);
    const pr2 = sprout(p2, 330, {id: 'pr2', label: 'H₃C', name: 'the methyl', pad: 22}, 66);
    const product = {atoms: [p1, po1, pr1, p2, po2, pr2], bonds: [['p1', 'po1', 2], ['pr1', 'p1', 1], ['p2', 'po2', 2], ['pr2', 'p2', 1]], texts: [plus(270, 240), T(480, 220, 'DMSO')]};
    mechanisms.push(mech(12,
      'Ozone cleaves the double bond. Dimethyl sulfide then reduces the carbonyl oxide to the second carbonyl. The sheet writes SMe2.',
      'The products are the two carbonyls.',
      {reactants, moloz, reduce, product},
      [
        step('reactants', 'Ozone cycloadds to the alkene. This step takes 3 arrows.', [
          lone('c1', 'oL'),
          leave('oR', 'c1', 'c2'),
          leave('oM', 'oM', 'oR')
        ]),
        step('moloz', 'The molozonide fragments. This step takes 2 arrows.', [
          leave('oL', 'c1', 'c2'),
          leave('oR', 'oL', 'oM')
        ]),
        step('reduce', 'Sulfur attacks the terminal oxygen and the peroxide bond breaks. This step takes 2 arrows.', [
          lone('oOut', 'sD'),
          leave('oIn', 'oIn', 'oOut')
        ])
      ]));
  }

  {
    const yne = terminalYne(140, 220);
    const n = A('nA', [480, 200], {label: 'N⁻', element: 'N', name: 'nitrogen of sodium amide', pad: 18});
    const h1 = sprout(n, 50, {id: 'hN1', label: 'H', element: 'H', name: 'a hydrogen on nitrogen', pad: 14}, 58);
    const h2 = sprout(n, -50, {id: 'hN2', label: 'H', element: 'H', name: 'a hydrogen on nitrogen', pad: 14}, 58);
    const reactants = join(yne, {atoms: [n, h1, h2], bonds: [['nA', 'hN1', 1], ['nA', 'hN2', 1]], texts: [plus(390, 210), T(560, 230, 'Na⁺')]});
    const prod = terminalYne(180, 220);
    prod.atoms = prod.atoms.filter(atom => atom.id !== 'hT');
    prod.bonds = prod.bonds.filter(bond => !bond.includes('hT'));
    const product = {atoms: prod.atoms, bonds: prod.bonds, texts: [T(prod.c2.x + 28, prod.c2.y - 24, '⁻'), T(420, 220, 'Na⁺'), T(500, 220, 'NH₃')]};
    mechanisms.push(mech(13,
      'Sodium amide takes the terminal alkyne proton. The sheet runs this in ammonia.',
      'The product is the acetylide.',
      {reactants, product},
      [
        step('reactants', 'The amide lone pair takes the proton and the C-H bond becomes the lone pair on carbon. This step takes 2 arrows.', [
          lone('hT', 'nA'),
          leave('c2', 'c2', 'hT')
        ])
      ]));
  }

  function roh(x, y) {
    const atoms = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbon bearing oxygen'}
    ], x, y, 28);
    const o = sprout(atoms[2], 28, {id: 'oH', label: 'O', element: 'O', name: 'the alcohol oxygen', pad: 16}, 66);
    const h = sprout(o, 90, {id: 'hO', label: 'H', element: 'H', name: 'the alcohol hydrogen', pad: 14}, 54);
    return {atoms: [...atoms, o, h], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['oH', 'hO', 1]], o, h, c2: atoms[1], c3: atoms[2]};
  }
  function chromium(x, y) {
    const cr = A('cr', [x, y], {label: 'Cr', element: 'Cr', name: 'chromium', pad: 16});
    const oCr = sprout(cr, 95, {id: 'oCr', label: 'O', element: 'O', name: 'an oxo on chromium', pad: 16}, 72);
    const ohCr = sprout(cr, -55, {id: 'ohCr', label: 'OH', element: 'O', name: 'the hydroxide that leaves', pad: 18}, 92);
    return {cr, oCr, ohCr};
  }
  function beside(atom, dx, dy, spec) {
    return A(spec.id, [Math.round(atom.x + dx), Math.round(atom.y + dy)], spec);
  }
  function brPair(x, y, idA, idB, nameA, nameB) {
    const a = A(idA, [x, y], {label: 'Br', element: 'Br', name: nameA, pad: 16});
    const b = A(idB, P(x, y, 0, 72), {label: 'Br', element: 'Br', name: nameB, pad: 16});
    return {atoms: [a, b], bonds: [[idA, idB, 1]]};
  }
  function organoMg(x, y, ids) {
    const cA = A(ids.c, [x, y], {name: 'carbon bonded to magnesium'});
    const cB = A(ids.me, P(x, y, 250.5, 72), {label: 'H₃C', name: 'methyl of the Grignard', pad: 22});
    const mg = A(ids.mg, P(x, y, 0, 76), {label: 'Mg', element: 'Mg', name: 'magnesium', pad: 18});
    const br = A(ids.br, P(mg.x, mg.y, 0, 74), {label: 'Br', element: 'Br', name: 'bromine', pad: 16});
    return {atoms: [cB, cA, mg, br], bonds: [[ids.c, ids.me, 1], [ids.c, ids.mg, 1], [ids.mg, ids.br, 1]], c: cA};
  }
  function rli(x, y, ids) {
    const cA = A(ids.c, [x, y], {name: 'carbon of the organolithium'});
    const cB = A(ids.me, P(x, y, 250.5, 72), {label: 'H₃C', name: 'methyl of the ethyl group', pad: 22});
    const li = A(ids.li, P(x, y, 0, 70), {label: 'Li', element: 'Li', name: 'lithium', pad: 16});
    return {atoms: [cB, cA, li], bonds: [[ids.c, ids.me, 1], [ids.c, ids.li, 1]], c: cA};
  }
  function hydride(x, y) {
    const h = A('hH', [x, y], {label: 'H', element: 'H', name: 'the hydride', pad: 14});
    const m = A('mH', P(x, y, 0, 70), {label: 'Al', element: 'Al', name: 'aluminum', pad: 16});
    return {atoms: [h, m], bonds: [['hH', 'mH', 1]]};
  }
  function acetone(x, y) {
    const c = A('cCO', [x, y], {name: 'carbonyl carbon'});
    const meL = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'a methyl', pad: 22});
    const meR = sprout(c, 330, {id: 'meR', label: 'H₃C', name: 'a methyl', pad: 22});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    return {atoms: [meL, c, meR, o], bonds: [['meL', 'cCO', 1], ['cCO', 'meR', 1], ['cCO', 'oCO', 2]]};
  }
  function dmso(x, y) {
    const s = A('sD', [x, y], {label: 'S', element: 'S', name: 'sulfur', pad: 16});
    const o = sprout(s, 180, {id: 'oD', label: 'O', element: 'O', name: 'the oxygen of DMSO', pad: 16}, 64);
    const m1 = sprout(s, 55, {id: 'm1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 66);
    const m2 = sprout(s, -55, {id: 'm2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 66);
    return {atoms: [o, s, m1, m2], bonds: [['oD', 'sD', 2], ['sD', 'm1', 1], ['sD', 'm2', 1]]};
  }
  function dms(x, y) {
    const s = A('sD', [x, y], {label: 'S', element: 'S', name: 'sulfur of DMS', pad: 16});
    const m1 = sprout(s, 50, {id: 'm1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 66);
    const m2 = sprout(s, -50, {id: 'm2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 66);
    return {atoms: [s, m1, m2], bonds: [['sD', 'm1', 1], ['sD', 'm2', 1]]};
  }

  {
    const yne = alkyneInternal(90, 200);
    const reactants = join(yne, brPair(500, 170, 'brA', 'brB', 'the nearer bromine', 'the leaving bromine'), {texts: [plus(410, 185)]});
    const y2 = alkyneInternal(110, 210);
    const brPlus = A('brA', [y2.c1.x + 28, y2.c1.y - 52], {label: 'Br⁺', element: 'Br', name: 'bromonium bromine', pad: 20});
    const brFree = A('brB', [600, 310], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20});
    const brom1 = {atoms: [...y2.atoms, brPlus, brFree], bonds: [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1], ['c1', 'brA', 1], ['c2', 'brA', 1]]};
    const y3 = alkyneInternal(90, 190);
    const br1 = sprout(y3.c1, 100, {id: 'br1', label: 'Br', element: 'Br', name: 'bromine on the left carbon', pad: 16}, 60);
    const br2a = sprout(y3.c2, -80, {id: 'br2', label: 'Br', element: 'Br', name: 'bromine on the right carbon', pad: 16}, 60);
    const dibromo = join(
      {atoms: [...y3.atoms, br1, br2a], bonds: [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1], ['c1', 'br1', 1], ['c2', 'br2', 1]]},
      brPair(530, 310, 'brC', 'brD', 'the nearer bromine of the second equivalent', 'the leaving bromine'),
      {texts: [plus(430, 270)]}
    );
    const y4 = alkyneInternal(100, 185);
    const b1 = sprout(y4.c1, 110, {id: 'br1', label: 'Br', element: 'Br', name: 'bromine already on the left carbon', pad: 16}, 56);
    const b2 = sprout(y4.c2, -70, {id: 'br2', label: 'Br', element: 'Br', name: 'bromine already on the right carbon', pad: 16}, 56);
    const brP2 = A('brC', [y4.c1.x + 30, y4.c1.y - 50], {label: 'Br⁺', element: 'Br', name: 'bromonium bromine', pad: 20});
    const brF2 = A('brD', [620, 320], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20});
    const brom2 = {atoms: [...y4.atoms, b1, b2, brP2, brF2], bonds: [['cL', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cR', 1], ['c1', 'br1', 1], ['c2', 'br2', 1], ['c1', 'brC', 1], ['c2', 'brC', 1]]};
    const c1 = A('c1', [200, 220], {name: 'left central carbon'});
    const c2 = A('c2', P(200, 220, 0, 86), {name: 'right central carbon'});
    const cL = sprout(c1, 180, {id: 'cL', label: 'H₃C', name: 'left methyl', pad: 22}, 70);
    const cR = sprout(c2, 0, {id: 'cR', label: 'H₃C', name: 'right methyl', pad: 22}, 70);
    const p1 = sprout(c1, 90, {id: 'b1', label: 'Br', element: 'Br', name: 'an upper bromine', pad: 16}, 62);
    const p2 = sprout(c1, -90, {id: 'b2', label: 'Br', element: 'Br', name: 'a lower bromine', pad: 16}, 62);
    const p3 = sprout(c2, 90, {id: 'b3', label: 'Br', element: 'Br', name: 'an upper bromine', pad: 16}, 62);
    const p4 = sprout(c2, -90, {id: 'b4', label: 'Br', element: 'Br', name: 'a lower bromine', pad: 16}, 62);
    const product = {atoms: [cL, c1, c2, cR, p1, p2, p3, p4], bonds: [['cL', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cR', 1], ['c1', 'b1', 1], ['c1', 'b2', 1], ['c2', 'b3', 1], ['c2', 'b4', 1]]};
    mechanisms.push(mech(15,
      'Two equivalents of bromine add to 2-butyne. Each addition makes a bromonium ion, and bromide opens it.',
      'The product is the tetrabromide.',
      {reactants, brom1, dibromo, brom2, product},
      [
        step('reactants', 'One pi bond makes the bromonium and bromide leaves. This step takes 3 arrows.', [
          leave('brA', 'c1', 'c2'),
          leave('brB', 'brA', 'brB'),
          lone('c2', 'brA')
        ]),
        step('brom1', 'Bromide opens the bromonium. This step takes 2 arrows.', [
          lone('c1', 'brB'),
          leave('brA', 'c1', 'brA')
        ]),
        step('dibromo', 'The second equivalent makes another bromonium. This step takes 3 arrows.', [
          leave('brC', 'c1', 'c2'),
          leave('brD', 'brC', 'brD'),
          lone('c2', 'brC')
        ]),
        step('brom2', 'Bromide opens that bromonium. This step takes 2 arrows.', [
          lone('c1', 'brD'),
          leave('brC', 'c1', 'brC')
        ])
      ]));
  }

  {
    const yne = alkyneInternal(100, 185);
    const reactants = join(yne, hbrMol(540, 165), {texts: [plus(430, 175)]});
    const y2 = alkyneInternal(120, 200);
    const hAdd = sprout(y2.c2, -70, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen that added', pad: 14}, 54);
    const brIon = A('brX', [580, 280], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20});
    const cation = {atoms: [...y2.atoms, hAdd, brIon], bonds: [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1], ['c2', 'hAdd', 1]], texts: [plus(y2.c1.x + 18, y2.c1.y - 28)]};
    const y3 = alkyneInternal(100, 180);
    const brV = sprout(y3.c1, 90, {id: 'brV', label: 'Br', element: 'Br', name: 'the vinylic bromine', pad: 16}, 60);
    const hV = sprout(y3.c2, -75, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen already added', pad: 14}, 54);
    const vinyl = join(
      {atoms: [...y3.atoms, brV, hV], bonds: [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1], ['c1', 'brV', 1], ['c2', 'hAdd', 1]]},
      hbrMol(540, 310),
      {texts: [plus(440, 270)]}
    );
    const y4 = alkyneInternal(120, 200);
    const brStay = sprout(y4.c1, 90, {id: 'brV', label: 'Br', element: 'Br', name: 'the bromine already there', pad: 16}, 60);
    const hOld = sprout(y4.c2, -80, {id: 'hAdd', label: 'H', element: 'H', name: 'the first hydrogen', pad: 14}, 52);
    const hNew = sprout(y4.c2, 35, {id: 'hNew', label: 'H', element: 'H', name: 'the hydrogen that just added', pad: 14}, 52);
    const cation2 = {atoms: [...y4.atoms, brStay, hOld, hNew, A('brX', [610, 300], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20})], bonds: [['cL', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cR', 1], ['c1', 'brV', 1], ['c2', 'hAdd', 1], ['c2', 'hNew', 1]], texts: [plus(y4.c1.x + 16, y4.c1.y - 30)]};
    const cap = capAt(240, 230, {
      id: 'c1',
      name: 'the carbon that holds both bromines',
      left: {id: 'cL', label: 'H₃C', name: 'the methyl', pad: 22},
      right: {id: 'c2', name: 'the methylene carbon'},
      upL: {id: 'b1', label: 'Br', element: 'Br', name: 'one bromine', pad: 16},
      upR: {id: 'b2', label: 'Br', element: 'Br', name: 'the other bromine', pad: 16}
    });
    const cR = sprout(cap.right, -25, {id: 'cR', label: 'H₃C', name: 'the methyl of the ethyl group', pad: 22}, 72);
    const product = {atoms: [...cap.atoms, cR], bonds: [...cap.bonds, ['c2', 'cR', 1]]};
    mechanisms.push(mech(16,
      'Two equivalents of HBr add to 2-butyne. The second proton adds to the carbon without bromine, so both bromines end on the same carbon.',
      'The product is the geminal dibromide.',
      {reactants, cation, vinyl, cation2, product},
      [
        step('reactants', 'The first pi bond takes the proton and the H-Br bond breaks. This step takes 2 arrows.', [
          leave('hX', 'c1', 'c2'),
          leave('brX', 'hX', 'brX')
        ]),
        step('cation', 'Bromide attacks the carbocation. This step takes 1 arrow.', [lone('c1', 'brX')]),
        step('vinyl', 'The second pi bond takes a proton from the next HBr. This step takes 2 arrows.', [
          leave('hX', 'c1', 'c2'),
          leave('brX', 'hX', 'brX')
        ]),
        step('cation2', 'Bromide attacks the carbon that already holds bromine. This step takes 1 arrow.', [lone('c1', 'brX')])
      ]));
  }

  {
    const reactants = join(roh(110, 230), hydronium(600, 190), {texts: [plus(450, 200)]});
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the beta carbon'},
      {id: 'c3', name: 'the carbon bearing oxygen'}
    ], 130, 250, 28);
    const o = sprout(chain[2], 28, {id: 'oAdd', label: 'O', element: 'O', name: 'the oxonium oxygen', pad: 16}, 64);
    const hP = sprout(o, 70, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on the oxonium', pad: 14}, 52);
    const hQ = sprout(o, 150, {id: 'hQ', label: 'H', element: 'H', name: 'the other hydrogen on the oxonium', pad: 14}, 52);
    const hB = sprout(chain[1], 110, {id: 'hB', label: 'H', element: 'H', name: 'the beta hydrogen', pad: 14}, 54);
    const oB = A('oB', [600, 320], {label: 'O', element: 'O', name: 'water acting as the base', pad: 16});
    const protonated = {atoms: [...chain, o, hP, hQ, hB, oB], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oAdd', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1], ['c2', 'hB', 1]], texts: [plus(o.x + 18, o.y - 30)]};
    mechanisms.push(mech(19,
      'Concentrated sulfuric acid and heat turn the primary alcohol into propene. Water leaves as a base takes a beta proton.',
      'The product is propene.',
      {reactants, protonated, product: propene(200, 230)},
      [
        step('reactants', 'The alcohol takes a proton. This step takes 2 arrows.', [
          lone('hA', 'oH'),
          leave('oA', 'hA', 'oA')
        ]),
        step('protonated', 'The base takes the beta proton and water leaves. This step takes 3 arrows.', [
          lone('hB', 'oB'),
          leave('c3', 'c2', 'hB'),
          leave('oAdd', 'c3', 'oAdd')
        ])
      ]));
  }

  {
    const alcohol = roh(80, 250);
    const s = A('sT', [430, 170], {label: 'S', element: 'S', name: 'sulfur of tosyl chloride', pad: 16});
    const o1 = sprout(s, 90, {id: 'oS1', label: 'O', element: 'O', name: 'a sulfonyl oxygen', pad: 16}, 56);
    const o2 = sprout(s, 20, {id: 'oS2', label: 'O', element: 'O', name: 'a sulfonyl oxygen', pad: 16}, 56);
    const cl = sprout(s, -50, {id: 'clT', label: 'Cl', element: 'Cl', name: 'the chlorine that leaves', pad: 16}, 60);
    const ts = sprout(s, 180, {id: 'cTs', label: 'Ts', name: 'the tolyl group', pad: 16}, 62);
    const n = A('nPy', [660, 250], {label: 'N', element: 'N', name: 'pyridine nitrogen', pad: 16});
    const reactants = join(alcohol, {atoms: [s, o1, o2, cl, ts, n], bonds: [['sT', 'oS1', 2], ['sT', 'oS2', 2], ['sT', 'clT', 1], ['sT', 'cTs', 1]], texts: [plus(340, 200), T(700, 250, 'py')]});
    const attached = roh(90, 270);
    const s2 = sprout(attached.o, -10, {id: 'sT', label: 'S', element: 'S', name: 'sulfur', pad: 16}, 66);
    const mid = {atoms: [...attached.atoms, s2, A('clT', [560, 150], {label: 'Cl⁻', element: 'Cl', name: 'chloride', pad: 18}), A('nPy', [660, 230], {label: 'N', element: 'N', name: 'pyridine nitrogen', pad: 16})], bonds: [...attached.bonds, ['oH', 'sT', 1]], texts: [plus(attached.o.x + 10, attached.o.y - 36), T(700, 230, 'py')]};
    mechanisms.push(mech(20,
      'The alcohol attacks sulfur of tosyl chloride, chloride leaves, and pyridine takes the proton.',
      'The product is the tosylate.',
      {reactants, mid, product: primary(180, 240, {id: 'oTs', label: 'OTs', element: 'O', name: 'the tosylate oxygen', pad: 22})},
      [
        step('reactants', 'The alcohol oxygen attacks sulfur and chloride leaves. This step takes 2 arrows.', [
          lone('sT', 'oH'),
          leave('clT', 'sT', 'clT')
        ]),
        step('mid', 'Pyridine takes the proton from oxygen. This step takes 2 arrows.', [
          lone('hO', 'nPy'),
          leave('oH', 'oH', 'hO')
        ])
      ]));
  }

  {
    const alcohol = roh(90, 250);
    const s = A('sC', [470, 170], {label: 'S', element: 'S', name: 'sulfur of thionyl chloride', pad: 16});
    const oS = sprout(s, 90, {id: 'oS', label: 'O', element: 'O', name: 'the oxygen on sulfur', pad: 16}, 56);
    const cl1 = sprout(s, 15, {id: 'cl1', label: 'Cl', element: 'Cl', name: 'a chlorine on sulfur', pad: 16}, 60);
    const cl2 = sprout(s, -60, {id: 'cl2', label: 'Cl', element: 'Cl', name: 'the chlorine that leaves', pad: 16}, 60);
    const reactants = join(alcohol, {atoms: [s, oS, cl1, cl2], bonds: [['sC', 'oS', 2], ['sC', 'cl1', 1], ['sC', 'cl2', 1]], texts: [plus(360, 200)]});
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbon that will hold chlorine'}
    ], 130, 250, 28);
    const o = sprout(chain[2], 20, {id: 'oH', label: 'O', element: 'O', name: 'oxygen still on carbon', pad: 16}, 62);
    const s2 = sprout(o, 20, {id: 'sC', label: 'S', element: 'S', name: 'sulfur', pad: 16}, 58);
    const subst = {atoms: [...chain, o, s2, A('cl2', [580, 230], {label: 'Cl⁻', element: 'Cl', name: 'chloride', pad: 18})], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['oH', 'sC', 1]], texts: [plus(470, 250)]};
    mechanisms.push(mech(21,
      'The alcohol attacks sulfur of thionyl chloride. Chloride then substitutes at carbon and the configuration inverts.',
      'The product is the chloroalkane.',
      {reactants, subst, product: primary(180, 230, {id: 'clP', label: 'Cl', element: 'Cl', name: 'the chlorine on carbon', pad: 16})},
      [
        step('reactants', 'Oxygen attacks sulfur and one chloride leaves. This step takes 2 arrows.', [
          lone('sC', 'oH'),
          leave('cl2', 'sC', 'cl2')
        ]),
        step('subst', 'Chloride attacks carbon and the carbon-oxygen bond breaks. This step takes 2 arrows.', [
          lone('c3', 'cl2'),
          leave('oH', 'c3', 'oH')
        ])
      ]));
  }

  {
    const alcohol = roh(90, 250);
    const p = A('pB', [480, 170], {label: 'P', element: 'P', name: 'phosphorus', pad: 16});
    const b1 = sprout(p, 70, {id: 'br1', label: 'Br', element: 'Br', name: 'a bromine on phosphorus', pad: 16}, 60);
    const b2 = sprout(p, 10, {id: 'br2', label: 'Br', element: 'Br', name: 'a bromine on phosphorus', pad: 16}, 60);
    const b3 = sprout(p, -55, {id: 'br3', label: 'Br', element: 'Br', name: 'the bromine that leaves', pad: 16}, 60);
    const reactants = join(alcohol, {atoms: [p, b1, b2, b3], bonds: [['pB', 'br1', 1], ['pB', 'br2', 1], ['pB', 'br3', 1]], texts: [plus(370, 200)]});
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbon that will hold bromine'}
    ], 130, 250, 28);
    const o = sprout(chain[2], 18, {id: 'oH', label: 'O', element: 'O', name: 'oxygen still on carbon', pad: 16}, 62);
    const p2 = sprout(o, 12, {id: 'pB', label: 'P', element: 'P', name: 'phosphorus', pad: 16}, 58);
    const subst = {atoms: [...chain, o, p2, A('br3', [580, 230], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20})], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['oH', 'pB', 1]], texts: [plus(470, 240)]};
    mechanisms.push(mech(22,
      'The alcohol attacks phosphorus of PBr3. Bromide then substitutes at carbon and the configuration inverts.',
      'The product is the bromoalkane.',
      {reactants, subst, product: primary(180, 230, {id: 'brP', label: 'Br', element: 'Br', name: 'the bromine on carbon', pad: 16})},
      [
        step('reactants', 'Oxygen attacks phosphorus and one bromide leaves. This step takes 2 arrows.', [
          lone('pB', 'oH'),
          leave('br3', 'pB', 'br3')
        ]),
        step('subst', 'Bromide attacks carbon and the carbon-oxygen bond breaks. This step takes 2 arrows.', [
          lone('c3', 'br3'),
          leave('oH', 'c3', 'oH')
        ])
      ]));
  }

  {
    const alcohol = roh(90, 210);
    const hCar = sprout(alcohol.c3, -98, {id: 'hCar', label: 'H', element: 'H', name: 'a carbinol hydrogen', pad: 14}, 68);
    const {cr, oCr, ohCr} = chromium(540, 168);
    const reactants = join(
      {atoms: [...alcohol.atoms, hCar, cr, oCr, ohCr], bonds: [...alcohol.bonds, ['c3', 'hCar', 1], ['cr', 'oCr', 2], ['cr', 'ohCr', 1]], texts: [plus(410, 175), T(oCr.x + 108, oCr.y + 8, 'PCC')]}
    );
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbinol carbon'}
    ], 150, 175, 28);
    const o = sprout(chain[2], 28, {id: 'oH', label: 'O', element: 'O', name: 'the chromate ester oxygen', pad: 16}, 76);
    const hC = sprout(chain[2], -98, {id: 'hCar', label: 'H', element: 'H', name: 'a carbinol hydrogen', pad: 14}, 70);
    const cr2 = sprout(o, -78, {id: 'cr', label: 'Cr', element: 'Cr', name: 'chromium', pad: 16}, 86);
    const base = beside(hC, 136, 52, {id: 'oB', label: 'N', element: 'N', name: 'the base', pad: 16});
    const chromate = {atoms: [...chain, o, hC, cr2, base], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['c3', 'hCar', 1], ['oH', 'cr', 1]], texts: [T(base.x + 32, base.y + 5, 'py')]};
    const c = A('cCO', [240, 200], {name: 'carbonyl carbon'});
    const product = {atoms: [sprout(c, 210, {id: 'c2', label: 'H₃C', name: 'the chain', pad: 22}), c, sprout(c, 330, {id: 'hAld', label: 'H', element: 'H', name: 'the aldehyde hydrogen', pad: 14}, 60), sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68)], bonds: [['c2', 'cCO', 1], ['cCO', 'hAld', 1], ['cCO', 'oCO', 2]]};
    mechanisms.push(mech(23,
      'PCC oxidizes the primary alcohol to the aldehyde and stops there.',
      'The product is the aldehyde.',
      {reactants, chromate, product},
      [
        step('reactants', 'The alcohol bonds to chromium and hydroxide leaves. This step takes 2 arrows.', [
          lone('cr', 'oH'),
          leave('ohCr', 'cr', 'ohCr')
        ]),
        step('chromate', 'The base takes a carbinol hydrogen and the carbonyl forms. This step takes 3 arrows.', [
          lone('hCar', 'oB'),
          leave('oH', 'c3', 'hCar'),
          leave('cr', 'oH', 'cr')
        ])
      ]));
  }

  {
    const alcohol = ipa(110, 250, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    const hCar = sprout(alcohol.c2, 152, {id: 'hCar', label: 'H', element: 'H', name: 'the hydrogen on the carbinol carbon', pad: 14}, 72);
    const {cr, oCr, ohCr} = chromium(545, 185);
    const reactants = join(
      {atoms: [...alcohol.atoms, hCar, cr, oCr, ohCr], bonds: [...alcohol.bonds, ['c2', 'hCar', 1], ['cr', 'oCr', 2], ['cr', 'ohCr', 1]], texts: [plus(400, 200), T(oCr.x + 108, oCr.y + 8, 'PCC')]}
    );
    const ester = ipa(160, 275, {id: 'oH', label: 'O', element: 'O', name: 'the chromate ester oxygen', pad: 16});
    const h2 = sprout(ester.c2, 152, {id: 'hCar', label: 'H', element: 'H', name: 'the hydrogen on the carbinol carbon', pad: 14}, 72);
    const cr2 = sprout(ester.o, 40, {id: 'cr', label: 'Cr', element: 'Cr', name: 'chromium', pad: 16}, 86);
    const base = beside(h2, -16, -82, {id: 'oB', label: 'N', element: 'N', name: 'the base', pad: 16});
    const chromate = {atoms: [...ester.atoms, h2, cr2, base], bonds: [...ester.bonds, ['c2', 'hCar', 1], ['oH', 'cr', 1]], texts: [T(base.x - 34, base.y + 4, 'py')]};
    mechanisms.push(mech(24,
      'PCC oxidizes the secondary alcohol. The alcohol bonds to chromium, then loss of the carbinol hydrogen makes the ketone.',
      'The product is the ketone.',
      {reactants, chromate, product: acetone(240, 210)},
      [
        step('reactants', 'The alcohol bonds to chromium and hydroxide leaves. This step takes 2 arrows.', [
          lone('cr', 'oH'),
          leave('ohCr', 'cr', 'ohCr')
        ]),
        step('chromate', 'The base takes the carbinol hydrogen and the chromium-oxygen bond breaks as the carbonyl forms. This step takes 3 arrows.', [
          lone('hCar', 'oB'),
          leave('oH', 'c2', 'hCar'),
          leave('cr', 'oH', 'cr')
        ])
      ]));
  }
  {
    const alcohol = ipa(90, 270, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    const s = A('sD', [430, 160], {label: 'S', element: 'S', name: 'sulfur', pad: 16});
    const oD = sprout(s, 180, {id: 'oD', label: 'O', element: 'O', name: 'the oxygen of DMSO', pad: 16}, 58);
    const m1 = sprout(s, 60, {id: 'm1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 60);
    const m2 = sprout(s, -40, {id: 'm2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 60);
    const cOx = A('cOx', [620, 180], {name: 'the oxalyl carbon'});
    const oOx = sprout(cOx, 90, {id: 'oOx', label: 'O', element: 'O', name: 'the oxalyl oxygen', pad: 16}, 52);
    const clX = sprout(cOx, 0, {id: 'clX', label: 'Cl', element: 'Cl', name: 'the chloride that leaves', pad: 16}, 58);
    const rest = sprout(cOx, 200, {id: 'cRest', label: 'COCl', name: 'the rest of oxalyl chloride', pad: 22}, 64);
    const reactants = join(alcohol, {atoms: [oD, s, m1, m2, rest, cOx, oOx, clX], bonds: [['oD', 'sD', 2], ['sD', 'm1', 1], ['sD', 'm2', 1], ['cRest', 'cOx', 1], ['cOx', 'oOx', 2], ['cOx', 'clX', 1]], texts: [plus(330, 200)]});
    const adductS = A('sD', [180, 200], {label: 'S', element: 'S', name: 'sulfur', pad: 16});
    const adductO = sprout(adductS, 0, {id: 'oD', label: 'O', element: 'O', name: 'oxygen still on sulfur', pad: 16}, 64);
    const adduct = {atoms: [adductO, adductS, sprout(adductS, 80, {id: 'm1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 62), sprout(adductS, 150, {id: 'm2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 62), A('clX', [420, 210], {label: 'Cl⁻', element: 'Cl', name: 'chloride', pad: 18})], bonds: [['oD', 'sD', 1], ['sD', 'm1', 1], ['sD', 'm2', 1]], texts: [plus(330, 210), T(520, 180, 'CO2, CO')]};
    const ip = ipa(100, 270, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    const hCar = sprout(ip.c2, 152, {id: 'hCar', label: 'H', element: 'H', name: 'the carbinol hydrogen', pad: 14}, 70);
    const sCl = A('sD', [500, 180], {label: 'S', element: 'S', name: 'sulfur', pad: 16});
    const clS = sprout(sCl, 0, {id: 'clS', label: 'Cl', element: 'Cl', name: 'chlorine on sulfur', pad: 16}, 60);
    const chloro = join(
      {atoms: [...ip.atoms, hCar, sCl, clS, sprout(sCl, 70, {id: 'm1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 58), sprout(sCl, 140, {id: 'm2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 58)], bonds: [...ip.bonds, ['c2', 'hCar', 1], ['sD', 'clS', 1], ['sD', 'm1', 1], ['sD', 'm2', 1]], texts: [plus(400, 200)]}
    );
    const est = ipa(150, 300, {id: 'oH', label: 'O', element: 'O', name: 'oxygen bonded to sulfur', pad: 16});
    const h2 = sprout(est.c2, 152, {id: 'hCar', label: 'H', element: 'H', name: 'the carbinol hydrogen', pad: 14}, 70);
    const s2 = sprout(est.o, 38, {id: 'sD', label: 'S', element: 'S', name: 'sulfur', pad: 16}, 76);
    const nB = beside(h2, -8, -80, {id: 'nB', label: 'N', element: 'N', name: 'pyridine nitrogen', pad: 16});
    const alkoxy = {atoms: [...est.atoms, h2, s2, nB], bonds: [...est.bonds, ['c2', 'hCar', 1], ['oH', 'sD', 1]], texts: [T(nB.x - 34, nB.y + 4, 'py')]};
    mechanisms.push(mech(25,
      'Swern oxidation. DMSO attacks oxalyl chloride, the adduct collapses to the chlorosulfonium ion, the alcohol bonds to sulfur, and pyridine takes the carbinol hydrogen. The sheet uses pyridine as the base.',
      'The product is the ketone. Dimethyl sulfide leaves.',
      {reactants, adduct, chloro, alkoxy, product: acetone(240, 210)},
      [
        step('reactants', 'The oxygen of DMSO attacks the oxalyl carbon and chloride leaves. This step takes 2 arrows.', [
          lone('cOx', 'oD'),
          leave('clX', 'cOx', 'clX')
        ]),
        step('adduct', 'Chloride bonds to sulfur and the oxygen leaves with the oxalyl fragment. This step takes 2 arrows.', [
          lone('sD', 'clX'),
          leave('oD', 'sD', 'oD')
        ]),
        step('chloro', 'The alcohol oxygen attacks sulfur and chloride leaves. This step takes 2 arrows.', [
          lone('sD', 'oH'),
          leave('clS', 'sD', 'clS')
        ]),
        step('alkoxy', 'Pyridine takes the carbinol hydrogen, the carbonyl forms, and sulfur leaves. This step takes 3 arrows.', [
          lone('hCar', 'nB'),
          leave('oH', 'c2', 'hCar'),
          leave('sD', 'oH', 'sD')
        ])
      ]));
  }

  {
    const alcohol = ipa(80, 280, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    const s = A('sD', [400, 170], {label: 'S', element: 'S', name: 'sulfur of DMS', pad: 16});
    const m1 = sprout(s, 55, {id: 'm1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 60);
    const m2 = sprout(s, 130, {id: 'm2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 60);
    const cl = A('clN', [560, 180], {label: 'Cl', element: 'Cl', name: 'chlorine of NCS', pad: 16});
    const n = sprout(cl, 0, {id: 'nS', label: 'N', element: 'N', name: 'nitrogen of NCS', pad: 16}, 62);
    const stub = sprout(n, 0, {id: 'cN', label: 'R', name: 'the succinimide', pad: 16}, 58);
    const reactants = join(alcohol, {atoms: [s, m1, m2, cl, n, stub], bonds: [['sD', 'm1', 1], ['sD', 'm2', 1], ['clN', 'nS', 1], ['nS', 'cN', 1]], texts: [plus(300, 210)]});
    const ip = ipa(110, 270, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    const hCar = sprout(ip.c2, 152, {id: 'hCar', label: 'H', element: 'H', name: 'the carbinol hydrogen', pad: 14}, 70);
    const sCl = A('sD', [500, 180], {label: 'S', element: 'S', name: 'sulfur', pad: 16});
    const clS = sprout(sCl, 0, {id: 'clS', label: 'Cl', element: 'Cl', name: 'chlorine on sulfur', pad: 16}, 58);
    const chloro = join(
      {atoms: [...ip.atoms, hCar, sCl, clS, sprout(sCl, 70, {id: 'm1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 56), sprout(sCl, 140, {id: 'm2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 56)], bonds: [...ip.bonds, ['c2', 'hCar', 1], ['sD', 'clS', 1], ['sD', 'm1', 1], ['sD', 'm2', 1]], texts: [plus(400, 200)]}
    );
    const est = ipa(160, 300, {id: 'oH', label: 'O', element: 'O', name: 'oxygen bonded to sulfur', pad: 16});
    const h2 = sprout(est.c2, 152, {id: 'hCar', label: 'H', element: 'H', name: 'the carbinol hydrogen', pad: 14}, 70);
    const s2 = sprout(est.o, 38, {id: 'sD', label: 'S', element: 'S', name: 'sulfur', pad: 16}, 76);
    const nB = beside(h2, -6, -82, {id: 'nB', label: 'N', element: 'N', name: 'nitrogen of triethylamine', pad: 16});
    const alkoxy = {atoms: [...est.atoms, h2, s2, nB], bonds: [...est.bonds, ['c2', 'hCar', 1], ['oH', 'sD', 1]], texts: [T(nB.x - 48, nB.y + 4, 'Et3N')]};
    mechanisms.push(mech(26,
      'Corey-Kim oxidation. Sulfur of DMS attacks chlorine of NCS, the alcohol bonds to sulfur, and triethylamine takes the carbinol hydrogen.',
      'The product is the ketone.',
      {reactants, chloro, alkoxy, product: acetone(240, 210)},
      [
        step('reactants', 'Sulfur attacks chlorine and the N-Cl bond breaks onto nitrogen. This step takes 2 arrows.', [
          lone('clN', 'sD'),
          leave('nS', 'nS', 'clN')
        ]),
        step('chloro', 'The alcohol oxygen attacks sulfur and chloride leaves. This step takes 2 arrows.', [
          lone('sD', 'oH'),
          leave('clS', 'sD', 'clS')
        ]),
        step('alkoxy', 'Triethylamine takes the carbinol hydrogen and the carbonyl forms. This step takes 3 arrows.', [
          lone('hCar', 'nB'),
          leave('oH', 'c2', 'hCar'),
          leave('sD', 'oH', 'sD')
        ])
      ]));
  }

  {
    const alcohol = roh(80, 210);
    const hCar = sprout(alcohol.c3, -98, {id: 'hCar', label: 'H', element: 'H', name: 'a carbinol hydrogen', pad: 14}, 68);
    const {cr, oCr, ohCr} = chromium(520, 168);
    const reactants = join({atoms: [...alcohol.atoms, hCar, cr, oCr, ohCr], bonds: [...alcohol.bonds, ['c3', 'hCar', 1], ['cr', 'oCr', 2], ['cr', 'ohCr', 1]], texts: [plus(390, 175), T(oCr.x + 118, oCr.y + 10, 'H2CrO4')]});
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbinol carbon'}
    ], 145, 175, 28);
    const o = sprout(chain[2], 28, {id: 'oH', label: 'O', element: 'O', name: 'the chromate ester oxygen', pad: 16}, 76);
    const hC = sprout(chain[2], -98, {id: 'hCar', label: 'H', element: 'H', name: 'a carbinol hydrogen', pad: 14}, 70);
    const cr2 = sprout(o, -78, {id: 'cr', label: 'Cr', element: 'Cr', name: 'chromium', pad: 16}, 86);
    const waterBase = beside(hC, 136, 52, {id: 'oB', label: 'O', element: 'O', name: 'water acting as the base', pad: 16});
    const chromate = {atoms: [...chain, o, hC, cr2, waterBase], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['c3', 'hCar', 1], ['oH', 'cr', 1]]};
    const aldC = A('cCO', [180, 200], {name: 'carbonyl carbon'});
    const ald = join(
      {atoms: [sprout(aldC, 210, {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22}), aldC, sprout(aldC, 330, {id: 'hAld', label: 'H', element: 'H', name: 'the aldehyde hydrogen', pad: 14}, 58), sprout(aldC, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 66)], bonds: [['c1', 'cCO', 1], ['cCO', 'hAld', 1], ['cCO', 'oCO', 2]]},
      water(520, 200, 160)
    );
    const hydC = A('cC', [180, 240], {name: 'the hydrate carbon'});
    const hyd = {
      atoms: [
        sprout(hydC, 200, {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22}),
        hydC,
        sprout(hydC, 330, {id: 'hCar', label: 'H', element: 'H', name: 'the hydrogen on carbon', pad: 14}, 54),
        sprout(hydC, 80, {id: 'oAdd', label: 'O', element: 'O', name: 'the oxonium oxygen', pad: 16}, 64),
        sprout(hydC, 30, {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18}, 64)
      ],
      bonds: []
    };
    const hP = sprout(hyd.atoms[3], 140, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on the oxonium', pad: 14}, 48);
    const hQ = sprout(hyd.atoms[3], 40, {id: 'hQ', label: 'H', element: 'H', name: 'a hydrogen on the oxonium', pad: 14}, 48);
    hyd.atoms.push(hP, hQ);
    hyd.bonds = [['c1', 'cC', 1], ['cC', 'hCar', 1], ['cC', 'oAdd', 1], ['cC', 'oAlk', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1]];
    const cN = A('cC', [170, 230], {name: 'the hydrate carbon'});
    const {cr: crN, oCr: oCrN, ohCr: ohCrN} = chromium(500, 165);
    const neutralScene = {
      atoms: [
        sprout(cN, 200, {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22}),
        cN,
        sprout(cN, 300, {id: 'hCar', label: 'H', element: 'H', name: 'the hydrogen on carbon', pad: 14}, 66),
        sprout(cN, 105, {id: 'oA', label: 'OH', element: 'O', name: 'one hydroxyl', pad: 18}, 70),
        sprout(cN, 35, {id: 'oBnd', label: 'OH', element: 'O', name: 'the hydroxyl that will bond to chromium', pad: 18}, 72),
        crN, oCrN, ohCrN
      ],
      bonds: [['c1', 'cC', 1], ['cC', 'hCar', 1], ['cC', 'oA', 1], ['cC', 'oBnd', 1], ['cr', 'oCr', 2], ['cr', 'ohCr', 1]],
      texts: [plus(370, 175)]
    };
    const cE = A('cC', [180, 225], {name: 'the carbon of the chromate ester'});
    const oE = sprout(cE, 30, {id: 'oH', label: 'O', element: 'O', name: 'the oxygen bonded to chromium', pad: 16}, 74);
    const crE = sprout(oE, -50, {id: 'cr', label: 'Cr', element: 'Cr', name: 'chromium', pad: 16}, 90);
    const hReady = sprout(cE, 300, {id: 'hCar', label: 'H', element: 'H', name: 'the hydrogen on carbon', pad: 14}, 68);
    const baseReady = beside(hReady, 118, 42, {id: 'oB', label: 'O', element: 'O', name: 'water acting as the base', pad: 16});
    const ready = {
      atoms: [
        sprout(cE, 205, {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22}),
        cE,
        hReady,
        sprout(cE, 118, {id: 'oA', label: 'OH', element: 'O', name: 'the hydroxyl that stays', pad: 18}, 70),
        oE,
        crE,
        sprout(crE, 75, {id: 'oCr', label: 'O', element: 'O', name: 'an oxo on chromium', pad: 16}, 68),
        baseReady
      ],
      bonds: [['c1', 'cC', 1], ['cC', 'hCar', 1], ['cC', 'oA', 1], ['cC', 'oH', 1], ['oH', 'cr', 1], ['cr', 'oCr', 2]]
    };
    const acidC = A('cCO', [230, 210], {name: 'carbonyl carbon'});
    const acid = {atoms: [sprout(acidC, 210, {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22}), acidC, sprout(acidC, 330, {id: 'oH', label: 'OH', element: 'O', name: 'the carboxylic hydroxyl', pad: 18}, 70), sprout(acidC, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68)], bonds: [['c1', 'cCO', 1], ['cCO', 'oH', 1], ['cCO', 'oCO', 2]]};
    mechanisms.push(mech(27,
      'Jones reagent oxidizes the primary alcohol past the aldehyde. Water adds, and a second chromate ester gives the carboxylic acid.',
      'The product is the carboxylic acid.',
      {reactants, chromate, ald, hyd, neutral: neutralScene, ready, product: acid},
      [
        step('reactants', 'The alcohol bonds to chromium and hydroxide leaves. This step takes 2 arrows.', [
          lone('cr', 'oH'),
          leave('ohCr', 'cr', 'ohCr')
        ]),
        step('chromate', 'The base takes a carbinol hydrogen and the aldehyde forms. This step takes 3 arrows.', [
          lone('hCar', 'oB'),
          leave('oH', 'c3', 'hCar'),
          leave('cr', 'oH', 'cr')
        ]),
        step('ald', 'Water adds to the aldehyde. This step takes 2 arrows.', [
          lone('cCO', 'oW'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('hyd', 'The alkoxide takes a proton from the oxonium. This step takes 2 arrows.', [
          {arrows: [lone('hP', 'oAlk'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oAlk'), leave('oAdd', 'hQ', 'oAdd')]}
        ]),
        step('neutral', 'One hydroxyl bonds to chromium and hydroxide leaves. This step takes 2 arrows.', [
          lone('cr', 'oBnd'),
          leave('ohCr', 'cr', 'ohCr')
        ]),
        step('ready', 'The base takes the hydrogen on carbon and the carbonyl of the acid forms. This step takes 3 arrows.', [
          lone('hCar', 'oB'),
          leave('oH', 'cC', 'hCar'),
          leave('cr', 'oH', 'cr')
        ])
      ]));
  }
  {
    const alcohol = roh(80, 250);
    const si = A('si', [430, 180], {label: 'Si', element: 'Si', name: 'silicon', pad: 16});
    const cl = sprout(si, -20, {id: 'clS', label: 'Cl', element: 'Cl', name: 'the chlorine that leaves', pad: 16}, 60);
    const me1 = sprout(si, 50, {id: 'me1', label: 'H₃C', name: 'a methyl on silicon', pad: 22}, 60);
    const me2 = sprout(si, 110, {id: 'me2', label: 'H₃C', name: 'a methyl on silicon', pad: 22}, 60);
    const tbu = sprout(si, 180, {id: 'tbu', label: 'tBu', name: 'the tert-butyl group', pad: 20}, 64);
    const n = A('nIm', [660, 250], {label: 'N', element: 'N', name: 'imidazole nitrogen', pad: 16});
    const reactants = join(alcohol, {atoms: [si, cl, me1, me2, tbu, n], bonds: [['si', 'clS', 1], ['si', 'me1', 1], ['si', 'me2', 1], ['si', 'tbu', 1]], texts: [plus(340, 200), T(700, 250, 'imidazole')]});
    const attached = roh(90, 270);
    const si2 = sprout(attached.o, 40, {id: 'si', label: 'Si', element: 'Si', name: 'silicon', pad: 16}, 60);
    const mid = {atoms: [...attached.atoms, si2, A('nIm', [640, 230], {label: 'N', element: 'N', name: 'imidazole nitrogen', pad: 16})], bonds: [...attached.bonds, ['oH', 'si', 1]], texts: [T(680, 230, 'imidazole')]};
    mechanisms.push(mech(28,
      'TBSCl protects the alcohol. Oxygen attacks silicon, chloride leaves, and imidazole takes the proton. The sheet also lists NH4F, which removes the group when fluoride attacks silicon.',
      'The product is the TBS ether.',
      {reactants, mid, product: primary(180, 240, {id: 'oSi', label: 'OTBS', element: 'O', name: 'the silyl ether oxygen', pad: 24})},
      [
        step('reactants', 'The alcohol oxygen attacks silicon and chloride leaves. This step takes 2 arrows.', [
          lone('si', 'oH'),
          leave('clS', 'si', 'clS')
        ]),
        step('mid', 'Imidazole takes the proton from oxygen. This step takes 2 arrows.', [
          lone('hO', 'nIm'),
          leave('oH', 'oH', 'hO')
        ])
      ]));
  }

  {
    const start = primary(140, 230, {id: 'brX', label: 'Br', element: 'Br', name: 'bromine', pad: 16});
    const oh = A('oNu', [520, 210], {label: 'OH⁻', element: 'O', name: 'hydroxide', pad: 22});
    const reactants = join(start, {atoms: [oh], bonds: [], texts: [plus(420, 220)]});
    mechanisms.push(mech(29,
      'Hydroxide substitutes on a primary alkyl bromide. The sheet writes X. This drawing uses bromine.',
      'The product is the primary alcohol.',
      {reactants, product: primary(200, 230, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18})},
      [
        step('reactants', 'Hydroxide attacks carbon and bromide leaves. This step takes 2 arrows.', [
          lone('c3', 'oNu'),
          leave('brX', 'c3', 'brX')
        ])
      ]));
  }

  {
    const alcohol = roh(80, 230);
    const hH = A('hH', [500, 180], {label: 'H⁻', element: 'H', name: 'hydride from sodium hydride', pad: 18});
    const reactants = join(alcohol, {atoms: [hH], bonds: [], texts: [plus(400, 200), T(560, 180, 'Na⁺')]});
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbon bearing oxygen'}
    ], 100, 240, 28);
    const o = sprout(chain[2], 28, {id: 'oH', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18}, 66);
    const cE1 = A('cE1', [500, 200], {label: 'H₃C', name: 'the methyl of ethyl bromide', pad: 22});
    const cE2 = A('cE2', P(500, 200, 0, 74), {name: 'the carbon bearing bromine'});
    const brE = A('brE', P(cE2.x, cE2.y, 0, 70), {label: 'Br', element: 'Br', name: 'bromine', pad: 16});
    const alkoxide = {atoms: [...chain, o, cE1, cE2, brE], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['cE1', 'cE2', 1], ['cE2', 'brE', 1]], texts: [plus(420, 220)]};
    const ether = zz([
      {id: 'c1', label: 'H₃C', name: 'a methyl carbon', pad: 22},
      {id: 'c2', name: 'a methylene carbon'},
      {id: 'oE', label: 'O', element: 'O', name: 'the ether oxygen', pad: 16},
      {id: 'c3', name: 'a methylene carbon'},
      {id: 'c4', label: 'H₃C', name: 'a methyl carbon', pad: 22}
    ], 140, 220, 24);
    mechanisms.push(mech(30,
      'Williamson ether synthesis. Sodium hydride takes the alcohol proton, then the alkoxide attacks ethyl bromide.',
      'The product is diethyl ether.',
      {reactants, alkoxide, product: {atoms: ether, bonds: [['c1', 'c2', 1], ['c2', 'oE', 1], ['oE', 'c3', 1], ['c3', 'c4', 1]]}},
      [
        step('reactants', 'Hydride takes the alcohol proton. This step takes 2 arrows.', [
          lone('hO', 'hH'),
          leave('oH', 'oH', 'hO')
        ]),
        step('alkoxide', 'The alkoxide attacks carbon and bromide leaves. This step takes 2 arrows.', [
          lone('cE2', 'oH'),
          leave('brE', 'cE2', 'brE')
        ])
      ]));
  }

  {
    const start = primary(140, 220, {id: 'brX', label: 'Br', element: 'Br', name: 'bromine', pad: 16});
    const mg = A('mg', [520, 220], {label: 'Mg', element: 'Mg', name: 'magnesium metal', pad: 18});
    const reactants = join(start, {atoms: [mg], bonds: [], texts: [plus(430, 220)]});
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbon bonded to magnesium'}
    ], 160, 220, 28);
    const mgP = sprout(chain[2], 28, {id: 'mg', label: 'Mg', element: 'Mg', name: 'magnesium', pad: 18}, 70);
    const brP = sprout(mgP, 28, {id: 'brX', label: 'Br', element: 'Br', name: 'bromine', pad: 16}, 70);
    const product = {atoms: [...chain, mgP, brP], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'mg', 1], ['mg', 'brX', 1]]};
    mechanisms.push(mech(31,
      'Magnesium insertion happens on the metal surface. The arrows show the bond change from the alkyl bromide to the Grignard reagent. Lithium gives the organolithium the same way.',
      'The product is the Grignard reagent.',
      {reactants, product},
      [
        step('reactants', 'Carbon bonds to magnesium and bromine bonds to magnesium. This step takes 3 arrows.', [
          lone('c3', 'mg'),
          leave('brX', 'c3', 'brX'),
          lone('brX', 'mg')
        ])
      ]));
  }

  {
    const reactants = join(epoxide(180, 230), hydronium(580, 170), {texts: [plus(430, 200)]});
    const epi = epoxide(170, 240);
    const hOn = sprout(epi.o, 90, {id: 'hOn', label: 'H', element: 'H', name: 'the hydrogen on the epoxide oxygen', pad: 14}, 52);
    const protonated = join({atoms: [...epi.atoms, hOn], bonds: [['oE', 'cM', 1], ['oE', 'cL', 1], ['cM', 'cL', 1], ['cM', 'me', 1], ['oE', 'hOn', 1]], texts: [plus(epi.o.x + 8, epi.o.y - 36)]}, water(580, 250));
    const cM = A('cM', [200, 240], {name: 'the more substituted carbon'});
    const cL = sprout(cM, 0, {id: 'cL', name: 'the less substituted carbon'}, 80);
    const me = sprout(cM, 180, {id: 'me', label: 'H₃C', name: 'methyl carbon', pad: 22}, 72);
    const oAdd = sprout(cM, 90, {id: 'oAdd', label: 'O', element: 'O', name: 'the oxonium oxygen', pad: 16}, 66);
    const hP = sprout(oAdd, 40, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on the oxonium', pad: 14}, 50);
    const hQ = sprout(oAdd, 140, {id: 'hQ', label: 'H', element: 'H', name: 'the other hydrogen on the oxonium', pad: 14}, 50);
    const oE = sprout(cL, -90, {id: 'oE', label: 'OH', element: 'O', name: 'the hydroxyl from the epoxide', pad: 18}, 66);
    const opened = join({
      atoms: [me, cM, cL, oAdd, hP, hQ, oE],
      bonds: [['me', 'cM', 1], ['cM', 'cL', 1], ['cM', 'oAdd', 'wedge'], ['cL', 'oE', 'dash'], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1]],
      texts: [plus(oAdd.x + 8, oAdd.y - 34)]
    }, water(620, 280, 190));
    const prodM = A('cM', [230, 230], {name: 'the more substituted carbon'});
    const prodL = sprout(prodM, 0, {id: 'cL', name: 'the less substituted carbon'}, 80);
    const product = {atoms: [sprout(prodM, 180, {id: 'me', label: 'H₃C', name: 'methyl carbon', pad: 22}, 72), prodM, prodL, sprout(prodM, 90, {id: 'oM', label: 'OH', element: 'O', name: 'the new hydroxyl', pad: 18}, 66), sprout(prodL, -90, {id: 'oL', label: 'OH', element: 'O', name: 'the other hydroxyl', pad: 18}, 66)], bonds: [['me', 'cM', 1], ['cM', 'cL', 1], ['cM', 'oM', 'wedge'], ['cL', 'oL', 'dash']]};
    mechanisms.push(mech(32,
      'Acid opens the epoxide. Water attacks the more substituted carbon, from the face opposite the oxygen.',
      'The product is the anti diol.',
      {reactants, protonated, opened, product},
      [
        step('reactants', 'The epoxide oxygen takes a proton. This step takes 2 arrows.', [
          lone('hA', 'oE'),
          leave('oA', 'hA', 'oA')
        ]),
        step('protonated', 'Water attacks the more substituted carbon and that carbon-oxygen bond breaks. This step takes 2 arrows.', [
          lone('cM', 'oW'),
          leave('oE', 'cM', 'oE')
        ]),
        step('opened', 'Water takes a proton from the oxonium. This step takes 2 arrows.', [
          {arrows: [lone('hP', 'oW'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oW'), leave('oAdd', 'hQ', 'oAdd')]}
        ])
      ]));
  }

  {
    const epi = epoxide(160, 230);
    const b = A('bL', [520, 170], {label: 'B', element: 'B', name: 'boron of the Lewis acid', pad: 16});
    const f1 = sprout(b, 40, {id: 'f1', label: 'F', element: 'F', name: 'a fluorine', pad: 16}, 56);
    const f2 = sprout(b, -30, {id: 'f2', label: 'F', element: 'F', name: 'a fluorine', pad: 16}, 56);
    const f3 = sprout(b, 110, {id: 'f3', label: 'F', element: 'F', name: 'a fluorine', pad: 16}, 56);
    const reactants = join(epi, {atoms: [b, f1, f2, f3], bonds: [['bL', 'f1', 1], ['bL', 'f2', 1], ['bL', 'f3', 1]], texts: [plus(400, 190)]});
    const epi2 = epoxide(150, 240);
    const b2 = sprout(epi2.o, 80, {id: 'bL', label: 'B', element: 'B', name: 'boron', pad: 16}, 58);
    const oNu = A('oNu', [560, 280], {label: 'OMe⁻', element: 'O', name: 'methoxide', pad: 24});
    const coordinated = {atoms: [...epi2.atoms, b2, oNu], bonds: [['oE', 'cM', 1], ['oE', 'cL', 1], ['cM', 'cL', 1], ['cM', 'me', 1], ['oE', 'bL', 1]], texts: [plus(470, 260), T(620, 170, 'BF3')]};
    const cM = A('cM', [200, 240], {name: 'the more substituted carbon'});
    const cL = sprout(cM, 0, {id: 'cL', name: 'the less substituted carbon'}, 80);
    const alkoxide = join({
      atoms: [
        sprout(cM, 180, {id: 'me', label: 'H₃C', name: 'methyl carbon', pad: 22}, 72),
        cM, cL,
        sprout(cM, 90, {id: 'oNu', label: 'OMe', element: 'O', name: 'the methoxy group', pad: 22}, 68),
        sprout(cL, -90, {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18}, 66)
      ],
      bonds: [['me', 'cM', 1], ['cM', 'cL', 1], ['cM', 'oNu', 'wedge'], ['cL', 'oAlk', 'dash']],
      texts: [T(520, 360, '⁻BF3')]
    }, water(640, 160, 200));
    const pM = A('cM', [230, 230], {name: 'the more substituted carbon'});
    const pL = sprout(pM, 0, {id: 'cL', name: 'the less substituted carbon'}, 80);
    const product = {atoms: [sprout(pM, 180, {id: 'me', label: 'H₃C', name: 'methyl carbon', pad: 22}, 72), pM, pL, sprout(pM, 90, {id: 'oNu', label: 'OMe', element: 'O', name: 'the methoxy group', pad: 22}, 68), sprout(pL, -90, {id: 'oH', label: 'OH', element: 'O', name: 'the hydroxyl', pad: 18}, 66)], bonds: [['me', 'cM', 1], ['cM', 'cL', 1], ['cM', 'oNu', 'wedge'], ['cL', 'oH', 'dash']]};
    mechanisms.push(mech(33,
      'A Lewis acid coordinates to the epoxide oxygen. Methoxide then attacks the more substituted carbon. The sheet writes Nu. This drawing uses methoxide, and BF3 for the Lewis acid.',
      'The product has the nucleophile on the more substituted carbon and OH on the less substituted carbon.',
      {reactants, coordinated, alkoxide, product},
      [
        step('reactants', 'The epoxide oxygen bonds to boron. This step takes 1 arrow.', [lone('bL', 'oE')]),
        step('coordinated', 'Methoxide attacks the more substituted carbon, that carbon-oxygen bond breaks, and boron leaves. This step takes 3 arrows.', [
          lone('cM', 'oNu'),
          leave('oE', 'cM', 'oE'),
          leave('oE', 'oE', 'bL')
        ]),
        step('alkoxide', 'Water protonates the alkoxide. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const reactants = join(epoxide(180, 220), {atoms: [A('oNu', [520, 220], {label: 'OMe⁻', element: 'O', name: 'methoxide', pad: 24})], bonds: [], texts: [plus(400, 220)]});
    const cL = A('cL', [280, 240], {name: 'the less substituted carbon'});
    const cM = sprout(cL, 180, {id: 'cM', name: 'the more substituted carbon'}, 80);
    const alkoxide = join({
      atoms: [
        sprout(cM, 180, {id: 'me', label: 'H₃C', name: 'methyl carbon', pad: 22}, 72),
        cM, cL,
        sprout(cL, 90, {id: 'oNu', label: 'OMe', element: 'O', name: 'the methoxy group', pad: 22}, 68),
        sprout(cM, -90, {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18}, 66)
      ],
      bonds: [['me', 'cM', 1], ['cM', 'cL', 1], ['cL', 'oNu', 'wedge'], ['cM', 'oAlk', 'dash']]
    }, water(620, 170, 190));
    const pL = A('cL', [300, 230], {name: 'the less substituted carbon'});
    const pM = sprout(pL, 180, {id: 'cM', name: 'the more substituted carbon'}, 80);
    const product = {atoms: [sprout(pM, 180, {id: 'me', label: 'H₃C', name: 'methyl carbon', pad: 22}, 72), pM, pL, sprout(pL, 90, {id: 'oNu', label: 'OMe', element: 'O', name: 'the methoxy group', pad: 22}, 68), sprout(pM, -90, {id: 'oH', label: 'OH', element: 'O', name: 'the hydroxyl', pad: 18}, 66)], bonds: [['me', 'cM', 1], ['cM', 'cL', 1], ['cL', 'oNu', 'wedge'], ['cM', 'oH', 'dash']]};
    mechanisms.push(mech(34,
      'Under basic conditions methoxide attacks the less substituted carbon of the epoxide. The sheet writes Base. This drawing uses methoxide.',
      'The product has the base on the less substituted carbon and OH on the carbon that held the methyl.',
      {reactants, alkoxide, product},
      [
        step('reactants', 'Methoxide attacks the less substituted carbon and that carbon-oxygen bond breaks. This step takes 2 arrows.', [
          lone('cL', 'oNu'),
          leave('oE', 'cL', 'oE')
        ]),
        step('alkoxide', 'Water protonates the alkoxide. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const reactants = join(epoxide(180, 220), hydride(540, 180), {texts: [plus(420, 200)]});
    const chain = chain3(160, 250);
    const oAlk = sprout(chain[1], 95, {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18}, 66);
    const alkoxide = join({atoms: [...chain, oAlk], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAlk', 1]], texts: [T(520, 360, 'the aluminate')]}, water(620, 170, 180));
    mechanisms.push(mech(35,
      'Lithium aluminum hydride opens the epoxide at the less substituted carbon. Water then protonates the alkoxide. The sheet writes the workup as H3O+.',
      'The product is propan-2-ol.',
      {reactants, alkoxide, product: ipa(200, 240, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18})},
      [
        step('reactants', 'Hydride attacks the less substituted carbon and that carbon-oxygen bond breaks. This step takes 2 arrows.', [
          leave('cL', 'hH', 'mH'),
          leave('oE', 'cL', 'oE')
        ]),
        step('alkoxide', 'Water protonates the alkoxide. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const c = A('cCO', [170, 210], {name: 'carbonyl carbon'});
    const me = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'the acetyl methyl', pad: 22});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    const oR = sprout(c, 330, {id: 'oR', label: 'O', element: 'O', name: 'the alkoxy oxygen', pad: 16}, 70);
    const meR = sprout(oR, 270, {id: 'meR', label: 'H₃C', name: 'the methoxy methyl', pad: 22}, 66);
    const reactants = join({atoms: [me, c, o, oR, meR], bonds: [['meL', 'cCO', 1], ['cCO', 'oCO', 2], ['cCO', 'oR', 1], ['oR', 'meR', 1]], texts: [plus(430, 210)]}, hydride(560, 160));
    const tetra = capAt(190, 250, {
      name: 'the tetrahedral carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the acetyl methyl', pad: 22},
      right: {id: 'oR', label: 'O', element: 'O', name: 'the alkoxy oxygen', pad: 16},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'hH', label: 'H', element: 'H', name: 'the hydride that added', pad: 14}
    });
    const meOnO = sprout(tetra.right, -20, {id: 'meR', label: 'H₃C', name: 'the methoxy methyl', pad: 22}, 64);
    const tetraScene = {atoms: [...tetra.atoms, meOnO], bonds: [...tetra.bonds, ['oR', 'meR', 1]]};
    const ald = A('cCO', [180, 200], {name: 'carbonyl carbon'});
    const aldehyde = join({
      atoms: [
        sprout(ald, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22}),
        ald,
        sprout(ald, 330, {id: 'hAld', label: 'H', element: 'H', name: 'the aldehyde hydrogen', pad: 14}, 58),
        sprout(ald, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68),
        A('oR', [520, 300], {label: 'O⁻', element: 'O', name: 'the expelled alkoxide', pad: 18}),
        A('meR', [600, 300], {label: 'H₃C', name: 'the methoxy methyl', pad: 22})
      ],
      bonds: [['meL', 'cCO', 1], ['cCO', 'hAld', 1], ['cCO', 'oCO', 2], ['oR', 'meR', 1]]
    }, hydride(560, 150));
    const eth = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the methylene carbon'}
    ], 140, 220, 28);
    const oEth = sprout(eth[1], 28, {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide of the reduced ester', pad: 18}, 66);
    const both = join({
      atoms: [...eth, oEth, A('oR', [500, 280], {label: 'O⁻', element: 'O', name: 'the methoxide that left', pad: 18}), A('meR', [580, 280], {label: 'H₃C', name: 'the methoxy methyl', pad: 22})],
      bonds: [['c1', 'c2', 1], ['c2', 'oAlk', 1], ['oR', 'meR', 1]]
    }, water(660, 160, 180));
    const ethOH = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the methylene carbon'}
    ], 140, 200, 28);
    const afterOne = join({
      atoms: [...ethOH, sprout(ethOH[1], 28, {id: 'oH', label: 'OH', element: 'O', name: 'the new alcohol', pad: 18}, 66), A('oR', [480, 280], {label: 'O⁻', element: 'O', name: 'methoxide', pad: 18}), A('meR', [560, 280], {label: 'H₃C', name: 'the methoxy methyl', pad: 22})],
      bonds: [['c1', 'c2', 1], ['c2', 'oH', 1], ['oR', 'meR', 1]]
    }, water(660, 160, 170));
    const prodA = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the methylene carbon'}
    ], 150, 180, 28);
    const prodB = zz([
      {id: 'meR', label: 'H₃C', name: 'the methanol methyl', pad: 22}
    ], 480, 250, 0);
    const product = {
      atoms: [...prodA, sprout(prodA[1], 28, {id: 'oH', label: 'OH', element: 'O', name: 'the ethanol oxygen', pad: 18}, 66), ...prodB, sprout(prodB[0], 0, {id: 'oR', label: 'OH', element: 'O', name: 'the methanol oxygen', pad: 18}, 66)],
      bonds: [['c1', 'c2', 1], ['c2', 'oH', 1], ['meR', 'oR', 1]]
    };
    mechanisms.push(mech(37,
      'Lithium aluminum hydride reduces the ester. The first hydride adds, the alkoxy group leaves, and a second hydride reduces the aldehyde. Water protonates both alkoxides at the end. The sheet writes R. This drawing uses a methyl ester. No oxygen-aluminum bond is drawn.',
      'The products are ethanol and methanol.',
      {reactants, tetra: tetraScene, aldehyde, both, afterOne, product},
      [
        step('reactants', 'Hydride attacks the carbonyl carbon and the pi bond goes to oxygen. This step takes 2 arrows.', [
          leave('cCO', 'hH', 'mH'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('tetra', 'The alkoxide electrons form the carbonyl and the alkoxy group leaves. Click the alkoxide oxygen, then the carbon. This step takes 2 arrows.', [
          lone('cC', 'oAlk'),
          leave('oR', 'cC', 'oR')
        ]),
        step('aldehyde', 'The second hydride attacks the aldehyde. This step takes 2 arrows.', [
          leave('cCO', 'hH', 'mH'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('both', 'Water protonates the alkoxide from the reduced chain. This step takes 2 arrows.', protonate('oAlk')),
        step('afterOne', 'Water protonates methoxide. This step takes 2 arrows.', protonate('oR'))
      ]));
  }
  {
    const c = A('cCO', [190, 210], {name: 'carbonyl carbon'});
    const meL = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'a methyl', pad: 22});
    const meR = sprout(c, 330, {id: 'meR', label: 'R', name: 'the other substituent', pad: 16});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    const bh = A('hH', [560, 160], {label: 'H', element: 'H', name: 'the hydride', pad: 14});
    const bb = A('mH', P(560, 160, 0, 70), {label: 'B', element: 'B', name: 'boron of borohydride', pad: 16});
    const reactants = join({atoms: [meL, c, meR, o, bh, bb], bonds: [['meL', 'cCO', 1], ['cCO', 'meR', 1], ['cCO', 'oCO', 2], ['hH', 'mH', 1]], texts: [plus(430, 210)]});
    const alk = capAt(210, 250, {
      name: 'the carbon that was the carbonyl carbon',
      left: {id: 'meL', label: 'H₃C', name: 'a methyl', pad: 22},
      right: {id: 'meR', label: 'R', name: 'the other substituent', pad: 16},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'hAdd', label: 'H', element: 'H', name: 'the hydride that added', pad: 14}
    });
    const alkoxide = join({atoms: alk.atoms, bonds: alk.bonds, texts: [T(500, 380, 'the borate')]}, water(640, 160, 175));
    const prod = capAt(230, 240, {
      name: 'the alcohol carbon',
      left: {id: 'meL', label: 'H₃C', name: 'a methyl', pad: 22},
      right: {id: 'meR', label: 'R', name: 'the other substituent', pad: 16},
      upL: {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18},
      upR: {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen that added', pad: 14}
    });
    mechanisms.push(mech(38,
      'Sodium borohydride delivers one hydride to the ketone. Water protonates the alkoxide on workup. The sheet writes R. No oxygen-boron bond is drawn.',
      'The product is the secondary alcohol.',
      {reactants, alkoxide, product: {atoms: prod.atoms, bonds: prod.bonds}},
      [
        step('reactants', 'Hydride attacks the carbonyl carbon and the pi bond goes to oxygen. This step takes 2 arrows.', [
          leave('cCO', 'hH', 'mH'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('alkoxide', 'Water protonates the alkoxide. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const c = A('cCO', [200, 220], {name: 'carbonyl carbon'});
    const hL = sprout(c, 210, {id: 'hL', label: 'H', element: 'H', name: 'one hydrogen of formaldehyde', pad: 14}, 58);
    const hR = sprout(c, 330, {id: 'hR', label: 'H', element: 'H', name: 'the other hydrogen of formaldehyde', pad: 14}, 58);
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    const reactants = join({atoms: [hL, c, hR, o], bonds: [['hL', 'cCO', 1], ['cCO', 'hR', 1], ['cCO', 'oCO', 2]], texts: [plus(400, 220)]}, grin(530, 160));
    const alk = capAt(200, 255, {
      name: 'the carbon that was the carbonyl carbon',
      left: {id: 'hL', label: 'H', element: 'H', name: 'one hydrogen', pad: 14},
      right: {id: 'hR', label: 'H', element: 'H', name: 'the other hydrogen', pad: 14},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon that came from the Grignard'}
    });
    const tail = sprout(alk.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 74);
    const alkoxide = join({atoms: [...alk.atoms, tail], bonds: [...alk.bonds, ['cAlpha', 'cBeta', 1]], texts: [T(500, 390, '⁺MgBr')]}, water(650, 155, 175));
    mechanisms.push(mech(39,
      'Ethylmagnesium bromide adds to formaldehyde. The sheet writes R and writes the workup as H3O+. The product is drawn as a normal chain.',
      'The product is the primary alcohol. HOMgBr is the salt.',
      {reactants, alkoxide, product: primary(200, 230, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18})},
      [
        step('reactants', 'The carbon-magnesium bond attacks the carbonyl carbon and the pi bond goes to oxygen. This step takes 2 arrows.', [
          leave('cCO', 'cAlpha', 'mg'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('alkoxide', 'The alkoxide has formed. ⁺MgBr is the counterion. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const c = A('cCO', [190, 220], {name: 'carbonyl carbon'});
    const me = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22});
    const h = sprout(c, 330, {id: 'hAld', label: 'H', element: 'H', name: 'the aldehyde hydrogen', pad: 14}, 60);
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    const reactants = join({atoms: [me, c, h, o], bonds: [['meL', 'cCO', 1], ['cCO', 'hAld', 1], ['cCO', 'oCO', 2]], texts: [plus(400, 220)]}, grin(530, 160));
    const alk = capAt(200, 255, {
      name: 'the carbon that was the carbonyl carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22},
      right: {id: 'hAld', label: 'H', element: 'H', name: 'the hydrogen that was on the aldehyde', pad: 14},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon that came from the Grignard'}
    });
    const tail = sprout(alk.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 74);
    const alkoxide = join({atoms: [...alk.atoms, tail], bonds: [...alk.bonds, ['cAlpha', 'cBeta', 1]], texts: [T(500, 390, '⁺MgBr')]}, water(650, 155, 175));
    const prod = capAt(220, 245, {
      name: 'the alcohol carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22},
      right: {id: 'hAld', label: 'H', element: 'H', name: 'the hydrogen', pad: 14},
      upL: {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon that came from the Grignard'}
    });
    const tailP = sprout(prod.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 74);
    mechanisms.push(mech(40,
      'Ethylmagnesium bromide adds to acetaldehyde. The methyl and the aldehyde hydrogen stay the chain. The oxygen and the new ethyl sit close together above it.',
      'The product is the secondary alcohol. HOMgBr is the salt.',
      {reactants, alkoxide, product: {atoms: [...prod.atoms, tailP], bonds: [...prod.bonds, ['cAlpha', 'cBeta', 1]], texts: [T(520, 390, 'HOMgBr')]}},
      [
        step('reactants', 'The carbon-magnesium bond attacks the carbonyl carbon and the pi bond goes to oxygen. This step takes 2 arrows.', [
          leave('cCO', 'cAlpha', 'mg'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('alkoxide', 'The alkoxide has formed. ⁺MgBr is the counterion. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const c = A('cCO', [190, 220], {name: 'carbonyl carbon'});
    const meL = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'left methyl carbon', pad: 22});
    const meR = sprout(c, 330, {id: 'meR', label: 'H₃C', name: 'right methyl carbon', pad: 22});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 72);
    const reactants = join({atoms: [meL, c, meR, o], bonds: [['meL', 'cCO', 1], ['cCO', 'meR', 1], ['cCO', 'oCO', 2]], texts: [plus(400, 230)]}, grin(530, 168));
    const alk = capAt(200, 255, {
      name: 'carbon that was the carbonyl carbon',
      left: {id: 'meL', label: 'H₃C', name: 'left methyl carbon', pad: 22},
      right: {id: 'meR', label: 'H₃C', name: 'right methyl carbon', pad: 22},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'alkoxide oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon that came from the Grignard'}
    });
    const tail = sprout(alk.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 74);
    const alkoxide = join(
      {atoms: [...alk.atoms, tail], bonds: [...alk.bonds, ['cAlpha', 'cBeta', 1]], texts: [T(500, 390, '⁺MgBr')]},
      water(650, 155, 175)
    );
    const prod = capAt(220, 250, {
      name: 'the alcohol carbon',
      left: {id: 'meL', label: 'H₃C', name: 'left methyl carbon', pad: 22},
      right: {id: 'meR', label: 'H₃C', name: 'right methyl carbon', pad: 22},
      upL: {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon that came from the Grignard'}
    });
    const tailP = sprout(prod.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 74);
    const product = {atoms: [...prod.atoms, tailP], bonds: [...prod.bonds, ['cAlpha', 'cBeta', 1]], texts: [T(530, 390, 'HOMgBr')]};
    mechanisms.push(mech(41,
      'Ethylmagnesium bromide adds to the ketone. The two methyls stay the chain. The oxygen and the new ethyl sit close together above it. The sheet writes the workup as H3O+.',
      'Every arrow matched. The alcohol is the organic product. HOMgBr is the salt.',
      {reactants, alkoxide, product},
      [
        step('reactants', 'This step takes 2 arrows.', [
          leave('cCO', 'cAlpha', 'mg'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('alkoxide', 'The alkoxide has formed. ⁺MgBr is the counterion. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const c = A('cCO', [160, 210], {name: 'carbonyl carbon'});
    const me = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'the acetyl methyl', pad: 22});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68);
    const oR = sprout(c, 330, {id: 'oR', label: 'O', element: 'O', name: 'the alkoxy oxygen', pad: 16}, 66);
    const meR = sprout(oR, 270, {id: 'meR', label: 'H₃C', name: 'the methoxy methyl', pad: 22}, 62);
    const reactants = join({atoms: [me, c, o, oR, meR], bonds: [['meL', 'cCO', 1], ['cCO', 'oCO', 2], ['cCO', 'oR', 1], ['oR', 'meR', 1]], texts: [plus(420, 210)]}, grin(540, 155));
    const tetra = capAt(180, 255, {
      name: 'the tetrahedral carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the acetyl methyl', pad: 22},
      right: {id: 'oR', label: 'O', element: 'O', name: 'the alkoxy oxygen', pad: 16},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon from the first Grignard'}
    });
    const meOn = sprout(tetra.right, -15, {id: 'meR', label: 'H₃C', name: 'the methoxy methyl', pad: 22}, 62);
    const tail1 = sprout(tetra.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the first ethyl group', pad: 22}, 70);
    const tetraScene = {atoms: [...tetra.atoms, meOn, tail1], bonds: [...tetra.bonds, ['oR', 'meR', 1], ['cAlpha', 'cBeta', 1]]};
    const ket = A('cCO', [180, 200], {name: 'carbonyl carbon'});
    const kMe = sprout(ket, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22});
    const kA = sprout(ket, 330, {id: 'cAlpha', name: 'carbon from the first Grignard'});
    const kB = sprout(kA, 270, {id: 'cBeta', label: 'H₃C', name: 'methyl of the first ethyl group', pad: 22}, 68);
    const kO = sprout(ket, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68);
    const ketoneScene = join({atoms: [kMe, ket, kA, kB, kO], bonds: [['meL', 'cCO', 1], ['cCO', 'cAlpha', 1], ['cAlpha', 'cBeta', 1], ['cCO', 'oCO', 2]], texts: [plus(460, 200)]}, organoMg(580, 155, {c: 'cA2', me: 'cB2', mg: 'mg2', br: 'br2'}));
    const sec = capAt(190, 255, {
      name: 'the carbon that was the carbonyl carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the original methyl', pad: 22},
      right: {id: 'cAlpha', name: 'carbon from the first Grignard'},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'cA2', name: 'carbon from the second Grignard'}
    });
    const b1 = sprout(sec.right, -20, {id: 'cBeta', label: 'H₃C', name: 'methyl of the first ethyl group', pad: 22}, 68);
    const b2 = sprout(sec.upR, -35, {id: 'cB2', label: 'H₃C', name: 'methyl of the second ethyl group', pad: 22}, 70);
    const secScene = join({atoms: [...sec.atoms, b1, b2], bonds: [...sec.bonds, ['cAlpha', 'cBeta', 1], ['cA2', 'cB2', 1]], texts: [T(530, 390, '⁺MgBr')]}, water(660, 145, 180));
    const fin = capAt(210, 245, {
      name: 'the alcohol carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the original methyl', pad: 22},
      right: {id: 'cAlpha', name: 'carbon from the first Grignard'},
      upL: {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18},
      upR: {id: 'cA2', name: 'carbon from the second Grignard'}
    });
    const f1 = sprout(fin.right, -20, {id: 'cBeta', label: 'H₃C', name: 'methyl of the first ethyl group', pad: 22}, 68);
    const f2 = sprout(fin.upR, -35, {id: 'cB2', label: 'H₃C', name: 'methyl of the second ethyl group', pad: 22}, 70);
    const product = {atoms: [...fin.atoms, f1, f2], bonds: [...fin.bonds, ['cAlpha', 'cBeta', 1], ['cA2', 'cB2', 1]], texts: [T(540, 390, 'HOMgBr')]};
    mechanisms.push(mech(42,
      'Two equivalents of ethylmagnesium bromide add to the ester. The alkoxy group leaves before the second addition. Water is added only at the end. The sheet writes R. This drawing uses ethyl and a methyl ester.',
      'The product is the tertiary alcohol with two ethyl groups.',
      {reactants, tetra: tetraScene, ketone: ketoneScene, sec: secScene, product},
      [
        step('reactants', 'The first carbon-magnesium bond attacks the carbonyl. This step takes 2 arrows.', [
          leave('cCO', 'cAlpha', 'mg'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('tetra', 'The alkoxide electrons form the carbonyl and the alkoxy group leaves. Click the alkoxide oxygen, then the carbon. This step takes 2 arrows.', [
          lone('cC', 'oAlk'),
          leave('oR', 'cC', 'oR')
        ]),
        step('ketone', 'The second Grignard attacks the ketone. This step takes 2 arrows.', [
          leave('cCO', 'cA2', 'mg2'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('sec', 'Water protonates the alkoxide. This step takes 2 arrows.', protonate('oAlk'))
      ]));
  }

  {
    const c = A('cCO', [180, 210], {name: 'carbonyl carbon'});
    const me = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22});
    const oCO = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68);
    const oH = sprout(c, 330, {id: 'oH', label: 'O', element: 'O', name: 'the hydroxyl oxygen', pad: 16}, 66);
    const hO = sprout(oH, 20, {id: 'hO', label: 'H', element: 'H', name: 'the acid hydrogen', pad: 14}, 52);
    const reactants = join({atoms: [me, c, oCO, oH, hO], bonds: [['meL', 'cCO', 1], ['cCO', 'oCO', 2], ['cCO', 'oH', 1], ['oH', 'hO', 1]], texts: [plus(430, 210)]}, rli(560, 155, {c: 'cR', me: 'cRm', li: 'li1'}));
    const carbC = A('cCO', [180, 210], {name: 'carbonyl carbon'});
    const carboxylate = join({
      atoms: [
        sprout(carbC, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22}),
        carbC,
        sprout(carbC, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68),
        sprout(carbC, 330, {id: 'oA', label: 'O⁻', element: 'O', name: 'the carboxylate oxygen', pad: 18}, 66)
      ],
      bonds: [['meL', 'cCO', 1], ['cCO', 'oCO', 2], ['cCO', 'oA', 1]],
      texts: [T(500, 340, 'CH₃CH₃'), plus(430, 200)]
    }, rli(580, 150, {c: 'cR2', me: 'cR2m', li: 'li2'}));
    const di = capAt(200, 250, {
      name: 'the tetrahedral carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the original methyl', pad: 22},
      right: {id: 'cR2', name: 'carbon from the organolithium'},
      upL: {id: 'o1', label: 'O⁻', element: 'O', name: 'one alkoxide oxygen', pad: 18},
      upR: {id: 'o2', label: 'O⁻', element: 'O', name: 'the other alkoxide oxygen', pad: 18}
    });
    const diTail = sprout(di.right, -25, {id: 'cR2m', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 70);
    const dianion = join({atoms: [...di.atoms, diTail], bonds: [...di.bonds, ['cR2', 'cR2m', 1]], texts: [T(520, 380, '2 Li⁺')]}, water(660, 150, 180));
    const mono = capAt(200, 250, {
      name: 'the tetrahedral carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the original methyl', pad: 22},
      right: {id: 'cR2', name: 'carbon from the organolithium'},
      upL: {id: 'oH', label: 'OH', element: 'O', name: 'the hydroxyl', pad: 18},
      upR: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18}
    });
    const monoTail = sprout(mono.right, -25, {id: 'cR2m', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 70);
    const monoScene = {atoms: [...mono.atoms, monoTail], bonds: [...mono.bonds, ['cR2', 'cR2m', 1]]};
    const ket = A('cCO', [230, 210], {name: 'carbonyl carbon'});
    const product = {
      atoms: [
        sprout(ket, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22}),
        ket,
        sprout(ket, 330, {id: 'cR2', name: 'carbon from the organolithium'}),
        sprout(ket, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68)
      ],
      bonds: [['meL', 'cCO', 1], ['cCO', 'cR2', 1], ['cCO', 'oCO', 2]]
    };
    const ketTail = sprout(product.atoms[2], -20, {id: 'cR2m', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 68);
    product.atoms.push(ketTail);
    product.bonds.push(['cR2', 'cR2m', 1]);
    mechanisms.push(mech(43,
      'Two equivalents of the organolithium are required. The first takes the acid proton. The second adds to the carboxylate, and that dianion holds until workup. Workup protonates it, then it collapses to the ketone. The sheet writes R. This drawing uses ethyl.',
      'The product is the ketone.',
      {reactants, carboxylate, dianion, mono: monoScene, product},
      [
        step('reactants', 'The organolithium carbon takes the acid proton. This step takes 2 arrows.', [
          lone('hO', 'cR'),
          leave('oH', 'oH', 'hO')
        ]),
        step('carboxylate', 'The second organolithium attacks the carbonyl. This step takes 2 arrows.', [
          leave('cCO', 'cR2', 'li2'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('dianion', 'Water protonates one oxygen. The dianion does not collapse before this. This step takes 2 arrows.', protonate('o1')),
        step('mono', 'The remaining alkoxide forms the carbonyl and the hydroxyl leaves. Click the alkoxide oxygen, then the carbon. This step takes 2 arrows.', [
          lone('cC', 'oAlk'),
          leave('oH', 'cC', 'oH')
        ])
      ]));
  }

  {
    const yne = alkyneInternal(140, 190);
    const h1 = A('h1', [520, 170], {label: 'H', element: 'H', name: 'one hydrogen of H2', pad: 14});
    const h2 = A('h2', P(520, 170, 0, 60), {label: 'H', element: 'H', name: 'the other hydrogen of H2', pad: 14});
    const reactants = join(yne, {atoms: [h1, h2], bonds: [['h1', 'h2', 1]], texts: [plus(430, 190), T(560, 230, 'Pt or Pd')]});
    const alk = alkyneInternal(140, 210);
    alk.bonds = [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1]];
    const ha = sprout(alk.c1, 90, {id: 'ha', label: 'H', element: 'H', name: 'a hydrogen that added', pad: 14}, 56);
    const hb = sprout(alk.c2, 90, {id: 'hb', label: 'H', element: 'H', name: 'a hydrogen that added', pad: 14}, 56);
    const h3 = A('h3', [540, 300], {label: 'H', element: 'H', name: 'one hydrogen of the second H2', pad: 14});
    const h4 = A('h4', P(540, 300, 0, 60), {label: 'H', element: 'H', name: 'the other hydrogen of the second H2', pad: 14});
    const alkene = join(
      {atoms: [...alk.atoms, ha, hb, h3, h4], bonds: [...alk.bonds, ['c1', 'ha', 1], ['c2', 'hb', 1], ['h3', 'h4', 1]], texts: [plus(470, 280)]}
    );
    const atoms = zz([
      {id: 'cL', label: 'H₃C', name: 'a methyl carbon', pad: 22},
      {id: 'c1', name: 'a methylene carbon'},
      {id: 'c2', name: 'a methylene carbon'},
      {id: 'cR', label: 'H₃C', name: 'a methyl carbon', pad: 22}
    ], 160, 220, 25);
    const product = {atoms, bonds: [['cL', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cR', 1]]};
    mechanisms.push(mech(17,
      'The sheet uses H2 with Pt or Pd, which saturates the alkyne on the metal surface. The arrows show the syn bond change for each equivalent.',
      'The product is the alkane.',
      {reactants, alkene, product},
      [
        step('reactants', 'One pi bond takes one hydrogen and the H-H bond bonds to the other carbon. This step takes 2 arrows.', [
          leave('h1', 'c1', 'c2'),
          leave('c2', 'h1', 'h2')
        ]),
        step('alkene', 'The second equivalent does the same to the remaining pi bond. This step takes 2 arrows.', [
          leave('h3', 'c1', 'c2'),
          leave('c2', 'h3', 'h4')
        ])
      ]));
  }

  return mechanisms.map(finalize);
}
