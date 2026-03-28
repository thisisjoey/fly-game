import * as THREE from 'three';
import { InputManager } from './InputManager.js';
import { PlayerJet } from './entities/PlayerJet.js';
import { AIJet } from './entities/AIJet.js';
import { Track } from './world/Track.js';
import { Environment } from './world/Environment.js';
import { MissionSystem } from './systems/MissionSystem.js';
import { StoreSystem } from './systems/StoreSystem.js';
import { HUD } from './ui/HUD.js';
import { Menus } from './ui/Menus.js';

const STATES = {
  MENU: 'MENU',
  RACING: 'RACING',
  PAUSED: 'PAUSED',
  STORE: 'STORE',
  MISSIONS: 'MISSIONS',
  RESULTS: 'RESULTS'
};

const TOTAL_LAPS = 3;
const RACE_COUNTDOWN = 3;

export class Game {
  constructor() {
    this.state = STATES.MENU;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.input = null;
    this.track = null;
    this.environment = null;
    this.player = null;
    this.aiJets = [];
    this.allJets = [];
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
    this._explosionParticles = [];  // {mesh, vel, life}
    this._playerDestroyedThisFrame = false;
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd8cca8);
    this.scene.fog = new THREE.Fog(0xd8cca8, 400, 2800);

    // Camera
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.5, 8000);
    this.camera.position.set(0, 8, -30);

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
        if (this.state === STATES.RACING) this._pauseGame();
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

    this.state = STATES.RACING;
    this.menus.hideAll();

    // Build scene
    this.environment = new Environment(this.scene);
    this.track = new Track(this.scene);
    this.track.spawnPowerUps();
    this.track.spawnObstacles();

    // Create player jet
    const jetColor = this.storeSystem.getSelectedJetColor();
    this.player = new PlayerJet(this.scene, this.input);
    this.player.group.position.set(0, 90, -10);

    // Check shield upgrade
    if (this.storeSystem.isPurchased('shield_1')) {
      this.player.shield = true;
    }

    // Create AI jets
    this.aiJets = [];
    for (let i = 0; i < 3; i++) {
      const ai = new AIJet(this.scene, this.track, i, i);
      ai.group.position.set((i - 1) * 20, 90, -15 + i * 5);
      this.aiJets.push(ai);
    }

    this.allJets = [this.player, ...this.aiJets];

    // Set respawn at first checkpoint
    this.allJets.forEach(j => j.setRespawnAt(this.track.getCheckpointPosition(0)));

    // Camera initial
    this._camPos.copy(this.player.group.position);
    this._camPos.z -= 25;
    this._camPos.y += 8;
    this.camera.position.copy(this._camPos);

    this._raceTime = 0;
    this._raceStarted = false;
    this._raceFinished = false;
    this._playerDied = false;
    this._raceEndDelay = 0;

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
    if (this.track) {
      this.track.dispose();
      this.track = null;
    }
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
    this.aiJets.forEach(ai => ai.dispose());
    this.aiJets = [];
    this.allJets = [];

    // Remove environment objects by clearing scene
    if (this.environment) {
      // Remove all non-permanent objects
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

    this.hud.hide();
    this.hud.hidePause();
    this.hud.hideCountdown();
    this.hud.hideRespawnOverlay();
    if (this.input) this.input.hideVirtualControls();
  }

  _pauseGame() {
    if (this.state !== STATES.RACING) return;
    this.state = STATES.PAUSED;
    this.hud.showPause();
  }

  _resumeGame() {
    if (this.state !== STATES.PAUSED) return;
    this.state = STATES.RACING;
    this.hud.hidePause();
  }

  resetRace() {
    this.startRace();
  }

  endRace() {
    if (this._raceFinished) return;
    this._raceFinished = true;
    this._raceEndDelay = 3.0;

    // Calculate position
    const ranking = this._getRanking();
    const playerRank = ranking.findIndex(j => j === this.player) + 1;
    const won = playerRank === 1;

    // Base coins
    const coinsMap = [500, 350, 200, 100];
    let coinsEarned = coinsMap[Math.min(playerRank - 1, coinsMap.length - 1)];

    // Mission check
    const raceStats = {
      position: playerRank,
      powerUpsCollected: this.player.powerUpsCollected,
      died: this._playerDied,
      won: won
    };
    const missionResult = this.missionSystem.checkMissions(raceStats);
    coinsEarned += missionResult.coinsEarned;
    this.storeSystem.addCoins(coinsEarned);

    // Show result message
    const msgs = ['1ST PLACE!', '2ND PLACE!', '3RD PLACE!', '4TH PLACE'];
    this.hud.showMessage(msgs[Math.min(playerRank - 1, msgs.length - 1)], 3000);

    // Store result for results screen
    this._pendingResults = {
      won,
      position: playerRank,
      totalJets: this.allJets.length,
      time: this._raceTime,
      coinsEarned,
      completedMissions: missionResult.newlyCompleted
    };
  }

  _getRanking() {
    return [...this.allJets].sort((a, b) => b.progress - a.progress);
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
    if (this.state === STATES.RACING || this.state === STATES.PAUSED) {
      if (this.environment) {
        this.environment.update(dt);
        if (this.player) {
          this.environment.updateSpeedEffect(this.player.currentSpeed, 520);
        }
      }
    }

    if (this.state !== STATES.RACING) return;

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

    // Update explosions always
    this._updateExplosions(dt);

    // Update player
    if (this.player) {
      this.player.update(dt, this.allJets);

      // Show respawn countdown while dead
      if (!this.player.alive && this.player.respawnTimer > 0) {
        this.hud.showRespawnOverlay(this.player.respawnTimer);
      } else if (this.player.alive) {
        this.hud.hideRespawnOverlay();
      }
    }

    // Update AI jets
    this.aiJets.forEach(ai => {
      ai.update(dt, this.player ? this.player.group.position : new THREE.Vector3(), this.allJets);
    });

    // Update track
    if (this.track) {
      this.track.update(dt);
      // Sync active checkpoint to player
      if (this.player) {
        this.track.setActiveCheckpoint(this.player.checkpointIndex);
      }
    }

    // Collision detection
    this._checkCollisions();

    // Checkpoint detection
    this._checkCheckpoints();

    // Update rankings
    this.allJets.forEach(j => j.computeProgress());

    // Update camera
    this._updateCamera(dt);

    // Update HUD
    this._updateHUD();
  }

  _checkCollisions() {
    if (!this.player || !this.player.alive) return;
    const playerPos = this.player.group.position;
    const playerRadius = 5;

    // Power-ups
    if (this.track) {
      this.track.powerUps.forEach(pu => {
        if (pu.collected) return;
        const dist = playerPos.distanceTo(pu.getPosition());
        if (dist < playerRadius + pu.radius) {
          pu.collect();
          this.player.collectPowerUp(pu.type);
          this.hud.showMessage(`${pu.type} COLLECTED!`, 1200);
        }
      });

      // Obstacle collision — instant destroy
      this.track.obstacles.forEach(ob => {
        if (ob.collected || !this.player.alive) return;
        const dist = playerPos.distanceTo(ob.getPosition());
        if (dist < playerRadius + ob.radius) {
          if (!this.player._lastHitTime || Date.now() - this.player._lastHitTime > 600) {
            this.player._lastHitTime = Date.now();
            this._destroyPlayer();
          }
        }
      });
    }

    // Building collision — check against stored building bounds
    if (this.environment && this.player.alive) {
      const buildings = this.environment.getBuildingData();
      for (const b of buildings) {
        const dx = Math.abs(playerPos.x - b.x);
        const dz = Math.abs(playerPos.z - b.z);
        // Quick broad-phase reject
        if (dx > b.w * 0.5 + playerRadius + 15 || dz > b.d * 0.5 + playerRadius + 15) continue;
        // Narrow-phase: inside the building footprint and below its top
        if (dx < b.w * 0.5 + playerRadius &&
            dz < b.d * 0.5 + playerRadius &&
            playerPos.y < b.h + playerRadius &&
            playerPos.y > 0) {
          this._destroyPlayer();
          break;
        }
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
      this._pendingResults = {
        won: false,
        position: this._getRanking().findIndex(j => j === this.player) + 1,
        totalJets: this.allJets.length,
        time: this._raceTime,
        coinsEarned: 0,
        completedMissions: []
      };
      return;
    }

    // Respawn after 3 seconds at last checkpoint
    this.player.respawnTimer = 3.0;
    this.player.setRespawnAt(this.track.getCheckpointPosition(
      Math.max(0, this.player.checkpointIndex)
    ));
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

  _checkCheckpoints() {
    if (!this.track) return;

    this.allJets.forEach(jet => {
      if (!jet.alive) return;
      const cpPos = this.track.getCheckpointPosition(jet.checkpointIndex);
      const dist = jet.group.position.distanceTo(cpPos);

      if (dist < 70) {
        // Dot product check - jet should be moving toward/through checkpoint
        const fwd = jet.getForwardVector();
        const toCP = cpPos.clone().sub(jet.group.position).normalize();
        const dot = fwd.dot(toCP);

        if (dot > -0.5) { // not flying away from it
          jet.setRespawnAt(cpPos.clone());
          const lapCompleted = this.track.advanceCheckpoint(jet);

          if (jet === this.player) {
            if (lapCompleted) {
              if (this.player.lap >= TOTAL_LAPS) {
                this.endRace();
              } else {
                this.hud.showMessage(`LAP ${this.player.lap + 1}!`, 2000);
              }
            } else {
              this.hud.showMessage(`CHECKPOINT ${this.player.checkpointIndex}`, 800);
            }
          } else {
            // AI completed race
            if (lapCompleted && jet.lap >= TOTAL_LAPS && !this._raceFinished) {
              this.endRace();
            }
          }
        }
      }
    });
  }

  _updateCamera(dt) {
    if (!this.player) return;

    const jetPos = this.player.group.position;
    const back = this.player.getBackwardVector();
    const up = new THREE.Vector3(0, 1, 0);
    const jetUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.player.group.quaternion);
    const blendedUp = up.clone().lerp(jetUp, 0.25).normalize();

    // Pull camera further back at higher speeds for rush feel
    const speedRatio = Math.min(1, (this.player.currentSpeed || 260) / 520);
    const camDist = 45 + speedRatio * 20;
    const camHeight = 10 + speedRatio * 4;

    const targetCamPos = jetPos.clone()
      .addScaledVector(back, camDist)
      .addScaledVector(blendedUp, camHeight);

    this._camPos.lerp(targetCamPos, Math.min(1, dt * 8));
    this.camera.position.copy(this._camPos);

    const lookTarget = jetPos.clone().addScaledVector(this.player.getForwardVector(), 35);
    this._camTarget.lerp(lookTarget, Math.min(1, dt * 10));
    this.camera.lookAt(this._camTarget);

    // Dynamic FOV — widens at high speed / boost for rush feel
    const isBoosting = this.player.activePowerUp === 'BOOST';
    const targetFOV = isBoosting ? 110 : 90 + speedRatio * 12;
    this.camera.fov += (targetFOV - this.camera.fov) * Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();
  }

  _updateHUD() {
    if (!this.player || !this.track) return;

    const ranking = this._getRanking();
    const playerRank = ranking.findIndex(j => j === this.player) + 1;

    // Checkpoint direction for arrow indicator
    const cpPos = this.track.getCheckpointPosition(this.player.checkpointIndex);
    const cpVec = cpPos.clone().sub(this.player.group.position);
    const dist = cpVec.length();

    let checkpointDir = null;
    if (dist > 150) {
      // Project to screen
      const cpScreen = cpPos.clone().project(this.camera);
      const screenX = (cpScreen.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-cpScreen.y * 0.5 + 0.5) * window.innerHeight;
      const offscreen = cpScreen.x < -1 || cpScreen.x > 1 || cpScreen.y < -1 || cpScreen.y > 1 || cpScreen.z > 1;
      checkpointDir = { screenX, screenY, offscreen };
    }

    this.hud.update({
      lap: this.player.lap,
      totalLaps: TOTAL_LAPS,
      position: playerRank,
      totalJets: this.allJets.length,
      speed: this.player.currentSpeed,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      activePowerUp: this.player.activePowerUp,
      pendingPowerUp: this.player.pendingPowerUp,
      raceTime: this._raceTime,
      checkpointDir
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
