import * as THREE from 'three';
import {
  GRID_CELLS, CELL_SIZE, WORLD_HALF, terrainHeight,
} from './terrain-model';
import { type TerrainWater } from './hydrology';
import type { EnvironmentState } from './environment-conditions';

type Vertex = { x:number;z:number;h:number };

// Clip a triangle of actual GROUND against a horizontal water surface.
// The intersection runs along the land contour, rather than drawing oval
// decals at arbitrary elevations.
function submergedPolygon(triangle:Vertex[], level:number):Vertex[] {
  const output:Vertex[]=[];
  for(let i=0;i<triangle.length;i++){
    const a=triangle[i], b=triangle[(i+1)%triangle.length];
    const aInside=a.h<=level, bInside=b.h<=level;
    if(aInside)output.push(a);
    if(aInside!==bInside){
      const t=(level-a.h)/(b.h-a.h);
      output.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,h:level});
    }
  }
  return output;
}

/**
 * A single 3-D water surface at an equal level in each flooded catchment.
 * One rendered mesh; terrain z-buffer hides any shoreline overlaps.
 * Volume stays exclusively in TerrainWater.
 */
export class PuddleField {
  private readonly surface:THREE.Mesh;
  private readonly material:THREE.MeshPhongMaterial;
  private lastVolumes:number[]=[];

  constructor(scene:THREE.Scene){
    this.material=new THREE.MeshPhongMaterial({
      color:0x648792,
      specular:0xc5d6d1,
      shininess:110,
      transparent:true,
      opacity:.74,
      depthTest:true,
      depthWrite:false,
      side:THREE.DoubleSide,
    });
    this.surface=new THREE.Mesh(new THREE.BufferGeometry(),this.material);
    // Shadows and shallow mist (1) come before water (2); rain (3/4)
    // and sky clouds (5) composite afterward, as in the previous fix.
    this.surface.renderOrder=2;
    this.surface.frustumCulled=false;
    scene.add(this.surface);
  }

  update(water:TerrainWater,env:EnvironmentState,rainAmount:number):void {
    // A restrained environmental tint suggests reflection without expensive
    // water render targets or pretending to have wave/fluid simulation.
    const reflected=new THREE.Color(env.skyHorizon);
    reflected.lerp(new THREE.Color(0x3b6068),.45);
    this.material.color.copy(reflected);
    this.material.specular.setHex(env.skyMiddle);
    this.material.opacity=.65+Math.min(.13,rainAmount*.09);

    const volumes=water.watershed.basins.map(b=>water.basinLiters(b.id));
    const changed=volumes.length!==this.lastVolumes.length ||
      volumes.some((v,i)=>Math.abs(v-(this.lastVolumes[i]??0))>.09);
    if(!changed)return;
    this.lastVolumes=volumes;
    const positions:number[]=[];
    const normals:number[]=[];
    const {watershed}=water;
    for(const basin of watershed.basins){
      const level=water.surfaceLevel(basin.id);
      if(level===null)continue;
      const y=level+.003; // a water surface must sit just above submerged land
      for(const cellIndex of basin.cellIndexes){
        const row=Math.floor(cellIndex/GRID_CELLS);
        const col=cellIndex%GRID_CELLS;
        const x=-WORLD_HALF+col*CELL_SIZE,z=-WORLD_HALF+row*CELL_SIZE;
        const tl={x,z,h:terrainHeight(x,z)};
        const tr={x:x+CELL_SIZE,z,h:terrainHeight(x+CELL_SIZE,z)};
        const br={x:x+CELL_SIZE,z:z+CELL_SIZE,h:terrainHeight(x+CELL_SIZE,z+CELL_SIZE)};
        const bl={x,z:z+CELL_SIZE,h:terrainHeight(x,z+CELL_SIZE)};
        const center=watershed.cells[cellIndex];
        const cc={x:center.x,z:center.z,h:center.height};
        const triangles:Vertex[][]=[
          [tl,cc,tr],[tr,cc,br],[br,cc,bl],[bl,cc,tl],
        ];
        for(const triangle of triangles){
          const polygon=submergedPolygon(triangle,level);
          if(polygon.length<3)continue;
          for(let i=1;i<polygon.length-1;i++){
            const a=polygon[0],b=polygon[i],c=polygon[i+1];
            // Skip degenerate shore slivers.
            const area=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
            if(Math.abs(area)<1e-9)continue;
            positions.push(a.x,y,a.z,b.x,y,b.z,c.x,y,c.z);
            normals.push(0,1,0,0,1,0,0,1,0);
          }
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    if(positions.length)geometry.computeBoundingSphere();
    this.surface.geometry.dispose();
    this.surface.geometry=geometry;
    this.surface.visible=positions.length>0;
  }
}
