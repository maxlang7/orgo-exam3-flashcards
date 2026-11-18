function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[char]));
}

function atomById(scene, id) {
  return scene.atoms.find(atom => atom.id === id);
}

function bondId(a, b) {
  return `bond:${[a, b].sort().join('|')}`;
}

function isBondId(id) {
  return typeof id === 'string' && id.startsWith('bond:');
}

function bondAtoms(id) {
  return id.slice(5).split('|');
}

function knownTarget(scene, id) {
  if (atomById(scene, id)) return true;
  if (!isBondId(id)) return false;
  return scene.bonds.some(([from, to]) => bondId(from, to) === id);
}

function hitRadius(atom) {
  if (!atom.label) return 15;
  const size = [...atom.label].length;
  if (size >= 3) return 24;
  if (size === 2) return 20;
  return 16;
}

function bondEnds(scene, fromId, toId) {
  const a = atomById(scene, fromId);
  const b = atomById(scene, toId);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return {a, b, dx, dy, len, ux: dx / len, uy: dy / len};
}

function bondSegment(scene, fromId, toId, order) {
  const {a, b, len, ux, uy} = bondEnds(scene, fromId, toId);
  const x1 = a.x + ux * bondGap(a, ux, uy);
  const y1 = a.y + uy * bondGap(a, ux, uy);
  const x2 = b.x - ux * bondGap(b, ux, uy);
  const y2 = b.y - uy * bondGap(b, ux, uy);
  if (order !== 2 && order !== 3) return [[x1, y1, x2, y2]];
  const ox = -uy * 3.6;
  const oy = ux * 3.6;
  if (order === 2 && !a.label && !b.label) {
    return [[x1, y1, x2, y2], [x1+ux*5+2*ox, y1+uy*5+2*oy, x2-ux*5+2*ox, y2-uy*5+2*oy]];
  }
  if (order === 2) return [[x1 + ox, y1 + oy, x2 + ox, y2 + oy], [x1 - ox, y1 - oy, x2 - ox, y2 - oy]];
  return [[x1, y1, x2, y2], [x1 + ox * 1.7, y1 + oy * 1.7, x2 + ox * 1.7, y2 + oy * 1.7], [x1 - ox * 1.7, y1 - oy * 1.7, x2 - ox * 1.7, y2 - oy * 1.7]];
}

function wedgePoints(scene, fromId, toId) {
  const {a, b, len, ux, uy} = bondEnds(scene, fromId, toId);
  const px = -uy;
  const py = ux;
  const start = bondGap(a, ux, uy) + 1;
  const end = len - bondGap(b, ux, uy);
  const half = 5.5;
  const x0 = a.x + ux * start;
  const y0 = a.y + uy * start;
  const x1 = a.x + ux * end;
  const y1 = a.y + uy * end;
  return [[x0, y0], [x1 + px * half, y1 + py * half], [x1 - px * half, y1 - py * half]]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

// Measure electron flow from the visible bond stroke or the edge of an atom label.
function arrowAnchor(scene, id, toward) {
  if (isBondId(id)) {
    const [a, b] = bondAtoms(id);
    const bond = scene.bonds.find(([u,v]) => bondId(u,v) === id);
    const midpoints = bondSegment(scene, bond[0], bond[1], bond[2]).map(([x,y,u,v]) =>
      ({x:(x+u)/2, y:(y+v)/2}));
    if (!toward) return centerBetween(atomById(scene,a), atomById(scene,b));
    return midpoints.reduce((best, p) => distance(p,toward) < distance(best,toward) ? p : best);
  }
  const atom = atomById(scene,id);
  if (!toward) return atom;
  const len = distance(atom,toward) || 1;
  const ux = (toward.x-atom.x)/len, uy = (toward.y-atom.y)/len;
  const gap = bondGap(atom,ux,uy) + 3;
  return {x:atom.x+gap*ux, y:atom.y+gap*uy};
}

function centerBetween(a,b) { return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }
function distance(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }

function segmentDistance(p,a,b) {
  const dx=b.x-a.x, dy=b.y-a.y;
  const t=Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}

function curvedArrow(scene, from, to, previous) {
  const a=arrowAnchor(scene,from), b=arrowAnchor(scene,to);
  const length=distance(a,b) || 1;
  const nx=-(b.y-a.y)/length, ny=(b.x-a.x)/length;
  const hook=isBondId(from) && bondAtoms(from).includes(to);
  const lift=hook ? 26 : Math.min(85,Math.max(27,length*0.27));
  const bonds=scene.bonds.map(([u,v]) => [atomById(scene,u),atomById(scene,v)]);
  const [left,top,width,height]=scene.viewBox.split(' ').map(Number);
  let best;
  // An asymmetric arc can clear a ligand near one end without taking a wide
  // detour at the other. Prefer a regular arc when both have room.
  const profiles = [[1,1], [1.65,1.65], [0.65,0.65], [0.35,1.5], [1.5,0.35]];
  for (const [tailLift, headLift] of profiles) for (const side of [1,-1]) {
    const control=(fraction, amplitude) => ({
      x:a.x+(b.x-a.x)*fraction+nx*lift*side*amplitude,
      y:a.y+(b.y-a.y)*fraction+ny*lift*side*amplitude
    });
    const c=control(hook ? -0.05 : 0.2, tailLift), d=control(hook ? 1.1 : 0.8, headLift);
    const start=arrowAnchor(scene,from,c), end=arrowAnchor(scene,to,d);
    const samples=[];
    let score=8*(Math.abs(tailLift-1)+Math.abs(headLift-1));
    for (let i=1; i<24; i++) {
      const t=i/24, u=1-t;
      const at=axis => u**3*start[axis]+3*u*u*t*c[axis]+3*u*t*t*d[axis]+t**3*end[axis];
      const p={x:at('x'),y:at('y')};
      samples.push(p);
      if (p.x<left+4 || p.x>left+width-4 || p.y<top+4 || p.y>top+height-4) score+=2000;
      for (const atom of scene.atoms) {
        const dx=Math.max(0,Math.abs(p.x-atom.x)-labelWidth(atom)/2);
        const dy=Math.max(0,Math.abs(p.y-atom.y)-(atom.label ? 10 : 0));
        score+=5*Math.max(0,9-Math.hypot(dx,dy))**2;
      }
      for (const [u,v] of bonds) score+=Math.max(0,6-segmentDistance(p,u,v))**2;
      for (const mark of scene.texts) score+=Math.max(0,16-distance(p,{x:mark.x,y:mark.y-6}))**2;
      for (const other of previous) score+=2*Math.max(0,10-distance(p,other));
    }
    if (!best || score<best.score) best={start,c,d,end,samples,score};
  }
  previous.push(...best.samples);
  const xy=p => p.x.toFixed(1)+' '+p.y.toFixed(1);
  return 'M '+xy(best.start)+' C '+xy(best.c)+' '+xy(best.d)+' '+xy(best.end);
}
