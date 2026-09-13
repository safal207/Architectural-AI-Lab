# Viewer Source Structure

Planned React application structure:

```
src/
├── App.jsx
├── VillaViewer.jsx
├── RoomPanel.jsx
├── CameraControls.jsx
├── data/
│   └── rooms.json
└── components/
    ├── RoomCard.jsx
    └── MetadataPanel.jsx
```

## Responsibilities

App.jsx
- application shell

VillaViewer.jsx
- GLB loading
- Three.js scene

RoomPanel.jsx
- room selection
- metadata display

CameraControls.jsx
- navigation presets
