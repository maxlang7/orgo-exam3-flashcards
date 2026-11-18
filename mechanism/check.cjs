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
let scenes = 0;
for (const mechanism of catalog) {
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
    const view = attempt.view();
    assert.equal(view.arrowCount, step.choices[0].arrows.length);
    for (const compact of [false,true]) {
      const svg = context.mechanismInner(context.layoutScene(view.scene,compact),view);
      assert(!/\b(?:NaN|Infinity)\b/.test(svg));
      assert.equal((svg.match(/class="mech-arrow /g) || []).length, view.arrowCount);
    }
    attempt.check();
    assert(attempt.view().stepComplete);
    attempt.advance();
  }
  assert(attempt.view().finished);
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
edit.check();
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
