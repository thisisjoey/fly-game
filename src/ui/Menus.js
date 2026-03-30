const JET_STATS = {
  storm_eagle:  { speed: 3, agility: 3, armor: 2 },
  neon_phantom: { speed: 5, agility: 4, armor: 1 },
  dark_matter:  { speed: 2, agility: 2, armor: 5 },
  solar_wind:   { speed: 5, agility: 5, armor: 3 },
};

function gradeFor(distance) {
  if (distance >= 172000) return { letter: 'S', color: '#ff6a00', label: 'LEGEND' };
  if (distance >= 58000)  return { letter: 'A', color: '#ffd700', label: 'VETERAN' };
  if (distance >= 26000)  return { letter: 'B', color: '#00d4ff', label: 'ACE' };
  if (distance >= 11000)  return { letter: 'C', color: '#00ff88', label: 'PILOT' };
  if (distance >= 3000)   return { letter: 'D', color: '#aaaaff', label: 'CADET' };
  return                         { letter: 'F', color: '#888',    label: 'ROOKIE' };
}

export class Menus {
  constructor(uiContainer) {
    this.container = uiContainer;
    this._screens = {};
    this._callbacks = {};
    this._starRAF = null;
    this._stars = [];
    this._starCanvas = null;
    this._starCtx = null;
    this._buildStyles();
    this._buildMainMenu();
    this._buildStore();
    this._buildMissions();
    this._buildResults();
  }

  // ── Global styles ─────────────────────────────────────────────────────────

  _buildStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── Shared ─────────────────────────────────────── */
      .sky-screen {
        position:absolute;top:0;left:0;width:100%;height:100%;
        display:none;overflow-y:auto;overflow-x:hidden;
        font-family:'Rajdhani','Trebuchet MS',sans-serif;
      }

