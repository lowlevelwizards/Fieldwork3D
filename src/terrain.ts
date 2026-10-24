import * as THREE from 'three';
import { SURFACE, visualMaterialWeights, type SurfaceKind } from './surface-materials';
import {
  smoothDisplayMoisture, sampleDisplayMoisture, reliefBrightness,
  displayWetnessWeight,
} from './terrain-display-model';
import type { TerrainWater } from './hydrology';
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
  // Precompute geological color mixing once. The simulation still uses
  // discrete material classes, but their color boundaries are feathered
  // over surrounding samples so they look deposited, not painted squares.
  const topCount=(n+1)*(n+1)+n*n;
  const dry=new Float32Array(topCount*3);
  const wet=new Float32Array(topCount*3);
  const kinds:SurfaceKind[]=['loam','clay','sand','rock','organic'];
  const dryColors=kinds.map(kind=>new THREE.Color(SURFACE[kind].dryColor));
  const wetColors=kinds.map(kind=>new THREE.Color(SURFACE[kind].wetColor));
  for(let i=0;i<topCount;i++){
    const x=position[i*3],z=position[i*3+2];
    const mix=visualMaterialWeights(x,z);
    const local=terrainHeight(x,z);
    const delta=.47;
    const average=(
      terrainHeight(x-delta,z)+terrainHeight(x+delta,z)
      +terrainHeight(x,z-delta)+terrainHeight(x,z+delta)
    )*.25;
    // Concave low spots have darker ambient contact, even before rain.
    const relief=reliefBrightness(local,average);
    for(let c=0;c<3;c++){
      let a=0,b=0;
      const channel=c===0 ? 'r' : c===1 ? 'g' : 'b';
      for(let k=0;k<kinds.length;k++){
        const weight=mix[kinds[k]];
        a+=dryColors[k][channel]*weight;
        b+=wetColors[k][channel]*weight;
      }
      dry[i*3+c]=a*relief;
      wet[i*3+c]=b*relief;
    }
  }
  geometry.userData.visualDry=dry;
  geometry.userData.visualWet=wet;
  const colors=new Float32Array(position.length);
  colors.fill(1);
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return geometry;
}

/** Local soil moisture modulates the already-feathered material colors.
 * Water mass and catchment geometry are never affected by visual blending.
 */
export function updateTerrainMoisture(geometry:THREE.BufferGeometry,water:TerrainWater):void {
  const attribute=geometry.getAttribute('color') as THREE.BufferAttribute;
  const dry=geometry.userData.visualDry as Float32Array;
  const wet=geometry.userData.visualWet as Float32Array;
  const n=GRID_CELLS;
  const topVertices=(n+1)*(n+1)+n*n;
  const physicalMoisture=new Float32Array(n*n);
  for(let i=0;i<physicalMoisture.length;i++){
    physicalMoisture[i]=water.soilFraction(i);
  }
  const displayMoisture=smoothDisplayMoisture(physicalMoisture,n);
  const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
  for(let i=0;i<topVertices;i++){
    // Sample the exact same bilinear field at both shared grid corners
    // and hydrology-cell centers. No distinct averaging rules or seams.
    const fraction=sampleDisplayMoisture(
      displayMoisture,positions.getX(i),positions.getZ(i),n,
    );
    const t=displayWetnessWeight(fraction);
    const k=i*3;
    attribute.setXYZ(i,
      dry[k]+(wet[k]-dry[k])*t,
      dry[k+1]+(wet[k+1]-dry[k+1])*t,
      dry[k+2]+(wet[k+2]-dry[k+2])*t);
  }
  attribute.needsUpdate=true;
}
