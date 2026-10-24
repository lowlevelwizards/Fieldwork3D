import { cellIndexAt,localChannelProximity, WORLD_HALF } from './terrain-model.ts';
import { surfaceAt } from './surface-materials.ts';
import { slopeAt } from './traffic-model.ts';

/** Static vegetation establishment is deterministic geography, not a
 * simulation tick. Mature plants do not pop in/out when it rains.
 * Live water affects leaf health/tint; persistent flooding can later drive
 * longer-term vegetation succession when seasons are implemented.
 */
export type PlantKind='grass'|'reed'|'shrub'|'tree';
export type Plant={kind:PlantKind;x:number;z:number;size:number;angle:number;id:number;
  cover:number;rootWetness:number};
export type EcologicalContext={soilFraction(index:number):number;waterDepthAtCell(index:number):number};
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function seeded01(n:number):number{
  let x=Math.imul(n+0x6d2b79f5,0x85ebca6b)|0;
  x^=x>>>13;x=Math.imul(x,0xc2b2ae35);x^=x>>>16;
  return (x>>>0)/4294967296;
}
const bell=(v:number,target:number,range:number)=>Math.exp(-Math.pow((v-target)/range,2));
export type Habitat={moisture:number;slope:number;standing:number;soil:string;grass:number;reed:number;shrub:number;tree:number};
export function habitatAt(x:number,z:number,ctx?:EcologicalContext):Habitat{
  const soil=surfaceAt(x,z).kind,channel=localChannelProximity(x,z);
  const cell=cellIndexAt(x,z);
  // Terrain hydrology is measured; drainage proximity describes long-term
  // floodplain habitat even when the weather happens to be dry.
  const presentWet=ctx?.soilFraction(cell)??.45;
  const standing=ctx?.waterDepthAtCell(cell)??0;
  const moisture=clamp(.28+channel*.45+presentWet*.25+
    .10*Math.sin(z*.6-x*.42),0,1);
  const slope=clamp(slopeAt(x,z)/35);
  const rock=soil==='rock'?1:0;
  const organic=soil==='organic'?1:0;
  const wetMud=clamp((moisture-.72)/.22)*(.30+.70*organic);
  const inundation=clamp(standing/.10);
  const grass=clamp(.14+.76*bell(moisture,.53,.33)-.55*slope-.55*rock-
    .62*wetMud-.85*inundation);
  const reed=clamp(.86*bell(moisture,.86,.17)*(1-.4*slope)*
    (1-.15*organic)-.8*inundation);
  const shrub=clamp(.65*bell(moisture,.52,.28)*(1-.7*slope)*
    (1-.7*wetMud)-.85*inundation-.5*rock);
  const tree=clamp(.75*bell(moisture,.56,.25)*(1-.83*slope)*
    (1-.85*wetMud)-.9*inundation-.8*rock);
  return {moisture,slope,standing,soil,grass,reed,shrub,tree};
}

/** Distribute anchored plants with stable per-candidate hashes; no runtime
 * Math.random, visual clumps, or reshuffling when clouds change.
 */
export function establishVegetation(seed=2601,ctx?:EcologicalContext):Plant[]{
  const plants:Plant[]=[];
  const occupied:{x:number;z:number}[]=[];
  const emit=(kind:PlantKind,x:number,z:number,id:number,habitat:Habitat)=>{
    const size=.65+.68*seeded01(id+seed*5);
    const cover=kind==='tree'?.76:kind==='shrub'?.47:kind==='reed'?.16:.08;
    plants.push({kind,x,z,size,angle:seeded01(id+397)*Math.PI*2,id,
      cover,rootWetness:habitat.moisture});
    if(kind==='tree'||kind==='shrub')occupied.push({x,z});
  };
  // Dominant upright forms first: keep a little room around canopies.
  for(const [kind,count,threshold,spacing] of [
    ['tree',160,.47,.55],
    ['shrub',280,.36,.27],
    ['reed',350,.45,.08],
    ['grass',1100,.30,.035],
  ] as const){
    for(let i=0;i<count;i++){
      const id=i+count*(kind==='tree'?1:kind==='shrub'?2:kind==='reed'?3:4);
      const x=-WORLD_HALF+.22+seeded01(seed*17+id*11)*9.56;
      const z=-WORLD_HALF+.22+seeded01(seed*23+id*17)*9.56;
      const habitat=habitatAt(x,z,ctx);
      const suitability=habitat[kind];
      if(suitability<threshold||
        seeded01(seed*41+id*13)>suitability*.74)continue;
      const tooClose=occupied.some(p=>Math.hypot(p.x-x,p.z-z)<spacing);
      if(tooClose)continue;
      emit(kind,x,z,id,habitat);
    }
  }
  return plants;
}

/** Reusable tactical semantic; foliage will eventually participate in LOS. */
export function concealmentAt(x:number,z:number,plants:readonly Plant[],radius=.45):number{
  let accumulation=0;
  for(const plant of plants){
    const distance=Math.hypot(x-plant.x,z-plant.z);
    const reach=plant.kind==='tree'?.52:plant.kind==='shrub'?.29:plant.kind==='reed'?.18:.09;
    if(distance<reach+radius)
      accumulation+=plant.cover*clamp(1-distance/(reach+radius));
  }
  return clamp(1-Math.exp(-accumulation));
}
