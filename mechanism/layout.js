// Each connected component owns its atom coordinates. Place whole molecules together
// so that picking a different screen size cannot break a bond or detach a label.
function bondGap(atom, ux, uy) {
  if (!atom.label) return 0;
  const halfWidth = labelWidth(atom) / 2;
  return Math.min(halfWidth / Math.abs(ux), 10 / Math.abs(uy)) + 3;
}

function labelWidth(atom) {
  return atom.label ? [...atom.label].reduce((width, ch) =>
    width + ('₁₂₃₄⁺⁻'.includes(ch) ? 8 : 12), 0) : 0;
}

function moleculeGroups(scene) {
  const remaining = new Map(scene.atoms.map(atom => [atom.id, atom]));
  if (remaining.size !== scene.atoms.length) throw Error('Duplicate atom identifier');
  const neighbors = new Map(scene.atoms.map(atom => [atom.id, []]));
  for (const [a, b] of scene.bonds) {
    neighbors.get(a).push(b);
    neighbors.get(b).push(a);
  }
  const groups = [];
  for (const atom of scene.atoms) {
    if (!remaining.has(atom.id)) continue;
    const group = [];
    const queue = [atom.id];
    while (queue.length) {
      const id = queue.pop();
      if (!remaining.has(id)) continue;
      group.push(remaining.get(id));
      remaining.delete(id);
      queue.push(...neighbors.get(id));
    }
    groups.push(group);
  }
  return groups.sort((a,b) => Math.min(...a.map(p => p.x)) - Math.min(...b.map(p => p.x)));
}

function layoutScene(source, compact) {
  const charges = new Map((source.annotations || []).filter(a => a.atomId).map(a => [a.atomId, a.symbol]));
  const groups = moleculeGroups(source).map(group => {
    const atoms = group.map(original => {
      let label = original.label || '';
      if (group.length > 1 && ['H₃C', 'CH₃'].includes(label)) label = '';
      if (charges.has(original.id)) label = (label || 'C') + charges.get(original.id);
      return {...original, label};
    });
    const left = Math.min(...atoms.map(a => a.x - Math.max(15, labelWidth(a)/2)));
    const right = Math.max(...atoms.map(a => a.x + Math.max(15, labelWidth(a)/2)));
    const top = Math.min(...atoms.map(a => a.y)) - 18;
    const bottom = Math.max(...atoms.map(a => a.y)) + 18;
    const caption = group.find(atom => atom.shorthand)?.shorthand;
    const width = Math.max(right-left, caption ? caption.length * 10 : 0);
    return {atoms, left:(left+right-width)/2, top, width, caption, height:bottom-top+(caption ? 26 : 0)};
  });
  const gap = 64;
  const stack = compact && groups.reduce((sum,g) => sum + g.width, gap*(groups.length-1)) > 440;
  const cross = Math.max(...groups.map(g => stack ? g.width : g.height));
  const atoms = [], texts = [];
  let offset = 0;
  for (const group of groups) {
    const x = stack ? (cross-group.width)/2 : offset;
    const y = stack ? offset : (cross-group.height)/2;
    for (const atom of group.atoms) atoms.push({...atom, x: atom.x-group.left+x, y: atom.y-group.top+y});
    if (group.caption) texts.push({
      className:'mech-caption', text:group.caption, x:x+group.width/2, y:y+group.height-5
    });
    offset += (stack ? group.height : group.width) + gap;
    if (group !== groups.at(-1)) texts.push({className:'mech-plus', text:'+', x:stack ? cross/2 : offset-gap/2, y:(stack ? offset-gap/2 : cross/2)+6});
  }
  const width = stack ? cross : offset-gap;
  const height = stack ? offset-gap : cross;
  return {atoms, bonds:source.bonds, texts, viewBox:`-45 -45 ${width+90} ${height+90}`};
}
