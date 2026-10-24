import * as THREE from 'three';
import type { TerrainWater } from './hydrology';
import {
  GRID_CELLS, CELL_SIZE, WORLD_HALF, cellIndexAt,
  localChannelProximity, terrainHeight,
} from './terrain-model';
import {
  visibleStream, extractChannelChains, smoothChannelProfile, channelChainPoint,
} from './drainage-visual-model';
import { selectVisibleRiverLinks } from './visible-rivers';
import { floodDisplayDepth, sampleDisplayMoisture } from './terrain-display-model';
import {
  WATER_SHORE_COLOR, WATER_DEEP_COLOR, waterAppearanceAtDepth,
} from './water-visual-model';

type StreamSegment={
  ax:number;az:number;bx:number;bz:number;
  widthA:number;widthB:number;levelA:number;levelB:number;
};
type Vertex={x:number;z:number;level:number;alpha:number;depth:number};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const smooth=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

/**
 * Build 024: ONE lit, depth-dependent water surface built from authoritative
 * moving channel stages, conserved overbank litres and volume-solved ponds.
 * These three physical stores may have different origins but their visible
 * intersection is one water body. The rendering never mutates the stores.
 */
export class HydraulicSurfaceField {
  private readonly mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private readonly shore=new THREE.Color(WATER_SHORE_COLOR);
  private readonly deep=new THREE.Color(WATER_DEEP_COLOR);
  private readonly tint=new THREE.Color();
  private lastRebuildMs=Number.NEGATIVE_INFINITY;

