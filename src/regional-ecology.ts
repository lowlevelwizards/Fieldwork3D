import {coarseHeightAt} from './regional-terrain.ts';
import {globalSouthM,regionRiverX} from './playable-region-model.ts';
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
function random(seed:number):number{
  let v=Math.imul(seed^0x6d2b79f5,0x85ebca6b);
  v^=v>>>13;v=Math.imul(v,0xc2b2ae35);v^=v>>>16;
  return (v>>>0)/4294967296;
}
export type RegionalPlant={id:number;x:number;z:number;
  height:number;crown:number;kind:'tree'|'shrub'};
export function regionalPlantSuitability(x:number,z:number):number{
  const h=coarseHeightAt('cutwoods',x,z);
  const river=regionRiverX(globalSouthM('cutwoods',z));
  const valley=coarseHeightAt('cutwoods',river,z);
  const relative=Math.max(0,h-valley);
  const dx=(coarseHeightAt('cutwoods',x+3,z)-
    coarseHeightAt('cutwoods',x-3,z))/6;
  const dz=(coarseHeightAt('cutwoods',x,z+3)-
    coarseHeightAt('cutwoods',x,z-3))/6;
  const slope=Math.hypot(dx,dz);
  const wetness=.75*Math.exp(-relative/130)+.15;
  const drainage=clamp((Math.abs(x-river)-14)/25);
  const tolerant=clamp(1-slope/1.05);
  const meadow=(.63+.37*Math.sin(x/80+z/125)*Math.sin(z/90-x/71));
  return clamp(wetness*drainage*tolerant*meadow);
}
/** Stable region-level habitat distribution. Instances are realized only
 * around the viewer, not spread into a multi-million object world. */
export function establishRegionalPlants():RegionalPlant[]{
  const output:RegionalPlant[]=[];
  let id=0;
  for(let j=0;j<46;j++)for(let i=0;i<46;i++){
    const n=j*46+i;
    const x=-493+(i+.15+.72*random(n*61+9))*21.4;
    const z=-493+(j+.15+.72*random(n*43+18))*21.4;
    if(Math.abs(x)>490||Math.abs(z)>490)continue;
    const south=globalSouthM('cutwoods',z);
    const river=regionRiverX(south);
    const road=river+86*Math.tanh((z-42)/75)+6*Math.sin(z/130);
    const fromRoad=Math.abs(x-road);
    if(fromRoad<9||Math.abs(x-river)<17)continue;
    if(x>114&&x<171&&z>68&&z<134)continue;
    const quality=regionalPlantSuitability(x,z);
    const broad=.60+.40*Math.sin(x/99+z/87)*Math.cos(z/73);
    if(random(n*331+7)>quality*broad*.87)continue;
    const kind=random(n*13+2)<.70?'tree':'shrub';
    const variation=random(n*17+4);
    output.push({id:id++,x,z,kind,
      height:kind==='tree'?5.6+variation*3.8:1.0+variation*.65,
      crown:kind==='tree'?2.2+variation*1.15:.7+variation*.28});
  }
  return output;
}
export function plantsNear(plants:readonly RegionalPlant[],x:number,z:number,
  radius=145):RegionalPlant[]{
  const squared=radius*radius;
  return plants.filter(p=>(p.x-x)**2+(p.z-z)**2<squared);
}

/** Cheap fixed spatial index for woody trunks. It uses the identical
 * seeded placement consumed by the nearby visual instances. */
let treeCells:Map<string,RegionalPlant[]>|null=null;
const cellKey=(x:number,z:number)=>Math.floor(x/8)+','+Math.floor(z/8);
function indexedTrees():Map<string,RegionalPlant[]>{
  if(treeCells)return treeCells;
  const cells=new Map<string,RegionalPlant[]>();
  for(const tree of establishRegionalPlants()){
    if(tree.kind!=='tree')continue;
    const key=cellKey(tree.x,tree.z);
    const bucket=cells.get(key)??[];
    bucket.push(tree);cells.set(key,bucket);
  }
  treeCells=cells;return cells;
}
export function treeTrunkAt(x:number,z:number,margin=0):RegionalPlant|null{
  const cells=indexedTrees();
  const col=Math.floor(x/8),row=Math.floor(z/8);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    const bucket=cells.get((col+dx)+','+(row+dz));
    if(!bucket)continue;
    for(const tree of bucket){
      const trunk=.15+tree.height*.014+margin;
      if(Math.hypot(tree.x-x,tree.z-z)<trunk)return tree;
    }
  }
  return null;
}
