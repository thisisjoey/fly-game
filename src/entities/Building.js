import * as THREE from 'three';

const BUILDING_COLORS = [0xc8b882, 0xb8a870, 0xd4c490, 0xaa9860, 0xc0aa78];

export class Building {
  constructor(scene, x, y, z, width, depth, height, options = {}) {
    this.scene = scene;
    this.width = width;
    this.depth = depth;
    this.height = height;
    this._baseX = x;
    this._baseY = y + height / 2;
    this.moving = options.moving || false;
    this.moveAxis = options.moveAxis || 'x';
    this.moveSpeed = options.moveSpeed || 30;
    this.moveRange = options.moveRange || 70;
    this._movePhase = options.movePhase !== undefined ? options.movePhase : Math.random() * Math.PI * 2;
    this._moveTime = this._movePhase;
    this.isBackground = options.isBackground || false;

    const geo = new THREE.BoxGeometry(width, height, depth);
    const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
    const mat = new THREE.MeshPhongMaterial({
      color,
      shininess: 8,
      emissive: 0x080600
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y + height / 2, z);
    scene.add(this.mesh);
  }

  get posX() { return this.mesh.position.x; }
  get posY() { return this.mesh.position.y; }
  get posZ() { return this.mesh.position.z; }

  getAABB() {
    const x = this.mesh.position.x;
    const y = this.mesh.position.y;
    const z = this.mesh.position.z;
    return {
      minX: x - this.width  / 2,
      maxX: x + this.width  / 2,
      minY: y - this.height / 2,
      maxY: y + this.height / 2,
      minZ: z - this.depth  / 2,
      maxZ: z + this.depth  / 2,
    };
  }

  update(dt) {
    if (!this.moving) return;
    this._moveTime += dt;
    if (this.moveAxis === 'x') {
      this.mesh.position.x = this._baseX + Math.sin(this._moveTime * this.moveSpeed * 0.05) * this.moveRange;
    } else {
      this.mesh.position.y = this._baseY + Math.sin(this._moveTime * this.moveSpeed * 0.04) * (this.moveRange * 0.4);
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
