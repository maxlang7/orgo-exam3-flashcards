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
  const swern = ['1. DMSO, oxalyl chloride', '2. Et₃N'];
  const coreyKim = ['1. Me₂S, NCS', '2. Et₃N'];
  return new Map([
    [7, [['mCPBA'], ['CH₃CO₃H'], ['PhCO₃H']]],
    [8, [['1. OsO₄, pyridine', '2. NaHSO₃, H₂O'], ['KMnO₄, NaOH, H₂O', 'cold, dilute'], ['cat. OsO₄, NMO', 'H₂O, acetone']]],
    [9, [['1. mCPBA', '2. NaOH, H₂O'], ['1. CH₃CO₃H', '2. NaOH, H₂O'], ['1. PhCO₃H', '2. NaOH, H₂O']]],
    [10, [['CH₂I₂, Zn(Cu)'], ['CH₂N₂', 'hν or heat']]],
    [12, [['1. O₃', '2. Me₂S'], ['1. O₃', '2. Zn, H₂O'], ['1. O₃', '2. PPh₃']]],
    [17, [['excess H₂, Pt'], ['excess H₂, Pd/C'], ['excess H₂, Ni']]],
    [19, [['conc. H₂SO₄', 'heat'], ['conc. H₃PO₄', 'heat']]],
    // These cards depict primary alcohols, so the substitutions give the same product.
    [21, [['SOCl₂', 'pyridine'], ['PCl₃'], ['PCl₅']]],
    [22, [['PBr₃'], ['HBr'], ['PPh₃, CBr₄']]],
    [23, [pcc, swern, coreyKim]],
    [24, [pcc, swern, coreyKim]],
    [25, [swern, pcc, coreyKim]],
    [26, [coreyKim, pcc, swern]],
    // Strong aqueous oxidants belong on the acid card, not the aldehyde card.
    [27, [['CrO₃, H₂SO₄', 'H₂O'], ['K₂Cr₂O₇, H₂SO₄', 'H₂O'], ['1. KMnO₄, OH⁻, heat', '2. H₃O⁺']]],
    [29, [['NaOH', 'H₂O'], ['KOH', 'H₂O']]],
    [30, [['1. NaH, Et₂O', '2. CH₃CH₂Br'], ['1. NaH, Et₂O', '2. CH₃CH₂I']]],
    // Card 38 is an aldehyde/ketone. Do not offer NaBH4 for the ester on card 37.
    [38, [['1. NaBH₄', '2. H₃O⁺'], ['1. LiAlH₄, Et₂O', '2. H₃O⁺'], ['H₂, Pt']]],
  ]);
})();

function renderReagentRoutes(svg, card, mode, revealed) {
  const routes = reagentRoutes.get(card.id);
  if (!routes) return false;
  const ns = 'http://www.w3.org/2000/svg';
  const node = (tag, attributes = {}, text) => {
    const element = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const height = routes.length * 106 + 16;
  const width = card.id === 12 ? 650 : 520;
  // The old masks include the first few pixels of some reagent labels.
  // Crop structures at their own boundaries and preserve a common molecule scale.
  const left = [25, 26, 30].includes(card.id) ? 90 : card.masks.reagents[0];
  const right = 375;
  const startX = 115;
  const endX = 365;
  const centerX = (startX + endX) / 2;
  const group = node('g', {id: 'alternative-routes'});
  const fragment = (x, cropX, cropWidth) => {
    const viewport = node('svg', {x, y: height / 2 - 90, width: cropWidth, height: 180, viewBox: `${cropX} 0 ${cropWidth} 180`, overflow: 'hidden'});
    viewport.append(node('image', {href: card.reaction, width: 745, height: 180}));
    group.append(viewport);
  };
  fragment(0, 0, left);
  if (mode !== 'product' || revealed) fragment(right, card.masks.product[0], width - right);
  if (mode !== 'reagents' || revealed) {
    routes.forEach((lines, index) => {
      const top = 14 + index * 106;
      const arrowY = top + 45;
      const route = node('g', {class: 'reagent-route'});
      // The arrow sits between the two reagent lines, matching a reaction scheme.
      route.append(node('text', {x: startX, y: arrowY - 13, class: 'route-label'}, lines[0]));
      route.append(node('path', {d: `M ${startX} ${arrowY} H ${endX}`, class: 'route-arrow'}));
      route.append(node('path', {d: `M ${endX - 12} ${arrowY - 4} L ${endX} ${arrowY} L ${endX - 12} ${arrowY + 4} Z`, class: 'route-arrowhead'}));
      if (lines[1]) route.append(node('text', {x: startX, y: arrowY + 25, class: 'route-label'}, lines[1]));
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
  svg.querySelector('#alternative-routes')?.remove();
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.append(group);
  return true;
}
