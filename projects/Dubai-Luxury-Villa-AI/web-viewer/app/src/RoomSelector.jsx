import rooms from '../data/rooms.json';

/** Render room shortcuts with a parent-controlled selected ID and pass the chosen room to onSelect. */
export default function RoomSelector({ onSelect, selectedId }) {
  return (
    <div className="room-selector">
      {rooms.rooms.map((room) => (
        <button type="button" key={room.id} aria-pressed={room.id === selectedId} onClick={() => onSelect(room)}>
          {room.name} — {room.area} sqm
        </button>
      ))}
    </div>
  );
}
