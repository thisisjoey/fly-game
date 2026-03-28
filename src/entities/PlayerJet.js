import * as THREE from 'three';
import { Jet } from './Jet.js';

export class PlayerJet extends Jet {
  constructor(scene, inputManager) {
    super(scene, 0x00ccff);
    this.inputManager = inputManager;
    this.baseSpeed = 260;
    this.currentSpeed = 260;
    this.maxSpeed = 520;
    this.minSpeed = 80;
    this.pendingPowerUp = null;
    this.powerUpsCollected = 0;
    this.consecutiveWins = 0;
    this.totalWins = 0;
    this._empSlowed = false;
    this._empTimer = 0;

    // Apply speed upgrade if any
    try {
      const upgrades = JSON.parse(localStorage.getItem('skystriker_upgrades') || '[]');
      if (upgrades.includes('speed_1')) this.baseSpeed += 40;
      if (upgrades.includes('boost_1')) this._boostMult = 2.2;
      else this._boostMult = 2.0;
    } catch (e) {
      this._boostMult = 1.8;
    }
  }

  collectPowerUp(type) {
    if (type === 'REPAIR') {
      this.applyPowerUp(type);
    } else {
      this.pendingPowerUp = type;
    }
    this.powerUpsCollected++;
  }

  activatePendingPowerUp(allJets) {
    if (!this.pendingPowerUp) return null;
    const type = this.pendingPowerUp;
    this.pendingPowerUp = null;
    this.applyPowerUp(type);
    return type;
  }

  applyEMP(duration) {
    this._empSlowed = true;
    this._empTimer = duration;
  }

  update(dt, allJets) {
    if (!this.alive) {
      super.update(dt);
      return;
    }

    if (this._empSlowed) {
      this._empTimer -= dt;
      if (this._empTimer <= 0) this._empSlowed = false;
    }

    const input = this.inputManager;
    const joystick = input.getJoystick();

    // Determine pitch input
    let pitchInput = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) pitchInput = -1;
    else if (input.isDown('KeyS') || input.isDown('ArrowDown')) pitchInput = 1;
    else pitchInput = -joystick.y;

    // Determine yaw input
    let yawInput = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) yawInput = 1;
    else if (input.isDown('KeyD') || input.isDown('ArrowRight')) yawInput = -1;
    else yawInput = -joystick.x;

    // Roll input
    let rollInput = 0;
    if (input.isDown('KeyQ')) rollInput = 1;
    else if (input.isDown('KeyE')) rollInput = -1;

    // Speed
    const braking = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    let targetSpeed = this.baseSpeed;
    if (this.activePowerUp === 'BOOST') targetSpeed = this.baseSpeed * this._boostMult;
    if (this._empSlowed) targetSpeed *= 0.5;
    if (braking) targetSpeed = this.minSpeed;
    this.currentSpeed += (targetSpeed - this.currentSpeed) * Math.min(1, dt * 3);
    this.currentSpeed = Math.max(this.minSpeed, Math.min(this.maxSpeed, this.currentSpeed));

    // Apply space - use power-up
    if (input.isDown('Space')) {
      input.keys.delete('Space');
      this.activatePendingPowerUp(allJets);
    }

    const ts = this.turnSpeed * dt;
    const rs = this.rollSpeed * dt;

    // Rotate in local space using quaternion rotations
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchInput * ts);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawInput * ts);
    const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollInput * rs);

    this.group.quaternion.multiply(qYaw).multiply(qPitch).multiply(qRoll);

    // Move forward in local +Z direction
    const forward = this.getForwardVector();
    this.group.position.addScaledVector(forward, this.currentSpeed * dt);

    // Boundary push
    const pos = this.group.position;
    const distFromCenter = pos.length();
    if (distFromCenter > 2000) {
      const pushBack = pos.clone().normalize().multiplyScalar(-10 * dt);
      this.group.position.add(pushBack);
    }

    // Hard height ceiling — can't dodge by flying over buildings
    const MAX_HEIGHT = 185;
    const MIN_HEIGHT = 15;
    if (pos.y > MAX_HEIGHT) {
      pos.y = MAX_HEIGHT;
      // Redirect pitch downward so the jet curves back down
      const qDown = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.04);
      this.group.quaternion.multiply(qDown);
    }
    if (pos.y < MIN_HEIGHT) {
      pos.y = MIN_HEIGHT;
    }

    this.computeProgress();
    super.update(dt);
  }
}
