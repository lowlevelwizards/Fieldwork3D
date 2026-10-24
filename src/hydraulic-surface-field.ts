import * as THREE from 'three';
import type { TerrainWater } from './hydrology';
import { buildHydraulicWaterMesh } from './hydraulic-water-mesh-model';

/**
 * Build 024.2: one geometrically continuous, front-facing water footprint.
 * No layered transparent river segments, no individual rectangular flood
 * plates, and no geometry spanning unrelated water surface elevations.
 * The model preserves all simulation water stores and measured stages.
 */
export class HydraulicSurfaceField {
  private readonly mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private lastRebuildMs=Number.NEGATIVE_INFINITY;

  constructor(scene:THREE.Scene){
    this.mesh=new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        vertexColors:true,
        transparent:true,
        opacity:1,
        roughness:.62,
        metalness:0,
        depthTest:true,
        depthWrite:false,
        side:THREE.FrontSide,
      }));
    this.mesh.frustumCulled=false;
    this.mesh.renderOrder=2.15;
    scene.add(this.mesh);
  }

  update(water:TerrainWater,force=false):void{
    const now=performance.now();
    if(!force&&now-this.lastRebuildMs<160)return;
    this.lastRebuildMs=now;
    const data=buildHydraulicWaterMesh(water,4);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',
      new THREE.Float32BufferAttribute(data.position,3));
    geometry.setAttribute('color',
      new THREE.Float32BufferAttribute(data.rgba,4));
    geometry.setAttribute('normal',
      new THREE.Float32BufferAttribute(data.normal,3));
    this.mesh.geometry.dispose();
    this.mesh.geometry=geometry;
    this.mesh.visible=data.triangleCount>0;
  }
}
