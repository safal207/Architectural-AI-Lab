import { lazy, Suspense, useState } from 'react';
import roomsData from '../data/rooms.json';
import DeveloperCase from './DeveloperCase';
import DesignIntent from './DesignIntent';
import ProjectChapters from './ProjectChapters';
import TourExperience from './TourExperience';
import SceneBoundary from './SceneBoundary';
import RoomSelector from './RoomSelector';
import MaterialSwitcher from './MaterialSwitcher';
import SpaceStories from './SpaceStories';
import ProjectBrief from './ProjectBrief';
import { lightingModes } from './DayNightMode';
import { TOUR_STOPS } from './tourData';
import './ResidenceStudio.css';

const VillaViewer = lazy(() => import('./VillaViewer'));

function initialLightingMode() {
  const requested = new URLSearchParams(window.location.search).get('lighting');
  return requested && lightingModes[requested] ? requested : 'evening';
}
const roomStories = {
  'living-room': 'A generous gathering space, opening towards the pool through a glazed façade.',
  'master-bedroom': 'A quieter upper-level retreat with a private balcony and warm timber accents.',
  'pool-terrace': 'An outdoor room framed by water, low planting and the deep edges of the villa.',
};

/**
 * Own room, tour, flight, palette and lighting state for the residence portfolio.
 * Keep the lazy 3D viewer isolated so its failure leaves the gallery and brief usable.
 */
