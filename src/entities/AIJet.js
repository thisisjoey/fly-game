import * as THREE from 'three';
import { Jet } from './Jet.js';

const AI_COLORS = [0xff4400, 0xffcc00, 0xff00aa];
const AI_NAMES = ['VIPER-1', 'NOVA-X', 'SHADOW'];

export class AIJet extends Jet {
  constructor(scene, track, difficulty, index) {
    super(scene, AI_COLORS[index % AI_COLORS.length]);
    this.track = track;
    this.difficulty = difficulty; // 0=easy, 1=medium, 2=hard
    this.name = AI_NAMES[index % AI_NAMES.length];
    this.index = index;

    const speeds = [210, 245, 275];
    this.baseSpeed = speeds[difficulty];
    this.currentSpeed = this.baseSpeed;
    this._empSlowed = false;
    this._empTimer = 0;
    this._wobbleTimer = 0;
    this._wobble = new THREE.Vector3();
    this._powerUpTimer = Math.random() * 5 + 3;
    this._hasPowerUp = false;

    // Offset starting positions so they don't overlap
    const offsets = [
      new THREE.Vector3(15, 0, 0),
      new THREE.Vector3(-15, 0, 0),
      new THREE.Vector3(0, 15, 0)
    ];
    this.group.position.copy(offsets[index % offsets.length]);
  }

  applyEMP(duration) {
    this._empSlowed = true;
    this._empTimer = duration;
  }

  takeMissileDamage(amount) {
    this.takeDamage(amount);
  }

  update(dt, playerPosition, allJets) {
    if (!this.alive) {
      super.update(dt);
      return;
    }

    if (this._empSlowed) {
      this._empTimer -= dt;
      if (this._empTimer <= 0) this._empSlowed = false;
    }

    // Get next checkpoint, clamped to height ceiling
    const MAX_HEIGHT = 185;
    const targetPos = this.track.getCheckpointPosition(this.checkpointIndex);
    targetPos.y = Math.min(targetPos.y, MAX_HEIGHT);

    // Direction to target
    const toTarget = targetPos.clone().sub(this.group.position);
    const dist = toTarget.length();

    // Check if reached checkpoint
    if (dist < 70) {
      const advanced = this.track.advanceCheckpoint(this);
      this.setRespawnAt(this.group.position.clone());
      if (advanced) {
        // Lap complete - handled externally
      }
    }

    // Steering toward checkpoint
    const forward = this.getForwardVector();
    const toTargetNorm = toTarget.normalize();

    // Compute rotation needed
    const currentQuat = this.group.quaternion.clone();
    const targetQuat = new THREE.Quaternion();
    const lookM = new THREE.Matrix4();
    // We want to face +Z toward target, so we use lookAt
    const tempPos = this.group.position.clone();
    const tempTarget = targetPos.clone();
    lookM.lookAt(tempPos, tempTarget, new THREE.Vector3(0, 1, 0));
    // Convert lookAt matrix (which makes -Z face target) -> flip to +Z
    const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    targetQuat.setFromRotationMatrix(lookM);
    targetQuat.multiply(flipQuat);

    const turnRate = [0.8, 1.2, 1.8][this.difficulty] * dt;
    this.group.quaternion.slerp(targetQuat, Math.min(1, turnRate));

    // Add wobble
    this._wobbleTimer += dt;
    if (this._wobbleTimer > 0.5) {
      this._wobbleTimer = 0;
      const wobbleStrength = [0.15, 0.08, 0.04][this.difficulty];
      this._wobble.set(
        (Math.random() - 0.5) * wobbleStrength,
        (Math.random() - 0.5) * wobbleStrength,
        0
      );
    }

    // Apply wobble as small additional rotation
    const qWobble = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(this._wobble.x * dt * 10, this._wobble.y * dt * 10, 0)
    );
    this.group.quaternion.multiply(qWobble);

    // Move forward
    let speed = this.baseSpeed;
    if (this._empSlowed) speed *= 0.5;
    this.currentSpeed += (speed - this.currentSpeed) * Math.min(1, dt * 2);

    const fwd = this.getForwardVector();
    this.group.position.addScaledVector(fwd, this.currentSpeed * dt);

    // Enforce height bounds for AI too
    if (this.group.position.y > MAX_HEIGHT) this.group.position.y = MAX_HEIGHT;
    if (this.group.position.y < 15) this.group.position.y = 15;

    // Random power-up usage
    this._powerUpTimer -= dt;
    if (this._powerUpTimer <= 0) {
      this._powerUpTimer = Math.random() * 8 + 5;
      const types = ['BOOST', 'EMP', 'MISSILE'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.applyPowerUp(type);

      // Apply EMP to opponents
      if (type === 'EMP' && allJets) {
        allJets.forEach(jet => {
          if (jet !== this && jet.applyEMP) jet.applyEMP(4);
        });
      }
      // Missile hits nearest opponent
      if (type === 'MISSILE' && allJets) {
        let nearest = null;
        let nearestDist = Infinity;
        allJets.forEach(jet => {
          if (jet !== this) {
            const d = this.group.position.distanceTo(jet.group.position);
            if (d < nearestDist) { nearestDist = d; nearest = jet; }
          }
        });
        if (nearest && nearest.takeDamage) nearest.takeDamage(2);
      }
    }

    this.computeProgress();
    super.update(dt);
  }
}
