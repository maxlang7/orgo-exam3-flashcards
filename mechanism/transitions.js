// Scene IDs describe drawing roles. These overrides follow atoms when their
// roles change. A null source marks an entering atom, and a null destination
// marks a departing atom when the other scene reuses its ID.
const freshWaterAtoms = [[null, 'h1'], [null, 'oW'], [null, 'h2']];
const hydroniumToWater = [['oA', 'oW'], ['hA2', 'h1'], ['hA3', 'h2']];
const waterToOxonium = [
  ['oW', 'oAdd'], ['h1', 'hP'], ['h2', 'hQ'],
  ...freshWaterAtoms
];
const carbonylToAlkoxide = [['cCO', 'cC'], ['oCO', 'oAlk']];
const alkoxideToCarbonyl = [['cC', 'cCO'], ['oAlk', 'oCO']];
const alcoholWorkup = [['oAlk', 'oH']];

const mechanismAtomOverrides = {
  1: {
    0: [['hA', 'hAdd'], ...hydroniumToWater],
    1: waterToOxonium,
    2: [['oAdd', 'oH']]
  },
  2: {
    1: waterToOxonium,
    2: [['oAdd', 'oH']]
  },
  3: {
    2: [['oPer', 'oAlk'], ['oFar', 'oHO']],
    3: alcoholWorkup
  },
  4: {
    0: [['hX', 'hAdd']],
    1: [['brX', 'brP']]
  },
  5: {
    1: [['brB', 'brW'], ['brA', 'brD']]
  },
  6: {
    1: waterToOxonium,
    2: [['oAdd', 'oH'], ['brA', 'brP']]
  },
  7: {
    0: [['oEp', 'oE']]
  },
  8: {
    1: [['o1', 'oH1'], ['o2', 'oH2']]
  },
  9: {
    0: [['c1', 'me'], ['c2', 'cM'], ['c3', 'cL'], ['oEp', 'oE']],
    1: [['oE', 'oAlk'], ['oHO', 'oNew']],
    2: alcoholWorkup
  },
  10: {
    0: [['cCar', 'cN']]
  },
  11: {
    0: [['cCl', 'cCar']],
    1: [['cCar', 'cN'], ['cl1', 'clP1'], ['cl2', 'clP2']]
  },
  12: {
    1: [
      ['cR', 'rk1'], ['c1', 'k1'], ['oL', 'ok1'],
      ['cM', 'rk2'], ['c2', 'k2'], ['oR', 'oIn'], ['oM', 'oOut']
    ],
    2: [
      ['rk1', 'pr1'], ['k1', 'p1'], ['ok1', 'po1'],
      ['rk2', 'pr2'], ['k2', 'p2'], ['oIn', 'po2']
    ]
  },
  15: {
    1: [['brB', 'br1'], ['brA', 'br2']],
    3: [['br1', 'b1'], ['brD', 'b2'], ['brC', 'b3'], ['br2', 'b4']]
  },
  16: {
    0: [['hX', 'hAdd']],
    1: [['brX', 'brV'], [null, 'brX']],
    2: [['hX', 'hNew']],
    3: [['brV', 'b1'], ['brX', 'b2']]
  },
  19: {
    0: [['oH', 'oAdd'], ['hA', 'hP'], ['hO', 'hQ'], ['oA', 'oB']]
  },
  20: {
    1: [['oH', 'oTs']]
  },
  21: {
    1: [['cl2', 'clP']]
  },
  22: {
    1: [['br3', 'brP']]
  },
  23: {
    0: [['c3', 'cCO'], ['oH', 'oCO']]
  },
  24: {
    0: [['c1', 'meL'], ['c2', 'cCO'], ['c3', 'meR'], ['oH', 'oCO']]
  },
  28: {
    1: [['oH', 'oSi']]
  },
  29: {
    0: [['oNu', 'oH']]
  },
  30: {
    1: [['oH', 'oE'], ['cE2', 'c3'], ['cE1', 'c4']]
  },
  32: {
    0: [['hA', 'hOn'], ...hydroniumToWater],
    1: waterToOxonium,
    2: [['oAdd', 'oM'], ['oE', 'oL']]
  },
  33: {
    1: [['oE', 'oAlk']],
    2: alcoholWorkup
  },
  34: {
    0: [['oE', 'oAlk']],
    1: alcoholWorkup
  },
  35: {
    0: [['me', 'c1'], ['cM', 'c2'], ['cL', 'c3'], ['oE', 'oAlk']],
    1: alcoholWorkup
  },
  37: {
    0: carbonylToAlkoxide,
    1: [...alkoxideToCarbonyl, ['hH', 'hAld'], [null, 'hH']],
    2: [['oCO', 'oAlk']],
    3: [['oW', null], ...freshWaterAtoms]
  },
  38: {
    0: [...carbonylToAlkoxide, ['hH', 'hAdd']],
    1: alcoholWorkup
  },
  39: {
    0: carbonylToAlkoxide,
    1: [['cBeta', 'c1'], ['cAlpha', 'c2'], ['cC', 'c3'], ...alcoholWorkup]
  },
  40: {
    0: carbonylToAlkoxide,
    1: alcoholWorkup
  },
  41: {
    0: carbonylToAlkoxide,
    1: alcoholWorkup
  },
  42: {
    0: carbonylToAlkoxide,
    1: alkoxideToCarbonyl,
    2: carbonylToAlkoxide,
    3: alcoholWorkup
  },
  43: {
    0: [['oH', 'oA']],
    // Assign the initially single-bonded carboxylate oxygen to the OH
    // protonated for cleavage. The carboxylate oxygens are resonance-equivalent.
    1: [['cCO', 'cC'], ['oA', 'o1'], ['oCO', 'o2']],
    2: [['o1', 'oH'], ['o2', 'oAlk']],
    3: alkoxideToCarbonyl
  }
};