      /* ── Animations ──────────────────────────────────── */
      @keyframes skyGlitch {
        0%,78%,100% {
          text-shadow:0 0 40px #ff6a00,0 0 80px rgba(255,106,0,.5);
          transform:none;
        }
        80% { transform:skewX(-10deg); text-shadow:-3px 0 #00d4ff,3px 0 #ff2055; }
        82% { transform:skewX(8deg); clip-path:polygon(0 25%,100% 25%,100% 55%,0 55%);
              text-shadow:2px 0 #ff2055; }
        84% { transform:none; clip-path:none;
              text-shadow:0 0 40px #ff6a00,0 0 80px rgba(255,106,0,.5); }
        86% { transform:skewX(-4deg); text-shadow:2px 0 #00d4ff; }
        88% { transform:none; text-shadow:0 0 40px #ff6a00,0 0 80px rgba(255,106,0,.5); }
      }
      @keyframes skyFadeIn {
        from { opacity:0; transform:translateY(18px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes skySubTyping {
        from { width:0; }
        to   { width:100%; }
      }
      @keyframes skyBtnHover {
        from { width:0; }
        to   { width:100%; }
      }
      @keyframes skyGradeBounce {
        0%   { transform:scale(0.3) rotate(-15deg); opacity:0; }
        60%  { transform:scale(1.12) rotate(3deg);  opacity:1; }
        80%  { transform:scale(.96) rotate(-1deg); }
        100% { transform:scale(1)   rotate(0deg);   opacity:1; }
      }
      @keyframes skyGradeS {
        0%,100% { text-shadow:0 0 30px #ff6a00,0 0 60px #ff6a00; color:#ff6a00; }
        33%     { text-shadow:0 0 30px #ffd700,0 0 60px #ffd700; color:#ffd700; }
        66%     { text-shadow:0 0 30px #ff2055,0 0 60px #ff2055; color:#ff2055; }
      }
      @keyframes skyStatFill {
        from { width:0; }
      }
      @keyframes skyCoinTick {
        0%   { transform:scale(1.3); }
        100% { transform:scale(1); }
      }
      @keyframes skyMissionComplete {
        0%   { transform:scale(0.85); opacity:0; }
        100% { transform:scale(1);    opacity:1; }
      }

      /* ── Menu button ─────────────────────────────────── */
      .sky-btn {
        position:relative;overflow:hidden;
        display:flex;align-items:center;gap:14px;
        width:280px;padding:15px 24px;
        border:none;border-radius:2px;cursor:pointer;
        background:transparent;
        clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);
        transition:transform .15s;
        text-align:left;
      }
      .sky-btn:hover { transform:translateX(5px); }
      .sky-btn-sweep {
        position:absolute;top:0;left:0;height:100%;width:0%;
        transition:width .3s ease;pointer-events:none;
      }
      .sky-btn:hover .sky-btn-sweep { width:100%; }
      .sky-btn-icon {
        font-size:20px;line-height:1;flex-shrink:0;z-index:1;position:relative;
      }
      .sky-btn-label {
        font-size:18px;font-weight:700;letter-spacing:3px;
        z-index:1;position:relative;
      }
      .sky-btn-sub {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:10px;letter-spacing:2px;opacity:.6;
        z-index:1;position:relative;margin-left:auto;flex-shrink:0;
      }
      .sky-btn.disabled {
        opacity:.28;cursor:not-allowed;pointer-events:none;
      }

      /* ── Cards ───────────────────────────────────────── */
      .sky-card {
        background:rgba(0,212,255,.04);
        border:1px solid rgba(0,212,255,.15);
        border-radius:8px;padding:16px;
        transition:border-color .2s,box-shadow .2s;
      }
      .sky-card:hover {
        border-color:rgba(0,212,255,.35);
        box-shadow:0 0 16px rgba(0,212,255,.08);
      }
      .sky-card.selected {
        border-color:#00d4ff;
        box-shadow:0 0 18px rgba(0,212,255,.25);
      }

      /* ── Stat bar ────────────────────────────────────── */
      .stat-bar-outer {
        height:4px;background:rgba(255,255,255,.07);border-radius:2px;
        overflow:hidden;margin-top:3px;flex:1;
      }
      .stat-bar-fill {
        height:100%;border-radius:2px;
        animation:skyStatFill .6s cubic-bezier(.25,.46,.45,.94) forwards;
      }

      /* ── Screen BG ───────────────────────────────────── */
      .sky-screen-inner {
        max-width:920px;margin:0 auto;padding:32px 24px 48px;
      }
      .sky-section-title {
        font-size:13px;font-weight:700;letter-spacing:5px;color:#00d4ff;
        text-shadow:0 0 8px rgba(0,212,255,.4);text-transform:uppercase;
        margin:28px 0 14px;padding-bottom:8px;
        border-bottom:1px solid rgba(0,212,255,.12);
      }
      .sky-page-title {
        font-size:44px;font-weight:700;letter-spacing:4px;margin-bottom:4px;
      }
      .sky-coin-display {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:18px;color:#ffd700;text-shadow:0 0 8px rgba(255,215,0,.4);
        letter-spacing:2px;
      }

      /* ── Back button ─────────────────────────────────── */
      .back-btn {
        display:inline-flex;align-items:center;gap:8px;
        font-family:'Rajdhani','Trebuchet MS',sans-serif;
        font-size:14px;font-weight:600;letter-spacing:3px;
        color:rgba(0,212,255,.6);background:none;border:none;
        cursor:pointer;padding:8px 0;margin-bottom:24px;
        transition:color .2s;
      }
      .back-btn:hover { color:#00d4ff; }

      /* ── Results ─────────────────────────────────────── */
      #results-grade {
        font-size:120px;font-weight:700;line-height:1;
        display:block;text-align:center;margin-bottom:6px;
        animation:skyGradeBounce .6s cubic-bezier(.175,.885,.32,1.275) .2s both;
      }
      #results-grade.grade-S { animation:skyGradeBounce .6s cubic-bezier(.175,.885,.32,1.275) .2s both,
                                          skyGradeS 1.5s ease-in-out .8s infinite; }
      .results-stat-row {
        display:flex;justify-content:space-between;align-items:center;
        padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);
      }
      .results-stat-row:last-child { border-bottom:none; }
      .results-stat-label {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:13px;color:rgba(180,200,220,.7);letter-spacing:2px;
      }
      .results-stat-val {
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:15px;font-weight:600;letter-spacing:1px;
      }

      /* ── Mission row ─────────────────────────────────── */
      .mission-row {
        padding:14px 16px;border-radius:8px;
        background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);
        margin-bottom:10px;transition:border-color .2s;
        animation:skyMissionComplete .4s ease both;
      }
      .mission-row.complete {
        border-color:rgba(0,255,100,.2);background:rgba(0,255,100,.03);
      }
      .mission-row:hover { border-color:rgba(255,255,255,.14); }
    `;
    document.head.appendChild(style);
  }

  // ── Main menu ─────────────────────────────────────────────────────────────

  _buildMainMenu() {
    const screen = document.createElement('div');
    screen.className = 'sky-screen';
    screen.id = 'screen-menu';
    screen.style.background = '#030810';

    // Background canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'sky-starfield';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    screen.appendChild(canvas);
    this._starCanvas = canvas;

    // Grid overlay
    const grid = document.createElement('div');
    grid.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
      background-image:
        linear-gradient(rgba(0,212,255,.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,212,255,.03) 1px, transparent 1px);
      background-size:60px 60px;
    `;
    screen.appendChild(grid);

    // Horizon glow
    const horizon = document.createElement('div');
    horizon.style.cssText = `
      position:absolute;bottom:0;left:0;right:0;height:260px;pointer-events:none;
      background:linear-gradient(0deg,rgba(255,106,0,.07) 0%,transparent 100%);
    `;
    screen.appendChild(horizon);

    // Content
    const content = document.createElement('div');
    content.style.cssText = `
      position:relative;z-index:2;width:100%;height:100%;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
    `;

    const bestDist = parseInt(localStorage.getItem('skystriker_best_distance') || '0');
    const bestBadge = bestDist > 0
      ? `<div style="
           font-family:'Share Tech Mono','Courier New',monospace;font-size:12px;
           color:#ffd700;letter-spacing:3px;margin-top:12px;
           background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.25);
           padding:4px 14px;border-radius:3px;display:inline-block;
           text-shadow:0 0 8px rgba(255,215,0,.4);
         ">★ BEST  ${Math.floor(bestDist).toLocaleString()} m</div>`
      : '';

    content.innerHTML = `
      <!-- Title block -->
      <div style="text-align:center;margin-bottom:52px;animation:skyFadeIn .7s ease .1s both;">
        <div style="
          font-size:clamp(52px,9vw,96px);font-weight:700;letter-spacing:8px;
          color:#ff6a00;
          animation:skyGlitch 6s ease-in-out infinite;
          display:block;
        ">SKY STRIKER</div>
        <div style="
          font-family:'Share Tech Mono','Courier New',monospace;
          font-size:clamp(12px,1.6vw,15px);letter-spacing:7px;color:rgba(0,212,255,.7);
          margin-top:10px;text-shadow:0 0 10px rgba(0,212,255,.4);
        ">FUTURISTIC JET RACING</div>
        ${bestBadge}
      </div>

      <!-- Buttons -->
      <div id="menu-btns" style="display:flex;flex-direction:column;gap:10px;align-items:flex-start;animation:skyFadeIn .7s ease .3s both;">
      </div>

      <!-- Bottom hint -->
      <div style="
        position:absolute;bottom:20px;
        font-family:'Share Tech Mono','Courier New',monospace;
        font-size:10px;color:rgba(255,255,255,.18);letter-spacing:3px;text-align:center;
      ">W/S · A/D · SPACE · ESC</div>
    `;

    screen.appendChild(content);
    this.container.appendChild(screen);
    this._screens['menu'] = screen;

    // Build buttons after DOM is ready
    const btnsEl = content.querySelector('#menu-btns');

    const buttons = [
      { id: 'btn-play',     color: '#00d4ff', icon: '▶', label: 'PLAY',        sub: 'START RACE',    event: 'play' },
      { id: 'btn-store',    color: '#ff8800', icon: '⬡', label: 'STORE',       sub: 'UPGRADES',      event: 'store' },
      { id: 'btn-missions', color: '#bb00ff', icon: '✦', label: 'MISSIONS',    sub: 'CHALLENGES',    event: 'missions' },
      { id: 'btn-lb',       color: '#555',    icon: '◈', label: 'LEADERBOARD', sub: 'COMING SOON',   event: null, disabled: true },
    ];

    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.id = b.id;
      btn.className = 'sky-btn' + (b.disabled ? ' disabled' : '');
      btn.style.cssText = `border-left:3px solid ${b.color};`;
      btn.innerHTML = `
        <div class="sky-btn-sweep" style="background:linear-gradient(90deg,${b.color}22,transparent);"></div>
        <span class="sky-btn-icon" style="color:${b.color};">${b.icon}</span>
        <span class="sky-btn-label" style="color:${b.color};text-shadow:0 0 8px ${b.color}66;">${b.label}</span>
        <span class="sky-btn-sub" style="color:${b.color};">${b.sub}</span>
      `;
      if (b.event) btn.onclick = () => this._emit(b.event);
      btnsEl.appendChild(btn);
    });
  }

  // ── Store ─────────────────────────────────────────────────────────────────

  _buildStore() {
    const screen = document.createElement('div');
    screen.className = 'sky-screen';
    screen.id = 'screen-store';
    screen.style.background = 'linear-gradient(180deg,#030810 0%,#05080f 100%)';

    screen.innerHTML = `
      <div class="sky-screen-inner">
        <button class="back-btn" id="store-back-btn">← BACK</button>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:6px;">
          <div class="sky-page-title" style="color:#ff8800;text-shadow:0 0 20px #ff880066;">STORE</div>
          <div class="sky-coin-display" id="store-coins">⬡ 0</div>
        </div>
        <div class="sky-section-title">JETS</div>
        <div id="store-jets" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:8px;"></div>
        <div class="sky-section-title">UPGRADES</div>
        <div id="store-upgrades" style="display:flex;flex-direction:column;gap:10px;"></div>
      </div>
    `;

    this.container.appendChild(screen);
    this._screens['store'] = screen;
    screen.querySelector('#store-back-btn').onclick = () => this._emit('back');
  }

  // ── Missions ──────────────────────────────────────────────────────────────

  _buildMissions() {
    const screen = document.createElement('div');
    screen.className = 'sky-screen';
    screen.id = 'screen-missions';
    screen.style.background = 'linear-gradient(180deg,#030810 0%,#05080f 100%)';

    screen.innerHTML = `
      <div class="sky-screen-inner" style="max-width:720px;">
        <button class="back-btn" id="missions-back-btn">← BACK</button>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:6px;">
          <div class="sky-page-title" style="color:#bb00ff;text-shadow:0 0 20px #bb00ff66;">MISSIONS</div>
          <div class="sky-coin-display" id="missions-coins">⬡ 0</div>
        </div>
        <div class="sky-section-title">ACTIVE CHALLENGES</div>
        <div id="missions-list"></div>
      </div>
    `;

    this.container.appendChild(screen);
    this._screens['missions'] = screen;
    screen.querySelector('#missions-back-btn').onclick = () => this._emit('back');
  }

  // ── Results ───────────────────────────────────────────────────────────────

  _buildResults() {
    const screen = document.createElement('div');
    screen.className = 'sky-screen';
    screen.id = 'screen-results';
    screen.style.background = '#030810';

    // Subtle grid bg
    const grid = document.createElement('div');
    grid.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;
      background-image:
        linear-gradient(rgba(0,212,255,.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,212,255,.025) 1px, transparent 1px);
      background-size:50px 50px;
    `;
    screen.appendChild(grid);

    const content = document.createElement('div');
    content.style.cssText = `
      position:relative;z-index:1;
      width:100%;height:100%;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:32px;
    `;
    content.innerHTML = `
      <!-- Grade -->
      <div style="text-align:center;margin-bottom:20px;">
        <span id="results-grade" style="color:#ffd700;">A</span>
        <div id="results-grade-label" style="
          font-family:'Share Tech Mono','Courier New',monospace;
          font-size:12px;letter-spacing:6px;color:rgba(255,255,255,.45);
          margin-top:-6px;
        ">PILOT</div>
      </div>

      <!-- Card -->
      <div style="
        background:rgba(2,8,22,.9);
        border:1px solid rgba(0,212,255,.15);border-radius:10px;
        padding:28px 44px;min-width:340px;
        backdrop-filter:blur(12px);
        box-shadow:0 0 40px rgba(0,212,255,.06);
      ">
        <div id="results-new-record" style="
          display:none;text-align:center;margin-bottom:16px;
          font-family:'Share Tech Mono','Courier New',monospace;
          font-size:11px;font-weight:700;letter-spacing:4px;color:#ffd700;
          background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.3);
          padding:5px 16px;border-radius:3px;
        ">★ NEW PERSONAL BEST ★</div>

        <div id="results-stats"></div>
      </div>

      <!-- Missions completed -->
      <div id="results-missions" style="margin-top:16px;text-align:center;max-width:360px;"></div>

      <!-- Buttons -->
      <div style="display:flex;gap:14px;margin-top:28px;flex-wrap:wrap;justify-content:center;">
        <button id="btn-play-again" style="
          font-family:'Rajdhani','Trebuchet MS',sans-serif;
          font-size:17px;font-weight:700;letter-spacing:3px;
          padding:14px 36px;border:none;border-radius:3px;cursor:pointer;
          background:rgba(0,212,255,.12);color:#00d4ff;
          border-left:3px solid #00d4ff;
          clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%);
          transition:filter .15s,transform .15s;
        ">▶  PLAY AGAIN</button>
        <button id="btn-results-menu" style="
          font-family:'Rajdhani','Trebuchet MS',sans-serif;
          font-size:17px;font-weight:700;letter-spacing:3px;
          padding:14px 36px;border:none;border-radius:3px;cursor:pointer;
          background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);
          border-left:3px solid rgba(255,255,255,.2);
          clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%);
          transition:filter .15s,transform .15s;
        ">⌂  MAIN MENU</button>
      </div>
    `;
    screen.appendChild(content);

    this.container.appendChild(screen);
    this._screens['results'] = screen;

    [content.querySelector('#btn-play-again'), content.querySelector('#btn-results-menu')].forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.3)'; btn.style.transform = 'translateX(4px)'; });
      btn.addEventListener('mouseleave', () => { btn.style.filter = ''; btn.style.transform = ''; });
    });
    content.querySelector('#btn-play-again').onclick  = () => this._emit('play');
    content.querySelector('#btn-results-menu').onclick = () => this._emit('menu');
  }

  // ── Starfield ─────────────────────────────────────────────────────────────

  _startStarfield() {
    const canvas = this._starCanvas;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    this._starCtx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    if (!this._stars.length) {
      this._stars = Array.from({ length: 280 }, () => ({
        x: (Math.random() - .5) * W * 2,
        y: (Math.random() - .5) * H * 2,
        z: Math.random() * W,
        pz: W
      }));
    }

    const ctx = this._starCtx;
    const cx = W / 2, cy = H / 2;

    const frame = () => {
      ctx.fillStyle = 'rgba(3,8,16,.25)';
      ctx.fillRect(0, 0, W, H);

      for (const s of this._stars) {
        s.pz = s.z;
        s.z -= 6;
        if (s.z <= 0) {
          s.x = (Math.random() - .5) * W * 2;
          s.y = (Math.random() - .5) * H * 2;
          s.z = W;
          s.pz = s.z;
        }
        const sx  = (s.x / s.z)  * W + cx;
        const sy  = (s.y / s.z)  * H + cy;
        const psx = (s.x / s.pz) * W + cx;
        const psy = (s.y / s.pz) * H + cy;
        const bright = Math.floor((1 - s.z / W) * 255);
        const size   = Math.max(.6, (1 - s.z / W) * 2.8);

        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = `rgb(${bright},${bright},${Math.min(255, Math.floor(bright * .75 + 60))})`;
        ctx.lineWidth = size;
        ctx.stroke();
      }

      this._starRAF = requestAnimationFrame(frame);
    };

    this._stopStarfield();
    this._starRAF = requestAnimationFrame(frame);
  }

  _stopStarfield() {
    if (this._starRAF) {
      cancelAnimationFrame(this._starRAF);
      this._starRAF = null;
    }
  }

  // ── Event system ──────────────────────────────────────────────────────────

  on(event, callback) { this._callbacks[event] = callback; }

  _emit(event, data) {
    if (this._callbacks[event]) this._callbacks[event](data);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  showMenu(name) {
    this.hideAll();
    const screen = this._screens[name];
    if (screen) screen.style.display = 'block';
    if (name === 'menu') this._startStarfield();
  }

  hideAll() {
    this._stopStarfield();
    Object.values(this._screens).forEach(s => { s.style.display = 'none'; });
  }

  // ── Store update ──────────────────────────────────────────────────────────

  updateStore(store) {
    const coinsEl = document.querySelector('#store-coins');
    if (coinsEl) coinsEl.textContent = `⬡ ${store.getCoins().toLocaleString()}`;

    // Jets
    const jetsEl = document.querySelector('#store-jets');
    if (jetsEl) {
      jetsEl.innerHTML = '';
      store.getJets().forEach(jet => {
        const hex = '#' + jet.color.toString(16).padStart(6, '0');
        const stats = JET_STATS[jet.id] || { speed: 3, agility: 3, armor: 3 };
        const card = document.createElement('div');
        card.className = `sky-card${jet.selected ? ' selected' : ''}`;

        const statusHTML = (() => {
          if (jet.selected) {
            return `<div style="text-align:center;font-size:12px;font-weight:700;letter-spacing:2px;
              color:#00d4ff;border:1px solid #00d4ff;padding:5px;border-radius:3px;
              background:rgba(0,212,255,.08);">✓ ACTIVE</div>`;
          }
          if (jet.purchased) {
            return `<button onclick="this.closest('.sky-card').__selectJet()" style="
              width:100%;font-family:'Rajdhani','Trebuchet MS',sans-serif;
              font-size:12px;font-weight:700;letter-spacing:2px;color:#00d4ff;
              border:1px solid rgba(0,212,255,.5);padding:5px;border-radius:3px;
              background:transparent;cursor:pointer;
              transition:background .15s;">SELECT</button>`;
          }
          const canAfford = store.getCoins() >= jet.price;
          return `<button onclick="this.closest('.sky-card').__buyJet()" style="
            width:100%;font-family:'Rajdhani','Trebuchet MS',sans-serif;
            font-size:12px;font-weight:700;letter-spacing:2px;
            color:${canAfford ? '#ffd700' : '#555'};
            border:1px solid ${canAfford ? 'rgba(255,215,0,.5)' : '#333'};
            padding:5px;border-radius:3px;background:transparent;
            cursor:${canAfford ? 'pointer' : 'not-allowed'};
            transition:background .15s;">${canAfford ? `BUY  ⬡${jet.price.toLocaleString()}` : 'NOT ENOUGH ⬡'}</button>`;
        })();

        card.innerHTML = `
          <div style="
            height:72px;border-radius:6px;margin-bottom:10px;
            background:linear-gradient(135deg,${hex}18,${hex}06);
            border:1px solid ${hex}33;
            display:flex;align-items:center;justify-content:center;
            font-size:32px;position:relative;overflow:hidden;
          ">
            <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:${hex};opacity:.6;"></div>
            ✈
          </div>
          <div style="color:${hex};font-size:15px;font-weight:700;letter-spacing:2px;margin-bottom:2px;">${jet.name.toUpperCase()}</div>
          <div style="font-family:'Share Tech Mono','Courier New',monospace;font-size:10px;color:rgba(255,255,255,.35);letter-spacing:1px;margin-bottom:10px;">${jet.description}</div>
          ${_statBar('SPD', stats.speed, hex)}
          ${_statBar('AGL', stats.agility, '#00d4ff')}
          ${_statBar('ARM', stats.armor, '#ff6a00')}
          <div style="margin-top:10px;">${statusHTML}</div>
        `;

        card.__selectJet = () => { this._emit('selectJet', jet.id); };
        card.__buyJet    = () => { this._emit('buyItem',   jet.id); };
        jetsEl.appendChild(card);
      });
    }

    // Upgrades
    const upgradesEl = document.querySelector('#store-upgrades');
    if (upgradesEl) {
      upgradesEl.innerHTML = '';
      store.getUpgrades().forEach(upg => {
        const row = document.createElement('div');
        row.className = 'sky-card';
        row.style.cssText += 'display:flex;align-items:center;justify-content:space-between;gap:16px;';

        const actionHTML = upg.purchased
          ? `<span style="font-family:'Share Tech Mono','Courier New',monospace;
               font-size:12px;color:#00ff88;letter-spacing:2px;white-space:nowrap;">✓ OWNED</span>`
          : (() => {
              const canAfford = store.getCoins() >= upg.price;
              return `<button data-id="${upg.id}" style="
                font-family:'Rajdhani','Trebuchet MS',sans-serif;
                font-size:13px;font-weight:700;letter-spacing:2px;
                padding:7px 18px;border-radius:3px;white-space:nowrap;
                color:${canAfford ? '#ffd700' : '#555'};
                border:1px solid ${canAfford ? 'rgba(255,215,0,.5)' : '#333'};
                background:transparent;cursor:${canAfford ? 'pointer' : 'not-allowed'};
                transition:background .15s;">BUY  ⬡${upg.price.toLocaleString()}</button>`;
            })();

        row.innerHTML = `
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;color:#00d4ff;letter-spacing:2px;">${upg.name}</div>
            <div style="font-family:'Share Tech Mono','Courier New',monospace;font-size:11px;color:rgba(255,255,255,.4);margin-top:3px;letter-spacing:1px;">${upg.description}</div>
          </div>
          ${actionHTML}
        `;

        const buyBtn = row.querySelector('button[data-id]');
        if (buyBtn && store.getCoins() >= upg.price) {
          buyBtn.onclick = () => this._emit('buyItem', upg.id);
        }
        upgradesEl.appendChild(row);
      });
    }
  }

  // ── Missions update ───────────────────────────────────────────────────────

  updateMissions(missions, coins) {
    const coinsEl = document.querySelector('#missions-coins');
    if (coinsEl) coinsEl.textContent = `⬡ ${coins.toLocaleString()}`;

    const listEl = document.querySelector('#missions-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    missions.forEach((m, i) => {
      const pct = m.maxProgress > 1
        ? Math.round((m.progress / m.maxProgress) * 100)
        : (m.completed ? 100 : 0);

      const row = document.createElement('div');
      row.className = 'mission-row' + (m.completed ? ' complete' : '');
      row.style.animationDelay = `${i * 0.06}s`;

      row.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:16px;font-weight:700;letter-spacing:2px;
              color:${m.completed ? '#00ff88' : '#00d4ff'};">${m.name.toUpperCase()}</span>
            ${m.completed ? `<span style="
              font-family:'Share Tech Mono','Courier New',monospace;
              font-size:10px;letter-spacing:2px;color:#00ff88;
              border:1px solid rgba(0,255,100,.35);padding:1px 7px;border-radius:2px;">DONE</span>` : ''}
          </div>
          <div style="font-family:'Share Tech Mono','Courier New',monospace;
            font-size:14px;color:#ffd700;white-space:nowrap;letter-spacing:1px;">
            ⬡ ${m.reward.toLocaleString()}</div>
        </div>
        <div style="font-family:'Share Tech Mono','Courier New',monospace;
          font-size:11px;color:rgba(255,255,255,.35);letter-spacing:1px;margin-bottom:${m.maxProgress > 1 ? '10px' : '0'};">${m.description}</div>
        ${m.maxProgress > 1 ? `
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="stat-bar-outer">
              <div class="stat-bar-fill" style="
                width:${pct}%;
                background:${m.completed ? '#00ff88' : '#bb00ff'};
              "></div>
            </div>
            <span style="font-family:'Share Tech Mono','Courier New',monospace;
              font-size:11px;color:rgba(255,255,255,.4);white-space:nowrap;">
              ${m.progress} / ${m.maxProgress}</span>
          </div>
        ` : ''}
      `;
      listEl.appendChild(row);
    });
  }

  // ── Results update ────────────────────────────────────────────────────────

  showResults(data) {
    const gradeEl       = document.querySelector('#results-grade');
    const gradeLabel    = document.querySelector('#results-grade-label');
    const statsEl       = document.querySelector('#results-stats');
    const missionsEl    = document.querySelector('#results-missions');
    const newRecordEl   = document.querySelector('#results-new-record');

    const { letter, color, label } = gradeFor(data.distance || 0);
    const dist     = data.distance || 0;
    const bestDist = parseInt(localStorage.getItem('skystriker_best_distance') || '0');
    const isNewPB  = dist >= bestDist && dist > 0;
    if (isNewPB) localStorage.setItem('skystriker_best_distance', String(Math.floor(dist)));

    // Grade
    if (gradeEl) {
      gradeEl.textContent = letter;
      gradeEl.style.color = color;
      gradeEl.style.textShadow = `0 0 40px ${color}, 0 0 80px ${color}66`;
      gradeEl.className = letter === 'S' ? 'grade-S' : '';
      // restart animation
      gradeEl.style.animation = 'none';
      void gradeEl.offsetWidth;
      gradeEl.style.animation = letter === 'S'
        ? 'skyGradeBounce .6s cubic-bezier(.175,.885,.32,1.275) .2s both, skyGradeS 1.5s ease-in-out .8s infinite'
        : 'skyGradeBounce .6s cubic-bezier(.175,.885,.32,1.275) .2s both';
    }
    if (gradeLabel) { gradeLabel.textContent = label; gradeLabel.style.color = color; }

    // New record
    if (newRecordEl) newRecordEl.style.display = isNewPB ? 'block' : 'none';

    // Stats (with animated number counters)
    const mins = Math.floor((data.time || 0) / 60);
    const secs = Math.floor((data.time || 0) % 60);
    const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="results-stat-row">
          <span class="results-stat-label">DISTANCE</span>
          <span class="results-stat-val" id="res-dist" style="color:#ffd700;">0 m</span>
        </div>
        <div class="results-stat-row">
          <span class="results-stat-label">LEVEL REACHED</span>
          <span class="results-stat-val" style="color:#00d4ff;">${data.level || 1}</span>
        </div>
        <div class="results-stat-row">
          <span class="results-stat-label">TIME</span>
          <span class="results-stat-val" style="color:rgba(200,220,255,.8);">${timeStr}</span>
        </div>
        <div class="results-stat-row">
          <span class="results-stat-label">COINS EARNED</span>
          <span class="results-stat-val" id="res-coins" style="color:#ffd700;">⬡ 0</span>
        </div>
      `;

      // Animate numbers
      const distEl  = statsEl.querySelector('#res-dist');
      const coinEl  = statsEl.querySelector('#res-coins');
      this._animateNumber(distEl,  0, Math.floor(dist),              1400, n => n.toLocaleString() + ' m');
      this._animateNumber(coinEl,  0, data.coinsEarned || 0,         1100, n => '⬡ ' + n.toLocaleString(), 300);
    }

    // Missions completed
    if (missionsEl) {
      if (data.completedMissions && data.completedMissions.length > 0) {
        missionsEl.innerHTML = `
          <div style="font-family:'Share Tech Mono','Courier New',monospace;
            font-size:11px;letter-spacing:3px;color:#bb00ff;margin-bottom:10px;">
            ✦ MISSIONS COMPLETED</div>
          ${data.completedMissions.map(m => `
            <div style="font-family:'Share Tech Mono','Courier New',monospace;
              font-size:12px;color:rgba(0,255,100,.7);letter-spacing:1px;margin-bottom:4px;">
              ✓ ${m.name}  <span style="color:#ffd700;">+⬡${m.reward.toLocaleString()}</span></div>
          `).join('')}
        `;
      } else {
        missionsEl.innerHTML = '';
      }
    }
  }

  // ── Number animation helper ───────────────────────────────────────────────

  _animateNumber(el, from, to, duration, format, delay = 0) {
    if (!el) return;
    setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const t  = Math.min(1, (Date.now() - start) / duration);
        const e  = 1 - Math.pow(1 - t, 3); // ease out cubic
        el.textContent = format(Math.floor(from + (to - from) * e));
        if (t < 1) requestAnimationFrame(tick);
      };
      tick();
    }, delay);
  }
}

// ── Standalone helpers ────────────────────────────────────────────────────────

function _statBar(label, value, color) {
  const pct = Math.round((value / 5) * 100);
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
      <span style="font-family:'Share Tech Mono','Courier New',monospace;
        font-size:9px;color:rgba(255,255,255,.35);letter-spacing:2px;
        width:26px;flex-shrink:0;">${label}</span>
      <div class="stat-bar-outer">
        <div class="stat-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
    </div>
  `;
}
