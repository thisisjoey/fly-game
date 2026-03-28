import * as THREE from 'three';

export class Missile {
  constructor(scene, spawnPos) {
    this.scene = scene;
    this.alive = true;
    this.speed = 130;
    this.turnSpeed = 1.8;
    this._timer = 0;
    this.maxLife = 12;
    this.radius = 4;

    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x666688, shininess: 60, emissive: 0x111122 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.5, 1.5, 8);
    const noseMat = new THREE.MeshPhongMaterial({ color: 0xff2200, emissive: 0x880000 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 2.7;
    group.add(nose);

    // Exhaust glow
    const exMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.9 });
    const exGeo = new THREE.ConeGeometry(0.6, 3, 6);
    const exhaust = new THREE.Mesh(exGeo, exMat);
    exhaust.rotation.x = -Math.PI / 2;
    exhaust.position.z = -3;
    group.add(exhaust);
    this._exhaustMesh = exhaust;

    // Warning light
    const warnMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 1 });
    const warnGeo = new THREE.SphereGeometry(0.4, 6, 4);
    this._warnMesh = new THREE.Mesh(warnGeo, warnMat);
    this._warnMesh.position.y = 0.8;
    group.add(this._warnMesh);

    group.position.copy(spawnPos);
    this.group = group;
    scene.add(group);
  }

  update(dt, playerPosition) {
    if (!this.alive) return;
    this._timer += dt;
    if (this._timer > this.maxLife) { this.dispose(); return; }

    // Steer toward player
    const toPlayer = playerPosition.clone().sub(this.group.position).normalize();
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    const axis = new THREE.Vector3().crossVectors(fwd, toPlayer);
    const axisLen = axis.length();
    if (axisLen > 0.001) {
      axis.normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, fwd.dot(toPlayer))));
      const q = new THREE.Quaternion().setFromAxisAngle(axis, Math.min(angle, this.turnSpeed * dt));
      this.group.quaternion.premultiply(q);
    }

    const fwdNow = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    this.group.position.addScaledVector(fwdNow, this.speed * dt);

    // Pulse exhaust
    const pulse = 0.8 + 0.4 * Math.sin(this._timer * 20);
    this._exhaustMesh.scale.z = pulse;
    this._warnMesh.material.opacity = Math.sin(this._timer * 8) > 0 ? 1 : 0;
  }

  getPosition() { return this.group.position; }

  dispose() {
    this.alive = false;
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); }
    });
  }
}
