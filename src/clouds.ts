import * as THREE from 'three';
import { terrainHeight } from './terrain-model';
import type { EnvironmentState } from './environment-conditions';
import {
  CLOUD_COUNT, REGION_HALF_WIDTH, cloudAt, cloudCoverAtHour,
  cloudPresence, cloudShadowAt, cloudShadowStrength,
} from './cloud-model';

/**
 * Render-only clouds over the one existing ground block.
 * The clouds travel in a larger off-world loop, but FOUR clipping planes
 * restrict both their geometry and their shadow decals to the 10m region.
 */
const edge = REGION_HALF_WIDTH;
const regionMask = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), edge),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), edge),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), edge),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), edge),
];

function softShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cloud shadow texture needs a 2D canvas');
  // An oval-ish, very soft footprint. This is a single shared texture.
  ctx.save();
  ctx.scale(1, .78);
  const g = ctx.createRadialGradient(64, 82, 8, 64, 82, 66);
  g.addColorStop(0, 'rgba(255,255,255,.80)');
  g.addColorStop(.32, 'rgba(255,255,255,.66)');
  g.addColorStop(.66, 'rgba(255,255,255,.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 166);
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type VisualCloud = {
  visual: THREE.Group;
  material: THREE.MeshLambertMaterial;
  shadow: THREE.Mesh;
  shadowMaterial: THREE.MeshBasicMaterial;
};

export class CloudField {
  private readonly clouds: VisualCloud[] = [];
  private readonly color = new THREE.Color();
  private readonly sunlit = new THREE.Color();
  private readonly stormTint = new THREE.Color(0x354552);

  constructor(scene: THREE.Scene) {
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const shadowTexture = softShadowTexture();

    for (let index = 0; index < CLOUD_COUNT; index++) {
      const visual = new THREE.Group();
      const material = new THREE.MeshLambertMaterial({
        color: 0xe9e9dd,
        transparent: true,
        opacity: .8,
        depthWrite: false,
        flatShading: true,
        clippingPlanes: regionMask,
      });

      // Five overlapping squared-off lobes make a Minecraft-like cloud
      // silhouette without textured particles or detailed cloud geometry.
      const forms = [
        { x: 0,    y: 0,   z: 0,    w: 1.35, h: .27, d: .98 },
        { x: -.65, y: -.07,z: -.1,  w: .95, h: .21, d: .77 },
        { x: .60,  y: .01, z: .10,  w: 1.06,h: .28, d: .77 },
        { x: -.13, y: .18, z: -.08, w: .90, h: .24, d: .64 },
        { x: .28,  y: -.11,z: .43, w: .87, h: .17, d: .42 },
      ];
      const sample = cloudAt(index, 0);
      for (const form of forms) {
        const part = new THREE.Mesh(cube, material);
        part.position.set(form.x, form.y, form.z);
        part.scale.set(form.w, form.h, form.d);
        // Transparent puddles (2), rain (3), and ground impacts (4) must
        // composite BEFORE overhead clouds. Cloud material does not write
        // depth, so draw order is needed even when geometry is higher.
        part.renderOrder = 5;
        visual.add(part);
      }
      visual.scale.setScalar(sample.scale);
      scene.add(visual);

      const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x304338,
        map: shadowTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        side: THREE.DoubleSide,
        clippingPlanes: regionMask,
        toneMapped: false,
      });
      // A subdivided decal follows the actual terrain rather than floating
      // as a perfectly horizontal sheet above valleys and low slopes.
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 2.95, 12, 10), shadowMaterial);
      shadow.rotation.x = -Math.PI / 2;
      shadow.renderOrder = 1;
      shadow.frustumCulled = false;
      shadow.scale.set(sample.scale, sample.scale, 1);
      scene.add(shadow);
      this.clouds.push({ visual, material, shadow, shadowMaterial });
    }
  }

  /** Every position, coverage and shadow derives from the same world hour. */
  update(hour: number, e: EnvironmentState, overrideCoverage: number | null, rainAmount = 0): number {
    const coverage = overrideCoverage ?? cloudCoverAtHour(hour);
    // Strong daylight previously bleached Lambert clouds nearly white.
    // Keep modest warmth without letting overexposed whites erase the forms.
    const sunBlend = Math.min(.28, e.sunlight / 8.0);
    this.color.setHex(0x8b9faa);
    this.sunlit.setHex(e.sunColor);
    this.color.lerp(this.sunlit, sunBlend);
    this.color.multiplyScalar(.86);
    // More cover means heavier, darker clouds; rainfall deepens the underbellies.
    const darkening = Math.min(.88,
      Math.max(0, (coverage - .49) / .51) * .58 + rainAmount * .30);
    this.color.lerp(this.stormTint, darkening);

    for (let index = 0; index < this.clouds.length; index++) {
      const cloud = this.clouds[index];
      const sampled = cloudAt(index, hour);
      const presence = cloudPresence(coverage, sampled.rank);

      cloud.visual.position.set(sampled.x, sampled.y, sampled.z);
      cloud.visual.visible = presence > .008 &&
        Math.abs(sampled.x) < edge + 3 && Math.abs(sampled.z) < edge + 3;
      cloud.material.opacity = presence * .82;
      cloud.material.color.copy(this.color);

      const groundPosition = cloudShadowAt(sampled, e.sunDirection);
      cloud.shadow.position.set(groundPosition.x, 0, groundPosition.z);
      // PlaneGeometry is rotated -90 degrees: local (x,y,z) maps to
      // world (x,z,-y). Therefore its local Z attribute is world height.
      // Drape the shadow over the actual topography, with a tiny offset
      // to prevent z fighting, instead of drawing across empty air.
      const shadowPos=cloud.shadow.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let vertex=0;vertex<shadowPos.count;vertex++){
        const worldX=groundPosition.x+shadowPos.getX(vertex)*sampled.scale;
        const worldZ=groundPosition.z-shadowPos.getY(vertex)*sampled.scale;
        shadowPos.setZ(vertex,terrainHeight(worldX,worldZ)+.009+index*.000008);
      }
      shadowPos.needsUpdate=true;
      cloud.shadowMaterial.opacity =
        cloudShadowStrength(e.sunlight, e.sunDirection.y, presence) * (1 - rainAmount * .72);
      cloud.shadow.visible = cloud.shadowMaterial.opacity > .001 &&
        Math.abs(groundPosition.x) < edge + 3 && Math.abs(groundPosition.z) < edge + 3;
    }
    return coverage;
  }
}
