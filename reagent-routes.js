// Alternatives apply to the exact substrate, product and stereochemistry on each card.
// Keep routes as complete reagent sequences, never interchangeable individual steps.
// Oxidation references:
// https://openstax.org/books/organic-chemistry/pages/17-7-oxidation-of-alcohols
// https://ursula.chem.yale.edu/~chem220/chem220js/STUDYAIDS/oxidation/DMSOoxidation.html
// Other routes follow the course sheet and standard functional-group reactions:
// https://openstax.org/books/organic-chemistry/pages/8-7-oxidation-of-alkenes-epoxidation-and-hydroxylation
// https://openstax.org/books/organic-chemistry/pages/8-8-oxidation-of-alkenes-cleavage-to-carbonyl-compounds
// https://organicchemistrydata.org/reusch/virtualtext/alcohol-reactivity-1/
const reagentRoutes = (() => {
  const pcc = ['PCC', 'CH₂Cl₂'];
  // Use the standard Swern base. The original sheet's pyridine label is retained
  // only in its unchanged source image under "View original reaction & notes".
  const swern = ['1. DMSO, oxalyl chloride', '2. Et₃N', {name: 'Swern oxidation'}];
  const coreyKim = ['1. Me₂S, NCS', '2. Et₃N'];
  return new Map([
    [1, [['cat. H₂SO₄', 'H₂O']]],
    [2, [['1. Hg(OAc)₂, THF/H₂O', '2. NaBH₄, NaOH']]],
    [3, [['1. BH₃, THF', '2. H₂O₂, NaOH']]],
    [4, [['HBr']]],
    [5, [['Br₂']]],
    [6, [['Br₂', 'H₂O']]],
    [7, [['mCPBA'], ['CH₃CO₃H'], ['PhCO₃H']]],
    [8, [['1. OsO₄, pyridine', '2. NaHSO₃, H₂O'], ['KMnO₄, NaOH, H₂O', 'cold, dilute'], ['cat. OsO₄, NMO', 'H₂O, acetone']]],
    [9, [['1. mCPBA', '2. NaOH, H₂O'], ['1. CH₃CO₃H', '2. NaOH, H₂O'], ['1. PhCO₃H', '2. NaOH, H₂O']]],
    [10, [['CH₂I₂, Zn(Cu)'], ['CH₂N₂', 'hν or heat']]],
    [11, [['t-BuOK, CHCl₃']]],
    [12, [['1. O₃', '2. Me₂S'], ['1. O₃', '2. Zn, H₂O'], ['1. O₃', '2. PPh₃']]],
    [13, [['NaNH₂', 'NH₃']]],
    [15, [['2 equiv. Br₂']]],
    [16, [['2 equiv. HBr']]],
    [17, [['excess H₂, Pt'], ['excess H₂, Pd/C'], ['excess H₂, Ni']]],
    [19, [['conc. H₂SO₄', 'heat']]],
    [20, [['TsCl, pyridine']]],
    // These cards depict primary alcohols, so the substitutions give the same product.
    [21, [['SOCl₂', 'pyridine'], ['PCl₃'], ['PCl₅']]],
    [22, [['PBr₃'], ['HBr'], ['PPh₃, CBr₄']]],
    [23, [pcc, swern, coreyKim]],
    [24, [pcc, swern, coreyKim]],
    [25, [swern, pcc, coreyKim]],
    [26, [coreyKim, pcc, swern]],
    // Strong aqueous oxidants belong on the acid card, not the aldehyde card.
    [27, [['CrO₃, H₂SO₄', 'H₂O'], ['K₂Cr₂O₇, H₂SO₄', 'H₂O'], ['1. KMnO₄, OH⁻, heat', '2. H₃O⁺']]],
    [28, [['TBSCl, imidazole', 'NH₄F', {reverseArrow: true}]]],
    [29, [['NaOH', 'H₂O'], ['KOH', 'H₂O']]],
    [30, [['1. NaH, Et₂O', '2. CH₃CH₂Br'], ['1. NaH, Et₂O', '2. CH₃CH₂I']]],
    [31, [['Mg⁰', 'or Li⁰']]],
    [32, [['H₃O⁺', 'H₂O']]],
    [33, [['MgBr₂·Et₂O or BF₃·Et₂O', 'Nu']]],
    [34, [['Base']]],
    [35, [['1. LiAlH₄', '2. H₃O⁺']]],
    [37, [['1. LiAlH₄', '2. H₃O⁺']]],
    // Card 38 is an aldehyde/ketone. Do not offer NaBH4 for the ester on card 37.
    [38, [['1. NaBH₄', '2. H₃O⁺'], ['1. LiAlH₄, Et₂O', '2. H₃O⁺'], ['H₂, Pt']]],
    [39, [['1. RMgBr', '2. H₃O⁺']]],
    [40, [['1. RMgBr', '2. H₃O⁺']]],
    [41, [['1. RMgBr', '2. H₃O⁺']]],
    [42, [['1. 2 equiv. RMgBr', '2. H₃O⁺']]],
    [43, [['1. 2 equiv. RLi', '2. H₃O⁺']]],
  ]);
})();

