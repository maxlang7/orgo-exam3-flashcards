// First click is where the electrons leave: a bond or an atom. Second click is the
// atom they go to. A bond click and the atom that loses that bond count as the
// same arrow. This ketone is the Nov 10, 2026 carbonyl notes (ketone + RMgBr,
// then water). The exam card writes the workup as H3O+. The notes use water.
// Acetone plus EtMgBr stands in for that generic ketone.
//
// Angles use standard position, 0° east and 90° north, with y growing downward.
// The carbonyl carbon is trigonal, 120° apart. C–Mg–Br is linear, and the
// CH2–CH3 bond sits 109.5° off that line. Water is 104.5°. A carbon drawn with
// four bonds has those bonds 90° apart.

const mechanisms = [
  {
    cardId: 41,
    source: 'Nov 10 notes: a ketone plus RMgBr, then water. ⁺MgBr is the counterion and leaves as HOMgBr. The exam sheet writes the workup as H₃O⁺.',
    doneScene: 'product',
    doneStatus: 'Every arrow matched. The alcohol is the organic product. HOMgBr is the salt.',
    scenes: {
      reactants: {
        atoms: [
          {id: 'meL', x: 119, y: 236, label: 'H₃C', element: 'C', pad: 22, name: 'left methyl carbon'},
          {id: 'cCO', x: 188, y: 196, element: 'C', pad: 5, name: 'carbonyl carbon'},
          {id: 'oCO', x: 188, y: 116, label: 'O', element: 'O', pad: 16, name: 'carbonyl oxygen'},
          {id: 'meR', x: 257, y: 236, label: 'H₃C', element: 'C', pad: 22, name: 'right methyl carbon'},
          {id: 'cAlpha', x: 508, y: 168, element: 'C', pad: 5, name: 'carbon bonded to magnesium'},
          {id: 'cBeta', x: 481, y: 243, label: 'H₃C', element: 'C', pad: 22, name: 'terminal methyl carbon of the Grignard'},
          {id: 'mg', x: 588, y: 168, label: 'Mg', element: 'Mg', pad: 18, name: 'magnesium'},
          {id: 'br', x: 668, y: 168, label: 'Br', element: 'Br', pad: 16, name: 'bromine'}
        ],
        bonds: [
          ['meL', 'cCO', 1],
          ['cCO', 'meR', 1],
          ['cCO', 'oCO', 2],
          ['cAlpha', 'cBeta', 1],
          ['cAlpha', 'mg', 1],
          ['mg', 'br', 1]
        ],
        texts: [{x: 378, y: 206, text: '+', className: 'mech-plus'}]
      },
      alkoxide: {
        atoms: [
          {id: 'meL', x: 104, y: 198, label: 'H₃C', element: 'C', pad: 22, name: 'left methyl carbon'},
          {id: 'cC', x: 190, y: 198, element: 'C', pad: 5, name: 'carbon that was the carbonyl carbon'},
          {id: 'meR', x: 190, y: 284, label: 'H₃C', element: 'C', pad: 22, name: 'lower methyl carbon'},
          {id: 'oAlk', x: 190, y: 112, label: 'O⁻', element: 'O', pad: 18, name: 'alkoxide oxygen'},
          {id: 'cAlpha', x: 276, y: 198, element: 'C', pad: 5, name: 'carbon that came from the Grignard'},
          {id: 'cBeta', x: 305, y: 279, label: 'H₃C', element: 'C', pad: 22, name: 'methyl carbon of that ethyl group'},
          {id: 'h1', x: 592, y: 126, label: 'H', element: 'H', pad: 14, name: 'a hydrogen of water'},
          {id: 'oW', x: 640, y: 188, label: 'O', element: 'O', pad: 16, name: 'water oxygen'},
          {id: 'h2', x: 592, y: 250, label: 'H', element: 'H', pad: 14, name: 'the other hydrogen of water'}
        ],
        bonds: [
          ['meL', 'cC', 1],
          ['cC', 'oAlk', 1],
          ['cC', 'cAlpha', 1],
          ['cAlpha', 'cBeta', 1],
          ['cC', 'meR', 1],
          ['h1', 'oW', 1],
          ['oW', 'h2', 1]
        ],
        texts: [{x: 460, y: 400, text: '⁺MgBr', className: 'mech-salt'}]
      },
      product: {
        atoms: [
          {id: 'meL', x: 104, y: 198, label: 'H₃C', element: 'C', pad: 22, name: 'left methyl carbon'},
          {id: 'cC', x: 190, y: 198, element: 'C', pad: 5, name: 'tertiary carbon'},
          {id: 'meR', x: 190, y: 284, label: 'H₃C', element: 'C', pad: 22, name: 'lower methyl carbon'},
          {id: 'oH', x: 190, y: 112, label: 'OH', element: 'O', pad: 20, name: 'alcohol oxygen'},
          {id: 'cAlpha', x: 276, y: 198, element: 'C', pad: 5, name: 'methylene carbon of the ethyl group'},
          {id: 'cBeta', x: 305, y: 279, label: 'H₃C', element: 'C', pad: 22, name: 'methyl carbon of the ethyl group'}
        ],
        bonds: [
          ['meL', 'cC', 1],
          ['cC', 'oH', 1],
          ['cC', 'cAlpha', 1],
          ['cAlpha', 'cBeta', 1],
          ['cC', 'meR', 1]
        ],
        texts: [{x: 460, y: 400, text: 'HOMgBr', className: 'mech-salt'}]
      }
    },
    steps: [
      {
        scene: 'reactants',
        open: 'This step takes 2 arrows.',
        choices: [
          {
            arrows: [
              {
                to: 'cCO',
                sources: [
                  {from: 'bond:cAlpha|mg', bend: 78},
                  {from: 'cAlpha', bend: 64}
                ]
              },
              {
                to: 'oCO',
                sources: [
                  {from: 'bond:cCO|oCO', bend: -42},
                  {from: 'cCO', bend: -46}
                ]
              }
            ]
          }
        ]
      },
      {
        scene: 'alkoxide',
        open: 'The alkoxide has formed. ⁺MgBr is the counterion. This step takes 2 arrows.',
        choices: [
          {
            arrows: [
              {to: 'h1', sources: [{from: 'oAlk', bend: -28}]},
              {
                to: 'oW',
                sources: [
                  {from: 'bond:h1|oW', bend: -30},
                  {from: 'h1', bend: -24}
                ]
              }
            ]
          },
          {
            arrows: [
              {to: 'h2', sources: [{from: 'oAlk', bend: 36}]},
              {
                to: 'oW',
                sources: [
                  {from: 'bond:h2|oW', bend: 30},
                  {from: 'h2', bend: 24}
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

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
  if (order !== 2) return [[x1, y1, x2, y2]];
  const ox = -uy * 3.6;
  const oy = ux * 3.6;
  return [[x1 + ox, y1 + oy, x2 + ox, y2 + oy], [x1 - ox, y1 - oy, x2 - ox, y2 - oy]];
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
  return {x: atom.x, y: atom.y, gap: atom.label ? 18 : 14};
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
  const off = 16 * Math.sign(bend || 1);
  const start = (far.pad || 8) + 16;
  const end = llen - (near.pad || 16);
  const x1 = far.x + ux * start + px * off;
  const y1 = far.y + uy * start + py * off;
  const x2 = far.x + ux * end + px * off * 0.8;
  const y2 = far.y + uy * end + py * off * 0.8;
  const cx = (x1 + x2) / 2 + px * off * 0.25;
  const cy = (y1 + y2) / 2 + py * off * 0.25;
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
  const [x1, y1] = end(a, a.gap);
  const [x2, y2] = end(b, b.gap + 2);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function mechanismInner(scene, state) {
  const arrows = state.arrows || [];
  const bonds = scene.bonds.map(([from, to, kind]) => kind === 'wedge'
    ? `<polygon class="wedge" points="${wedgePoints(scene, from, to)}"/>`
    : bondSegment(scene, from, to, kind).map(([x1, y1, x2, y2]) =>
      `<line class="bond" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`).join('')).join('');
  const hits = scene.bonds.map(([from, to]) => {
    const {a, b, len, ux, uy} = bondEnds(scene, from, to);
    const insetA = hitRadius(a) + 2;
    const insetB = hitRadius(b) + 2;
    if (len <= insetA + insetB + 8) return '';
    const id = bondId(from, to);
    const selected = state.selectedId === id ? ' is-selected' : '';
    const x1 = a.x + ux * insetA;
    const y1 = a.y + uy * insetA;
    const x2 = b.x - ux * insetB;
    const y2 = b.y - uy * insetB;
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
<marker id="arrow-good" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#285b40"/></marker>
<marker id="arrow-bad" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#9c3b3b"/></marker>
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
      if (isBondId(id)) {
        if (pending === id) {
          pending = null;
          status = placed.length ? 'Selection cleared.' : step().open;
          return {ignored: false, doneStep: false};
        }
        if (pending && !isBondId(pending)) {
          const swapped = locate(step(), id, pending);
          if (swapped && !placed.some(arrow => arrow.key === swapped.key)) {
            wrong = {from: pending, to: id, bend: 36, kind: 'bad'};
            pending = null;
            bad = true;
            status = 'Those are backwards. First click the bond or atom the electrons leave.';
            return {ignored: false, doneStep: false};
          }
        }
        pending = id;
        status = 'Now click the atom those electrons go to.';
        return {ignored: false, doneStep: false};
      }
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
          : `Step ${stepIndex + 1} of ${mech.steps.length}. Click the bond or atom the electrons leave, then the atom they go to.`
      };
    }
  };

  function finish() {
    finished = true;
    bad = false;
    status = anyPeek ? 'Correct arrows were shown before this was finished.' : mech.doneStatus;
  }
}
