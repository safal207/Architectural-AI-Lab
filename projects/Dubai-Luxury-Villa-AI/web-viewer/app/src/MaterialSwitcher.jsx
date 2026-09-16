import { useEffect, useState } from "react";

const MATERIALS = [
  {
    id: "warm-limestone",
    name: "Warm Limestone",
    description: "Warm stone, muted ivory plaster and source-textured walnut stay visibly separate under interior lighting.",
    swatch: "#b29b80",
    familyColors: {
      stone: "#9f896f",
      plaster: "#c6bdaf",
      timber: "#d7bda6",
      deck: "#7f7061"
    }
  },
  {
    id: "sandstone",
    name: "Sandstone Warmth",
    description: "Travertine and sand tones with warm walnut texture and quieter plaster for a calm residential presentation.",
    swatch: "#a98461",
    familyColors: {
      stone: "#9f7958",
      plaster: "#b8a68f",
      timber: "#cfae90",
      deck: "#745f50"
    }
  },
  {
    id: "graphite-mineral",
    name: "Graphite Mineral",
    description: "Restrained mineral contrast while the walnut diffuse texture keeps its own dark grain instead of receiving a second near-black tint.",
    swatch: "#5c5751",
    familyColors: {
      stone: "#4d4944",
      plaster: "#8f8a83",
      timber: "#b69c8c",
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
        Presentation mood control. Presets preserve source PBR maps while the viewer applies restrained family-specific roughness and normal response for stone, plaster, timber and deck. Textured walnut uses a light warm multiplier so the source grain supplies the dark value instead of being darkened twice.
      </p>
    </section>
  );
}