function mechanismChoiceAtomOverrides(cardId, stepIndex, arrows) {
  // Cyclopentene bromonium is symmetrical. Attack at either carbon is the same
  // trans dibromide. The incoming bromide lands on the carbon that was attacked.
  if (cardId === 5 && stepIndex === 1) {
    const attacksOtherCarbon = arrows.some(arrow => arrow.to === 'r1' ||
      (isBondId(arrow.from) && bondAtoms(arrow.from).includes('r1') && arrow.to === 'brA'));
    return attacksOtherCarbon ? [['brB', 'brD'], ['brA', 'brW']] : [];
  }
  // 2-Butyne bromonium ions are symmetrical, so either carbon can be attacked.
  if (cardId === 15 && stepIndex === 1) {
    const attacksRight = arrows.some(arrow => arrow.to === 'c2' ||
      (isBondId(arrow.from) && bondAtoms(arrow.from).includes('c2') && arrow.to === 'brA'));
    return attacksRight ? [['brB', 'br2'], ['brA', 'br1']] : [];
  }
  if (cardId === 15 && stepIndex === 3) {
    const attacksRight = arrows.some(arrow => arrow.to === 'c2' ||
      (isBondId(arrow.from) && bondAtoms(arrow.from).includes('c2') && arrow.to === 'brC'));
    return attacksRight ? [['brD', 'b4'], ['brC', 'b1'], ['br1', 'b2'], ['br2', 'b3']] : [];
  }
  if (stepIndex !== 0) return [];
  if (cardId === 21) {
    const chloride = arrows.find(arrow => arrow.to === 'cl1' || arrow.to === 'cl2')?.to ?? 'cl2';
    return [[chloride, 'cl2']];
  }
  // Any borane hydrogen can transfer. The next picture has one explicit H,
  // so the hydrogen that moved has to claim hAdd. A static hB map would also
  // claim it and the two hydrogens would collide.
  if (cardId === 3) {
    const hydride = ['hB', 'hB2', 'hB3'].find(id =>
      arrows.some(arrow => arrow.from === bondId(id, 'bN'))) ?? 'hB';
    return [[hydride, 'hAdd']];
  }
  // Any PBr3 bromine can leave. The substitution picture shows that bromide as br3.
  // Reserving br3 stops the bromine that stayed on phosphorus from keeping the same id.
  if (cardId === 22) {
    const bromide = ['br1', 'br2', 'br3'].find(id => arrows.some(arrow => arrow.to === id)) ?? 'br3';
    return [[bromide, 'br3']];
  }
  // The carbene is drawn with cl1 and cl2. If another chlorine leaves, cl3 fills that slot.
  if (cardId === 11) {
    const leaving = ['cl1', 'cl2', 'cl3'].find(id => arrows.some(arrow => arrow.to === id)) ?? 'cl3';
    return leaving === 'cl3' ? [] : [['cl3', leaving]];
  }
  if (cardId !== 8) return [];

  const oxo = ['o1', 'o2', 'o3', 'o4'];
  const first = arrows.find(arrow => arrow.from === bondId('c1', 'c2'))?.to ?? 'o1';
  const secondArrow = arrows.find(arrow => (arrow.to === 'c1' || arrow.to === 'c2') &&
    oxo.some(id => arrow.from === bondId('os', id)));
  const second = secondArrow
    ? oxo.find(id => secondArrow.from === bondId('os', id))
    : 'o2';
  if (!oxo.includes(first) || first === second) return [];
  const firstDestination = secondArrow?.to === 'c1' ? 'o2' : 'o1';
  const secondDestination = firstDestination === 'o1' ? 'o2' : 'o1';
  const remaining = oxo.filter(id => id !== first && id !== second);
  return [[first, firstDestination], [second, secondDestination],
    [remaining[0], 'o3'], [remaining[1], 'o4']];
}

