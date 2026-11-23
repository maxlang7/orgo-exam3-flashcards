// Match atoms before laying out the motion. A scene may rename atoms or reuse IDs for fresh reagents.
function makeMorphPlan(mechanism, index, compact, arrows, shown = {}) {
  const step = mechanism.steps[index];
  const before = mechanism.scenes[shown.scene || step.scene];
  const after = mechanism.scenes[shown.next || mechanism.steps[index + 1]?.scene || mechanism.doneScene];
  const mapped = transitionAtoms(mechanism.cardId, index, before, after, arrows);
  const source = layoutScene(before, compact), target = layoutScene(after, compact);
  const reverse = new Map([...mapped].map(([a,b]) => [b,a]));

  // An omitted leaving group travels with its molecule as it fades; an arriving reagent
  // enters near its final position. Shared atoms always arrive at their exact target coordinates.
  function positions(layout, other, correspondence, drift) {
    const points = new Map();
    for (const molecule of layout.molecules) {
      const shifts = [];
      for (const atom of molecule.atoms) {
        const partner = atomById(other, correspondence.get(atom.id));
        if (partner) {
          points.set(atom.id, partner);
          shifts.push({x:partner.x-atom.x, y:partner.y-atom.y});
        }
      }
      const mean = axis => shifts.reduce((sum, p) => sum + p[axis], 0) / (shifts.length || 1);
      for (const atom of molecule.atoms) {
        if (!points.has(atom.id)) points.set(atom.id, {x:atom.x+mean('x'), y:atom.y+mean('y')+drift});
      }
    }
    return points;
  }
  const sourceEnds = positions(source, target, mapped, -12);
  const targetStarts = positions(target, source, reverse, 12);
  const bonds = [];
  const claimed = new Set();
  for (const old of source.bonds) {
    const a = mapped.get(old[0]), b = mapped.get(old[1]);
    const next = target.bonds.find(([u,v]) => (u === a && v === b) || (u === b && v === a));
    if (next) claimed.add(next);
    bonds.push({old, next, flipped:next && next[0] !== a});
  }
  for (const next of target.bonds) if (!claimed.has(next)) bonds.push({next});
  // Use the submitted arrows to orient bond growth and cleavage. Whole incoming
  // reagents keep their internal bonds, as do spectators leaving the drawing.
  const endsOf = id => isBondId(id) ? bondAtoms(id) : [id];
  for (const track of bonds) {
    const {old, next} = track;
    if (old) {
      const arrow = arrows.find(a => a.from === bondId(old[0],old[1]));
      track.departing = !arrow && !mapped.has(old[0]) && !mapped.has(old[1]);
      if (arrow) {
        const destination = mapped.get(arrow.to);
        const transfersFromSecond = destination && target.bonds.some(([a,b]) =>
          bondId(a,b) === bondId(mapped.get(old[1]) ?? '',destination));
        track.breakTowardSecond = arrow.to === old[1] || (arrow.to !== old[0] && transfersFromSecond);
      }
    }
    if (next) {
      const first = reverse.get(next[0]), second = reverse.get(next[1]);
      track.entering = !first && !second;
      track.growFromSecond = arrows.some(arrow => endsOf(arrow.from).includes(second) && endsOf(arrow.to).includes(first));
    }
  }
  const absorbed = implicitTransfers(before, after, mapped, arrows);
  for (const [hydrogen,receiver] of absorbed) sourceEnds.set(hydrogen,sourceEnds.get(receiver));
  const fragments = rotatingFragments(source, sourceEnds, mapped, bonds);
  const incomingReagents = new Set(target.molecules
    .filter(m => m.atoms.every(a => !reverse.has(a.id))).flatMap(m => m.atoms.map(a => a.id)));
  return {source, target, mapped, reverse, sourceEnds, targetStarts, bonds, absorbed, fragments, incomingReagents};
}

// Fit a rotation to each connected set of retained bonds. A fragment that turns
// through 180° keeps its bond lengths instead of collapsing halfway through.
function rotatingFragments(source, ends, mapped, bonds) {
  const retained = {atoms:source.atoms.filter(a => mapped.has(a.id)),
    bonds:bonds.filter(b => b.old && b.next).map(b => b.old)};
  return moleculeGroups(retained).filter(atoms => atoms.length > 1).map(atoms => {
    const mean = points => ({
      x:points.reduce((sum,p) => sum+p.x,0)/points.length,
      y:points.reduce((sum,p) => sum+p.y,0)/points.length
    });
    const start = mean(atoms), end = mean(atoms.map(a => ends.get(a.id)));
    let dot = 0, cross = 0;
    for (const atom of atoms) {
      const other = ends.get(atom.id);
      const ax = atom.x-start.x, ay = atom.y-start.y, bx = other.x-end.x, by = other.y-end.y;
      dot += ax*bx+ay*by;
      cross += ax*by-ay*bx;
    }
    return {atoms, start, end, angle:Math.atan2(cross,dot)};
  });
}

