import * as THREE from 'three';
import {
  GRID_CELLS, CELL_SIZE, WORLD_HALF, terrainHeight,
} from './terrain-model';
import { type TerrainWater } from './hydrology';
import type { EnvironmentState } from './environment-conditions';
import {
  WATER_SHORE_COLOR, WATER_DEEP_COLOR, waterAppearanceAtDepth,
} from './water-visual-model';

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
  private readonly material:THREE.MeshStandardMaterial;
  private readonly shoreColor=new THREE.Color(WATER_SHORE_COLOR);
  private readonly deepColor=new THREE.Color(WATER_DEEP_COLOR);
  private lastVolumes:number[]=[];

  constructor(scene:THREE.Scene){
    // This is a REAL lit surface. Direct sunlight, cool nighttime fill,
    // tone mapping and exposure are handled by the same PBR pipeline as
    // the terrain and clouds. Explicitly forbid a separate unlit shader.
    //
    // The 4-component vertex color (RGBA) carries physically derived depth
    // and shoreline coverage. Three.js MeshStandardMaterial automatically
    // enables vertex alpha when a "color" attribute has itemSize 4.
    this.material=new THREE.MeshStandardMaterial({
      color:0xffffff,
      vertexColors:true,
      roughness:.46,
      metalness:0,
      transparent:true,
      opacity:1,
      depthTest:true,
      depthWrite:false,
      side:THREE.FrontSide,
    });
    this.surface=new THREE.Mesh(new THREE.BufferGeometry(),this.material);
    // Shadows and shallow mist (1) come before water (2); rain (3/4)
    // and sky clouds (5) composite afterward, as in the previous fix.
    this.surface.renderOrder=2;
    this.surface.frustumCulled=false;
    scene.add(this.surface);
  }

  update(water:TerrainWater,_env:EnvironmentState,_rainAmount:number):void {
    // No time-dependent water tint: scene lights do the lighting work.
    // Color/opacity changes only when the physically stored level changes.
    const volumes=water.watershed.basins.map(b=>water.basinLiters(b.id));
    const changed=volumes.length!==this.lastVolumes.length ||
      volumes.some((v,i)=>Math.abs(v-(this.lastVolumes[i]??0))>.09);
    if(!changed)return;
    this.lastVolumes=volumes;
    const positions:number[]=[];
    const colors:number[]=[];
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
            // Color AND alpha follow the actual water depth at each vertex.
            // An RGBA vertex attribute is interpolated by the standard lit
            // material, so no fragment sine-grids or unlit coloring remain.
            for(const point of [a,b,c]){
              const appearance=waterAppearanceAtDepth(level-point.h);
              const tint=this.shoreColor.clone().lerp(this.deepColor,appearance.depthMix);
              colors.push(tint.r,tint.g,tint.b,appearance.opacity);
            }
          }
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
    // Horizontal surface normals are constant. The lighting engine receives
    // these normals and shades the water through scene lights/tone mapping.
    const normal=new Float32Array(positions.length);
    for(let i=1;i<normal.length;i+=3)normal[i]=1;
    geometry.setAttribute('normal',new THREE.BufferAttribute(normal,3));
    if(positions.length)geometry.computeBoundingSphere();
    this.surface.geometry.dispose();
    this.surface.geometry=geometry;
    this.surface.visible=positions.length>0;
  }
}
