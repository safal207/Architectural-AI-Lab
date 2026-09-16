import { useEffect, useState } from "react";

const MATERIALS = [
  {
    id: "warm-limestone",
    name: "Warm Limestone",
    description: "Warm stone, muted ivory plaster and walnut stay visibly separate under interior lighting.",
    swatch: "#b29b80",
    familyColors: {
      stone: "#9f896f",
      plaster: "#c6bdaf",
      timber: "#523322",
      deck: "#7f7061"
    }
  },
  {
    id: "sandstone",
    name: "Sandstone Warmth",
    description: "Travertine and sand tones with darker timber and quieter plaster for a calm residential presentation.",
    swatch: "#a98461",
    familyColors: {
      stone: "#9f7958",
      plaster: "#b8a68f",
      timber: "#583722",
      deck: "#745f50"
    }
  },
  {
    id: "graphite-mineral",
    name: "Graphite Mineral",
    description: "Restrained mineral contrast with warm charcoal stone while plaster and timber keep their own identity.",
    swatch: "#5c5751",
    familyColors: {
      stone: "#4d4944",
      plaster: "#8f8a83",
      timber: "#41291f",
      deck: "#55504b"
    }
  }
];

export default function MaterialSwitcher({ onChange }) {
  const [activeId, setActiveId] = useState(MATERIALS[0].id);

  useEffect(() => {
    onChange?.(MATERIALS[0]);
  }, [onChange]);

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
        Presentation mood control. Presets preserve separate stone, plaster, timber and deck families while retaining each material's original PBR maps and roughness.
      </p>
    </section>
  );
}
