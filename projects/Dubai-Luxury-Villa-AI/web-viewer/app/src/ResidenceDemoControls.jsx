import './ResidenceDemo.css';
const time = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export default function ResidenceDemoControls({ demo, ready }) {
  return (
    <section className="residence-demo" aria-label="Residence demo controls" data-demo-active={demo.active ? 'true' : 'false'}>
      <div className="residence-demo__intro">
        <div><span className="eyebrow">A journey through the residence</span><h3>From the front door<br /><em>to a bird’s-eye view.</em></h3></div>
        <p>Entry → living room → kitchen → upstairs → pool terrace → 360° drone orbit.</p>
      </div>
      <div className="residence-demo__actions">
        <button type="button" className="residence-demo__play" disabled={!ready} onClick={() => demo.start('house')}>{demo.reduced ? 'View demo scenes' : 'Play house + drone demo'} <span aria-hidden="true">↗</span></button>
        <button type="button" disabled={!ready} onClick={() => demo.start('orbit')}>Drone orbit only</button>
      </div>
      {demo.active && <>
        <div className="residence-demo__progress"><progress max={demo.duration || 1} value={demo.seconds} aria-label="Demo progress" /><span>{time(demo.seconds)} / {time(demo.duration)}</span></div>
        <p className="residence-demo__status" role="status" aria-live="polite">{demo.title}{demo.cut ? ' · Scene cut at a model surface' : ''}{demo.reason ? ` · ${demo.reason}` : ''}{demo.state === 'completed' ? ' · Demo complete' : ''}</p>
        <div className="residence-demo__transport" role="group" aria-label="Demo playback">
          <button type="button" onClick={demo.previous} disabled={demo.chapter === 0} aria-label="Previous demo scene">←</button>
          <span>{demo.chapter + 1} / {demo.chapters}</span>
          <button type="button" onClick={demo.next} disabled={demo.chapter >= demo.chapters - 1} aria-label="Next demo scene">→</button>
          {!demo.reduced && (demo.state === 'playing' ? <button type="button" onClick={demo.pause}>Pause demo</button> : demo.state === 'paused' ? <button type="button" onClick={demo.resume}>Resume demo</button> : null)}
          <button type="button" onClick={demo.stop}>Exit demo</button>
        </div>
      </>}
      {demo.error && <p role="alert">{demo.error}</p>}
      <p className="residence-demo__note">{demo.reduced ? 'Reduced motion: still scenes, advanced by you. ' : 'Starts only when you press Play. ' }Closed surfaces use scene cuts. Concept route, not a collision simulation.</p>
    </section>
  );
}
