import './AtmosphereControls.css';

/** Compact scene controls keep weather independent from the selected time of day. */
export default function AtmosphereControls({ weather, setWeather, wind, setWind, motion, setMotion }) {
  return (
    <div className="atmosphere-controls" aria-label="Atmosphere controls">
      <div className="atmosphere-controls__weather">
        <span className="atmosphere-controls__label">The atmosphere</span>
        <div role="group" aria-label="Weather">
          <button type="button" aria-pressed={weather === 'clear'} onClick={() => setWeather('clear')}>
            <span aria-hidden="true">☀</span> Clear sky
          </button>
          <button type="button" aria-pressed={weather === 'rain'} onClick={() => setWeather('rain')}>
            <span aria-hidden="true">☂</span> Rain
          </button>
        </div>
      </div>
      <label className="atmosphere-controls__wind">
        <span>Wind <output>{wind < 0.15 ? 'Still' : wind < 0.6 ? 'Breeze' : 'Brisk'}</output></span>
        <input aria-label="Wind strength" type="range" min="0" max="1" step="0.05" value={wind} onChange={(event) => setWind(Number(event.target.value))} />
      </label>
      <button className="atmosphere-controls__motion" type="button" aria-label="Pause motion" aria-pressed={!motion} onClick={() => setMotion(!motion)}>
        <span aria-hidden="true">{motion ? 'Ⅱ' : '▷'}</span> {motion ? 'Pause motion' : 'Resume motion'}
      </button>
    </div>
  );
}
