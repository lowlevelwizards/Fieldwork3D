import {
  clamp, mainRiverPosition, mainRiverStations,
} from './river-geography.ts';
import { terrainHeight, type TerrainCell } from './terrain-model.ts';
import type { TerrainWater } from './hydrology.ts';

export type RiverScenario='dry'|'normal'|'high'|'flood'|'recession'|'live';
export type RiverMesh={
  position:number[];
  color:number[];
  normal:number[];
  triangles:number;
  maxTriangleHeightM:number;
  stations:number;
  widths:{left:number;right:number}[];
  diagnostics:{waterM:number;bedM:number;widthM:number}[];
};
export const RIVER_SCENARIOS:readonly RiverScenario[]=[
  'dry','normal','high','flood','recession','live',
];
export const RIVER_TEST_LEVELS:Record<Exclude<RiverScenario,'live'>,number>={
  dry:0,normal:.028,high:.061,flood:.145,recession:.033,
};
const SHORE=[.34,.54,.55],DEEP=[.17,.38,.44];

/** River profiles are stable geography. Water supply only moves the fill line. */
export function waterDepthForScenario(
  scenario:RiverScenario,z:number,water?:TerrainWater,
):number{
  if(scenario!=='live')return RIVER_TEST_LEVELS[scenario];
  if(!water)return 0;
  // The current 32x32 watershed remains authoritative for actual stage.
  // Smooth its point values in the *rendering* only, not in the stores.
  const rows=water.watershed.cells;
  let sum=0,weight=0;
  for(let offset=-.45;offset<=.45;offset+=.15){
    const targetZ=clamp(z+offset,-4.84375,4.84375);
    const targetX=mainRiverPosition(targetZ,0).x;
    const nearest=nearestCell(rows,targetX,targetZ);
    const w=Math.max(0,1-Math.abs(offset)/.60);
    sum+=water.channelStageAtCell(nearest.index)*w;
    weight+=w;
  }
  return clamp(weight?sum/weight:0,0,.19);
}
function nearestCell(cells:readonly TerrainCell[],x:number,z:number):TerrainCell{
  // A 32x32 grid is small enough to index by mathematical coordinates.
  const col=clamp(Math.floor((x+5)/.3125),0,31);
  const row=clamp(Math.floor((z+5)/.3125),0,31);
  return cells[row*32+col];
}

/** Find the actual *first* bank contour on each side of the thalweg.
 * Avoid sampling a distant water pocket on the other side of a dry ridge.
 */
export function wettedHalfWidth(
  z:number,waterY:number,side:-1|1,height=terrainHeight,
  maxDistance=1.5,
):number{
  const center=mainRiverPosition(z,0);
  if(waterY<=height(center.x,center.z)+.0005)return 0;
  const steps=80;
  let previous=0;
  for(let i=1;i<=steps;i++){
    const distance=maxDistance*i/steps;
    const p=mainRiverPosition(z,side*distance);
    if(height(p.x,p.z)>=waterY){
      let lo=previous,hi=distance;
      for(let j=0;j<14;j++){
        const mid=(lo+hi)*.5;
        const q=mainRiverPosition(z,side*mid);
        if(height(q.x,q.z)<waterY)lo=mid;
        else hi=mid;
      }
      return (lo+hi)*.5;
    }
    previous=distance;
  }
  return maxDistance;
}

/** Continuous station strip, no grid quads, no conditional skipped faces.
 * The river banks and channel axis share the same analytic landform.
 */
export function buildRiverRibbon(
  scenario:RiverScenario,
  water?:TerrainWater,
  segments=120,across=12,
  height=terrainHeight,
):RiverMesh{
  if(!Number.isInteger(across)||across<4||across>48)
    throw new Error('Invalid river cross-section sampling');
  const stations=mainRiverStations(height,segments);
  const position:number[]=[],color:number[]=[],normal:number[]=[];
  const widths:{left:number;right:number}[]=[];
  const diagnostics:{waterM:number;bedM:number;widthM:number}[]=[];
  type Vertex={x:number;y:number;z:number;alpha:number;depth:number};
  const rings:Vertex[][]=[];
  for(const station of stations){
    const depth=waterDepthForScenario(scenario,station.z,water);
    const waterY=station.bedY+depth;
    // A tributary incision can open a long sideways trough directly
    // through a main-river bank. That trough belongs to a separate branch;
    // it must not form a sudden triangular main-river width spike.
    // Keep ordinary levels in their carved river corridor, while allowing
    // true overbank stages to reach progressively farther low ground.
    const maximumHalfWidth=clamp(.54+Math.max(0,depth-.035)*8.1,.54,1.50);
    const left=wettedHalfWidth(station.z,waterY,-1,height,maximumHalfWidth);
    const right=wettedHalfWidth(station.z,waterY,1,height,maximumHalfWidth);
    widths.push({left,right});
    diagnostics.push({waterM:waterY,bedM:station.bedY,widthM:left+right});
    const ring:Vertex[]=[];
    for(let i=0;i<=across;i++){
      const u=i/across;
      const lateral=-left+(left+right)*u;
      const p=mainRiverPosition(station.z,lateral);
      const ground=height(p.x,p.z);
      const submerged=Math.max(0,waterY-ground);
      // Fade at banks; interior opacity depends on actual submergence.
      const shore=Math.min(1,submerged/.022);
      // If this is a stage-limited overbank edge rather than a literal
      // dry-ground contour, fade it instead of drawing a hard blue wall.
      const fringe=clamp(Math.min(i,across-i)/1.6,0,1);
      ring.push({x:p.x,z:p.z,y:waterY,
        depth:submerged,
        alpha:Math.max(0,Math.min(.81,shore*fringe*.72))});
    }
    rings.push(ring);
  }
  let triangles=0,maxTriangleHeightM=0;
  const add=(a:Vertex,b:Vertex,c:Vertex)=>{
    const xz=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
    if(Math.abs(xz)<1e-10)return;
    const tri=xz<0?[a,b,c]:[a,c,b];
    triangles++;
    maxTriangleHeightM=Math.max(maxTriangleHeightM,
      Math.max(...tri.map(v=>v.y))-Math.min(...tri.map(v=>v.y)));
    for(const v of tri){
      const t=clamp(v.depth/.09,0,1);
      position.push(v.x,v.y+.006,v.z);
      color.push(
        SHORE[0]+(DEEP[0]-SHORE[0])*t,
        SHORE[1]+(DEEP[1]-SHORE[1])*t,
        SHORE[2]+(DEEP[2]-SHORE[2])*t,
        v.alpha);
      normal.push(0,1,0);
    }
  };
  for(let i=0;i<rings.length-1;i++){
    const a=rings[i],b=rings[i+1];
    for(let j=0;j<across;j++){
      if((widths[i].left+widths[i].right+
          widths[i+1].left+widths[i+1].right)<.0002)continue;
      // Shared samples between quads make a watertight spline strip.
      add(a[j],a[j+1],b[j+1]);
      add(a[j],b[j+1],b[j]);
    }
  }
  return {position,color,normal,triangles,maxTriangleHeightM,
    stations:stations.length,widths,diagnostics};
}
