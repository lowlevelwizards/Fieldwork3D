import * as THREE from 'three';
import type { TerrainWater } from './hydrology';
import { buildRiverRibbon } from './river-ribbon-model';
import { buildPondMeshes } from './river-pond-model';

/**
 * Promote the river geometry that was tested in the isolated River Lab
 * into the real Verdigris region, with ACTUAL measured water stages.
 *
 * Flowing water is a continuous bed-following ribbon. Ponds are separate
 * level surfaces clipped to their basins. Neither paints the runoff grid.
 * Crucially, these renderers never mutate the stored water ledger.
 */
export class ValleyRiverField {
  private readonly river:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private readonly ponds:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private lastRebuildMs=-Infinity;

  constructor(scene:THREE.Scene){
    const material=new THREE.MeshStandardMaterial({
      color:0xffffff,vertexColors:true,transparent:true,
      depthTest:true,depthWrite:false,roughness:.44,
      metalness:0,side:THREE.FrontSide,
    });
    this.river=new THREE.Mesh(new THREE.BufferGeometry(),material);
    this.ponds=new THREE.Mesh(new THREE.BufferGeometry(),material);
    this.river.renderOrder=2.15;
    this.ponds.renderOrder=2.14;
    this.river.frustumCulled=false;
    this.ponds.frustumCulled=false;
    scene.add(this.ponds,this.river);
  }

  update(water:TerrainWater,force=false):void{
    const now=performance.now();
    if(!force&&now-this.lastRebuildMs<180)return;
    this.lastRebuildMs=now;
    const river=buildRiverRibbon('live',water);
    this.setData(this.river,river.position,river.color,river.normal);
    const pond=buildPondMeshes(water);
    this.setData(this.ponds,pond.position,pond.color,pond.normal);
  }

  private setData(mesh:THREE.Mesh<THREE.BufferGeometry>,
    positions:readonly number[],colors:readonly number[],
    normals:readonly number[]):void{
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    mesh.geometry.dispose();
    mesh.geometry=geometry;
    mesh.visible=positions.length>0;
  }
}
