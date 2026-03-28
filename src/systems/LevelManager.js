import { Building } from '../entities/Building.js';
import { Missile } from '../entities/Missile.js';
import { PowerUp } from '../entities/PowerUp.js';
import * as THREE from 'three';

// Level start distances (playerZ value when this level triggers)
const LEVEL_THRESHOLDS = [
  0,       // L1
  2800,    // L2
  6500,    // L3
  11500,   // L4
  18000,   // L5  MILESTONE
  26000,   // L6
  35000,   // L7
  46000,   // L8
  58000,   // L9
  72000,   // L10 MILESTONE
  88000,   // L11
  106000,  // L12
  126000,  // L13
  148000,  // L14
  172000,  // L15 MILESTONE
  199000,  // L16
  228000,  // L17
  260000,  // L18
  295000,  // L19
  333000,  // L20 MILESTONE
];

const LEVEL_CONFIGS = [
  // L1 - empty corridor
  { level: 1,  pattern: 'empty',     speed: 340, gapWidth: 160, moveSpeed: 0,  missileFreq: 0,  milestone: null },
  // L2 - sparse pillars
  { level: 2,  pattern: 'pillars',   speed: 360, gapWidth: 160, moveSpeed: 0,  missileFreq: 0,  milestone: null },
  // L3 - gates
  { level: 3,  pattern: 'gate',      speed: 380, gapWidth: 150, moveSpeed: 0,  missileFreq: 0,  milestone: null },
  // L4 - denser gates + pillars
  { level: 4,  pattern: 'mixed',     speed: 400, gapWidth: 140, moveSpeed: 0,  missileFreq: 0,  milestone: null },
  // L5 - MILESTONE + moving buildings
  { level: 5,  pattern: 'mixed',     speed: 425, gapWidth: 130, moveSpeed: 40, missileFreq: 0,  milestone: { name: 'LEVEL 5',  subtitle: 'SECTOR 1 CLEARED!' } },
  // L6 - mixed moving + static
  { level: 6,  pattern: 'mixed',     speed: 445, gapWidth: 125, moveSpeed: 45, missileFreq: 0,  milestone: null },
  // L7 - first missiles
  { level: 7,  pattern: 'mixed',     speed: 465, gapWidth: 120, moveSpeed: 45, missileFreq: 18, milestone: null },
  // L8 - dense maze + missiles
  { level: 8,  pattern: 'maze',      speed: 485, gapWidth: 115, moveSpeed: 50, missileFreq: 15, milestone: null },
  // L9 - tight corridors
  { level: 9,  pattern: 'gauntlet',  speed: 505, gapWidth: 110, moveSpeed: 50, missileFreq: 14, milestone: null },
  // L10 - MILESTONE
  { level: 10, pattern: 'gauntlet',  speed: 530, gapWidth: 105, moveSpeed: 55, missileFreq: 13, milestone: { name: 'LEVEL 10', subtitle: 'SECTOR 2 CLEARED!' } },
  // L11 - fast moving walls
  { level: 11, pattern: 'maze',      speed: 550, gapWidth: 100, moveSpeed: 65, missileFreq: 12, milestone: null },
  // L12 - spiral-ish
  { level: 12, pattern: 'gauntlet',  speed: 570, gapWidth: 98,  moveSpeed: 68, missileFreq: 11, milestone: null },
  // L13 - gate + pillars combined
  { level: 13, pattern: 'maze',      speed: 590, gapWidth: 95,  moveSpeed: 70, missileFreq: 10, milestone: null },
  // L14 - gauntlet
  { level: 14, pattern: 'hell',      speed: 610, gapWidth: 92,  moveSpeed: 72, missileFreq: 10, milestone: null },
  // L15 - MILESTONE
  { level: 15, pattern: 'hell',      speed: 635, gapWidth: 90,  moveSpeed: 75, missileFreq: 9,  milestone: { name: 'LEVEL 15', subtitle: 'SECTOR 3 CLEARED!' } },
  // L16 - hell mode
  { level: 16, pattern: 'hell',      speed: 660, gapWidth: 88,  moveSpeed: 78, missileFreq: 8,  milestone: null },
  // L17 - fast missiles + dense
  { level: 17, pattern: 'nightmare', speed: 685, gapWidth: 85,  moveSpeed: 80, missileFreq: 7,  milestone: null },
  // L18 - near-impossible corridors
  { level: 18, pattern: 'nightmare', speed: 710, gapWidth: 80,  moveSpeed: 82, missileFreq: 6,  milestone: null },
  // L19 - nightmare
  { level: 19, pattern: 'nightmare', speed: 740, gapWidth: 75,  moveSpeed: 85, missileFreq: 5,  milestone: null },
  // L20 - LEGEND
  { level: 20, pattern: 'nightmare', speed: 780, gapWidth: 70,  moveSpeed: 90, missileFreq: 4,  milestone: { name: 'LEVEL 20', subtitle: 'LEGEND!' } },
];

