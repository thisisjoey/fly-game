export class Menus {
  constructor(uiContainer) {
    this.container = uiContainer;
    this._screens = {};
    this._callbacks = {};
    this._buildStyles();
    this._buildMainMenu();
    this._buildStore();
    this._buildMissions();
    this._buildResults();
  }

  _buildStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes neonPulse {
        0%, 100% { text-shadow: 0 0 10px #00ffcc, 0 0 20px #00ffcc, 0 0 40px #00ffcc; }
        50% { text-shadow: 0 0 20px #00ffcc, 0 0 40px #00ffcc, 0 0 80px #00ffcc, 0 0 120px #00ffcc; }
      }
      @keyframes subtlePulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1.0; }
      }
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes bgFloat {
        0% { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.1); }
        100% { transform: rotate(360deg) scale(1); }
      }
      .sky-screen {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: #0a0a1a;
        display: none;
        overflow-y: auto;
        overflow-x: hidden;
      }
      .sky-btn {
        background: rgba(0, 255, 204, 0.05);
        border: 2px solid #00ffcc;
        color: #00ffcc;
        font-family: 'Courier New', Courier, monospace;
        font-size: 18px;
        padding: 14px 40px;
        cursor: pointer;
        border-radius: 6px;
        text-shadow: 0 0 8px #00ffcc;
        box-shadow: 0 0 15px #00ffcc33;
        transition: all 0.15s;
        letter-spacing: 2px;
        width: 260px;
        text-align: center;
      }
      .sky-btn:hover {
        background: rgba(0, 255, 204, 0.2);
        box-shadow: 0 0 25px #00ffcc66;
        transform: scale(1.04);
      }
      .sky-btn.danger {
        border-color: #ff0066;
        color: #ff0066;
        text-shadow: 0 0 8px #ff0066;
        box-shadow: 0 0 15px #ff006633;
      }
      .sky-btn.danger:hover {
        background: rgba(255, 0, 102, 0.2);
        box-shadow: 0 0 25px #ff006666;
      }
      .sky-btn.gold {
        border-color: #ffcc00;
        color: #ffcc00;
        text-shadow: 0 0 8px #ffcc00;
        box-shadow: 0 0 15px #ffcc0033;
      }
      .sky-btn.gold:hover {
        background: rgba(255, 204, 0, 0.2);
        box-shadow: 0 0 25px #ffcc0066;
      }
      .sky-btn.disabled {
        border-color: #444;
        color: #444;
        text-shadow: none;
        box-shadow: none;
        cursor: not-allowed;
        pointer-events: none;
      }
      .sky-card {
        background: rgba(0, 255, 204, 0.05);
        border: 1px solid #00ffcc44;
        border-radius: 10px;
        padding: 16px;
        transition: border-color 0.2s;
      }
      .sky-card:hover {
        border-color: #00ffcc88;
      }
      .sky-card.selected {
        border-color: #00ffcc;
        box-shadow: 0 0 15px #00ffcc44;
      }
      .coin-display {
        color: #ffcc00;
        font-size: 18px;
        text-shadow: 0 0 8px #ffcc00;
        font-family: 'Courier New', monospace;
      }
    `;
    document.head.appendChild(style);
  }

  _buildMainMenu() {
    const screen = document.createElement('div');
    screen.className = 'sky-screen';
    screen.id = 'screen-menu';

    screen.innerHTML = `
      <div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;">
        <!-- Animated background -->
        <div style="position:absolute;top:50%;left:50%;width:800px;height:800px;transform:translate(-50%,-50%);pointer-events:none;animation:bgFloat 20s linear infinite;opacity:0.04;">
          <div style="width:100%;height:100%;border-radius:50%;border:2px solid #00ffcc;"></div>
          <div style="position:absolute;top:10%;left:10%;width:80%;height:80%;border-radius:50%;border:2px solid #ff00aa;"></div>
          <div style="position:absolute;top:20%;left:20%;width:60%;height:60%;border-radius:50%;border:2px solid #0088ff;"></div>
        </div>

        <!-- Title -->
        <div style="text-align:center;margin-bottom:48px;animation:slideIn 0.6s ease;">
          <div style="color:#00ffcc;font-family:'Courier New',monospace;font-size:clamp(48px,8vw,90px);font-weight:900;letter-spacing:8px;animation:neonPulse 2.5s ease-in-out infinite;">SKY STRIKER</div>
          <div style="color:#ff00aa;font-family:'Courier New',monospace;font-size:clamp(14px,2vw,18px);letter-spacing:6px;margin-top:8px;text-shadow:0 0 10px #ff00aa;">FUTURISTIC JET RACING</div>
          <div style="color:#445566;font-size:12px;margin-top:12px;letter-spacing:3px;">v1.0.0</div>
        </div>

        <!-- Buttons -->
        <div style="display:flex;flex-direction:column;gap:14px;align-items:center;animation:slideIn 0.8s ease;">
          <button class="sky-btn" id="btn-play">▶ PLAY</button>
          <button class="sky-btn" id="btn-store" style="border-color:#ff8800;color:#ff8800;text-shadow:0 0 8px #ff8800;box-shadow:0 0 15px #ff880033;">⬡ STORE</button>
          <button class="sky-btn" id="btn-missions" style="border-color:#aa00ff;color:#aa00ff;text-shadow:0 0 8px #aa00ff;box-shadow:0 0 15px #aa00ff33;">✦ MISSIONS</button>
          <button class="sky-btn disabled">◈ LEADERBOARD</button>
        </div>

        <!-- Controls hint -->
        <div style="position:absolute;bottom:20px;color:#334455;font-size:11px;text-align:center;letter-spacing:2px;font-family:'Courier New',monospace;">
          W/S = PITCH &nbsp;|&nbsp; A/D = YAW &nbsp;|&nbsp; Q/E = ROLL &nbsp;|&nbsp; SHIFT = BRAKE &nbsp;|&nbsp; SPACE = POWER-UP &nbsp;|&nbsp; ESC = PAUSE
        </div>
      </div>
    `;

    this.container.appendChild(screen);
    this._screens['menu'] = screen;

    screen.querySelector('#btn-play').onclick = () => this._emit('play');
    screen.querySelector('#btn-store').onclick = () => this._emit('store');
    screen.querySelector('#btn-missions').onclick = () => this._emit('missions');
  }

  _buildStore() {
    const screen = document.createElement('div');
    screen.className = 'sky-screen';
    screen.id = 'screen-store';

    screen.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:30px 20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:30px;">
          <h1 style="color:#ff8800;font-family:'Courier New',monospace;font-size:42px;font-weight:900;text-shadow:0 0 20px #ff8800;letter-spacing:4px;">STORE</h1>
          <div class="coin-display" id="store-coins">⬡ 1,000,000</div>
        </div>

        <h2 style="color:#00ffcc;font-size:20px;font-family:'Courier New',monospace;margin-bottom:16px;letter-spacing:3px;">JETS</h2>
        <div id="store-jets" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:36px;"></div>

        <h2 style="color:#00ffcc;font-size:20px;font-family:'Courier New',monospace;margin-bottom:16px;letter-spacing:3px;">UPGRADES</h2>
        <div id="store-upgrades" style="display:flex;flex-direction:column;gap:12px;margin-bottom:36px;"></div>

        <button class="sky-btn" id="btn-store-back" style="margin-top:10px;">← BACK</button>
      </div>
    `;

    this.container.appendChild(screen);
    this._screens['store'] = screen;
    screen.querySelector('#btn-store-back').onclick = () => this._emit('back');
  }

  _buildMissions() {
    const screen = document.createElement('div');
    screen.className = 'sky-screen';
    screen.id = 'screen-missions';

    screen.innerHTML = `
      <div style="max-width:700px;margin:0 auto;padding:30px 20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:30px;">
          <h1 style="color:#aa00ff;font-family:'Courier New',monospace;font-size:42px;font-weight:900;text-shadow:0 0 20px #aa00ff;letter-spacing:4px;">MISSIONS</h1>
          <div class="coin-display" id="missions-coins">⬡ 1,000,000</div>
        </div>
        <div id="missions-list" style="display:flex;flex-direction:column;gap:14px;margin-bottom:30px;"></div>
        <button class="sky-btn" id="btn-missions-back">← BACK</button>
      </div>
    `;

    this.container.appendChild(screen);
    this._screens['missions'] = screen;
    screen.querySelector('#btn-missions-back').onclick = () => this._emit('back');
  }

  _buildResults() {
    const screen = document.createElement('div');
    screen.className = 'sky-screen';
    screen.id = 'screen-results';

    screen.innerHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;">
        <div id="results-title" style="color:#00ffcc;font-family:'Courier New',monospace;font-size:52px;font-weight:900;text-shadow:0 0 30px #00ffcc;letter-spacing:6px;animation:neonPulse 2s infinite;">RACE COMPLETE</div>
        <div id="results-subtitle" style="color:#ffcc00;font-size:24px;font-family:'Courier New',monospace;"></div>
        <div id="results-stats" style="background:rgba(0,255,204,0.05);border:1px solid #00ffcc44;border-radius:10px;padding:24px 48px;text-align:center;min-width:300px;"></div>
        <div id="results-missions" style="color:#aa00ff;font-size:14px;text-align:center;font-family:'Courier New',monospace;max-width:400px;"></div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
          <button class="sky-btn gold" id="btn-play-again">▶ PLAY AGAIN</button>
          <button class="sky-btn" id="btn-results-menu">⌂ MAIN MENU</button>
        </div>
      </div>
    `;

    this.container.appendChild(screen);
    this._screens['results'] = screen;
    screen.querySelector('#btn-play-again').onclick = () => this._emit('play');
    screen.querySelector('#btn-results-menu').onclick = () => this._emit('menu');
  }

  on(event, callback) {
    this._callbacks[event] = callback;
  }

  _emit(event, data) {
    if (this._callbacks[event]) this._callbacks[event](data);
  }

  showMenu(name) {
    this.hideAll();
    const screen = this._screens[name];
    if (screen) {
      screen.style.display = 'block';
    }
  }

  hideAll() {
    Object.values(this._screens).forEach(s => {
      s.style.display = 'none';
    });
  }

  updateStore(store) {
    const coinsEl = document.querySelector('#store-coins');
    if (coinsEl) coinsEl.textContent = `⬡ ${store.getCoins().toLocaleString()}`;

    const jetsEl = document.querySelector('#store-jets');
    if (jetsEl) {
      jetsEl.innerHTML = '';
      store.getJets().forEach(jet => {
        const hexColor = '#' + jet.color.toString(16).padStart(6, '0');
        const card = document.createElement('div');
        card.className = `sky-card ${jet.selected ? 'selected' : ''}`;
        card.innerHTML = `
          <div style="width:100%;height:80px;background:${hexColor}22;border-radius:8px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;">
            <div style="font-size:36px;">✈</div>
          </div>
          <div style="color:${hexColor};font-family:'Courier New',monospace;font-weight:bold;font-size:14px;margin-bottom:4px;">${jet.name}</div>
          <div style="color:#667788;font-size:11px;margin-bottom:10px;">${jet.description}</div>
          ${jet.price > 0 ? `<div style="color:#ffcc00;font-size:12px;margin-bottom:8px;">⬡ ${jet.price.toLocaleString()}</div>` : `<div style="color:#00ff44;font-size:12px;margin-bottom:8px;">FREE</div>`}
        `;

        if (jet.selected) {
          const selBtn = document.createElement('button');
          selBtn.textContent = '✓ SELECTED';
          selBtn.style.cssText = `background:#00ffcc22;border:1px solid #00ffcc;color:#00ffcc;font-family:'Courier New',monospace;font-size:11px;padding:6px 12px;cursor:default;border-radius:4px;width:100%;`;
          card.appendChild(selBtn);
        } else if (jet.purchased) {
          const selBtn = document.createElement('button');
          selBtn.textContent = 'SELECT';
          selBtn.style.cssText = `background:transparent;border:1px solid #00ffcc;color:#00ffcc;font-family:'Courier New',monospace;font-size:11px;padding:6px 12px;cursor:pointer;border-radius:4px;width:100%;`;
          selBtn.onclick = () => {
            this._emit('selectJet', jet.id);
            this.updateStore(store);
          };
          card.appendChild(selBtn);
        } else {
          const buyBtn = document.createElement('button');
          const canAfford = store.getCoins() >= jet.price;
          buyBtn.textContent = canAfford ? `BUY ⬡${jet.price.toLocaleString()}` : 'NOT ENOUGH';
          buyBtn.style.cssText = `background:transparent;border:1px solid ${canAfford ? '#ffcc00' : '#444'};color:${canAfford ? '#ffcc00' : '#444'};font-family:'Courier New',monospace;font-size:11px;padding:6px 12px;cursor:${canAfford ? 'pointer' : 'not-allowed'};border-radius:4px;width:100%;`;
          if (canAfford) {
            buyBtn.onclick = () => {
              this._emit('buyItem', jet.id);
              this.updateStore(store);
            };
          }
          card.appendChild(buyBtn);
        }

        jetsEl.appendChild(card);
      });
    }

    const upgradesEl = document.querySelector('#store-upgrades');
    if (upgradesEl) {
      upgradesEl.innerHTML = '';
      store.getUpgrades().forEach(upg => {
        const row = document.createElement('div');
        row.className = 'sky-card';
        row.style.cssText += 'display:flex;align-items:center;justify-content:space-between;';
        row.innerHTML = `
          <div>
            <div style="color:#00ffcc;font-family:'Courier New',monospace;font-size:15px;font-weight:bold;">${upg.name}</div>
            <div style="color:#667788;font-size:12px;margin-top:3px;">${upg.description}</div>
          </div>
          <div style="text-align:right;">
            ${!upg.purchased ? `<div style="color:#ffcc00;font-size:13px;margin-bottom:6px;">⬡ ${upg.price.toLocaleString()}</div>` : ''}
          </div>
        `;

        if (upg.purchased) {
          const ownedSpan = document.createElement('span');
          ownedSpan.style.cssText = 'color:#00ff44;font-size:13px;font-family:Courier New,monospace;';
          ownedSpan.textContent = '✓ OWNED';
          row.appendChild(ownedSpan);
        } else {
          const canAfford = store.getCoins() >= upg.price;
          const buyBtn = document.createElement('button');
          buyBtn.textContent = canAfford ? 'BUY' : 'NEED MORE';
          buyBtn.style.cssText = `background:transparent;border:1px solid ${canAfford ? '#ffcc00' : '#444'};color:${canAfford ? '#ffcc00' : '#444'};font-family:'Courier New',monospace;font-size:12px;padding:6px 16px;cursor:${canAfford ? 'pointer' : 'not-allowed'};border-radius:4px;`;
          if (canAfford) {
            buyBtn.onclick = () => {
              this._emit('buyItem', upg.id);
              this.updateStore(store);
            };
          }
          row.appendChild(buyBtn);
        }
        upgradesEl.appendChild(row);
      });
    }
  }

  updateMissions(missions, coins) {
    const coinsEl = document.querySelector('#missions-coins');
    if (coinsEl) coinsEl.textContent = `⬡ ${coins.toLocaleString()}`;

    const listEl = document.querySelector('#missions-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    missions.forEach(m => {
      const row = document.createElement('div');
      row.className = 'sky-card';
      row.style.cssText += `opacity:${m.completed ? '0.7' : '1'};`;

      const pct = m.maxProgress > 1 ? Math.round((m.progress / m.maxProgress) * 100) : (m.completed ? 100 : 0);

      row.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div>
            <span style="color:${m.completed ? '#00ff44' : '#00ffcc'};font-family:'Courier New',monospace;font-size:15px;font-weight:bold;">${m.name}</span>
            ${m.completed ? '<span style="color:#00ff44;font-size:11px;margin-left:10px;border:1px solid #00ff44;padding:1px 8px;border-radius:4px;">COMPLETED</span>' : ''}
          </div>
          <div style="color:#ffcc00;font-size:14px;">⬡ ${m.reward.toLocaleString()}</div>
        </div>
        <div style="color:#667788;font-size:12px;margin-bottom:8px;">${m.description}</div>
        ${m.maxProgress > 1 ? `
          <div style="background:#111;border-radius:4px;height:6px;margin-bottom:4px;">
            <div style="background:#aa00ff;width:${pct}%;height:100%;border-radius:4px;transition:width 0.5s;"></div>
          </div>
          <div style="color:#667788;font-size:11px;">${m.progress} / ${m.maxProgress}</div>
        ` : ''}
      `;
      listEl.appendChild(row);
    });
  }

  showResults(data) {
    // data: { won, position, totalJets, time, coinsEarned, completedMissions }
    const titleEl = document.querySelector('#results-title');
    const subtitleEl = document.querySelector('#results-subtitle');
    const statsEl = document.querySelector('#results-stats');
    const missionsEl = document.querySelector('#results-missions');

    if (titleEl) {
      titleEl.textContent = data.won ? 'RACE COMPLETE' : 'RACE OVER';
      titleEl.style.color = data.won ? '#00ffcc' : '#ff0066';
      titleEl.style.textShadow = data.won ? '0 0 30px #00ffcc' : '0 0 30px #ff0066';
    }

    const ordinals = ['', '1st', '2nd', '3rd', '4th'];
    const posText = ordinals[data.position] || `${data.position}th`;

    if (subtitleEl) {
      subtitleEl.textContent = data.won ? `YOU FINISHED ${posText}!` : `YOU FINISHED ${posText}`;
    }

    const mins = Math.floor(data.time / 60);
    const secs = Math.floor(data.time % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (statsEl) {
      statsEl.innerHTML = `
        <div style="color:#667788;font-family:'Courier New',monospace;font-size:13px;margin-bottom:12px;">RACE RESULTS</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;color:#aabbcc;font-family:'Courier New',monospace;font-size:14px;min-width:250px;">
            <span>POSITION</span><span style="color:#ffcc00;">${posText} / ${data.totalJets}</span>
          </div>
          <div style="display:flex;justify-content:space-between;color:#aabbcc;font-family:'Courier New',monospace;font-size:14px;">
            <span>RACE TIME</span><span style="color:#00ffcc;">${timeStr}</span>
          </div>
          <div style="display:flex;justify-content:space-between;color:#aabbcc;font-family:'Courier New',monospace;font-size:14px;">
            <span>COINS EARNED</span><span style="color:#ffcc00;">⬡ ${data.coinsEarned.toLocaleString()}</span>
          </div>
        </div>
      `;
    }

    if (missionsEl && data.completedMissions && data.completedMissions.length > 0) {
      missionsEl.innerHTML = `
        <div style="color:#aa00ff;font-size:13px;font-weight:bold;margin-bottom:6px;">✦ MISSIONS COMPLETED</div>
        ${data.completedMissions.map(m => `<div>✓ ${m.name} +⬡${m.reward.toLocaleString()}</div>`).join('')}
      `;
    } else if (missionsEl) {
      missionsEl.innerHTML = '';
    }
  }
}
