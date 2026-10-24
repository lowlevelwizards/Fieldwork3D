import type { TerrainWater } from './hydrology.ts';
import {
  GRID_CELLS, CELL_SIZE, WORLD_HALF, cellIndexAt,
  localChannelProximity, terrainHeight,
} from './terrain-model.ts';
import {
  visibleStream, extractChannelChains, smoothChannelProfile, channelChainPoint,
} from './drainage-visual-model.ts';
import { selectVisibleRiverLinks } from './visible-rivers.ts';
import { waterAppearanceAtDepth } from './water-visual-model.ts';
import {
  clipWaterTriangle, triangleHasVisibleWater,
  type WaterVertex,
} from './water-surface-geometry.ts';

/**
 * Build 024.2: one footprint, one lit water surface at each world-space
 * sample. Never draw translucent river, flood and pond meshes on top of
 * one another. Those independent layers caused the visible checkerboard,
 * triangular spires and seams in the phone screenshots.
 */
export type WaterSample=WaterVertex & {source:0|1|2|3};
export type WaterMeshData={
  position:number[]; rgba:number[]; normal:number[];
  triangleCount:number; maxHeightStep:number; sampleCount:number;
};

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const SHORE=[.265,.407,.430] as const;
const DEEP=[.135,.310,.370] as const;

type Segment={ax:number;az:number;bx:number;bz:number;wa:number;wb:number;ya:number;yb:number};

