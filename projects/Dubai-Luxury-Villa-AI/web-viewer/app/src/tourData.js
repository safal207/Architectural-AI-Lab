export const TOUR_STOPS = [
  {
    id: 'overview',
    order: 1,
    title: 'Exterior overview',
    floor: 'site',
    nodeName: null,
    targetNodeName: null,
    roomId: null,
    feature: 'orientation',
    description: 'Understand the villa, pool and arrival sequence before entering.'
  },
  {
    id: 'entry',
    order: 2,
    title: 'Main entry',
    floor: 1,
    nodeName: 'tour_entry',
    targetNodeName: 'tour_look_entry',
    lookAtStopId: 'living',
    cameraOffsetLocal: [1.15, 0, -1.2],
    roomId: null,
    feature: 'door',
    description: 'Cross the arrival threshold and see the first interior axis.'
  },
  {
    id: 'living',
    order: 3,
    title: 'Living room',
    floor: 1,
    nodeName: 'tour_living',
    targetNodeName: 'tour_look_living',
    roomId: 'living-room',
    fallbackNodeName: 'living_room',
    feature: 'furniture-lighting',
    description: 'Experience furniture scale, glazing, media wall and evening light.'
  },
  {
    id: 'dining',
    order: 4,
    title: 'Kitchen + dining',
    floor: 1,
    nodeName: 'tour_dining',
    targetNodeName: 'tour_look_dining',
    lookAtStopId: 'living',
    roomId: 'living-room',
    fallbackNodeName: 'living_room',
    feature: 'furniture-lighting',
    description: 'Inspect the island, dining zone and warm pendant lighting.'
  },
  {
    id: 'stair-ground',
    order: 5,
    title: 'Stair hall',
    floor: 1,
    nodeName: 'tour_stair_ground',
    targetNodeName: 'tour_look_stair_ground',
    roomId: null,
    feature: 'stairs',
    description: 'Read the vertical connection and begin the transition upstairs.'
  },
  {
    id: 'stair-upper',
    order: 6,
    title: 'Upper landing',
    floor: 2,
    nodeName: 'tour_stair_upper',
    targetNodeName: 'tour_look_stair_upper',
    lookAtStopId: 'master',
    cameraOffsetLocal: [2.25, 0.05, -0.35],
    roomId: 'master-bedroom',
    fallbackNodeName: 'master_bedroom',
    feature: 'stairs',
    description: 'Arrive on the upper floor at human-eye height with the master suite visible ahead.'
  },
  {
    id: 'master',
    order: 7,
    title: 'Master bedroom',
    floor: 2,
    nodeName: 'tour_master',
    targetNodeName: 'master_bedroom',
    roomId: 'master-bedroom',
    fallbackNodeName: 'master_bedroom',
    feature: 'furniture-doors-lighting',
    description: 'Inspect the bed, storage, private door and bedside lighting.'
  },
  {
    id: 'pool',
    order: 8,
    title: 'Pool terrace',
    floor: 1,
    nodeName: 'tour_pool',
    targetNodeName: 'tour_look_pool',
    roomId: 'pool-terrace',
    fallbackNodeName: 'pool_terrace',
    feature: 'outdoor',
    description: 'Finish the tour at the outdoor living and pool edge.'
  }
];

export const FLOOR_PLAN_ZONES = {
  1: [
    { id: 'entry', label: 'Entry', tourStopId: 'entry', x: 6, y: 60, w: 22, h: 28 },
    { id: 'stair', label: 'Stairs', tourStopId: 'stair-ground', x: 30, y: 48, w: 18, h: 40 },
    { id: 'living', label: 'Living', tourStopId: 'living', roomId: 'living-room', x: 5, y: 8, w: 43, h: 36 },
    { id: 'dining', label: 'Kitchen + Dining', tourStopId: 'dining', roomId: 'living-room', x: 52, y: 10, w: 42, h: 34 },
    { id: 'private', label: 'Private core', tourStopId: 'living', x: 52, y: 49, w: 22, h: 39 },
    { id: 'terrace', label: 'Pool Terrace', tourStopId: 'pool', roomId: 'pool-terrace', x: 76, y: 49, w: 19, h: 39 }
  ],
  2: [
    { id: 'landing', label: 'Upper Landing', tourStopId: 'stair-upper', x: 7, y: 42, w: 27, h: 46 },
    { id: 'master', label: 'Master Bedroom', tourStopId: 'master', roomId: 'master-bedroom', x: 38, y: 12, w: 56, h: 76 }
  ]
};

export const FLOOR_PLAN_FURNITURE = {
  1: [
    { id: 'sofa', label: 'Sofa', kind: 'sofa', x: 13, y: 18, w: 20, h: 7 },
    { id: 'coffee-table', label: 'Table', kind: 'table', x: 20, y: 29, w: 10, h: 6 },
    { id: 'dining-table', label: 'Dining', kind: 'table', x: 63, y: 18, w: 20, h: 8 },
    { id: 'kitchen-island', label: 'Island', kind: 'kitchen', x: 63, y: 31, w: 20, h: 6 },
    { id: 'stair-flight', label: '↑', kind: 'stairs', x: 35, y: 56, w: 8, h: 24 }
  ],
  2: [
    { id: 'master-bed', label: 'Bed', kind: 'bed', x: 58, y: 28, w: 19, h: 22 },
    { id: 'master-side-left', label: '', kind: 'side-table', x: 53, y: 34, w: 4, h: 8 },
    { id: 'master-side-right', label: '', kind: 'side-table', x: 78, y: 34, w: 4, h: 8 },
    { id: 'upper-stair', label: '↑', kind: 'stairs', x: 15, y: 54, w: 10, h: 24 }
  ]
};

export const FLOOR_PLAN_PORTALS = {
  1: [
    { id: 'entry-door', label: 'Door', x: 25.5, y: 72, orientation: 'vertical' },
    { id: 'pool-slider', label: 'Slider', x: 76, y: 57, orientation: 'vertical' }
  ],
  2: [
    { id: 'master-door', label: 'Door', x: 37, y: 55, orientation: 'vertical' }
  ]
};

export const FLOOR_PLAN_LIGHTS = {
  1: [
    { id: 'living-light', x: 28, y: 17 },
    { id: 'dining-light', x: 73, y: 19 },
    { id: 'entry-light', x: 17, y: 68 }
  ],
  2: [
    { id: 'master-light', x: 68, y: 22 },
    { id: 'landing-light', x: 21, y: 49 }
  ]
};