const CHUNK_INTERVAL = 220;
const SPAWN_AHEAD = 900;
const CLEANUP_BEHIND = 250;
const POWERUP_INTERVAL = 5; // every N chunks

export class LevelManager {
  constructor(scene) {
    this.scene = scene;
    this._levelIndex = 0;
    this._nextChunkZ = 400;
    this._chunkCount = 0;
    this._buildings = [];
    this._missiles = [];
    this._powerUps = [];
    this._missileTimer = 0;
    this._callbacks = {};
    this._milestoneActive = false;
    this._milestoneTimer = 0;
    this.distanceTraveled = 0;
    this._lastGapCenter = 0;
  }

  getCurrentLevel() {
    return LEVEL_CONFIGS[this._levelIndex];
  }

  on(event, cb) {
    this._callbacks[event] = cb;
  }

  _emit(event, data) {
    if (this._callbacks[event]) this._callbacks[event](data);
  }

  update(dt, playerPosition) {
    this.distanceTraveled = playerPosition.z;
    const playerZ = playerPosition.z;

    // Check for level advancement
    this._checkLevelAdvancement(playerZ);

    // Don't spawn during milestone pause
    if (!this._milestoneActive) {
      // Spawn chunks ahead
      while (playerZ + SPAWN_AHEAD > this._nextChunkZ) {
        this._spawnChunk(this._nextChunkZ);
        this._nextChunkZ += CHUNK_INTERVAL;
        this._chunkCount++;
      }
    }

    // Update all buildings
    for (const b of this._buildings) {
      b.update(dt);
    }

    // Cleanup buildings behind
    for (let i = this._buildings.length - 1; i >= 0; i--) {
      if (this._buildings[i].posZ < playerZ - CLEANUP_BEHIND) {
        this._buildings[i].dispose();
        this._buildings.splice(i, 1);
      }
    }

    // Missile spawning
    const cfg = this.getCurrentLevel();
    if (cfg.missileFreq > 0 && !this._milestoneActive) {
      this._missileTimer -= dt;
      if (this._missileTimer <= 0) {
        this._missileTimer = cfg.missileFreq * (0.8 + Math.random() * 0.4);
        const side = Math.random() < 0.5 ? -1 : 1;
        const spawnPos = new THREE.Vector3(
          playerPosition.x + side * (200 + Math.random() * 100),
          playerPosition.y + (Math.random() - 0.5) * 40,
          playerPosition.z + 300 + Math.random() * 200
        );
        const missile = new Missile(this.scene, spawnPos);
        this._missiles.push(missile);
      }
    }

    // Update missiles
    for (let i = this._missiles.length - 1; i >= 0; i--) {
      const m = this._missiles[i];
      if (!m.alive) {
        this._missiles.splice(i, 1);
        continue;
      }
      m.update(dt, playerPosition);
      // Cleanup missiles that fly too far behind
      if (m.getPosition().z < playerZ - 400) {
        m.dispose();
        this._missiles.splice(i, 1);
      }
    }

    // Update power-ups
    for (let i = this._powerUps.length - 1; i >= 0; i--) {
      const pu = this._powerUps[i];
      if (pu.collected) {
        this._powerUps.splice(i, 1);
        continue;
      }
      pu.update(dt);
      if (pu.getPosition().z < playerZ - CLEANUP_BEHIND) {
        if (!pu.collected) {
          pu.collect();
        }
        this._powerUps.splice(i, 1);
      }
    }

    // Milestone timer
    if (this._milestoneActive) {
      this._milestoneTimer -= dt;
      if (this._milestoneTimer <= 0) {
        this._milestoneActive = false;
        this._emit('milestoneEnd', {});
      }
    }
  }

