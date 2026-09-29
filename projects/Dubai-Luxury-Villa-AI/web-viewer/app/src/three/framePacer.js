/** Keep animated scenes from filling the GPU command queue and blocking page input. */
export function createFramePacer(gl) {
  let fence = null;
  const supported = typeof gl.fenceSync === 'function' && typeof gl.clientWaitSync === 'function';
  const clear = () => {
    if (fence) gl.deleteSync(fence);
    fence = null;
  };
  return {
    ready() {
      if (gl.isContextLost()) return false;
      if (!fence) return true;
      // A zero timeout only checks progress; it never waits on the main thread.
      const status = gl.clientWaitSync(fence, 0, 0);
      if (status === gl.TIMEOUT_EXPIRED) return false;
      clear();
      return true;
    },
    submitted() {
      if (!supported || gl.isContextLost()) return;
      clear();
      fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
    },
    restored() { fence = null; },
    dispose: clear
  };
}
