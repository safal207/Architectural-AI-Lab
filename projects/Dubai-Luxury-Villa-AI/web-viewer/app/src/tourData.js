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
    cameraOffsetLocal: [0.35, 0, 0],
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
    presentationOffsetLocal: [0, 0, 1.0],
    lookAtStopId: 'stair-upper',
    targetNodeName: 'tour_look_stair_ground',
    firstPersonFov: 60,
    roomId: null,
    feature: 'stairs',
    description: 'Review the full stair flight from a presentation eye point one metre behind the authored navigation anchor, still inside the route corridor, looking toward the real upper landing.'
  },
  {
    id: 'stair-upper',
    order: 6,
    title: 'Upper landing',
    floor: 2,
    nodeName: 'tour_stair_upper',
    targetNodeName: 'master_bench_cushion_v04_r5',
    firstPersonFov: 60,
    roomId: 'master-bedroom',
    fallbackNodeName: 'master_bedroom',
    feature: 'stairs',
    description: 'Keep the repaired Interior3 landing eye point fixed while drawing the composition through the actual open threshold toward the visible master bench; no camera compensation is used.'
  },
  {
    id: 'master',
    order: 7,
    title: 'Master bedroom',
    floor: 2,
    nodeName: 'tour_master',
    targetNodeName: 'master_headboard_v04',
    firstPersonFov: 56,
    roomId: 'master-bedroom',
    fallbackNodeName: 'master_bedroom',
    feature: 'furniture-doors-lighting',
    description: 'Inspect the bed, storage, private door and bedside lighting through a tighter presentation frame focused on the authored headboard.'
  },
  {
    id: 'pool',
    order: 8,
    title: 'Pool terrace',
    floor: 1,
    nodeName: 'tour_pool',
    targetNodeName: 'infinity_lip',
    targetOffsetLocal: [-3.2, 0, 0],
    firstPersonFov: 62,
    roomId: 'pool-terrace',
    fallbackNodeName: 'pool_terrace',
    feature: 'outdoor',
    description: 'Finish from the authored walkable terrace eye point, looking diagonally across the pool toward the planted side of the infinity edge without moving the navigation anchor.'
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

export const FLOOR_PLAN_WINDOWS = {
  1: [
    { id: 'living-window-west', x: 5, y: 17, length: 19, orientation: 'vertical' },
    { id: 'living-window-north', x: 19, y: 8, length: 24, orientation: 'horizontal' },
    { id: 'dining-window-north', x: 63, y: 10, length: 22, orientation: 'horizontal' },
    { id: 'pool-glazing', x: 76, y: 69, length: 18, orientation: 'vertical' }
  ],
  2: [
    { id: 'master-window-north', x: 55, y: 12, length: 27, orientation: 'horizontal' },
    { id: 'master-window-east', x: 94, y: 28, length: 34, orientation: 'vertical' }
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
