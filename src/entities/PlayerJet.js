import * as THREE from 'three';
import { Jet } from './Jet.js';

const MAX_HEIGHT = 185;
const MIN_HEIGHT = 20;
const MAX_X = 240;

export class PlayerJet extends Jet {
  constructor(scene, inputManager) {
    super(scene, 0x00ccff);
    this.inputManager = inputManager;
    this.baseSpeed = 340;      // forward speed (increases per level)
    this.currentSpeed = 340;
    this.strafeSpeed = 320;    // left/right speed
    this.verticalSpeed = 280;  // up/down speed
    this.pendingPowerUp = null;
    this.powerUpsCollected = 0;
    this.onMissileActivated = null;
    this.onEMPActivated = null;
    this.onPowerUpActivated = null;
    this._empSlowed = false;
    this._empTimer = 0;
    this._boostMult = 1.8;

    // Apply upgrades from storage
    try {
      const upgrades = JSON.parse(localStorage.getItem('skystriker_upgrades') || '[]');
      if (upgrades.includes('speed_1')) this.baseSpeed += 30;
      if (upgrades.includes('boost_1')) this._boostMult = 2.1;
    } catch(e) {}
  }

  setLevelSpeed(speed) {
    this.baseSpeed = speed;
    this.currentSpeed = speed;
  }

  applyPowerUp(type) {
    if (this.onPowerUpActivated) this.onPowerUpActivated(type);
    if (type === 'MISSILE' && this.onMissileActivated) this.onMissileActivated();
    else if (type === 'EMP' && this.onEMPActivated) this.onEMPActivated();
    super.applyPowerUp(type);
  }

  collectPowerUp(type) {
    if (type === 'REPAIR') {
      this.health = Math.min(this.maxHealth, this.health + 1);
    } else {
      this.pendingPowerUp = type;
    }
    this.powerUpsCollected++;
  }

  applyEMP(duration) {
    this._empSlowed = true;
    this._empTimer = duration;
  }

  update(dt) {
    if (!this.alive) { super.update(dt); return; }

    if (this._empSlowed) {
      this._empTimer -= dt;
      if (this._empTimer <= 0) this._empSlowed = false;
    }

    const input = this.inputManager;
    const joystick = input.getJoystick();

    // Strafe left/right — X is flipped due to camera lookAt orientation
    let strafeX = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft'))       strafeX = 1;
    else if (input.isDown('KeyD') || input.isDown('ArrowRight')) strafeX = -1;
    else if (Math.abs(joystick.x) > 0.1)                        strafeX = -joystick.x;

    // Up/down
    let vertY = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp'))         vertY = 1;
    else if (input.isDown('KeyS') || input.isDown('ArrowDown'))  vertY = -1;
    else if (Math.abs(joystick.y) > 0.1)                        vertY = -joystick.y;

    // Use power-up
    if (input.isDown('Space')) {
      input.keys.delete('Space');
      if (this.pendingPowerUp) {
        this.applyPowerUp(this.pendingPowerUp);
        this.pendingPowerUp = null;
      }
    }

    // Forward speed
    let fwdSpeed = this.baseSpeed;
    if (this.activePowerUp === 'BOOST' || this.activePowerUp === 'SHIELD') fwdSpeed *= this._boostMult;
    if (this._empSlowed) fwdSpeed *= 0.5;
    this.currentSpeed = fwdSpeed;

    // Move
    this.group.position.z += fwdSpeed * dt;
    this.group.position.x += strafeX * this.strafeSpeed * dt;
    this.group.position.y += vertY * this.verticalSpeed * dt;

    // Clamp bounds
    this.group.position.x = Math.max(-MAX_X, Math.min(MAX_X, this.group.position.x));
    this.group.position.y = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, this.group.position.y));

    // Visual bank and pitch — NO yaw (always face +Z)
    const targetRoll  = -strafeX * 0.5;
    const targetPitch = -vertY   * 0.28;
    this.group.rotation.x += (targetPitch - this.group.rotation.x) * Math.min(1, dt * 7);
    this.group.rotation.y  = 0;   // NEVER turn back
    this.group.rotation.z += (targetRoll  - this.group.rotation.z) * Math.min(1, dt * 7);

    // Scale trail with speed
    if (this._trailL && this._trailR) {
      const s = Math.min(3, fwdSpeed / 180);
      this._trailL.scale.z = s;
      this._trailR.scale.z = s;
    }

    super.update(dt);
  }
}
