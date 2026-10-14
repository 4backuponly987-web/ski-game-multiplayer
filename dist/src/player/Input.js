import {
  groundSteerFromKeys,
  airSpinFromKeys,
  airFlipFromKeys,
  grabSideFromSpin,
  mouseGrabFromButtons,
  mouseGrabTrick,
  clampGrabTweak,
} from './controlMath.js';

export class Input {
  constructor(canvas = null) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseButtons = new Set();
    this.grabTweakX = 0;
    this.grabTweakY = 0;
    this.grabContextActive = false;
    this.lastPointerX = null;
    this.lastPointerY = null;
    this.enabled = false;

    window.addEventListener('keydown', (event) => {
      if (!this.enabled) return;
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Backspace'].includes(event.code)) event.preventDefault();
    }, true);

    // Key releases are captured at window level so a held brake can never get
    // stuck if focus/pointer-lock changes while S is down.
    const releaseKey = (event) => this.keys.delete(event.code);
    window.addEventListener('keyup', releaseKey, true);
    document.addEventListener('keyup', releaseKey, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });

    // Touchpads are exposed inconsistently by browsers: left click = left grab and two-finger/right click = right grab; some emit PointerEvent,
    // some only mouse events, and some can miss the original button-down when
    // pointer lock is acquired. Listen to both families and reconstruct held
    // buttons from MouseEvent.buttons while dragging. Set membership makes the
    // duplicate pointer+mouse events harmless.
    const pointerButton = (event) => (event.button === 2 || (event.button === 0 && (event.ctrlKey || event.metaKey))) ? 2 : event.button;
    const beginGrabPointer = (event) => {
      if (!this.enabled) return;
      const button = pointerButton(event);
      if (button !== 0 && button !== 2) return;
      const wasInactive = !this.isMouseGrabHeld();
      this.mouseButtons.add(button);
      if (wasInactive) this.resetGrabTweak();
      this.lastPointerX = Number.isFinite(event.clientX) ? event.clientX : null;
      this.lastPointerY = Number.isFinite(event.clientY) ? event.clientY : null;
      if (event.cancelable) event.preventDefault();
    };
    const endGrabPointer = (event) => {
      const button = pointerButton(event);
      if (button !== 0 && button !== 2) return;
      this.mouseButtons.delete(button);
      if (!this.isMouseGrabHeld()) {
        this.resetGrabTweak();
        this.lastPointerX = this.lastPointerY = null;
      }
    };

    // Capture on the window as well as the canvas. This fixes laptop touchpads
    // where the click that acquires pointer-lock is dispatched differently to
    // the later drag events.
    canvas?.addEventListener('pointerdown', beginGrabPointer, { passive: false });
    canvas?.addEventListener('mousedown', beginGrabPointer, { passive: false });
    window.addEventListener('pointerdown', (event) => {
      if (document.pointerLockElement === canvas) beginGrabPointer(event);
    }, true);
    window.addEventListener('mousedown', (event) => {
      if (document.pointerLockElement === canvas) beginGrabPointer(event);
    }, true);
    window.addEventListener('pointerup', endGrabPointer, true);
    window.addEventListener('mouseup', endGrabPointer, true);

    canvas?.addEventListener('contextmenu', (event) => {
      if (this.enabled) event.preventDefault();
    });

    const applyGrabMove = (event) => {
      if (!this.enabled || !this.grabContextActive) return;

      // On a touchpad the original down event can be swallowed as pointer-lock
      // engages. event.buttons is authoritative while the click is physically
      // held, so use it to recover left/right/both grabs on the next movement.
      if (Number.isFinite(event.buttons)) {
        const leftHeld = (event.buttons & 1) !== 0;
        const rightHeld = (event.buttons & 2) !== 0;
        if (leftHeld) this.mouseButtons.add(0);
        if (rightHeld) this.mouseButtons.add(2);
        // Do not clear a button from a zero-valued movement event: some Windows
        // touchpads briefly report buttons=0 while the physical click is still
        // held. The explicit pointerup/mouseup listeners remain authoritative.

      }
      if (!this.isMouseGrabHeld()) return;

      let dx = Number.isFinite(event.movementX) ? event.movementX : 0;
      let dy = Number.isFinite(event.movementY) ? event.movementY : 0;
      if (document.pointerLockElement !== canvas && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
        if (this.lastPointerX != null) dx = event.clientX - this.lastPointerX;
        if (this.lastPointerY != null) dy = event.clientY - this.lastPointerY;
        this.lastPointerX = event.clientX;
        this.lastPointerY = event.clientY;
      }
      this.grabTweakX += dx * 0.0105;
      this.grabTweakY -= dy * 0.0105;
      const clamped = clampGrabTweak(this.grabTweakX, this.grabTweakY);
      this.grabTweakX = clamped.x;
      this.grabTweakY = clamped.y;
    };

    // Mousemove is the most reliable stream for Windows Precision Touchpads.
    document.addEventListener('mousemove', applyGrabMove, true);
    // Keep non-mouse pointer devices working without double-applying mouse moves.
    document.addEventListener('pointermove', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') applyGrabMove(event);
    }, true);

    window.addEventListener('blur', () => this.clear());
  }

  resetGrabTweak() {
    this.grabTweakX = 0;
    this.grabTweakY = 0;
  }

  setGrabContext(active) {
    const next = Boolean(active);
    if (this.grabContextActive && !next) this.resetGrabTweak();
    this.grabContextActive = next;
  }

  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.mouseButtons.clear();
    this.grabContextActive = false;
    this.lastPointerX = this.lastPointerY = null;
    this.resetGrabTweak();
  }

  isDown(code) {
    // Shift is handled as a discrete ski-toggle in Game.js. It must no longer
    // leak into the old crouch / tuck / pump / run bindings anywhere else.
    if (code === 'ShiftLeft' || code === 'ShiftRight') return false;
    return this.enabled && this.keys.has(code);
  }

  consumePress(code) {
    if (!this.enabled || !this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  axis(negativeCode, positiveCode) {
    return (this.isDown(positiveCode) ? 1 : 0) - (this.isDown(negativeCode) ? 1 : 0);
  }

  steerAxis() {
    return groundSteerFromKeys(this.isDown('KeyA'), this.isDown('KeyD'));
  }

  isBrakeHeld() {
    return this.isDown('KeyS') || this.isDown('ControlLeft') || this.isDown('ControlRight');
  }

  airSpinAxis() {
    return airSpinFromKeys(this.isDown('KeyA'), this.isDown('KeyD'));
  }

  airFlipAxis() {
    return airFlipFromKeys(this.isDown('KeyW'), this.isDown('KeyS'));
  }

  isMouseButtonDown(button) {
    return this.enabled && this.mouseButtons.has(button);
  }

  isMouseGrabHeld() {
    return this.mouseButtons.has(0) || this.mouseButtons.has(2);
  }

  isSpreadEagleHeld() {
    return this.isDown('KeyF');
  }

  isDaffyHeld() {
    return this.isDown('KeyE');
  }

  isTweakingGrab() {
    return this.grabContextActive && this.isMouseGrabHeld();
  }

  getGrabTweak() {
    return clampGrabTweak(this.grabTweakX, this.grabTweakY);
  }

  getGrab(baseSpinDirection = 0) {
    // Mouse is now the primary analogue grab system. Left/right map directly to
    // the corresponding hand; holding both creates a double grab.
    const leftMouse = this.mouseButtons.has(0);
    const rightMouse = this.mouseButtons.has(2);
    const mouseGrab = mouseGrabFromButtons(leftMouse, rightMouse);
    if (mouseGrab) {
      const tweak = this.getGrabTweak();
      return mouseGrabTrick(leftMouse, rightMouse, tweak.x, tweak.y, this.isDown('KeyQ'));
    }

    // Keep the old named keyboard grabs as optional advanced alternatives.
    let grab = null;
    if (this.isDown('KeyZ')) grab = 'MUTE';
    else if (this.isDown('KeyJ')) grab = 'SAFETY';
    else if (this.isDown('KeyV')) grab = 'TAIL';
    else if (this.isDown('KeyB')) grab = 'NOSE';
    else if (this.isDown('KeyG')) grab = 'JAPAN';
    else if (this.isDown('KeyH')) grab = 'STALEFISH';
    if (!grab) return null;

    const side = grabSideFromSpin(baseSpinDirection);
    return side ? `${side} ${grab}` : grab;
  }

  endFrame() {
    this.pressed.clear();
  }
}