  constructor(scene:THREE.Scene){
    this.mesh=new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color:0xffffff,vertexColors:true,transparent:true,opacity:1,
        roughness:.46,metalness:0,depthTest:true,depthWrite:false,
        side:THREE.DoubleSide,
      }));
    this.mesh.frustumCulled=false;
    this.mesh.renderOrder=2.15;
    scene.add(this.mesh);
  }

  update(water:TerrainWater,force=false):void{
    const now=performance.now();
    if(!force&&now-this.lastRebuildMs<160)return;
    this.lastRebuildMs=now;
    const {watershed}=water;
    const n=GRID_CELLS;
    const depths=new Float32Array(n*n);
    const elevation=new Float32Array(n*n);
    const weightedHead=new Float32Array(n*n);
    const pondLevels=watershed.basins.map(b=>water.surfaceLevel(b.id));
    const pondNeighbor=watershed.cells.map(c=>{
      const id=watershed.cellBasin[c.index];
      const level=id<0?null:pondLevels[id];
      return level!==null&&level>c.height+.004;
    });
    for(const cell of watershed.cells){
      const i=cell.index;
      const depth=Math.max(0,water.floodLiters(i))/(1000*CELL_SIZE*CELL_SIZE);
      depths[i]=depth;
      elevation[i]=cell.height;
      weightedHead[i]=depth*(cell.height+water.channelStageAtCell(i));
    }
    const flood=floodDisplayDepth(depths,elevation,n);
    // Filtering numerator AND weight gives a continuous surface level,
    // not a patchwork of individually elevated cell-centered flood fans.
    const floodHeads=floodDisplayDepth(weightedHead,elevation,n);

    const candidates=watershed.cells.map(c=>
      watershed.downhill[c.index]>=0 &&
      visibleStream(water.runoffLiters(c.index),
        watershed.flowAccumulation[c.index],
        localChannelProximity(c.x,c.z)));
    const active=selectVisibleRiverLinks(
      watershed.downhill,candidates,watershed.flowAccumulation,n,pondNeighbor);
    const chains=extractChannelChains(
      watershed.downhill,active,watershed.flowAccumulation);
    // Spatial bins avoid testing every sample against every tributary.
    const spatial:StreamSegment[][]=Array.from({length:n*n},()=>[]);
    const addSegment=(segment:StreamSegment)=>{
      const reach=Math.max(segment.widthA,segment.widthB)*.5+.04;
      const xmin=clamp(Math.floor((Math.min(segment.ax,segment.bx)-reach+WORLD_HALF)/CELL_SIZE),0,n-1);
      const xmax=clamp(Math.floor((Math.max(segment.ax,segment.bx)+reach+WORLD_HALF)/CELL_SIZE),0,n-1);
      const zmin=clamp(Math.floor((Math.min(segment.az,segment.bz)-reach+WORLD_HALF)/CELL_SIZE),0,n-1);
      const zmax=clamp(Math.floor((Math.max(segment.az,segment.bz)+reach+WORLD_HALF)/CELL_SIZE),0,n-1);
      for(let row=zmin;row<=zmax;row++)
        for(let col=xmin;col<=xmax;col++)spatial[row*n+col].push(segment);
    };
    for(const chain of chains){
      const nodes=chain.map(i=>watershed.cells[i]);
      const widths=smoothChannelProfile(chain.map(i=>
        water.channelWettedWidthAtCell(i)),1);
      const levels=chain.map(i=>
        watershed.cells[i].height+water.channelStageAtCell(i));
      // Whole downstream traces have shared stage/width at a confluence.
      for(let edge=0;edge<chain.length-1;edge++){
        let previous=channelChainPoint(nodes,edge,0);
        for(let step=1;step<=5;step++){
          const t=step/5;
          const current=channelChainPoint(nodes,edge,t);
          const start=(step-1)/5;
          addSegment({
            ax:previous.x,az:previous.z,bx:current.x,bz:current.z,
            widthA:lerp(widths[edge],widths[edge+1],start),
            widthB:lerp(widths[edge],widths[edge+1],t),
            levelA:lerp(levels[edge],levels[edge+1],start),
            levelB:lerp(levels[edge],levels[edge+1],t),
          });
          previous=current;
        }
      }
    }

    // Three visual samples per physical cell; overlapping river, flood and
    // pond regions resolve to the highest physically supported surface.
    const resolution=n*3,stride=resolution+1;
    const verts:Vertex[]=new Array(stride*stride);
    for(let row=0;row<=resolution;row++)for(let col=0;col<=resolution;col++){
      const x=-WORLD_HALF+(col/resolution)*2*WORLD_HALF;
      const z=-WORLD_HALF+(row/resolution)*2*WORLD_HALF;
      const ground=terrainHeight(x,z);
      const cellId=cellIndexAt(x,z);
      let level=ground,alpha=0;
      const accept=(candidate:number,coverage:number)=>{
        const depth=candidate-ground;
        if(depth<=0||coverage<=0)return;
        const strength=waterAppearanceAtDepth(depth).opacity*coverage;
        if(strength>alpha){
          level=candidate;
          alpha=strength;
        }else if(strength>.05&&candidate>level){
          // Prevent adjoining stored-water representations from drawing
          // intersecting sheets through each other at a floodplain mouth.
          level=candidate;
        }
      };

      // Interior catchments retain level, volume and spill-point geometry.
      const basin=watershed.cellBasin[cellId];
      const pond=basin<0?null:pondLevels[basin];
      if(pond!==null)accept(pond,1);

      // Overbank surface: soft footprint but continuous weighted elevation.
      const overbank=sampleDisplayMoisture(flood,x,z,n);
      if(overbank>.00015){
        const head=sampleDisplayMoisture(floodHeads,x,z,n)/
          Math.max(overbank,1e-7);
        accept(head,smooth(overbank/.006));
      }

      // A river is a stage-dependent wetted cross-section, not a constant
      // thin blue line. Adjacent raised banks naturally clip its surface.
      for(const seg of spatial[cellId]){
        const dx=seg.bx-seg.ax,dz=seg.bz-seg.az;
        const d2=dx*dx+dz*dz;
        const t=d2>1e-10?clamp(((x-seg.ax)*dx+(z-seg.az)*dz)/d2,0,1):0;
        const px=lerp(seg.ax,seg.bx,t),pz=lerp(seg.az,seg.bz,t);
        const distance=Math.hypot(x-px,z-pz);
        const halfWidth=lerp(seg.widthA,seg.widthB,t)*.5;
        if(distance>halfWidth+.016)continue;
        const feather=smooth((halfWidth+.016-distance)/.040);
        accept(lerp(seg.levelA,seg.levelB,t),feather);
      }
      verts[row*stride+col]={x,z,level,alpha,depth:Math.max(0,level-ground)};
    }

    const pos:number[]=[];
    const rgba:number[]=[];
    const normals:number[]=[];
    const vertex=(v:Vertex)=>{
      pos.push(v.x,v.level+.004,v.z);
      const shade=waterAppearanceAtDepth(v.depth);
      this.tint.copy(this.shore).lerp(this.deep,shade.depthMix);
      rgba.push(this.tint.r,this.tint.g,this.tint.b,v.alpha);
      normals.push(0,1,0);
    };
    for(let row=0;row<resolution;row++)for(let col=0;col<resolution;col++){
      const a=verts[row*stride+col],b=verts[row*stride+col+1];
      const c=verts[(row+1)*stride+col+1],d=verts[(row+1)*stride+col];
      if(Math.max(a.alpha,b.alpha,c.alpha,d.alpha)<.009)continue;
      for(const v of [a,b,c,a,c,d])vertex(v);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgba,4));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    this.mesh.geometry.dispose();
    this.mesh.geometry=geometry;
    this.mesh.visible=pos.length>0;
  }
}
