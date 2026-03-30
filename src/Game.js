import * as THREE from 'three';
import { InputManager } from './InputManager.js';
import { PlayerJet } from './entities/PlayerJet.js';
import { Environment } from './world/Environment.js';
import { LevelManager } from './systems/LevelManager.js';
import { MissionSystem } from './systems/MissionSystem.js';
import { StoreSystem } from './systems/StoreSystem.js';
import { HUD } from './ui/HUD.js';
import { Menus } from './ui/Menus.js';

const STATES = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  MILESTONE: 'MILESTONE',
  STORE: 'STORE',
  MISSIONS: 'MISSIONS',
  RESULTS: 'RESULTS',
  GAME_OVER: 'GAME_OVER'
};

const RACE_COUNTDOWN = 3;

export class Game {
  constructor() {
    this.state = STATES.MENU;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.input = null;
    this.environment = null;
    this.levelManager = null;
    this.player = null;
    this.hud = null;
    this.menus = null;
    this.missionSystem = null;
    this.storeSystem = null;

    this._lastTime = 0;
    this._raceTime = 0;
    this._countdownTimer = 0;
    this._countdownPhase = -1;
    this._raceStarted = false;
    this._raceFinished = false;
    this._playerDied = false;
    this._raceEndDelay = 0;
    this._camPos = new THREE.Vector3();
    this._camTarget = new THREE.Vector3();
    this._explosionParticles = [];
    this._milestoneActive = false;
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd8cca8);
    this.scene.fog = new THREE.Fog(0xd8cca8, 600, 3500);

    // Camera
    this.camera = new THREE.PerspectiveCamera(88, window.innerWidth / window.innerHeight, 0.5, 8000);
    this.camera.position.set(0, 112, -50);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    document.body.insertBefore(this.renderer.domElement, document.body.firstChild);

    // Input
    this.input = new InputManager();

    // Systems
    this.storeSystem = new StoreSystem();
    this.missionSystem = new MissionSystem();

    // UI
    const uiContainer = document.getElementById('ui');
    this.hud = new HUD(uiContainer);
    this.menus = new Menus(uiContainer);

    this._bindMenuCallbacks();

    // Resize handler
    window.addEventListener('resize', () => this._onResize());

