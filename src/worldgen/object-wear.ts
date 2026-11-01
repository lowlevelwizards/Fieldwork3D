import {seeded,type Site} from '../breach-site.ts';
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
 const rng=seeded(site.seed^0x6af1852);
 const max=continuous?Math.min(38,Math.round((site.cover.length+site.doors.length)*.48*t)):
   site.condition==='busy'?6:site.condition==='neglected'?14:10;
 const marks:ObjectWear[]=[];
 const add=(owner:ObjectWear['owner'],index:number,kind:WearKind)=>{
  if(marks.length>=max||marks.some(m=>m.owner===owner&&m.index===index))return;
  const base=(kind==='rust'||kind==='oil'||kind==='drip') ? .68 :
   kind==='fray' ? .7 : .25;
  marks.push({id:owner+':'+index,owner,index,kind,
    u:.16+rng()*.68,v:base+rng()*(.97-base),size:6+rng()*11,
    opacity:continuous?.16+.40*t:site.condition==='neglected'?.34:.24});
 };
 site.cover.forEach((o,i)=>{
  if(!o.fixture||rng()>(continuous?.9*t+.08:.42))return;
  const s=fixturePixelSurface(o.fixture);
  const effect=fixtureWearEffect(o.fixture,rng());
  if(canWear(s,effect))add('fixture',i,effect);
 });
 site.doors.forEach((d,i)=>{if(rng()<(continuous?.08+.75*t:.5))
   add('door',i,d.style==='wood'?'scrape':'scuff');});
 site.walls.forEach((_,i)=>{if(rng()<(continuous?.02+.35*t:.13))add('wall',i,'scuff');});
 return marks;
}
