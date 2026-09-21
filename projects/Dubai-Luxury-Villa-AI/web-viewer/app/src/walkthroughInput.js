const WALK_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight'
]);

export function isInteractiveTarget(target) {
  return Boolean(target?.isContentEditable || target?.closest?.(
    'input, textarea, select, button, a[href], [role="textbox"], [role="slider"], [contenteditable]:not([contenteditable="false"])'
  ));
}

export function resetWalkthroughInput(runtime, mobileMotionRef, element) {
  runtime.keys.clear();
  mobileMotionRef.current = { forward: 0, right: 0 };
  const pointerId = runtime.touchLook.pointerId;
  runtime.touchLook.active = false;
  runtime.touchLook.pointerId = null;
  if (pointerId != null && element?.hasPointerCapture?.(pointerId)) {
    element.releasePointerCapture(pointerId);
  }
}

// A key released outside the page never produces a matching keyup here. Reset
// at every ownership boundary so returning to the tour cannot resume old input.
export function bindWalkthroughKeyboard({
  runtime, mobileMotionRef, element, windowTarget, documentTarget, onInteract
}) {
  const reset = () => resetWalkthroughInput(runtime, mobileMotionRef, element);
  const keyDown = (event) => {
    if (!WALK_KEYS.has(event.code) || event.defaultPrevented || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey
      || isInteractiveTarget(event.target)
      || !runtime.isExplore || !runtime.firstPersonAvailable || documentTarget.hidden
      || (!runtime.isTouchDevice && !runtime.pointerLockControls?.isLocked)) return;
    event.preventDefault();
    runtime.keys.add(event.code);
    onInteract();
  };
  const keyUp = (event) => runtime.keys.delete(event.code);
  const visibilityChange = () => {
    if (documentTarget.hidden) reset();
  };
  const focusIn = (event) => {
    if (event.target?.isContentEditable || event.target?.closest?.('input, textarea, select, [role="textbox"], [role="slider"], [contenteditable]:not([contenteditable="false"])')) reset();
  };

  windowTarget.addEventListener('keydown', keyDown);
  windowTarget.addEventListener('keyup', keyUp);
  windowTarget.addEventListener('blur', reset);
  documentTarget.addEventListener('visibilitychange', visibilityChange);
  documentTarget.addEventListener('focusin', focusIn);
  runtime.pointerLockControls?.addEventListener('unlock', reset);

  return () => {
    reset();
    windowTarget.removeEventListener('keydown', keyDown);
    windowTarget.removeEventListener('keyup', keyUp);
    windowTarget.removeEventListener('blur', reset);
    documentTarget.removeEventListener('visibilitychange', visibilityChange);
    documentTarget.removeEventListener('focusin', focusIn);
    runtime.pointerLockControls?.removeEventListener('unlock', reset);
  };
}
