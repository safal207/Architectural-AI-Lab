import { MATERIAL_PALETTES } from './materialPalettes';
import { TOUR_STOPS } from './tourData';
import './LivingPoolShowcase.css';

const SHOWCASE_STOPS = ['living', 'pool'].map((id) => TOUR_STOPS.find((stop) => stop.id === id));
const COMPARISON_PALETTES = MATERIAL_PALETTES.filter((palette) => ['warm-limestone', 'graphite-mineral'].includes(palette.id));

/** A manually selected two-view finish study using the studio's shared state. */
export default function LivingPoolShowcase({ activeStopId, tourActive, material, onSelectStop, onSelectMaterial }) {
  return (
    <section className="living-pool-showcase" id="living-pool-showcase" aria-label="Living room and pool finish comparison">
      <div className="living-pool-showcase__intro">
        <p className="living-pool-showcase__eyebrow">A short introduction</p>
        <h3>Living room <em>&amp; pool.</em></h3>
        <p>Start inside, then open the terrace view. Select each view at your own pace.</p>
      </div>
      <div className="living-pool-showcase__group" role="group" aria-labelledby="showcase-views-title">
        <p className="living-pool-showcase__label" id="showcase-views-title">Two views of the residence</p>
        <div className="living-pool-showcase__options">
          {SHOWCASE_STOPS.map((stop, index) => (
            <button key={stop.id} type="button" aria-pressed={tourActive && activeStopId === stop.id} onClick={(event) => onSelectStop(stop, event)}>
              {index + 1}. {stop.title}
            </button>
          ))}
        </div>
      </div>
      <div className="living-pool-showcase__group" role="group" aria-labelledby="showcase-finishes-title">
        <p className="living-pool-showcase__label" id="showcase-finishes-title">Compare two finish directions</p>
        <div className="living-pool-showcase__options">
          {COMPARISON_PALETTES.map((palette) => (
            <button key={palette.id} type="button" aria-pressed={material.id === palette.id} onClick={(event) => onSelectMaterial(palette, event)}>
              <span className="living-pool-showcase__swatch" style={{ backgroundColor: palette.swatch }} aria-hidden="true" />
              <span>{palette.name}</span>
            </button>
          ))}
        </div>
        <p className="living-pool-showcase__current" aria-live="polite">Selected finish: {material.name}</p>
      </div>
    </section>
  );
}
