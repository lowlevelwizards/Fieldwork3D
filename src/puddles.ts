import * as THREE from 'three';
import { BASINS, surfaceFraction, type StandingWater } from './standing-water';
import type { EnvironmentState } from './environment-conditions';

/**
 * A few small irregular, shallow pools on the existing 10 x 10 m tile.
 * These only VISUALIZE actual stored litres; the renderer never creates
 * or removes water. Fixed footprints imply sub-centimetre low spots,
 * which can later be replaced with terrain-derived catchment basins.
 */
type Pool = {
  water: THREE.Mesh;
  waterMaterial: THREE.MeshPhongMaterial;
  darkRim: THREE.Mesh;
  rimMaterial: THREE.MeshBasicMaterial;
  glint: THREE.Mesh;
  glintMaterial: THREE.MeshBasicMaterial;
};

function puddleGeometry(phase: number): THREE.ShapeGeometry {
  const points: THREE.Vector2[] = [];
  const corners = 16;
  for (let i = 0; i < corners; i++) {
    const t = i / corners * Math.PI * 2;
    const radius = 1 + .095 * Math.sin(3 * t + phase) + .08 * Math.cos(5 * t - phase * 1.2);
    points.push(new THREE.Vector2(Math.cos(t) * radius, Math.sin(t) * radius));
  }
  const shape = new THREE.Shape(points);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export class PuddleField {
  private readonly pools: Pool[] = [];
  private readonly waterColor = new THREE.Color();
  private readonly reflection = new THREE.Color();

  constructor(scene: THREE.Scene) {
    for (const basin of BASINS) {
      const geometry = puddleGeometry(basin.phase);
      const rimMaterial = new THREE.MeshBasicMaterial({
        color: 0x344a41, transparent: true, opacity: 0,
        depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      });
      const darkRim = new THREE.Mesh(geometry, rimMaterial);
      darkRim.rotation.x = -Math.PI / 2;
      darkRim.position.set(basin.x, .010, basin.z);
      darkRim.renderOrder = 2;
      darkRim.visible = false;
      scene.add(darkRim);

      const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x708e94,
        specular: 0xb4c7cd,
        shininess: 85,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const water = new THREE.Mesh(geometry, waterMaterial);
      water.rotation.x = -Math.PI / 2;
      water.position.set(basin.x, .018, basin.z);
      water.renderOrder = 2;
      water.visible = false;
      scene.add(water);

      // A faint internal reflection patch that shifts with the sky and sun.
      // Reuses geometry; no reflection render target or scene capture.
      const glintMaterial = new THREE.MeshBasicMaterial({
        color: 0xc9dadd, transparent: true, opacity: 0,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      });
      const glint = new THREE.Mesh(geometry, glintMaterial);
      glint.rotation.x = -Math.PI / 2;
      glint.position.set(basin.x - .055, .023, basin.z + .055);
      glint.renderOrder = 2;
      glint.visible = false;
      scene.add(glint);
      this.pools.push({ water, waterMaterial, darkRim, rimMaterial, glint, glintMaterial });
    }
  }

  update(waterState: StandingWater, env: EnvironmentState, rainAmount: number): void {
    const dayFactor = Math.max(.05, Math.min(1, env.fillIntensity / 1.1));
    this.waterColor.setHex(env.skyHorizon);
    this.waterColor.lerp(new THREE.Color(0x45636c), .55);
    this.reflection.setHex(env.skyMiddle);
    this.reflection.lerp(new THREE.Color(0xb0c7c5), .22);

    this.pools.forEach((pool, index) => {
      const basin = BASINS[index];
      const fraction = surfaceFraction(waterState.volumeAt(index), basin);
      const visible = fraction > .002;
      pool.water.visible = visible;
      pool.darkRim.visible = visible;
      pool.glint.visible = visible;
      if (!visible) return;

      // Area is proportional to stored volume before the display footprint
      // fills; a growing water level remains stored after that point.
      const expansion = Math.sqrt(fraction);
      const shapeX = basin.radiusX * expansion;
      const shapeZ = basin.radiusZ * expansion;
      pool.water.scale.set(shapeX, shapeZ, 1);
      pool.darkRim.scale.set(shapeX * 1.065, shapeZ * 1.065, 1);
      pool.glint.scale.set(shapeX * .64, shapeZ * .36, 1);

      pool.waterMaterial.color.copy(this.waterColor);
      pool.waterMaterial.opacity = .24 + .50 * Math.min(1, fraction * 5);
      pool.rimMaterial.opacity = .11 + .19 * Math.min(1, fraction * 4);
      pool.glintMaterial.color.copy(this.reflection);
      pool.glintMaterial.opacity = (.08 + rainAmount * .05) * dayFactor;
    });
  }
}