function renderReagentRoutes(svg, card, mode, revealed, mechanism) {
  const cardRoutes = reagentRoutes.get(card.id);
  const routes = mechanism ? [mechanism.overview.conditions ?? cardRoutes[0]] : cardRoutes;
  const ns = 'http://www.w3.org/2000/svg';
  const node = (tag, attributes = {}, text) => {
    const element = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const rowHeight = 106;
  const height = mechanism ? 132 : Math.max(180, routes.length * rowHeight + 16);
  const width = 600;
  // Crop in the whitespace between each substrate and its printed conditions.
  const left = ({9: 80, 13: 115, 19: 110, 20: 110, 21: 110, 22: 110})[card.id] ?? 94;
  const right = mechanism ? 425 : 375;
  const startX = mechanism ? 160 : 115;
  const endX = startX + 250;
  const centerX = (startX + endX) / 2;
  const group = node('g', mechanism ? {} : {id: 'alternative-routes'});
  const fragment = (x, cropX, cropWidth) => {
    const viewport = node('svg', {x, y: height / 2 - 90, width: cropWidth, height: 180, viewBox: `${cropX} 0 ${cropWidth} 180`, overflow: 'hidden'});
    viewport.append(node('image', {href: card.reaction, width: 745, height: 180}));
    group.append(viewport);
  };
  if (mechanism) {
    appendMechanismStructures(group, node, mechanism, [[8, startX - 20], [right, width - right - 8]], height);
    svg.setAttribute('aria-label', [card.name, ...routes[0].slice(0, 2)].join('. '));
  } else {
    fragment(0, 0, left);
    if (mode !== 'product' || revealed) fragment(right, card.masks.product[0], width - right);
  }
  if (mode !== 'reagents' || revealed) {
    routes.forEach(([above, below, {name, reverseArrow} = {}], index) => {
      const top = (height - routes.length * rowHeight) / 2 + 6 + index * rowHeight;
      const arrowY = top + 45;
      const route = node('g', {class: 'reagent-route'});
      if (name) route.append(node('text', {x: startX, y: arrowY - 37, class: 'route-name'}, name));
      route.append(node('text', {x: startX, y: arrowY - 13, class: 'route-label'}, above));
      const arrow = (from, to, y) => {
        const headBase = to - Math.sign(to - from) * 12;
        route.append(node('path', {d: `M ${from} ${y} H ${headBase}`, class: 'route-arrow'}));
        route.append(node('path', {d: `M ${headBase} ${y - 4} L ${to} ${y} L ${headBase} ${y + 4} Z`, class: 'route-arrowhead'}));
      };
      arrow(startX, endX, arrowY);
      if (reverseArrow) arrow(endX, startX, arrowY + 9);
      if (below) route.append(node('text', {x: startX, y: arrowY + (reverseArrow ? 34 : 25), class: 'route-label'}, below));
      group.append(route);
      if (index < routes.length - 1) group.append(node('text', {x: centerX, y: top + 96, 'text-anchor': 'middle', class: 'route-or'}, 'or'));
    });
  }
  if (!revealed) {
    const x = mode === 'reagents' ? left + 7 : right;
    const boxWidth = mode === 'reagents' ? right - left - 22 : width - right - 6;
    group.append(node('rect', {x, y: 16, width: boxWidth, height: height - 32, rx: 10, class: 'route-mask'}));
    group.append(node('text', {x: x + boxWidth / 2, y: height / 2 + 6, 'text-anchor': 'middle', class: 'route-placeholder'}, mode === 'reagents' ? '? Conditions' : '? Product'));
  }
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.replaceChildren(group);
}

function appendMechanismStructures(group, node, mechanism, slots, height) {
  const {overview, scenes, doneScene} = mechanism;
  // A few exercises start with reagent preparation or an activated intermediate.
  // Otherwise the leftmost molecule in the reactant scene is the substrate.
  let substrate = overview.substrate;
  if (!substrate) {
    const atoms = moleculeGroups(scenes.reactants)[0];
    const ids = new Set(atoms.map(atom => atom.id));
    substrate = {
      atoms, bonds: scenes.reactants.bonds.filter(([from]) => ids.has(from)),
      annotations: scenes.reactants.annotations
    };
  }
  const molecules = [substrate, scenes[doneScene]].map(scene => layoutScene(scene, false));
  const scale = Math.min(0.75, ...molecules.map((scene, i) =>
    Math.min(slots[i][1] / scene.width, (height - 12) / scene.height)));
  molecules.forEach((scene, i) => {
    const [x, w] = slots[i];
    const {width: molWidth, height: molHeight} = scene;
    const offsetX = i === 0 ? x + w - molWidth * scale : x;
    const drawing = node('g', {transform: `translate(${offsetX} ${(height - molHeight * scale) / 2}) scale(${scale})`});
    drawing.innerHTML = mechanismInner(scene, {static: true});
    group.append(drawing);
  });
}
