import * as THREE from 'three';
import type { TerrainWater } from './hydrology';
import {
  GRID_CELLS, CELL_SIZE, WORLD_HALF,
  localChannelProximity, terrainHeight, cellIndexAt,
} from './terrain-model';
import {
  visibleStream, extractChannelChains, smoothChannelProfile, channelChainPoint,
} from './drainage-visual-model';
import { selectVisibleRiverLinks } from './visible-rivers';
import { waterAppearanceAtDepth } from './water-visual-model';
import {
  clipWaterTriangle, submergedDepth, triangleHasVisibleWater,
  type WaterVertex,
} from './water-surface-geometry';

type Point={x:number;z:number};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const smooth=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const shoreTint=new THREE.Color(0x8daaa7);
const deepTint=new THREE.Color(0x638e99);

/**
 * Build 024.1: one lit mesh, but distinct *locally clipped* patches.
 *
 * Build 024 incorrectly connected dry ground-height samples to raised water
 * samples on a 96x96 grid, producing nearly vertical dark terrain-spanning
 * sheets at abrupt water-level changes. These surfaces are now generated only
 * where measured stream, flood or basin water exists. Each local triangle is
 * clipped against the real continuous terrain, with no polygon bridging
 * unrelated water components. All three water stores remain unchanged.
 */
export class HydraulicSurfaceField {
  private readonly mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private lastRebuildMs=Number.NEGATIVE_INFINITY;

