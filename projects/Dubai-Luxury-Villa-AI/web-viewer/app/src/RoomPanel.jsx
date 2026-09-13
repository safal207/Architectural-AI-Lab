const rooms = [
  {
    name: 'Living Room',
    area: 75,
    floor: 1
  },
  {
    name: 'Master Bedroom',
    area: 52,
    floor: 2
  }
];

export default function RoomPanel() {
  return (
    <section>
      <h2>Rooms</h2>
      {rooms.map((room) => (
        <div key={room.name}>
          {room.name}: {room.area} sqm (Floor {room.floor})
        </div>
      ))}
    </section>
  );
}