    // ESC key
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.state === STATES.PLAYING) this._pauseGame();
        else if (this.state === STATES.PAUSED) this._resumeGame();
      }
    });
  }

  start() {
    this.menus.showMenu('menu');
    this._loop(0);
  }

  _bindMenuCallbacks() {
    this.menus.on('play', () => {
      if (this.state === STATES.MENU || this.state === STATES.RESULTS) {
        this.startRace();
      }
    });
    this.menus.on('store', () => {
      this.state = STATES.STORE;
      this.menus.showMenu('store');
      this.menus.updateStore(this.storeSystem);
    });
    this.menus.on('missions', () => {
      this.state = STATES.MISSIONS;
      this.menus.showMenu('missions');
      this.menus.updateMissions(this.missionSystem.getMissions(), this.storeSystem.getCoins());
    });
    this.menus.on('back', () => {
      this.state = STATES.MENU;
      this.menus.showMenu('menu');
    });
    this.menus.on('menu', () => {
      this.state = STATES.MENU;
      this.menus.showMenu('menu');
    });
    this.menus.on('buyItem', (id) => {
      const result = this.storeSystem.buyItem(id);
      if (result.success) {
        this.menus.updateStore(this.storeSystem);
      }
    });
    this.menus.on('selectJet', (id) => {
      this.storeSystem.selectJet(id);
      this.menus.updateStore(this.storeSystem);
    });

    this.hud.bindPauseButtons(
      () => this._resumeGame(),
      () => {
        this._resumeGame();
        this._cleanupRace();
        this.state = STATES.MENU;
        this.menus.showMenu('menu');
      }
    );
  }

  startRace() {
    this._cleanupRace();

    this.state = STATES.PLAYING;
    this.menus.hideAll();

    // Build scene
    this.environment = new Environment(this.scene);

    // Create level manager
    this.levelManager = new LevelManager(this.scene);
    this.levelManager.on('levelUp', (cfg) => {
      if (this.player) {
        this.player.setLevelSpeed(cfg.speed);
      }
    });
    this.levelManager.on('milestone', (data) => {
      this._milestoneActive = true;
      this.hud.showMilestone(data.name, data.subtitle);
    });
    this.levelManager.on('milestoneEnd', () => {
      this._milestoneActive = false;
    });

    // Create player jet
    this.player = new PlayerJet(this.scene, this.input);
    this.player.group.position.set(0, 100, 0);
    this.player.health = 3;
    this.player.maxHealth = 3;

    // Check shield upgrade
    if (this.storeSystem.isPurchased('shield_1')) {
      this.player.shield = true;
    }

    // Power-up activation callbacks
    this.player.onPowerUpActivated = (type) => {
      const flashColors = { BOOST: 0xff7700, SHIELD: 0x0099ff, MISSILE: 0xff2200, EMP: 0xbb00ff, REPAIR: 0x00ee44 };
      if (flashColors[type]) this.hud.showFlash(flashColors[type], 0.45);
    };

    this.player.onMissileActivated = () => {
      if (!this.levelManager) return;
      const { missiles } = this.levelManager.getActiveObjects();
      const playerPos = this.player.group.position;
      let nearest = null, nearestDist = Infinity;
      for (const m of missiles) {
        if (!m.alive) continue;
        const d = playerPos.distanceTo(m.getPosition());
        if (d < nearestDist) { nearestDist = d; nearest = m; }
      }
      if (nearest) {
        this._createExplosion(nearest.getPosition().clone());
        nearest.dispose();
        this.hud.showMessage('SAM DESTROYED!', 1400);
      } else {
        this.hud.showMessage('NO SAM IN RANGE', 1200);
      }
    };

    this.player.onEMPActivated = () => {
      if (!this.levelManager) return;
      const { missiles } = this.levelManager.getActiveObjects();
      let count = 0;
      for (const m of missiles) {
        if (m.alive) { m.applyEMP(5); count++; }
      }
      this.hud.showMessage(count > 0 ? `EMP — ${count} SAM${count > 1 ? 's' : ''} SLOWED` : 'EMP FIRED — NO SAMs', 1600);
    };

    // Set initial respawn position
    this.player.setRespawnAt(new THREE.Vector3(0, 100, 0));

    // Camera initial
    this._camPos.set(0, 112, -50);
    this._camTarget.set(0, 102, 30);
    this.camera.position.copy(this._camPos);

    this._raceTime = 0;
    this._raceStarted = false;
    this._raceFinished = false;
    this._playerDied = false;
    this._raceEndDelay = 0;
    this._milestoneActive = false;

    // Show HUD
    this.hud.show();
    if (this.input.isMobile) this.input.showVirtualControls();

    // Start countdown
    this._startCountdown();
  }

  _startCountdown() {
    this._countdownPhase = RACE_COUNTDOWN;
    this._countdownTimer = 1.0;
    this.hud.showCountdown(RACE_COUNTDOWN);
  }

  _cleanupRace() {
    if (this.levelManager) {
      this.levelManager.dispose();
      this.levelManager = null;
    }

    if (this.player) {
      this.player.dispose();
      this.player = null;
    }

    // Remove environment objects by clearing scene
    if (this.environment) {
      const toRemove = [];
      this.scene.traverse(child => {
        if (child !== this.scene && !(child instanceof THREE.Camera)) {
          toRemove.push(child);
        }
      });
      toRemove.forEach(obj => {
        if (obj.parent) obj.parent.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      this.environment = null;
    }

    // Clean up explosion particles
    this._explosionParticles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this._explosionParticles = [];

    this._milestoneActive = false;
    this.hud.hide();
    this.hud.hidePause();
    this.hud.hideCountdown();
    this.hud.hideRespawnOverlay();
    this.hud.hideMilestone();
    if (this.input) this.input.hideVirtualControls();
  }

  _pauseGame() {
    if (this.state !== STATES.PLAYING) return;
    this.state = STATES.PAUSED;
    this.hud.showPause();
  }

  _resumeGame() {
    if (this.state !== STATES.PAUSED) return;
    this.state = STATES.PLAYING;
    this.hud.hidePause();
  }

  _loop(time) {
    requestAnimationFrame((t) => this._loop(t));

    const rawDt = (time - this._lastTime) / 1000;
    this._lastTime = time;
    const dt = Math.min(rawDt, 0.05); // cap delta time

    this._update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _update(dt) {
    if (this.state === STATES.PLAYING || this.state === STATES.PAUSED || this.state === STATES.MILESTONE) {
      if (this.environment && this.player) {
        this.environment.update(dt, this.player.group.position.z);
        this.environment.updateSpeedEffect(this.player.currentSpeed, 430);
      }
    }

    if (this.state !== STATES.PLAYING) return;

    // Countdown logic
    if (!this._raceStarted) {
      this._countdownTimer -= dt;
      if (this._countdownTimer <= 0) {
        this._countdownPhase--;
        if (this._countdownPhase > 0) {
          this._countdownTimer = 1.0;
          this.hud.showCountdown(this._countdownPhase);
        } else if (this._countdownPhase === 0) {
          this._countdownTimer = 0.8;
          this.hud.showCountdown(0);
        } else {
          this._raceStarted = true;
          this.hud.hideCountdown();
        }
      }
      this._updateCamera(dt);
      return;
    }

    // Race end delay
    if (this._raceFinished) {
      this._raceEndDelay -= dt;
      if (this._raceEndDelay <= 0) {
        this.state = STATES.RESULTS;
        this.menus.showMenu('results');
        this.menus.showResults(this._pendingResults);
        this.hud.hide();
        this._cleanupRace();
        return;
      }
      this._updateCamera(dt);
      return;
    }

    this._raceTime += dt;

    // Update explosions
    this._updateExplosions(dt);

    // Update player
    if (this.player) {
      this.player.update(dt);

      // Show respawn countdown while dead
      if (!this.player.alive && this.player.respawnTimer > 0) {
        this.hud.showRespawnOverlay(this.player.respawnTimer);
      } else if (this.player.alive) {
        this.hud.hideRespawnOverlay();
      }
    }

    // Update level manager
    if (this.levelManager && this.player) {
      this.levelManager.update(dt, this.player.group.position);
    }

    // Collision detection
    this._checkCollisions();

    // Update camera
    this._updateCamera(dt);

    // Update HUD
    this._updateHUD();
  }

  _checkCollisions() {
    if (!this.player || !this.player.alive || !this.levelManager) return;

    const playerPos = this.player.group.position;
    const playerRadius = 5;
    const isInvincible = this.player.invincibleTimer > 0 || this.player.activePowerUp === 'SHIELD';

    const { buildings, missiles, powerUps } = this.levelManager.getActiveObjects();

    // Player vs buildings (AABB check) — skipped during invincibility or shield
    if (isInvincible) {
      // Only collect power-ups while invincible
      const puFlashColors = { BOOST: 0xff7700, SHIELD: 0x0099ff, MISSILE: 0xff2200, EMP: 0xbb00ff, REPAIR: 0x00ee44 };
      for (const pu of powerUps) {
        if (pu.collected) continue;
        const dist = playerPos.distanceTo(pu.getPosition());
        if (dist < playerRadius + 12) {
          pu.collect();
          this.player.collectPowerUp(pu.type);
          this.hud.showMessage(`${pu.type} COLLECTED!`, 1200);
          this.hud.showFlash(puFlashColors[pu.type] || 0xffffff, 0.5);
        }
      }
      return;
    }

    for (const building of buildings) {
      // Broad phase: only check buildings near player in Z
      if (Math.abs(building.posZ - playerPos.z) > building.depth / 2 + playerRadius + 10) continue;

      const aabb = building.getAABB();
      if (
        playerPos.x > aabb.minX - playerRadius &&
        playerPos.x < aabb.maxX + playerRadius &&
        playerPos.y > aabb.minY - playerRadius &&
        playerPos.y < aabb.maxY + playerRadius &&
        playerPos.z > aabb.minZ - playerRadius &&
        playerPos.z < aabb.maxZ + playerRadius
      ) {
        if (!this.player._lastHitTime || Date.now() - this.player._lastHitTime > 600) {
          this.player._lastHitTime = Date.now();
          this._destroyPlayer();
          break;
        }
      }
    }

    // Player vs missiles (sphere check)
    for (const missile of missiles) {
      if (!missile.alive) continue;
      const dist = playerPos.distanceTo(missile.getPosition());
      if (dist < playerRadius + missile.radius) {
        missile.dispose();
        this._destroyPlayer();
        break;
      }
    }

    // Player vs power-ups (sphere check)
    const puFlashColors = { BOOST: 0xff7700, SHIELD: 0x0099ff, MISSILE: 0xff2200, EMP: 0xbb00ff, REPAIR: 0x00ee44 };
    for (const pu of powerUps) {
      if (pu.collected) continue;
      const dist = playerPos.distanceTo(pu.getPosition());
      if (dist < playerRadius + 12) {
        pu.collect();
        this.player.collectPowerUp(pu.type);
        this.hud.showMessage(`${pu.type} COLLECTED!`, 1200);
        this.hud.showFlash(puFlashColors[pu.type] || 0xffffff, 0.5);
      }
    }
  }

  _destroyPlayer() {
    if (!this.player || !this.player.alive) return;

    const explodePos = this.player.group.position.clone();

    // Hide jet immediately
    this.player.group.visible = false;
    this.player.alive = false;
    this.player.dead = true;
    this._playerDied = true;

    // Explosion burst
    this._createExplosion(explodePos);

    // Deduct one life
    this.player.health = Math.max(0, this.player.health - 1);

    if (this.player.health <= 0) {
      // No lives left — game over
      this.hud.showMessage('GAME OVER!', 99999);
      this._raceFinished = true;
      this._raceEndDelay = 3.0;

      const levelConfig = this.levelManager ? this.levelManager.getCurrentLevel() : { level: 1 };
      const dist = this.levelManager ? Math.floor(this.levelManager.distanceTraveled) : 0;

      // Mission check
      const raceStats = {
        position: 1,
        powerUpsCollected: this.player.powerUpsCollected,
        died: this._playerDied,
        won: false
      };
      const missionResult = this.missionSystem.checkMissions(raceStats);
      const coinsEarned = Math.floor(dist / 100) * 10 + missionResult.coinsEarned;
      this.storeSystem.addCoins(coinsEarned);

      this._pendingResults = {
        won: false,
        position: 1,
        totalJets: 1,
        time: this._raceTime,
        coinsEarned,
        completedMissions: missionResult.newlyCompleted,
        level: levelConfig.level,
        distance: dist
      };
      return;
    }

    // Respawn after 3 seconds at current position (slightly ahead)
    const respawnZ = this.player.group.position.z + 50;
    this.player.respawnTimer = 3.0;
    this.player.setRespawnAt(new THREE.Vector3(0, 100, respawnZ));
    this.hud.showRespawnOverlay(3);
  }

  _createExplosion(position) {
    const colors = [0xff4400, 0xff8800, 0xffcc00, 0xff2200, 0xffffff, 0xff6600];
    for (let i = 0; i < 28; i++) {
      const geo = new THREE.SphereGeometry(0.6 + Math.random() * 2.5, 5, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      const speed = 40 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed + 20,
        Math.cos(phi) * speed
      );
      this.scene.add(mesh);
      this._explosionParticles.push({ mesh, vel, life: 1.0 });
    }
  }

  _updateExplosions(dt) {
    this._explosionParticles = this._explosionParticles.filter(p => {
      p.life -= dt * 1.4;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 60 * dt; // gravity
      p.mesh.material.opacity = Math.max(0, p.life);
      p.mesh.scale.setScalar(1 + (1 - p.life) * 1.8);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        return false;
      }
      return true;
    });
  }

  _updateCamera(dt) {
    if (!this.player) return;

    const px = this.player.group.position.x;
    const py = this.player.group.position.y;
    const pz = this.player.group.position.z;

    // Fixed offset behind and above player
    const targetCamPos = new THREE.Vector3(px, py + 12, pz - 50);
    const targetLookAt = new THREE.Vector3(px, py + 2, pz + 30);

    this._camPos.lerp(targetCamPos, Math.min(1, dt * 8));
    this._camTarget.lerp(targetLookAt, Math.min(1, dt * 10));

    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camTarget);

    // Dynamic FOV: 88 + (speed/400) * 15, max 105 when boosting
    const isBoosting = this.player.activePowerUp === 'BOOST';
    const speedRatio = Math.min(1, (this.player.currentSpeed || 180) / 430);
    const targetFOV = isBoosting ? 105 : 88 + speedRatio * 15;
    this.camera.fov += (targetFOV - this.camera.fov) * Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();
  }

  _updateHUD() {
    if (!this.player || !this.levelManager) return;

    const levelConfig = this.levelManager.getCurrentLevel();

    this.hud.update({
      level: levelConfig.level,
      distance: this.levelManager.distanceTraveled,
      speed: this.player.currentSpeed,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      activePowerUp: this.player.activePowerUp,
      pendingPowerUp: this.player.pendingPowerUp,
      powerUpTimer: this.player.powerUpTimer,
      powerUpMaxTimer: this.player.powerUpMaxTimer,
      raceTime: this._raceTime,
      invincibleTimer: this.player.invincibleTimer
    });
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