  constructor(scene:THREE.Scene){
    this.mesh=new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        vertexColors:true,
        transparent:true,
        opacity:1,
        roughness:.78,
        metalness:0,
        depthTest:true,
        depthWrite:false,
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

    const watershed=water.watershed;
    const pos:number[]=[];
    const rgba:number[]=[];
    const normals:number[]=[];
    const tint=new THREE.Color();
    const pondLevels=watershed.basins.map(b=>water.surfaceLevel(b.id));
    const pondAt=(x:number,z:number):number|null=>{
      const index=cellIndexAt(x,z);
      const basin=watershed.cellBasin[index];
      if(basin<0)return null;
      const level=pondLevels[basin];
      return level!==null && level>terrainHeight(x,z)+.001 ?level:null;
    };
    const makeVertex=(x:number,z:number,level:number,coverage=1):WaterVertex=>({
      x,z,groundY:terrainHeight(x,z),waterY:level,coverage,
    });
    const addTriangle=(a:WaterVertex,b:WaterVertex,c:WaterVertex):void=>{
      for(const triangle of clipWaterTriangle(a,b,c)){
        if(!triangleHasVisibleWater(triangle))continue;
        for(const v of triangle){
          const depth=submergedDepth(v);
          const appearance=waterAppearanceAtDepth(depth);
          // Shorewater must stay recognizably blue-green in direct sunlight;
          // cap translucency so overlapping mouths cannot become black bars.
          tint.copy(shoreTint).lerp(deepTint,appearance.depthMix);
          const alpha=clamp(appearance.opacity*.72,0,.55)*
            clamp(v.coverage,0,1);
          pos.push(v.x,v.waterY+.006,v.z);
          rgba.push(tint.r,tint.g,tint.b,alpha);
          normals.push(0,1,0);
        }
      }
    };
    const addQuad=(a:WaterVertex,b:WaterVertex,c:WaterVertex,d:WaterVertex)=>{
      addTriangle(a,b,c);
      addTriangle(a,c,d);
    };

    // FIRST: volume-solved ponds remain level surfaces. Clip every original
    // terrain triangle directly, not a blurred pond-depth field that spills
    // outside its physically connected basin. Old puddles.ts used this
    // correct approach; retain its shoreline principle in the shared mesh.
    for(const basin of watershed.basins){
      const level=pondLevels[basin.id];
      if(level===null)continue;
      for(const index of basin.cellIndexes){
        const cell=watershed.cells[index];
        if(cell.height>=level-.001)continue;
        const row=Math.floor(index/GRID_CELLS),col=index%GRID_CELLS;
        const x=-WORLD_HALF+col*CELL_SIZE;
        const z=-WORLD_HALF+row*CELL_SIZE;
        const tl=makeVertex(x,z,level);
        const tr=makeVertex(x+CELL_SIZE,z,level);
        const br=makeVertex(x+CELL_SIZE,z+CELL_SIZE,level);
        const bl=makeVertex(x,z+CELL_SIZE,level);
        const cc=makeVertex(cell.x,cell.z,level);
        addTriangle(tl,cc,tr);
        addTriangle(tr,cc,br);
        addTriangle(br,cc,bl);
        addTriangle(bl,cc,tl);
      }
    }

    // SECOND: physically stored overbank floodwater. Do not smooth flood
    // heights into dry neighbors. Such smoothing created raised flood
    // surfaces beyond the water's actual support and huge geometric walls.
    // Small volume thresholds affect *visibility* only, never the ledger.
    const wetFlood=watershed.cells.map(c=>water.floodLiters(c.index)>.35);
    for(const cell of watershed.cells){
      const i=cell.index;
      if(!wetFlood[i])continue;
      const level=cell.height+water.channelStageAtCell(i);
      const pond=pondLevels[watershed.cellBasin[i]]??null;
      if(pond!==null && level<=pond+.006)continue;
      const row=Math.floor(i/GRID_CELLS),col=i%GRID_CELLS;
      const x=-WORLD_HALF+col*CELL_SIZE,z=-WORLD_HALF+row*CELL_SIZE;
      // Four locally clipped triangles per cell: no wet/dry heights are
      // ever stitched across the boundary into a steep vertical wall.
      const tl=makeVertex(x,z,level);
      const tr=makeVertex(x+CELL_SIZE,z,level);
      const br=makeVertex(x+CELL_SIZE,z+CELL_SIZE,level);
      const bl=makeVertex(x,z+CELL_SIZE,level);
      const cc=makeVertex(cell.x,cell.z,level);
      addTriangle(tl,cc,tr);
      addTriangle(tr,cc,br);
      addTriangle(br,cc,bl);
      addTriangle(bl,cc,tl);
    }

    // THIRD: true visible river chains. The simulated network still routes
    // every tiny runoff branch, but LLW-style pruning keeps isolated
    // one-cell teeth out of the visible river. A river width is based on
    // physical channel stage, not a graphic constant-width spline.
    const pondNeighbor=watershed.cells.map(c=>{
      const basin=watershed.cellBasin[c.index];
      const level=basin<0?null:pondLevels[basin];
      return level!==null&&level>c.height+.004;
    });
    const candidates=watershed.cells.map(c=>
      watershed.downhill[c.index]>=0&&
      visibleStream(water.runoffLiters(c.index),
        watershed.flowAccumulation[c.index],
        localChannelProximity(c.x,c.z)));
    const active=selectVisibleRiverLinks(
      watershed.downhill,candidates,watershed.flowAccumulation,
      GRID_CELLS,pondNeighbor);
    const chains=extractChannelChains(
      watershed.downhill,active,watershed.flowAccumulation);
    const lanes=[-1,-.72,-.35,0,.35,.72,1];
    for(const chain of chains){
      const nodes=chain.map(i=>watershed.cells[i]);
      const widths=smoothChannelProfile(
        chain.map(i=>water.channelWettedWidthAtCell(i)),1);
      const levels=chain.map(i=>
        watershed.cells[i].height+water.channelStageAtCell(i));
      let previousSection:WaterVertex[]|null=null;
      for(let segment=0;segment<chain.length-1;segment++){
        for(let sample=0;sample<=5;sample++){
          if(segment>0&&sample===0)continue;
          const t=sample/5;
          const point=channelChainPoint(nodes,segment,t);
          const left=channelChainPoint(nodes,segment,Math.max(0,t-.005));
          const right=channelChainPoint(nodes,segment,Math.min(1,t+.005));
          const dx=right.x-left.x,dz=right.z-left.z;
          const length=Math.hypot(dx,dz)||1;
          const nx=-dz/length,nz=dx/length;
          const width=lerp(widths[segment],widths[segment+1],t);
          const level=lerp(levels[segment],levels[segment+1],t);
          const section=lanes.map(offset=>{
            const x=point.x+offset*width*.5*nx;
            const z=point.z+offset*width*.5*nz;
            const fringe=smooth((1.05-Math.abs(offset))/.30);
            // Under an actual level pond or high water flood cell the
            // already-rendered water body owns the surface. Avoid repeated
            // translucent overlapping sheets at their confluences.
            const submergedPond=pondAt(x,z);
            const support=cellIndexAt(x,z);
            const flooded=wetFlood[support]&&
              water.channelStageAtCell(support)>
                water.channelSection(support).bankHeightM+.004;
            const covered=(submergedPond!==null&&submergedPond>=level-.006)||flooded;
            return makeVertex(x,z,level,covered?0:fringe);
          });
          if(previousSection){
            for(let lane=0;lane<lanes.length-1;lane++){
              addQuad(previousSection[lane],previousSection[lane+1],
                section[lane+1],section[lane]);
            }
          }
          previousSection=section;
        }
      }
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
