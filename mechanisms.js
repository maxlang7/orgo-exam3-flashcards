const mechanisms = buildMechanisms();
function mechanismFor(id) { return mechanisms.find(item => item.cardId === id); }

function matchesDrawing(choice, drawing) {
  if (choice.arrows.length !== drawing.length) return false;
  const remaining = [...choice.arrows];
  for (const {from, to} of drawing) {
    const index = remaining.findIndex(arrow => arrow.to === to && arrow.sources.some(source => source.from === from));
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}

function createAttempt(mech) {
  let stepIndex = 0;
  let drawing = [];
  let pending = null;
  let phase = 'drawing';
  let missed = false;
  let usedAnswer = false;

  function step() { return mech.steps[stepIndex]; }
  function scene() { return mech.scenes[phase === 'finished' ? mech.doneScene : step().scene]; }
  function startStep() {
    drawing = [];
    pending = null;
    missed = false;
    phase = step().choices[0].arrows.length ? 'drawing' : 'workup';
  }
  startStep();
  return {
    click(id) {
      if (phase !== 'drawing' || !knownTarget(scene(), id)) return {ignored: true};
      missed = false;
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
      missed = false;
    },
    check() {
      if (phase !== 'drawing' || pending !== null || !drawing.length) return;
      if (step().choices.some(choice => matchesDrawing(choice, drawing))) phase = 'solved';
      else missed = true;
    },
    reveal() {
      if (phase !== 'drawing') return;
      drawing = step().choices[0].arrows.map(arrow => ({from: arrow.sources[0].from, to: arrow.to}));
      pending = null;
      missed = false;
      phase = 'revealed';
      usedAnswer = true;
    },
    advance() {
      if (phase === 'drawing' || phase === 'finished') return;
      if (stepIndex + 1 < mech.steps.length) {
        stepIndex++;
        startStep();
      } else {
        phase = 'finished';
        drawing = [];
      }
    },
    view() {
      const locked = phase !== 'drawing';
      const finished = phase === 'finished';
      let status = '';
      if (missed) status = 'Try again.';
      if (phase === 'solved') status = 'Step correct.';
      if (phase === 'revealed' || phase === 'workup') status = step().open;
      if (finished && !usedAnswer) status = mech.doneStatus;
      return {
        scene: scene(), arrows: drawing, selectedId: pending, stepNumber: stepIndex + 1,
        stepCount: mech.steps.length, locked, finished, stepComplete: locked && !finished,
        bad: missed, status, canUndo: !locked && (pending !== null || drawing.length > 0),
        canCheck: !locked && pending === null && drawing.length > 0,
        source: finished ? mech.source : '',
        prompt: finished ? (usedAnswer ? 'Rate your confidence after seeing the answer.' : 'Rate your confidence.')
          : locked ? 'Review this step, then continue.' : 'Draw your arrows, then check the step.'
      };
    }
  };
}
