import { useEffect, useState } from "react";

const MATERIALS = [
  {
    id: "warm-limestone",
    name: "Warm Limestone",
    description: "Ivory plaster, warm limestone and walnut remain distinct instead of collapsing into one pale tint.",
    swatch: "#c7b79f",
    familyColors: {
      stone: "#b9a083",
      plaster: "#d7d0c3",
      timber: "#5d3a27",
      deck: "#8d7b68"
    }
  },
  {
    id: "sandstone",
    name: "Sandstone Warmth",
    description: "Muted travertine and sand tones with darker timber for a calm residential presentation.",
    swatch: "#b79570",
    familyColors: {
      stone: "#b58f68",
      plaster: "#c8b89f",
      timber: "#68412b",
      deck: "#88705c"
    }
  },
  {
    id: "graphite-mineral",
    name: "Graphite Mineral",
    description: "Warm mineral contrast with restrained graphite stone while plaster and timber keep their own identity.",
    swatch: "#655f58",
    familyColors: {
      stone: "#56514b",
      plaster: "#aaa49a",
      timber: "#4b3025",
      deck: "#625d56"
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
        Presentation mood control. Each preset now preserves separate stone, plaster, timber and deck families instead of tinting every architectural finish as one surface.
      </p>
    </section>
  );
}