function transitionAtoms(cardId, stepIndex, before, after, arrows = []) {
  const sourceAtoms = new Map(before.atoms.map(atom => [atom.id, atom]));
  const destinationAtoms = new Map(after.atoms.map(atom => [atom.id, atom]));
  const overrides = [
    ...(mechanismAtomOverrides[cardId]?.[stepIndex] ?? []),
    ...mechanismChoiceAtomOverrides(cardId, stepIndex, arrows)
  ];
  const reservedSources = new Set();
  const reservedDestinations = new Set();
  const mapping = new Map();
  for (const [source, destination] of overrides) {
    reservedSources.add(source);
    reservedDestinations.add(destination);
    if (source !== null && destination !== null &&
        sourceAtoms.has(source) && sourceAtoms.get(source).element === destinationAtoms.get(destination)?.element) {
      mapping.set(source, destination);
    }
  }
  for (const [id, atom] of sourceAtoms) {
    if (!reservedSources.has(id) && !reservedDestinations.has(id) && atom.element === destinationAtoms.get(id)?.element) {
      mapping.set(id, id);
    }
  }
  return mapping;
}

// Count hydrogens drawn as part of a hydroxyl label or implied by a carbon's
// valence. Charges and wedge/dash bonds matter for skeletal carbons.
function implicitHydrogenCount(scene, atom) {
  if (atom.element === 'O') return /^OH[⁺⁻]?$/.test(atom.label ?? '') ? 1 : 0;
  if (atom.element !== 'C') return 0;

  const labeledHydrogens = {'CH₂': 2, 'H₂C': 2, 'CH₃': 3, 'H₃C': 3, ':CH₂': 2};
  if (atom.label) return labeledHydrogens[atom.label] ?? 0;
  const charge = scene.annotations?.find(mark => mark.atomId === atom.id)?.symbol;
  const valence = charge === '⁺' || charge === '⁻' ? 3 : 4;
  const bondOrder = scene.bonds.reduce((total, [a, b, order]) =>
    total + (a === atom.id || b === atom.id ? Number(order) || 1 : 0), 0);
  return Math.max(0, valence - bondOrder);
}

function implicitTransfers(before, after, mapped, arrows = []) {
  const sourceAtoms = new Map(before.atoms.map(atom => [atom.id, atom]));
  const destinationAtoms = new Map(after.atoms.map(atom => [atom.id, atom]));
  const disappearingHydrogens = new Set(before.atoms
    .filter(atom => atom.element === 'H' && !mapped.has(atom.id))
    .map(atom => atom.id));
  const gainedSites = new Map();
  for (const [source, destination] of mapped) {
    const gain = implicitHydrogenCount(after, destinationAtoms.get(destination))
      - implicitHydrogenCount(before, sourceAtoms.get(source));
    if (gain > 0) gainedSites.set(source, gain);
  }

  const transfers = new Map();
  function absorb(hydrogen, receiver) {
    const slots = gainedSites.get(receiver);
    if (!slots || transfers.has(hydrogen)) return;
    gainedSites.set(receiver, slots - 1);
    transfers.set(hydrogen, receiver);
  }

  // A protonation arrow points at the H, while a hydride arrow starts at
  // the H–metal bond. Use the actual choice so either water H can transfer.
  const targetedHydrogens = new Set();
  for (const {from, to} of arrows) {
    const ends = isBondId(from) ? bondAtoms(from) : [from];
    if (disappearingHydrogens.has(to)) {
      targetedHydrogens.add(to);
      // For a π-bond donor, the change in implicit valence identifies
      // which end acquired the proton.
      const receivers = ends.filter(id => gainedSites.get(id) > 0);
      if (receivers.length === 1) absorb(to, receivers[0]);
    } else if (gainedSites.get(to) > 0) {
      const hydrogen = ends.find(id => disappearingHydrogens.has(id));
      const donor = ends.find(id => id !== hydrogen);
      if (hydrogen && ['Al', 'B'].includes(sourceAtoms.get(donor)?.element)) absorb(hydrogen, to);
    }
  }

  // Explicit hydrogens can also become implicit while keeping their existing
  // bond. A hydrogen targeted by a base is leaving that bond.
  for (const [a, b] of before.bonds) {
    const hydrogen = disappearingHydrogens.has(a) ? a : disappearingHydrogens.has(b) ? b : null;
    if (hydrogen && !targetedHydrogens.has(hydrogen)) absorb(hydrogen, hydrogen === a ? b : a);
  }
  return transfers;
}
