import * as THREE from 'three';
import {
  GRID_CELLS, WORLD_SIZE, WORLD_HALF, SUBSTRATE_BOTTOM,
  terrainHeight,
} from './terrain-model';

/** A single indexed mesh with a continuous heightfield top and solid earth walls. */
export function makeTerrainGeometry(): THREE.BufferGeometry {
  const position: number[] = [];
  const indices: number[] = [];
  const groups: { start: number; count: number; materialIndex: number }[] = [];
  const n = GRID_CELLS;
  for (let row = 0; row <= n; row++) {
    for (let col = 0; col <= n; col++) {
      const x = -WORLD_HALF + WORLD_SIZE * col / n;
      const z = -WORLD_HALF + WORLD_SIZE * row / n;
      position.push(x, terrainHeight(x,z), z);
    }
  }
  const vertex = (r: number,c: number) => r * (n + 1) + c;
  const cellCenterBase = position.length / 3;
  // Each heightfield cell has a real center vertex. The hydrology reads
  // EXACTLY these elevations, so water never floats above a fictitious hollow
  // or gets hidden under a flat diagonal between four higher corners.
  for(let row=0;row<n;row++) for(let col=0;col<n;col++){
    const x=-WORLD_HALF+WORLD_SIZE*(col+.5)/n;
    const z=-WORLD_HALF+WORLD_SIZE*(row+.5)/n;
    position.push(x,terrainHeight(x,z),z);
  }
  for (let row=0;row<n;row++) for(let col=0;col<n;col++){
    const tl=vertex(row,col),tr=vertex(row,col+1);
    const bl=vertex(row+1,col),br=vertex(row+1,col+1);
    const center=cellCenterBase+row*n+col;
    // Counter-clockwise toward +Y, four triangle fans per hydrology cell.
    indices.push(tl,center,tr,tr,center,br,br,center,bl,bl,center,tl);
  }
  groups.push({start:0,count:indices.length,materialIndex:0});
  const sidesStart=indices.length;
  const wall=(a: [number,number],b: [number,number])=>{
    const base=position.length/3;
    position.push(a[0],terrainHeight(a[0],a[1]),a[1]);
    position.push(b[0],terrainHeight(b[0],b[1]),b[1]);
    position.push(a[0],SUBSTRATE_BOTTOM,a[1]);
    position.push(b[0],SUBSTRATE_BOTTOM,b[1]);
    indices.push(base,base+1,base+2,base+1,base+3,base+2);
  };
  // Clockwise perimeter from above: side quads face outward.
  for(let i=0;i<n;i++){
    const a=-WORLD_HALF+WORLD_SIZE*i/n,b=-WORLD_HALF+WORLD_SIZE*(i+1)/n;
    wall([a,-WORLD_HALF],[b,-WORLD_HALF]);
    wall([WORLD_HALF,a],[WORLD_HALF,b]);
    wall([b,WORLD_HALF],[a,WORLD_HALF]);
    wall([-WORLD_HALF,b],[-WORLD_HALF,a]);
  }
  groups.push({start:sidesStart,count:indices.length-sidesStart,materialIndex:1});
  const bottom=position.length/3;
  position.push(-WORLD_HALF,SUBSTRATE_BOTTOM,-WORLD_HALF);
  position.push(WORLD_HALF,SUBSTRATE_BOTTOM,-WORLD_HALF);
  position.push(WORLD_HALF,SUBSTRATE_BOTTOM,WORLD_HALF);
  position.push(-WORLD_HALF,SUBSTRATE_BOTTOM,WORLD_HALF);
  indices.push(bottom,bottom+1,bottom+2,bottom,bottom+2,bottom+3);
  groups.push({start:indices.length-6,count:6,materialIndex:1});
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  for(const group of groups) geometry.addGroup(group.start,group.count,group.materialIndex);
  return geometry;
}