  _checkLevelAdvancement(playerZ) {
    // Check if we should advance to next level
    const nextLevelIdx = this._levelIndex + 1;
    if (nextLevelIdx < LEVEL_THRESHOLDS.length) {
      if (playerZ >= LEVEL_THRESHOLDS[nextLevelIdx]) {
        this._levelIndex = nextLevelIdx;
        const cfg = LEVEL_CONFIGS[this._levelIndex];
        this._emit('levelUp', cfg);

        if (cfg.milestone) {
          this._milestoneActive = true;
          this._milestoneTimer = 3.0;
          this._emit('milestone', cfg.milestone);
        }

        // Reset missile timer for new level
        this._missileTimer = cfg.missileFreq > 0 ? cfg.missileFreq : 999999;
      }
    }
  }

  _spawnChunk(chunkZ) {
    const cfg = this.getCurrentLevel();

    // Spawn power-up every N chunks
    if (this._chunkCount > 0 && this._chunkCount % POWERUP_INTERVAL === 0) {
      this._spawnPowerUp(chunkZ, cfg);
    }

    this._spawnPattern(chunkZ, cfg);
  }

  _spawnPattern(chunkZ, cfg) {
    switch (cfg.pattern) {
      case 'empty':
        return;
      case 'pillars':
        this._patternPillars(chunkZ, cfg);
        break;
      case 'gate':
        this._patternGate(chunkZ, cfg);
        break;
      case 'mixed':
        if (Math.random() < 0.5) this._patternGate(chunkZ, cfg);
        else this._patternPillars(chunkZ, cfg);
        break;
      case 'maze':
        this._patternMaze(chunkZ, cfg);
        break;
      case 'gauntlet':
        this._patternGauntlet(chunkZ, cfg);
        break;
      case 'hell':
        this._patternHell(chunkZ, cfg);
        break;
      case 'nightmare':
        this._patternNightmare(chunkZ, cfg);
        break;
      default:
        return;
    }
  }

