function renderSheetReaction(svg, card, mode, revealed) {
  const node = (tag, attrs, content) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    if (content !== undefined) element.textContent = content;
    return element;
  };
  const group = node('g', {class: 'sheet-reaction'});
  const width = 660;
  const startX = 191;
  const endX = 466;
  const tailWidth = 174;
  const rowHeight = 104;
  const showConditions = revealed || mode !== 'reagents';
  const showProduct = revealed || mode !== 'product';

  function renderSide(species, left, available, y) {
    const groupWidth = species.reduce((sum, key) => sum + sheetStructures.get(key)[0], 0)
      + (species.length - 1) * 24;
    const scale = Math.min(1.12, available / groupWidth);
    let x = left + (available - groupWidth * scale) / 2;
    for (const [index, key] of species.entries()) {
      const [w, h, markup] = sheetStructures.get(key);
      if (index > 0) {
        group.append(node('text', {x: x + 12 * scale, y: y + 5, 'text-anchor': 'middle', class: 'route-label'}, '+'));
        x += 24 * scale;
      }
      const structure = node('svg', {x, y: y - h * scale / 2, width: w * scale,
        height: h * scale, viewBox: `0 0 ${w} ${h}`, class: 'sheet-molecule'});
      structure.innerHTML = markup;
      group.append(structure);
      x += w * scale;
    }
  }

  function mask(x, w, top, height, label) {
    group.append(node('rect', {x, y: top + 12, width: w, height: height - 24, rx: 10, class: 'route-mask'}));
    group.append(node('text', {x: x + w / 2, y: top + height / 2 + 6, 'text-anchor': 'middle', class: 'route-placeholder'}, label));
  }

  let top = 8;
  for (const [index, path] of card.paths.entries()) {
    const height = Math.max(132, path.routes.length * rowHeight);
    const center = top + height / 2;
    if (index > 0) {
      group.append(node('line', {x1: 16, y1: top, x2: width - 16, y2: top, class: 'sheet-divider'}));
    }
    renderSide(path.substrate, 8, tailWidth, center);
    if (showProduct) renderSide(path.product, width - tailWidth - 8, tailWidth, center);
    else mask(width - tailWidth - 8, tailWidth, top, height, '? Product');

    if (showConditions) {
      path.routes.forEach(([above, below, {name, reverseArrow} = {}], routeIndex) => {
        const y = center + (routeIndex - (path.routes.length - 1) / 2) * rowHeight;
        if (name) group.append(node('text', {x: startX, y: y - 34, class: 'route-name'}, name));
        group.append(node('text', {x: startX, y: y - 12, class: 'route-label'}, above));
        appendReactionArrow(group, node, startX, endX, y);
        if (reverseArrow) appendReactionArrow(group, node, endX, startX, y + 9);
        if (below) group.append(node('text', {x: startX, y: y + (reverseArrow ? 34 : 25), class: 'route-label'}, below));
        if (routeIndex < path.routes.length - 1) {
          group.append(node('text', {x: (startX + endX) / 2, y: y + 53, 'text-anchor': 'middle', class: 'route-or'}, 'or'));
        }
      });
    } else {
      mask(startX, endX - startX, top, height, '? Conditions');
    }
    top += height;
  }
  if (mode === 'mechanism') {
    svg.setAttribute('aria-label', [card.name, ...card.paths.flatMap(path => path.routes.flatMap(lines => lines.slice(0, 2)))].join('. '));
  }
  svg.setAttribute('viewBox', `0 0 ${width} ${top + 8}`);
  svg.replaceChildren(group);
}
