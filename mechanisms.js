const mechanisms = buildMechanisms();
function mechanismFor(id) { return mechanisms.find(item => item.cardId === id); }

function arrowIdentity(spec) {
  return `${spec.sources[0].from}>${spec.to}`;
}

function viableChoices(step, placed) {
  const used = placed.map(arrow => arrow.key);
  const alive = [];
  step.choices.forEach((choice, index) => {
    const pool = choice.arrows.map(arrowIdentity);
    const fits = used.every(key => {
      const at = pool.indexOf(key);
      if (at < 0) return false;
      pool.splice(at, 1);
      return true;
    });
    if (fits) alive.push(index);
  });
  return alive;
}

function locate(step, from, to) {
  for (const choice of step.choices) {
    for (const spec of choice.arrows) {
      const source = spec.sources.find(item => item.from === from);
      if (source && spec.to === to) return {key: arrowIdentity(spec)};
    }
  }
  return null;
}

function judgeArrow(step, placed, from, to) {
  const found = locate(step, from, to);
  if (found && placed.some(arrow => arrow.key === found.key)) return {ok: false, duplicate: true};
  if (!found || !viableChoices(step, placed.concat([{key: found.key}])).length) {
    const swapped = locate(step, to, from);
    const backwards = Boolean(swapped && !placed.some(arrow => arrow.key === swapped.key));
    return {ok: false, backwards};
  }
  const next = placed.concat([{key: found.key}]);
  const done = viableChoices(step, next).every(index => step.choices[index].arrows.length === next.length);
  return {ok: true, key: found.key, done};
}

function createAttempt(mech) {
  let stepIndex = 0;
  let placed = [];
  let pending = null;
  let peeked = false;
  let anyPeek = false;
  let finished = false;
  let stepComplete = false;
  let wrong = null;
  let status = mech.steps[0].open;
  let bad = false;

  function step() { return mech.steps[stepIndex]; }
  function scene() { return mech.scenes[finished ? mech.doneScene : step().scene]; }
  function shownArrows() {
    if (!peeked) return [];
    const alive = viableChoices(step(), placed);
    const spec = step().choices[alive[0] || 0].arrows;
    return spec.filter(arrow => !placed.some(item => item.key === arrowIdentity(arrow)))
      .map(arrow => ({from: arrow.sources[0].from, to: arrow.to, kind: 'good'}));
  }

  return {
    click(id) {
      if (finished || peeked || stepComplete) return {ignored: true, doneStep: false};
      if (!knownTarget(scene(), id)) return {ignored: true, doneStep: false};
      wrong = null;
      bad = false;
      if (!pending) {
        pending = id;
        status = 'Now click the atom those electrons go to.';
        return {ignored: false, doneStep: false};
      }
      if (pending === id) {
        pending = null;
        status = placed.length ? 'Selection cleared.' : step().open;
        return {ignored: false, doneStep: false};
      }
      const from = pending;
      pending = null;
      const verdict = judgeArrow(step(), placed, from, id);
      if (verdict.duplicate) {
        status = 'That arrow is already drawn.';
        return {ignored: false, doneStep: false};
      }
      if (!verdict.ok) {
        wrong = {from, to: id, kind: 'bad'};
        bad = true;
        status = verdict.backwards
          ? 'Those are backwards. First click the bond or atom the electrons leave.'
          : 'That pair does not match this step.';
        return {ignored: false, doneStep: false};
      }
      placed.push({from, to: id, key: verdict.key, kind: 'good'});
      if (verdict.done) {
        stepComplete = true;
        status = 'Those arrows match.';
        return {ignored: false, doneStep: true};
      }
      const remain = step().choices[0].arrows.length - placed.length;
      status = `That arrow matches. ${remain} ${remain === 1 ? 'arrow' : 'arrows'} still to draw.`;
      return {ignored: false, doneStep: false};
    },
    undo() {
      if (finished || peeked) return;
      wrong = null;
      bad = false;
      stepComplete = false;
      if (pending) {
        pending = null;
        status = placed.length ? 'Selection cleared.' : step().open;
        return;
      }
      if (!placed.length) return;
      placed.pop();
      status = placed.length ? 'Last arrow removed.' : step().open;
    },
    reveal() {
      if (finished || peeked || stepComplete) return;
      peeked = true;
      anyPeek = true;
      pending = null;
      wrong = null;
      bad = false;
      status = 'Correct arrows for this step.';
    },
    advance() {
      if (!stepComplete || peeked || finished) return;
      stepComplete = false;
      placed = [];
      pending = null;
      wrong = null;
      bad = false;
      if (stepIndex < mech.steps.length - 1) {
        stepIndex++;
        stepComplete = step().choices[0].arrows.length === 0;
        status = step().open;
      } else finish();
    },
    continueAfterPeek() {
      if (!peeked || finished) return;
      peeked = false;
      placed = [];
      pending = null;
      wrong = null;
      stepComplete = false;
      bad = false;
      if (stepIndex < mech.steps.length - 1) {
        stepIndex++;
        stepComplete = step().choices[0].arrows.length === 0;
        status = step().open;
      } else finish();
    },
    view() {
      const arrows = [
        ...placed.map(arrow => ({...arrow, kind: 'good'})),
        ...(wrong ? [wrong] : []),
        ...shownArrows()
      ];
      return {
        scene: scene(),
        arrows,
        stepNumber: stepIndex + 1,
        stepCount: mech.steps.length,
        selectedId: pending,
        locked: peeked || finished || stepComplete,
        peeked,
        finished,
        stepComplete,
        bad,
        status,
        canUndo: !finished && !peeked && (placed.length > 0 || pending !== null),
        source: mech.source,
        prompt: finished
          ? (anyPeek ? 'Correct arrows were shown before this was finished. Rate it as it went.' : 'Every arrow matched. Rate how confident you were.')
          : step().choices[0].arrows.length === 0 ? 'Inspect the intermediate, then continue to the product.' : stepComplete || peeked ? 'Review the arrows before continuing.' : 'Choose the atom or bond supplying the electrons, then the atom receiving them.'
      };
    }
  };

  function finish() {
    finished = true;
    bad = false;
    status = anyPeek ? 'Correct arrows were shown before this was finished.' : mech.doneStatus;
  }
}