export function buildHydraulicWaterMesh(water:TerrainWater,detail=4):WaterMeshData {
  if(!Number.isInteger(detail)||detail<2||detail>6)
    throw new Error('Water tessellation factor must be between 2 and 6');
  const {watershed}=water;
  const n=GRID_CELLS,grid=n*detail,stride=grid+1;
  const pondLevels=watershed.basins.map(b=>water.surfaceLevel(b.id));
  const waterStages=watershed.cells.map(c=>water.channelStageAtCell(c.index));
  const floodLiters=watershed.cells.map(c=>water.floodLiters(c.index));
  const wettedWidth=watershed.cells.map(c=>water.channelWettedWidthAtCell(c.index));

  const pondAdjacent=watershed.cells.map(c=>{
    const id=watershed.cellBasin[c.index];
    const level=id<0?null:pondLevels[id];
    return level!==null && level>c.height+.004;
  });
  const candidates=watershed.cells.map(c=>
    watershed.channels[c.index] && watershed.downhill[c.index]>=0 &&
    visibleStream(water.runoffLiters(c.index),
      watershed.flowAccumulation[c.index],
      localChannelProximity(c.x,c.z)));
  const selected=selectVisibleRiverLinks(
    watershed.downhill,candidates,watershed.flowAccumulation,n,pondAdjacent);
  const chains=extractChannelChains(
    watershed.downhill,selected,watershed.flowAccumulation);

  // Spatial bins make the continuous river sampler cheap on phones.
  const bins:Segment[][]=Array.from({length:n*n},()=>[]);
  const addSegment=(s:Segment):void=>{
    const range=Math.max(s.wa,s.wb)*.5+.05;
    const c0=clamp(Math.floor((Math.min(s.ax,s.bx)-range+WORLD_HALF)/CELL_SIZE),0,n-1);
    const c1=clamp(Math.floor((Math.max(s.ax,s.bx)+range+WORLD_HALF)/CELL_SIZE),0,n-1);
    const r0=clamp(Math.floor((Math.min(s.az,s.bz)-range+WORLD_HALF)/CELL_SIZE),0,n-1);
    const r1=clamp(Math.floor((Math.max(s.az,s.bz)+range+WORLD_HALF)/CELL_SIZE),0,n-1);
    for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++)
      bins[row*n+col].push(s);
  };
  for(const chain of chains){
    const nodes=chain.map(i=>watershed.cells[i]);
    const widths=smoothChannelProfile(chain.map(i=>wettedWidth[i]),1);
    const levels=chain.map(i=>watershed.cells[i].height+waterStages[i]);
    for(let edge=0;edge<chain.length-1;edge++){
      let previous=channelChainPoint(nodes,edge,0);
      for(let k=1;k<=5;k++){
        const t=k/5,last=(k-1)/5;
        const next=channelChainPoint(nodes,edge,t);
        addSegment({
          ax:previous.x,az:previous.z,bx:next.x,bz:next.z,
          wa:mix(widths[edge],widths[edge+1],last),
          wb:mix(widths[edge],widths[edge+1],t),
          ya:mix(levels[edge],levels[edge+1],last),
          yb:mix(levels[edge],levels[edge+1],t),
        });
        previous=next;
      }
    }
  }
  const samples:WaterSample[]=new Array(stride*stride);
  const resolution=GRID_CELLS*detail;
  for(let row=0;row<=resolution;row++)for(let col=0;col<=resolution;col++){
    const x=-WORLD_HALF+col*CELL_SIZE/detail;
    const z=-WORLD_HALF+row*CELL_SIZE/detail;
    const ground=terrainHeight(x,z);
    const cell=cellIndexAt(x,z);
    const basin=watershed.cellBasin[cell];
    const pond=basin<0?null:pondLevels[basin];
    let level=ground,coverage=0;
    let source:0|1|2|3=0;
    // Pond surfaces are truly horizontal and tied to basin storage.
    if(pond!==null && pond>ground+.001){
      level=pond;coverage=1;source=1;
    }
    // Flood patches are restricted to cells that *contain actual litres*.
    // Feather locally; never smear hydraulic stage into surrounding dry
    // neighbors (the previous approach produced raised rectangular slabs).
    const flood=floodLiters[cell];
    if(flood>.35){
      const center=watershed.cells[cell];
      const dx=Math.abs(x-center.x),dz=Math.abs(z-center.z);
      const cover=smooth((CELL_SIZE*.57-Math.max(dx,dz))/(CELL_SIZE*.19));
      const head=center.height+waterStages[cell];
      if(head>ground+.001&&cover>.10 && (source===0||head>level+.004)){
        level=head;coverage=cover;source=2;
      }
    }
    // Variable-width river links are sampled as a distance field, so two
    // connected sections never draw overlapping transparent quads.
    for(const seg of bins[cell]){
      const dx=seg.bx-seg.ax,dz=seg.bz-seg.az,denom=dx*dx+dz*dz;
      const t=denom>1e-12?clamp(((x-seg.ax)*dx+(z-seg.az)*dz)/denom,0,1):0;
      const distance=Math.hypot(x-mix(seg.ax,seg.bx,t),
        z-mix(seg.az,seg.bz,t));
      const halfWidth=mix(seg.wa,seg.wb,t)*.5;
      if(halfWidth<.015 || distance>=halfWidth+.025)continue;
      const cover=smooth((halfWidth+.025-distance)/.060);
      const head=mix(seg.ya,seg.yb,t);
      if(head<=ground+.001||cover<=.10)continue;
      // At actual confluences, retain the higher physically supported
      // surface; only ONE surface is ever emitted at this sample.
      if(source===0 || (head>level+.004 && cover>=coverage*.65)){
        level=head;coverage=cover;source=3;
      }
    }
    samples[row*stride+col]={x,z,groundY:ground,waterY:level,coverage,source};
  }

  const position:number[]=[];
  const rgba:number[]=[];
  const normal:number[]=[];
  let triangleCount=0,maxHeightStep=0;
  const addTriangle=(a:WaterSample,b:WaterSample,c:WaterSample):void=>{
    const corners=[a,b,c];
    const wet=corners.filter(v=>v.source!==0&&v.coverage>.10&&v.waterY>v.groundY+.001);
    if(wet.length===0)return;
    // Different flood/pond stages may occupy adjacent simulation cells.
    // Do not bridge their level differences with sloped translucent walls.
    const min=Math.min(...wet.map(v=>v.waterY));
    const max=Math.max(...wet.map(v=>v.waterY));
    const span=max-min;
    if(span>.028)return;
    // Shore corners inherit the local wet surface level solely for contour
    // clipping, NOT as a new physical source of water.
    const reference=wet.reduce((sum,v)=>sum+v.waterY,0)/wet.length;
    const prepared=corners.map(v=>({
      x:v.x,z:v.z,groundY:v.groundY,
      waterY:v.source===0?reference:v.waterY,
      coverage:v.source===0?0:v.coverage,
    }));
    for(const tri of clipWaterTriangle(prepared[0],prepared[1],prepared[2])){
      if(!triangleHasVisibleWater(tri))continue;
      // Three.js FrontSide expects negative 2D x/z signed area for +Y.
      const cross=(tri[1].x-tri[0].x)*(tri[2].z-tri[0].z)-
        (tri[1].z-tri[0].z)*(tri[2].x-tri[0].x);
      if(Math.abs(cross)<1e-9)continue;
      const winding=cross>0?[tri[0],tri[2],tri[1]]:tri;
      triangleCount++;
      maxHeightStep=Math.max(maxHeightStep,
        Math.max(...winding.map(v=>v.waterY))-
        Math.min(...winding.map(v=>v.waterY)));
      for(const v of winding){
        const depth=Math.max(0,v.waterY-v.groundY);
        const appearance=waterAppearanceAtDepth(depth);
        const alpha=clamp(appearance.opacity*.88*v.coverage,0,.70);
        const r=mix(SHORE[0],DEEP[0],appearance.depthMix);
        const g=mix(SHORE[1],DEEP[1],appearance.depthMix);
        const b=mix(SHORE[2],DEEP[2],appearance.depthMix);
        position.push(v.x,v.waterY+.008,v.z);
        rgba.push(r,g,b,alpha);
        normal.push(0,1,0);
      }
    }
  };
  for(let row=0;row<resolution;row++)for(let col=0;col<resolution;col++){
    const a=samples[row*stride+col],b=samples[row*stride+col+1];
    const c=samples[(row+1)*stride+col+1],d=samples[(row+1)*stride+col];
    addTriangle(a,b,c);
    addTriangle(a,c,d);
  }
  return {position,rgba,normal,triangleCount,maxHeightStep,
    sampleCount:samples.length};
}
