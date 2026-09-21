import { useState } from 'react';
import roomsData from '../data/rooms.json';
import DeveloperCase from './DeveloperCase';
import TourExperience from './TourExperience';
import VillaViewer from './VillaViewer';
import RoomSelector from './RoomSelector';
import AIPropertyAssistant from './AIPropertyAssistant';
import MaterialSwitcher from './MaterialSwitcher';
import InvestorMode from './InvestorMode';
import { lightingModes } from './DayNightMode';
import { TOUR_STOPS } from './tourData';

function initialLightingMode() {
  const requested = new URLSearchParams(window.location.search).get('lighting');
  return requested && lightingModes[requested] ? requested : 'evening';
}

export default function Dashboard() {
  const rooms = roomsData.rooms ?? [];
  const [selectedRoom, setSelectedRoom] = useState(rooms[0] ?? null);
  const [material, setMaterial] = useState(null);
  const [lightingMode, setLightingMode] = useState(initialLightingMode);
  const [tourMode, setTourMode] = useState(false);
  const [activeTourStopId, setActiveTourStopId] = useState('overview');
  const activeLighting = lightingModes[lightingMode] ?? lightingModes.day;

  const selectTourStop = (stop) => {
    setActiveTourStopId(stop.id);
    setTourMode(stop.id !== 'overview');
    if (stop.roomId) {
      const room = rooms.find((item) => item.id === stop.roomId);
      if (room) setSelectedRoom(room);
    }
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
    const roomStops = { 'living-room': 'living', 'master-bedroom': 'master', 'pool-terrace': 'pool' };
    const matchingStop = TOUR_STOPS.find((stop) => stop.id === roomStops[room?.id]);
    if (matchingStop) selectTourStop(matchingStop);
  };

  const toggleTourMode = (enabled) => {
    setTourMode(enabled);
    if (enabled && activeTourStopId === 'overview') {
      const entry = TOUR_STOPS.find((stop) => stop.id === 'entry');
      if (entry) selectTourStop(entry);
    }
  };

  return (
    <main className="app-shell">
      <DeveloperCase />

      <TourExperience
        activeStopId={activeTourStopId}
        onSelectStop={selectTourStop}
        tourMode={tourMode}
        onToggleTourMode={toggleTourMode}
      />

      <header className="viewer-toolbar" id="viewer">
        <div>
          <p className="eyebrow">Explore the residence</p>
          <h2>Dubai Luxury Villa AI</h2>
          <p>
            Step inside, choose a room and discover the villa in a different light.
          </p>
        </div>
        <nav aria-label="Lighting mode">
          {Object.entries(lightingModes).map(([key, mode]) => (
            <button
              key={key}
              type="button"
              className={lightingMode === key ? 'is-active' : ''}
              aria-pressed={lightingMode === key}
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
          <RoomSelector onSelect={selectRoom} />
        </aside>

        <article className="viewer-panel">
          <VillaViewer
            selectedRoom={selectedRoom}
            lightingMode={activeLighting}
            material={material}
            tourMode={tourMode}
            activeTourStopId={activeTourStopId}
            onSelectTourStop={selectTourStop}
            onExitTour={() => toggleTourMode(false)}
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
                Concept areas for the selected room. Explore the floor plan to see how the spaces connect.
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
        <span>View: {tourMode ? 'Bounded first-person' : 'Orbit'}</span>
        <span>Concept portfolio — not construction documentation</span>
      </footer>
    </main>
  );
}
