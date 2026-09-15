import { useMemo, useState } from 'react';
import {
  FLOOR_PLAN_FURNITURE,
  FLOOR_PLAN_LIGHTS,
  FLOOR_PLAN_PORTALS,
  FLOOR_PLAN_ZONES,
  TOUR_STOPS
} from './tourData';
import { WALKTHROUGH_FEATURES } from './navigationData';
import './TourExperience.css';
import './Walkthrough.css';

export default function TourExperience({
  activeStopId,
  onSelectStop,
  tourMode,
  onToggleTourMode
}) {
  const activeStop = TOUR_STOPS.find((stop) => stop.id === activeStopId) ?? TOUR_STOPS[0];
  const initialFloor = activeStop.floor === 2 ? 2 : 1;
  const [floor, setFloor] = useState(initialFloor);

  const floorZones = useMemo(() => FLOOR_PLAN_ZONES[floor] ?? [], [floor]);
  const furniture = FLOOR_PLAN_FURNITURE[floor] ?? [];
  const portals = FLOOR_PLAN_PORTALS[floor] ?? [];
  const lights = FLOOR_PLAN_LIGHTS[floor] ?? [];

  const selectStop = (stopId) => {
    const stop = TOUR_STOPS.find((item) => item.id === stopId);
    if (!stop) return;
    if (stop.floor === 1 || stop.floor === 2) setFloor(stop.floor);
    onSelectStop(stop);
  };

  return (
    <section className="tour-experience" aria-label="Virtual house tour plan and client viewing graph">
      <div className="tour-experience__intro">
        <div>
          <p className="eyebrow">Client viewing graph</p>
          <h2>Enter the villa, understand the plan, then walk it at eye level.</h2>
          <p>
            Exterior → entry → living → kitchen and dining → staircase → upper landing → master suite → pool terrace.
          </p>
        </div>
        <button
          type="button"
          className={tourMode ? 'tour-mode-toggle is-active' : 'tour-mode-toggle'}
          aria-pressed={tourMode}
          onClick={() => onToggleTourMode(!tourMode)}
        >
          {tourMode ? 'First-person tour: ON' : 'Enter the house'}
        </button>
      </div>

      <div className="walkthrough-feature-grid" aria-label="Walkthrough capabilities">
        {WALKTHROUGH_FEATURES.map((feature) => (
          <div key={feature.id} className="walkthrough-feature">
            <strong>{feature.label}</strong>
            <span>{feature.status}</span>
          </div>
        ))}
      </div>

      <div className="tour-experience__grid">
        <article className="house-plan-card">
          <div className="house-plan-card__header">
            <div>
              <p className="eyebrow">Interactive furnished plan</p>
              <h3>Floor {floor}</h3>
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

          <div className="house-plan" aria-label={`Floor ${floor} schematic furnished plan`}>
            {floorZones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                className={activeStopId === zone.tourStopId ? 'house-plan__zone is-active' : 'house-plan__zone'}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`
                }}
                onClick={() => selectStop(zone.tourStopId)}
              >
                <strong>{zone.label}</strong>
                <span>{zone.id === 'stair' || zone.id === 'landing' ? 'Stair transition' : zone.roomId ? 'Room focus' : 'Tour point'}</span>
              </button>
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
              <div
                key={portal.id}
                className={`house-plan__portal house-plan__portal--${portal.orientation}`}
                style={{ left: `${portal.x}%`, top: `${portal.y}%` }}
                title={portal.label}
                aria-hidden="true"
              />
            ))}

            {lights.map((light) => (
              <div
                key={light.id}
                className="house-plan__light"
                style={{ left: `${light.x}%`, top: `${light.y}%` }}
                title="Lighting point"
                aria-hidden="true"
              >✦</div>
            ))}

            <div className="house-plan__north" aria-hidden="true">N ↑</div>
          </div>

          <div className="house-plan-legend" aria-label="Plan legend">
            <span><i className="legend-furniture" /> Furniture</span>
            <span><i className="legend-door" /> Door</span>
            <span><i className="legend-light" /> Light</span>
            <span><i className="legend-stair" /> Stair</span>
          </div>

          <p className="house-plan-card__note">
            Presentation schematic for navigation and spatial storytelling only — not a measured architectural or construction floor plan.
          </p>
        </article>

        <article className="client-graph-card">
          <p className="eyebrow">Guided client route</p>
          <h3>{activeStop.order}. {activeStop.title}</h3>
          <p className="client-graph-card__description">{activeStop.description}</p>

          <ol className="client-graph">
            {TOUR_STOPS.map((stop) => (
              <li key={stop.id} className={stop.id === activeStopId ? 'is-active' : ''}>
                <button type="button" onClick={() => selectStop(stop.id)}>
                  <span className="client-graph__number">{stop.order}</span>
                  <span>
                    <strong>{stop.title}</strong>
                    <small>{stop.floor === 'site' ? 'Site' : `Floor ${stop.floor}`} · {stop.feature}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="client-graph-card__actions">
            <button
              type="button"
              onClick={() => {
                const index = TOUR_STOPS.findIndex((stop) => stop.id === activeStopId);
                const previous = TOUR_STOPS[Math.max(0, index - 1)];
                selectStop(previous.id);
              }}
              disabled={activeStop.order === 1}
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => {
                const index = TOUR_STOPS.findIndex((stop) => stop.id === activeStopId);
                const next = TOUR_STOPS[Math.min(TOUR_STOPS.length - 1, index + 1)];
                selectStop(next.id);
              }}
              disabled={activeStop.order === TOUR_STOPS.length}
            >
              Next stop →
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
