import rooms from '../data/rooms.json';

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
