import {coarseHeightAt,tileHeightAt,type RegionTileCoord} from './regional-terrain.ts';
import {globalSouthM,regionRiverX,valleyFloorM,type PlayableRegionId} from './playable-region-model.ts';
import {treeTrunkAt} from './regional-ecology.ts';

export const CUTWOODS_SEED=31;
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a:number,b:number,v:number)=>{
  const t=clamp((v-a)/(b-a));return t*t*(3-2*t);
};
/** Regional scale geometry and constraints all share metres. */
export const BUILDINGS=[
  {id:'house',x:76,z:90,width:20,depth:15,height:6,doorSide:'south' as const},
  {id:'shed',x:94,z:118,width:14,depth:10,height:4,doorSide:'south' as const},
] as const;
export const SITE_CENTER={x:76,z:105};
export function roadCenterX(z:number):number{
  // Align the road with stable east/west terraces, switching banks at
  // a single intentional crossing near the field station.
  const south=globalSouthM('cutwoods',z);
  const river=regionRiverX(south);
  return river+86*Math.tanh((z-42)/75)+6*Math.sin(z/130);
}
export function roadDistance(x:number,z:number):number{
  return Math.abs(x-roadCenterX(z));
}
export function isOnRoad(x:number,z:number):boolean{
  return roadDistance(x,z)<=4.0;
}
export function riverSurfaceY(z:number):number{
  return valleyFloorM(globalSouthM('cutwoods',z))-.66;
}
export function riverDistance(x:number,z:number):number{
  return Math.abs(x-regionRiverX(globalSouthM('cutwoods',z)));
}
export function riverDepthAt(x:number,z:number):number{
  if(riverDistance(x,z)>12)return 0;
  const land=coarseHeightAt('cutwoods',x,z);
  const level=riverSurfaceY(z);
  // Only the central 12m river corridor is flooded.
  return Math.max(0,level-land);
}
function nearestTile(x:number,z:number):RegionTileCoord{
  return {col:Math.max(0,Math.min(7,Math.floor((x+500)/125))),
    row:Math.max(0,Math.min(7,Math.floor((z+500)/125)))};
}
export function physicalGroundAt(x:number,z:number):number{
  const tile=nearestTile(x,z);
  return tileHeightAt('cutwoods',tile,x,z,true,CUTWOODS_SEED);
}
export function roadYAt(x:number,z:number):number{
  return physicalGroundAt(x,z)+.14;
}
export function siteFoundationY(x:number,z:number):number{
  // A stable physical floor independent of regional mesh LOD.
  return physicalGroundAt(x,z);
}
export function buildingContains(x:number,z:number,margin=0):boolean{
  return BUILDINGS.some(b=>Math.abs(x-b.x)<b.width/2+margin &&
    Math.abs(z-b.z)<b.depth/2+margin);
}
export function buildingWallAt(x:number,z:number):boolean{
  return BUILDINGS.some(b=>{
    const dx=Math.abs(x-b.x),dz=Math.abs(z-b.z);
    if(dx>b.width/2+.3||dz>b.depth/2+.3)return false;
    const wallX=dx>=b.width/2-.5,wallZ=dz>=b.depth/2-.5;
    if(!wallX&&!wallZ)return false;
    // A genuine open passage, not a teleport or UI entrance.
    const door=wallZ&&z>b.z&&Math.abs(x-b.x)<1.5;
    return !door;
  });
}
export function roadCrossingAt(z:number):boolean{
  return Math.abs(z-42)<30;
}
export function deckYAt(x:number,z:number):number|null{
  // Simple raised timber bridge spanning the water where road meets it.
  const d=roadDistance(x,z);
  if(d>4.3||!roadCrossingAt(z))return null;
  const water=riverSurfaceY(z)+1.5;
  const land=physicalGroundAt(x,z)+.22;
  const blend=1-smooth(12,30,Math.abs(z-42));
  return Math.max(land,land+(water-land)*blend);
}
export function standingHeightAt(x:number,z:number):number{
  const deck=deckYAt(x,z);
  if(deck!==null)return deck;
  // Houses have a floor accessible through an open doorway.
  if(buildingContains(x,z))return siteFoundationY(x,z)+.10;
  return physicalGroundAt(x,z);
}
export function terrainSlopeDegrees(x:number,z:number):number{
  const d=.6;
  const dx=(physicalGroundAt(x+d,z)-physicalGroundAt(x-d,z))/(2*d);
  const dz=(physicalGroundAt(x,z+d)-physicalGroundAt(x,z-d))/(2*d);
  return Math.atan(Math.hypot(dx,dz))*180/Math.PI;
}
export type TerrainMoveInfo={
  height:number;slopeDegrees:number;waterDepth:number;onRoad:boolean;
  speedMultiplier:number;passable:boolean;reason:string;
};
export function queryTravel(x:number,z:number):TerrainMoveInfo{
  const slope=terrainSlopeDegrees(x,z);
  const bridge=deckYAt(x,z)!==null;
  const water=bridge?0:riverDepthAt(x,z);
  const road=isOnRoad(x,z);
  const wall=buildingWallAt(x,z);
  const trunk=treeTrunkAt(x,z,.28)!==null;
  const bounded=Math.abs(x)<495&&Math.abs(z)<495;
  const passable=bounded&&!wall&&!trunk&&slope<39&&water<.95;
  const speedMultiplier=clamp((road?1.17:1)*
    (1-.010*Math.max(0,slope-7))*
    (water>.12?1-.5*Math.min(1,water/.95):1),.33,1.17);
  return {height:standingHeightAt(x,z),slopeDegrees:slope,
    waterDepth:water,onRoad:road,speedMultiplier,passable,
    reason:!bounded?'region boundary':wall?'solid wall':trunk?'tree trunk':
      water>=.95?'deep water':slope>=39?'steep slope':'clear'};
}
export function terrainSightClear(a:{x:number;y:number;z:number},
 b:{x:number;y:number;z:number}):boolean{
  const dist=Math.hypot(a.x-b.x,a.z-b.z);
  const samples=Math.max(2,Math.ceil(dist/.6));
  for(let i=1;i<samples;i++){
    const t=i/samples,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    const eye=a.y+(b.y-a.y)*t;
    const tree=treeTrunkAt(x,z,.08);
    if(tree&&eye<physicalGroundAt(tree.x,tree.z)+tree.height*.62)return false;
    if(physicalGroundAt(x,z)>.15+eye||buildingWallAt(x,z)&&
      BUILDINGS.some(site=>Math.abs(x-site.x)<site.width/2+.5&&
        Math.abs(z-site.z)<site.depth/2+.5&&
        eye<siteFoundationY(site.x,site.z)+site.height))return false;
  }
  return true;
}
export function regionRainState(_id:PlayableRegionId,wet:boolean):number{
  // A coarse *scenario* choice, NOT the 10m solver extended 10,000x.
  return wet?1:0;
}
