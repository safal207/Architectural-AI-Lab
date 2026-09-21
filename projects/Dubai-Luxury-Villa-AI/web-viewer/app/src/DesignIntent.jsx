import { useId, useRef, useState } from 'react';
import './DesignIntent.css';
import study from '../data/design-study.json';

const GESTURES = [
  {
    id: 'edges',
    number: '01',
    title: 'Deep edges',
    detail: 'A horizontal frame.',
    description: 'Projecting roof and floor planes extend beyond the glazed rooms. Their deep edges give the villa its long, layered outline beside the pool.',
    stop: 'pool',
    action: 'See the terrace in 3D',
    diagram: 'The projecting roof and floor planes are highlighted above the terrace.'
  },
  {
    id: 'thresholds',
    number: '02',
    title: 'Open thresholds',
    detail: 'A room, then a landscape.',
    description: 'Glazing connects the living space to the terrace and water beyond. The pool becomes part of the view from inside, rather than a separate scene.',
    stop: 'living',
    action: 'See the living room in 3D',
    diagram: 'The glazed threshold and the pool are highlighted as a connected sequence.'
  },
  {
    id: 'timber',
    number: '03',
    title: 'A timber thread',
    detail: 'One material, different scales.',
    description: 'Vertical timber elements on the façade find an echo in the kitchen island and interior joinery. Warm wood brings a shared character to the two levels.',
    stop: 'dining',
    action: 'See the kitchen in 3D',
    diagram: 'The timber fins and soffit are highlighted at their actual positions on the upper façade. Interior joinery can be viewed in the kitchen tour.'
  }
];

function ConceptDiagram({ active, id }) {
  const anchor = study.landmarks[active.id].svg;
  const label = { edges: [645, 100], thresholds: [678, 424], timber: [75, 225] }[active.id];
  const elbow = active.id === 'thresholds' ? study.landmarks.pool.svg : [anchor[0], label[1]];
  const endX = label[0] + (label[0] < anchor[0] ? 18 : -18);
  return (
    <figure className="design-intent__figure">
      <svg
        className={`design-intent__diagram design-intent__diagram--${active.id}`}
        viewBox={study.viewBox.join(' ')}
        role="img"
        aria-labelledby={`${id}-diagram-title`}
        aria-describedby={`${id}-diagram-description`}
        data-source-model-sha={study.sources['public/villa.glb']}
        data-projection={study.projection}
      >
        <title id={`${id}-diagram-title`}>The residence: an axonometric view of the current model</title>
        <desc id={`${id}-diagram-description`}>{active.diagram} Exterior geometry and proportions come from the current 3D model. Furniture and planting are omitted for clarity.</desc>
        <image
          href={`${import.meta.env.BASE_URL}${study.images[active.id].path}`}
          width="720" height="480"
          aria-hidden="true"
        />
        <g className="design-intent__annotation" aria-hidden="true">
          <path d={`M${anchor.join(' ')} L${elbow.join(' ')} L${endX} ${label[1]}`} />
          <circle className="design-intent__anchor" cx={anchor[0]} cy={anchor[1]} r="3" />
          <circle cx={label[0]} cy={label[1]} r="17" />
          <text x={label[0]} y={label[1] + 4.5}>{active.number}</text>
        </g>
      </svg>
      <figcaption><span>Design intent / {active.number}</span><span>From the current 3D model</span></figcaption>
    </figure>
  );
}

export default function DesignIntent({ onEnterSpace }) {
  const id = useId();
  const tabRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = GESTURES[activeIndex];

  function handleTabKey(event, index) {
    let next = index;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % GESTURES.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + GESTURES.length - 1) % GESTURES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = GESTURES.length - 1;
    else return;
    event.preventDefault();
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="design-intent section-wrap" id="design" aria-labelledby={`${id}-title`}>
      <header className="design-intent__intro">
        <div><p className="eyebrow">01 / The architectural idea</p><h2 id={`${id}-title`}>A house in<br /><em>three gestures.</em></h2></div>
        <p>Two levels, held together by a small set of decisions: a deep horizontal edge, a view towards water, and the rhythm of timber.</p>
      </header>

      <dl className="design-intent__facts">
        <div><dt>Location</dt><dd>Dubai, UAE</dd></div>
        <div><dt>Stage</dt><dd>Concept study</dd></div>
        <div><dt>Scope</dt><dd>Architecture & interiors</dd></div>
        <div><dt>Organisation</dt><dd>Two levels</dd></div>
      </dl>

      <div className="design-intent__study">
        <ConceptDiagram active={active} id={id} />
        <div className="design-intent__reader">
          <div className="design-intent__tabs" role="tablist" aria-label="Architectural gestures" aria-orientation="vertical">
            {GESTURES.map((gesture, index) => (
              <button
                key={gesture.id}
                ref={(element) => { tabRefs.current[index] = element; }}
                id={`${id}-tab-${gesture.id}`}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-controls={`${id}-panel`}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => handleTabKey(event, index)}
              >
                <span className="design-intent__tab-number" aria-hidden="true">{gesture.number}</span>
                <span>{gesture.title}</span>
                <span className="design-intent__tab-arrow" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <div className="design-intent__panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active.id}`} tabIndex={0}>
            <h3>{active.detail}</h3>
            <p>{active.description}</p>
            <button className="design-intent__enter" type="button" onClick={() => onEnterSpace(active.stop)}>{active.action}<span aria-hidden="true">↗</span></button>
          </div>
        </div>
      </div>
    </section>
  );
}
