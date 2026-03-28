import * as THREE from 'three';

const SLAB_LENGTH = 2000; // Z length of each background slab

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this._time = 0;
    this._speedLineMat = null;
    this._speedLinesGeo = null;
    this._speedLines = null;
    this._slabA = null;
    this._slabB = null;
    this._setup();
  }

  _setup() {
    // Warm hazy sunlight — matches the sandy city sky
    const ambient = new THREE.AmbientLight(0xd4c8a0, 1.8);
    this.scene.add(ambient);

    // Main sun — bright, high angle, warm
    const sun = new THREE.DirectionalLight(0xfff5e0, 3.0);
    sun.position.set(300, 800, -200);
    this.scene.add(sun);

    // Soft fill from opposite side
    const fill = new THREE.DirectionalLight(0xb0a888, 0.8);
    fill.position.set(-200, 200, 300);
    this.scene.add(fill);

    this._createGround();
    this._slabA = this._createBackgroundSlab(0);
    this._slabB = this._createBackgroundSlab(SLAB_LENGTH);
    this._createSpeedLines();
  }

  _createGround() {
    // Very long ground plane in Z direction
    const geo = new THREE.PlaneGeometry(3000, 80000);
    const mat = new THREE.MeshPhongMaterial({ color: 0xc8b878, shininess: 3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0, 40000);
    this.scene.add(mesh);
  }

  // Creates a group of background buildings for one slab (offset by startZ)
  _createBackgroundSlab(startZ) {
    const count = 160;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const matA = new THREE.MeshPhongMaterial({ color: 0xc8b882, shininess: 8 });
    const mesh = new THREE.InstancedMesh(geo, matA, count);
    mesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < count; i++) {
      // Place buildings outside the obstacle corridor (|x| > 300)
      const side = Math.random() < 0.5 ? 1 : -1;
      const x = side * (320 + Math.random() * 450);
      const z = startZ + Math.random() * SLAB_LENGTH;
      const w = 30 + Math.random() * 100;
      const d = 30 + Math.random() * 100;
      const h = 30 + Math.pow(Math.random(), 1.5) * 350;

      dummy.position.set(x, h / 2, z);
      dummy.scale.set(w, h, d);
      dummy.rotation.y = (Math.random() - 0.5) * 0.2;
      dummy.updateMatrix();
      mesh.setMatrixAt(idx++, dummy.matrix);
    }
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    return { mesh, startZ, endZ: startZ + SLAB_LENGTH };
  }

  // Recycle slab to be ahead of player
  _recycleSlab(slab, newStartZ) {
    slab.startZ = newStartZ;
    slab.endZ = newStartZ + SLAB_LENGTH;
    // Re-generate positions for this slab
    const dummy = new THREE.Object3D();
    const count = slab.mesh.count;
    for (let i = 0; i < count; i++) {
      const side = Math.random() < 0.5 ? 1 : -1;
      const x = side * (320 + Math.random() * 450);
      const z = newStartZ + Math.random() * SLAB_LENGTH;
      const w = 30 + Math.random() * 100;
      const d = 30 + Math.random() * 100;
      const h = 30 + Math.pow(Math.random(), 1.5) * 350;
      dummy.position.set(x, h / 2, z);
      dummy.scale.set(w, h, d);
      dummy.rotation.y = (Math.random() - 0.5) * 0.2;
      dummy.updateMatrix();
      slab.mesh.setMatrixAt(i, dummy.matrix);
    }
    slab.mesh.instanceMatrix.needsUpdate = true;
  }

  _createSpeedLines() {
    const count = 250;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 120;
      positions[i * 3]     = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 1.5, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    this._speedLines = new THREE.Points(geo, mat);
    this._speedLineMat = mat;
    this._speedLinesGeo = geo;
    this.scene.add(this._speedLines);
  }

  updateSpeedEffect(playerSpeed, maxSpeed) {
    if (!this._speedLineMat) return;
    const ratio = Math.max(0, (playerSpeed - maxSpeed * 0.4) / (maxSpeed * 0.6));
    this._speedLineMat.opacity = ratio * 0.65;
  }

  // Call each frame with player Z position
  update(dt, playerZ) {
    this._time += dt;

    // Move speed lines with player (they're a local effect)
    if (this._speedLines && playerZ !== undefined) {
      this._speedLines.position.z = playerZ;
    }

    // Recycle background slabs as player passes them
    if (this._slabA && playerZ !== undefined && playerZ > this._slabA.endZ - 200) {
      this._recycleSlab(this._slabA, this._slabB.endZ);
    }
    if (this._slabB && playerZ !== undefined && playerZ > this._slabB.endZ - 200) {
      this._recycleSlab(this._slabB, this._slabA.endZ);
    }
  }

  setSpeedLinesOpacity(opacity) {
    if (this._speedLineMat) this._speedLineMat.opacity = opacity;
  }
}
