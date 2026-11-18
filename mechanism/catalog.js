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
    if (opts.shorthand) atom.shorthand = opts.shorthand;
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
  function charge(atom, symbol) { return {atomId: atom.id, symbol}; }
  function companion(formula) { return {formula}; }
  function join(...parts) {
    const atoms = [], bonds = [], annotations = [];
    for (const p of parts) {
      if (!p) continue;
      if (p.atoms) atoms.push(...p.atoms);
      if (p.bonds) bonds.push(...p.bonds);
      if (p.annotations) annotations.push(...p.annotations);
    }
    return {atoms, bonds, annotations};
  }
  function leave(to, a, b) {
    return {to, sources: [{from: bondId(a, b)}]};
  }
  function lone(to, from) { return {to, sources: [{from}]}; }
  // The bond midpoint is the conventional arrowhead for a new π bond.
  // Keep the previously accepted atom endpoint for the same electron movement.
  function formPiBond(a, b, from = a) {
    return {to: bondId(a, b), atomTarget: b, sources: [{from}]};
  }
  function step(scene, title, choices) {
    const list = choices[0] && choices[0].arrows ? choices : [{arrows: choices}];
    return {scene, title, choices: list};
  }
  function protonate(oId) {
    return [
      {arrows: [lone('h1', oId), leave('oW', 'h1', 'oW')]},
      {arrows: [lone('h2', oId), leave('oW', 'h2', 'oW')]}
    ];
  }
  function mech(cardId, source, doneStatus, scenes, steps, overview = {}) {
    return {cardId, source, doneStatus, doneScene: 'product', scenes, steps, overview};
  }
  function pyridine(nitrogenId, x, y, nitrogenOnRight = false) {
    const radius = 48;
    const centerX = x + (nitrogenOnRight ? -radius : radius);
    const atoms = [A(nitrogenId, [x, y], {shorthand: 'Py', element: 'N', label: 'N', name: 'pyridine nitrogen'})];
    for (let i = 1; i < 6; i++) {
      const angle = (nitrogenOnRight ? 0 : 180) - i * 60;
      atoms.push(A(`pyC${i}`, P(centerX, y, angle, radius), {name: 'pyridine ring carbon'}));
    }
    const bonds = atoms.map((atom, i) => [atom.id, atoms[(i + 1) % 6].id, i % 2 === 0 ? 2 : 1]);
    return {atoms, bonds};
  }
  function imidazole(x, y) {
    const atoms = [
      A('nIm', [x,y], {label:'N', element:'N', shorthand:'ImH', name:'basic imidazole nitrogen'}),
      A('imC2', P(x+40,y,108,40), {name:'imidazole carbon'}),
      A('imNH', P(x+40,y,36,40), {label:'NH', element:'N', name:'imidazole NH'}),
      A('imC4', P(x+40,y,-36,40), {name:'imidazole carbon'}),
      A('imC5', P(x+40,y,-108,40), {name:'imidazole carbon'})
    ];
    const bonds = atoms.map((a,i) => [a.id, atoms[(i+1)%5].id, i === 0 || i === 3 ? 2 : 1]);
    return {atoms, bonds};
  }
  // The ipso carbon is the rightmost vertex, facing the reagent's reactive group.
  function substitutedPhenyl(ipso, position, substituent) {
    const radius = 44;
    const cx = ipso.x - radius;
    const atoms = [ipso];
    for (let i = 1; i < 6; i++) {
      atoms.push(A(`${ipso.id}-${i}`, P(cx, ipso.y, -60*i, radius), {name: 'aryl carbon'}));
    }
    const bonds = atoms.map((a,i) => [a.id, atoms[(i+1)%6].id, i%2 === 0 ? 2 : 1]);
    const branch = sprout(atoms[position], -60*position, substituent, 48);
    return {atoms:[...atoms, branch], bonds:[...bonds, [atoms[position].id, branch.id, 1]]};
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
    return {atoms: [h, o, h2, h3], bonds: [['hA', 'oA', 1], ['oA', 'hA2', 1], ['oA', 'hA3', 1]], annotations: [charge(o, '⁺')]};
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
    const mg = A('mg', P(x, y, 0, 76), {shorthand: 'EtMgBr', label: 'Mg', element: 'Mg', name: 'magnesium', pad: 18});
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
    const side = (mx-cx)*(b.y-a.y) - (my-cy)*(b.x-a.x) >= 0 ? 1 : -1;
    const dx = side * (b.y-a.y);
    const dy = side * (a.x-b.x);
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
  function openedEpoxide(middleOxygen, terminalOxygen, stereo, orientation = stereo === 'wedge' ? 'up' : 'down') {
    const side = orientation === 'up' ? 1 : -1;
    const middle = A('cM', [200, 240], {name:'the more substituted carbon'});
    const methyl = sprout(middle, 180 + side*30, {id:'me', name:'methyl carbon'});
    const end = sprout(middle, -side*30, {id:'cL', name:'the less substituted carbon'});
    const oM = sprout(middle, side*90, middleOxygen, 66);
    const oL = sprout(end, side*30, terminalOxygen, 66);
    const atoms = [methyl, middle, end, oM, oL];
    const bonds = [['me','cM',1], ['cM','cL',1], ['cM',oM.id,stereo], ['cL',oL.id,1]];
    // The methoxy group has a second carbon, distinct from the substrate methyl.
    for (const oxygen of [oM,oL]) {
      if (oxygen.id !== 'oNu') continue;
      const methyl = sprout(oxygen, oxygen === oM ? side*30 : -side*30, {id:'nuMe', name:'methoxy methyl carbon'}, 58);
      atoms.push(methyl);
      bonds.push([oxygen.id, methyl.id, 1]);
    }
    return {atoms, bonds};
  }
  function methoxide(x, y) {
    const oxygen = A('oNu', [x,y], {label:'O⁻', element:'O', name:'methoxide oxygen'});
    const methyl = sprout(oxygen, 30, {id:'nuMe', name:'methoxy methyl carbon'}, 58);
    return {atoms:[oxygen,methyl], bonds:[['oNu','nuMe',1]]};
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
    const reactants = join(propene(120, 230), hydronium(590, 200));
    const base = chain3(150, 240);
    const hAdd = sprout(base[2], -55, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen that added', pad: 14}, 58);
    const cation = join(
      {atoms: [...base, hAdd], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'hAdd', 1]], annotations: [charge(base[1], '⁺')]},
      water(610, 230)
    );
    const ox = chain3(150, 250);
    const oAdd = sprout(ox[1], 95, {id: 'oAdd', label: 'O', element: 'O', name: 'oxonium oxygen', pad: 16}, 68);
    const hP = sprout(oAdd, 40, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on the oxonium', pad: 14}, 56);
    const hQ = sprout(oAdd, 145, {id: 'hQ', label: 'H', element: 'H', name: 'the other hydrogen on the oxonium', pad: 14}, 56);
    const oxonium = join(
      {atoms: [...ox, oAdd, hP, hQ], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAdd', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1]], annotations: [charge(oAdd, '⁺')]},
      water(630, 280, 190)
    );
    const product = ipa(190, 240, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    mechanisms.push(mech(1,
      'Propene with catalytic sulfuric acid and water. The proton goes to the end carbon, and water attacks the more substituted carbon.',
      'The product is propan-2-ol.',
      {reactants, cation, oxonium, product},
      [
        step('reactants', 'Alkene protonation', [
          leave('hA', 'c2', 'c3'),
          leave('oA', 'hA', 'oA')
        ]),
        step('cation', 'Water addition', [lone('c2', 'oW')]),
        step('oxonium', 'Deprotonation', [
          {arrows: [lone('hP', 'oW'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oW'), leave('oAdd', 'hQ', 'oAdd')]}
        ])
      ]));
  }

  {
    const hg = A('hg', [560, 190], {shorthand: 'Hg(OAc)₂', label: 'Hg', element: 'Hg', name: 'mercury', pad: 18});
    const oAc = A('oAc', P(560, 190, 20, 70), {label: 'OAc', element: 'O', name: 'the acetate that leaves', pad: 22});
    const reactants = join(propene(110, 240), {atoms: [hg, oAc, sprout(hg, 200, {id: 'oAc2', label: 'AcO', element: 'O', name: 'second acetate'}, 70)], bonds: [['hg', 'oAc', 1], ['hg', 'oAc2', 1]]});
    const base = chain3(160, 230);
    const brg = A('hg', midOut(160, 230, base[1], base[2], 54), {label: 'HgOAc⁺', element: 'Hg', name: 'mercury in the mercurinium', pad: 20});
    const cation = join(
      {atoms: [...base, brg], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'hg', 1], ['c3', 'hg', 1]]},
      water(630, 250)
    );
    const organo = chain3(150, 250);
    const oAdd = sprout(organo[1], 95, {id: 'oAdd', label: 'O', element: 'O', name: 'oxonium oxygen', pad: 16}, 66);
    const hP = sprout(oAdd, 35, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on oxygen', pad: 14}, 54);
    const hQ = sprout(oAdd, 150, {id: 'hQ', label: 'H', element: 'H', name: 'the other hydrogen on oxygen', pad: 14}, 54);
    const hg2 = sprout(organo[2], -40, {id: 'hg', label: 'HgOAc', element: 'Hg', name: 'mercury', pad: 18}, 68);
    const opened = join(
      {atoms: [...organo, oAdd, hP, hQ, hg2], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAdd', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1], ['c3', 'hg', 1]], annotations: [charge(oAdd, '⁺')]},
      water(640, 300, 200)
    );
    const merc = chain3(140, 240);
    const oh = sprout(merc[1], 90, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18}, 68);
    const hg3 = sprout(merc[2], -35, {id: 'hg', label: 'HgOAc', element: 'Hg', name: 'mercury', pad: 18}, 66);
    const replace = {atoms:[...merc, oh, hg3], bonds:[['c1','c2',1], ['c2','c3',1], ['c2','oH',1], ['c3','hg',1]]};
    const product = ipa(190, 240, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18});
    mechanisms.push(mech(2,
      'Oxymercuration of propene, then NaBH4. Water attacks the more substituted carbon of the mercurinium. Borohydride replaces mercury with hydrogen.',
      'The product is propan-2-ol, with no rearrangement.',
      {reactants, cation, opened, replace, product},
      [
        step('reactants', 'Mercurinium ion formation', [
          leave('hg', 'c2', 'c3'),
          lone('c3', 'hg'),
          leave('oAc', 'hg', 'oAc')
        ]),
        step('cation', 'Ring opening', [
          lone('c2', 'oW'),
          leave('hg', 'c2', 'hg')
        ]),
        step('opened', 'Deprotonation', [
          {arrows: [lone('hP', 'oW'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oW'), leave('oAdd', 'hQ', 'oAdd')]}
        ]),
        step('replace', 'Demercuration', [])
      ]));
  }

  {
    const reactants = join(propene(120, 240), borane(580, 200));
    const added = chain3(160, 240);
    const b = sprout(added[2], -20, {id: 'bN', label: 'BH₂', element: 'B', name: 'boron', pad: 16}, 68);
    const hOn = sprout(added[1], 100, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen from borane', pad: 14}, 58);
    const oPer = A('oPer', [560, 170], {label: 'O⁻', element: 'O', name: 'the nucleophilic peroxide oxygen', pad: 18});
    const oFar = A('oFar', P(560, 170, 15, 64), {label: 'O', element: 'O', name: 'the far peroxide oxygen', pad: 16});
    const hPer = sprout(oFar, 70, {id: 'hPer', label: 'H', element: 'H', name: 'the peroxide hydrogen', pad: 14}, 54);
    const boraneScene = join(
      {atoms: [...added, b, hOn, oPer, oFar, hPer], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'bN', 1], ['c2', 'hAdd', 1], ['oPer', 'oFar', 1], ['oFar', 'hPer', 1]]}
    );
    const attached = chain3(150, 250);
    const b2 = sprout(attached[2], 10, {id: 'bN', label: 'BH₂⁻', element: 'B', name: 'boron', pad: 16}, 64);
    const o1 = sprout(b2, 80, {id: 'oPer', label: 'O', element: 'O', name: 'the peroxide oxygen on boron', pad: 16}, 60);
    const o2 = sprout(o1, 20, {id: 'oFar', label: 'OH', element: 'O', name: 'the far peroxide oxygen', pad: 16}, 60);
    const h2 = sprout(attached[1], 110, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen from borane', pad: 14}, 56);
    const migrate = {atoms: [...attached, b2, o1, o2, h2], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'bN', 1], ['bN', 'oPer', 1], ['oPer', 'oFar', 1], ['c2', 'hAdd', 1]]};
    const ester = chain3(160, 240);
    const oAlk = sprout(ester[2], 20, {id: 'oAlk', label: 'O', element: 'O', name: 'the oxygen now on carbon', pad: 16}, 64);
    const b3 = sprout(oAlk, 20, {id: 'bN', label: 'BH₂', element: 'B', name: 'boron', pad: 16}, 62);
    const ho = A('oHO', [560, 200], {label: 'OH⁻', element: 'O', name: 'hydroxide oxygen', pad: 18});
    const cleavage = join(
      {atoms: [...ester, oAlk, b3, ho], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oAlk', 1], ['oAlk', 'bN', 1]]}
    );
    const product = primary(180, 230, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18}, 28);
    mechanisms.push(mech(3,
      'Hydroboration of propene, then alkaline peroxide. Boron bonds to the less substituted carbon. Oxidation puts the hydroxyl there with retention.',
      'The product is propan-1-ol. Workup protonates the alkoxide.',
      {reactants, boraneScene, migrate, cleavage, product},
      [
        step('reactants', 'Hydroboration', [
          leave('bN', 'c2', 'c3'),
          leave('c2', 'hB', 'bN')
        ]),
        step('boraneScene', 'Peroxide addition', [lone('bN', 'oPer')]),
        step('migrate', 'Alkyl migration', [
          leave('oPer', 'c3', 'bN'),
          leave('oFar', 'oPer', 'oFar')
        ]),
        step('cleavage', 'Hydrolysis and workup', [
          lone('bN', 'oHO'),
          leave('oAlk', 'oAlk', 'bN')
        ])
      ]));
  }

  {
    const reactants = join(propene(130, 230), hbrMol(560, 200));
    const base = chain3(160, 240);
    const hAdd = sprout(base[2], -50, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen that added', pad: 14}, 58);
    const br = A('brX', [600, 230], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20});
    const cation = join(
      {atoms: [...base, hAdd, br], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'hAdd', 1]], annotations: [charge(base[1], '⁺')]}
    );
    const product = ipa(190, 240, {id: 'brP', label: 'Br', element: 'Br', name: 'the bromine on carbon', pad: 16});
    mechanisms.push(mech(4,
      'HBr adds to propene. The proton goes to the end carbon and bromide attacks the more substituted carbon.',
      'The product is 2-bromopropane.',
      {reactants, cation, product},
      [
        step('reactants', 'Alkene protonation', [
          leave('hX', 'c2', 'c3'),
          leave('brX', 'hX', 'brX')
        ]),
        step('cation', 'Bromide addition', [lone('c2', 'brX')])
      ]));
  }

  {
    const ring = ring5(190, 220);
    const reactants = join(ring, br2(560, 200));
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
        step('reactants', 'Bromonium ion formation', [
          leave('brA', 'r0', 'r1'),
          leave('brB', 'brA', 'brB'),
          lone('r1', 'brA')
        ]),
        step('bromonium', 'Ring opening', [
          lone('r0', 'brB'),
          leave('brA', 'r0', 'brA')
        ])
      ]));
  }

  {
    const reactants = join(propene(120, 230), br2(540, 190), water(640, 300, 150));
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
      {atoms: [...opened, oAdd, hP, hQ, br], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAdd', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1], ['c3', 'brA', 1]], annotations: [charge(oAdd, '⁺')]},
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
        step('reactants', 'Bromonium ion formation', [
          leave('brA', 'c2', 'c3'),
          leave('brB', 'brA', 'brB'),
          lone('c3', 'brA')
        ]),
        step('bromonium', 'Ring opening', [
          lone('c2', 'oW'),
          leave('brA', 'c2', 'brA')
        ]),
        step('oxonium', 'Deprotonation', [
          {arrows: [lone('hP', 'oW'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oW'), leave('oAdd', 'hQ', 'oAdd')]}
        ])
      ]));
  }

  function peracid(x, y) {
    const c = A('cP', [x, y], {shorthand: 'mCPBA', name: 'peracid carbonyl carbon'});
    const oC = sprout(c, 90, {id: 'oC', label: 'O', element: 'O', name: 'peracid carbonyl oxygen', pad: 16}, 62);
    const oL = sprout(c, 330, {id: 'oL', label: 'O', element: 'O', name: 'the inner peroxide oxygen', pad: 16}, 60);
    const oE = sprout(oL, 10, {id: 'oEp', label: 'O', element: 'O', name: 'the electrophilic peroxide oxygen', pad: 16}, 58);
    const h = sprout(oE, -45, {id: 'hP', label: 'H', element: 'H', name: 'the peroxide hydrogen', pad: 14}, 52);
    const r = sprout(c, 180, {id: 'rP', name: 'aryl carbon attached to the carbonyl'}, 64);
    const aryl = substitutedPhenyl(r, 2, {id:'clAr', label:'Cl', element:'Cl', name:'meta chlorine'});
    return join(aryl, {atoms: [c, oC, oL, oE, h], bonds: [['rP', 'cP', 1], ['cP', 'oC', 2], ['cP', 'oL', 1], ['oL', 'oEp', 1], ['oEp', 'hP', 1]]});
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
    const reactants = join(alk, peracid(500, 200));
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
        step('reactants', 'Concerted epoxidation', [
          leave('oEp', 'c1', 'c2'),
          leave('oC', 'oL', 'oEp'),
          leave('hP', 'cP', 'oC'),
          leave('c2', 'oEp', 'hP')
        ])
      ]));
  }

  {
    const alk = alkeneChain(70, 250);
    const os = A('os', [520, 190], {shorthand: 'OsO₄', label: 'Os', element: 'Os', name: 'osmium', pad: 18});
    const o1 = sprout(os, 145, {id: 'o1', label: 'O', element: 'O', name: 'one oxygen that adds', pad: 16}, 64);
    const o2 = sprout(os, 215, {id: 'o2', label: 'O', element: 'O', name: 'the other oxygen that adds', pad: 16}, 64);
    const o3 = sprout(os, 35, {id: 'o3', label: 'O', element: 'O', name: 'an oxo ligand', pad: 16}, 58);
    const o4 = sprout(os, 325, {id: 'o4', label: 'O', element: 'O', name: 'the fourth oxo ligand'}, 64);
    const reactants = join(alk, {atoms: [os, o1, o2, o3, o4], bonds: [['os', 'o1', 2], ['os', 'o2', 2], ['os', 'o3', 2], ['os', 'o4', 2]]});
    const esterAtoms = alkeneChain(90, 250).atoms;
    const os2 = A('os', [188, 125], {label: 'Os', element: 'Os', name: 'osmium', pad: 18});
    const e1 = esterAtoms[1];
    const e2 = esterAtoms[2];
    const oo1 = A('o1', [e1.x, e1.y - 62], {label: 'O', element: 'O', name: 'oxygen bonded to carbon and osmium', pad: 16});
    const oo2 = A('o2', [e2.x, e2.y - 62], {label: 'O', element: 'O', name: 'the other oxygen of the osmate', pad: 16});
    const osmate = join(
      {atoms: [...esterAtoms, os2, oo1, oo2,
        sprout(os2, 135, {id: 'o3', label: 'O', element: 'O', name: 'oxo ligand'}, 58),
        sprout(os2, 45, {id: 'o4', label: 'O', element: 'O', name: 'oxo ligand'}, 58)], bonds: [['cR', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cM', 1], ['c1', 'o1', 1], ['c2', 'o2', 1], ['o1', 'os', 1], ['o2', 'os', 1], ['os', 'o3', 2], ['os', 'o4', 2]]}
    );
    const diol = alkeneChain(140, 260);
    const oh1 = sprout(diol.c1, 90, {id: 'oH1', label: 'OH', element: 'O', name: 'one hydroxyl', pad: 18}, 64);
    const oh2 = sprout(diol.c2, 70, {id: 'oH2', label: 'OH', element: 'O', name: 'the other hydroxyl', pad: 18}, 64);
    const product = {atoms: [...diol.atoms, oh1, oh2], bonds: [['cR', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cM', 1], ['c1', 'oH1', 'wedge'], ['c2', 'oH2', 'wedge']]};
    const oxoIds = ['o1', 'o2', 'o3', 'o4'];
    const osmateChoices = oxoIds.flatMap(first => oxoIds.filter(second => first !== second)
      .flatMap(second => ['c2', 'c1'].map(carbon => ({arrows: [
        leave(first, 'c1', 'c2'), leave('os', 'os', first), leave(carbon, 'os', second)
      ]}))));
    mechanisms.push(mech(8,
      'Osmium tetroxide adds syn to the alkene. Bisulfite and water then free the diol. The sheet also writes pyridine.',
      'The product is the syn diol.',
      {reactants, osmate, product},
      [
        step('reactants', 'Osmate ester formation', osmateChoices),
        step('osmate', 'Reductive workup', [])
      ]));
  }

  {
    const alk = propene(100, 240);
    const reactants = join(alk, peracid(500, 190));
    const ep = epoxide(200, 200);
    const ho = A('oHO', [560, 240], {label: 'OH⁻', element: 'O', name: 'hydroxide', pad: 18});
    const epScene = join(ep, {atoms: [ho], bonds: []});
    const terminalOH = {id: 'oNew', label: 'OH', element: 'O', name: 'hydroxyl on the terminal methylene'};
    const alkoxide = join(openedEpoxide(
      {id: 'oAlk', label: 'O⁻', element: 'O', name: 'epoxide-derived alkoxide'}, terminalOH, 'dash', 'up'),
      water(630, 250));
    const product = openedEpoxide(
      {id: 'oH', label: 'OH', element: 'O', name: 'hydroxyl on the middle carbon'}, terminalOH, 'dash', 'up');
    mechanisms.push(mech(9,
      'mCPBA makes the epoxide, then hydroxide opens it at the less substituted carbon. Ring opening proceeds by backside attack.',
      'The product is propane-1,2-diol.',
      {reactants, epScene, alkoxide, product},
      [
        step('reactants', 'Epoxidation', [
          leave('oEp', 'c2', 'c3'),
          leave('oC', 'oL', 'oEp'),
          leave('hP', 'cP', 'oC'),
          leave('c3', 'oEp', 'hP')
        ]),
        step('epScene', 'Ring opening', [
          lone('cL', 'oHO'),
          leave('oE', 'cL', 'oE')
        ]),
        step('alkoxide', 'Protonation', protonate('oAlk'))
      ]));
  }

  {
    const alk = propene(120, 240);
    const cC = A('cCar', [540, 190], {name: 'carbene carbon', label: ':CH₂'});
    const reactants = join(alk, {atoms: [cC], bonds: []});
    const base = chain3(180, 250);
    const cN = A('cN', midOut(base[1].x, base[1].y, base[1], base[2], 52), {name: 'the new cyclopropane carbon'});
    const product = {atoms: [...base, cN], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'cN', 1], ['c3', 'cN', 1]]};
    mechanisms.push(mech(10,
      'The sheet allows CH2I2 with zinc copper, or diazomethane. This drawing is the free carbene from diazomethane adding in one step.',
      'The product is the cyclopropane.',
      {reactants, product},
      [
        step('reactants', 'Carbene formation and cyclopropanation', [
          leave('cCar', 'c2', 'c3'),
          lone('c3', 'cCar')
        ])
      ], {conditions: ['CH₂N₂', 'hν or heat']}));
  }

  {
    const h = A('hC', [140, 200], {label: 'H', element: 'H', name: 'the hydrogen of chloroform', pad: 14});
    const c = A('cCl', P(140, 200, 0, 64), {name: 'the chloroform carbon'});
    const cl1 = sprout(c, 45, {id: 'cl1', label: 'Cl', element: 'Cl', name: 'a chlorine that stays', pad: 16}, 64);
    const cl2 = sprout(c, -40, {id: 'cl2', label: 'Cl', element: 'Cl', name: 'a chlorine that stays', pad: 16}, 62);
    const cl3 = sprout(c, 115, {id: 'cl3', label: 'Cl', element: 'Cl', name: 'the chlorine that leaves', pad: 16}, 64);
    const oB = A('oB', [360, 170], {label: 'tBuO⁻', element: 'O', name: 'tert-butoxide oxygen', pad: 18});
    const prep = {atoms: [h, c, cl1, cl2, cl3, oB], bonds: [['hC', 'cCl', 1], ['cCl', 'cl1', 1], ['cCl', 'cl2', 1], ['cCl', 'cl3', 1]]};
    const carbene = A('cCar', [540, 200], {name: 'dichlorocarbene carbon'});
    const clA = sprout(carbene, 140, {id: 'cl1', label: 'Cl', element: 'Cl', name: 'a chlorine on the carbene', pad: 16}, 60);
    const clB = sprout(carbene, 40, {id: 'cl2', label: 'Cl', element: 'Cl', name: 'a chlorine on the carbene', pad: 16}, 60);
    const alk = propene(120, 250);
    const add = join(alk, {atoms: [carbene, clA, clB], bonds: [['cCar', 'cl1', 1], ['cCar', 'cl2', 1]]});
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
        step('prep', 'Dichlorocarbene formation', [
          lone('hC', 'oB'),
          leave('cl3', 'cCl', 'cl3')
        ]),
        step('add', 'Cyclopropanation', [
          leave('cCar', 'c2', 'c3'),
          lone('c3', 'cCar')
        ])
      ], {substrate: alk}));
  }

  {
    const alk = alkeneChain(90, 250);
    const oM = A('oM', [500, 200], {label: 'O', element: 'O', name: 'the central oxygen of ozone', pad: 16});
    const oL = sprout(oM, 170, {id: 'oL', label: 'O⁻', element: 'O', name: 'one terminal oxygen of ozone', pad: 18}, 62);
    const oR = sprout(oM, 10, {id: 'oR', label: 'O', element: 'O', name: 'the other terminal oxygen of ozone', pad: 16}, 62);
    const reactants = join(alk, {atoms: [oM, oL, oR], bonds: [['oL', 'oM', 1], ['oM', 'oR', 2]], annotations: [charge(oM, '⁺')]});
    const mol = alkeneChain(140, 250);
    const mL = A('oL', [mol.c1.x - 10, mol.c1.y - 70], {label: 'O', element: 'O', name: 'an oxygen of the molozonide', pad: 16});
    const mM = A('oM', [(mol.c1.x + mol.c2.x) / 2, mol.c1.y - 110], {label: 'O', element: 'O', name: 'the middle oxygen of the molozonide', pad: 16});
    const mR = A('oR', [mol.c2.x + 10, mol.c2.y - 70], {label: 'O', element: 'O', name: 'an oxygen of the molozonide', pad: 16});
    const moloz = {atoms: [...mol.atoms, mL, mM, mR], bonds: [['cR', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cM', 1], ['c1', 'oL', 1], ['oL', 'oM', 1], ['oM', 'oR', 1], ['oR', 'c2', 1]]};
    const s = A('sD', [520, 200], {shorthand: 'Me₂S', label: 'S', element: 'S', name: 'sulfur of dimethyl sulfide', pad: 16});
    const me1 = sprout(s, 60, {id: 'meS1', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 68);
    const me2 = sprout(s, -60, {id: 'meS2', label: 'H₃C', name: 'a methyl on sulfur', pad: 22}, 68);
    const ald1c = A('k1', [120, 200], {name: 'one carbonyl carbon'});
    const ald1o = sprout(ald1c, 90, {id: 'ok1', label: 'O', element: 'O', name: 'that carbonyl oxygen', pad: 16}, 64);
    const ald1r = sprout(ald1c, 210, {id: 'rk1', label: 'R', name: 'the substituent', pad: 16}, 66);
    const oxC = A('k2', [280, 230], {name: 'carbonyl oxide carbon'});
    const oxO = sprout(oxC, 80, {id: 'oIn', label: 'O⁺', element: 'O', name: 'the inner oxygen of the carbonyl oxide', pad: 16}, 60);
    const oxT = sprout(oxO, 10, {id: 'oOut', label: 'O⁻', element: 'O', name: 'the terminal oxygen of the carbonyl oxide', pad: 16}, 58);
    const oxR = sprout(oxC, 200, {id: 'rk2', label: 'H₃C', name: 'the methyl on the carbonyl oxide', pad: 22}, 66);
    const reduce = join(
      {atoms: [ald1c, ald1o, ald1r, oxC, oxO, oxT, oxR, s, me1, me2], bonds: [['k1', 'ok1', 2], ['rk1', 'k1', 1], ['k2', 'oIn', 2], ['oIn', 'oOut', 1], ['rk2', 'k2', 1], ['sD', 'meS1', 1], ['sD', 'meS2', 1]]}
    );
    const p1 = A('p1', [160, 200], {name: 'one aldehyde carbon'});
    const po1 = sprout(p1, 90, {id: 'po1', label: 'O', element: 'O', name: 'an aldehyde oxygen', pad: 16}, 64);
    const pr1 = sprout(p1, 210, {id: 'pr1', label: 'R', name: 'the substituent', pad: 16}, 66);
    const p2 = A('p2', [340, 210], {name: 'the other aldehyde carbon'});
    const po2 = sprout(p2, 90, {id: 'po2', label: 'O', element: 'O', name: 'the other aldehyde oxygen', pad: 16}, 64);
    const pr2 = sprout(p2, 330, {id: 'pr2', label: 'H₃C', name: 'the methyl', pad: 22}, 66);
    const product = {atoms: [p1, po1, pr1, p2, po2, pr2], bonds: [['p1', 'po1', 2], ['pr1', 'p1', 1], ['p2', 'po2', 2], ['pr2', 'p2', 1]], annotations: [companion('DMSO')]};
    mechanisms.push(mech(12,
      'Ozone cleaves the double bond. Dimethyl sulfide then reduces the carbonyl oxide to the second carbonyl. The sheet writes SMe2.',
      'The products are the two carbonyls.',
      {reactants, moloz, reduce, product},
      [
        step('reactants', 'Molozonide formation', [
          lone('c1', 'oL'),
          leave('oR', 'c1', 'c2'),
          leave('oM', 'oM', 'oR')
        ]),
        step('moloz', 'Fragmentation', [
          leave('oL', 'c1', 'c2'),
          leave('oR', 'oL', 'oM')
        ]),
        step('reduce', 'Reductive workup', [
          lone('oOut', 'sD'),
          leave('oIn', 'oIn', 'oOut')
        ])
      ]));
  }

  {
    const yne = terminalYne(140, 220);
    const n = A('nA', [480, 200], {shorthand: 'NaNH₂', label: 'N⁻', element: 'N', name: 'nitrogen of sodium amide', pad: 18});
    const h1 = sprout(n, 50, {id: 'hN1', label: 'H', element: 'H', name: 'a hydrogen on nitrogen', pad: 14}, 58);
    const h2 = sprout(n, -50, {id: 'hN2', label: 'H', element: 'H', name: 'a hydrogen on nitrogen', pad: 14}, 58);
    const reactants = join(yne, {atoms: [n, h1, h2], bonds: [['nA', 'hN1', 1], ['nA', 'hN2', 1]], annotations: [companion('Na⁺')]});
    const prod = terminalYne(180, 220);
    prod.atoms = prod.atoms.filter(atom => atom.id !== 'hT');
    prod.bonds = prod.bonds.filter(bond => !bond.includes('hT'));
    const product = {atoms: prod.atoms, bonds: prod.bonds, annotations: [charge(prod.c2, '⁻'), companion('Na⁺'), companion('NH₃')]};
    mechanisms.push(mech(13,
      'Sodium amide takes the terminal alkyne proton. The sheet runs this in ammonia.',
      'The product is the acetylide.',
      {reactants, product},
      [
        step('reactants', 'Acetylide formation', [
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
  function addChromateLigands(scene, chromium, esterDirection) {
    for (const [id, element, offset, order] of [['oxo1','O',90,2], ['oxo2','O',180,2], ['chloride','Cl',270,1]]) {
      scene.atoms.push(sprout(chromium, esterDirection + offset, {id, label:element, element, name:element === 'Cl' ? 'chloride ligand' : 'oxo ligand'}, 60));
      scene.bonds.push([chromium.id, id, order]);
    }
  }
  function brPair(x, y, idA, idB, nameA, nameB) {
    const a = A(idA, [x, y], {label: 'Br', element: 'Br', name: nameA, pad: 16});
    const b = A(idB, P(x, y, 0, 72), {label: 'Br', element: 'Br', name: nameB, pad: 16});
    return {atoms: [a, b], bonds: [[idA, idB, 1]]};
  }
  function organoMg(x, y, ids) {
    const cA = A(ids.c, [x, y], {name: 'carbon bonded to magnesium'});
    const cB = A(ids.me, P(x, y, 250.5, 72), {label: 'H₃C', name: 'methyl of the Grignard', pad: 22});
    const mg = A(ids.mg, P(x, y, 0, 76), {shorthand: 'EtMgBr', label: 'Mg', element: 'Mg', name: 'magnesium', pad: 18});
    const br = A(ids.br, P(mg.x, mg.y, 0, 74), {label: 'Br', element: 'Br', name: 'bromine', pad: 16});
    return {atoms: [cB, cA, mg, br], bonds: [[ids.c, ids.me, 1], [ids.c, ids.mg, 1], [ids.mg, ids.br, 1]], c: cA};
  }
  function rli(x, y, ids) {
    const cA = A(ids.c, [x, y], {name: 'carbon of the organolithium'});
    const cB = A(ids.me, P(x, y, 250.5, 72), {label: 'H₃C', name: 'methyl of the ethyl group', pad: 22});
    const li = A(ids.li, P(x, y, 0, 70), {shorthand: 'EtLi', label: 'Li', element: 'Li', name: 'lithium', pad: 16});
    return {atoms: [cB, cA, li], bonds: [[ids.c, ids.me, 1], [ids.c, ids.li, 1]], c: cA};
  }
  function hydride(x, y) {
    const h = A('hH', [x, y], {label: 'H', element: 'H', name: 'the hydride', pad: 14});
    const m = A('mH', P(x, y, 0, 70), {shorthand: 'LAH', label: 'AlH₃⁻', element: 'Al', name: 'aluminum', pad: 16});
    return {atoms: [h, m], bonds: [['hH', 'mH', 1]], annotations: [companion('Li⁺')]};
  }
  function acetone(x, y) {
    const c = A('cCO', [x, y], {name: 'carbonyl carbon'});
    const meL = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'a methyl', pad: 22});
    const meR = sprout(c, 330, {id: 'meR', label: 'H₃C', name: 'a methyl', pad: 22});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    return {atoms: [meL, c, meR, o], bonds: [['meL', 'cCO', 1], ['cCO', 'meR', 1], ['cCO', 'oCO', 2]]};
  }

  {
    const yne = alkyneInternal(90, 200);
    const reactants = join(yne, brPair(500, 170, 'brA', 'brB', 'the nearer bromine', 'the leaving bromine'));
    const y2 = alkyneInternal(110, 210);
    const brPlus = A('brA', [y2.c1.x + 28, y2.c1.y - 52], {label: 'Br⁺', element: 'Br', name: 'bromonium bromine', pad: 20});
    const brFree = A('brB', [600, 310], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20});
    const brom1 = {atoms: [...y2.atoms, brPlus, brFree], bonds: [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1], ['c1', 'brA', 1], ['c2', 'brA', 1]]};
    const y3 = alkyneInternal(90, 190);
    const br1 = sprout(y3.c1, 100, {id: 'br1', label: 'Br', element: 'Br', name: 'bromine on the left carbon', pad: 16}, 60);
    const br2a = sprout(y3.c2, -80, {id: 'br2', label: 'Br', element: 'Br', name: 'bromine on the right carbon', pad: 16}, 60);
    const dibromo = join(
      {atoms: [...y3.atoms, br1, br2a], bonds: [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1], ['c1', 'br1', 1], ['c2', 'br2', 1]]},
      brPair(530, 310, 'brC', 'brD', 'the nearer bromine of the second equivalent', 'the leaving bromine')
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
        step('reactants', 'First bromonium ion', [
          leave('brA', 'c1', 'c2'),
          leave('brB', 'brA', 'brB'),
          lone('c2', 'brA')
        ]),
        step('brom1', 'First ring opening', [
          lone('c1', 'brB'),
          leave('brA', 'c1', 'brA')
        ]),
        step('dibromo', 'Second bromonium ion', [
          leave('brC', 'c1', 'c2'),
          leave('brD', 'brC', 'brD'),
          lone('c2', 'brC')
        ]),
        step('brom2', 'Second ring opening', [
          lone('c1', 'brD'),
          leave('brC', 'c1', 'brC')
        ])
      ]));
  }

  {
    const yne = alkyneInternal(100, 185);
    const reactants = join(yne, hbrMol(540, 165));
    const y2 = alkyneInternal(120, 200);
    const hAdd = sprout(y2.c2, -70, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen that added', pad: 14}, 54);
    const brIon = A('brX', [580, 280], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20});
    const cation = {atoms: [...y2.atoms, hAdd, brIon], bonds: [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1], ['c2', 'hAdd', 1]], annotations: [charge(y2.c1, '⁺')]};
    const y3 = alkyneInternal(100, 180);
    const brV = sprout(y3.c1, 90, {id: 'brV', label: 'Br', element: 'Br', name: 'the vinylic bromine', pad: 16}, 60);
    const hV = sprout(y3.c2, -75, {id: 'hAdd', label: 'H', element: 'H', name: 'the hydrogen already added', pad: 14}, 54);
    const vinyl = join(
      {atoms: [...y3.atoms, brV, hV], bonds: [['cL', 'c1', 1], ['c1', 'c2', 2], ['c2', 'cR', 1], ['c1', 'brV', 1], ['c2', 'hAdd', 1]]},
      hbrMol(540, 310)
    );
    const y4 = alkyneInternal(120, 200);
    const brStay = sprout(y4.c1, 90, {id: 'brV', label: 'Br', element: 'Br', name: 'the bromine already there', pad: 16}, 60);
    const hOld = sprout(y4.c2, -80, {id: 'hAdd', label: 'H', element: 'H', name: 'the first hydrogen', pad: 14}, 52);
    const hNew = sprout(y4.c2, 35, {id: 'hNew', label: 'H', element: 'H', name: 'the hydrogen that just added', pad: 14}, 52);
    const cation2 = {atoms: [...y4.atoms, brStay, hOld, hNew, A('brX', [610, 300], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20})], bonds: [['cL', 'c1', 1], ['c1', 'c2', 1], ['c2', 'cR', 1], ['c1', 'brV', 1], ['c2', 'hAdd', 1], ['c2', 'hNew', 1]], annotations: [charge(y4.c1, '⁺')]};
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
        step('reactants', 'Alkyne protonation', [
          leave('hX', 'c1', 'c2'),
          leave('brX', 'hX', 'brX')
        ]),
        step('cation', 'First bromide addition', [lone('c1', 'brX')]),
        step('vinyl', 'Alkene protonation', [
          leave('hX', 'c1', 'c2'),
          leave('brX', 'hX', 'brX')
        ]),
        step('cation2', 'Second bromide addition', [lone('c1', 'brX')])
      ]));
  }

  {
    const reactants = join(roh(110, 230), hydronium(600, 190));
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the beta carbon'},
      {id: 'c3', name: 'the carbon bearing oxygen'}
    ], 130, 250, 28);
    const o = sprout(chain[2], 28, {id: 'oAdd', label: 'O', element: 'O', name: 'the oxonium oxygen', pad: 16}, 64);
    const hP = sprout(o, 70, {id: 'hP', label: 'H', element: 'H', name: 'a hydrogen on the oxonium', pad: 14}, 52);
    const hQ = sprout(o, 150, {id: 'hQ', label: 'H', element: 'H', name: 'the other hydrogen on the oxonium', pad: 14}, 52);
    const hB = sprout(chain[1], 110, {id: 'hB', label: 'H', element: 'H', name: 'the beta hydrogen', pad: 14}, 54);
    const oB = A('oB', [600, 320], {label: 'H₂O', element: 'O', name: 'water acting as the base', pad: 16});
    const protonated = {atoms: [...chain, o, hP, hQ, hB, oB], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oAdd', 1], ['oAdd', 'hP', 1], ['oAdd', 'hQ', 1], ['c2', 'hB', 1]], annotations: [charge(o, '⁺')]};
    mechanisms.push(mech(19,
      'Concentrated sulfuric acid and heat turn the primary alcohol into propene. Water leaves as a base takes a beta proton.',
      'The product is propene.',
      {reactants, protonated, product: propene(200, 230)},
      [
        step('reactants', 'Alcohol protonation', [
          lone('hA', 'oH'),
          leave('oA', 'hA', 'oA')
        ]),
        step('protonated', 'Elimination', [
          lone('hB', 'oB'),
          formPiBond('c2', 'c3', bondId('c2', 'hB')),
          leave('oAdd', 'c3', 'oAdd')
        ])
      ]));
  }

  {
    const alcohol = roh(80, 250);
    const s = A('sT', [430, 170], {shorthand: 'TsCl', label: 'S', element: 'S', name: 'sulfur of tosyl chloride', pad: 16});
    const o1 = sprout(s, 90, {id: 'oS1', label: 'O', element: 'O', name: 'a sulfonyl oxygen', pad: 16}, 56);
    const o2 = sprout(s, 20, {id: 'oS2', label: 'O', element: 'O', name: 'a sulfonyl oxygen', pad: 16}, 56);
    const cl = sprout(s, -50, {id: 'clT', label: 'Cl', element: 'Cl', name: 'the chlorine that leaves', pad: 16}, 60);
    const ts = sprout(s, 180, {id: 'cTs', name: 'aryl carbon attached to sulfur'}, 62);
    const base = pyridine('nPy', 660, 250);
    const reactants = join(alcohol, substitutedPhenyl(ts, 3, {id:'tolMe', name:'para methyl carbon'}), {atoms: [s, o1, o2, cl], bonds: [['sT', 'oS1', 2], ['sT', 'oS2', 2], ['sT', 'clT', 1], ['sT', 'cTs', 1]]}, base);
    const attached = roh(90, 270);
    const s2 = sprout(attached.o, -10, {id: 'sT', label: 'Ts', element: 'S', name: 'tosyl sulfur', pad: 16}, 66);
    const chloride = A('clT', [760, 150], {label: 'Cl⁻', element: 'Cl', name: 'chloride'});
    const mid = join({atoms: [...attached.atoms, s2, chloride], bonds: [...attached.bonds, ['oH', 'sT', 1]], annotations: [charge(attached.o, '⁺')]}, base);
    mechanisms.push(mech(20,
      'The alcohol attacks sulfur of tosyl chloride, chloride leaves, and pyridine takes the proton.',
      'The product is the tosylate.',
      {reactants, mid, product: primary(180, 240, {id: 'oTs', label: 'OTs', element: 'O', name: 'the tosylate oxygen', pad: 22})},
      [
        step('reactants', 'Tosylation', [
          lone('sT', 'oH'),
          leave('clT', 'sT', 'clT')
        ]),
        step('mid', 'Deprotonation', [
          lone('hO', 'nPy'),
          leave('oH', 'oH', 'hO')
        ])
      ]));
  }

  {
    const alcohol = roh(90, 250);
    const s = A('sC', [470, 170], {shorthand: 'SOCl₂', label: 'S', element: 'S', name: 'sulfur of thionyl chloride', pad: 16});
    const oS = sprout(s, 90, {id: 'oS', label: 'O', element: 'O', name: 'the oxygen on sulfur', pad: 16}, 56);
    const cl1 = sprout(s, 15, {id: 'cl1', label: 'Cl', element: 'Cl', name: 'a chlorine on sulfur', pad: 16}, 60);
    const cl2 = sprout(s, -60, {id: 'cl2', label: 'Cl', element: 'Cl', name: 'a chlorine on sulfur', pad: 16}, 60);
    const reactants = join(alcohol, {atoms: [s, oS, cl1, cl2], bonds: [['sC', 'oS', 2], ['sC', 'cl1', 1], ['sC', 'cl2', 1]]});
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbon that will hold chlorine'}
    ], 130, 250, 28);
    const o = sprout(chain[2], 20, {id: 'oH', label: 'OH⁺', element: 'O', name: 'protonated oxygen on carbon', pad: 16}, 62);
    const s2 = sprout(o, 20, {id: 'sC', label: 'S(O)Cl', element: 'S', name: 'chlorosulfite sulfur', pad: 16}, 58);
    const subst = {atoms: [...chain, o, s2, A('cl2', [580, 230], {label: 'Cl⁻', element: 'Cl', name: 'chloride', pad: 18})], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['oH', 'sC', 1]]};
    mechanisms.push(mech(21,
      'The alcohol attacks sulfur of thionyl chloride. Chloride then substitutes at carbon and the configuration inverts.',
      'The product is the chloroalkane.',
      {reactants, subst, product: primary(180, 230, {id: 'clP', label: 'Cl', element: 'Cl', name: 'the chlorine on carbon', pad: 16})},
      [
        step('reactants', 'Chlorosulfite formation',
          ['cl2', 'cl1'].map(chloride => ({arrows: [
            lone('sC', 'oH'), leave(chloride, 'sC', chloride)
          ]}))),
        step('subst', 'Chloride substitution', [
          lone('c3', 'cl2'),
          leave('oH', 'c3', 'oH')
        ])
      ]));
  }

  {
    const alcohol = roh(90, 250);
    const p = A('pB', [480, 170], {shorthand: 'PBr₃', label: 'P', element: 'P', name: 'phosphorus', pad: 16});
    const b1 = sprout(p, 70, {id: 'br1', label: 'Br', element: 'Br', name: 'a bromine on phosphorus', pad: 16}, 60);
    const b2 = sprout(p, 10, {id: 'br2', label: 'Br', element: 'Br', name: 'a bromine on phosphorus', pad: 16}, 60);
    const b3 = sprout(p, -55, {id: 'br3', label: 'Br', element: 'Br', name: 'the bromine that leaves', pad: 16}, 60);
    const reactants = join(alcohol, {atoms: [p, b1, b2, b3], bonds: [['pB', 'br1', 1], ['pB', 'br2', 1], ['pB', 'br3', 1]]});
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbon that will hold bromine'}
    ], 130, 250, 28);
    const o = sprout(chain[2], 18, {id: 'oH', label: 'OH⁺', element: 'O', name: 'protonated oxygen on carbon', pad: 16}, 62);
    const p2 = sprout(o, 12, {id: 'pB', label: 'PBr₂', element: 'P', name: 'phosphorus', pad: 16}, 58);
    const subst = {atoms: [...chain, o, p2, A('br3', [580, 230], {label: 'Br⁻', element: 'Br', name: 'bromide', pad: 20})], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['oH', 'pB', 1]]};
    mechanisms.push(mech(22,
      'The alcohol attacks phosphorus of PBr3. Bromide then substitutes at carbon and the configuration inverts.',
      'The product is the bromoalkane.',
      {reactants, subst, product: primary(180, 230, {id: 'brP', label: 'Br', element: 'Br', name: 'the bromine on carbon', pad: 16})},
      [
        step('reactants', 'Alcohol activation', [
          lone('pB', 'oH'),
          leave('br3', 'pB', 'br3')
        ]),
        step('subst', 'Bromide substitution', [
          lone('c3', 'br3'),
          leave('oH', 'c3', 'oH')
        ])
      ]));
  }

  {
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon', pad: 22},
      {id: 'c2', name: 'the middle carbon'},
      {id: 'c3', name: 'the carbinol carbon'}
    ], 150, 175, 28);
    const o = sprout(chain[2], 28, {id: 'oH', label: 'O', element: 'O', name: 'the chromate ester oxygen', pad: 16}, 76);
    const hC = sprout(chain[2], -98, {id: 'hCar', label: 'H', element: 'H', name: 'a carbinol hydrogen', pad: 14}, 70);
    const cr2 = sprout(o, -78, {id: 'cr', label: 'Cr', element: 'Cr', name: 'chromium', pad: 16}, 86);
    const base = pyridine('oB', hC.x + 136, hC.y + 52);
    const chromate = join({atoms: [...chain, o, hC, cr2], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c3', 'oH', 1], ['c3', 'hCar', 1], ['oH', 'cr', 1]]}, base);
    const c = A('cCO', [240, 200], {name: 'carbonyl carbon'});
    const product = {atoms: [sprout(c, 210, {id: 'c2', label: 'H₃C', name: 'the chain', pad: 22}), c, sprout(c, 330, {id: 'hAld', label: 'H', element: 'H', name: 'the aldehyde hydrogen', pad: 14}, 60), sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68)], bonds: [['c2', 'cCO', 1], ['cCO', 'hAld', 1], ['cCO', 'oCO', 2]]};
    addChromateLigands(chromate, cr2, 100);
    const middle = product.atoms.find(atom => atom.id === 'c2');
    middle.label = '';
    product.atoms.push(sprout(middle, 150, {id:'c1', name:'terminal methyl carbon'}, 70));
    product.bonds.push(['c1', 'c2', 1]);
    mechanisms.push(mech(23,
      'Start with the chromate ester of 1-propanol. Draw its elimination to propanal.',
      'The product is the aldehyde.',
      {chromate, product},
      [
        step('chromate', 'Chromate ester formation and elimination', [
          lone('hCar', 'oB'),
          formPiBond('c3', 'oH', bondId('c3', 'hCar')),
          leave('cr', 'oH', 'cr')
        ])
      ], {substrate: primary(0, 0, {id: 'oH', label: 'OH', element: 'O'})}));
  }

  {
    const ester = ipa(160, 275, {id: 'oH', label: 'O', element: 'O', name: 'the chromate ester oxygen', pad: 16});
    const h2 = sprout(ester.c2, 152, {id: 'hCar', label: 'H', element: 'H', name: 'the hydrogen on the carbinol carbon', pad: 14}, 72);
    const cr2 = sprout(ester.o, 40, {id: 'cr', label: 'Cr', element: 'Cr', name: 'chromium', pad: 16}, 86);
    const base = pyridine('oB', h2.x - 16, h2.y - 82, true);
    const chromate = join({atoms: [...ester.atoms, h2, cr2], bonds: [...ester.bonds, ['c2', 'hCar', 1], ['oH', 'cr', 1]]}, base);
    addChromateLigands(chromate, cr2, 220);
    mechanisms.push(mech(24,
      'Start with the chromate ester of 2-propanol. Draw its elimination to acetone.',
      'The product is the ketone.',
      {chromate, product: acetone(240, 210)},
      [
        step('chromate', 'Chromate ester formation and elimination', [
          lone('hCar', 'oB'),
          formPiBond('c2', 'oH', bondId('c2', 'hCar')),
          leave('cr', 'oH', 'cr')
        ])
      ], {substrate: ipa(0, 0, {id: 'oH', label: 'OH', element: 'O'})}));
  }  {
    const alcohol = roh(80, 250);
    const si = A('si', [430, 180], {shorthand: 'TBSCl', label: 'Si', element: 'Si', name: 'silicon', pad: 16});
    const cl = sprout(si, -20, {id: 'clS', label: 'Cl', element: 'Cl', name: 'the chlorine that leaves', pad: 16}, 60);
    const me1 = sprout(si, 50, {id: 'me1', label: 'H₃C', name: 'a methyl on silicon', pad: 22}, 60);
    const me2 = sprout(si, 110, {id: 'me2', label: 'H₃C', name: 'a methyl on silicon', pad: 22}, 60);
    const tbu = sprout(si, 180, {id: 'tbu', label: 'tBu', name: 'the tert-butyl group', pad: 20}, 64);
    const base = imidazole(660, 250);
    const reactants = join(alcohol, {atoms: [si, cl, me1, me2, tbu], bonds: [['si', 'clS', 1], ['si', 'me1', 1], ['si', 'me2', 1], ['si', 'tbu', 1]]}, base);
    const attached = roh(90, 270);
    const si2 = sprout(attached.o, 40, {id: 'si', label: 'TBS', element: 'Si', name: 'silyl silicon', pad: 16}, 60);
    const mid = join({atoms: [...attached.atoms, si2], bonds: [...attached.bonds, ['oH', 'si', 1]], annotations: [charge(attached.o, '⁺'), companion('Cl⁻')]}, base);
    mechanisms.push(mech(28,
      'TBSCl protects the alcohol. Oxygen attacks silicon, chloride leaves, and imidazole takes the proton. The sheet also lists NH4F, which removes the group when fluoride attacks silicon.',
      'The product is the TBS ether.',
      {reactants, mid, product: primary(180, 240, {id: 'oSi', label: 'OTBS', element: 'O', name: 'the silyl ether oxygen', pad: 24})},
      [
        step('reactants', 'Silylation', [
          lone('si', 'oH'),
          leave('clS', 'si', 'clS')
        ]),
        step('mid', 'Deprotonation', [
          lone('hO', 'nIm'),
          leave('oH', 'oH', 'hO')
        ])
      ], {conditions: ['TBSCl, imidazole']}));
  }

  {
    const start = primary(140, 230, {id: 'brX', label: 'Br', element: 'Br', name: 'bromine', pad: 16});
    const oh = A('oNu', [520, 210], {label: 'OH⁻', element: 'O', name: 'hydroxide', pad: 22});
    const reactants = join(start, {atoms: [oh], bonds: []});
    mechanisms.push(mech(29,
      'Hydroxide substitutes on a primary alkyl bromide. The sheet writes X. This drawing uses bromine.',
      'The product is the primary alcohol.',
      {reactants, product: primary(200, 230, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18})},
      [
        step('reactants', 'Nucleophilic substitution', [
          lone('c3', 'oNu'),
          leave('brX', 'c3', 'brX')
        ])
      ]));
  }

  {
    const chain = zz([
      {id: 'c1', label: 'H₃C', name: 'methyl carbon'},
      {id: 'c2', name: 'the carbon bearing oxygen'}
    ], 100, 240, 28);
    const o = sprout(chain[1], -28, {id: 'oH', label: 'O', element: 'O', name: 'alcohol oxygen'}, 66);
    const h = sprout(o, 90, {id: 'hO', label: 'H', element: 'H', name: 'alcohol hydrogen'}, 54);
    const ethanolBonds = [['c1', 'c2', 1], ['c2', 'oH', 1]];
    const alcohol = {atoms: [...chain, o, h], bonds: [...ethanolBonds, ['oH', 'hO', 1]]};
    const hH = A('hH', [500, 180], {shorthand: 'NaH', label: 'H⁻', element: 'H', name: 'hydride from sodium hydride', pad: 18});
    const reactants = join(alcohol, {atoms: [hH], bonds: [], annotations: [companion('Na⁺')]});
    const cE1 = A('cE1', [500, 200], {label: 'H₃C', name: 'the methyl of ethyl bromide', pad: 22});
    const cE2 = A('cE2', P(500, 200, 0, 74), {name: 'the carbon bearing bromine'});
    const brE = A('brE', P(cE2.x, cE2.y, 0, 70), {label: 'Br', element: 'Br', name: 'bromine', pad: 16});
    const alkoxide = {atoms: [...chain, {...o, label: 'O⁻'}, cE1, cE2, brE], bonds: [...ethanolBonds, ['cE1', 'cE2', 1], ['cE2', 'brE', 1]]};
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
        step('reactants', 'Alkoxide formation', [
          lone('hO', 'hH'),
          leave('oH', 'oH', 'hO')
        ]),
        step('alkoxide', 'Ether formation', [
          lone('cE2', 'oH'),
          leave('brE', 'cE2', 'brE')
        ])
      ]));
  }

  {
    const reactants = join(epoxide(180, 230), hydronium(580, 170));
    const epi = epoxide(170, 240);
    const hOn = sprout(epi.o, 90, {id: 'hOn', label: 'H', element: 'H', name: 'the hydrogen on the epoxide oxygen', pad: 14}, 52);
    const protonated = join({atoms: [...epi.atoms, hOn], bonds: [['oE', 'cM', 1], ['oE', 'cL', 1], ['cM', 'cL', 1], ['cM', 'me', 1], ['oE', 'hOn', 1]], annotations: [charge(epi.o, '⁺')]}, water(580, 250));
    const substrate = openedEpoxide(
      {id:'oAdd', label:'O', element:'O', name:'the oxonium oxygen'},
      {id:'oE', label:'OH', element:'O', name:'the epoxide-derived hydroxyl'}, 'wedge');
    const oAdd = substrate.atoms.find(atom => atom.id === 'oAdd');
    const hP = sprout(oAdd, 35, {id:'hP', label:'H', element:'H', name:'an oxonium hydrogen'}, 50);
    const hQ = sprout(oAdd, 145, {id:'hQ', label:'H', element:'H', name:'the other oxonium hydrogen'}, 50);
    const opened = join(substrate, {atoms:[hP,hQ], bonds:[['oAdd','hP',1],['oAdd','hQ',1]], annotations:[charge(oAdd,'⁺')]}, water(620,280,190));
    const product = openedEpoxide(
      {id:'oM', label:'OH', element:'O', name:'the new hydroxyl'},
      {id:'oL', label:'OH', element:'O', name:'the epoxide-derived hydroxyl'}, 'wedge');
    mechanisms.push(mech(32,
      'Acid opens the epoxide. Water attacks the more substituted carbon, from the face opposite the oxygen.',
      'The product is the anti diol.',
      {reactants, protonated, opened, product},
      [
        step('reactants', 'Epoxide protonation', [
          lone('hA', 'oE'),
          leave('oA', 'hA', 'oA')
        ]),
        step('protonated', 'Ring opening', [
          lone('cM', 'oW'),
          leave('oE', 'cM', 'oE')
        ]),
        step('opened', 'Deprotonation', [
          {arrows: [lone('hP', 'oW'), leave('oAdd', 'hP', 'oAdd')]},
          {arrows: [lone('hQ', 'oW'), leave('oAdd', 'hQ', 'oAdd')]}
        ])
      ]));
  }

  {
    const epi = epoxide(160, 230);
    const b = A('bL', [520, 170], {shorthand: 'BF₃', label: 'B', element: 'B', name: 'boron of the Lewis acid', pad: 16});
    const f1 = sprout(b, 40, {id: 'f1', label: 'F', element: 'F', name: 'a fluorine', pad: 16}, 56);
    const f2 = sprout(b, -30, {id: 'f2', label: 'F', element: 'F', name: 'a fluorine', pad: 16}, 56);
    const f3 = sprout(b, 110, {id: 'f3', label: 'F', element: 'F', name: 'a fluorine', pad: 16}, 56);
    const reactants = join(epi, {atoms: [b, f1, f2, f3], bonds: [['bL', 'f1', 1], ['bL', 'f2', 1], ['bL', 'f3', 1]]});
    const epi2 = epoxide(150, 240);
    const b2 = sprout(epi2.o, 80, {id: 'bL', label: 'BF₃⁻', element: 'B', name: 'coordinated boron', pad: 24}, 58);
    const coordinated = join({atoms: [...epi2.atoms, b2], bonds: [...epi2.bonds, ['oE', 'bL', 1]], annotations: [charge(epi2.o, '⁺')]}, methoxide(560,280));
    const methoxy = {id:'oNu', label:'O', element:'O', name:'the methoxy oxygen'};
    const alkoxide = join(openedEpoxide(methoxy, {id:'oAlk', label:'O⁻', element:'O', name:'the alkoxide oxygen'}, 'wedge'),
      water(640,160,200), {annotations:[companion('BF₃')]});
    const product = openedEpoxide(methoxy, {id:'oH', label:'OH', element:'O', name:'the hydroxyl'}, 'wedge');
    mechanisms.push(mech(33,
      'A Lewis acid coordinates to the epoxide oxygen. Methoxide then attacks the more substituted carbon. The sheet writes Nu. This drawing uses methoxide, and BF3 for the Lewis acid.',
      'The product has the nucleophile on the more substituted carbon and OH on the less substituted carbon.',
      {reactants, coordinated, alkoxide, product},
      [
        step('reactants', 'Lewis acid coordination', [lone('bL', 'oE')]),
        step('coordinated', 'Ring opening', [
          lone('cM', 'oNu'),
          leave('oE', 'cM', 'oE'),
          leave('oE', 'oE', 'bL')
        ]),
        step('alkoxide', 'Protonation', protonate('oAlk'))
      ], {conditions: ['1. BF₃·Et₂O, MeO⁻', '2. H₂O']}));
  }

  {
    const reactants = join(epoxide(180, 220), methoxide(520,220));
    const methoxy = {id:'oNu', label:'O', element:'O', name:'the methoxy oxygen'};
    const alkoxide = join(openedEpoxide({id:'oAlk', label:'O⁻', element:'O', name:'the alkoxide oxygen'}, methoxy, 'dash'),
      water(620,170,190));
    const product = openedEpoxide({id:'oH', label:'OH', element:'O', name:'the hydroxyl'}, methoxy, 'dash');
    mechanisms.push(mech(34,
      'Under basic conditions methoxide attacks the less substituted carbon of the epoxide. The sheet writes Base. This drawing uses methoxide.',
      'The product has the base on the less substituted carbon and OH on the carbon that held the methyl.',
      {reactants, alkoxide, product},
      [
        step('reactants', 'Ring opening', [
          lone('cL', 'oNu'),
          leave('oE', 'cL', 'oE')
        ]),
        step('alkoxide', 'Protonation', protonate('oAlk'))
      ], {conditions: ['1. MeO⁻', '2. H₂O']}));
  }

  {
    const reactants = join(epoxide(180, 220), hydride(540, 180));
    const chain = chain3(160, 250);
    const oAlk = sprout(chain[1], 95, {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18}, 66);
    const alkoxide = join({atoms: [...chain, oAlk], bonds: [['c1', 'c2', 1], ['c2', 'c3', 1], ['c2', 'oAlk', 1]], annotations: [companion('the aluminate')]}, water(620, 170, 180));
    mechanisms.push(mech(35,
      'Lithium aluminum hydride opens the epoxide at the less substituted carbon. Water then protonates the alkoxide. The sheet writes the workup as H3O+.',
      'The product is propan-2-ol.',
      {reactants, alkoxide, product: ipa(200, 240, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18})},
      [
        step('reactants', 'Hydride ring opening', [
          leave('cL', 'hH', 'mH'),
          leave('oE', 'cL', 'oE')
        ]),
        step('alkoxide', 'Protonation', protonate('oAlk'))
      ]));
  }

  {
    const acylGroup = {id: 'rAcyl', label: 'R', name: 'substituent on the carbonyl carbon'};
    const alkoxyGroup = {id: 'rAlkoxy', label: 'R′', name: 'substituent on the ester oxygen'};
    const c = A('cCO', [170, 210], {name: 'carbonyl carbon'});
    const r = sprout(c, 210, acylGroup);
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    const oR = sprout(c, 330, {id: 'oR', label: 'O', element: 'O', name: 'the alkoxy oxygen', pad: 16}, 70);
    const rPrime = sprout(oR, 30, alkoxyGroup);
    const reactants = join({atoms: [r, c, o, oR, rPrime], bonds: [['rAcyl', 'cCO', 1], ['cCO', 'oCO', 2], ['cCO', 'oR', 1], ['oR', 'rAlkoxy', 1]]}, hydride(560, 160));
    const tetra = capAt(190, 250, {
      name: 'the tetrahedral carbon',
      left: acylGroup,
      right: {id: 'oR', label: 'O', element: 'O', name: 'the alkoxy oxygen', pad: 16},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'hH', label: 'H', element: 'H', name: 'the hydride that added', pad: 14}
    });
    const rPrimeOnO = sprout(tetra.right, -20, alkoxyGroup);
    const tetraScene = {atoms: [...tetra.atoms, rPrimeOnO], bonds: [...tetra.bonds, ['oR', 'rAlkoxy', 1]]};
    const ald = A('cCO', [180, 200], {name: 'carbonyl carbon'});
    const aldehyde = join({
      atoms: [
        sprout(ald, 210, acylGroup),
        ald,
        sprout(ald, 330, {id: 'hAld', label: 'H', element: 'H', name: 'the aldehyde hydrogen', pad: 14}, 58),
        sprout(ald, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68),
        A('oR', [520, 300], {label: 'O⁻', element: 'O', name: 'the expelled alkoxide', pad: 18}),
        A(alkoxyGroup.id, [600, 300], alkoxyGroup)
      ],
      bonds: [['rAcyl', 'cCO', 1], ['cCO', 'hAld', 1], ['cCO', 'oCO', 2], ['oR', 'rAlkoxy', 1]]
    }, hydride(560, 150));
    // After the second hydride, the former carbonyl carbon is CH₂ in every workup scene.
    function workupProducts(acylProtonated, leavingGroupProtonated) {
      const acylO = {id: 'oAlk', element: 'O', label: acylProtonated ? 'OH' : 'O⁻', name: 'oxygen from the carbonyl'};
      const leavingO = {id: 'oR', element: 'O', label: leavingGroupProtonated ? 'OH' : 'O⁻', name: 'oxygen from the alkoxy group'};
      const reduced = zz([acylGroup, {id: 'cCO', label: 'CH₂', name: 'former carbonyl carbon'}, acylO], 140, 220, 30);
      const leaving = zz([alkoxyGroup, leavingO], 480, 250, 0);
      return {atoms: [...reduced, ...leaving], bonds: [['rAcyl', 'cCO', 1], ['cCO', 'oAlk', 1], ['rAlkoxy', 'oR', 1]]};
    }
    const both = join(workupProducts(false, false), water(660, 160, 180));
    const afterOne = join(workupProducts(true, false), water(660, 160, 170));
    const product = workupProducts(true, true);
    mechanisms.push(mech(37,
      'Lithium aluminum hydride reduces the ester. The first hydride adds, the alkoxy group leaves, and a second hydride reduces the aldehyde. Water protonates both alkoxides at the end.',
      'The former carbonyl carbon becomes the CH₂ in RCH₂OH. The ester’s alkoxy group gives R′OH.',
      {reactants, tetra: tetraScene, aldehyde, both, afterOne, product},
      [
        step('reactants', 'First hydride addition', [
          leave('cCO', 'hH', 'mH'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('tetra', 'Aldehyde formation', [
          formPiBond('oAlk', 'cC'),
          leave('oR', 'cC', 'oR')
        ]),
        step('aldehyde', 'Second hydride addition', [
          leave('cCO', 'hH', 'mH'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('both', 'RCH₂OH formation', protonate('oAlk')),
        step('afterOne', 'R′OH formation', protonate('oR'))
      ]));
  }
  {
    const c = A('cCO', [190, 210], {name: 'carbonyl carbon'});
    const meL = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'a methyl', pad: 22});
    const meR = sprout(c, 330, {id: 'meR', label: 'R', name: 'the other substituent', pad: 16});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    const bh = A('hH', [560, 160], {label: 'H', element: 'H', name: 'the hydride', pad: 14});
    const bb = A('mH', P(560, 160, 0, 70), {shorthand: 'NaBH₄', label: 'BH₃⁻', element: 'B', name: 'boron of borohydride', pad: 16});
    const reactants = join({atoms: [meL, c, meR, o, bh, bb], bonds: [['meL', 'cCO', 1], ['cCO', 'meR', 1], ['cCO', 'oCO', 2], ['hH', 'mH', 1]], annotations: [companion('Na⁺')]});
    const alk = capAt(210, 250, {
      name: 'the carbon that was the carbonyl carbon',
      left: {id: 'meL', label: 'H₃C', name: 'a methyl', pad: 22},
      right: {id: 'meR', label: 'R', name: 'the other substituent', pad: 16},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'hAdd', label: 'H', element: 'H', name: 'the hydride that added', pad: 14}
    });
    const alkoxide = join({atoms: alk.atoms, bonds: alk.bonds, annotations: [companion('the borate')]}, water(640, 160, 175));
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
        step('reactants', 'Hydride addition', [
          leave('cCO', 'hH', 'mH'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('alkoxide', 'Acidic workup', protonate('oAlk'))
      ]));
  }

  {
    const c = A('cCO', [200, 220], {name: 'carbonyl carbon'});
    const hL = sprout(c, 210, {id: 'hL', label: 'H', element: 'H', name: 'one hydrogen of formaldehyde', pad: 14}, 58);
    const hR = sprout(c, 330, {id: 'hR', label: 'H', element: 'H', name: 'the other hydrogen of formaldehyde', pad: 14}, 58);
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    const reactants = join({atoms: [hL, c, hR, o], bonds: [['hL', 'cCO', 1], ['cCO', 'hR', 1], ['cCO', 'oCO', 2]]}, grin(530, 160));
    const alk = capAt(200, 255, {
      name: 'the carbon that was the carbonyl carbon',
      left: {id: 'hL', label: 'H', element: 'H', name: 'one hydrogen', pad: 14},
      right: {id: 'hR', label: 'H', element: 'H', name: 'the other hydrogen', pad: 14},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon that came from the Grignard'}
    });
    const tail = sprout(alk.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 74);
    const alkoxide = join({atoms: [...alk.atoms, tail], bonds: [...alk.bonds, ['cAlpha', 'cBeta', 1]], annotations: [companion('⁺MgBr')]}, water(650, 155, 175));
    mechanisms.push(mech(39,
      'Ethylmagnesium bromide adds to formaldehyde. The sheet writes R and writes the workup as H3O+. The product is drawn as a normal chain.',
      'The product is the primary alcohol. HOMgBr is the salt.',
      {reactants, alkoxide, product: primary(200, 230, {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18})},
      [
        step('reactants', 'Grignard addition', [
          leave('cCO', 'cAlpha', 'mg'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('alkoxide', 'Acidic workup', protonate('oAlk'))
      ], {conditions: ['1. EtMgBr', '2. H₃O⁺']}));
  }

  {
    const c = A('cCO', [190, 220], {name: 'carbonyl carbon'});
    const me = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22});
    const h = sprout(c, 330, {id: 'hAld', label: 'H', element: 'H', name: 'the aldehyde hydrogen', pad: 14}, 60);
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 70);
    const reactants = join({atoms: [me, c, h, o], bonds: [['meL', 'cCO', 1], ['cCO', 'hAld', 1], ['cCO', 'oCO', 2]]}, grin(530, 160));
    const alk = capAt(200, 255, {
      name: 'the carbon that was the carbonyl carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22},
      right: {id: 'hAld', label: 'H', element: 'H', name: 'the hydrogen that was on the aldehyde', pad: 14},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon that came from the Grignard'}
    });
    const tail = sprout(alk.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 74);
    const alkoxide = join({atoms: [...alk.atoms, tail], bonds: [...alk.bonds, ['cAlpha', 'cBeta', 1]], annotations: [companion('⁺MgBr')]}, water(650, 155, 175));
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
      {reactants, alkoxide, product: {atoms: [...prod.atoms, tailP], bonds: [...prod.bonds, ['cAlpha', 'cBeta', 1]], annotations: [companion('HOMgBr')]}},
      [
        step('reactants', 'Grignard addition', [
          leave('cCO', 'cAlpha', 'mg'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('alkoxide', 'Acidic workup', protonate('oAlk'))
      ], {conditions: ['1. EtMgBr', '2. H₃O⁺']}));
  }

  {
    const c = A('cCO', [190, 220], {name: 'carbonyl carbon'});
    const meL = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'left methyl carbon', pad: 22});
    const meR = sprout(c, 330, {id: 'meR', label: 'H₃C', name: 'right methyl carbon', pad: 22});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 72);
    const reactants = join({atoms: [meL, c, meR, o], bonds: [['meL', 'cCO', 1], ['cCO', 'meR', 1], ['cCO', 'oCO', 2]]}, grin(530, 168));
    const alk = capAt(200, 255, {
      name: 'carbon that was the carbonyl carbon',
      left: {id: 'meL', label: 'H₃C', name: 'left methyl carbon', pad: 22},
      right: {id: 'meR', label: 'H₃C', name: 'right methyl carbon', pad: 22},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'alkoxide oxygen', pad: 18},
      upR: {id: 'cAlpha', name: 'carbon that came from the Grignard'}
    });
    const tail = sprout(alk.upR, -30, {id: 'cBeta', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 74);
    const alkoxide = join(
      {atoms: [...alk.atoms, tail], bonds: [...alk.bonds, ['cAlpha', 'cBeta', 1]], annotations: [companion('⁺MgBr')]},
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
    const product = {atoms: [...prod.atoms, tailP], bonds: [...prod.bonds, ['cAlpha', 'cBeta', 1]], annotations: [companion('HOMgBr')]};
    mechanisms.push(mech(41,
      'Ethylmagnesium bromide adds to the ketone. The two methyls stay the chain. The oxygen and the new ethyl sit close together above it. The sheet writes the workup as H3O+.',
      'Every arrow matched. The alcohol is the organic product. HOMgBr is the salt.',
      {reactants, alkoxide, product},
      [
        step('reactants', 'Grignard addition', [
          leave('cCO', 'cAlpha', 'mg'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('alkoxide', 'Acidic workup', protonate('oAlk'))
      ], {conditions: ['1. EtMgBr', '2. H₃O⁺']}));
  }

  {
    const c = A('cCO', [160, 210], {name: 'carbonyl carbon'});
    const me = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'the acetyl methyl', pad: 22});
    const o = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68);
    const oR = sprout(c, 330, {id: 'oR', label: 'O', element: 'O', name: 'the alkoxy oxygen', pad: 16}, 66);
    const meR = sprout(oR, 270, {id: 'meR', label: 'H₃C', name: 'the methoxy methyl', pad: 22}, 62);
    const reactants = join({atoms: [me, c, o, oR, meR], bonds: [['meL', 'cCO', 1], ['cCO', 'oCO', 2], ['cCO', 'oR', 1], ['oR', 'meR', 1]]}, grin(540, 155));
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
    const ketoneScene = join({atoms: [kMe, ket, kA, kB, kO], bonds: [['meL', 'cCO', 1], ['cCO', 'cAlpha', 1], ['cAlpha', 'cBeta', 1], ['cCO', 'oCO', 2]]}, organoMg(580, 155, {c: 'cA2', me: 'cB2', mg: 'mg2', br: 'br2'}));
    const sec = capAt(190, 255, {
      name: 'the carbon that was the carbonyl carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the original methyl', pad: 22},
      right: {id: 'cAlpha', name: 'carbon from the first Grignard'},
      upL: {id: 'oAlk', label: 'O⁻', element: 'O', name: 'the alkoxide oxygen', pad: 18},
      upR: {id: 'cA2', name: 'carbon from the second Grignard'}
    });
    const b1 = sprout(sec.right, -20, {id: 'cBeta', label: 'H₃C', name: 'methyl of the first ethyl group', pad: 22}, 68);
    const b2 = sprout(sec.upR, -35, {id: 'cB2', label: 'H₃C', name: 'methyl of the second ethyl group', pad: 22}, 70);
    const secScene = join({atoms: [...sec.atoms, b1, b2], bonds: [...sec.bonds, ['cAlpha', 'cBeta', 1], ['cA2', 'cB2', 1]], annotations: [companion('⁺MgBr')]}, water(660, 145, 180));
    const fin = capAt(210, 245, {
      name: 'the alcohol carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the original methyl', pad: 22},
      right: {id: 'cAlpha', name: 'carbon from the first Grignard'},
      upL: {id: 'oH', label: 'OH', element: 'O', name: 'the alcohol oxygen', pad: 18},
      upR: {id: 'cA2', name: 'carbon from the second Grignard'}
    });
    const f1 = sprout(fin.right, -20, {id: 'cBeta', label: 'H₃C', name: 'methyl of the first ethyl group', pad: 22}, 68);
    const f2 = sprout(fin.upR, -35, {id: 'cB2', label: 'H₃C', name: 'methyl of the second ethyl group', pad: 22}, 70);
    const product = {atoms: [...fin.atoms, f1, f2], bonds: [...fin.bonds, ['cAlpha', 'cBeta', 1], ['cA2', 'cB2', 1]], annotations: [companion('HOMgBr')]};
    mechanisms.push(mech(42,
      'Two equivalents of ethylmagnesium bromide add to the ester. The alkoxy group leaves before the second addition. Water is added only at the end. The sheet writes R. This drawing uses ethyl and a methyl ester.',
      'The product is the tertiary alcohol with two ethyl groups.',
      {reactants, tetra: tetraScene, ketone: ketoneScene, sec: secScene, product},
      [
        step('reactants', 'First Grignard addition', [
          leave('cCO', 'cAlpha', 'mg'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('tetra', 'Ketone formation', [
          formPiBond('oAlk', 'cC'),
          leave('oR', 'cC', 'oR')
        ]),
        step('ketone', 'Second Grignard addition', [
          leave('cCO', 'cA2', 'mg2'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('sec', 'Acidic workup', protonate('oAlk'))
      ], {conditions: ['1. 2 equiv. EtMgBr', '2. H₃O⁺']}));
  }

  {
    const c = A('cCO', [180, 210], {name: 'carbonyl carbon'});
    const me = sprout(c, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22});
    const oCO = sprout(c, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68);
    const oH = sprout(c, 330, {id: 'oH', label: 'O', element: 'O', name: 'the hydroxyl oxygen', pad: 16}, 66);
    const hO = sprout(oH, 20, {id: 'hO', label: 'H', element: 'H', name: 'the acid hydrogen', pad: 14}, 52);
    const reactants = join({atoms: [me, c, oCO, oH, hO], bonds: [['meL', 'cCO', 1], ['cCO', 'oCO', 2], ['cCO', 'oH', 1], ['oH', 'hO', 1]]}, rli(560, 155, {c: 'cR', me: 'cRm', li: 'li1'}));
    const carbC = A('cCO', [180, 210], {name: 'carbonyl carbon'});
    const carboxylate = join({
      atoms: [
        sprout(carbC, 210, {id: 'meL', label: 'H₃C', name: 'the methyl', pad: 22}),
        carbC,
        sprout(carbC, 90, {id: 'oCO', label: 'O', element: 'O', name: 'carbonyl oxygen', pad: 16}, 68),
        sprout(carbC, 330, {id: 'oA', label: 'O⁻', element: 'O', name: 'the carboxylate oxygen', pad: 18}, 66)
      ],
      bonds: [['meL', 'cCO', 1], ['cCO', 'oCO', 2], ['cCO', 'oA', 1]],
      annotations: [companion('CH₃CH₃')]
    }, rli(580, 150, {c: 'cR2', me: 'cR2m', li: 'li2'}));
    const di = capAt(200, 250, {
      name: 'the tetrahedral carbon',
      left: {id: 'meL', label: 'H₃C', name: 'the original methyl', pad: 22},
      right: {id: 'cR2', name: 'carbon from the organolithium'},
      upL: {id: 'o1', label: 'O⁻', element: 'O', name: 'one alkoxide oxygen', pad: 18},
      upR: {id: 'o2', label: 'O⁻', element: 'O', name: 'the other alkoxide oxygen', pad: 18}
    });
    const diTail = sprout(di.right, -25, {id: 'cR2m', label: 'H₃C', name: 'methyl of the ethyl group', pad: 22}, 70);
    const dianion = join({atoms: [...di.atoms, diTail], bonds: [...di.bonds, ['cR2', 'cR2m', 1]], annotations: [companion('2 Li⁺')]}, water(660, 150, 180));
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
        step('reactants', 'Acid deprotonation', [
          lone('hO', 'cR'),
          leave('oH', 'oH', 'hO')
        ]),
        step('carboxylate', 'Organolithium addition', [
          leave('cCO', 'cR2', 'li2'),
          leave('oCO', 'cCO', 'oCO')
        ]),
        step('dianion', 'Acidic workup', protonate('o1')),
        step('mono', 'Ketone formation', [
          formPiBond('oAlk', 'cC'),
          leave('oH', 'cC', 'oH')
        ])
      ], {conditions: ['1. 2 equiv. EtLi', '2. H₃O⁺']}));
  }

  return mechanisms;
}
