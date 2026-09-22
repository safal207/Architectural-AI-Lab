import { useEffect, useMemo, useState } from 'react';
import {
  FLOOR_PLAN_FURNITURE,
  FLOOR_PLAN_LIGHTS,
  FLOOR_PLAN_PORTALS,
  FLOOR_PLAN_WINDOWS,
  FLOOR_PLAN_ZONES,
  TOUR_STOPS
} from './tourData';
import './Walkthrough.css';
import './TourExperience.css';

const PLAN_LABELS = {
  entry: ['Entry', 'Arrival'],
  stair: ['Stair Hall', 'To the upper floor'],
  living: ['Living Room', '75 m²'],
  dining: ['Kitchen + Dining', 'Social zone'],
  private: ['Private Core', 'Living room view'],
  terrace: ['Pool Terrace', '46 m²'],
  landing: ['Upper Landing', 'Private level'],
  master: ['Master Bedroom', '52 m²']
};

const STOP_NOTES = {
  overview: 'See the residence, its pool and the approach to the house.',
  entry: 'A first glimpse of the spaces beyond the entrance.',
  living: 'Open living, soft furnishings and generous glazing.',
  dining: 'The kitchen island, dining table and warm pendant light.',
  'stair-ground': 'Follow the timber stair towards the private level.',
  'stair-upper': 'An open doorway leads into the master suite.',
  master: 'Layered bedding, walnut details and quiet bedside light.',
  pool: 'The infinity edge, planted terrace and desert garden.'
};

const PLAN_MODES = [
  { id: 'plan', label: 'PLAN' },
  { id: 'dollhouse', label: 'DOLLHOUSE' },
  { id: 'walk', label: 'WALK' }
];

function planMarkerForStop(stopId) {
  const stop = TOUR_STOPS.find((item) => item.id === stopId);
  if (!stop || stop.floor === 'site') return null;
  const zone = (FLOOR_PLAN_ZONES[stop.floor] ?? []).find((item) => item.tourStopId === stop.id);
  if (!zone) return null;
  return {
    floor: stop.floor,
    x: zone.x + zone.w / 2,
    y: zone.y + zone.h / 2,
    rotation: stop.id === 'stair-upper' ? -25 : stop.id === 'master' ? 90 : 15
  };
}

function routePointsForFloor(floor) {
  return TOUR_STOPS
    .filter((stop) => stop.floor === floor)
    .map((stop) => {
      const zone = (FLOOR_PLAN_ZONES[floor] ?? []).find((item) => item.tourStopId === stop.id);
      if (!zone) return null;
      return {
        stop,
        x: zone.x + zone.w / 2,
        y: zone.y + zone.h / 2
      };
    })
    .filter(Boolean);
}

/**
 * Coordinate the two-floor schematic, route list and WALK/PLAN presentation with the parent tour state.
 * The plan is a navigation aid, not measured construction geometry.
 */
