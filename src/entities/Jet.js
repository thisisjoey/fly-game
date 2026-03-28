import * as THREE from 'three';

export class Jet {
  constructor(scene, color = 0x00aaff) {
    this.scene = scene;
    this.color = color;
    this.group = new THREE.Group();
    this.health = 5;
    this.maxHealth = 5;
    this.speed = 60;
    this.turnSpeed = 2.8;
    this.rollSpeed = 3.5;
    this.activePowerUp = null;
    this.powerUpTimer = 0;
    this.shield = false;
    this.checkpointIndex = 0;
    this.lap = 0;
    this.progress = 0;
    this.alive = true;
    this.respawnTimer = 0;
    this.respawnPosition = new THREE.Vector3();
    this.flashTimer = 0;
    this._originalEmissives = [];
    this.velocity = new THREE.Vector3();
    this.dead = false;

    this.createModel(color);
    scene.add(this.group);
  }

  createModel(color) {
    const mat = new THREE.MeshPhongMaterial({
      color: color,
      emissive: new THREE.Color(color).multiplyScalar(0.4),
      shininess: 80,
      specular: 0x444444
    });

    // Body - elongated box pointing in +Z direction
    const bodyGeo = new THREE.CylinderGeometry(0.6, 1.0, 8, 8);
    const body = new THREE.Mesh(bodyGeo, mat.clone());
    body.rotation.x = Math.PI / 2;
    this.group.add(body);

    // Nose cone
    const noseMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 120 });
    const noseGeo = new THREE.ConeGeometry(0.6, 3, 8);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 5.5;
    this.group.add(nose);

    // Wings
    const wingMat = mat.clone();
    wingMat.side = THREE.DoubleSide;

    // Left wing
    const lwGeo = new THREE.BoxGeometry(5, 0.15, 3);
    const lw = new THREE.Mesh(lwGeo, wingMat);
    lw.position.set(-3.5, 0, -0.5);
    lw.rotation.z = -0.1;
    this.group.add(lw);

    // Right wing
    const rwGeo = new THREE.BoxGeometry(5, 0.15, 3);
    const rw = new THREE.Mesh(rwGeo, wingMat.clone());
    rw.position.set(3.5, 0, -0.5);
    rw.rotation.z = 0.1;
    this.group.add(rw);

    // Tail vertical fin
    const tailVGeo = new THREE.BoxGeometry(0.15, 2.5, 2.5);
    const tailV = new THREE.Mesh(tailVGeo, wingMat.clone());
    tailV.position.set(0, 1.2, -3.5);
    this.group.add(tailV);

    // Tail horizontal fins
    const tailHL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1.5), wingMat.clone());
    tailHL.position.set(-1.5, 0, -3.5);
    this.group.add(tailHL);
    const tailHR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1.5), wingMat.clone());
    tailHR.position.set(1.5, 0, -3.5);
    this.group.add(tailHR);

    // Cockpit
    const cockpitMat = new THREE.MeshPhongMaterial({
      color: 0x88ddff,
      emissive: 0x336688,
      transparent: true,
      opacity: 0.85,
      shininess: 200
    });
    const cockpitGeo = new THREE.SphereGeometry(0.9, 10, 8);
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.scale.y = 0.55;
    cockpit.position.set(0, 0.7, 1.5);
    this.group.add(cockpit);

    // Engine glow material
    const engineMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

    // Left engine
    const lEngGeo = new THREE.CylinderGeometry(0.5, 0.7, 2.5, 8);
    const lEng = new THREE.Mesh(lEngGeo, engineMat);
    lEng.rotation.x = Math.PI / 2;
    lEng.position.set(-3.5, -0.2, -2.5);
    this.group.add(lEng);

    // Right engine
    const rEngGeo = new THREE.CylinderGeometry(0.5, 0.7, 2.5, 8);
    const rEng = new THREE.Mesh(rEngGeo, engineMat.clone());
    rEng.rotation.x = Math.PI / 2;
    rEng.position.set(3.5, -0.2, -2.5);
    this.group.add(rEng);

    // Engine trails — single elongated cone per engine (fast, no per-sphere overhead)
    const trailMatL = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.75 });
    const trailGeoL = new THREE.ConeGeometry(0.6, 10, 6);
    const trailL = new THREE.Mesh(trailGeoL, trailMatL);
    trailL.rotation.x = -Math.PI / 2;
    trailL.position.set(-3.5, -0.2, -8.5);
    this.group.add(trailL);
    this._trailL = trailL;

    const trailMatR = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.75 });
    const trailGeoR = new THREE.ConeGeometry(0.6, 10, 6);
    const trailR = new THREE.Mesh(trailGeoR, trailMatR);
    trailR.rotation.x = -Math.PI / 2;
    trailR.position.set(3.5, -0.2, -8.5);
    this.group.add(trailR);
    this._trailR = trailR;

    // Shield bubble — IcosahedronGeometry detail=3 naturally creates a hex-like wireframe
    const shieldGeo = new THREE.IcosahedronGeometry(16, 3);

    const shieldSolidMat = new THREE.MeshPhongMaterial({
      color: 0x4499ff,
      emissive: 0x1144aa,
      transparent: true,
      opacity: 0.0,
      side: THREE.FrontSide,
      shininess: 100
    });
    this._shieldSolid = new THREE.Mesh(shieldGeo, shieldSolidMat);
    this.group.add(this._shieldSolid);

    const shieldWireMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this._shieldWire = new THREE.Mesh(shieldGeo.clone(), shieldWireMat);
    this.group.add(this._shieldWire);

    // Collect meshes for flash effect
    this.group.traverse(child => {
      if (child.isMesh) {
        this._originalEmissives.push({
          mesh: child,
          emissive: child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0)
        });
      }
    });
  }

  takeDamage(amount) {
    if (this.shield) {
      this.shield = false;
      this.flashColor(0x0088ff);
      return;
    }
    this.health = Math.max(0, this.health - amount);
    this.flashColor(0xff0000);
    if (this.health <= 0 && !this.dead) {
      this.dead = true;
      this.alive = false;
      this.respawnTimer = 3.0;
      this.group.visible = false;
    }
  }

  flashColor(hexColor) {
    this.flashTimer = 0.25;
    this.group.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive
          && child !== this._shieldSolid && child !== this._shieldWire) {
        child.material.emissive.setHex(hexColor);
        child.material.emissiveIntensity = 1.5;
      }
    });
  }

  applyPowerUp(type) {
    this.activePowerUp = type;
    switch (type) {
      case 'BOOST':
        this.powerUpTimer = 5.0;
        break;
      case 'SHIELD':
        this.shield = true;
        this.powerUpTimer = 15.0;
        break;
      case 'REPAIR':
        this.health = Math.min(this.maxHealth, this.health + 1);
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        break;
      case 'EMP':
        this.powerUpTimer = 0;
        break;
      case 'MISSILE':
        this.powerUpTimer = 0;
        break;
    }
  }

  getForwardVector() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.group.quaternion);
    return forward;
  }

  getBackwardVector() {
    const back = new THREE.Vector3(0, 0, -1);
    back.applyQuaternion(this.group.quaternion);
    return back;
  }

  update(dt) {
    // Shield bubble visibility — fade in/out based on shield state
    if (this._shieldSolid && this._shieldWire) {
      const targetOpacitySolid = this.shield ? 0.18 : 0.0;
      const targetOpacityWire  = this.shield ? 0.65 : 0.0;
      this._shieldSolid.material.opacity += (targetOpacitySolid - this._shieldSolid.material.opacity) * Math.min(1, dt * 6);
      this._shieldWire.material.opacity  += (targetOpacityWire  - this._shieldWire.material.opacity)  * Math.min(1, dt * 6);
      // Slowly rotate the wireframe for an energy field look
      this._shieldWire.rotation.y  += dt * 0.4;
      this._shieldWire.rotation.x  += dt * 0.25;
      this._shieldSolid.rotation.y -= dt * 0.2;
    }

    // Scale engine trails with speed for rush effect
    if (this._trailL && this._trailR) {
      const speedRatio = Math.max(0.5, (this.currentSpeed || this.speed) / 250);
      const trailLen = Math.min(4.0, speedRatio * 1.5);
      this._trailL.scale.z = trailLen;
      this._trailR.scale.z = trailLen;
      const alpha = Math.min(0.95, 0.5 + speedRatio * 0.4);
      this._trailL.material.opacity = alpha;
      this._trailR.material.opacity = alpha;
    }

    // Flash effect restore
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this._originalEmissives.forEach(({ mesh, emissive }) => {
          if (mesh.material && mesh.material.emissive) {
            mesh.material.emissive.copy(emissive);
            mesh.material.emissiveIntensity = 1.0;
          }
        });
      }
    }

    // Power-up timer
    if (this.powerUpTimer > 0) {
      this.powerUpTimer -= dt;
      if (this.powerUpTimer <= 0) {
        this.activePowerUp = null;
        this.shield = false;
      }
    }

    // Respawn logic
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        // health is NOT restored here — managed by caller (lives system)
        this.alive = true;
        this.dead = false;
        this.group.position.copy(this.respawnPosition);
        this.group.rotation.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.group.visible = true;
      }
    }
  }

  setRespawnAt(pos) {
    this.respawnPosition.copy(pos);
  }

  computeProgress() {
    this.progress = this.lap * 8 + this.checkpointIndex;
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
