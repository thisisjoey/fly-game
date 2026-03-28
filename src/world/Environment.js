import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this._time = 0;
    this._speedLineMat = null;
    this._speedLinesGeo = null;
    this._speedLines = null;
    this._buildingData = []; // [{x, z, w, d, h}] for collision detection
    this._setup();
  }

  getBuildingData() { return this._buildingData; }

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
    this._createCity();
    this._createSpeedLines();
  }

  _createGround() {
    const geo = new THREE.PlaneGeometry(8000, 8000, 1, 1);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xc8b878,
      shininess: 5,
      emissive: 0x111000
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);
  }

  _createCity() {
    // Use InstancedMesh for performance — single draw call for all buildings
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1); // unit cube, scaled per instance

    // Two building material colors for variety
    const matA = new THREE.MeshPhongMaterial({ color: 0xc8b882, shininess: 15, emissive: 0x080600 });
    const matB = new THREE.MeshPhongMaterial({ color: 0xb8a870, shininess: 8,  emissive: 0x060500 });

    const countA = 600;
    const countB = 400;
    const meshA = new THREE.InstancedMesh(buildingGeo, matA, countA);
    const meshB = new THREE.InstancedMesh(buildingGeo, matB, countB);
    meshA.frustumCulled = false;
    meshB.frustumCulled = false;

    const dummy = new THREE.Object3D();
    let idxA = 0, idxB = 0;

    // Track checkpoint rough positions to avoid placing buildings on top of them
    const clearZones = [
      { x: 0,    z: -600 }, { x: 350, z: -350 }, { x: 600, z: 0 },
      { x: 350,  z: 350  }, { x: 0,   z: 600  }, { x: -350, z: 350 },
      { x: -600, z: 0    }, { x: -350, z: -350 },
    ];

    const cols = 36;
    const rows = 36;
    const spacingX = 120;
    const spacingZ = 120;
    const startX = -(cols / 2) * spacingX;
    const startZ = -(rows / 2) * spacingZ;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (idxA >= countA && idxB >= countB) break;

        const bx = startX + i * spacingX + (Math.random() - 0.5) * 40;
        const bz = startZ + j * spacingZ + (Math.random() - 0.5) * 40;

        // Skip center area (spawn zone)
        if (Math.abs(bx) < 80 && Math.abs(bz) < 80) continue;

        // Skip if too close to a checkpoint
        let nearCP = false;
        for (const cp of clearZones) {
          const dx = bx - cp.x, dz = bz - cp.z;
          if (Math.sqrt(dx * dx + dz * dz) < 140) { nearCP = true; break; }
        }
        if (nearCP) continue;

        const w = 25 + Math.random() * 70;
        const d = 25 + Math.random() * 70;
        // Taller buildings toward edges, shorter near center
        const distFromCenter = Math.sqrt(bx * bx + bz * bz);
        const heightBias = Math.min(1, distFromCenter / 800);
        const h = 40 + Math.pow(Math.random(), 1.5) * (80 + heightBias * 320);

        dummy.position.set(bx, h / 2, bz);
        dummy.scale.set(w, h, d);
        dummy.rotation.y = (Math.random() - 0.5) * 0.15;
        dummy.updateMatrix();

        if (Math.random() < 0.6 && idxA < countA) {
          meshA.setMatrixAt(idxA++, dummy.matrix);
        } else if (idxB < countB) {
          meshB.setMatrixAt(idxB++, dummy.matrix);
        } else if (idxA < countA) {
          meshA.setMatrixAt(idxA++, dummy.matrix);
        }

        // Store bounds for collision detection
        this._buildingData.push({ x: bx, z: bz, w, d, h });
      }
    }

    meshA.count = idxA;
    meshB.count = idxB;
    meshA.instanceMatrix.needsUpdate = true;
    meshB.instanceMatrix.needsUpdate = true;

    this.scene.add(meshA);
    this.scene.add(meshB);
  }

  _createSpeedLines() {
    const count = 250;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 100;
      positions[i * 3]     = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this._speedLines = new THREE.Points(geo, mat);
    this._speedLineMat = mat;
    this._speedLinesGeo = geo;
    this.scene.add(this._speedLines);
  }

  updateSpeedEffect(playerSpeed, maxSpeed) {
    if (!this._speedLineMat) return;
    const ratio = Math.max(0, (playerSpeed - maxSpeed * 0.45) / (maxSpeed * 0.55));
    this._speedLineMat.opacity = ratio * 0.65;

    if (ratio > 0.05) {
      const pos = this._speedLinesGeo.attributes.position;
      const arr = pos.array;
      const shift = playerSpeed * 0.004;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 2] += shift;
        if (arr[i + 2] > 300) arr[i + 2] -= 600;
      }
      pos.needsUpdate = true;
    }
  }

  update(dt) {
    this._time += dt;
  }
}