function morphProgress(t, start, end) {
  const x = Math.min(1, Math.max(0, (t-start)/(end-start)));
  return x*x*(3-2*x);
}

function morphFrame(plan, t) {
  const {source, target, sourceEnds, targetStarts} = plan;
  const move = morphProgress(t, .14, .94);
  const breaking = morphProgress(t, .14, .54);
  const forming = morphProgress(t, .40, .87);
  const labels = morphProgress(t, .40, .76);
  const arriving = morphProgress(t, .68, .95);
  const mix = (a,b,f) => a+(b-a)*f;
  const point = (a,b,f) => ({x:mix(a.x,b.x,f), y:mix(a.y,b.y,f)});
  const oldScene = {atoms:source.atoms.map(a => ({...a, ...point(a,sourceEnds.get(a.id),move)}))};
  for (const {atoms,start,end,angle} of plan.fragments) {
    const center = point(start,end,move);
    const cs = Math.cos(angle*move), sn = Math.sin(angle*move);
    const ct = Math.cos(angle*(move-1)), st = Math.sin(angle*(move-1));
    for (const a of atoms) {
      const b = sourceEnds.get(a.id), current = atomById(oldScene,a.id);
      const ax = a.x-start.x, ay = a.y-start.y, bx = b.x-end.x, by = b.y-end.y;
      current.x = center.x + mix(cs*ax-sn*ay, ct*bx-st*by, move);
      current.y = center.y + mix(sn*ax+cs*ay, st*bx+ct*by, move);
    }
  }
  const newScene = {atoms:target.atoms.map(a => {
    const original = atomById(oldScene,plan.reverse.get(a.id));
    const pos = original ?? point(targetStarts.get(a.id),a,move);
    return {...a, x:pos.x, y:pos.y};
  })};
  const parts = [];
  let left = -45, top = -45;
  let right = 45+mix(source.width,target.width,move), bottom = 45+mix(source.height,target.height,move);
  function fit(x,y,rx,ry) {
    left = Math.min(left,x-rx); right = Math.max(right,x+rx);
    top = Math.min(top,y-ry); bottom = Math.max(bottom,y+ry);
  }

  function segments(scene, bond) {
    if (!bond || distance(atomById(scene,bond[0]),atomById(scene,bond[1])) < 2) return [];
    if (bond[2] === 'wedge') return [];
    return bondSegment(scene,...bond);
  }
  function stroke(line, fraction, color, reverse = false, opacity = 1) {
    if (fraction <= 0 || opacity <= 0) return;
    const [x,y,u,v] = reverse ? [line[2],line[3],line[0],line[1]] : line;
    parts.push(`<line class="bond" x1="${x}" y1="${y}" x2="${mix(x,u,fraction)}" y2="${mix(y,v,fraction)}" style="stroke:${color}" opacity="${opacity}"/>`);
  }
  function wedge(scene, bond, opacity) {
    if (bond?.[2] !== 'wedge' || opacity <= 0) return;
    if (distance(atomById(scene,bond[0]),atomById(scene,bond[1])) < 2) return;
    parts.push(`<polygon class="wedge" opacity="${opacity}" points="${wedgePoints(scene,bond[0],bond[1])}"/>`);
  }
  const ink = 'var(--bond-ink, #24302b)';
  for (const {old, next, flipped, entering, departing, growFromSecond, breakTowardSecond} of plan.bonds) {
    const a = segments(oldScene, old), b = segments(newScene, next);
    const sameStyle = old && next && (old[2] === next[2] || (typeof old[2] === 'number' && typeof next[2] === 'number'));
    // Keep the shared sigma stroke when a π bond forms or breaks.
    const shared = sameStyle ? Math.min(a.length,b.length) : 0;
    for (let i=0; i<shared; i++) {
      const line = flipped && next[2] !== 'dash' ? [...b[i].slice(2), ...b[i].slice(0,2)] : b[i];
      stroke(a[i].map((n,j) => mix(n,line[j],move)), 1, ink);
    }
    for (const line of a.slice(shared)) {
      if (departing) stroke(line,1,ink,false,1-breaking);
      else stroke(line,1-breaking,breaking>0 ? 'var(--bond-breaking, #a5533c)' : ink,breakTowardSecond);
    }
    for (const line of b.slice(shared)) {
      if (entering) stroke(line,1,ink,false,plan.incomingReagents.has(next[0]) ? arriving : forming);
      else stroke(line,forming,forming<1 ? 'var(--bond-forming, #187356)' : ink,growFromSecond);
    }
    if (sameStyle && old[2] === 'wedge' && !flipped) wedge(newScene, next, 1);
    else {
      wedge(oldScene, old, 1-breaking);
      wedge(newScene, next, forming);
    }
  }
  // Retain a transferring H long enough to see it join its receiver before the OH/CH label takes over.
  for (const [h,receiver] of plan.absorbed) {
    if (source.bonds.some(([a,b]) => (a === h && b === receiver) || (b === h && a === receiver))) continue;
    const hydrogen = atomById(oldScene,h), atom = atomById(oldScene,receiver);
    const length = distance(atom,hydrogen);
    if (length < 22 || length > 90) continue;
    const [line] = bondSegment(oldScene,receiver,h,1);
    stroke(line,forming * (1-morphProgress(t,.7,.88)), 'var(--bond-forming, #187356)');
  }
  function label(atom, opacity) {
    if (opacity <= 0) return;
    fit(atom.x,atom.y,Math.max(8,labelWidth(atom)/2+5),17);
    if (!atom.label) return;
    parts.push(`<text class="atom-label el-${atom.element}" x="${atom.x}" y="${atom.y}" dy="0.35em" text-anchor="middle" opacity="${opacity}">${escapeXml(atom.label)}</text>`);
  }
  for (const atom of oldScene.atoms) {
    const partner = atomById(target,plan.mapped.get(atom.id));
    const leaving = plan.absorbed.has(atom.id) ? morphProgress(t,.58,.85) : breaking;
    if (!partner) label(atom, 1-leaving);
    else if (atom.label === partner.label) label(atom, 1);
    else if (atom.label && partner.label) {
      // Swap charge/protonation labels at the same atom; overlapping two centered
      // labels of different widths would briefly draw two oxygen symbols.
      label(labels < .5 ? atom : {...atom, label:partner.label}, .8+.2*Math.abs(2*labels-1));
    } else label({...atom,label:atom.label || partner.label}, atom.label ? 1-labels : labels);
  }
  for (const atom of newScene.atoms) {
    if (!plan.reverse.has(atom.id)) label(atom, plan.incomingReagents.has(atom.id) ? arriving : forming);
  }
  for (const [scene,opacity] of [[source,1-morphProgress(t,.12,.32)], [target,morphProgress(t,.76,.98)]]) {
    if (opacity > 0) for (const mark of scene.texts) {
      fit(mark.x,mark.y-6,mark.text.length*6+4,14);
      parts.push(`<text class="${mark.className}" x="${mark.x}" y="${mark.y}" text-anchor="middle" opacity="${opacity}">${escapeXml(mark.text)}</text>`);
    }
  }
  return {viewBox:`${left} ${top} ${right-left} ${bottom-top}`, markup:parts.join('')};
}

// The arrow layer only lives at the start. Its geometry is expensive to route and stays fixed.
function playMechanismMorph(svg, plan, arrows, speed, done) {
  svg.innerHTML = mechanismInner(plan.source, {locked:true, arrows});
  const overlay = svg.querySelector('g.is-locked');
  overlay.replaceChildren(...overlay.querySelectorAll('.mech-arrow'));
  const layer = document.createElementNS(svg.namespaceURI,'g');
  layer.setAttribute('class','mechanism-morph');
  svg.insertBefore(layer,overlay);
  let frameId, last = performance.now(), elapsed = 0;
  function frame(now) {
    elapsed += (now-last)*speed();
    last = now;
    const t = Math.min(elapsed/820,1);
    if (t >= 1) { done(); return; }
    const result = morphFrame(plan,t);
    svg.setAttribute('viewBox',result.viewBox);
    layer.innerHTML = result.markup;
    overlay.setAttribute('opacity',1-morphProgress(t,.07,.18));
    frameId = requestAnimationFrame(frame);
  }
  frame(last);
  return () => cancelAnimationFrame(frameId);
}
