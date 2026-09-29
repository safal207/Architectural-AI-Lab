import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createDemoFrameClock } from './demoTimeline.js';
import { createResidenceStoryboard, applyResidenceFrame } from './residenceDemo.js';
import { createInteriorAccessories } from './interiorAccessories.js';
import { isInteractiveTarget } from './walkthroughInput.js';

const EMPTY = { active: false, state: 'idle', seconds: 0, duration: 0, title: '', chapter: 0, chapters: 0, cut: false, reduced: false, error: '', reason: '' };

/** Own opt-in camera playback; the existing viewer still owns rendering, GPU pacing and the GLB. */
export function useResidenceDemo({ runtimeRef, modelState, onRestore, onLighting }) {
  const [state, setState] = useState(EMPTY);
  const sessionRef = useRef(null);
  const callbacks = useRef({ onRestore, onLighting });
  callbacks.current = { onRestore, onLighting };

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (modelState !== 'loaded' || !runtime?.villaRoot) return undefined;
    const element = runtime.renderer.domElement;
    const container = element.parentElement;
    const section = container.closest('section');
    const curtain = section?.querySelector('.residence-demo-shade');
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const accessories = createInteriorAccessories(THREE, { scene: runtime.scene, root: runtime.villaRoot,
      quality: runtime.isTouchDevice ? 'mobile' : 'desktop' });
    container.dataset.interiorAccessories = JSON.stringify(accessories.report);
    runtime.needsRender = true;
    let active = false, disposed = false, frame = null, clock = null, board = null;
    let sample = null, reason = '', lastNotice = -Infinity, lastLightingStop = null;
    const boards = new Map();
    function notify(force = false) {
      if (disposed) return;
      const now = performance.now();
      if (!force && now - lastNotice < 250) return;
      lastNotice = now;
      const clockState = clock?.read() ?? { state: 'idle' };
      setState({ ...EMPTY, ...sample, state: clockState.state, active, reduced: preference.matches, reason });
    }
    function cancelFrame() { if (frame !== null) cancelAnimationFrame(frame); frame = null; }
    function apply(force = false, advance = false) {
      // Do not overwrite an unrendered camera pose while the viewer is waiting for its GPU fence.
      if (!active || !clock || (!force && runtime.needsRender)) return;
      const progress = advance ? clock.advance() : clock.read();
      const previousStop = sample?.stopId;
      sample = applyResidenceFrame(runtime.camera, board, progress.seconds);
      container.dataset.demoTime = sample.seconds.toFixed(3);
      container.dataset.demoState = progress.state;
      container.dataset.demoStop = sample.stopId;
      if (curtain) curtain.style.opacity = String(sample.shade);
      runtime.needsRender = true;
      if (lastLightingStop !== sample.stopId) {
        lastLightingStop = sample.stopId;
        callbacks.current.onLighting();
      }
      notify(previousStop !== sample.stopId || progress.state === 'completed');
    }
    function tick() {
      frame = null;
      if (!active || disposed) return;
      if (document.hidden || !runtime.visible || runtime.renderer.getContext().isContextLost()) {
        pause('Paused while the view is unavailable'); return;
      }
      apply(false, true);
      if (clock.read().state === 'playing') frame = requestAnimationFrame(tick);
      else { apply(true); notify(true); }
    }
    function start(mode = 'house') {
      if (disposed || document.hidden || runtime.renderer.getContext().isContextLost()) return;
      if (active) stop(false);
      try {
        if (!boards.has(mode)) boards.set(mode, createResidenceStoryboard({ root: runtime.villaRoot,
          graph: runtime.walkGraph, aspect: runtime.camera.aspect, mode }));
        board = boards.get(mode);
      } catch (error) {
        setState({ ...EMPTY, reduced: preference.matches, error: `Demo unavailable: ${error.message}` });
        return;
      }
      runtime.drone.disable();
      runtime.orbitControls.enabled = false;
      runtime.keys.clear();
      const pointerId = runtime.touchLook.pointerId;
      runtime.touchLook.active = false; runtime.touchLook.pointerId = null;
      if (pointerId != null && element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
      runtime.isDrone = false; runtime.isFirstPerson = false; runtime.isExplore = false;
      active = true; reason = ''; lastLightingStop = null;
      container.scrollIntoView({ block: 'center', behavior: 'instant' });
      clock = createDemoFrameClock(board.duration); clock.start(preference.matches);
      container.dataset.demoReport = JSON.stringify(board.report);
      apply(true); notify(true);
      if (!preference.matches) frame = requestAnimationFrame(() => { frame = requestAnimationFrame(tick); });
    }
    function pause(message = 'Paused') {
      if (!active) return;
      clock.pause(); reason = message; cancelFrame(); apply(true); notify(true);
    }
    function resume() {
      if (!active || preference.matches || document.hidden || !runtime.visible || runtime.renderer.getContext().isContextLost()) return;
      reason = ''; clock.resume(); cancelFrame(); notify(true);
      if (clock.read().state === 'playing') frame = requestAnimationFrame(tick);
    }
    function seek(index) {
      if (!active || !board) return;
      const chapter = board.chapters[Math.max(0, Math.min(board.chapters.length - 1, index))];
      clock.seek(chapter.start); reason = 'Selected scene'; cancelFrame(); apply(true); notify(true);
    }
    function stop(restore = true) {
      if (!active) return;
      active = false; cancelFrame(); clock?.stop(); sample = null; reason = '';
      container.dataset.demoState = 'idle'; container.dataset.demoTime = ''; container.dataset.demoStop = '';
      if (curtain) curtain.style.opacity = '0';
      notify(true);
      if (restore && !disposed) callbacks.current.onRestore();
    }
    const session = { start, pause, resume, seek, stop, resize: () => apply(true),
      get active() { return active; }, get stopId() { return sample?.stopId ?? null; },
      get elapsed() { return sample?.seconds ?? 0; } };
    sessionRef.current = session; runtime.demoSession = session;
    notify(true);

    const blur = () => pause('Paused when focus left the window');
    const visibility = () => { if (document.hidden) pause('Paused while the tab is hidden'); };
    const contextLost = () => pause('Paused after graphics context loss');
    const interrupt = () => pause('Paused for your interaction');
    const focus = event => { if (active && !section?.contains(event.target)) pause('Paused while you use the page'); };
    const key = event => {
      if (active && event.code === 'Escape' && !event.defaultPrevented && !event.isComposing
        && !event.altKey && !event.ctrlKey && !event.metaKey && !isInteractiveTarget(event.target)) pause();
    };
    const preferenceChanged = () => { if (preference.matches) pause('Reduced motion · use scene controls'); notify(true); };
    window.addEventListener('blur', blur);
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('focusin', focus);
    element.addEventListener('pointerdown', interrupt);
    element.addEventListener('wheel', interrupt, { passive: true });
    element.addEventListener('webglcontextlost', contextLost);
    preference.addEventListener?.('change', preferenceChanged);
    return () => {
      disposed = true; stop(false); cancelFrame();
      window.removeEventListener('blur', blur); window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility); document.removeEventListener('focusin', focus);
      element.removeEventListener('pointerdown', interrupt); element.removeEventListener('wheel', interrupt);
      element.removeEventListener('webglcontextlost', contextLost);
      preference.removeEventListener?.('change', preferenceChanged);
      accessories.dispose();
      if (runtime.demoSession === session) runtime.demoSession = null;
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [modelState, runtimeRef]);

  return { ...state,
    start: mode => sessionRef.current?.start(mode), pause: () => sessionRef.current?.pause(),
    resume: () => sessionRef.current?.resume(), stop: () => sessionRef.current?.stop(),
    previous: () => sessionRef.current?.seek(state.chapter - 1),
    next: () => sessionRef.current?.seek(state.chapter + 1)
  };
}