export default function TourExperience({ activeStopId, onSelectStop, tourMode, onToggleTourMode, onViewStop }) {
  const activeStop = TOUR_STOPS.find((stop) => stop.id === activeStopId) ?? TOUR_STOPS[0];
  const initialFloor = activeStop.floor === 2 ? 2 : 1;
  const [floor, setFloor] = useState(initialFloor);
  const [planMode, setPlanMode] = useState('plan');

  useEffect(() => {
    if (activeStop.floor === 1 || activeStop.floor === 2) setFloor(activeStop.floor);
  }, [activeStop.floor]);

  useEffect(() => {
    if (!tourMode) setPlanMode((mode) => mode === 'walk' ? 'plan' : mode);
  }, [tourMode]);

  const floorZones = useMemo(() => FLOOR_PLAN_ZONES[floor] ?? [], [floor]);
  const furniture = FLOOR_PLAN_FURNITURE[floor] ?? [];
  const portals = FLOOR_PLAN_PORTALS[floor] ?? [];
  const windows = FLOOR_PLAN_WINDOWS[floor] ?? [];
  const lights = FLOOR_PLAN_LIGHTS[floor] ?? [];
  const marker = planMarkerForStop(activeStopId);
  const routePoints = useMemo(() => routePointsForFloor(floor), [floor]);
  const visitedRoutePoints = routePoints.filter(({ stop }) => stop.order <= activeStop.order);

  const selectStop = (stopId) => {
    const stop = TOUR_STOPS.find((item) => item.id === stopId);
    if (!stop) return;
    if (stop.floor === 1 || stop.floor === 2) setFloor(stop.floor);
    onSelectStop(stop);
  };

  const activateWalk = () => {
    setPlanMode('walk');
    if (activeStop.floor === 'site') selectStop('entry');
    if (!tourMode) onToggleTourMode(true);
  };

  const selectPlanMode = (modeId) => {
    if (modeId === 'walk') {
      activateWalk();
      return;
    }
    setPlanMode(modeId);
  };

  return (
    <section className="tour-experience" id="journey" aria-label="Virtual house tour plan and client viewing graph">
      <div className="tour-experience__intro">
        <div>
          <p className="eyebrow">04 / Explore the layout</p>
          <h2>Plan your journey.</h2>
          <p>Two floors. Eight viewpoints. Start wherever you like.</p>
        </div>
        <button
          type="button"
          className={tourMode ? 'tour-mode-toggle is-active' : 'tour-mode-toggle'}
          aria-pressed={tourMode}
          onClick={() => {
            if (tourMode) onToggleTourMode(false);
            else activateWalk();
          }}
        >
          {tourMode ? 'First-person tour: ON' : 'Enter the house'}
        </button>
      </div>

      <div className="tour-experience__layout">
      <article className="house-plan-card house-plan-card--hero">
        <div className="house-plan-card__header house-plan-card__header--hero">
          <div>
            <p className="eyebrow">Concept floor plan</p>
            <h3>Floor {floor} <span className="house-plan-card__current">· {activeStop.floor === floor ? activeStop.title : 'Explore this floor'}</span></h3>
            <p className="house-plan-card__subtitle">Select a space, then open its view in the studio.</p>
            {onViewStop && <button type="button" className="plan-open-view" onClick={() => onViewStop(activeStop.id)}>Open {activeStop.title.toLowerCase()} in 3D <span aria-hidden="true">↗</span></button>}
          </div>

          <div className="house-plan-controls">
            <div className="plan-mode-switch" role="group" aria-label="Plan view mode">
              {PLAN_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={planMode === mode.id}
                  className={planMode === mode.id ? 'is-active' : ''}
                  onClick={() => selectPlanMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="floor-switch" role="group" aria-label="House floor">
              {[1, 2].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={floor === value ? 'is-active' : ''}
                  aria-pressed={floor === value}
                  onClick={() => setFloor(value)}
                >
                  Floor {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`house-plan-stage house-plan-stage--${planMode}`}>
          <div className={`house-plan house-plan--architectural house-plan--${planMode}`} aria-label={`Floor ${floor} architectural orientation plan`}>
            <div className="house-plan__sheet-label">0{floor} / CONCEPT PLAN</div>

            <svg className="house-plan__route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {routePoints.length > 1 && (
                <polyline className="house-plan__route-line" points={routePoints.map(({ x, y }) => `${x},${y}`).join(' ')} />
              )}
              {visitedRoutePoints.length > 1 && (
                <polyline className="house-plan__route-line house-plan__route-line--visited" points={visitedRoutePoints.map(({ x, y }) => `${x},${y}`).join(' ')} />
              )}
              {routePoints.map(({ stop, x, y }) => (
                <circle key={stop.id} className={stop.id === activeStopId ? 'house-plan__route-node is-active' : 'house-plan__route-node'} cx={x} cy={y} r="1.2" />
              ))}
            </svg>

            {floorZones.map((zone) => {
              const [label, meta] = PLAN_LABELS[zone.id] ?? [zone.label, zone.roomId ? 'Room' : 'Zone'];
              return (
                <button
                  key={zone.id}
                  type="button"
                  className={activeStopId === zone.tourStopId ? `house-plan__zone house-plan__zone--${zone.id} is-active` : `house-plan__zone house-plan__zone--${zone.id}`}
                  style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
                  aria-pressed={activeStopId === zone.tourStopId}
                  onClick={() => selectStop(zone.tourStopId)}
                >
                  <span className="house-plan__zone-label"><strong>{label}</strong><span>{meta}</span></span>
                </button>
              );
            })}

            {windows.map((windowItem) => (
              <div
                key={windowItem.id}
                className={`house-plan__window house-plan__window--${windowItem.orientation}`}
                style={{ left: `${windowItem.x}%`, top: `${windowItem.y}%`, '--window-length': `${windowItem.length}%` }}
                aria-hidden="true"
              />
            ))}

            {furniture.map((item) => (
              <div
                key={item.id}
                className={`house-plan__fixture house-plan__fixture--${item.kind}`}
                title={item.label || item.kind}
                style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%` }}
                aria-hidden="true"
              >
                {item.label}
              </div>
            ))}

            {portals.map((portal) => (
              <div key={portal.id} className={`house-plan__portal house-plan__portal--${portal.orientation}`} style={{ left: `${portal.x}%`, top: `${portal.y}%` }} title={portal.label} aria-hidden="true"><i /></div>
            ))}
            {lights.map((light) => (
              <div key={light.id} className="house-plan__light" style={{ left: `${light.x}%`, top: `${light.y}%` }} title="Lighting point" aria-hidden="true">✦</div>
            ))}

            {marker && marker.floor === floor && (
              <div className="house-plan__position" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} aria-label={`Selected stop: ${activeStop.title}`}>
                <span className="house-plan__position-pulse" />
                <span className="house-plan__heading" style={{ transform: `rotate(${marker.rotation}deg)` }} />
                <strong>YOUR VIEW</strong>
              </div>
            )}
            <div className="house-plan__north" aria-hidden="true"><b>N</b><span>↑</span></div>
          </div>
        </div>

        <div className="house-plan-legend" aria-label="Plan legend">
          <span><i className="legend-position" /> Selected stop</span>
          <span><i className="legend-furniture" /> Furniture</span>
          <span><i className="legend-door" /> Door</span>
          <span><i className="legend-window" /> Window</span>
          <span><i className="legend-light" /> Light</span>
          <span><i className="legend-stair" /> Stair</span>
        </div>
        <p className="house-plan-card__note">Concept navigation plan · Areas are indicative, not measured drawings.</p>
      </article>

      <article className="client-graph-card client-graph-card--timeline">
        <div className="client-graph-card__summary">
          <div>
            <p className="eyebrow">Your selected view</p>
            <h3>{activeStop.order}. {activeStop.title}</h3>
          </div>
          <p className="client-graph-card__description">{STOP_NOTES[activeStop.id] ?? activeStop.description}</p>
        </div>

        <ol className="client-graph client-graph--timeline">
          {TOUR_STOPS.map((stop) => (
            <li key={stop.id} className={stop.id === activeStopId ? 'is-active' : stop.order < activeStop.order ? 'is-visited' : ''}>
              <button type="button" aria-current={stop.id === activeStopId ? 'step' : undefined} onClick={() => selectStop(stop.id)}>
                <span className="client-graph__number">{String(stop.order).padStart(2, '0')}</span>
                <span><strong>{stop.title}</strong><small>{stop.floor === 'site' ? 'The residence' : `Floor ${stop.floor}`}</small></span>
                <span className="client-graph__arrow" aria-hidden="true">↗</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="client-graph-card__actions client-graph-card__actions--timeline">
          <button type="button" onClick={() => { const index = TOUR_STOPS.findIndex((stop) => stop.id === activeStopId); selectStop(TOUR_STOPS[Math.max(0, index - 1)].id); }} disabled={activeStop.order === 1}>← Previous</button>
          <button type="button" onClick={() => { const index = TOUR_STOPS.findIndex((stop) => stop.id === activeStopId); selectStop(TOUR_STOPS[Math.min(TOUR_STOPS.length - 1, index + 1)].id); }} disabled={activeStop.order === TOUR_STOPS.length}>Next stop →</button>
        </div>
      </article>
      </div>
    </section>
  );
}
