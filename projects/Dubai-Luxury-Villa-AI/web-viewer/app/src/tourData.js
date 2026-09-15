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
    roomId: 'master-bedroom',
    fallbackNodeName: 'master_bedroom',
    feature: 'stairs',
    description: 'Arrive on the upper floor at human-eye height.'
  },
  {
    id: 'master',
    order: 7,
    title: 'Master bedroom',
    floor: 2,
    nodeName: 'tour_master',
    targetNodeName: 'tour_look_master',
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
