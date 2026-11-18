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
      assert(!/NaN|Infinity/.test(context.mechanismInner(layout, {arrows:[]})));
    }
  }
  const attempt = context.createAttempt(mechanism);
  for (const step of mechanism.steps) {
    for (const arrow of step.choices[0].arrows) {
      attempt.click(arrow.sources[0].from);
      attempt.click(arrow.to);
      assert(!attempt.view().bad, mechanism.cardId + ' ' + step.scene);
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
