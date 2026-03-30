const PU_META = {
  BOOST:   { color: '#ff7700', icon: '⚡',   label: 'BOOST',        desc: '2× SPEED' },
  SHIELD:  { color: '#0099ff', icon: '🛡⚡',  label: 'SHIELD+SPEED', desc: 'INVINCIBLE · FAST' },
  MISSILE: { color: '#ff2200', icon: '🚀',   label: 'MISSILE',      desc: 'DESTROY SAM' },
  EMP:     { color: '#bb00ff', icon: '⚡⚡',  label: 'EMP',          desc: 'SLOW ALL SAMs' },
  REPAIR:  { color: '#00ee44', icon: '♥',    label: 'REPAIR',       desc: 'RESTORE LIFE' },
};

const GHOST_C = 169.65; // 2π × 27

export class HUD {
  constructor(uiContainer) {
    this.container = uiContainer;
    this.visible = false;

    this._countdownTimeout = null;
    this._messageTimeout   = null;
    this._milestoneTimeout = null;

    // element refs (set in _build)
    this._el = null;
    this._lvlNumEl = null;
    this._zoneEl = null;
    this._distNumEl = null;
    this._distBarEl = null;
    this._newRecordEl = null;
    this._timeEl = null;
    this._healthEl = null;
    this._speedValEl = null;
    this._speedBarEl = null;
    this._puPanelEl = null;
    this._puIconEl = null;
    this._puNameEl = null;
    this._puDescEl = null;
    this._puBarWrapEl = null;
    this._puBarEl = null;
    this._puTimerEl = null;
    this._puHintEl = null;
    this._ghostEl = null;
    this._ghostRingEl = null;
    this._ghostCountEl = null;
    this._flashEl = null;
    this._arrowEl = null;
    this._countdownEl = null;
    this._messageEl = null;
    this._milestoneEl = null;
    this._milestoneLevelEl = null;
    this._milestoneNameEl = null;
    this._milestoneSubEl = null;
    this._respawnEl = null;
    this._respawnCountEl = null;
    this._respawnBarEl = null;
    this._respawnLivesEl = null;
    this._pauseEl = null;

    // display state
    this._displaySpeed = 0;
    this._prevHealth = -1;
    this._bestDistance = parseInt(localStorage.getItem('skystriker_best_distance') || '0');
    this._isNewRecord = false;

    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'hud';
    el.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      display:none;pointer-events:none;
      font-family:'Rajdhani','Trebuchet MS',sans-serif;
    `;

    el.innerHTML = `
    <style>
      #hud * { box-sizing:border-box; }

      /* ── Animations ───────────────────────────────────── */
      @keyframes hudHealthPulse {
        0%,100% { opacity:1; }
        50%     { opacity:.35; }
      }
      @keyframes hudRecordPulse {
        0%,100% { opacity:1;  box-shadow:0 0 6px #ffd700; }
        50%     { opacity:.7; box-shadow:0 0 14px #ffd700; }
      }
      @keyframes hudHintBlink {
        0%,100% { opacity:1; }
        50%     { opacity:.25; }
      }
      @keyframes hudCountPop {
        from { transform:translate(-50%,-60%) scale(1.7); opacity:0; }
        to   { transform:translate(-50%,-60%) scale(1);   opacity:1; }
      }
      @keyframes hudMsgSlide {
        from { transform:translateX(-50%) translateY(-12px); opacity:0; }
        to   { transform:translateX(-50%) translateY(0);     opacity:1; }
      }
      @keyframes hudMilestoneSlide {
        0%   { transform:translateX(-105%); }
        14%  { transform:translateX(0);     }
        80%  { transform:translateX(0);     }
        100% { transform:translateX(105%);  }
      }
      @keyframes hudSweep {
        0%   { left:-100px; }
        100% { left:calc(100% + 100px); }
      }
      @keyframes hudRespawnBlink {
        0%,60%,100% { opacity:1; }
        30%          { opacity:.6; }
      }
      @keyframes hudPuActive {
        0%,100% { opacity:1; }
        50%     { opacity:.65; }
      }
      @keyframes hudGhostFlicker {
        0%,55%,100% { opacity:1; }
        28%          { opacity:.7; }
      }

      /* ── Top bar ──────────────────────────────────────── */
      #hud-topbar {
        position:absolute;top:0;left:0;right:0;height:80px;
        background:linear-gradient(180deg,rgba(2,6,18,.97) 0%,rgba(2,6,18,.75) 100%);
        border-bottom:1px solid rgba(0,212,255,.18);
        display:flex;align-items:center;justify-content:space-between;
        padding:0 22px;backdrop-filter:blur(10px);
      }
      #hud-level-badge {
        display:inline-flex;align-items:center;gap:6px;
        background:rgba(0,212,255,.14);border:1.5px solid rgba(0,212,255,.7);
        padding:5px 16px;border-radius:4px;
        font-size:24px;font-weight:700;letter-spacing:3px;
        color:#00d4ff;text-shadow:0 0 14px #00d4ff,0 0 28px rgba(0,212,255,.4);
        box-shadow:0 0 16px rgba(0,212,255,.15);
      }
      #hud-zone {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:14px;color:rgba(0,212,255,.7);letter-spacing:4px;margin-top:5px;
        text-shadow:0 0 8px rgba(0,212,255,.35);
      }
      #hud-dist-row { display:flex;align-items:center;gap:10px;margin-top:6px; }
      #hud-dist-bar-outer {
        width:110px;height:4px;background:rgba(255,255,255,.07);
        border-radius:2px;overflow:hidden;
      }
      #hud-dist-bar-fill {
        height:100%;width:0%;
        background:linear-gradient(90deg,#00d4ff,#ff6a00);
        border-radius:2px;transition:width .5s ease;
      }
      #hud-dist-num {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:17px;color:#ffd700;text-shadow:0 0 10px rgba(255,215,0,.6);
        letter-spacing:1px;white-space:nowrap;font-weight:600;
      }
      #hud-new-record {
        font-size:11px;font-weight:700;letter-spacing:2px;
        color:#ffd700;border:1px solid #ffd700;padding:2px 8px;border-radius:2px;
        animation:hudRecordPulse .8s ease-in-out infinite;display:none;
        background:rgba(255,215,0,.08);
      }
      #hud-time {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:30px;color:rgba(220,235,255,1);letter-spacing:3px;
        text-shadow:0 0 12px rgba(200,220,255,.5);text-align:right;font-weight:600;
      }
      #hud-health-cells { display:flex;gap:6px;margin-top:7px;justify-content:flex-end; }
      .hud-hcell {
        width:36px;height:10px;border-radius:3px;
        background:#00ff88;box-shadow:0 0 8px #00ff88,0 0 16px rgba(0,255,136,.3);
        position:relative;overflow:hidden;transition:background .3s,box-shadow .3s;
      }
      .hud-hcell::after {
        content:'';position:absolute;top:0;left:0;width:100%;height:50%;
        background:rgba(255,255,255,.3);border-radius:1px 1px 0 0;
      }
      .hud-hcell.empty {
        background:rgba(255,32,85,.1);box-shadow:none;
        border:1px solid rgba(255,32,85,.25);
      }
      .hud-hcell.low {
        background:#ff2055;box-shadow:0 0 10px #ff2055,0 0 20px rgba(255,32,85,.4);
        animation:hudHealthPulse .55s ease-in-out infinite;
      }

      /* ── Speed cluster ────────────────────────────────── */
      #hud-speed-cluster {
        position:absolute;bottom:96px;left:50%;transform:translateX(-50%);
        text-align:center;pointer-events:none;
      }
      #hud-speed-val {
        font-size:72px;font-weight:700;line-height:1;
        color:#00ff88;text-shadow:0 0 28px currentColor;
        letter-spacing:-3px;display:block;min-width:200px;
        transition:color .35s,text-shadow .35s;
      }
      #hud-speed-unit {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:12px;color:rgba(255,255,255,.3);letter-spacing:5px;
        margin-top:-4px;display:block;
      }
      #hud-speed-bar-outer {
        width:150px;height:2px;margin:8px auto 0;
        background:rgba(255,255,255,.05);border-radius:1px;overflow:hidden;
      }
      #hud-speed-bar-fill {
        height:100%;width:0%;border-radius:1px;
        background:currentColor;transition:width .08s;
      }

      /* ── Power-up panel ───────────────────────────────── */
      #hud-pu-panel {
        position:absolute;bottom:18px;left:50%;transform:translateX(-50%);
        min-width:210px;
        background:rgba(2,10,22,.88);border:1px solid rgba(255,255,255,.07);
        border-radius:8px;padding:10px 22px 10px;text-align:center;
        backdrop-filter:blur(8px);transition:border-color .25s,box-shadow .25s;
      }
      #hud-pu-row { display:flex;align-items:center;justify-content:center;gap:9px; }
      #hud-pu-icon { font-size:20px;line-height:1; }
      #hud-pu-name {
        font-size:15px;font-weight:700;letter-spacing:2px;
        color:rgba(255,255,255,.2);transition:color .25s;
      }
      #hud-pu-desc {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:10px;color:rgba(255,255,255,.2);
        letter-spacing:1px;margin-top:3px;transition:color .25s;min-height:13px;
      }
      #hud-pu-bar-wrap {
        margin-top:8px;height:3px;background:rgba(255,255,255,.05);
        border-radius:2px;overflow:hidden;display:none;
      }
      #hud-pu-bar { height:100%;border-radius:2px;transition:width .1s linear; }
      #hud-pu-timer {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:11px;color:rgba(255,255,255,.3);letter-spacing:1px;
        margin-top:4px;display:none;
      }
      #hud-pu-hint {
        font-size:11px;font-weight:700;letter-spacing:3px;
        margin-top:6px;display:none;
        animation:hudHintBlink 1.1s ease-in-out infinite;
      }

      /* ── Ghost timer ──────────────────────────────────── */
      #hud-ghost {
        position:absolute;top:90px;left:50%;transform:translateX(-50%);
        display:none;flex-direction:column;align-items:center;pointer-events:none;
      }
      #hud-ghost svg { filter:drop-shadow(0 0 8px #4488ff); }
      #hud-ghost-label {
        font-size:10px;font-weight:700;letter-spacing:4px;
        color:#4488ff;text-shadow:0 0 10px #4488ff;margin-top:3px;
        animation:hudGhostFlicker .2s step-end infinite;
      }

      /* ── Controls hint ────────────────────────────────── */
      #hud-controls-hint {
        position:absolute;bottom:18px;left:16px;pointer-events:none;
      }
      .ctrl-row { display:flex;align-items:center;gap:8px;margin-bottom:4px; }
      .ctrl-key {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:10px;color:#00d4ff;
        background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.25);
        padding:1px 5px;border-radius:2px;letter-spacing:1px;
        min-width:32px;text-align:center;
      }
      .ctrl-desc {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:10px;color:rgba(255,255,255,.28);letter-spacing:1px;
      }

      /* ── Corner brackets ──────────────────────────────── */
      .hud-brk {
        position:absolute;width:24px;height:24px;pointer-events:none;
        opacity:.5;
      }
      .hud-brk.tl{top:6px;left:6px;border-top:2px solid #00d4ff;border-left:2px solid #00d4ff;}
      .hud-brk.tr{top:6px;right:6px;border-top:2px solid #00d4ff;border-right:2px solid #00d4ff;}
      .hud-brk.bl{bottom:6px;left:6px;border-bottom:2px solid #00d4ff;border-left:2px solid #00d4ff;}
      .hud-brk.br{bottom:6px;right:6px;border-bottom:2px solid #00d4ff;border-right:2px solid #00d4ff;}

      /* ── Flash ────────────────────────────────────────── */
      #hud-flash {
        position:absolute;top:0;left:0;width:100%;height:100%;
        pointer-events:none;opacity:0;
      }

      /* ── Countdown ────────────────────────────────────── */
      #hud-countdown {
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-60%);
        font-size:120px;font-weight:700;
        color:#fff;text-shadow:0 0 40px #00d4ff,0 0 80px rgba(0,212,255,.4);
        display:none;pointer-events:none;
        animation:hudCountPop .3s cubic-bezier(.175,.885,.32,1.275);
      }

      /* ── Message ──────────────────────────────────────── */
      #hud-message {
        position:absolute;top:34%;left:50%;transform:translateX(-50%);
        font-size:28px;font-weight:700;
        color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,.6);
        display:none;pointer-events:none;white-space:nowrap;letter-spacing:3px;
        animation:hudMsgSlide .25s ease;
      }

      /* ── Milestone toast ──────────────────────────────── */
      @keyframes hudMilestoneToast {
        0%   { transform:translate(-50%, -120%); opacity:0; }
        12%  { transform:translate(-50%, 0);     opacity:1; }
        78%  { transform:translate(-50%, 0);     opacity:1; }
        100% { transform:translate(-50%, -120%); opacity:0; }
      }
      #hud-milestone {
        position:absolute;top:90px;left:50%;
        transform:translate(-50%, -120%);
        display:none;pointer-events:none;
        animation:hudMilestoneToast 3.4s cubic-bezier(.25,.46,.45,.94) forwards;
        white-space:nowrap;
      }
      #hud-milestone-inner {
        background:rgba(2,8,24,.92);
        border:1.5px solid rgba(0,212,255,.5);
        border-radius:6px;
        padding:10px 32px 11px;
        text-align:center;position:relative;overflow:hidden;
        box-shadow:0 0 24px rgba(0,212,255,.2),0 8px 32px rgba(0,0,0,.5);
      }
      #hud-milestone-sweep {
        position:absolute;top:0;bottom:0;width:80px;
        background:linear-gradient(90deg,transparent,rgba(0,212,255,.3),transparent);
        animation:hudSweep 3.4s ease forwards;pointer-events:none;
      }
      #hud-milestone-level {
        font-size:11px;font-weight:600;color:rgba(0,212,255,.6);
        letter-spacing:6px;text-shadow:0 0 8px #00d4ff;display:none;
      }
      #hud-milestone-name {
        font-size:28px;font-weight:700;color:#fff;letter-spacing:5px;
        text-shadow:0 0 20px rgba(0,212,255,.4);line-height:1;
      }
      #hud-milestone-sub {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:12px;color:#ffd700;letter-spacing:4px;margin-top:4px;
        text-shadow:0 0 8px rgba(255,215,0,.4);
      }

      /* ── Respawn ──────────────────────────────────────── */
      #hud-respawn {
        position:absolute;top:0;left:0;width:100%;height:100%;
        display:none;align-items:center;justify-content:center;flex-direction:column;
        pointer-events:none;
        background:radial-gradient(ellipse at center,rgba(180,0,30,.28) 0%,rgba(0,0,0,.65) 100%);
      }
      #hud-respawn-title {
        font-size:18px;font-weight:700;letter-spacing:8px;
        color:#ff2055;text-shadow:0 0 18px #ff2055;
        animation:hudRespawnBlink .5s step-end infinite;
      }
      #hud-respawn-count {
        font-size:100px;font-weight:700;color:#fff;
        text-shadow:0 0 40px rgba(255,50,80,.5);line-height:1;margin:6px 0;
      }
      #hud-respawn-label {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:12px;color:rgba(255,80,80,.7);letter-spacing:4px;margin-bottom:18px;
      }
      #hud-respawn-bar-outer {
        width:220px;height:3px;background:rgba(255,255,255,.07);
        border-radius:2px;overflow:hidden;margin-bottom:14px;
      }
      #hud-respawn-bar-fill {
        height:100%;width:100%;
        background:linear-gradient(90deg,#ff2055,#ff6a00);
        border-radius:2px;transition:width .1s linear;
      }
      #hud-respawn-lives { display:flex;gap:6px;margin-top:2px; }

      /* ── Pause ────────────────────────────────────────── */
      #hud-pause {
        position:absolute;top:0;left:0;width:100%;height:100%;
        background:rgba(2,6,18,.87);backdrop-filter:blur(14px);
        display:none;align-items:center;justify-content:center;flex-direction:column;
        pointer-events:all;
      }
      #hud-pause-title {
        font-size:68px;font-weight:700;color:#00d4ff;
        text-shadow:0 0 28px rgba(0,212,255,.5);letter-spacing:12px;margin-bottom:44px;
      }
      .pause-btn {
        font-family:'Rajdhani','Trebuchet MS',sans-serif;
        font-size:18px;font-weight:700;letter-spacing:3px;
        padding:14px 0;width:256px;margin:6px 0;cursor:pointer;border:none;
        border-radius:3px;position:relative;overflow:hidden;
        clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);
        transition:transform .15s,filter .15s;
      }
      .pause-btn:hover { transform:translateX(5px);filter:brightness(1.35); }
      .pause-btn.primary {
        background:rgba(0,212,255,.12);color:#00d4ff;border-left:3px solid #00d4ff;
      }
      .pause-btn.danger {
        background:rgba(255,32,85,.1);color:#ff2055;border-left:3px solid #ff2055;
        margin-top:14px;
      }
    </style>

    <!-- Corner brackets -->
    <div class="hud-brk tl"></div>
    <div class="hud-brk tr"></div>
    <div class="hud-brk bl"></div>
    <div class="hud-brk br"></div>

    <!-- Top bar -->
    <div id="hud-topbar">
      <div style="display:flex;flex-direction:column;justify-content:center;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="hud-level-badge">LVL <span id="hud-lvl-num">1</span></div>
          <div id="hud-zone">OPEN SKIES</div>
        </div>
        <div id="hud-dist-row">
          <div id="hud-dist-bar-outer"><div id="hud-dist-bar-fill"></div></div>
          <span id="hud-dist-num">0 m</span>
          <span id="hud-new-record">★ BEST</span>
        </div>
      </div>
      <div style="text-align:right;">
        <div id="hud-time">00:00</div>
        <div id="hud-health-cells"></div>
      </div>
    </div>

    <!-- Speed cluster -->
    <div id="hud-speed-cluster">
      <span id="hud-speed-val">0</span>
      <span id="hud-speed-unit">U / S</span>
      <div id="hud-speed-bar-outer"><div id="hud-speed-bar-fill"></div></div>
    </div>

    <!-- Power-up panel -->
    <div id="hud-pu-panel">
      <div id="hud-pu-row">
        <span id="hud-pu-icon"></span>
        <span id="hud-pu-name">NO POWER-UP</span>
      </div>
      <div id="hud-pu-desc"></div>
      <div id="hud-pu-bar-wrap"><div id="hud-pu-bar"></div></div>
      <div id="hud-pu-timer"></div>
      <div id="hud-pu-hint">▶ SPACE TO USE</div>
    </div>

    <!-- Ghost timer -->
    <div id="hud-ghost">
      <div style="position:relative;width:66px;height:66px;">
        <svg width="66" height="66" viewBox="0 0 66 66">
          <circle cx="33" cy="33" r="27" fill="none" stroke="rgba(68,136,255,.14)" stroke-width="4"/>
          <circle id="hud-ghost-ring" cx="33" cy="33" r="27" fill="none"
            stroke="#4488ff" stroke-width="4"
            stroke-dasharray="${GHOST_C.toFixed(1)}" stroke-dashoffset="0"
            stroke-linecap="round" transform="rotate(-90 33 33)"/>
        </svg>
        <div id="hud-ghost-count"
          style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          font-family:'Rajdhani','Trebuchet MS',sans-serif;font-size:22px;font-weight:700;
          color:#88bbff;text-shadow:0 0 12px #4488ff;line-height:1;">5</div>
      </div>
      <div id="hud-ghost-label">GHOST MODE</div>
    </div>

    <!-- Controls hint -->
    <div id="hud-controls-hint">
      <div class="ctrl-row"><span class="ctrl-key">W/↑</span><span class="ctrl-desc">UP</span></div>
      <div class="ctrl-row"><span class="ctrl-key">S/↓</span><span class="ctrl-desc">DOWN</span></div>
      <div class="ctrl-row"><span class="ctrl-key">A/←</span><span class="ctrl-desc">LEFT</span></div>
      <div class="ctrl-row"><span class="ctrl-key">D/→</span><span class="ctrl-desc">RIGHT</span></div>
      <div class="ctrl-row"><span class="ctrl-key">SPC</span><span class="ctrl-desc">POWER-UP</span></div>
      <div class="ctrl-row"><span class="ctrl-key">ESC</span><span class="ctrl-desc">PAUSE</span></div>
    </div>

    <!-- Flash -->
    <div id="hud-flash"></div>

    <!-- Arrow -->
    <div id="hud-arrow"
      style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      font-size:36px;color:#00d4ff;text-shadow:0 0 15px #00d4ff;display:none;pointer-events:none;">▲</div>

    <!-- Countdown -->
    <div id="hud-countdown"></div>

    <!-- Message -->
    <div id="hud-message"></div>

    <!-- Milestone -->
    <div id="hud-milestone">
      <div id="hud-milestone-inner">
        <div id="hud-milestone-sweep"></div>
        <div id="hud-milestone-level">LEVEL 5</div>
        <div id="hud-milestone-name">SKY STRIKER</div>
        <div id="hud-milestone-sub">SECTOR CLEARED</div>
      </div>
    </div>

    <!-- Respawn -->
    <div id="hud-respawn">
      <div id="hud-respawn-title">⚠ CRITICAL FAILURE ⚠</div>
      <div id="hud-respawn-count">3</div>
      <div id="hud-respawn-label">RECONSTRUCTING PILOT</div>
      <div id="hud-respawn-bar-outer"><div id="hud-respawn-bar-fill"></div></div>
      <div id="hud-respawn-lives"></div>
    </div>

    <!-- Pause -->
    <div id="hud-pause">
      <div id="hud-pause-title">PAUSED</div>
      <button class="pause-btn primary" id="pause-resume-btn">▶  RESUME</button>
      <button class="pause-btn danger"  id="pause-quit-btn">✕  QUIT TO MENU</button>
    </div>
    `;

    this.container.appendChild(el);
    this._el = el;

    this._lvlNumEl        = el.querySelector('#hud-lvl-num');
    this._zoneEl          = el.querySelector('#hud-zone');
    this._distBarEl       = el.querySelector('#hud-dist-bar-fill');
    this._distNumEl       = el.querySelector('#hud-dist-num');
    this._newRecordEl     = el.querySelector('#hud-new-record');
    this._timeEl          = el.querySelector('#hud-time');
    this._healthEl        = el.querySelector('#hud-health-cells');
    this._speedValEl      = el.querySelector('#hud-speed-val');
    this._speedBarEl      = el.querySelector('#hud-speed-bar-fill');
    this._puPanelEl       = el.querySelector('#hud-pu-panel');
    this._puIconEl        = el.querySelector('#hud-pu-icon');
    this._puNameEl        = el.querySelector('#hud-pu-name');
    this._puDescEl        = el.querySelector('#hud-pu-desc');
    this._puBarWrapEl     = el.querySelector('#hud-pu-bar-wrap');
    this._puBarEl         = el.querySelector('#hud-pu-bar');
    this._puTimerEl       = el.querySelector('#hud-pu-timer');
    this._puHintEl        = el.querySelector('#hud-pu-hint');
    this._ghostEl         = el.querySelector('#hud-ghost');
    this._ghostRingEl     = el.querySelector('#hud-ghost-ring');
    this._ghostCountEl    = el.querySelector('#hud-ghost-count');
    this._flashEl         = el.querySelector('#hud-flash');
    this._arrowEl         = el.querySelector('#hud-arrow');
    this._countdownEl     = el.querySelector('#hud-countdown');
    this._messageEl       = el.querySelector('#hud-message');
    this._milestoneEl     = el.querySelector('#hud-milestone');
    this._milestoneInnerEl = el.querySelector('#hud-milestone-inner');
    this._milestoneLevelEl = el.querySelector('#hud-milestone-level');
    this._milestoneNameEl = el.querySelector('#hud-milestone-name');
    this._milestoneSubEl  = el.querySelector('#hud-milestone-sub');
    this._respawnEl       = el.querySelector('#hud-respawn');
    this._respawnCountEl  = el.querySelector('#hud-respawn-count');
    this._respawnBarEl    = el.querySelector('#hud-respawn-bar-fill');
    this._respawnLivesEl  = el.querySelector('#hud-respawn-lives');
    this._pauseEl         = el.querySelector('#hud-pause');

    // Hover effects for pause buttons
    el.querySelectorAll('.pause-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(1.35)');
      btn.addEventListener('mouseleave', () => btn.style.filter = '');
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _zoneName(level) {
    if (level <= 2)  return 'OPEN SKIES';
    if (level <= 4)  return 'URBAN CANYON';
    if (level <= 6)  return 'STORM FRONT';
    if (level <= 9)  return 'COMBAT ZONE';
    if (level <= 12) return 'HELL CORRIDOR';
    if (level <= 16) return 'VOID SECTOR';
    return 'BEYOND LIMITS';
  }

  _speedColor(s) {
    if (s < 200) return '#00ff88';
    if (s < 360) return '#ffcc00';
    if (s < 500) return '#ff8800';
    return '#ff2200';
  }

  // ── Public API ────────────────────────────────────────────────────────────

  bindPauseButtons(onResume, onQuit) {
    this._el.querySelector('#pause-resume-btn').onclick = onResume;
    this._el.querySelector('#pause-quit-btn').onclick   = onQuit;
  }

  show() {
    this.visible = true;
    this._el.style.display = 'block';
    this._displaySpeed = 0;
    this._isNewRecord = false;
  }

  hide() {
    this.visible = false;
    this._el.style.display = 'none';
  }

  showPause() { this._pauseEl.style.display = 'flex'; }
  hidePause() { this._pauseEl.style.display = 'none'; }

  showMilestone(levelName, subtitle) {
    if (this._milestoneNameEl) this._milestoneNameEl.textContent = levelName;
    if (this._milestoneSubEl)  this._milestoneSubEl.textContent  = subtitle;

    // Restart toast animation
    this._milestoneEl.style.animation = 'none';
    this._milestoneEl.style.display   = 'block';
    void this._milestoneEl.offsetWidth;
    this._milestoneEl.style.animation = 'hudMilestoneToast 3.4s cubic-bezier(.25,.46,.45,.94) forwards';

    // Restart sweep
    const sweep = this._milestoneInnerEl ? this._milestoneInnerEl.querySelector('#hud-milestone-sweep') : null;
    if (sweep) {
      sweep.style.animation = 'none';
      void sweep.offsetWidth;
      sweep.style.animation = 'hudSweep 3.4s ease forwards';
    }

    clearTimeout(this._milestoneTimeout);
    this._milestoneTimeout = setTimeout(() => this.hideMilestone(), 3500);
  }

  hideMilestone() {
    if (this._milestoneEl) this._milestoneEl.style.display = 'none';
  }

  showRespawnOverlay(secondsLeft, health) {
    if (!this._respawnEl) return;
    this._respawnEl.style.display = 'flex';
    if (this._respawnCountEl) this._respawnCountEl.textContent = Math.ceil(secondsLeft);
    if (this._respawnBarEl)   this._respawnBarEl.style.width   = Math.max(0, (secondsLeft / 3) * 100) + '%';

    // Lives remaining cells
    if (this._respawnLivesEl && health !== undefined) {
      this._respawnLivesEl.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const cell = document.createElement('div');
        cell.style.cssText = `
          width:22px;height:6px;border-radius:2px;
          background:${i < health ? '#ff2055' : 'rgba(255,32,85,.12)'};
          box-shadow:${i < health ? '0 0 6px #ff2055' : 'none'};
          border:${i < health ? 'none' : '1px solid rgba(255,32,85,.2)'};
        `;
        this._respawnLivesEl.appendChild(cell);
      }
    }
  }

  hideRespawnOverlay() {
    if (this._respawnEl) this._respawnEl.style.display = 'none';
  }

  showCountdown(n) {
    this._countdownEl.style.display = 'block';
    this._countdownEl.textContent = n === 0 ? 'GO!' : String(n);
    this._countdownEl.style.color = n === 0 ? '#00ff88' : '#ffffff';
    // Reset animation
    this._countdownEl.style.animation = 'none';
    void this._countdownEl.offsetWidth;
    this._countdownEl.style.animation = 'hudCountPop .3s cubic-bezier(.175,.885,.32,1.275)';
    clearTimeout(this._countdownTimeout);
    this._countdownTimeout = setTimeout(() => { this._countdownEl.style.display = 'none'; }, 800);
  }

  hideCountdown() {
    this._countdownEl.style.display = 'none';
  }

  showMessage(text, duration = 2000) {
    this._messageEl.textContent = text;
    this._messageEl.style.display = 'block';
    // Restart slide animation
    this._messageEl.style.animation = 'none';
    void this._messageEl.offsetWidth;
    this._messageEl.style.animation = 'hudMsgSlide .25s ease';
    clearTimeout(this._messageTimeout);
    this._messageTimeout = setTimeout(() => { this._messageEl.style.display = 'none'; }, duration);
  }

  showFlash(hexColor, duration = 0.4) {
    if (!this._flashEl) return;
    const r = (hexColor >> 16) & 0xff;
    const g = (hexColor >> 8) & 0xff;
    const b =  hexColor & 0xff;
    this._flashEl.style.transition = 'none';
    this._flashEl.style.background = `rgba(${r},${g},${b},.36)`;
    this._flashEl.style.opacity = '1';
    void this._flashEl.offsetWidth;
    this._flashEl.style.transition = `opacity ${duration}s ease-out`;
    this._flashEl.style.opacity = '0';
  }

  update(gameState) {
    if (!this.visible) return;

    const {
      level = 1, distance = 0, speed = 0,
      health = 3, maxHealth = 3,
      activePowerUp, pendingPowerUp,
      powerUpTimer = 0, powerUpMaxTimer = 1,
      raceTime = 0, invincibleTimer = 0
    } = gameState;

    // — Level & zone —
    if (this._lvlNumEl) this._lvlNumEl.textContent = level;
    if (this._zoneEl)   this._zoneEl.textContent   = this._zoneName(level);

    // — Distance & personal best —
    if (distance > this._bestDistance) {
      this._bestDistance = distance;
      localStorage.setItem('skystriker_best_distance', String(Math.floor(distance)));
      if (!this._isNewRecord) {
        this._isNewRecord = true;
        if (this._newRecordEl) this._newRecordEl.style.display = 'inline';
      }
    }
    const distPct = this._bestDistance > 0
      ? Math.min(100, (distance / this._bestDistance) * 100)
      : 0;
    if (this._distBarEl)  this._distBarEl.style.width = distPct + '%';
    if (this._distNumEl)  this._distNumEl.textContent  = Math.floor(distance).toLocaleString() + ' m';

    // — Time —
    if (this._timeEl) {
      const mins = Math.floor(raceTime / 60);
      const secs = Math.floor(raceTime % 60);
      this._timeEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    }

    // — Health cells —
    if (this._healthEl && health !== this._prevHealth) {
      this._prevHealth = health;
      this._healthEl.innerHTML = '';
      for (let i = 0; i < maxHealth; i++) {
        const c = document.createElement('div');
        c.className = 'hud-hcell' + (i >= health ? ' empty' : (health === 1 && i === 0 ? ' low' : ''));
        this._healthEl.appendChild(c);
      }
    }

    // — Speed (smoothed) —
    this._displaySpeed += (speed - this._displaySpeed) * 0.18;
    const dispS = Math.round(this._displaySpeed);
    const sColor = this._speedColor(dispS);
    if (this._speedValEl) {
      this._speedValEl.textContent = dispS;
      this._speedValEl.style.color = sColor;
    }
    if (this._speedBarEl) {
      this._speedBarEl.style.width = Math.min(100, (dispS / 800) * 100) + '%';
      this._speedBarEl.style.background = sColor;
    }

    // — Power-up panel —
    if (this._puPanelEl) {
      if (activePowerUp && PU_META[activePowerUp]) {
        const m = PU_META[activePowerUp];
        this._puPanelEl.style.borderColor = m.color;
        this._puPanelEl.style.boxShadow   = `0 0 14px ${m.color}55`;
        this._puIconEl.textContent = m.icon;
        this._puNameEl.textContent = m.label + ' ◀ ACTIVE';
        this._puNameEl.style.color = m.color;
        this._puNameEl.style.animation = 'hudPuActive .7s ease-in-out infinite';
        this._puDescEl.textContent = m.desc;
        this._puDescEl.style.color = m.color + 'aa';
        // Bar
        this._puBarWrapEl.style.display = 'block';
        const ratio = powerUpMaxTimer > 0 ? Math.max(0, Math.min(1, powerUpTimer / powerUpMaxTimer)) : 0;
        this._puBarEl.style.width      = (ratio * 100) + '%';
        this._puBarEl.style.background = m.color;
        // Timer text
        this._puTimerEl.style.display = 'block';
        this._puTimerEl.textContent   = powerUpTimer.toFixed(1) + 's';
        this._puHintEl.style.display  = 'none';

      } else if (pendingPowerUp && PU_META[pendingPowerUp]) {
        const m = PU_META[pendingPowerUp];
        this._puPanelEl.style.borderColor = m.color + '88';
        this._puPanelEl.style.boxShadow   = `0 0 8px ${m.color}33`;
        this._puIconEl.textContent = m.icon;
        this._puNameEl.textContent = m.label;
        this._puNameEl.style.color = m.color;
        this._puNameEl.style.animation = '';
        this._puDescEl.textContent = m.desc;
        this._puDescEl.style.color = 'rgba(255,255,255,.38)';
        this._puBarWrapEl.style.display = 'none';
        this._puTimerEl.style.display   = 'none';
        this._puHintEl.style.display    = 'block';
        this._puHintEl.style.color      = m.color;

      } else {
        this._puPanelEl.style.borderColor = 'rgba(255,255,255,.07)';
        this._puPanelEl.style.boxShadow   = 'none';
        this._puIconEl.textContent = '';
        this._puNameEl.textContent = 'NO POWER-UP';
        this._puNameEl.style.color = 'rgba(255,255,255,.2)';
        this._puNameEl.style.animation = '';
        this._puDescEl.textContent = '';
        this._puBarWrapEl.style.display = 'none';
        this._puTimerEl.style.display   = 'none';
        this._puHintEl.style.display    = 'none';
      }
    }

    // — Ghost timer ring —
    if (this._ghostEl) {
      if (invincibleTimer > 0) {
        this._ghostEl.style.display = 'flex';
        const offset = (1 - invincibleTimer / 5) * GHOST_C;
        if (this._ghostRingEl) this._ghostRingEl.setAttribute('stroke-dashoffset', offset.toFixed(1));
        if (this._ghostCountEl) this._ghostCountEl.textContent = Math.ceil(invincibleTimer);
      } else {
        this._ghostEl.style.display = 'none';
      }
    }
  }
}
