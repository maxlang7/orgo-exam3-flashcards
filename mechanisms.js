const mechanisms = buildMechanisms();
function mechanismFor(id) { return mechanisms.find(item => item.cardId === id); }

function acceptsTarget(arrow, to) { return arrow.to === to || arrow.atomTarget === to; }
function acceptsSource(arrow, from) { return arrow.sources.some(source => source.from === from); }

function compareDrawing(choice, drawing) {
  const remaining = [...choice.arrows];
  const unmatched = [];
  drawing.forEach(({from, to}, index) => {
    const match = remaining.findIndex(arrow => acceptsTarget(arrow, to) && acceptsSource(arrow, from));
    if (match < 0) unmatched.push(index);
    else remaining.splice(match, 1);
  });
  return {remaining, unmatched};
}

function explainMistake(scene, drawing, comparisons) {
  // Compare against whole valid routes so equivalent atoms and arrow order stay interchangeable.
  const fewest = Math.min(...comparisons.map(c => c.unmatched.length));
  const closest = comparisons.filter(c => c.unmatched.length === fewest);
  const {remaining, unmatched} = closest[0];
  if (!unmatched.length) {
    const count = remaining.length;
    const confirmation = drawing.length === 1 ? 'Your arrow works.' : 'The arrows you drew work.';
    return {message: `${confirmation} Add ${count === 1 ? 'one more arrow' : count + ' more arrows'} to complete this step.`};
  }
  const index = unmatched[0];
  const {from, to} = drawing[index];
  const feedback = text => ({index, message: `Arrow ${index + 1}. ${text}`});
  const expected = closest.filter(c => c.unmatched.includes(index)).flatMap(c => c.remaining);
  if (drawing.slice(0, index).some(arrow => arrow.from === from && arrow.to === to)) {
    return feedback('This repeats an earlier arrow. Each arrow should track a separate electron pair.');
  }
  if (!expected.length) return feedback('This step is already accounted for by the other arrows. Remove the extra arrow.');
  if (expected.some(a => acceptsSource(a, to) && acceptsTarget(a, from))) {
    return feedback('This arrow runs backward. Start at the electron pair and point toward where it goes.');
  }
  // Diagnose an atom clicked at the end of the bond that supplies the electrons.
  const sourceBonds = expected.flatMap(a => a.sources
    .filter(s => isBondId(s.from) && bondAtoms(s.from).includes(from))
    .map(s => ({id: s.from, sameTarget: acceptsTarget(a, to)})));
  const sameSource = expected.filter(a => acceptsSource(a, from));
  const sourceBond = sourceBonds.find(b => b.sameTarget) ?? (sameSource.length ? null : sourceBonds[0]);
  if (sourceBond) {
    const ends = bondAtoms(sourceBond.id);
    const elements = ends.map(id => atomById(scene, id).element);
    if (elements.includes('C') && elements.includes('Mg')) {
      return feedback('The C–Mg bond supplies the electron pair that forms the new C–C bond. Start the arrow on the line between carbon and magnesium.');
    }
    const bond = scene.bonds.find(([a,b]) => bondId(a,b) === sourceBond.id);
    if (bond[2] === 2 || bond[2] === 3) {
      return feedback(`The moving electrons are in a π bond. Start on the ${bond[2] === 2 ? 'double' : 'triple'} bond between the atoms.`);
    }
    return feedback(`The electron pair comes from the ${elements.join('–')} bond. Start on the line between those atoms.`);
  }
  if (sameSource.some(a => isBondId(a.to))) {
    return feedback('These electrons form a π bond. Point the arrow at the bond that becomes a double bond.');
  }
  if (sameSource.some(a => isBondId(from) && bondAtoms(from).includes(a.to))) {
    return feedback('This bond loses an electron pair. Point the arrow at the atom that receives that pair.');
  }
  if (sameSource.length) return feedback('The arrow starts in the right place. Check which atom receives this electron pair.');
  if (expected.some(a => acceptsTarget(a, to))) return feedback('The arrow ends in the right place. Check which lone pair or bond supplies its electrons.');
  return feedback('Trace one electron pair from its starting atom or bond to the atom or bond that receives it.');
}

function createAttempt(mech) {
  let stepIndex = 0;
  let drawing = [];
  let pending = null;
  let phase = 'drawing';
  let mistake = null;
  let usedAnswer = false;
  let variantKey = null;
  let queuedVariant = null;

  function step() { return mech.steps[stepIndex]; }
  function choices() { return (variantKey && step().variants?.[variantKey]) || step().choices; }
  function sceneKey() {
    if (phase === 'finished') return mech.doneScene;
    return (variantKey && step().variants?.[variantKey]) ? variantKey : step().scene;
  }
  function scene() { return mech.scenes[sceneKey()]; }
  function nextSceneKey() {
    return queuedVariant || mech.steps[stepIndex + 1]?.scene || mech.doneScene;
  }
  function startStep() {
    drawing = [];
    pending = null;
    mistake = null;
    phase = choices()[0].arrows.length ? 'drawing' : 'workup';
  }
  startStep();
  return {
    click(id) {
      if (phase !== 'drawing' || !knownTarget(scene(), id)) return {ignored: true};
      mistake = null;
      if (pending === null) pending = id;
      else {
        if (id !== pending) drawing.push({from: pending, to: id});
        pending = null;
      }
      return {ignored: false};
    },
    undo() {
      if (phase !== 'drawing') return;
      if (pending !== null) pending = null;
      else drawing.pop();
      mistake = null;
    },
    check() {
      if (phase !== 'drawing' || pending !== null || !drawing.length) return;
      const choicesNow = choices();
      const comparisons = choicesNow.map(choice => compareDrawing(choice, drawing));
      const match = comparisons.findIndex(c => !c.remaining.length && !c.unmatched.length);
      if (match >= 0) {
        queuedVariant = choicesNow[match].nextScene || null;
        phase = 'solved';
        return 'correct';
      }
      mistake = explainMistake(scene(), drawing, comparisons);
      return 'incorrect';
    },
    reveal() {
      if (phase !== 'drawing') return;
      drawing = choices()[0].arrows.map(arrow => ({from: arrow.sources[0].from, to: arrow.to}));
      pending = null;
      mistake = null;
      phase = 'revealed';
      usedAnswer = true;
    },
    advance() {
      if (phase === 'drawing' || phase === 'finished') return;
      if (stepIndex + 1 < mech.steps.length) {
        stepIndex++;
        variantKey = queuedVariant;
        queuedVariant = null;
        startStep();
      } else {
        phase = 'finished';
        variantKey = null;
        queuedVariant = null;
        drawing = [];
      }
    },
    view() {
      const locked = phase !== 'drawing';
      const finished = phase === 'finished';
      let status = mistake?.message ?? '';
      if (phase === 'solved') status = 'Step correct.';
      return {
        scene: scene(), sceneKey: sceneKey(), nextSceneKey: nextSceneKey(),
        arrows: drawing, selectedId: pending, stepNumber: stepIndex + 1,
        stepCount: mech.steps.length, locked, finished, stepComplete: locked && !finished,
        bad: Boolean(mistake), mistakeIndex: mistake?.index, status, canUndo: !locked && (pending !== null || drawing.length > 0),
        canCheck: !locked && pending === null && drawing.length > 0,
        arrowCount: choices()[0].arrows.length,
        prompt: finished ? (usedAnswer ? 'Rate your confidence after seeing the answer.' : 'Rate your confidence.')
          : locked ? 'Review this step, then continue.' : 'Draw your arrows, then check the step.'
      };
    }
  };
}
