/** Keep animated scenes from filling the GPU command queue and blocking page input. */
export function createFramePacer(gl, now = () => performance.now()) {
  let fence = null;
  let submittedAt = 0;
  let animateAfter = 0;
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
      const completedAt = now();
      // Software/mobile graphics share resources with input and layout. Leave
      // an equally sized idle interval after slow frames; camera changes can
      // still render immediately. Fast GPUs stay within the normal 24/30 Hz cap.
      animateAfter = completedAt + Math.min(Math.max(completedAt - submittedAt, 0), 500);
      clear();
      return true;
    },
    canAnimate() { return now() >= animateAfter; },
    submitted() {
      if (!supported || gl.isContextLost()) return;
      clear();
      submittedAt = now();
      fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
    },
    restored() { fence = null; animateAfter = 0; },
    dispose: clear
  };
}
