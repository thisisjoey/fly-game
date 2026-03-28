export class InputManager {
  constructor() {
    this.keys = new Set();
    this.joystick = { x: 0, y: 0 };
    this.actionButtons = { boost: false, power: false, brake: false };
    this.isMobile = window.innerWidth < 768 || 'ontouchstart' in window;

    this._joystickActive = false;
    this._joystickCenter = { x: 0, y: 0 };
    this._joystickTouchId = null;
    this._touchElements = [];

    this._setupKeyboard();
    if (this.isMobile) {
      this._setupTouch();
      this._createVirtualControls();
    }
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  _setupTouch() {
    // handled by virtual control elements
  }

  _createVirtualControls() {
    const container = document.createElement('div');
    container.id = 'virtual-controls';
    container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 220px;
      pointer-events: none;
      z-index: 100;
    `;

    // Left joystick zone
    const joystickZone = document.createElement('div');
    joystickZone.style.cssText = `
      position: absolute;
      left: 20px;
      bottom: 20px;
      width: 150px;
      height: 150px;
      border-radius: 50%;
      background: rgba(0, 200, 255, 0.1);
      border: 2px solid rgba(0, 200, 255, 0.4);
      pointer-events: all;
      touch-action: none;
    `;

    const joystickKnob = document.createElement('div');
    joystickKnob.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(0, 200, 255, 0.6);
      border: 2px solid rgba(0, 200, 255, 0.9);
      pointer-events: none;
    `;
    joystickZone.appendChild(joystickKnob);

    let joystickRect = null;

    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this._joystickActive = true;
      this._joystickTouchId = touch.identifier;
      joystickRect = joystickZone.getBoundingClientRect();
      this._joystickCenter = {
        x: joystickRect.left + joystickRect.width / 2,
        y: joystickRect.top + joystickRect.height / 2
      };
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this._joystickTouchId) {
          const dx = touch.clientX - this._joystickCenter.x;
          const dy = touch.clientY - this._joystickCenter.y;
          const maxDist = 55;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const clampedDist = Math.min(dist, maxDist);
          const angle = Math.atan2(dy, dx);
          const cx = Math.cos(angle) * clampedDist;
          const cy = Math.sin(angle) * clampedDist;
          this.joystick.x = cx / maxDist;
          this.joystick.y = cy / maxDist;
          joystickKnob.style.left = `${50 + (cx / 75) * 50}%`;
          joystickKnob.style.top = `${50 + (cy / 75) * 50}%`;
        }
      }
    }, { passive: false });

    const resetJoystick = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._joystickTouchId) {
          this._joystickActive = false;
          this._joystickTouchId = null;
          this.joystick.x = 0;
          this.joystick.y = 0;
          joystickKnob.style.left = '50%';
          joystickKnob.style.top = '50%';
        }
      }
    };
    joystickZone.addEventListener('touchend', resetJoystick, { passive: false });
    joystickZone.addEventListener('touchcancel', resetJoystick, { passive: false });

    // Right side action buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: all;
    `;

    const btnDefs = [
      { label: 'BOOST', color: '#ff8800', key: 'boost' },
      { label: 'PWR', color: '#aa00ff', key: 'power' },
      { label: 'BRAKE', color: '#00ccff', key: 'brake' }
    ];

    btnDefs.forEach(def => {
      const btn = document.createElement('div');
      btn.style.cssText = `
        width: 65px;
        height: 65px;
        border-radius: 50%;
        background: ${def.color}33;
        border: 2px solid ${def.color};
        color: ${def.color};
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        font-weight: bold;
        touch-action: none;
        user-select: none;
        box-shadow: 0 0 10px ${def.color}66;
      `;
      btn.textContent = def.label;

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.actionButtons[def.key] = true;
        btn.style.background = `${def.color}88`;
        if (def.key === 'boost') this.keys.add('ShiftLeft');
        if (def.key === 'power') this.keys.add('Space');
        if (def.key === 'brake') this.keys.add('ShiftLeft');
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.actionButtons[def.key] = false;
        btn.style.background = `${def.color}33`;
        if (def.key === 'boost') this.keys.delete('ShiftLeft');
        if (def.key === 'power') this.keys.delete('Space');
        if (def.key === 'brake') this.keys.delete('ShiftLeft');
      }, { passive: false });

      btnContainer.appendChild(btn);
    });

    container.appendChild(joystickZone);
    container.appendChild(btnContainer);
    document.body.appendChild(container);
    this._virtualControlsEl = container;
  }

  showVirtualControls() {
    if (this._virtualControlsEl) this._virtualControlsEl.style.display = 'block';
  }

  hideVirtualControls() {
    if (this._virtualControlsEl) this._virtualControlsEl.style.display = 'none';
  }

  getJoystick() {
    return { x: this.joystick.x, y: this.joystick.y };
  }
}
