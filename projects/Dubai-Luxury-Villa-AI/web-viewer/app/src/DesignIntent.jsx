import { useId, useRef, useState } from 'react';
import './DesignIntent.css';

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
    diagram: 'Vertical façade elements and interior timber joinery are highlighted across the two levels.'
  }
];

function ConceptDiagram({ active, id }) {
  return (
    <figure className="design-intent__figure">
      <svg
        className={`design-intent__diagram design-intent__diagram--${active.id}`}
        viewBox="0 0 720 430"
        role="img"
        aria-labelledby={`${id}-diagram-title`}
        aria-describedby={`${id}-diagram-description`}
      >
        <title id={`${id}-diagram-title`}>The residence: a conceptual axonometric study</title>
        <desc id={`${id}-diagram-description`}>{active.diagram} This simplified diagram is not a measured drawing.</desc>

        <g className="design-intent__site-lines">
          <path d="M47 307H472L658 199M91 363H528L678 276" />
          <path d="M88 288L254 192M585 249L645 214" />
        </g>
        <g className="design-intent__building">
          <path className="design-intent__side" d="M468 198L580 132V225L468 291Z" />
          <path className="design-intent__front" d="M145 198H468V291H145Z" />
          <path className="design-intent__glass" d="M227 205H456V283H227Z" />
          <path className="design-intent__mullions" d="M284 205V283M342 205V283M399 205V283" />
          <path className="design-intent__interior-timber" d="M317 253H414V275H317Z" />
          <path className="design-intent__joinery-lines" d="M329 255V272M342 255V272M355 255V272M368 255V272M381 255V272M394 255V272M407 255V272" />

          <path className="design-intent__plane" d="M126 191H478L600 120H248Z" />
          <path className="design-intent__plane-edge" d="M126 191V198H478L600 127V120M478 191V198" />
          <path className="design-intent__side" d="M460 101L550 49V135L460 187Z" />
          <path className="design-intent__front" d="M210 101H460V187H210Z" />
          <path className="design-intent__glass" d="M288 111H449V178H288Z" />
          <path className="design-intent__mullions" d="M341 111V178M395 111V178" />
          <path className="design-intent__balcony" d="M276 160H463L509 133M276 160V187M463 160V187M509 133V159" />
          <path className="design-intent__facade-timber" d="M214 103V187M225 103V187M236 103V187M247 103V187M258 103V187M269 103V187" />
          <path className="design-intent__plane" d="M194 94H467L569 35H296Z" />
          <path className="design-intent__plane-edge" d="M194 94V101H467L569 42V35M467 94V101" />
          <path className="design-intent__pool" d="M195 357H490L586 302H291Z" />
          <path className="design-intent__pool-line" d="M218 347H487L563 311" />
        </g>

        <g className="design-intent__annotation design-intent__annotation--edges" aria-hidden="true">
          <path d="M521 71L592 71L616 47" />
          <circle cx="628" cy="35" r="17" /><text x="628" y="40">01</text>
        </g>
        <g className="design-intent__annotation design-intent__annotation--thresholds" aria-hidden="true">
          <path d="M343 267L379 326L615 326" />
          <circle cx="635" cy="326" r="17" /><text x="635" y="331">02</text>
        </g>
        <g className="design-intent__annotation design-intent__annotation--timber" aria-hidden="true">
          <path d="M239 143H127L100 117" />
          <circle cx="86" cy="103" r="17" /><text x="86" y="108">03</text>
        </g>
      </svg>
      <figcaption><span>Design intent / {active.number}</span><span>Concept diagram · Not to scale</span></figcaption>
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
