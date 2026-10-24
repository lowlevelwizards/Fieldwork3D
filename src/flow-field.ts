import * as THREE from 'three';
import type { TerrainWater } from './hydrology';
import {
  CELL_SIZE, GRID_CELLS, WORLD_HALF, localChannelProximity, terrainHeight,
} from './terrain-model';
import {
  visibleStream, streamWidth, flowCurvePoint, floodOpacity,
  type ChannelPoint,
} from './drainage-visual-model';

/**
 * Build 022: runoff is physical, its presentation is not a drainage-graph
 * overlay. Only concentrated, measured flows become visible channels;
 * diffuse sheet runoff is expressed through damp ground in terrain.ts.
 *
 * Connected centerline ribbons bend toward actual upstream/downstream
 * graph links, while a shared-depth flood field removes individual cell
 * spokes and hard-edged rectangular overlays. No water is created here.
 */
export class FlowField {
  private readonly channels:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private readonly overbank:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private readonly streamTint=new THREE.Color(0x426a70);
  private readonly floodTint=new THREE.Color(0x4c767c);
  private lastRebuildMs=Number.NEGATIVE_INFINITY;

  constructor(scene:THREE.Scene){
    this.channels=new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color:0xffffff,vertexColors:true,
        transparent:true,opacity:1,roughness:.49,metalness:0,
        depthTest:true,depthWrite:false,side:THREE.DoubleSide,
      }));
    this.channels.frustumCulled=false;
    this.channels.renderOrder=2.15;
    scene.add(this.channels);
    this.overbank=new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color:0xffffff,vertexColors:true,
        transparent:true,opacity:1,roughness:.66,metalness:0,
        depthTest:true,depthWrite:false,side:THREE.DoubleSide,
      }));
    this.overbank.frustumCulled=false;
    this.overbank.renderOrder=2.12;
    scene.add(this.overbank);
  }

  update(water:TerrainWater,force=false):void{
    // Keep the slow ground-water representation economical on mobile.
    const now=performance.now();
    if(!force && now-this.lastRebuildMs<160)return;
    this.lastRebuildMs=now;

    const {watershed}=water;
    const positions:number[]=[];
    const colors:number[]=[];
    const normals:number[]=[];
    const floodPositions:number[]=[];
    const floodColors:number[]=[];
    const floodNormals:number[]=[];
    const streamRGBA=[0,.70,1,.70,0];
    const lane=[-1,-.66,0,.66,1];

    // Surface normal derived from the same heightfield as the hydrology.
    // Shared smoothing removes triangular changes in brightness along water.
    const addVertex=(
      pos:number[],rgb:number[],norm:number[],
      x:number,z:number,height:number,tint:THREE.Color,alpha:number,
    )=>{
      pos.push(x,terrainHeight(x,z)+.005+Math.max(0,height),z);
      rgb.push(tint.r,tint.g,tint.b,Math.max(0,Math.min(.95,alpha)));
      const dx=(terrainHeight(x+.025,z)-terrainHeight(x-.025,z))/.05;
      const dz=(terrainHeight(x,z+.025)-terrainHeight(x,z-.025))/.05;
      const m=Math.hypot(dx,1,dz);
      norm.push(-dx/m,1/m,-dz/m);
    };
    const polyQuad=(
      pos:number[],rgb:number[],norm:number[],
      a:{x:number;z:number;h:number;alpha:number},
      b:{x:number;z:number;h:number;alpha:number},
      c:{x:number;z:number;h:number;alpha:number},
      d:{x:number;z:number;h:number;alpha:number},
      tint:THREE.Color,
    )=>{
      for(const v of [a,b,c,a,c,d]){
        addVertex(pos,rgb,norm,v.x,v.z,v.h,tint,v.alpha);
      }
    };

    // Only branches whose measured catchment/volume support a visible
    // stream get water-colored ribbons. The vast majority of individual
    // raindrop routes are not individually drawn in blue.
    for(const cell of watershed.cells){
      const i=cell.index;
      const to=watershed.downhill[i];
      if(to<0)continue;
      const volume=water.runoffLiters(i);
      const upstream=watershed.flowAccumulation[i];
      if(!visibleStream(volume,upstream,localChannelProximity(cell.x,cell.z)))continue;
      const next=watershed.cells[to];
      const beginning:ChannelPoint={x:cell.x,z:cell.z};
      const ending:ChannelPoint={x:next.x,z:next.z};
      // The strongest contributing tributary defines an incoming tangent.
      const parents=cell.neighbors.filter(n=>watershed.downhill[n]===i);
      const parentIndex=parents.sort((a,b)=>
        watershed.flowAccumulation[b]-watershed.flowAccumulation[a])[0];
      const previous=parentIndex===undefined
        ? {x:2*cell.x-next.x,z:2*cell.z-next.z}
        : watershed.cells[parentIndex];
      const followingIndex=watershed.downhill[to];
      const following=followingIndex<0
        ? {x:2*next.x-cell.x,z:2*next.z-cell.z}
        : watershed.cells[followingIndex];

      const startWidth=streamWidth(volume,upstream);
      const endWidth=streamWidth(
        Math.max(volume*.45,water.runoffLiters(to)),
        watershed.flowAccumulation[to]);
      const depth=Math.min(.036,water.waterDepthAtCell(i)*.30);
      const opacity=Math.min(.87,.60+.07*Math.log1p(volume));
      type RibbonVertex={x:number;z:number;h:number;alpha:number};
      const previousSection:RibbonVertex[]=[];
      for(let step=0;step<=5;step++){
        const t=step/5;
        const p=flowCurvePoint(previous,beginning,ending,following,t);
        const before=flowCurvePoint(previous,beginning,ending,following,Math.max(0,t-.008));
        const after=flowCurvePoint(previous,beginning,ending,following,Math.min(1,t+.008));
        const length=Math.hypot(after.x-before.x,after.z-before.z)||1;
        const perpX=-(after.z-before.z)/length;
        const perpZ=(after.x-before.x)/length;
        const width=startWidth+(endWidth-startWidth)*t;
        // Physical channel depth is small at the head; the translucent
        // fringe transitions through muddy banks rather than blue strokes.
        const section:RibbonVertex[]=lane.map((offset,k)=>({
          x:p.x+perpX*width*offset,
          z:p.z+perpZ*width*offset,
          h:depth*(1-Math.abs(offset)*.3),
          alpha:opacity*streamRGBA[k],
        }));
        if(step){
          for(let k=0;k<lane.length-1;k++){
            polyQuad(positions,colors,normals,
              previousSection[k],previousSection[k+1],
              section[k+1],section[k],this.streamTint);
          }
        }
        previousSection.splice(0,previousSection.length,...section);
      }
    }

    // Overbank reservoirs generate ONE bilinearly continuous visual depth
    // field. Corner samples average their four physical neighbors, so no
    // cell-by-cell triangular spokes or tessellated stripe patterns remain.
    const n=GRID_CELLS;
    const depthField=new Float64Array(n*n);
    for(let i=0;i<depthField.length;i++){
      depthField[i]=Math.max(0,water.floodLiters(i))/(1000*CELL_SIZE*CELL_SIZE);
    }
    const cornerDepth=(r:number,c:number):number=>{
      let depth=0,count=0;
      for(let row=r-1;row<=r;row++)for(let col=c-1;col<=c;col++){
        if(row<0||col<0||row>=n||col>=n)continue;
        depth+=depthField[row*n+col];
        count++;
      }
      return count?depth/count:0;
    };
    type FloodVertex={x:number;z:number;h:number;alpha:number};
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){
      const centerDepth=depthField[r*n+c];
      const corners=[
        cornerDepth(r,c),cornerDepth(r,c+1),
        cornerDepth(r+1,c+1),cornerDepth(r+1,c),
      ];
      if(centerDepth<.00005 && corners.every(d=>d<.00005))continue;
      const x=-WORLD_HALF+c*CELL_SIZE;
      const z=-WORLD_HALF+r*CELL_SIZE;
      const center:FloodVertex={
        x:x+CELL_SIZE*.5,z:z+CELL_SIZE*.5,
        h:Math.min(.09,centerDepth*.42),
        alpha:floodOpacity(centerDepth),
      };
      const vertices:FloodVertex[]=[
        [0,0],[1,0],[1,1],[0,1],
      ].map(([ox,oz],k)=>({
        x:x+ox*CELL_SIZE,z:z+oz*CELL_SIZE,
        h:Math.min(.09,corners[k]*.42),
        alpha:floodOpacity(corners[k]),
      }));
      // Four triangles blend gently into adjacent wet cells. Water covers
      // terrain only where there is actual flood storage nearby.
      for(let k=0;k<4;k++){
        for(const v of [center,vertices[k],vertices[(k+1)%4]]){
          addVertex(floodPositions,floodColors,floodNormals,
            v.x,v.z,v.h,this.floodTint,v.alpha);
        }
      }
    }

    const stream=new THREE.BufferGeometry();
    stream.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    stream.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
    stream.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    this.channels.geometry.dispose();
    this.channels.geometry=stream;
    this.channels.visible=positions.length>0;

    const flood=new THREE.BufferGeometry();
    flood.setAttribute('position',new THREE.Float32BufferAttribute(floodPositions,3));
    flood.setAttribute('color',new THREE.Float32BufferAttribute(floodColors,4));
    flood.setAttribute('normal',new THREE.Float32BufferAttribute(floodNormals,3));
    this.overbank.geometry.dispose();
    this.overbank.geometry=flood;
    this.overbank.visible=floodPositions.length>0;
  }
}
