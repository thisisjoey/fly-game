import * as THREE from 'three';

const POWERUP_COLORS = {
  BOOST: 0xff8800,
  SHIELD: 0x0088ff,
  MISSILE: 0xff0000,
  EMP: 0xaa00ff,
  REPAIR: 0x00ff44
};

const POWERUP_LABELS = {
  BOOST: 'BOOST',
  SHIELD: 'SHIELD',
  MISSILE: 'MISSILE',
  EMP: 'EMP',
  REPAIR: 'REPAIR'
};

export class PowerUp {
  constructor(scene, type, position) {
    this.scene = scene;
    this.type = type;
    this.collected = false;
    this._bobTime = Math.random() * Math.PI * 2;
    this._baseY = position.y;
    this.radius = 10;

    const color = POWERUP_COLORS[type] || 0xffffff;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    // Inner sphere — MeshBasicMaterial = zero lighting cost, always bright
    const sphereGeo = new THREE.SphereGeometry(5, 12, 10);
    const sphereMat = new THREE.MeshBasicMaterial({ color: color });
    this.innerSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.group.add(this.innerSphere);

    // Outer ring (torus)
    const torusGeo = new THREE.TorusGeometry(9, 1.2, 8, 24);
    const torusMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85
    });
    this.ring = new THREE.Mesh(torusGeo, torusMat);
    this.group.add(this.ring);

    // Second ring (perpendicular)
    const ring2 = new THREE.Mesh(torusGeo.clone(), torusMat.clone());
    ring2.rotation.y = Math.PI / 2;
    this.group.add(ring2);
    this.ring2 = ring2;

    // Point light so power-ups illuminate surroundings
    const light = new THREE.PointLight(color, 2.5, 120);
    this.group.add(light);

    scene.add(this.group);
  }

  update(dt) {
    if (this.collected) return;

    this._bobTime += dt * 1.5;
    this.group.position.y = this._baseY + Math.sin(this._bobTime) * 2.5;

    this.innerSphere.rotation.y += dt * 2;
    this.innerSphere.rotation.x += dt * 1.3;
    this.ring.rotation.z += dt * 1.8;
    this.ring2.rotation.x += dt * 1.5;
  }

  collect() {
    this.collected = true;
    this.scene.remove(this.group);
  }

  getPosition() {
    return this.group.position;
  }

  static getColor(type) {
    return POWERUP_COLORS[type] || 0xffffff;
  }

  static getLabel(type) {
    return POWERUP_LABELS[type] || type;
  }
}
