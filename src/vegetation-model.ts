import { groundCoverAt } from './ground-cover-model.ts';
import { terrainHeight, valleyAxisX, WORLD_HALF } from './terrain-model.ts';

/**
 * Build 031: established woody vegetation, never a per-frame growth system.
 * Ported principles from LLW Browser: habitat -> woodland matrix -> trees
 * -> canopy/open sky/woodland edge -> shrubs.
 *
 * All distances are *metres* on Fieldwork's 10x10 m physical section;
 * LLW's normalized 2D cell thresholds do not transfer directly.
 */
export type WoodyKind='tree'|'shrub';
export type WoodyPlant={
  id:number;kind:WoodyKind;x:number;z:number;y:number;
  scale:number;angle:number;variation:number;
  trunkRadius:number;canopyRadius:number;height:number;
  suitability:number;
};
export type WoodyHabitat={
  moisture:number;elevationM:number;slopeDegrees:number;fertility:number;
  drainage:number;woodland:number;tree:number;
};
export type ShrubHabitat=WoodyHabitat&{
  canopy:number;shade:number;edge:number;shrub:number;
};
export type WoodyLandscape={seed:number;trees:WoodyPlant[];shrubs:WoodyPlant[]};
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a:number,b:number,v:number)=>{
  const t=clamp((v-a)/(b-a));return t*t*(3-2*t);
};
const bell=(v:number,ideal:number,left:number,right:number)=>
  smooth(0,1,1-clamp(Math.abs(v-ideal)/(v<ideal?left:right)));
function mixHash(n:number):number{
  let x=Math.imul(n|0,0x7feb352d)|0;
  x^=x>>>15;x=Math.imul(x,0x846ca68b)|0;x^=x>>>16;
  return (x>>>0)/4294967296;
}
export function seededPlantValue(seed:number,index:number,salt=0):number{
  return mixHash(Math.imul(seed+104729,1013)+Math.imul(index+61,7919)+salt*53);
}
function broadWoodlandAt(x:number,z:number,seed:number):number{
  // Two broad seeded woodland masses with smooth edges and open gaps.
  // A seeded spatial prior shapes *where* a small stand forms; local
  // moisture, soil and elevation still have veto authority.
  const a={x:-1.9+(seededPlantValue(seed,1)-.5)*2.4,
    z:-1.7+(seededPlantValue(seed,2)-.5)*2.6};
  const b={x:2.0+(seededPlantValue(seed,3)-.5)*2.4,
    z:1.4+(seededPlantValue(seed,4)-.5)*2.6};
  const bump=(p:{x:number;z:number},rad:number)=>
    Math.exp(-((x-p.x)**2+(z-p.z)**2)/(rad*rad));
  return clamp(.14+.75*Math.max(bump(a,2.75),bump(b,2.4))+
    .1*Math.sin(x*.77+z*.44+seed*.031));
}
/** Long-term suitability, independent of current rain or river level. */
export function woodyHabitatAt(x:number,z:number,seed=31):WoodyHabitat{
  const ground=groundCoverAt(x,z);
  const valley=terrainHeight(valleyAxisX(z),z);
  const elevationM=Math.max(0,terrainHeight(x,z)-valley);
  const moisture=ground.longTermMoisture;
  const fertile=clamp((ground.fertility-.17)/.75);
  const slope=smooth(27,7,ground.slope); // inverse slope allowance
  const drainage=1-smooth(.45,.89,ground.channelExposure);
  const excessWet=1-.75*smooth(.72,.93,moisture);
  const treeMoisture=bell(moisture,.48,.36,.42);
  const heightPref=.47+.53*bell(elevationM,.23,.30,.50);
  const woodland=broadWoodlandAt(x,z,seed);
  const tree=clamp(treeMoisture*fertile*(.35+.65*slope)*
    drainage*excessWet*heightPref*(.20+.80*woodland));
  return {moisture,elevationM,slopeDegrees:ground.slope,
    fertility:ground.fertility,drainage,woodland,tree};
}
/** Tree canopies contribute to actual open sky; multiple crowns combine
 * without ever exceeding full coverage. */
export function canopyAt(x:number,z:number,trees:readonly WoodyPlant[]):number{
  let openSky=1;
  for(const tree of trees){
    const d=Math.hypot(x-tree.x,z-tree.z);
    const contribution=.94*(1-smooth(tree.canopyRadius*.33,
      tree.canopyRadius*1.27,d));
    openSky*=1-clamp(contribution);
  }
  return clamp(1-openSky);
}
export function shrubHabitatAt(x:number,z:number,trees:readonly WoodyPlant[],seed=31):ShrubHabitat{
  const h=woodyHabitatAt(x,z,seed);
  const canopy=canopyAt(x,z,trees);
  // Smooth local canopy difference approximates LLW's woodland-edge field,
  // without binding foliage to the hydrology's square cell grid.
  const d=.40;
  const perimeter=Math.max(
    canopyAt(x+d,z,trees),canopyAt(x-d,z,trees),
    canopyAt(x,z+d,trees),canopyAt(x,z-d,trees));
  const edge=clamp((perimeter-canopy)*1.5+
    canopy*(1-canopy)*2.6);
  const openness=1-canopy;
  const moisturePref=bell(h.moisture,.50,.40,.39);
  const exposurePref=.25+.75*bell(openness,.65,.60,.45);
  const slopePref=1-.55*smooth(11,30,h.slopeDegrees);
  // Genuinely open ground still supports some shrubs. Edges increase the
  // odds, but the woodland algorithm isn't allowed to ban isolated brush.
  const shrub=clamp(moisturePref*(.18+.82*clamp(h.fertility))*
    h.drainage*slopePref*exposurePref*(.45+.55*edge)*
    (.45+.55*h.woodland));
  return {...h,canopy,shade:canopy,edge,shrub};
}
const inside=(x:number,z:number,radius:number)=>
  Math.abs(x)<=WORLD_HALF-radius&&Math.abs(z)<=WORLD_HALF-radius;
