import * as THREE from 'three';

export const POWERUP_META = {
  BOOST:   { color: 0xff7700, label: 'BOOST',   icon: '⚡',  desc: '2× SPEED',         duration: 6  },
  SHIELD:  { color: 0x0099ff, label: 'SHIELD',  icon: '🛡',  desc: 'ABSORB 1 HIT',     duration: 20 },
  MISSILE: { color: 0xff2200, label: 'MISSILE', icon: '🚀',  desc: 'DESTROY 1 SAM',    duration: 0  },
  EMP:     { color: 0xbb00ff, label: 'EMP',     icon: '⚡⚡', desc: 'SLOW ALL MISSILES', duration: 5  },
  REPAIR:  { color: 0x00ee44, label: 'REPAIR',  icon: '♥',   desc: 'RESTORE 1 HEART',  duration: 0  },
};

export class PowerUp {
  constructor(scene, type, position) {
    this.scene = scene;
    this.type = type;
    this.collected = false;
    this._bobTime = Math.random() * Math.PI * 2;
    this._baseY = position.y;
    this.radius = 12;

    const meta = POWERUP_META[type] || POWERUP_META.BOOST;
    const color = meta.color;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    // Distinct 3D shape per type
    this._buildShape(type, color);

    // Point light — illuminates surroundings
    const light = new THREE.PointLight(color, 3.0, 140);
    this.group.add(light);

    scene.add(this.group);
  }

  _buildShape(type, color) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const wireMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 });

    switch (type) {
      case 'BOOST': {
        // Diamond / octahedron — speed feel
        const geo = new THREE.OctahedronGeometry(7, 0);
        this._core = new THREE.Mesh(geo, mat);
        this.group.add(this._core);
        // Thin outer shell
        const outerGeo = new THREE.OctahedronGeometry(9.5, 0);
        this._outer = new THREE.Mesh(outerGeo, wireMat);
        this.group.add(this._outer);
        break;
      }
      case 'SHIELD': {
        // Sphere — protective bubble
        const geo = new THREE.SphereGeometry(6, 12, 8);
        this._core = new THREE.Mesh(geo, mat);
        this.group.add(this._core);
        // Icosahedron wireframe around it
        const shellGeo = new THREE.IcosahedronGeometry(10, 1);
        this._outer = new THREE.Mesh(shellGeo, wireMat.clone());
        this.group.add(this._outer);
        break;
      }
      case 'MISSILE': {
        // Elongated cone — rocket look
        const bodyGeo = new THREE.CylinderGeometry(1.5, 1.5, 10, 8);
        this._core = new THREE.Mesh(bodyGeo, mat);
        this._core.rotation.x = Math.PI / 2;
        this.group.add(this._core);
        const tipGeo = new THREE.ConeGeometry(1.5, 4, 8);
        const tip = new THREE.Mesh(tipGeo, mat.clone());
        tip.rotation.x = Math.PI / 2;
        tip.position.z = 7;
        this.group.add(tip);
        // Outer torus ring
        const ringGeo = new THREE.TorusGeometry(9, 1, 6, 24);
        this._outer = new THREE.Mesh(ringGeo, wireMat.clone());
        this.group.add(this._outer);
        break;
      }
      case 'EMP': {
        // Cube — electric grid feel
        const geo = new THREE.BoxGeometry(10, 10, 10);
        this._core = new THREE.Mesh(geo, mat);
        this.group.add(this._core);
        const shellGeo = new THREE.BoxGeometry(13, 13, 13);
        this._outer = new THREE.Mesh(shellGeo, wireMat.clone());
        this.group.add(this._outer);
        break;
      }
      case 'REPAIR': {
        // Cross / plus shape from two boxes
        const hGeo = new THREE.BoxGeometry(14, 4, 4);
        const vGeo = new THREE.BoxGeometry(4, 14, 4);
        this._core  = new THREE.Mesh(hGeo, mat);
        const vMesh = new THREE.Mesh(vGeo, mat.clone());
        this.group.add(this._core);
        this.group.add(vMesh);
        // Outer sphere
        const outerGeo = new THREE.SphereGeometry(10, 8, 6);
        this._outer = new THREE.Mesh(outerGeo, wireMat.clone());
        this.group.add(this._outer);
        break;
      }
    }
  }

  update(dt) {
    if (this.collected) return;

    this._bobTime += dt * 1.4;
    this.group.position.y = this._baseY + Math.sin(this._bobTime) * 3;

    if (this._core)  { this._core.rotation.y  += dt * 2.2; this._core.rotation.x  += dt * 1.1; }
    if (this._outer) { this._outer.rotation.y -= dt * 1.2; this._outer.rotation.z += dt * 0.9; }
  }

  collect() {
    this.collected = true;
    this.scene.remove(this.group);
  }

  getPosition() { return this.group.position; }
}
