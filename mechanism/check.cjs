// Run with node mechanism/check.cjs from any directory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['layout.js','geometry.js','catalog.js','render.js','transitions.js','morph.js','../mechanisms.js']) {
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
  for (const step of mechanism.steps) {
    const count = step.choices[0].arrows.length;
    assert(step.choices.every(choice => choice.arrows.length === count),
      mechanism.cardId + ' ' + step.scene + ' choices differ in arrow count');
  }
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
        assert.equal(context.compareDrawing(choice, drawing).unmatched.length, 0, 'Existing atom endpoint must still grade correctly');
        const otherBond = scene.bonds.map(([a,b]) => context.bondId(a,b)).find(id => id !== arrow.to);
        drawn.to = otherBond;
        assert.equal(context.compareDrawing(choice, drawing).unmatched.length, 1, 'A different bond must not earn credit');
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
    assert.equal(outcome, view.arrowCount ? 'correct' : undefined);
    for (const compact of [false,true]) {
      const plan = context.makeMorphPlan(mechanism, view.stepNumber-1, compact, view.arrows);
      assert.equal(plan.mapped.size, new Set(plan.mapped.values()).size, 'Atom mappings must be one-to-one');
      for (const [from,to] of plan.mapped) {
        assert.equal(context.atomById(plan.source,from).element, context.atomById(plan.target,to).element);
      }
      for (const t of [0,.2,.48,.67,.85,1]) {
        const frame = context.morphFrame(plan,t);
        assert(!/NaN|Infinity|undefined/.test(frame.viewBox));
        assert(!/\b(?:NaN|Infinity|undefined)\b/.test(frame.markup));
        assert(frame.markup.includes('class="bond"'));
      }
      assert.equal(context.morphFrame(plan,1).viewBox,plan.target.viewBox);
    }
    assert(attempt.view().stepComplete);
    attempt.advance();
  }
  assert(attempt.view().finished);
}
// The Grignard carbon must leave Mg and become bonded to the old carbonyl carbon.
const grignard = context.mechanismFor(41);
const addition = context.makeMorphPlan(grignard,0,false,[
  {from:'bond:cAlpha|mg',to:'cCO'}, {from:'bond:cCO|oCO',to:'oCO'}
]);
assert.equal(addition.mapped.get('cCO'),'cC');
assert(addition.bonds.some(t => !t.next && t.old.includes('cAlpha') && t.old.includes('mg')));
assert(addition.bonds.some(t => !t.old && t.next.includes('cAlpha') && t.next.includes('cC')));
assert(addition.bonds.some(t => t.old?.[2] === 2 && t.next?.[2] === 1));
for (const h of ['h1','h2']) {
  const workup = context.makeMorphPlan(grignard,1,false,[{from:'oAlk',to:h}, {from:context.bondId(h,'oW'),to:'oW'}]);
  assert.equal(workup.absorbed.get(h),'oAlk');
  assert(!workup.absorbed.has(h === 'h1' ? 'h2' : 'h1'));
}
for (const [cardId, intermediate] of [[9,'alkoxide'], [32,'opened'], [33,'alkoxide'], [34,'alkoxide']]) {
  const mechanism = context.mechanismFor(cardId);
  for (const scene of [mechanism.scenes[intermediate], mechanism.scenes.product]) {
    const [left,center,right] = ['me','cM','cL'].map(id => context.atomById(scene,id));
    const cosine = ((left.x-center.x)*(right.x-center.x) + (left.y-center.y)*(right.y-center.y)) /
      (context.distance(left,center)*context.distance(right,center));
    assert(Math.abs(cosine + 0.5) < 0.01, 'Opened epoxide needs a 120-degree backbone');
    const terminalO = scene.atoms.find(atom => atom.element === 'O' && context.knownTarget(scene,context.bondId('cL',atom.id)));
    const turn = ((center.x-right.x)*(terminalO.x-right.x) + (center.y-right.y)*(terminalO.y-right.y)) /
      (context.distance(center,right)*context.distance(right,terminalO));
    assert(Math.abs(turn + 0.5) < 0.01, 'Keep the terminal CH₂ visible at a 120-degree bend');
    assert(!scene.bonds.some(([a,b,kind]) => [a,b].includes('cL') && ['dash','wedge'].includes(kind)),
      'Terminal methylene is not stereogenic');
  }
}
const esterReduction = context.mechanismFor(37);
for (const scene of Object.values(esterReduction.scenes)) {
  assert.equal(context.atomById(scene, 'rAcyl').label, 'R');
  assert.equal(context.atomById(scene, 'rAlkoxy').label, 'R′');
  assert(context.knownTarget(scene, 'bond:oR|rAlkoxy'));
}
for (const key of ['both', 'afterOne', 'product']) {
  const scene = esterReduction.scenes[key];
  assert.equal(context.atomById(scene, 'cCO').label, 'CH₂');
  assert(context.knownTarget(scene, 'bond:cCO|rAcyl') && context.knownTarget(scene, 'bond:cCO|oAlk'));
  assert.equal(context.atomById(scene, 'oAlk').label, key === 'both' ? 'O⁻' : 'OH');
  assert.equal(context.atomById(scene, 'oR').label, key === 'product' ? 'OH' : 'O⁻');
}
{
  const scene = esterReduction.scenes.afterAlkoxy;
  assert.equal(context.atomById(scene, 'cCO').label, 'CH₂');
  assert.equal(context.atomById(scene, 'oAlk').label, 'O⁻');
  assert.equal(context.atomById(scene, 'oR').label, 'OH');
}
for (const hydrogen of ['h1', 'h2']) {
  const attempt = context.createAttempt(esterReduction);
  for (let i = 0; i < 3; i++) { attempt.reveal(); attempt.advance(); }
  attempt.click('oR');
  attempt.click(hydrogen);
  attempt.click(context.bondId(hydrogen, 'oW'));
  attempt.click('oW');
  assert.equal(attempt.check(), 'correct', 'Either ester alkoxide can be protonated first');
  const plan = context.makeMorphPlan(esterReduction, 3, false, attempt.view().arrows, {
    scene: attempt.view().sceneKey, next: attempt.view().nextSceneKey
  });
  assert.equal(plan.absorbed.get(hydrogen), 'oR');
  assert.equal(plan.mapped.size, new Set(plan.mapped.values()).size);
  attempt.advance();
  assert.equal(attempt.view().sceneKey, 'afterAlkoxy');
  assert.equal(context.atomById(attempt.view().scene, 'oR').label, 'OH');
  assert.equal(context.atomById(attempt.view().scene, 'oAlk').label, 'O⁻');
  const other = hydrogen === 'h1' ? 'h2' : 'h1';
  attempt.click('oAlk');
  attempt.click(other);
  attempt.click(context.bondId(other, 'oW'));
  attempt.click('oW');
  assert.equal(attempt.check(), 'correct', 'The remaining ester alkoxide is protonated second');
  const finish = context.makeMorphPlan(esterReduction, 4, false, attempt.view().arrows, {
    scene: attempt.view().sceneKey, next: attempt.view().nextSceneKey
  });
  assert.equal(finish.absorbed.get(other), 'oAlk');
  attempt.advance();
  assert(attempt.view().finished);
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
for (const carbon of ['r0', 'r1']) {
  const attempt = context.createAttempt(context.mechanismFor(5));
  attempt.reveal();
  attempt.advance();
  attempt.click('brB');
  attempt.click(carbon);
  attempt.click(context.bondId(carbon, 'brA'));
  attempt.click('brA');
  assert.equal(attempt.check(), 'correct', 'Either bromonium carbon can be attacked');
  const plan = context.makeMorphPlan(context.mechanismFor(5), 1, false, attempt.view().arrows);
  assert.equal(plan.mapped.size, new Set(plan.mapped.values()).size);
  assert.equal(plan.mapped.get('brB'), carbon === 'r0' ? 'brW' : 'brD');
  assert.equal(plan.mapped.get('brA'), carbon === 'r0' ? 'brD' : 'brW');
}
for (const [stepIndex, carbon, bromide, bridge, incomingDest, bridgeDest] of [
  [1, 'c1', 'brB', 'brA', 'br1', 'br2'],
  [1, 'c2', 'brB', 'brA', 'br2', 'br1'],
  [3, 'c1', 'brD', 'brC', 'b2', 'b3'],
  [3, 'c2', 'brD', 'brC', 'b4', 'b1']
]) {
  const attempt = context.createAttempt(context.mechanismFor(15));
  for (let i = 0; i < stepIndex; i++) { attempt.reveal(); attempt.advance(); }
  attempt.click(bromide);
  attempt.click(carbon);
  attempt.click(context.bondId(carbon, bridge));
  attempt.click(bridge);
  assert.equal(attempt.check(), 'correct', 'Either 2-butyne bromonium carbon can be attacked');
  const plan = context.makeMorphPlan(context.mechanismFor(15), stepIndex, false, attempt.view().arrows);
  assert.equal(plan.mapped.size, new Set(plan.mapped.values()).size);
  assert.equal(plan.mapped.get(bromide), incomingDest);
  assert.equal(plan.mapped.get(bridge), bridgeDest);
}

function acceptChoice(cardId, stepIndex, choiceIndex, expected = []) {
  const mechanism = context.mechanismFor(cardId);
  const attempt = context.createAttempt(mechanism);
  for (let i = 0; i < stepIndex; i++) { attempt.reveal(); attempt.advance(); }
  for (const arrow of mechanism.steps[stepIndex].choices[choiceIndex].arrows) {
    attempt.click(arrow.sources[0].from);
    attempt.click(arrow.to);
  }
  assert.equal(attempt.check(), 'correct', `Card ${cardId} step ${stepIndex} choice ${choiceIndex}`);
  const plan = context.makeMorphPlan(mechanism, stepIndex, false, attempt.view().arrows);
  assert.equal(plan.mapped.size, new Set(plan.mapped.values()).size,
    `Card ${cardId} step ${stepIndex} choice ${choiceIndex} morph`);
  for (const [from, to] of plan.mapped) {
    assert.equal(context.atomById(plan.source, from).element, context.atomById(plan.target, to).element);
  }
  for (const [from, to] of expected) assert.equal(plan.mapped.get(from), to, `${from} to ${to}`);
  return plan;
}
for (const [cardId, stepIndex, count] of [
  [5, 0, 2], [6, 0, 2], [15, 0, 2], [15, 2, 2],
  [7, 0, 2], [9, 0, 2], [10, 0, 2], [11, 1, 2],
  [2, 0, 4], [3, 0, 3], [11, 0, 3], [22, 0, 3]
]) {
  const step = context.mechanismFor(cardId).steps[stepIndex];
  assert.equal(step.choices.length, count, `Card ${cardId} step ${stepIndex} choice count`);
  for (let i = 0; i < count; i++) acceptChoice(cardId, stepIndex, i);
}
const hydroH = acceptChoice(3, 0, 1, [['hB2', 'hAdd']]);
assert.equal(hydroH.mapped.get('hB'), undefined);
assert.equal(hydroH.mapped.get('hB3'), undefined);
acceptChoice(3, 0, 0, [['hB', 'hAdd']]);
acceptChoice(3, 0, 2, [['hB3', 'hAdd']]);
for (const choice of context.mechanismFor(3).steps[0].choices) {
  assert(choice.arrows.some(arrow => arrow.to === 'bN' && arrow.sources[0].from === context.bondId('c2', 'c3')));
  assert(choice.arrows.some(arrow => arrow.to === 'c2'));
  assert(!choice.arrows.some(arrow => arrow.to === 'c3'));
}
const br2Leaves = acceptChoice(22, 0, 1, [['br2', 'br3']]);
assert.equal(br2Leaves.mapped.get('br1'), undefined);
assert.equal(br2Leaves.mapped.get('br3'), undefined);
const br1Leaves = acceptChoice(22, 0, 2, [['br1', 'br3']]);
assert.equal(br1Leaves.mapped.get('br3'), undefined);
const cl3Leaves = acceptChoice(11, 0, 0);
assert.equal(cl3Leaves.mapped.get('cl1'), 'cl1');
assert.equal(cl3Leaves.mapped.get('cl2'), 'cl2');
assert.equal(cl3Leaves.mapped.get('cl3'), undefined);
const cl2Leaves = acceptChoice(11, 0, 1, [['cl3', 'cl2']]);
assert.equal(cl2Leaves.mapped.get('cl1'), 'cl1');
assert.equal(cl2Leaves.mapped.get('cl2'), undefined);
const cl1Leaves = acceptChoice(11, 0, 2, [['cl3', 'cl1']]);
assert.equal(cl1Leaves.mapped.get('cl2'), 'cl2');
assert.equal(cl1Leaves.mapped.get('cl1'), undefined);
for (const [cardId, stepIndex] of [[1, 0], [1, 1], [4, 0], [4, 1], [6, 1], [2, 1], [9, 1]]) {
  assert.equal(context.mechanismFor(cardId).steps[stepIndex].choices.length, 1,
    `Card ${cardId} step ${stepIndex} stays one answer`);
}
assert(context.mechanismFor(16).steps.every(step => step.choices.length === 1));
{
  const wrongBorane = context.createAttempt(context.mechanismFor(3));
  wrongBorane.click(context.bondId('c2', 'c3'));
  wrongBorane.click('bN');
  wrongBorane.click(context.bondId('hB', 'bN'));
  wrongBorane.click('c3');
  assert.equal(wrongBorane.check(), 'incorrect');
}
{
  const halohydrin = context.createAttempt(context.mechanismFor(6));
  halohydrin.reveal();
  halohydrin.advance();
  halohydrin.click('oW');
  halohydrin.click('c3');
  halohydrin.click(context.bondId('c3', 'brA'));
  halohydrin.click('brA');
  assert.equal(halohydrin.check(), 'incorrect');
}
{
  const mercury = context.createAttempt(context.mechanismFor(2));
  mercury.reveal();
  mercury.advance();
  mercury.click('oW');
  mercury.click('c3');
  mercury.click(context.bondId('c3', 'hg'));
  mercury.click('hg');
  assert.equal(mercury.check(), 'incorrect');
}
{
  const epoxide = context.createAttempt(context.mechanismFor(9));
  epoxide.reveal();
  epoxide.advance();
  epoxide.click('oHO');
  epoxide.click('cM');
  epoxide.click(context.bondId('cM', 'oE'));
  epoxide.click('oE');
  assert.equal(epoxide.check(), 'incorrect');
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

// The hint follows the submitted arrow even if its destination and the other arrow are correct.
for (const [cardId, stepIndex, carbon, magnesium] of [
  [39, 0, 'cAlpha', 'mg'], [40, 0, 'cAlpha', 'mg'], [41, 0, 'cAlpha', 'mg'],
  [42, 0, 'cAlpha', 'mg'], [42, 2, 'cA2', 'mg2']
]) {
  const attempt = context.createAttempt(context.mechanismFor(cardId));
  for (let i = 0; i < stepIndex; i++) { attempt.reveal(); attempt.advance(); }
  attempt.click('bond:cCO|oCO'); attempt.click('oCO');
  attempt.check();
  assert.match(attempt.view().status, /one more arrow/);
  assert.equal(attempt.view().mistakeIndex, undefined);
  attempt.click(carbon); attempt.click('cCO');
  assert.equal(attempt.view().status, '');
  assert.equal(attempt.check(), 'incorrect');
  assert.match(attempt.view().status, /Arrow 2.*C–Mg bond supplies the electron pair/);
  assert.equal(attempt.view().mistakeIndex, 1);
  attempt.undo();
  assert.equal(attempt.view().status, '');
  attempt.click(context.bondId(carbon, magnesium)); attempt.click('cCO');
  assert.equal(attempt.check(), 'correct');
}
for (const [drawing, message] of [
  [[['cCO','oCO']], /π bond/],
  [[['cCO','bond:cAlpha|mg']], /backward/],
  [[['bond:cAlpha|mg','oCO']], /starts in the right place/],
  [[['bond:cCO|oCO','oCO'], ['bond:cCO|oCO','oCO']], /repeats an earlier arrow/],
]) {
  const attempt = context.createAttempt(context.mechanismFor(41));
  for (const [from,to] of drawing) { attempt.click(from); attempt.click(to); }
  assert.equal(attempt.check(), 'incorrect');
  assert.match(attempt.view().status, message);
  attempt.reveal();
  assert.equal(attempt.view().mistakeIndex, undefined);
}
