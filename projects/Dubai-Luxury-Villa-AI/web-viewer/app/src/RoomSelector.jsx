import rooms from '../data/rooms.json';

export default function RoomSelector({ onSelect }) {
  return (
    <div>
      {rooms.rooms.map((room) => (
        <button key={room.id} onClick={() => onSelect(room)}>
          {room.name} — {room.area} sqm
        </button>
      ))}
    </div>
  );
}
