import * as THREE from 'three';

export class Obstacle {
  constructor(scene, type, position) {
    this.scene = scene;
    this.type = type;
    this.collected = false;

    this.mesh = null;
    this.group = new THREE.Group();
    this.group.position.copy(position);

    if (type === 'ASTEROID') {
      this.radius = 15 + Math.random() * 15; // 15-30
      this.damage = 1;
      this._createAsteroid();
      this._driftVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 8
      );
      this._rotVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3
      );
    } else if (type === 'BARRIER') {
      this.radius = 65;
      this.damage = 2;
      this._createBarrier();
      this._driftVelocity = new THREE.Vector3(0, 0, 0);
      this._rotVelocity = new THREE.Vector3(0, 0.3, 0);
    }

    scene.add(this.group);
  }

  _createAsteroid() {
    const detail = Math.floor(Math.random() * 2);
    const geo = new THREE.IcosahedronGeometry(this.radius, detail);

    // Distort vertices for rocky appearance
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const noise = 0.8 + Math.random() * 0.4;
      pos.setXYZ(i, x * noise, y * noise, z * noise);
    }
    geo.computeVertexNormals();

    const gray = Math.random() < 0.5;
    const mat = new THREE.MeshPhongMaterial({
      color: gray ? 0x999999 : 0x7b5c3a,
      shininess: 5,
      emissive: gray ? 0x111111 : 0x110a00
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);
  }

  _createBarrier() {
    const geo = new THREE.TorusGeometry(55, 4, 12, 40);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      emissive: 0xff2200,
      emissiveIntensity: 2.0,
      shininess: 80,
      transparent: true,
      opacity: 0.9
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);

    // Add outer glow ring
    const glowGeo = new THREE.TorusGeometry(57, 1.5, 8, 40);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(glow);
  }

  update(dt) {
    if (this.type === 'ASTEROID') {
      this.group.position.addScaledVector(this._driftVelocity, dt);
      this.group.rotation.x += this._rotVelocity.x * dt;
      this.group.rotation.y += this._rotVelocity.y * dt;
      this.group.rotation.z += this._rotVelocity.z * dt;

      // Wrap around if too far
      const pos = this.group.position;
      if (pos.length() > 1500) {
        pos.multiplyScalar(-0.5);
      }
    } else {
      this.group.rotation.y += this._rotVelocity.y * dt;
      this.group.rotation.z += dt * 0.5;
    }
  }

  getPosition() {
    return this.group.position;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
}
