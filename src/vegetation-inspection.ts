import * as THREE from 'three';
import { woodyHabitatAt,shrubHabitatAt,canopyAt,
  type WoodyLandscape } from './vegetation-model.ts';
import { GRID_CELLS } from './terrain-model.ts';

export type WoodyInspectionMode='tree'|'shrub'|'canopy';
export function woodyInspectionValue(x:number,z:number,world:WoodyLandscape,
  mode:WoodyInspectionMode):number{
  switch(mode){
    case 'tree':return woodyHabitatAt(x,z,world.seed).tree;
    case 'shrub':return shrubHabitatAt(x,z,world.trees,world.seed).shrub;
    case 'canopy':return canopyAt(x,z,world.trees);
  }
}
/** Temporarily color the existing terrain, not an overlaid second ground
 * mesh, so hydrology geometry, shader grain and collision stay untouched. */
export function paintWoodyInspection(geometry:THREE.BufferGeometry,
  world:WoodyLandscape,mode:WoodyInspectionMode):void{
  const colors=geometry.getAttribute('color') as THREE.BufferAttribute;
  const pos=geometry.getAttribute('position') as THREE.BufferAttribute;
  const n=GRID_CELLS;
  const top=(n+1)*(n+1)+n*n;
  const dry=new THREE.Color(0xa99c80),green=new THREE.Color(0x427c57);
  const mixed=new THREE.Color();
  for(let i=0;i<top;i++){
    const v=woodyInspectionValue(pos.getX(i),pos.getZ(i),world,mode);
    mixed.copy(dry).lerp(green,v);
    colors.setXYZ(i,mixed.r,mixed.g,mixed.b);
  }
  colors.needsUpdate=true;
}