  _patternPillars(chunkZ, cfg) {
    const count = 1 + Math.floor(Math.random() * 3);
    const placedXs = [];
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let x;
      do {
        x = (Math.random() - 0.5) * 400; // -200 to 200
        attempts++;
      } while (attempts < 20 && placedXs.some(px => Math.abs(px - x) < 80));

      placedXs.push(x);
      const w = 50 + Math.random() * 30;
      const d = 50 + Math.random() * 30;
      const h = 50 + Math.random() * 110;
      const moving = cfg.moveSpeed > 0 && Math.random() < 0.4;
      this._buildings.push(new Building(
        this.scene, x, 0, chunkZ, w, d, h,
        { moving, moveAxis: 'x', moveSpeed: cfg.moveSpeed, moveRange: 50, movePhase: Math.random() * Math.PI * 2 }
      ));
    }
  }

  _patternGate(chunkZ, cfg) {
    const gapWidth = cfg.gapWidth;
    const gapCenter = (Math.random() - 0.5) * 160; // -80 to 80
    this._lastGapCenter = gapCenter;
    const gapLeft = gapCenter - gapWidth / 2;
    const gapRight = gapCenter + gapWidth / 2;

    const wallH = 180;
    const wallD = 60;
    const moving = cfg.moveSpeed > 0 && Math.random() < 0.5;
    const movePhase = Math.random() * Math.PI * 2;

    // Left wall: from x=-260 to gapLeft
    const leftW = Math.max(5, gapLeft - (-260));
    const leftCenterX = -260 + leftW / 2;
    if (leftW > 5) {
      this._buildings.push(new Building(
        this.scene, leftCenterX, 0, chunkZ, leftW, wallD, wallH,
        { moving, moveAxis: 'x', moveSpeed: cfg.moveSpeed, moveRange: 60, movePhase }
      ));
    }

    // Right wall: from gapRight to x=260
    const rightW = Math.max(5, 260 - gapRight);
    const rightCenterX = gapRight + rightW / 2;
    if (rightW > 5) {
      this._buildings.push(new Building(
        this.scene, rightCenterX, 0, chunkZ, rightW, wallD, wallH,
        { moving, moveAxis: 'x', moveSpeed: cfg.moveSpeed, moveRange: 60, movePhase: movePhase + Math.PI }
      ));
    }

    // Occasionally add ceiling slab for height variation
    if (Math.random() < 0.3) {
      const ceilY = 140 + Math.random() * 30;
      const ceilW = gapWidth * 0.8;
      this._buildings.push(new Building(
        this.scene, gapCenter, ceilY, chunkZ + 20, ceilW, wallD * 0.6, 20,
        {}
      ));
    }
  }

  _patternMaze(chunkZ, cfg) {
    // Gate + 1-2 extra pillars on the open side
    this._patternGate(chunkZ, cfg);
    const extra = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < extra; i++) {
      // Place pillars away from the gap
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (100 + Math.random() * 100);
      const w = 40 + Math.random() * 30;
      const d = 40 + Math.random() * 30;
      const h = 60 + Math.random() * 100;
      const moving = cfg.moveSpeed > 0 && Math.random() < 0.3;
      this._buildings.push(new Building(
        this.scene, x, 0, chunkZ + 30 + i * 40, w, d, h,
        { moving, moveAxis: 'y', moveSpeed: cfg.moveSpeed, moveRange: 60, movePhase: Math.random() * Math.PI * 2 }
      ));
    }
  }

  _patternGauntlet(chunkZ, cfg) {
    // Two gates in same chunk, 80 units apart in Z
    const gapWidth = cfg.gapWidth;
    const gapCenter1 = (Math.random() - 0.5) * 160;
    const gapCenter2 = (Math.random() - 0.5) * 160;
    this._spawnGateAt(chunkZ, gapCenter1, gapWidth, cfg);
    this._spawnGateAt(chunkZ + 80, gapCenter2, gapWidth, cfg);
  }

  _patternHell(chunkZ, cfg) {
    // Three rows of gates, gap shrinks to 90 units
    const gapWidth = Math.max(90, cfg.gapWidth);
    for (let i = 0; i < 3; i++) {
      const gapCenter = (Math.random() - 0.5) * 120;
      this._spawnGateAt(chunkZ + i * 70, gapCenter, gapWidth, cfg);
    }
  }

  _patternNightmare(chunkZ, cfg) {
    // Three rows, gap 70-80 units, all potentially moving
    const gapWidth = 70 + Math.random() * 10;
    for (let i = 0; i < 3; i++) {
      const gapCenter = (Math.random() - 0.5) * 120;
      this._spawnGateAt(chunkZ + i * 65, gapCenter, gapWidth, cfg, true);
    }
  }

  _spawnGateAt(z, gapCenter, gapWidth, cfg, forceMoving = false) {
    const gapLeft = gapCenter - gapWidth / 2;
    const gapRight = gapCenter + gapWidth / 2;

    const wallH = 180;
    const wallD = 55;
    const moving = forceMoving || (cfg.moveSpeed > 0 && Math.random() < 0.6);
    const movePhase = Math.random() * Math.PI * 2;

    const leftW = Math.max(5, gapLeft - (-260));
    const leftCenterX = -260 + leftW / 2;
    if (leftW > 5) {
      this._buildings.push(new Building(
        this.scene, leftCenterX, 0, z, leftW, wallD, wallH,
        { moving, moveAxis: 'x', moveSpeed: cfg.moveSpeed, moveRange: 55, movePhase }
      ));
    }

    const rightW = Math.max(5, 260 - gapRight);
    const rightCenterX = gapRight + rightW / 2;
    if (rightW > 5) {
      this._buildings.push(new Building(
        this.scene, rightCenterX, 0, z, rightW, wallD, wallH,
        { moving, moveAxis: 'x', moveSpeed: cfg.moveSpeed, moveRange: 55, movePhase: movePhase + Math.PI }
      ));
    }
  }

  _spawnPowerUp(chunkZ, cfg) {
    const types = ['BOOST', 'SHIELD', 'REPAIR', 'EMP', 'MISSILE'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Place in a safe corridor position
    const x = this._lastGapCenter + (Math.random() - 0.5) * 40;
    const y = 60 + Math.random() * 60;
    const z = chunkZ + 50;

    const pu = new PowerUp(this.scene, type, new THREE.Vector3(x, y, z));
    this._powerUps.push(pu);
  }

  getActiveObjects() {
    return {
      buildings: this._buildings,
      missiles: this._missiles,
      powerUps: this._powerUps
    };
  }

  reset() {
    // Dispose all active objects
    for (const b of this._buildings) b.dispose();
    this._buildings = [];

    for (const m of this._missiles) { if (m.alive) m.dispose(); }
    this._missiles = [];

    for (const pu of this._powerUps) { if (!pu.collected) pu.collect(); }
    this._powerUps = [];

    this._levelIndex = 0;
    this._nextChunkZ = 400;
    this._chunkCount = 0;
    this._missileTimer = 0;
    this._milestoneActive = false;
    this._milestoneTimer = 0;
    this.distanceTraveled = 0;
    this._lastGapCenter = 0;
  }

  dispose() {
    this.reset();
  }
}