export default function Dashboard() {
  const rooms = roomsData.rooms ?? [];
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [material, setMaterial] = useState(null);
  const [lightingMode, setLightingMode] = useState(initialLightingMode);
  const [tourMode, setTourMode] = useState(false);
  const [droneMode, setDroneMode] = useState(false);
  const [activeTourStopId, setActiveTourStopId] = useState('overview');
  const [viewRequestId, setViewRequestId] = useState(0);
  const activeLighting = lightingModes[lightingMode] ?? lightingModes.day;
  const currentStop = TOUR_STOPS.find((stop) => stop.id === (tourMode ? activeTourStopId : 'overview')) ?? TOUR_STOPS[0];
  const detailRoom = tourMode && ['living', 'master', 'pool'].includes(activeTourStopId) ? selectedRoom : null;
  /**
   * Leave drone mode and synchronize the stop, tour mode and room details.
   * Increment the view request even for the same stop so repeat selection resets its camera.
   */
  const selectTourStop = (stop) => {
    setDroneMode(false);
    setViewRequestId((value) => value + 1);
    setActiveTourStopId(stop.id);
    setTourMode(stop.id !== 'overview');
    setSelectedRoom(rooms.find((item) => item.id === stop.roomId) ?? null);
  };
  /** Map a room shortcut to its authored tour stop; ignore rooms without a mapping. */
  const selectRoom = (room) => {
    const roomStops = { 'living-room': 'living', 'master-bedroom': 'master', 'pool-terrace': 'pool' };
    const stop = TOUR_STOPS.find((item) => item.id === roomStops[room?.id]);
    if (stop) selectTourStop(stop);
  };
  /** Leave drone mode and request a fresh view; entering from overview selects the entry stop. */
  const toggleTourMode = (enabled) => {
    setDroneMode(false);
    setViewRequestId((value) => value + 1);
    setTourMode(enabled);
    if (enabled && activeTourStopId === 'overview') selectTourStop(TOUR_STOPS.find((stop) => stop.id === 'entry'));
  };
  /**
   * Select a story's tour stop, transfer keyboard focus to the studio heading and reveal the viewer.
   * Respect reduced-motion preferences when scrolling.
   */
  const enterSpace = (id = 'pool') => {
    const stop = TOUR_STOPS.find((item) => item.id === id);
    if (stop) selectTourStop(stop);
    document.getElementById('experience-title')?.focus({ preventScroll: true });
    document.getElementById('viewer')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return (
    <main className="app-shell" id="top">
      <a className="skip-link" href="#viewer">Skip to the interactive residence</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Architectural AI Lab home"><span className="brand-mark" aria-hidden="true">a<span> / </span>a</span><span>ARCHITECTURAL<br />AI LAB</span></a>
        <nav aria-label="Main navigation"><a href="#design">The concept</a><a href="#spaces">Spaces</a><a href="#viewer">Experience</a></nav>
        <a className="header-brief" href="#brief">Your project <span aria-hidden="true">↗</span></a>
      </header>
      <DeveloperCase onEnter={() => enterSpace()} />
      <ProjectChapters />
      <DesignIntent onEnterSpace={enterSpace} />
      <SpaceStories onEnter={enterSpace} />
      <section className="experience-section" id="viewer" aria-labelledby="experience-title">
        <header className="viewer-toolbar">
          <div><p className="eyebrow">03 / The residence studio</p><h2 id="experience-title" tabIndex={-1}>Make yourself <em>at home.</em></h2><p>Move between rooms. Compare finishes. See the light change.</p></div>
          <div className="lighting-control"><span className="control-label">The time of day</span><nav aria-label="Lighting mode">
            {Object.entries(lightingModes).map(([key, mode]) => <button key={key} type="button" className={lightingMode === key ? 'is-active' : ''} aria-pressed={lightingMode === key} onClick={() => setLightingMode(key)}><span className={`light-symbol light-symbol--${key}`} aria-hidden="true" />{mode.name}</button>)}
          </nav></div>
        </header>
        <section className="app-grid">
          <aside className="rooms-panel">
            <span className="control-label">Go directly to</span>
            <RoomSelector onSelect={selectRoom} selectedId={detailRoom?.id} />
            <button className="kitchen-shortcut" type="button" aria-pressed={tourMode && activeTourStopId === 'dining'} onClick={() => selectTourStop(TOUR_STOPS.find((stop) => stop.id === 'dining'))}>Kitchen + dining</button>
            <button className="overview-button" type="button" onClick={() => selectTourStop(TOUR_STOPS[0])}>Exterior overview <span aria-hidden="true">↗</span></button>
          </aside>
          <div className="residence-workbench">
            <article className="viewer-panel">
              <SceneBoundary><Suspense fallback={<div className="scene-placeholder" role="status"><span className="eyebrow">Preparing your visit</span><p>Opening the residence…</p></div>}>
                <VillaViewer droneMode={droneMode} setDroneMode={setDroneMode} viewRequestId={viewRequestId} selectedRoom={selectedRoom} lightingMode={activeLighting} material={material} tourMode={tourMode} activeTourStopId={activeTourStopId} onSelectTourStop={selectTourStop} onExitTour={() => toggleTourMode(false)} />
              </Suspense></SceneBoundary>
            </article>
            <aside className="material-story material-study" aria-labelledby="material-title">
              <div className="material-study__intro"><p className="eyebrow">Finish study</p><h3 id="material-title">One house.<br /><em>Three expressions.</em></h3><p>Choose a palette to see stone, plaster, timber and decking change together.</p></div>
              <p className="material-study__mobile-title"><span>Finish palette</span><span>Changes the 3D view</span></p>
              <MaterialSwitcher onChange={setMaterial} />
              <a href="#brief" className="material-study__brief">Take this direction into your brief <span aria-hidden="true">↗</span></a>
            </aside>
          </div>
          <aside className="room-details" aria-live="polite">
            <div><span className="eyebrow">A closer look</span><h3>{detailRoom?.name ?? currentStop.title}</h3></div>
            <p>{detailRoom ? roomStories[detailRoom.id] : currentStop.description}</p>
            <dl>{detailRoom && <div><dt>Concept area</dt><dd>{detailRoom.area} <span>m²</span></dd></div>}<div><dt>{currentStop.floor === 'site' ? 'Levels' : 'Level'}</dt><dd>{currentStop.floor === 'site' ? '02' : `0${currentStop.floor}`}</dd></div></dl>
          </aside>
        </section>
        <div className="experience-status"><span>Lighting: {activeLighting.name}</span><span>Material: {material?.name ?? 'Original hero materials'}</span><a href="#journey">Explore the floor plan <span aria-hidden="true">↓</span></a></div>
      </section>
      <section className="journey-section section-wrap" aria-label="Floor plan and route"><TourExperience activeStopId={activeTourStopId} onSelectStop={selectTourStop} tourMode={tourMode && !droneMode} onToggleTourMode={toggleTourMode} onViewStop={enterSpace} /></section>
      <ProjectBrief material={material} lighting={activeLighting.name} />
      <footer className="site-footer"><a className="footer-wordmark" href="#top">Architectural AI Lab <span aria-hidden="true">↗</span></a><div><span>Dubai residence · Concept portfolio</span><span>Architecture / Kitchens / Interiors</span></div><p>Architectural studies and interactive visualisations.<br />Concept plans and areas; not construction documentation.</p><a href="https://github.com/safal207/Architectural-AI-Lab" target="_blank" rel="noreferrer">Project archive ↗</a></footer>
    </main>
  );
}
