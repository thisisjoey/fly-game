import * as THREE from 'three';
import { PowerUp } from '../entities/PowerUp.js';
import { Obstacle } from '../entities/Obstacle.js';

const CHECKPOINT_POSITIONS = [
  new THREE.Vector3(0,    90,  -600),
  new THREE.Vector3(350, 120,  -350),
  new THREE.Vector3(600,  80,     0),
  new THREE.Vector3(350, 110,   350),
  new THREE.Vector3(0,    90,   600),
  new THREE.Vector3(-350, 130,  350),
  new THREE.Vector3(-600,  70,    0),
  new THREE.Vector3(-350, 100, -350),
];

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.checkpointCount = 8;
    this.checkpoints = [];
    this.powerUps = [];
    this.obstacles = [];
    this._pulseTime = 0;

    this._createCheckpoints();
    this._createGuidePath();
  }

  _createCheckpoints() {
    for (let i = 0; i < CHECKPOINT_POSITIONS.length; i++) {
      const pos = CHECKPOINT_POSITIONS[i];

      const geo = new THREE.TorusGeometry(70, 5, 16, 48);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x00ffcc,
        emissive: 0x00ffcc,
        emissiveIntensity: i === 0 ? 4.0 : 1.0,
        transparent: true,
        opacity: i === 0 ? 1.0 : 0.65,
        shininess: 200
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);

      // Orient ring to face along track direction
      if (i < CHECKPOINT_POSITIONS.length - 1) {
        const next = CHECKPOINT_POSITIONS[(i + 1) % CHECKPOINT_POSITIONS.length];
        mesh.lookAt(next);
      } else {
        mesh.lookAt(CHECKPOINT_POSITIONS[0]);
      }

      this.scene.add(mesh);
      this.checkpoints.push({ mesh, mat, position: pos, index: i });

      // Add outer glow ring
      const glowGeo = new THREE.TorusGeometry(74, 2.5, 8, 48);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: i === 0 ? 0.6 : 0.2
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      glow.rotation.copy(mesh.rotation);
      this.scene.add(glow);
      this.checkpoints[i].glowMesh = glow;
      this.checkpoints[i].glowMat = glowMat;
    }
  }

  _createGuidePath() {
    // CatmullRom curve through checkpoints
    const points = [...CHECKPOINT_POSITIONS, CHECKPOINT_POSITIONS[0]];
    const curve = new THREE.CatmullRomCurve3(points, true);
    const tubeGeo = new THREE.TubeGeometry(curve, 120, 1.0, 6, true);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.12
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    this.scene.add(tube);
  }

  spawnPowerUps() {
    const types = ['BOOST', 'SHIELD', 'MISSILE', 'EMP', 'REPAIR'];
    for (let i = 0; i < 16; i++) {
      const cpPos = CHECKPOINT_POSITIONS[i % CHECKPOINT_POSITIONS.length];
      const angle = (i / 16) * Math.PI * 2;
      const offset = new THREE.Vector3(
        Math.cos(angle) * 80,
        Math.sin(angle * 1.3) * 40,
        Math.sin(angle) * 80
      );
      const pos = cpPos.clone().add(offset);
      const type = types[i % types.length];
      const pu = new PowerUp(this.scene, type, pos);
      this.powerUps.push(pu);
    }
  }

  spawnObstacles() {
    // 20 asteroids
    for (let i = 0; i < 20; i++) {
      const cpPos = CHECKPOINT_POSITIONS[i % CHECKPOINT_POSITIONS.length];
      const spread = 200;
      const pos = cpPos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.5,
        (Math.random() - 0.5) * spread
      ));
      const ob = new Obstacle(this.scene, 'ASTEROID', pos);
      this.obstacles.push(ob);
    }

    // 8 energy barriers
    const barrierPositions = [
      new THREE.Vector3(175, 40, -475),
      new THREE.Vector3(475, 40, -175),
      new THREE.Vector3(475, -40, 175),
      new THREE.Vector3(175, -40, 475),
      new THREE.Vector3(-175, 40, 475),
      new THREE.Vector3(-475, 40, 175),
      new THREE.Vector3(-475, -40, -175),
      new THREE.Vector3(-175, -40, -475)
    ];
    barrierPositions.forEach(pos => {
      const ob = new Obstacle(this.scene, 'BARRIER', pos);
      this.obstacles.push(ob);
    });
  }

  getCheckpointPosition(index) {
    return CHECKPOINT_POSITIONS[index % this.checkpointCount].clone();
  }

  advanceCheckpoint(jet) {
    jet.checkpointIndex = (jet.checkpointIndex + 1) % this.checkpointCount;
    if (jet.checkpointIndex === 0) {
      jet.lap++;
      return true; // lap completed
    }
    return false;
  }

  setActiveCheckpoint(index) {
    this.checkpoints.forEach((cp, i) => {
      const isActive = i === index % this.checkpointCount;
      cp.mat.emissiveIntensity = isActive ? 5.0 : 1.0;
      cp.mat.opacity = isActive ? 1.0 : 0.55;
      cp.glowMat.opacity = isActive ? 0.7 : 0.15;
    });
  }

  update(dt) {
    this._pulseTime += dt;
    // Power-ups
    this.powerUps.forEach(pu => pu.update(dt));
    // Obstacles
    this.obstacles.forEach(ob => ob.update(dt));
    // Pulse active checkpoint
    const pulse = 0.5 + 0.5 * Math.sin(this._pulseTime * 3);
    // Handled by setActiveCheckpoint + HUD
  }

  resetPowerUps() {
    this.powerUps.forEach(pu => {
      if (pu.collected) {
        pu.collected = false;
        this.scene.add(pu.group);
      }
    });
  }

  dispose() {
    this.checkpoints.forEach(cp => {
      this.scene.remove(cp.mesh);
      if (cp.glowMesh) this.scene.remove(cp.glowMesh);
    });
    this.powerUps.forEach(pu => {
      if (!pu.collected) this.scene.remove(pu.group);
    });
    this.obstacles.forEach(ob => ob.dispose());
  }
}
