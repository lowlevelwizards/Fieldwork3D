import * as THREE from 'three';
import type { TerrainWater } from './hydrology';
import {
  CELL_SIZE, GRID_CELLS, WORLD_HALF, localChannelProximity, terrainHeight,
} from './terrain-model';
import { floodDisplayDepth, sampleDisplayMoisture } from './terrain-display-model';
import {
  visibleStream, streamWidth, floodOpacity, extractChannelChains,
  smoothChannelProfile, channelChainPoint,
} from './drainage-visual-model';

/**
 * Build 023 — visual continuity independent of the 32×32 water simulation.
 *
 * Stream paths are traced as one connected ribbon per primary river/branch,
 * preserving physical downstream routing while sharing sampled width, color,
 * depth and opacity between grid links. River forks meet at their real graph
 * junctions. Sheet runoff remains visible in damp earth, not as blue lines.
 *
 * Flood rendering samples a finer, elevation-guided surface field; it never
 * transfers water between cells or manufactures additional litres.
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
    const now=performance.now();
    // Dynamic water is slow; this limit also avoids heavy mesh regeneration
    // on mobile while the physical solver continues at its own cadence.
    if(!force && now-this.lastRebuildMs<160)return;
    this.lastRebuildMs=now;
    const {watershed}=water;
    const positions:number[]=[];
    const colors:number[]=[];
    const normals:number[]=[];
    const floodPositions:number[]=[];
    const floodColors:number[]=[];
    const floodNormals:number[]=[];

    type RibbonVertex={x:number;z:number;h:number;alpha:number};
    const appendVertex=(
      pos:number[],rgb:number[],norm:number[],
      vertex:RibbonVertex,tint:THREE.Color,
    )=>{
      const x=Math.max(-WORLD_HALF,Math.min(WORLD_HALF,vertex.x));
      const z=Math.max(-WORLD_HALF,Math.min(WORLD_HALF,vertex.z));
      pos.push(x,terrainHeight(x,z)+.006+Math.max(0,vertex.h),z);
      rgb.push(tint.r,tint.g,tint.b,
        Math.max(0,Math.min(.95,vertex.alpha)));
      // Thin water films reflect ambient sunlight as a surface rather
      // than inheriting every jagged ground triangle's normal.
      norm.push(0,1,0);
    };
    const appendQuad=(
      pos:number[],rgb:number[],norm:number[],
      a:RibbonVertex,b:RibbonVertex,c:RibbonVertex,d:RibbonVertex,
      tint:THREE.Color,
    )=>{
      for(const v of [a,b,c,a,c,d])appendVertex(pos,rgb,norm,v,tint);
    };

    const active=watershed.cells.map(cell=>{
      const index=cell.index;
      if(watershed.downhill[index]<0)return false;
      return visibleStream(
        water.runoffLiters(index),watershed.flowAccumulation[index],
        localChannelProximity(cell.x,cell.z));
    });
    const chains=extractChannelChains(
      watershed.downhill,active,watershed.flowAccumulation);
    const lane=[-1,-.76,-.44,0,.44,.76,1];
    const laneOpacity=[0,.18,.82,1,.82,.18,0];
    const smoothstep=(t:number)=>t*t*(3-2*t);

    // Every active graph link is rendered exactly once. Previously, its
    // start/end ribbon shapes were generated separately, causing width
    // discontinuities and tiny stitched gaps at every cell boundary.
    for(const chain of chains){
      const path=chain.map(i=>watershed.cells[i]);
      const rawWidth=chain.map((i,k)=>{
        const lit=water.runoffLiters(i);
        const last=k===chain.length-1;
        const incoming=last?water.runoffLiters(chain[k-1]):lit;
        return streamWidth(
          Math.max(lit,last?incoming*.6:0),
          watershed.flowAccumulation[i]);
      });
      const width=smoothChannelProfile(rawWidth,2);
      const depth=smoothChannelProfile(chain.map(i=>
        Math.min(.043,water.waterDepthAtCell(i)*.32)),2);
      const opacity=smoothChannelProfile(chain.map(i=>
        Math.min(.88,.60+.066*Math.log1p(water.runoffLiters(i)))),2);
      let prior:RibbonVertex[]|null=null;
      for(let seg=0;seg<chain.length-1;seg++){
        // Five subsegments per actual cell are enough to hide the routed
        // grid without tessellating an elaborate tube on a phone GPU.
        for(let step=0;step<=5;step++){
          if(seg>0&&step===0)continue;
          const t=step/5;
          const eased=smoothstep(t);
          const p=channelChainPoint(path,seg,t);
          const before=channelChainPoint(path,seg,Math.max(0,t-.008));
          const after=channelChainPoint(path,seg,Math.min(1,t+.008));
          const length=Math.hypot(after.x-before.x,after.z-before.z)||1;
          const tangentX=-(after.z-before.z)/length;
          const tangentZ=(after.x-before.x)/length;
          const localWidth=width[seg]+(width[seg+1]-width[seg])*eased;
          const localDepth=depth[seg]+(depth[seg+1]-depth[seg])*eased;
          let localAlpha=opacity[seg]+(opacity[seg+1]-opacity[seg])*eased;
          // Water emerges gradually at a genuinely dry headwater. Do not
          // fade at confluences: the next shared downstream path stays wet.
          const firstSection=seg===0&&step===0;
          const lastSection=seg===chain.length-2&&step===5;
          if(firstSection&&!active[chain[0]])localAlpha*=.35;
          if(lastSection&&!active[chain[chain.length-1]])localAlpha*=.33;
          const section:RibbonVertex[]=lane.map((offset,k)=>({
            x:p.x+tangentX*localWidth*offset,
            z:p.z+tangentZ*localWidth*offset,
            h:localDepth*(1-.32*Math.abs(offset)),
            alpha:localAlpha*laneOpacity[k],
          }));
          if(prior){
            for(let k=0;k<lane.length-1;k++){
              appendQuad(positions,colors,normals,
                prior[k],prior[k+1],section[k+1],section[k],this.streamTint);
            }
          }
          prior=section;
        }
      }
    }

    // Smooth physical flood depths, guided by unchanged measured elevations,
    // then sample the DISPLAY field at 3× grid resolution. Shared vertices
    // give adjoining wetland cells an identical color/alpha/height. The
    // visual interpolation is not an additional volume of water.
    const n=GRID_CELLS;
    const depthField=new Float32Array(n*n);
    const heights=new Float32Array(n*n);
    for(let i=0;i<depthField.length;i++){
      depthField[i]=Math.max(0,water.floodLiters(i))/
        (1000*CELL_SIZE*CELL_SIZE);
      heights[i]=watershed.cells[i].height;
    }
    const displayDepth=floodDisplayDepth(depthField,heights,n);
    const resolution=n*3;
    const stride=resolution+1;
    const sampled:RibbonVertex[]=new Array(stride*stride);
    for(let r=0;r<=resolution;r++)for(let c=0;c<=resolution;c++){
      const x=-WORLD_HALF+2*WORLD_HALF*c/resolution;
      const z=-WORLD_HALF+2*WORLD_HALF*r/resolution;
      const depth=sampleDisplayMoisture(displayDepth,x,z,n);
      sampled[r*stride+c]={
        x,z,
        h:Math.min(.075,depth*.36),
        alpha:floodOpacity(depth),
      };
    }
    for(let r=0;r<resolution;r++)for(let c=0;c<resolution;c++){
      const a=sampled[r*stride+c],b=sampled[r*stride+c+1];
      const d=sampled[(r+1)*stride+c],e=sampled[(r+1)*stride+c+1];
      if(Math.max(a.alpha,b.alpha,d.alpha,e.alpha)<.006)continue;
      appendQuad(floodPositions,floodColors,floodNormals,
        a,b,e,d,this.floodTint);
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
