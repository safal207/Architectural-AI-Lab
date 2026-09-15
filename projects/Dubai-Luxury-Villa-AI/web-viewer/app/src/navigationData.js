export const WALKTHROUGH_PLAYER = {
  walkSpeed: 2.6,
  sprintSpeed: 5.2,
  corridorRadius: 1.15,
  touchTurnSpeed: 0.0045,
  touchMoveStep: 0.55
};

// The walkthrough is constrained to a graph made from authored camera anchors
// inside the promoted GLB. This protects the existing orbit prototype and gives
// the first-person mode a bounded route without pretending that the prototype
// has construction-grade collision or a measured navmesh.
export const WALKTHROUGH_EDGES = [
  { from: 'entry', to: 'living', type: 'door', radius: 1.35 },
  { from: 'living', to: 'dining', type: 'room', radius: 1.7 },
  { from: 'dining', to: 'stair-ground', type: 'hall', radius: 1.35 },
  { from: 'stair-ground', to: 'stair-upper', type: 'stairs', radius: 1.0 },
  { from: 'stair-upper', to: 'master', type: 'door', radius: 1.25 },
  { from: 'living', to: 'pool', type: 'door', radius: 1.5 }
];

export const WALKTHROUGH_FEATURES = [
  { id: 'plan', label: 'Two-floor plan', status: 'interactive' },
  { id: 'furniture', label: 'Furniture inside', status: 'modelled' },
  { id: 'doors', label: 'Doors and thresholds', status: 'route portals' },
  { id: 'lighting', label: 'Day / evening / night', status: 'interactive' },
  { id: 'stairs', label: 'Stair transition', status: 'walkable graph edge' },
  { id: 'first-person', label: 'First-person walkthrough', status: 'desktop + touch' }
];
