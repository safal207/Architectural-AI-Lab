import { MATERIAL_PALETTES } from './materialPalettes';
import './MaterialSwitcher.css';

/**
 * Present the parent's selected concept palette and notify it of a new selection.
 * The swatches describe material direction, not construction specifications.
 */
export default function MaterialSwitcher({ material: active, onChange }) {
  const activeId = active.id;

  return (
    <section className="material-switcher" id="materials" aria-label="Material finish moods">
      <div className="material-switcher__options">
        {MATERIAL_PALETTES.map((material, index) => (
          <button
            key={material.id}
            type="button"
            aria-pressed={activeId === material.id}
            onClick={() => onChange?.(material)}
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
      <p className="material-switcher__current" aria-live="polite"><span>Selected direction</span>{active.description}</p>
      <p className="material-switcher__note">
        Swatches: stone · plaster · timber · decking. Concept colour studies; physical samples would follow.
      </p>
    </section>
  );
}
