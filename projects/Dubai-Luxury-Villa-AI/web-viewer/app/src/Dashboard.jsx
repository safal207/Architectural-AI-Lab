import { useState } from 'react';
import roomsData from '../data/rooms.json';
import RoomSelector from './RoomSelector';
import AIPropertyAssistant from './AIPropertyAssistant';
import MaterialSwitcher from './MaterialSwitcher';
import InvestorMode from './InvestorMode';

export default function Dashboard() {
  const rooms = roomsData.rooms ?? [];
  const [selectedRoom, setSelectedRoom] = useState(rooms[0] ?? null);
  const [material, setMaterial] = useState(null);

  return (
    <main>
      <header>
        <p>Architectural-AI-Lab</p>
        <h1>Dubai Luxury Villa AI</h1>
        <p>Interactive digital-twin portfolio prototype</p>
      </header>

      <section>
        <aside>
          <h2>Rooms</h2>
          <RoomSelector onSelect={setSelectedRoom} />
        </aside>

        <article>
          <h2>3D Viewer</h2>
          <p>The live GLB canvas will be mounted here after villa.glb is added.</p>
        </article>

        <aside>
          <h2>Room Details</h2>
          {selectedRoom ? (
            <div>
              <h3>{selectedRoom.name}</h3>
              <p>{selectedRoom.area} m² · Floor {selectedRoom.floor}</p>
            </div>
          ) : (
            <p>Select a room.</p>
          )}
        </aside>
      </section>

      <section>
        <AIPropertyAssistant />
        <MaterialSwitcher onChange={setMaterial} />
        <InvestorMode />
      </section>

      <footer>
        Material concept: {material?.name ?? 'Classic Marble'} · Portfolio prototype
      </footer>
    </main>
  );
}
