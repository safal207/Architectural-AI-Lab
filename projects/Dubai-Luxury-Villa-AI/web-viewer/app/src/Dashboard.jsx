import { useState } from 'react';
import roomsData from '../data/rooms.json';
import VillaViewer from './VillaViewer';
import RoomSelector from './RoomSelector';
import AIPropertyAssistant from './AIPropertyAssistant';
import MaterialSwitcher from './MaterialSwitcher';
import InvestorMode from './InvestorMode';
import { lightingModes } from './DayNightMode';

export default function Dashboard() {
  const rooms = roomsData.rooms ?? [];
  const [selectedRoom, setSelectedRoom] = useState(rooms[0] ?? null);
  const [material, setMaterial] = useState(null);
  const [lightingMode, setLightingMode] = useState('evening');
  const activeLighting = lightingModes[lightingMode] ?? lightingModes.day;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Architectural-AI-Lab</p>
          <h1>Dubai Luxury Villa AI</h1>
          <p>Interactive AI-assisted architectural visualization prototype</p>
        </div>
        <nav aria-label="Lighting mode">
          {Object.entries(lightingModes).map(([key, mode]) => (
            <button
              key={key}
              type="button"
              className={lightingMode === key ? 'is-active' : ''}
              onClick={() => setLightingMode(key)}
            >
              {mode.name}
            </button>
          ))}
        </nav>
      </header>

      <section className="app-grid">
        <aside className="panel rooms-panel">
          <h2>Rooms</h2>
          <RoomSelector onSelect={setSelectedRoom} />
        </aside>

        <article className="viewer-panel">
          <VillaViewer
            selectedRoom={selectedRoom}
            lightingMode={activeLighting}
            material={material}
          />
        </article>

        <aside className="panel room-details">
          <h2>Room Details</h2>
          {selectedRoom ? (
            <div>
              <h3>{selectedRoom.name}</h3>
              <dl>
                <div><dt>Area</dt><dd>{selectedRoom.area} m²</dd></div>
                <div><dt>Floor</dt><dd>{selectedRoom.floor}</dd></div>
              </dl>
              <p>
                Portfolio metadata. The current v0.2 hero GLB contains named room anchors used by the viewer to change focus.
              </p>
            </div>
          ) : (
            <p>Select a room.</p>
          )}
        </aside>
      </section>

      <section className="lower-grid">
        <AIPropertyAssistant />
        <MaterialSwitcher onChange={setMaterial} />
        <InvestorMode />
      </section>

      <footer>
        <span>Lighting: {activeLighting.name}</span>
        <span>Material: {material?.name ?? 'Original hero materials'}</span>
        <span>Concept portfolio — not construction documentation</span>
      </footer>
    </main>
  );
}