function candidateAt(i:number,seed:number,spacing:number){
  // Jittered candidates in a world-space grid; same seed = same exact
  // positions regardless of frame rate, weather or iteration order.
  const across=Math.ceil((WORLD_HALF*2)/spacing);
  const row=Math.floor(i/across),col=i%across;
  return {
    x:-WORLD_HALF+(col+.20+.60*seededPlantValue(seed,i,13))*spacing,
    z:-WORLD_HALF+(row+.20+.60*seededPlantValue(seed,i,17))*spacing,
  };
}
export function establishWoodyVegetation(seed=31):WoodyLandscape{
  if(!Number.isSafeInteger(seed))throw new Error('Vegetation seed must be an integer');
  const trees:WoodyPlant[]=[];
  const spacing=.49,across=Math.ceil(10/spacing);
  const candidates=Array.from({length:across*across},(_,i)=>{
    const p=candidateAt(i,seed,spacing);
    const habitat=woodyHabitatAt(p.x,p.z,seed);
    return {i,p,habitat,roll:seededPlantValue(seed,i,47)};
  }).filter(c=>inside(c.p.x,c.p.z,.75)&&c.habitat.tree>.25)
    .sort((a,b)=>{
      // A high-quality site is more likely, but random rank prevents
      // all trees from ending up at the exact maxima.
      const aScore=a.habitat.tree*(.58+.42*a.roll);
      const bScore=b.habitat.tree*(.58+.42*b.roll);
      return bScore-aScore||a.i-b.i;
    });
  for(const c of candidates){
    if(trees.length>=6)break;
    const value=seededPlantValue(seed,c.i,51);
    if(c.habitat.tree<.30||value>.85*c.habitat.tree+.19)continue;
    const scale=.83+seededPlantValue(seed,c.i,59)*.33;
    const crown=.62*scale;
    if(trees.some(t=>Math.hypot(t.x-c.p.x,t.z-c.p.z)<
      Math.max(1.14,(t.canopyRadius+crown)*.77)))continue;
    trees.push({id:c.i,kind:'tree',x:c.p.x,z:c.p.z,
      y:terrainHeight(c.p.x,c.p.z),scale,
      angle:seededPlantValue(seed,c.i,61)*Math.PI*2,
      variation:seededPlantValue(seed,c.i,67),
      trunkRadius:.065*scale,canopyRadius:crown,
      height:1.55*scale,suitability:c.habitat.tree});
  }
  // Shrubs are evaluated after actual trees, so the understory is genuinely
  // responding to those crowns instead of a decorative woodland texture.
  const shrubs:WoodyPlant[]=[];
  const bushSpacing=.31,bushAcross=Math.ceil(10/bushSpacing);
  const shrubCandidates=Array.from({length:bushAcross*bushAcross},(_,i)=>{
    const p=candidateAt(i,seed+137,bushSpacing);
    const habitat=shrubHabitatAt(p.x,p.z,trees,seed);
    const roll=seededPlantValue(seed,i,71);
    return {i,p,habitat,roll};
  }).filter(c=>inside(c.p.x,c.p.z,.37)&&c.habitat.shrub>.22)
    .sort((a,b)=>b.habitat.shrub*(.55+.45*b.roll)-
      a.habitat.shrub*(.55+.45*a.roll)||a.i-b.i);
  for(const c of shrubCandidates){
    if(shrubs.length>=16)break;
    if(c.roll>.95*c.habitat.shrub+.13)continue;
    const scale=.79+seededPlantValue(seed,c.i,79)*.43;
    const crown=.235*scale;
    if(trees.some(t=>Math.hypot(c.p.x-t.x,c.p.z-t.z)<t.trunkRadius+crown+.10))
      continue;
    if(shrubs.some(b=>Math.hypot(c.p.x-b.x,c.p.z-b.z)<
      crown+b.canopyRadius+.035))continue;
    shrubs.push({id:c.i,kind:'shrub',x:c.p.x,z:c.p.z,
      y:terrainHeight(c.p.x,c.p.z),scale,
      angle:seededPlantValue(seed,c.i,83)*Math.PI*2,
      variation:seededPlantValue(seed,c.i,89),
      trunkRadius:.024*scale,canopyRadius:crown,
      height:.42*scale,suitability:c.habitat.shrub});
  }
  return {seed,trees,shrubs};
}
/** A physical obstruction shape, not yet connected to combat or navigation. */
export function woodyFootprintAt(x:number,z:number,world:WoodyLandscape):WoodyPlant|null{
  return [...world.trees,...world.shrubs].find(p=>
    Math.hypot(x-p.x,z-p.z)<=p.trunkRadius)??null;
}
