export class HUD {
  constructor(uiContainer) {
    this.container = uiContainer;
    this.visible = false;
    this._countdownTimeout = null;
    this._messageTimeout = null;
    this._el = null;
    this._arrowEl = null;
    this._pauseEl = null;
    this._countdownEl = null;
    this._messageEl = null;
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'hud';
    el.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: none;
      font-family: 'Courier New', Courier, monospace;
      pointer-events: none;
    `;
    el.innerHTML = `
      <div id="hud-top-left" style="position:absolute;top:16px;left:16px;">
        <div id="hud-lap" style="color:#00ffcc;font-size:22px;font-weight:bold;text-shadow:0 0 10px #00ffcc;">LAP 1/3</div>
        <div id="hud-position" style="color:#ffcc00;font-size:18px;margin-top:4px;text-shadow:0 0 8px #ffcc00;">1st / 4</div>
        <div id="hud-time" style="color:#aaaaff;font-size:16px;margin-top:4px;">00:00</div>
      </div>

      <div id="hud-top-right" style="position:absolute;top:16px;right:16px;text-align:right;">
        <div id="hud-speed" style="color:#ff8800;font-size:20px;font-weight:bold;text-shadow:0 0 8px #ff8800;">60 u/s</div>
        <div id="hud-health" style="margin-top:6px;"></div>
      </div>

      <div id="hud-bottom-center" style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);text-align:center;">
        <div id="hud-powerup" style="
          background:rgba(0,0,0,0.5);
          border:2px solid #444;
          border-radius:10px;
          padding:6px 18px;
          color:#888;
          font-size:14px;
          min-width:120px;
          text-shadow:0 0 6px #000;
        ">NO POWER-UP</div>
      </div>

      <div id="hud-arrow" style="
        position:absolute;
        top:50%;left:50%;
        transform:translate(-50%,-50%);
        font-size:36px;
        color:#00ffcc;
        text-shadow:0 0 15px #00ffcc;
        display:none;
        pointer-events:none;
      ">▲</div>

      <div id="hud-countdown" style="
        position:absolute;
        top:50%;left:50%;
        transform:translate(-50%,-60%);
        font-size:96px;
        font-weight:bold;
        color:#ffffff;
        text-shadow:0 0 30px #00ffcc, 0 0 60px #00ffcc;
        display:none;
        pointer-events:none;
      "></div>

      <div id="hud-message" style="
        position:absolute;
        top:38%;left:50%;
        transform:translateX(-50%);
        font-size:28px;
        font-weight:bold;
        color:#ffcc00;
        text-shadow:0 0 20px #ff8800;
        display:none;
        pointer-events:none;
        white-space:nowrap;
      "></div>

      <div id="hud-respawn" style="
        position:absolute;
        top:0;left:0;width:100%;height:100%;
        display:none;
        align-items:center;
        justify-content:center;
        flex-direction:column;
        pointer-events:none;
        background:rgba(80,0,0,0.35);
      ">
        <div style="color:#ff2200;font-size:42px;font-weight:bold;text-shadow:0 0 20px #ff4400;letter-spacing:4px;">JET DESTROYED</div>
        <div id="hud-respawn-count" style="color:#ff8800;font-size:96px;font-weight:bold;text-shadow:0 0 30px #ff4400;margin-top:10px;">3</div>
        <div style="color:#ffaa44;font-size:20px;margin-top:8px;letter-spacing:2px;">RESPAWNING...</div>
      </div>

