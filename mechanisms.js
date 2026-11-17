// Click rule, used for every arrow: the first atom is where the electrons leave,
// and the second is where they go. A bond-to-atom arrow starts at the atom that
// loses the bond. This ketone is the Nov 10, 2026 carbonyl notes (ketone + RMgBr,
// then water). The exam card writes the workup as H3O+; the notes use water.
// Acetone plus EtMgBr stands in for that generic ketone so the carbon bonded to
// magnesium is a different atom from the end of the chain.

const mechanisms = [
  {
    cardId: 41,
    source: 'Nov 10 notes: a ketone plus RMgBr, then water. Organolithium adds the same way. The exam sheet writes the workup as H₃O⁺.',
    doneScene: 'product',
    scenes: {
      reactants: {
        atoms: [
          {id: 'meL', x: 64, y: 214, label: 'H₃C', pad: 24, name: 'left methyl carbon'},
          {id: 'cCO', x: 168, y: 214, pad: 0, name: 'carbonyl carbon'},
          {id: 'oCO', x: 168, y: 128, label: 'O', pad: 16, name: 'carbonyl oxygen'},
          {id: 'meR', x: 252, y: 292, label: 'H₃C', pad: 24, name: 'right methyl carbon'},
          {id: 'cAlpha', x: 468, y: 150, pad: 0, name: 'carbon bonded to magnesium'},
          {id: 'cBeta', x: 548, y: 84, pad: 0, name: 'terminal methyl carbon of the Grignard'},
          {id: 'mg', x: 560, y: 222, label: 'Mg', pad: 18, name: 'magnesium'},
          {id: 'br', x: 656, y: 222, label: 'Br', pad: 16, name: 'bromine'}
        ],
        bonds: [
          ['meL', 'cCO', 1],
          ['cCO', 'meR', 1],
          ['cCO', 'oCO', 2],
          ['cAlpha', 'cBeta', 1],
          ['cAlpha', 'mg', 1],
          ['mg', 'br', 1]
        ],
        texts: [{x: 390, y: 268, text: '+', className: 'mech-plus'}]
      },
      alkoxide: {
        atoms: [
          {id: 'meL', x: 78, y: 156, label: 'H₃C', pad: 24, name: 'left methyl carbon'},
          {id: 'cC', x: 196, y: 156, pad: 0, name: 'carbon that was the carbonyl carbon'},
          {id: 'meR', x: 286, y: 236, label: 'H₃C', pad: 24, name: 'right methyl carbon'},
          {id: 'oAlk', x: 196, y: 70, label: 'O⁻', pad: 18, name: 'alkoxide oxygen'},
          {id: 'cAlpha', x: 196, y: 248, pad: 0, name: 'carbon that came from the Grignard'},
          {id: 'cBeta', x: 278, y: 312, pad: 0, name: 'methyl carbon of that ethyl group'},
          {id: 'h1', x: 520, y: 78, label: 'H', pad: 12, name: 'a hydrogen of water'},
          {id: 'oW', x: 590, y: 140, label: 'O', pad: 14, name: 'water oxygen'},
          {id: 'h2', x: 520, y: 202, label: 'H', pad: 12, name: 'the other hydrogen of water'}
        ],
        bonds: [
          ['meL', 'cC', 1],
          ['cC', 'meR', 1],
          ['cC', 'oAlk', 1],
          ['cC', 'cAlpha', 1],
          ['cAlpha', 'cBeta', 1],
          ['h1', 'oW', 1],
          ['oW', 'h2', 1]
        ],
        texts: [{x: 450, y: 286, text: '⁺MgBr', className: 'mech-salt'}]
      },
      product: {
        atoms: [
          {id: 'meL', x: 78, y: 156, label: 'H₃C', pad: 24, name: 'left methyl carbon'},
          {id: 'cC', x: 196, y: 156, pad: 0, name: 'tertiary carbon'},
          {id: 'meR', x: 286, y: 236, label: 'H₃C', pad: 24, name: 'right methyl carbon'},
          {id: 'oH', x: 196, y: 70, label: 'OH', pad: 18, name: 'alcohol oxygen'},
          {id: 'cAlpha', x: 196, y: 248, pad: 0, name: 'methylene carbon of the ethyl group'},
          {id: 'cBeta', x: 278, y: 312, pad: 0, name: 'methyl carbon of the ethyl group'}
        ],
        bonds: [
          ['meL', 'cC', 1],
          ['cC', 'meR', 1],
          ['cC', 'oH', 1],
          ['cC', 'cAlpha', 1],
          ['cAlpha', 'cBeta', 1]
        ],
        texts: []
      }
    },
    steps: [
      {
        scene: 'reactants',
        open: 'This step takes 2 arrows.',
        choices: [
          {
            arrows: [
              {from: 'cAlpha', to: 'cCO', bend: 22},
              {from: 'cCO', to: 'oCO', bend: 32}
            ]
          }
        ]
      },
      {
        scene: 'alkoxide',
        open: 'The alkoxide has formed. This step takes 2 arrows.',
        choices: [
          {
            arrows: [
              {from: 'oAlk', to: 'h1', bend: -42},
              {from: 'h1', to: 'oW', bend: 26}
            ]
          },
          {
            arrows: [
              {from: 'oAlk', to: 'h2', bend: 42},
              {from: 'h2', to: 'oW', bend: -26}
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

function bondSegment(scene, fromId, toId, order) {
  const a = atomById(scene, fromId);
  const b = atomById(scene, toId);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const x1 = a.x + dx / len * (a.pad || 0);
  const y1 = a.y + dy / len * (a.pad || 0);
  const x2 = b.x - dx / len * (b.pad || 0);
  const y2 = b.y - dy / len * (b.pad || 0);
  if (order === 1) return [[x1, y1, x2, y2]];
  const ox = -dy / len * 3.5;
  const oy = dx / len * 3.5;
  return [[x1 + ox, y1 + oy, x2 + ox, y2 + oy], [x1 - ox, y1 - oy, x2 - ox, y2 - oy]];
}

function arrowPath(scene, fromId, toId, bend) {
  const a = atomById(scene, fromId);
  const b = atomById(scene, toId);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const cx = mx + -dy / len * bend;
  const cy = my + dx / len * bend;
  const end = (atom, gap) => {
    const vx = cx - atom.x;
    const vy = cy - atom.y;
    const vlen = Math.hypot(vx, vy) || 1;
    return [atom.x + vx / vlen * gap, atom.y + vy / vlen * gap];
  };
  const [x1, y1] = end(a, 16);
  const [x2, y2] = end(b, 18);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function mechanismInner(scene, state) {
  const arrows = state.arrows || [];
  const bonds = scene.bonds.map(([from, to, order]) => bondSegment(scene, from, to, order).map(([x1, y1, x2, y2]) =>
    `<line class="bond" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`).join('')).join('');
  const notes = (scene.texts || []).map(item =>
    `<text class="${item.className}" x="${item.x}" y="${item.y}" text-anchor="middle">${escapeXml(item.text)}</text>`).join('');
  const paths = arrows.map(arrow => {
    const kind = arrow.kind === 'bad' ? 'bad' : 'good';
    return `<path class="mech-arrow is-${kind}" d="${arrowPath(scene, arrow.from, arrow.to, arrow.bend)}" marker-end="url(#arrow-${kind})"/>`;
  }).join('');
  const atoms = scene.atoms.map(atom => {
    const selected = state.selectedId === atom.id ? ' is-selected' : '';
    const body = atom.label
      ? `<text class="atom-label" x="${atom.x}" y="${atom.y}" text-anchor="middle" dy="0.35em">${escapeXml(atom.label)}</text>`
      : `<circle class="atom-dot" cx="${atom.x}" cy="${atom.y}" r="3.5"/>`;
    return `<g class="atom${selected}" data-id="${atom.id}" tabindex="${state.locked ? -1 : 0}" role="button" aria-label="${escapeXml(atom.name)}"><circle class="atom-ring" cx="${atom.x}" cy="${atom.y}" r="16"/>${body}<circle class="atom-hit" cx="${atom.x}" cy="${atom.y}" r="26"/></g>`;
  }).join('');
  return `<defs>
<style>
.bond{stroke:#25362f;stroke-width:2.05;stroke-linecap:round}
.atom-label{font-family:system-ui,sans-serif;font-size:18px;font-weight:600;fill:#25362f;stroke:#fff;stroke-width:6px;paint-order:stroke fill}
.atom-dot{fill:#25362f}
.atom-hit{fill:transparent}
.atom-ring{fill:none;stroke:transparent;stroke-width:2}
.atom.is-selected .atom-ring{stroke:#285b40}
.mech-arrow{fill:none;stroke-width:2.4;stroke-linecap:round}
.mech-arrow.is-good{stroke:#285b40}
.mech-arrow.is-bad{stroke:#9c3b3b}
.mech-plus{font-family:system-ui,sans-serif;font-size:26px;fill:#65776c}
.mech-salt{font-family:system-ui,sans-serif;font-size:14px;font-weight:600;fill:#65776c}
</style>
<marker id="arrow-good" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#285b40"/></marker>
<marker id="arrow-bad" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#9c3b3b"/></marker>
</defs><g class="${state.locked ? 'is-locked' : ''}">${bonds}${notes}${paths}${atoms}</g>`;
}

function renderMechanism(svg, view) {
  svg.setAttribute('viewBox', '0 0 760 360');
  svg.innerHTML = mechanismInner(view.scene, view);
}

function arrowKey(arrow) {
  return `${arrow.from}>${arrow.to}`;
}

function viableChoices(step, placed) {
  const used = placed.map(arrowKey);
  const alive = [];
  step.choices.forEach((choice, index) => {
    const pool = choice.arrows.map(arrowKey);
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

function judgeArrow(step, placed, from, to) {
  const next = placed.concat([{from, to}]);
  const alive = viableChoices(step, next);
  if (!alive.length) {
    const backwards = viableChoices(step, placed).some(index => step.choices[index].arrows.some(arrow =>
      arrow.from === to && arrow.to === from && !placed.some(item => item.from === arrow.from && item.to === arrow.to)));
    return {ok: false, backwards};
  }
  const bend = step.choices[alive[0]].arrows.find(arrow => arrow.from === from && arrow.to === to).bend;
  const done = alive.every(index => step.choices[index].arrows.length === next.length);
  return {ok: true, bend, done};
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
    return spec.filter(arrow => !placed.some(item => item.from === arrow.from && item.to === arrow.to))
      .map(arrow => ({from: arrow.from, to: arrow.to, bend: arrow.bend, kind: 'good'}));
  }

  return {
    click(id) {
      if (finished || peeked || stepComplete) return {ignored: true, doneStep: false};
      if (!atomById(scene(), id)) return {ignored: true, doneStep: false};
      wrong = null;
      if (!pending) {
        pending = id;
        bad = false;
        status = 'Now click the atom those electrons go to.';
        return {ignored: false, doneStep: false};
      }
      if (pending === id) {
        pending = null;
        bad = false;
        status = step().open;
        return {ignored: false, doneStep: false};
      }
      const from = pending;
      pending = null;
      const verdict = judgeArrow(step(), placed, from, id);
      if (!verdict.ok) {
        wrong = {from, to: id, bend: 42, kind: 'bad'};
        bad = true;
        status = verdict.backwards
          ? 'Those atoms are backwards. The first click is where the electrons leave.'
          : 'That pair does not match this step.';
        return {ignored: false, doneStep: false};
      }
      placed.push({from, to: id, bend: verdict.bend, kind: 'good'});
      bad = false;
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
          : `Step ${stepIndex + 1} of ${mech.steps.length}. Click the atom the electrons leave, then the atom they go to.`
      };
    }
  };

  function finish() {
    finished = true;
    bad = false;
    status = anyPeek ? 'Correct arrows were shown before this was finished.' : 'Every arrow matched.';
  }
}
