const WALK_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight'
]);

/** Recognize editable fields and interactive controls whose keyboard input must not move the camera. */
export function isInteractiveTarget(target) {
  return Boolean(target?.isContentEditable || target?.closest?.(
    'input, textarea, select, button, a[href], [role="textbox"], [role="slider"], [contenteditable]:not([contenteditable="false"])'
  ));
}

/** Clear keyboard, touch movement and touch-look state, releasing an owned pointer capture if present. */
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

/** Own movement keys only while the visible Explore canvas has keyboard focus. */
export function canUseWalkthroughKeyboard(runtime, element, documentTarget) {
  return runtime.isExplore && runtime.firstPersonAvailable && !documentTarget.hidden
    && documentTarget.activeElement === element;
}

// A key released outside the page never produces a matching keyup here. Reset
// at every ownership boundary so returning to the tour cannot resume old input.
/**
 * Bind movement keys only while Explore owns input, preserving form editing and browser shortcuts.
 * Reset motion on focus and visibility boundaries; return a cleanup function for all bindings.
 */
export function bindWalkthroughKeyboard({
  runtime, mobileMotionRef, element, windowTarget, documentTarget, onInteract, onPause
}) {
  /** Clear all input sources belonging to this walkthrough runtime. */
  const reset = () => resetWalkthroughInput(runtime, mobileMotionRef, element);
  /** Record an unmodified movement key only when a visible, valid Explore view owns keyboard input. */
  const keyDown = (event) => {
    if (event.code === 'Escape' && canUseWalkthroughKeyboard(runtime, element, documentTarget)) {
      reset();
      element.blur();
      onPause?.();
      return;
    }
    if (!WALK_KEYS.has(event.code) || event.defaultPrevented || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey
      || isInteractiveTarget(event.target)
      || !canUseWalkthroughKeyboard(runtime, element, documentTarget)) return;
    event.preventDefault();
    runtime.keys.add(event.code);
    onInteract();
  };
  /** Release a movement key even after input ownership changes. */
  const keyUp = (event) => runtime.keys.delete(event.code);
  /** Stop movement when the page is hidden and may miss subsequent key-release events. */
  const visibilityChange = () => {
    if (documentTarget.hidden) reset();
  };
  /** Stop walkthrough motion when focus enters a text-editing control. */
  const focusIn = (event) => {
    if (event.target !== element) runtime.keys.clear();
    if (event.target?.isContentEditable || event.target?.closest?.('input, textarea, select, [role="textbox"], [role="slider"], [contenteditable]:not([contenteditable="false"])')) reset();
  };
  /** Release desktop drag/keys when the canvas loses focus; preserve touch-pad holds. */
  const canvasBlur = () => {
    runtime.keys.clear();
    if (!runtime.isTouchDevice) reset();
  };

  windowTarget.addEventListener('keydown', keyDown);
  windowTarget.addEventListener('keyup', keyUp);
  windowTarget.addEventListener('blur', reset);
  documentTarget.addEventListener('visibilitychange', visibilityChange);
  documentTarget.addEventListener('focusin', focusIn);
  element.addEventListener('blur', canvasBlur);

  return () => {
    reset();
    windowTarget.removeEventListener('keydown', keyDown);
    windowTarget.removeEventListener('keyup', keyUp);
    windowTarget.removeEventListener('blur', reset);
    documentTarget.removeEventListener('visibilitychange', visibilityChange);
    documentTarget.removeEventListener('focusin', focusIn);
    element.removeEventListener('blur', canvasBlur);
  };
}
