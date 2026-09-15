import { useState } from "react";

const MATERIALS = [
  {
    id: "classic-marble",
    name: "Classic Marble",
    description: "Light stone palette for a premium interior presentation.",
    swatch: "#e8e1d6"
  },
  {
    id: "warm-wood",
    name: "Warm Wood",
    description: "Natural timber accents for a softer residential atmosphere.",
    swatch: "#a8784f"
  },
  {
    id: "dark-stone",
    name: "Dark Stone",
    description: "Graphite stone surfaces for an evening luxury concept.",
    swatch: "#3d4147"
  }
];

export default function MaterialSwitcher({ onChange }) {
  const [activeId, setActiveId] = useState(MATERIALS[0].id);

  function select(material) {
    setActiveId(material.id);
    onChange?.(material);
  }

  return (
    <section className="material-switcher" aria-label="Material variants">
      <h2>Material Variants</h2>
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
        Presentation control: only the allow-listed v0.3 architectural finish materials are tinted. Glass, water, metal and Life-stage landscape materials remain protected.
      </p>
    </section>
  );
}
