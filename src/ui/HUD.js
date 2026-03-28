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
    this._milestoneEl = null;
    this._milestoneTimeout = null;
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
      <style>
        @keyframes milestoneIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          20%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
          30%  { transform: translate(-50%, -50%) scale(1.0); }
          80%  { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes milestonePulse {
          0%, 100% { text-shadow: 0 0 20px #00ffcc, 0 0 40px #00ffcc; }
          50% { text-shadow: 0 0 40px #00ffcc, 0 0 80px #00ffcc, 0 0 120px #00ffcc; }
        }
        @keyframes milestoneGoldPulse {
          0%, 100% { text-shadow: 0 0 15px #ffcc00, 0 0 30px #ffcc00; }
          50% { text-shadow: 0 0 30px #ffcc00, 0 0 60px #ffcc00, 0 0 90px #ffcc00; }
        }
      </style>

      <div id="hud-top-left" style="position:absolute;top:16px;left:16px;">
        <div id="hud-level" style="color:#00ffcc;font-size:22px;font-weight:bold;text-shadow:0 0 10px #00ffcc;">LEVEL 1</div>
        <div id="hud-distance" style="color:#ffcc00;font-size:18px;margin-top:4px;text-shadow:0 0 8px #ffcc00;">DIST: 0m</div>
        <div id="hud-time" style="color:#aaaaff;font-size:16px;margin-top:4px;">TIME 00:00</div>
      </div>

      <div id="hud-top-right" style="position:absolute;top:16px;right:16px;text-align:right;">
        <div id="hud-speed" style="color:#ff8800;font-size:20px;font-weight:bold;text-shadow:0 0 8px #ff8800;">180 u/s</div>
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

      <div id="hud-milestone" style="
        position:absolute;
        top:50%;left:50%;
        transform:translate(-50%,-50%);
        display:none;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        pointer-events:none;
        background:rgba(0,5,20,0.75);
        border:2px solid #00ffcc44;
        border-radius:16px;
        padding:32px 64px;
        text-align:center;
        min-width:340px;
        animation: milestoneIn 3s ease forwards;
      ">
        <div id="hud-milestone-level" style="
          color:#00ffcc;
          font-size:32px;
          font-weight:bold;
          letter-spacing:6px;
          animation: milestonePulse 0.8s ease-in-out infinite;
        ">LEVEL 5</div>
        <div id="hud-milestone-subtitle" style="
          color:#ffcc00;
          font-size:20px;
          font-weight:bold;
          margin-top:10px;
          letter-spacing:4px;
          animation: milestoneGoldPulse 0.8s ease-in-out infinite;
        ">SECTOR 1 CLEARED!</div>
        <div style="margin-top:16px;color:#445566;font-size:12px;letter-spacing:3px;">KEEP FLYING</div>
      </div>

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
    this._milestoneEl = el.querySelector('#hud-milestone');

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

  showMilestone(levelName, subtitle) {
    if (!this._milestoneEl) return;
    const levelEl = this._milestoneEl.querySelector('#hud-milestone-level');
    const subEl = this._milestoneEl.querySelector('#hud-milestone-subtitle');
    if (levelEl) levelEl.textContent = levelName;
    if (subEl) subEl.textContent = subtitle;

    // Reset animation by cloning
    this._milestoneEl.style.display = 'flex';
    // Force reflow to restart animation
    this._milestoneEl.style.animation = 'none';
    void this._milestoneEl.offsetWidth;
    this._milestoneEl.style.animation = 'milestoneIn 3s ease forwards';

    clearTimeout(this._milestoneTimeout);
    this._milestoneTimeout = setTimeout(() => {
      this.hideMilestone();
    }, 3100);
  }

  hideMilestone() {
    if (this._milestoneEl) this._milestoneEl.style.display = 'none';
  }

  update(gameState) {
    if (!this.visible) return;

    const { level, distance, speed, health, maxHealth, activePowerUp, pendingPowerUp, raceTime } = gameState;

    // Level
    const levelEl = this._el.querySelector('#hud-level');
    if (levelEl) levelEl.textContent = `LEVEL ${level || 1}`;

    // Distance
    const distEl = this._el.querySelector('#hud-distance');
    if (distEl) distEl.textContent = `DIST: ${Math.floor(distance || 0)}m`;

    // Speed
    const spdEl = this._el.querySelector('#hud-speed');
    if (spdEl) spdEl.textContent = `${Math.round(speed || 0)} u/s`;

    // Health
    const hpEl = this._el.querySelector('#hud-health');
    if (hpEl) {
      let hearts = '';
      const max = maxHealth || 3;
      for (let i = 0; i < max; i++) {
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
      } else if (pendingPowerUp) {
        const colors = { BOOST: '#ff8800', SHIELD: '#0088ff', MISSILE: '#ff0000', EMP: '#aa00ff', REPAIR: '#00ff44' };
        const c = colors[pendingPowerUp] || '#ffffff';
        puEl.style.borderColor = c;
        puEl.style.color = c;
        puEl.style.textShadow = `0 0 8px ${c}`;
        puEl.textContent = `[${pendingPowerUp}] - SPACE`;
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
      const t = raceTime || 0;
      const mins = Math.floor(t / 60);
      const secs = Math.floor(t % 60);
      timeEl.textContent = `TIME ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
