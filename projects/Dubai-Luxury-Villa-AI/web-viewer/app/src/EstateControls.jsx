import './EstateControls.css';

export default function EstateControls({ sceneControls, destinations, destination, onVisit, actions, onAction, finishes, onFinish, disabled }) {
  const bathroom = destinations.find(place => place.id === 'bathroom');
  return <div className="estate-controls">
    <div className="estate-primary">
      {bathroom && <button type="button" disabled={disabled} aria-pressed={destination === bathroom.id} onClick={() => onVisit(bathroom.id)}>Bathroom + shower</button>}
    </div>
    <details className="studio-disclosure" id="scene-options"><summary>More scene controls</summary>
      {sceneControls}
    <div className="estate-wayfinding">
      <div><p className="eyebrow">A place for every day</p><h3>Discover the estate</h3></div>
      <div className="estate-destinations" role="group" aria-label="Estate destinations">
        {destinations.filter(place => place.id !== 'bathroom').map(place => <button key={place.id} type="button" disabled={disabled} aria-pressed={destination === place.id} onClick={() => onVisit(place.id)}><span>{place.label}</span>{place.floor && <small>{place.floor}</small>}</button>)}
      </div>
    </div>
    <div className="estate-panels">
      <details id="estate-actions-details"><summary>Open, close & play <span>Doors · windows · screens</span></summary>
        <p className="estate-help">Click a door, sliding pane or screen in the scene. These controls do the same from any view.</p>
        <div className="estate-actions">{actions.filter(action => !['style','section'].includes(action.type) && !['kitchen-style','furniture-style','bathroom-cutaway'].includes(action.id)).map(action => <button type="button" disabled={disabled} key={action.id} onClick={() => onAction(action.id)}><span>{action.label}</span><small>{action.state}</small></button>)}</div>
      </details>
      <details id="estate-finishes-details"><summary>Make it yours <span>Finishes · kitchen · furniture</span></summary>
        <div className="estate-finishes">
          <label>Terrace finish<select aria-label="Terrace finish" disabled={disabled} value={finishes.terrace} onChange={e => onFinish('terrace',e.target.value)}><option value="stone">Honed limestone</option><option value="timber">Natural timber decking</option></select></label>
          <label>Stone joints<select aria-label="Stone joints" disabled={disabled} value={finishes.joints} onChange={e => onFinish('joints',e.target.value)}><option value="large">Large format · 1.2 m</option><option value="fine">Fine grid · 0.6 m</option></select></label>
          <label>Kitchen<select aria-label="Kitchen" disabled={disabled} value={finishes.kitchenStyle} onChange={e => onFinish('kitchenStyle',e.target.value)}><option value="walnut">Walnut & warm stone</option><option value="ivory">Ivory & bronze</option><option value="graphite">Graphite & pale stone</option></select></label>
          <label>Furniture<select aria-label="Furniture" disabled={disabled} value={finishes.furnitureStyle} onChange={e => onFinish('furnitureStyle',e.target.value)}><option value="linen">Natural linen</option><option value="sage">Sage green</option><option value="charcoal">Charcoal</option></select></label>
          <label>Sports car<select aria-label="Sports car" disabled={disabled} value={finishes.carColor} onChange={e => onFinish('carColor',e.target.value)}><option value="racing-green">Racing green</option><option value="silver">Pearl silver</option><option value="red">Carmine red</option></select></label>
        </div>
      </details>
    </div>
    </details>
  </div>;
}
