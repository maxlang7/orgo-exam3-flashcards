// Run with node mechanism/check.cjs from any directory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['layout.js','geometry.js','catalog.js','render.js','../mechanisms.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context);
}
const catalog = vm.runInContext('mechanisms', context);
// Exercise the same reaction overview rendered before the first practice step.
for (const file of ['../deck.js', '../reagent-routes.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context);
}
const cards = vm.runInContext('deck', context);
const routes = vm.runInContext('reagentRoutes', context);
let scenes = 0;
for (const mechanism of catalog) {
  assert(mechanism.steps.every(step => step.title?.trim()), 'Each stage needs a visible name');
  const conditions = mechanism.overview.conditions ?? routes.get(mechanism.cardId)[0];
  assert(cards.some(card => card.id === mechanism.cardId) && conditions[0]);
  const fragments = [];
  context.appendMechanismStructures({append: node => fragments.push(node)}, () => ({}),
    mechanism, [[8, 140], [425, 167]], 132);
  assert.equal(fragments.length, 2);
  for (const node of fragments) {
    assert(node.innerHTML.includes('class="molecule"'));
    assert(!/data-id=|class="mech-arrow|tabindex=|\b(?:NaN|Infinity)\b/.test(node.innerHTML));
  }
  for (const scene of Object.values(mechanism.scenes)) {
    scenes++;
    assert(!scene.texts, 'Free-positioned text in a chemistry scene');
    for (const group of context.moleculeGroups(scene)) {
      if (group.length === 1) assert(![undefined, 'C', 'O', 'N', 'O⁻'].includes(group[0].label), 'Incomplete detached species');
    }
    for (const annotation of scene.annotations || []) {
      if (annotation.atomId) assert(scene.atoms.some(atom => atom.id === annotation.atomId));
      else assert(annotation.formula && !/^[A-Z][a-z]?$/.test(annotation.formula));
    }
    for (const compact of [true,false]) {
      const layout = context.layoutScene(scene, compact);
      const captions = layout.texts.filter(mark => mark.className === 'mech-caption');
      for (const atom of scene.atoms.filter(a => a.shorthand)) {
        const component = context.moleculeGroups(layout).find(group => group.some(a => a.id === atom.id));
        const caption = captions.find(mark => mark.text === atom.shorthand);
        assert(caption && component.every(a => a.y < caption.y), 'Caption must be below its molecule');
      }
      for (const atom of layout.atoms) {
        // Only apply valence rules to unambiguous closed-shell representations.
        // Count hydrogens and substituents written as part of a condensed label.
        const label = atom.label.replace(/[⁺⁻]/g, '');
        const internalBonds = {O:0, OH:1, 'H₂O':2, OMe:1, OAc:1, AcO:1, tBuO:1,
          N:0, NH:1, B:0, 'BH₂':2, 'BH₃':3, 'BF₃':3, 'AlH₃':3, Cl:0, Br:0, F:0};
        if (!(label in internalBonds)) continue;
        const valence = layout.bonds.reduce((sum, [a,b,order]) =>
          sum + (a === atom.id || b === atom.id ? Number(order) || 1 : 0), internalBonds[label]);
        const neutralValence = {O:2, N:3, B:3, Al:3, Cl:1, Br:1, F:1}[atom.element];
        const expected = ['B','Al'].includes(atom.element) ? 3 - valence : valence - neutralValence;
        const charge = atom.label.endsWith('⁺') ? 1 : atom.label.endsWith('⁻') ? -1 : 0;
        assert.equal(charge, expected, `Card ${mechanism.cardId}: ${atom.name}`);
      }
      assert(!/\b(?:NaN|Infinity)\b/.test(context.mechanismInner(layout, {arrows:[]})));
    }
  }
  const attempt = context.createAttempt(mechanism);
  for (const step of mechanism.steps) {
    for (const arrow of step.choices[0].arrows) {
      attempt.click(arrow.sources[0].from);
      attempt.click(arrow.to);
      assert(!attempt.view().bad, mechanism.cardId + ' ' + step.scene);
    }
    for (const choice of step.choices) {
      for (const arrow of choice.arrows.filter(arrow => context.isBondId(arrow.to))) {
        const scene = mechanism.scenes[step.scene];
        assert(context.knownTarget(scene, arrow.to));
        const drawing = choice.arrows.map(a => ({from: a.sources[0].from, to: a.to}));
        const drawn = drawing[choice.arrows.indexOf(arrow)];
        for (const compact of [true, false]) {
          const layout = context.layoutScene(scene, compact);
          const curve = context.curvedArrow(layout, drawn.from, drawn.to, []);
          const [a,b] = context.bondAtoms(drawn.to);
          const [[x1,y1,x2,y2]] = context.bondSegment(layout, a, b, 1);
          const midpoint = {x:(x1+x2)/2, y:(y1+y2)/2};
          assert(context.distance(curve[3], midpoint) < 0.01);
        }
        drawn.to = arrow.atomTarget;
        assert(context.matchesDrawing(choice, drawing), 'Existing atom endpoint must still grade correctly');
        const otherBond = scene.bonds.map(([a,b]) => context.bondId(a,b)).find(id => id !== arrow.to);
        drawn.to = otherBond;
        assert(!context.matchesDrawing(choice, drawing), 'A different bond must not earn credit');
      }
    }
    const view = attempt.view();
    assert.equal(view.arrowCount, step.choices[0].arrows.length);
    for (const compact of [false,true]) {
      const svg = context.mechanismInner(context.layoutScene(view.scene,compact),view);
      assert(!/\b(?:NaN|Infinity)\b/.test(svg));
      assert.equal((svg.match(/class="mech-arrow /g) || []).length, view.arrowCount);
    }
    const outcome = attempt.check();
    if (view.arrowCount) {
      assert.equal(outcome, 'correct');
      const layout = context.layoutScene(view.scene, false);
      const animated = context.mechanismInner(layout, {...attempt.view(), motion:outcome});
      assert(animated.includes('<animateTransform'));
      assert.equal((animated.match(/<animate attributeName="d"/g) || []).length, view.arrowCount);
      assert(!/\b(?:NaN|Infinity)\b/.test(animated));
    } else assert.equal(outcome, undefined);
    assert(attempt.view().stepComplete);
    attempt.advance();
  }
  assert(attempt.view().finished);
}
for (const [cardId, intermediate] of [[32,'opened'], [33,'alkoxide'], [34,'alkoxide']]) {
  const mechanism = context.mechanismFor(cardId);
  for (const scene of [mechanism.scenes[intermediate], mechanism.scenes.product]) {
    const [left,center,right] = ['me','cM','cL'].map(id => context.atomById(scene,id));
    const cosine = ((left.x-center.x)*(right.x-center.x) + (left.y-center.y)*(right.y-center.y)) /
      (context.distance(left,center)*context.distance(right,center));
    assert(Math.abs(cosine + 0.5) < 0.01, 'Opened epoxide needs a 120-degree backbone');
    assert(!scene.bonds.some(([a,b,kind]) => [a,b].includes('cL') && ['dash','wedge'].includes(kind)),
      'Terminal methylene is not stereogenic');
  }
}
for (const [id, scene] of [[37,'tetra'], [42,'tetra'], [43,'mono']]) {
  const step = context.mechanismFor(id).steps.find(s => s.scene === scene);
  assert(step.choices[0].arrows.some(a => a.to === 'bond:cC|oAlk' && a.sources[0].from === 'oAlk'));
}
for (const bonded of ['cl1', 'cl2']) {
  for (const destination of ['cl1', 'cl2']) {
    const attempt = context.createAttempt(context.mechanismFor(21));
    attempt.click('bond:' + bonded + '|sC');
    attempt.click(destination);
    attempt.click('oH');
    attempt.click('sC');
    assert.equal(attempt.check(), bonded === destination ? 'correct' : 'incorrect');
  }
}
const osmium = context.mechanismFor(8);
for (const [key,orders] of [['reactants','2222'],['osmate','1122']]) {
  const scene = osmium.scenes[key];
  const ligands = scene.bonds.filter(([a,b]) => a === 'os' || b === 'os');
  assert.equal(ligands.map(b => b[2]).sort().join(''), orders);
  assert.equal(new Set(ligands.map(([a,b]) => a === 'os' ? b : a)).size, 4);
}
console.log('Validated', scenes, 'scenes and', catalog.length, 'mechanism walkthroughs.');

const edit = context.createAttempt(context.mechanismFor(41));
edit.click('bond:cAlpha|mg'); edit.click('cCO');
edit.click('cCO'); edit.click('oCO');
assert.equal(edit.view().status, '');
assert.equal(edit.check(), 'incorrect');
assert(edit.view().bad);
assert.equal(edit.view().arrows.length, 2);
edit.click('oCO'); edit.undo();
assert.equal(edit.view().arrows.length, 2);
edit.undo();
assert.equal(edit.view().arrows[0].from, 'bond:cAlpha|mg');
edit.click('bond:cCO|oCO'); edit.click('oCO');
assert(!edit.view().locked);
edit.check();
assert(edit.view().stepComplete);