      <div id="hud-pause" style="
        position:absolute;
        top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,20,0.8);
        display:none;
        align-items:center;
        justify-content:center;
        flex-direction:column;
        gap:20px;
        pointer-events:all;
      ">
        <div style="color:#00ffcc;font-size:48px;font-weight:bold;text-shadow:0 0 20px #00ffcc;margin-bottom:20px;">PAUSED</div>
        <button id="pause-resume-btn" style="
          background:rgba(0,255,204,0.1);
          border:2px solid #00ffcc;
          color:#00ffcc;
          font-family:'Courier New',monospace;
          font-size:20px;
          padding:12px 40px;
          cursor:pointer;
          border-radius:6px;
          text-shadow:0 0 8px #00ffcc;
          box-shadow:0 0 15px #00ffcc44;
          transition:all 0.2s;
        ">RESUME</button>
        <button id="pause-quit-btn" style="
          background:rgba(255,0,100,0.1);
          border:2px solid #ff0066;
          color:#ff0066;
          font-family:'Courier New',monospace;
          font-size:20px;
          padding:12px 40px;
          cursor:pointer;
          border-radius:6px;
          text-shadow:0 0 8px #ff0066;
          box-shadow:0 0 15px #ff006644;
          transition:all 0.2s;
        ">QUIT TO MENU</button>
      </div>
    `;

    this.container.appendChild(el);
    this._el = el;
    this._countdownEl = el.querySelector('#hud-countdown');
    this._messageEl = el.querySelector('#hud-message');
    this._arrowEl = el.querySelector('#hud-arrow');
    this._pauseEl = el.querySelector('#hud-pause');
    this._respawnEl = el.querySelector('#hud-respawn');
    this._respawnCountEl = el.querySelector('#hud-respawn-count');

    // Button hover effects
    ['pause-resume-btn', 'pause-quit-btn'].forEach(id => {
      const btn = el.querySelector('#' + id);
      btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(1.3)');
      btn.addEventListener('mouseleave', () => btn.style.filter = '');
    });
  }

  bindPauseButtons(onResume, onQuit) {
    this._el.querySelector('#pause-resume-btn').onclick = onResume;
    this._el.querySelector('#pause-quit-btn').onclick = onQuit;
  }

  show() {
    this.visible = true;
    this._el.style.display = 'block';
  }

  hide() {
    this.visible = false;
    this._el.style.display = 'none';
  }

  showPause() {
    this._pauseEl.style.display = 'flex';
  }

  hidePause() {
    this._pauseEl.style.display = 'none';
  }

  update(gameState) {
    if (!this.visible) return;

    const { lap, totalLaps, position, totalJets, speed, health, maxHealth, activePowerUp, raceTime, checkpointDir } = gameState;

    // Lap
    const lapEl = this._el.querySelector('#hud-lap');
    if (lapEl) lapEl.textContent = `LAP ${Math.min(lap + 1, totalLaps)} / ${totalLaps}`;

    // Position
    const posEl = this._el.querySelector('#hud-position');
    if (posEl) posEl.textContent = `${this._ordinal(position)} / ${totalJets}`;

    // Speed
    const spdEl = this._el.querySelector('#hud-speed');
    if (spdEl) spdEl.textContent = `${Math.round(speed)} u/s`;

    // Health
    const hpEl = this._el.querySelector('#hud-health');
    if (hpEl) {
      let hearts = '';
      for (let i = 0; i < maxHealth; i++) {
        hearts += `<span style="color:${i < health ? '#ff4444' : '#333'};font-size:20px;text-shadow:${i < health ? '0 0 8px #ff4444' : 'none'};">♥</span>`;
      }
      hpEl.innerHTML = hearts;
    }

    // Power-up
    const puEl = this._el.querySelector('#hud-powerup');
    if (puEl) {
      if (activePowerUp) {
        const colors = { BOOST: '#ff8800', SHIELD: '#0088ff', MISSILE: '#ff0000', EMP: '#aa00ff', REPAIR: '#00ff44' };
        const c = colors[activePowerUp] || '#ffffff';
        puEl.style.borderColor = c;
        puEl.style.color = c;
        puEl.style.textShadow = `0 0 8px ${c}`;
        puEl.textContent = activePowerUp;
      } else if (gameState.pendingPowerUp) {
        const colors = { BOOST: '#ff8800', SHIELD: '#0088ff', MISSILE: '#ff0000', EMP: '#aa00ff', REPAIR: '#00ff44' };
        const c = colors[gameState.pendingPowerUp] || '#ffffff';
        puEl.style.borderColor = c;
        puEl.style.color = c;
        puEl.style.textShadow = `0 0 8px ${c}`;
        puEl.textContent = `[${gameState.pendingPowerUp}] - SPACE`;
      } else {
        puEl.style.borderColor = '#444';
        puEl.style.color = '#888';
        puEl.style.textShadow = 'none';
        puEl.textContent = 'NO POWER-UP';
      }
    }

    // Time
    const timeEl = this._el.querySelector('#hud-time');
    if (timeEl) {
      const mins = Math.floor(raceTime / 60);
      const secs = Math.floor(raceTime % 60);
      timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Checkpoint arrow
    if (this._arrowEl && checkpointDir) {
      const { screenX, screenY, offscreen } = checkpointDir;
      if (offscreen) {
        this._arrowEl.style.display = 'block';
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const angle = Math.atan2(screenY - cy, screenX - cx);
        const arrowDist = 120;
        this._arrowEl.style.left = (cx + Math.cos(angle) * arrowDist) + 'px';
        this._arrowEl.style.top = (cy + Math.sin(angle) * arrowDist) + 'px';
        this._arrowEl.style.transform = `translate(-50%,-50%) rotate(${angle + Math.PI / 2}rad)`;
      } else {
        this._arrowEl.style.display = 'none';
      }
    }
  }

  showRespawnOverlay(secondsLeft) {
    if (!this._respawnEl) return;
    this._respawnEl.style.display = 'flex';
    if (this._respawnCountEl) this._respawnCountEl.textContent = Math.ceil(secondsLeft);
  }

  hideRespawnOverlay() {
    if (this._respawnEl) this._respawnEl.style.display = 'none';
  }

  showCountdown(n) {
    this._countdownEl.style.display = 'block';
    this._countdownEl.textContent = n === 0 ? 'GO!' : String(n);
    if (n === 0) {
      this._countdownEl.style.color = '#00ffcc';
    } else {
      this._countdownEl.style.color = '#ffffff';
    }
    clearTimeout(this._countdownTimeout);
    this._countdownTimeout = setTimeout(() => {
      this._countdownEl.style.display = 'none';
    }, 800);
  }

  hideCountdown() {
    this._countdownEl.style.display = 'none';
  }

  showMessage(text, duration = 2000) {
    this._messageEl.textContent = text;
    this._messageEl.style.display = 'block';
    clearTimeout(this._messageTimeout);
    this._messageTimeout = setTimeout(() => {
      this._messageEl.style.display = 'none';
    }, duration);
  }

  _ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
