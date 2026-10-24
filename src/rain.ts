import * as THREE from 'three';
import { windAtHour } from './wind-model';
import { terrainHeight } from './terrain-model';
import { CLOUD_COUNT, REGION_HALF_WIDTH, cloudAt, cloudPresence } from './cloud-model';
import {
  RAIN_STREAK_LENGTH, rainEmissionCeiling, type RainState,
} from './rain-model';

/**
 * Light-weight, clock-driven rain rendering.
 * 18 small clouds share one drop geometry. One draw call per rain curtain.
 * No particle allocation each frame and no independent animation timer.
 */

const STREAKS_PER_CLOUD = 72;
const IMPACTS_PER_CLOUD = 9;
const hash = (x: number): number => {
  const n = Math.sin(x * 127.1 + 9.7) * 43758.5453;
  return n - Math.floor(n);
};

function streakGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(STREAKS_PER_CLOUD * 2 * 3);
  const seeds = new Float32Array(STREAKS_PER_CLOUD * 2);
  const ends = new Float32Array(STREAKS_PER_CLOUD * 2);

  for (let i = 0; i < STREAKS_PER_CLOUD; i++) {
    const x = (hash(i * 3 + 1) - .5) * 3.3;
    const z = (hash(i * 3 + 2) - .5) * 2.65;
    const seed = hash(i * 3 + 3);
    for (let end = 0; end < 2; end++) {
      const vertex = i * 2 + end;
      const n = vertex * 3;
      positions[n] = x;
      positions[n + 1] = 0; // height is reconstructed from the world clock
      positions[n + 2] = z;
      seeds[vertex] = seed;
      ends[vertex] = end;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
  geometry.computeBoundingSphere();
  // Shader-raindrops are taller than the static geometry.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.7, 0), 5);
  return geometry;
}

type Curtain = {
  mesh: THREE.LineSegments;
  material: THREE.ShaderMaterial;
};

export class RainField {
  private readonly curtains: Curtain[] = [];
  private readonly impacts: THREE.Points;
  private readonly impactPositions: Float32Array;
  private readonly impactMaterial: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene) {
    const geometry = streakGeometry();
    for (let index = 0; index < CLOUD_COUNT; index++) {
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          hour: { value: 0 },
          ceiling: { value: 3.4 },
          streakLength: { value: RAIN_STREAK_LENGTH },
          windVector: { value: new THREE.Vector2() },
          alpha: { value: 0 },
          color: { value: new THREE.Color(0xa8bec6) },
        },
        vertexShader: `
          attribute float aSeed;
          attribute float aEnd;
          uniform float hour;
          uniform float ceiling;
          uniform float streakLength;
          uniform vec2 windVector;
          varying vec3 vWorld;
          varying float vRawHeight;
          varying float vFlicker;
          void main() {
            // phase rises with time, so Y MUST fall with time.
            float phase = fract(aSeed + hour * 12.0);
            vec3 p = position;
            // Lower leading tip, higher trailing tip. Never start above
            // the actual underside of the parent cloud.
            float rawHeight = ceiling
              - phase * (ceiling + streakLength)
              + aEnd * streakLength;
            vRawHeight = rawHeight;
            p.y = clamp(rawHeight, 0.025, ceiling);
            // The same moving air pushes each falling drop downwind.
            p.x += aEnd * .095 + (ceiling-p.y) * windVector.x * .016;
            p.z += (ceiling-p.y) * windVector.y * .016;
            vec4 world = modelMatrix * vec4(p, 1.0);
            vWorld = world.xyz;
            vFlicker = .70 + .30 * aSeed;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          uniform float alpha;
          uniform vec3 color;
          uniform float ceiling;
          varying vec3 vWorld;
          varying float vRawHeight;
          varying float vFlicker;
          void main() {
            // Clip at both the ground and the cloud underside, including
            // the upper end of a streak while it first enters the curtain.
            if (vRawHeight < 0.025 || vRawHeight > ceiling) discard;
            // World-space rain lives only inside the original square region.
            if (abs(vWorld.x) > 5.0 || abs(vWorld.z) > 5.0) discard;
            gl_FragColor = vec4(color, alpha * vFlicker);
          }
        `,
      });
      const mesh = new THREE.LineSegments(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      scene.add(mesh);
      this.curtains.push({ mesh, material });
    }

    // Minimal intermittent droplets striking the one real top surface.
    const count = CLOUD_COUNT * IMPACTS_PER_CLOUD;
    this.impactPositions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.impactPositions[3 * i + 1] = .042;
      seeds[i] = hash(i * 5 + 93);
    }
    const impactGeometry = new THREE.BufferGeometry();
    impactGeometry.setAttribute('position', new THREE.BufferAttribute(this.impactPositions, 3));
    impactGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.impactMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: { hour: { value: 0 }, amount: { value: 0 } },
      vertexShader: `
        attribute float aSeed;
        uniform float hour;
        varying float vPulse;
        varying vec3 vWorld;
        void main() {
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          vPulse = pow(max(0.0, sin((aSeed * 5.0 + hour * 33.0) * 6.2831853)), 10.0);
          vec4 eye = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * eye;
          gl_PointSize = 1.7 + 2.0 * vPulse;
        }
      `,
      fragmentShader: `
        uniform float amount;
        varying float vPulse;
        varying vec3 vWorld;
        void main() {
          if (abs(vWorld.x) > 5.0 || abs(vWorld.z) > 5.0) discard;
          float r = length(gl_PointCoord - vec2(.5)) * 2.0;
          float mask = 1.0 - smoothstep(.22, 1.0, r);
          gl_FragColor = vec4(.76, .88, .92, amount * vPulse * mask * .63);
        }
      `,
    });
    this.impacts = new THREE.Points(impactGeometry, this.impactMaterial);
    this.impacts.frustumCulled = false;
    this.impacts.renderOrder = 4;
    scene.add(this.impacts);
  }

  update(hour: number, rain: RainState): void {
    const amount = rain.amount;
    const wind=windAtHour(hour);
    const overcast = rain.cover;
    this.impactMaterial.uniforms.hour.value = hour;
    this.impactMaterial.uniforms.amount.value = amount;
    this.impacts.visible = amount > .012;

    for (let index = 0; index < CLOUD_COUNT; index++) {
      const sampled = cloudAt(index, hour);
      const curtain = this.curtains[index];
      const presence = cloudPresence(overcast, sampled.rank);
      const strength = amount * presence;
      curtain.mesh.position.set(sampled.x, 0, sampled.z);
      curtain.mesh.scale.setScalar(sampled.scale);
      // Keep rain under cloud foot, never above its bottom.
      curtain.mesh.scale.y = 1;
      curtain.mesh.visible = strength > .012
        && Math.abs(sampled.x) < REGION_HALF_WIDTH + 3.5
        && Math.abs(sampled.z) < REGION_HALF_WIDTH + 3.5;
      curtain.material.uniforms.hour.value = hour;
      (curtain.material.uniforms.windVector.value as THREE.Vector2).set(wind.x,wind.z);
      curtain.material.uniforms.ceiling.value = rainEmissionCeiling(sampled);
      curtain.material.uniforms.alpha.value = Math.min(.65, strength * .72);

      for (let j = 0; j < IMPACTS_PER_CLOUD; j++) {
        const i = index * IMPACTS_PER_CLOUD + j;
        const x = (hash(i * 4 + 36) - .5) * 3.2;
        const z = (hash(i * 4 + 37) - .5) * 2.6;
        const worldX = sampled.x + x * sampled.scale + wind.x * .05;
        const worldZ = sampled.z + z * sampled.scale + wind.z * .05;
        this.impactPositions[3 * i] = worldX;
        this.impactPositions[3 * i + 1] = terrainHeight(worldX,worldZ) + .042;
        this.impactPositions[3 * i + 2] = worldZ;
      }
    }

    const attribute = this.impacts.geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  }
}
