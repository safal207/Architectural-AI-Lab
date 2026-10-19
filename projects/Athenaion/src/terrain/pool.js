// Tiny worker pool for chunk meshing (falls back to the main thread if workers are unavailable).
import { meshChunk } from './voxel.js';

export class MeshPool {
  constructor(size) {
    this.workers = [];
    this.queue = [];
    this.pending = new Map();
    this.nextId = 1;
    this.farWaiters = new Map();
    this.error = null;
    this.ok = typeof Worker !== 'undefined';
    if (!this.ok) return;
    try {
      for (let i = 0; i < size; i++) {
        const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
        w.busy = false;
        w.onmessage = (e) => this._done(w, e.data);
        w.onerror = (e) => this._fail(new Error(e.message || 'Terrain worker failed'));
        w.onmessageerror = () => this._fail(new Error('Invalid terrain worker response'));
        this.workers.push(w);
      }
    } catch (e) {
      console.warn('[terrain] workers unavailable, meshing on the main thread', e);
      for (const w of this.workers) w.terminate();
      this.workers = [];
      this.ok = false;
    }
  }
  /** send the far grid to every worker (copied) */
  async setFar(grid) {
    if (!this.ok || !grid) return;
    if (this.error) throw this.error;
    await Promise.all(this.workers.map((w) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => this._fail(new Error('Terrain worker setup timed out')), 30000);
      this.farWaiters.set(w, { resolve, reject, timer });
      try { w.postMessage({ type: 'far', grid: { ...grid, data: grid.data.slice() } }); }
      catch (e) { this._fail(e); }
    })));
  }
  run(job) {
    if (this.error) return Promise.reject(this.error);
    if (!this.ok) return Promise.resolve().then(() => meshChunk(job));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.queue.push({ id, job });
      this._pump();
    });
  }
  _pump() {
    for (const w of this.workers) {
      if (w.busy || !this.queue.length) continue;
      const t = this.queue.shift();
      w.busy = true;
      const pending = this.pending.get(t.id);
      pending.timer = setTimeout(() => this._fail(new Error('Terrain chunk timed out')), 180000);
      try { w.postMessage(t); } catch (e) { this._fail(e); return; }
    }
  }
  _done(w, m) {
    if (m.type === 'far-ok') {
      const waiter = this.farWaiters.get(w);
      if (waiter) { clearTimeout(waiter.timer); this.farWaiters.delete(w); waiter.resolve(); }
      return;
    }
    w.busy = false;
    const p = this.pending.get(m.id);
    if (p) {
      this.pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.error) p.reject(new Error(m.error)); else p.resolve(m.r);
    }
    this._pump();
  }
  _fail(error) {
    this.error = error instanceof Error ? error : new Error(String(error));
    for (const p of [...this.pending.values(), ...this.farWaiters.values()]) { clearTimeout(p.timer); p.reject(this.error); }
    this.pending.clear(); this.farWaiters.clear(); this.queue = [];
    for (const w of this.workers) w.terminate();
    this.workers = [];
  }
  dispose() { this._fail(new Error('Terrain worker pool disposed')); }
}
