export function exampleProject({ invalidFirstPass = false } = {}) {
  const people = [
    { id: 'o1', type: 'player', x: 170, y: 550, r: 22, color: '#1769e8', label: '1' },
    { id: 'o2', type: 'player', x: 350, y: 550, r: 22, color: '#e31818', label: '2' },
    { id: 'o3', type: 'player', x: 530, y: 550, r: 22, color: '#159447', label: '3' },
    { id: 'o4', type: 'ball', x: 192, y: 560, r: 10, color: '#df1f2d', label: '' },
  ];
  const pass = (id, from, to, fromX, toX, order) => ({
    id, type: 'pass', from, to, order, start: 0, duration: 0.6,
    fromAnchor: { x: fromX, y: 550 },
    toAnchor: { x: toX, y: 550 },
    fromAnchorType: 'start', toAnchorType: 'start',
  });
  const actions = [
    pass('a1', 'o1', 'o2', 170, 350, 0),
    pass('a2', 'o2', 'o3', 350, 530, 1),
    {
      id: 'a3', type: 'shot', from: 'o3', order: 2, start: 0, duration: 0.4,
      fromAnchor: { x: 530, y: 550 }, targetAnchor: { x: 350, y: 20 },
      fromAnchorType: 'start',
    },
  ];
  if (invalidFirstPass) {
    actions.unshift(pass('invalid', 'o3', 'o2', 530, 350, 0));
    actions.forEach((a, i) => { a.order = i; });
  }
  return {
    version: 10, name: 'Kvalitetstest – passningskedja', note: 'Automatiserat test',
    rinkMode: 'full', orientation: 'up', objects: people, tracks: {},
    actions, linkedGroups: [], ballOwnerStart: 'o1', eventNodes: {}, libraryId: null,
  };
}
