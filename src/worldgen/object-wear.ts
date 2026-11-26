import {type Site} from '../breach-site.ts';
import {seeded} from './seeded-rng.ts';
import type {WearKind} from './environment-wear.ts';
import {fixturePixelSurface} from './pixel-surface-selection.ts';
import {canWear,materialProperties} from './material-properties.ts';
import {effectiveCondition} from './condition-visual.ts';
/** Cosmetic anchors refer to authoritative scene elements by stable index. */
export type ObjectWear={id:string;owner:'door'|'fixture'|'wall';index:number;
 kind:WearKind;u:number;v:number;size:number;opacity:number;
 face?:'front'|'back'};
/** An object's substrate and actual use determine the damage vocabulary.
 * Painted steel can rust and leak, upholstery frays, sink porcelain scales,
 * wood scratches. Unsupported marks never appear on that material.
 */
const preferred:Record<string,readonly WearKind[]>={
 'vehicle-lift':['oil','rust','scratch'],'tool-chest':['scratch','rust'],
 compressor:['oil','grease','rust'],generator:['oil','rust'],
 'commercial-range':['grease','soot','scratch'],stove:['grease','soot','scratch'],
 sink:['mineral','chip','stain'],toilet:['mineral','chip'],
 bathtub:['mineral','chip'],'laundry-machine':['drip','rust'],
 'reception-desk':['scratch','chip'],desk:['scratch','chip'],
 sofa:['fray','stain','scuff'],armchair:['fray','stain'],
 bed:['fray','stain'],chair:['scuff','fray'],
 'office-chair':['fray','scuff'],'exam-bed':['stain','scuff'],
 'tool-rack':['scratch','rust'],'linen-cart':['scuff','scratch'],
 'supply-cart':['scratch','scuff'],'storage-tote':['scuff','fade'],
 'ice-machine':['mineral','rust','scuff'],
 'chest-freezer':['scratch','rust'],'upright-freezer':['scratch','rust'],
 'refrigerated-display':['scuff','scratch'],'dish-rack':['scratch','rust'],
 'utility-sink':['mineral','scuff'],
 rack:['rust','scratch'],shelf:['rust','scratch'],
 pallet:['scratch','chip'],crate:['scratch','chip'],
 fridge:['scratch','rust'],counter:['scratch','chip']
};
export function fixtureWearEffect(fixture:string,selection=0):WearKind{
 const surface=fixturePixelSurface(fixture);
 const substrate=materialProperties(surface).substrate;
 const defaults:Record<string,readonly WearKind[]>={
  steel:['scratch','rust','scuff'],wood:['scratch','chip','scuff'],
  ceramic:['mineral','chip','stain'],textile:['fray','stain','scuff'],
  plastic:['scuff','fade'],mineral:['scratch','chip'],
  organic:['abrade','stain']
 };
 const available=[...(preferred[fixture]??[]),...(defaults[substrate]??['scuff'])]
  .filter(kind=>canWear(surface,kind));
 if(!available.length)return 'scuff';
 return available[Math.min(available.length-1,
  Math.floor(Math.max(0,Math.min(.99999,selection))*available.length))];
}

export function planObjectWear(site:Site):ObjectWear[]{
 const continuous=site.conditionLevel!==undefined,t=effectiveCondition(site)/100;
 if(continuous?t<.08:site.condition==='occupied')return [];
 const max=continuous?Math.min(38,Math.round((site.cover.length+site.doors.length)*.48*t)):
   site.condition==='busy'?6:site.condition==='neglected'?14:10;
 const marks:ObjectWear[]=[];
 // Independent streams keep the same object's placement and wear kind
 // stable as the condition slider admits other objects into the budget.
 const candidates:{mark:ObjectWear;gate:number;order:number}[]=[];
 const candidate=(owner:ObjectWear['owner'],index:number,kind:WearKind,rng:()=>number,gate:number)=>{
  const base=(kind==='rust'||kind==='oil'||kind==='drip')?.68:kind==='fray'?.7:.25;
  const u=.16+rng()*.68,v=base+rng()*(.97-base),size=6+rng()*11;
  candidates.push({gate,order:rng(),mark:{id:owner+':'+index,owner,index,kind,u,v,
   size:size*(continuous?.72+.28*t:1),opacity:continuous?.16+.40*t:site.condition==='neglected'?.34:.24}});
 };
 site.cover.forEach((o,i)=>{
  if(!o.fixture||o.destroyed||o.toppled)return;
  const rng=seeded(site.seed^0x6af1852^Math.imul(i+1,7919)),gate=rng();
  const s=fixturePixelSurface(o.fixture),effect=fixtureWearEffect(o.fixture,rng());
  if(canWear(s,effect))candidate('fixture',i,effect,rng,gate);
 });
 site.doors.forEach((d,i)=>{
  const rng=seeded(site.seed^0x1357bcd^Math.imul(i+1,7919)),gate=rng();
  candidate('door',i,d.style==='wood'?'scrape':'scuff',rng,gate);
 });
 site.walls.forEach((_,i)=>{
  const rng=seeded(site.seed^0x5b3141a^Math.imul(i+1,7919)),gate=rng();
  candidate('wall',i,'scuff',rng,gate);
 });
 // Fixed rank plus monotone admission. Fixtures lead the decorative
 // budget, as before; no site geometry or simulation changes.
 candidates.sort((a,b)=>a.order-b.order||a.mark.id.localeCompare(b.mark.id));
 for(const {mark,gate} of candidates){
  if(marks.length>=max)break;
  const limit=mark.owner==='fixture'?(continuous?.9*t+.08:.42):
    mark.owner==='door'?(continuous?.08+.75*t:.5):(continuous?.02+.35*t:.13);
  if(gate<=limit)marks.push(mark);
 }
 return marks;
}
