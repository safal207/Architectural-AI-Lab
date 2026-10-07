import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import roomsData from '../data/rooms.json';
import DeveloperCase from './DeveloperCase';
import DesignIntent from './DesignIntent';
import TourExperience from './TourExperience';
import SceneBoundary from './SceneBoundary';
import RoomSelector from './RoomSelector';
import MaterialSwitcher from './MaterialSwitcher';
import { DEFAULT_MATERIAL_PALETTE } from './materialPalettes';
import SpaceStories from './SpaceStories';
import ResidenceFilm from './ResidenceFilm';
import ProjectBrief from './ProjectBrief';
import { lightingModes } from './DayNightMode';
import { TOUR_STOPS } from './tourData';
import './ResidenceStudio.css';
import './LandingSimplicity.css';

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
  const [material, setMaterial] = useState(DEFAULT_MATERIAL_PALETTE);
  const [lightingMode, setLightingMode] = useState(initialLightingMode);
  const [tourMode, setTourMode] = useState(false);
  const [droneMode, setDroneMode] = useState(false);
  const [guidedViewActive, setGuidedViewActive] = useState(false);
  const [activeTourStopId, setActiveTourStopId] = useState('overview');
  const [viewRequestId, setViewRequestId] = useState(0);
  const [viewerActivated, setViewerActivated] = useState(false);
  const viewerSectionRef = useRef(null);
  const activeLighting = lightingModes[lightingMode] ?? lightingModes.day;
  const currentStop = TOUR_STOPS.find((stop) => stop.id === (tourMode ? activeTourStopId : 'overview')) ?? TOUR_STOPS[0];
  const inspirationStop = activeTourStopId === 'overview' ? null : TOUR_STOPS.find((stop) => stop.id === activeTourStopId);
  const detailRoom = tourMode && !droneMode && guidedViewActive && ['living', 'master', 'pool'].includes(activeTourStopId) ? selectedRoom : null;
  useEffect(() => {
    const section = viewerSectionRef.current;
    if (!section || viewerActivated) return undefined;
    if (!('IntersectionObserver' in window)) {
      setViewerActivated(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setViewerActivated(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, [viewerActivated]);
  useEffect(() => {
    const revealHash = () => {
      let id;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = id && document.getElementById(id);
      if (!target) return;
      for (let parent = target.parentElement; parent; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS') parent.open = true;
      }
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
    };
    const revealAnchor = (event) => {
      const anchor = event.target.closest?.('a[href^="#"]');
      if (!anchor) return;
      // A second click on the current fragment does not emit hashchange.
      if (anchor.hash === window.location.hash) revealHash();
    };
    revealHash();
    window.addEventListener('hashchange', revealHash);
    document.addEventListener('click', revealAnchor);
    return () => {
      window.removeEventListener('hashchange', revealHash);
      document.removeEventListener('click', revealAnchor);
    };
  }, []);
  /**
   * Leave drone mode and synchronize the stop, tour mode and room details.
   * Increment the view request even for the same stop so repeat selection resets its camera.
   */
  const selectTourStop = (stop) => {
    setViewerActivated(true);
    setDroneMode(false);
    setViewRequestId((value) => value + 1);
    setActiveTourStopId(stop.id);
    setTourMode(stop.id !== 'overview');
    setSelectedRoom(rooms.find((item) => item.id === stop.roomId) ?? null);
  };
  /** Reveal the scene for a narrow-screen tap while retaining keyboard focus on its control. */
  const revealShowcaseView = (event) => {
    if (event.detail > 0 && window.matchMedia('(max-width: 850px)').matches) {
      const scene = document.querySelector('#viewer .three-canvas-shell')
        ?? document.querySelector('#viewer .viewer-panel');
      scene?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    }
  };
  /** Keep the selected ambience in the shareable URL without navigating or adding history entries. */
  const selectLightingMode = (key) => {
    setLightingMode(key);
    const url = new URL(window.location.href);
    url.searchParams.set('lighting', key);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };
  /** Map a room shortcut to its authored tour stop; ignore rooms without a mapping. */
  const selectRoom = (room) => {
    const roomStops = { 'living-room': 'living', 'master-bedroom': 'master', 'pool-terrace': 'pool' };
    const stop = TOUR_STOPS.find((item) => item.id === roomStops[room?.id]);
    if (stop) selectTourStop(stop);
  };
  /** Leave drone mode and request a fresh view; entering from overview selects the entry stop. */
  const toggleTourMode = (enabled) => {
    if (enabled) setViewerActivated(true);
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
    <main className="app-shell simple-landing" id="top">
      <a className="skip-link" href="#viewer">Skip to the interactive residence</a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Architectural AI Lab home"><span className="brand-mark" aria-hidden="true">a<span> / </span>a</span><span>ARCHITECTURAL<br />AI LAB</span></a>
        <nav aria-label="Main navigation"><a href="#spaces">Spaces</a><a href="#viewer">Explore in 3D</a><a href="#contact">Contact</a></nav>
      </header>
      <DeveloperCase onEnter={() => enterSpace()} />
      <SpaceStories onEnter={enterSpace} />
      <section className="experience-section" id="viewer" ref={viewerSectionRef} aria-labelledby="experience-title">
        <header className="viewer-toolbar">
          <div><h2 id="experience-title" tabIndex={-1}>Explore <em>the residence.</em></h2></div>
        </header>
        <section className="app-grid">
          <aside className="rooms-panel">
            <span className="control-label">Go directly to</span>
            <RoomSelector onSelect={(room, event) => { selectRoom(room); revealShowcaseView(event); }} selectedId={detailRoom?.id} />
            <button className="kitchen-shortcut" type="button" aria-pressed={tourMode && !droneMode && guidedViewActive && activeTourStopId === 'dining'} onClick={(event) => { selectTourStop(TOUR_STOPS.find((stop) => stop.id === 'dining')); revealShowcaseView(event); }}>Kitchen + dining</button>
            <button className="overview-button" type="button" onClick={() => selectTourStop(TOUR_STOPS[0])}>Exterior overview <span aria-hidden="true">↗</span></button>
          </aside>
          <div className="residence-workbench">
            <article className="viewer-panel">
              {viewerActivated ? (
                <SceneBoundary><Suspense fallback={<div className="scene-placeholder" role="status"><span className="eyebrow">Preparing your visit</span><p>Opening the residence…</p></div>}>
                  <VillaViewer droneMode={droneMode} setDroneMode={setDroneMode} viewRequestId={viewRequestId} selectedRoom={selectedRoom} lightingMode={activeLighting} material={material} tourMode={tourMode} activeTourStopId={activeTourStopId} onSelectTourStop={selectTourStop} onExitTour={() => toggleTourMode(false)} onGuidedViewActiveChange={setGuidedViewActive} />
                </Suspense></SceneBoundary>
              ) : (
                <div className="viewer-preview">
                  <img className="viewer-preview__image" src={`${import.meta.env.BASE_URL}editorial/residence-800.webp`} alt="Preview of the residence beside its pool" width="800" height="450" loading="lazy" />
                  <div className="viewer-preview__content">
                    <p className="eyebrow">Interactive residence</p>
                    <h3>Explore the spaces for yourself.</h3>
                    <p>Move through the rooms, compare finishes and see how the light changes.</p>
                    <button className="viewer-preview__open" type="button" onClick={() => {
                      document.getElementById('experience-title')?.focus({ preventScroll: true });
                      setViewerActivated(true);
                    }}>Open the interactive residence <span aria-hidden="true">↗</span></button>
                  </div>
                </div>
              )}
            </article>
          </div>
          <details className="studio-disclosure" id="view-details"><summary>About this view</summary><aside className="room-details" aria-live="polite">
            <div><span className="eyebrow">A closer look</span><h3>{detailRoom?.name ?? currentStop.title}</h3></div>
            <p>{detailRoom ? roomStories[detailRoom.id] : currentStop.description}</p>
            <dl>{detailRoom && <div><dt>Concept area</dt><dd>{detailRoom.area} <span>m²</span></dd></div>}<div><dt>{currentStop.floor === 'site' ? 'Levels' : 'Level'}</dt><dd>{currentStop.floor === 'site' ? '02' : `0${currentStop.floor}`}</dd></div></dl>
          </aside></details>
        </section>
        <details className="studio-disclosure" id="finish-details">
          <summary>Finishes &amp; light <span>{material.name} · {activeLighting.name}</span></summary>
          <div className="lighting-control"><nav aria-label="Lighting mode">
            {Object.entries(lightingModes).map(([key, mode]) => <button key={key} type="button" className={lightingMode === key ? 'is-active' : ''} aria-pressed={lightingMode === key} onClick={() => selectLightingMode(key)}>{mode.name}</button>)}
          </nav></div>
          <MaterialSwitcher material={material} onChange={(palette, event) => { setMaterial(palette); if (event) revealShowcaseView(event); }} />
        </details>
        <div className="experience-status"><span>Lighting: {activeLighting.name}</span><span>Material: {material?.name ?? 'Original hero materials'}</span><a href="#journey">Explore the floor plan <span aria-hidden="true">↓</span></a></div>
      </section>
      <div className="landing-extras section-wrap">
        <details className="landing-disclosure" id="plan-disclosure"><summary>Floor plan &amp; route</summary>
          <section className="journey-section" aria-label="Floor plan and route"><TourExperience activeStopId={activeTourStopId} onSelectStop={selectTourStop} tourMode={tourMode && !droneMode} onToggleTourMode={toggleTourMode} onViewStop={enterSpace} /></section>
        </details>
        <details className="landing-disclosure" id="concept-disclosure"><summary>Concept &amp; short film</summary>
          <DesignIntent onEnterSpace={enterSpace} /><ResidenceFilm />
        </details>
      </div>
      <section className="contact-section section-wrap" id="contact" aria-labelledby="contact-title">
        <div>

          <h2 id="contact-title">Have a space<br /><em>in mind?</em></h2>
          <p className="contact-intro">Tell us about it. We can discuss the concept and the views you need.</p>
        </div>
        <address className="contact-links">
          <a href="https://t.me/Alexfox14" target="_blank" rel="noopener noreferrer"><span className="contact-label">Message on Telegram</span><span className="contact-value">@Alexfox14 <span aria-hidden="true">↗</span></span></a>
          <a href="mailto:safal0645@gmail.com"><span className="contact-label">Write an email</span><span className="contact-value">safal0645@gmail.com <span aria-hidden="true">↗</span></span></a>

        </address>
      </section>
      <details className="landing-disclosure brief-disclosure section-wrap" id="brief-disclosure"><summary>Prefer a project brief?</summary>
        <ProjectBrief material={material} lighting={activeLighting.name} inspirationSpace={inspirationStop?.title ?? null} />
      </details>
      <footer className="site-footer"><a className="footer-wordmark" href="#top">Architectural AI Lab <span aria-hidden="true">↗</span></a><div><span>Dubai residence · Concept portfolio</span><span>Architecture / Kitchens / Interiors</span></div><p>Architectural studies and interactive visualisations.<br />Concept plans and areas; not construction documentation.</p><a href="https://github.com/safal207/Architectural-AI-Lab" target="_blank" rel="noreferrer">Project archive ↗</a></footer>
    </main>
  );
}
