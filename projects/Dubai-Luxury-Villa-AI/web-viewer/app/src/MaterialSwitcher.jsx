import { useEffect, useState } from "react";
import './MaterialSwitcher.css';

const MATERIALS = [
  {
    id: "warm-limestone",
    name: "Warm Limestone",
    description: "Soft ivory, natural stone and warm walnut.",
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
    description: "Sun-warmed mineral tones with honeyed timber.",
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
    description: "Deeper stone, soft grey and rich walnut.",
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
    <section className="material-switcher" id="materials" aria-label="Material finish moods">
      <div className="material-switcher__options">
        {MATERIALS.map((material, index) => (
          <button
            key={material.id}
            type="button"
            aria-pressed={activeId === material.id}
            onClick={() => select(material)}
            className={activeId === material.id ? "is-active" : ""}
          >
            <span className="material-switcher__samples" aria-hidden="true">
              <span className="material-switcher__sample material-switcher__sample--stone" style={{ backgroundColor: material.familyColors.stone }} />
              <span className="material-switcher__sample material-switcher__sample--plaster" style={{ backgroundColor: material.familyColors.plaster }} />
              <span className="material-switcher__sample material-switcher__sample--timber" style={{ backgroundColor: material.familyColors.timber }} />
              <span className="material-switcher__sample material-switcher__sample--deck" style={{ backgroundColor: material.familyColors.deck }} />
              <span className="material-switcher__sample-label">0{index + 1}</span>
            </span>
            <span className="material-switcher__copy">
              <strong>{material.name}</strong>
              <small>{material.description}</small>
              <span className="material-switcher__selection">{activeId === material.id ? 'Selected palette' : 'View this palette'}<span aria-hidden="true">{activeId === material.id ? '✓' : '↗'}</span></span>
            </span>
          </button>
        ))}
      </div>
      <p className="material-switcher__note">
        Stone · Plaster · Timber · Decking — concept finishes, seen in the light you choose.
      </p>
    </section>
  );
}
