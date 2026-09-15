import roomData from "../data/rooms.json";

const rooms = roomData.rooms ?? [];

function totalArea() {
  return rooms.reduce((sum, room) => sum + room.area, 0);
}

export default function InvestorMode() {
  const total = totalArea();
  const floors = [...new Set(rooms.map((room) => room.floor))].length;
  const largest = [...rooms].sort((a, b) => b.area - a.area)[0];

  return (
    <section className="investor-mode" aria-label="Investor presentation summary">
      <div>
        <p className="investor-mode__label">Investor Mode</p>
        <h2>Dubai Luxury Villa AI</h2>
        <p>
          Portfolio digital-twin concept for luxury real-estate presentation.
          Figures below describe only the rooms currently included in the prototype dataset.
        </p>
      </div>

      <div className="investor-mode__stats" aria-label="Prototype metrics">
        <article className="investor-mode__stat">
          <strong>{total} m²</strong>
          <span>Listed prototype area</span>
        </article>
        <article className="investor-mode__stat">
          <strong>{rooms.length}</strong>
          <span>Modelled spaces</span>
        </article>
        <article className="investor-mode__stat">
          <strong>{floors}</strong>
          <span>Floors represented</span>
        </article>
        <article className="investor-mode__stat">
          <strong>{largest?.name ?? "—"}</strong>
          <span>
            Largest listed space{largest ? ` · ${largest.area} m²` : ""}
          </span>
        </article>
      </div>

      <div className="investor-mode__goals">
        <h3>Presentation goals</h3>
        <ul>
          <li>Make spatial relationships understandable before construction.</li>
          <li>Connect room metadata to the interactive 3D model.</li>
          <li>Support guided room views and material concepts.</li>
          <li>Keep assumptions and prototype limitations visible.</li>
        </ul>
      </div>

      <p className="investor-mode__boundary">
        Concept portfolio only. Not a valuation, sales forecast, BIM deliverable, or construction document.
      </p>
    </section>
  );
}
