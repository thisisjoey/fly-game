export class HUD {
  constructor(uiContainer) {
    this.container = uiContainer;
    this.visible = false;
    this._countdownTimeout = null;
    this._messageTimeout = null;
    this._flashTimeout = null;
    this._el = null;
    this._arrowEl = null;
    this._pauseEl = null;
    this._countdownEl = null;
    this._messageEl = null;
    this._milestoneEl = null;
    this._milestoneTimeout = null;
    this._flashEl = null;
    this._puPanel = null;
    this._puIcon = null;
    this._puName = null;
    this._puDesc = null;
    this._puBarWrap = null;
    this._puBar = null;
    this._puHint = null;
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
        @keyframes puHintPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes puActivePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      </style>

      <div id="hud-controls-hint" style="
        position:absolute;
        bottom:20px;
        left:16px;
        background:rgba(0,0,0,0.38);
        border-left:3px solid rgba(0,255,200,0.5);
        padding:8px 14px;
        border-radius:0 6px 6px 0;
        font-size:12px;
        line-height:1.9;
        color:rgba(255,255,255,0.75);
        pointer-events:none;
        letter-spacing:1px;
      ">
        <div><span style="color:#00ffcc;font-weight:bold;">W / ↑</span>&nbsp;&nbsp;Fly Up</div>
        <div><span style="color:#00ffcc;font-weight:bold;">S / ↓</span>&nbsp;&nbsp;Fly Down</div>
        <div><span style="color:#00ffcc;font-weight:bold;">A / ←</span>&nbsp;&nbsp;Strafe Left</div>
        <div><span style="color:#00ffcc;font-weight:bold;">D / →</span>&nbsp;&nbsp;Strafe Right</div>
        <div><span style="color:#ffcc00;font-weight:bold;">SPACE</span>&nbsp;Use Power-Up</div>
        <div><span style="color:#ff6688;font-weight:bold;">ESC</span>&nbsp;&nbsp;&nbsp;Pause</div>
      </div>

      <div id="hud-top-left" style="position:absolute;top:16px;left:16px;">
        <div id="hud-level" style="color:#00ffcc;font-size:22px;font-weight:bold;text-shadow:0 0 10px #00ffcc;">LEVEL 1</div>
        <div id="hud-distance" style="color:#ffcc00;font-size:18px;margin-top:4px;text-shadow:0 0 8px #ffcc00;">DIST: 0m</div>
        <div id="hud-time" style="color:#aaaaff;font-size:16px;margin-top:4px;">TIME 00:00</div>
      </div>

      <div id="hud-top-right" style="position:absolute;top:16px;right:16px;text-align:right;">
        <div id="hud-speed" style="color:#ff8800;font-size:20px;font-weight:bold;text-shadow:0 0 8px #ff8800;">180 u/s</div>
        <div id="hud-health" style="margin-top:6px;"></div>
      </div>

      <div id="hud-bottom-center" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);text-align:center;">
        <div id="hud-powerup-panel" style="
          background:rgba(0,0,0,0.62);
          border:2px solid #333;
          border-radius:14px;
          padding:10px 24px 10px;
          min-width:180px;
          max-width:240px;
          position:relative;
          transition:border-color 0.25s,box-shadow 0.25s;
        ">
          <div style="display:flex;align-items:center;justify-content:center;gap:9px;">
            <span id="hud-pu-icon" style="font-size:22px;line-height:1;"></span>
            <span id="hud-pu-name" style="color:#444;font-size:14px;font-weight:bold;letter-spacing:2px;transition:color 0.25s;">NO POWER-UP</span>
          </div>
          <div id="hud-pu-desc" style="color:#444;font-size:10px;letter-spacing:1px;margin-top:3px;min-height:13px;transition:color 0.25s;"></div>
          <div id="hud-pu-bar-wrap" style="margin-top:8px;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;display:none;">
            <div id="hud-pu-bar" style="height:100%;width:100%;border-radius:3px;background:#00ff00;transition:background 0.3s;"></div>
          </div>
          <div id="hud-pu-hint" style="margin-top:6px;font-size:11px;letter-spacing:2px;color:#444;display:none;animation:puHintPulse 1s ease-in-out infinite;">▶ SPACE TO USE</div>
        </div>
      </div>

      <div id="hud-flash" style="
        position:absolute;
        top:0;left:0;width:100%;height:100%;
        pointer-events:none;
        opacity:0;
        background:rgba(255,255,255,0);
      "></div>

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
    this._flashEl = el.querySelector('#hud-flash');
    this._puPanel  = el.querySelector('#hud-powerup-panel');
    this._puIcon   = el.querySelector('#hud-pu-icon');
    this._puName   = el.querySelector('#hud-pu-name');
    this._puDesc   = el.querySelector('#hud-pu-desc');
    this._puBarWrap = el.querySelector('#hud-pu-bar-wrap');
    this._puBar    = el.querySelector('#hud-pu-bar');
    this._puHint   = el.querySelector('#hud-pu-hint');

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

  // Display metadata for each power-up type
  static get PU_DISPLAY() {
    return {
      BOOST:   { color: '#ff7700', icon: '⚡',  desc: '2× SPEED FOR 6s'       },
      SHIELD:  { color: '#0099ff', icon: '🛡',  desc: 'ABSORB 1 HIT · 20s'    },
      MISSILE: { color: '#ff2200', icon: '🚀',  desc: 'DESTROY NEAREST SAM'    },
      EMP:     { color: '#bb00ff', icon: '⚡⚡', desc: 'SLOW ALL SAMs · 5s'     },
      REPAIR:  { color: '#00ee44', icon: '♥',   desc: 'RESTORE 1 HEART'        },
    };
  }

  update(gameState) {
    if (!this.visible) return;

    const { level, distance, speed, health, maxHealth, activePowerUp, pendingPowerUp, powerUpTimer, powerUpMaxTimer, raceTime } = gameState;

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

    // Power-up panel
    if (this._puPanel) {
      const PUD = HUD.PU_DISPLAY;
      if (activePowerUp && PUD[activePowerUp]) {
        const m = PUD[activePowerUp];
        this._puPanel.style.borderColor = m.color;
        this._puPanel.style.boxShadow = `0 0 14px ${m.color}88`;
        this._puIcon.textContent = m.icon;
        this._puName.style.color = m.color;
        this._puName.textContent = activePowerUp + ' ◀ ACTIVE';
        this._puName.style.animation = 'puActivePulse 0.7s ease-in-out infinite';
        this._puDesc.style.color = m.color + 'bb';
        this._puDesc.textContent = m.desc;
        if (this._puBarWrap && this._puBar && powerUpMaxTimer > 0) {
          this._puBarWrap.style.display = 'block';
          const ratio = Math.max(0, Math.min(1, (powerUpTimer || 0) / powerUpMaxTimer));
          this._puBar.style.width = (ratio * 100) + '%';
          this._puBar.style.background = m.color;
        } else if (this._puBarWrap) {
          this._puBarWrap.style.display = 'none';
        }
        if (this._puHint) this._puHint.style.display = 'none';

      } else if (pendingPowerUp && PUD[pendingPowerUp]) {
        const m = PUD[pendingPowerUp];
        this._puPanel.style.borderColor = m.color;
        this._puPanel.style.boxShadow = `0 0 8px ${m.color}55`;
        this._puIcon.textContent = m.icon;
        this._puName.style.color = m.color;
        this._puName.textContent = pendingPowerUp;
        this._puName.style.animation = '';
        this._puDesc.style.color = '#888';
        this._puDesc.textContent = m.desc;
        if (this._puBarWrap) this._puBarWrap.style.display = 'none';
        if (this._puHint) {
          this._puHint.style.display = 'block';
          this._puHint.style.color = m.color;
        }

      } else {
        this._puPanel.style.borderColor = '#333';
        this._puPanel.style.boxShadow = 'none';
        this._puIcon.textContent = '';
        this._puName.style.color = '#444';
        this._puName.textContent = 'NO POWER-UP';
        this._puName.style.animation = '';
        this._puDesc.textContent = '';
        if (this._puBarWrap) this._puBarWrap.style.display = 'none';
        if (this._puHint) this._puHint.style.display = 'none';
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

  showFlash(hexColor, duration = 0.4) {
    if (!this._flashEl) return;
    const r = (hexColor >> 16) & 0xff;
    const g = (hexColor >> 8) & 0xff;
    const b = hexColor & 0xff;
    this._flashEl.style.transition = 'none';
    this._flashEl.style.background = `rgba(${r},${g},${b},0.38)`;
    this._flashEl.style.opacity = '1';
    void this._flashEl.offsetWidth; // force reflow
    this._flashEl.style.transition = `opacity ${duration}s ease-out`;
    this._flashEl.style.opacity = '0';
  }

  _ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
