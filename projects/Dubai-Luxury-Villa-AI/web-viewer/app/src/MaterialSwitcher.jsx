import { useState } from "react";

const MATERIALS = [
  {
    id: "warm-limestone",
    name: "Warm Limestone",
    description: "Soft ivory mineral mood that keeps the villa warm instead of paper-white.",
    swatch: "#d3c7b5"
  },
  {
    id: "sandstone",
    name: "Sandstone Warmth",
    description: "Muted sand and travertine mood for a calm residential presentation.",
    swatch: "#b99b78"
  },
  {
    id: "graphite-mineral",
    name: "Graphite Mineral",
    description: "Deep warm graphite without the blue-black cast of a generic dark theme.",
    swatch: "#625c55"
  }
];

export default function MaterialSwitcher({ onChange }) {
  const [activeId, setActiveId] = useState(MATERIALS[0].id);

  function select(material) {
    setActiveId(material.id);
    onChange?.(material);
  }

  return (
    <section className="material-switcher" aria-label="Material finish moods">
      <h2>Finish Moods</h2>
      <div className="material-switcher__options">
        {MATERIALS.map((material) => (
          <button
            key={material.id}
            type="button"
            aria-pressed={activeId === material.id}
            onClick={() => select(material)}
            className={activeId === material.id ? "is-active" : ""}
          >
            <span
              aria-hidden="true"
              className="material-switcher__swatch"
              style={{ backgroundColor: material.swatch }}
            />
            <span>
              <strong>{material.name}</strong>
              <small>{material.description}</small>
            </span>
          </button>
        ))}
      </div>
      <p className="material-switcher__note">
        Presentation mood control only. The next material-family pass will separate wall, stone, timber, metal and fabric instead of tinting every architectural finish as one surface.
      </p>
    </section>
  );
}
