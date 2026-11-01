import {seeded,type Site} from '../breach-site.ts';
import type {WearKind} from './environment-wear.ts';
import {fixturePixelSurface} from './pixel-surface-selection.ts';
import {canWear} from './material-properties.ts';
import {effectiveCondition} from './condition-visual.ts';
/** Cosmetic anchors refer to authoritative scene elements by stable index. */
export type ObjectWear={id:string;owner:'door'|'fixture'|'wall';index:number;
 kind:WearKind;u:number;v:number;size:number;opacity:number;
 face?:'front'|'back'};
export function planObjectWear(site:Site):ObjectWear[]{
 const continuous=site.conditionLevel!==undefined,t=effectiveCondition(site)/100;
 if(continuous?t<.08:site.condition==='occupied')return [];
 const rng=seeded(site.seed^0x6af1852);
 const max=continuous?Math.min(38,Math.round((site.cover.length+site.doors.length)*.48*t)):
   site.condition==='busy'?6:site.condition==='neglected'?14:10;
 const marks:ObjectWear[]=[];
 const add=(owner:ObjectWear['owner'],index:number,kind:WearKind)=>{
  if(marks.length>=max||marks.some(m=>m.owner===owner&&m.index===index))return;
  marks.push({id:owner+':'+index,owner,index,kind,
    u:.25+rng()*.5,v:.2+rng()*.6,size:5+rng()*9,
    opacity:continuous?.15+.32*t:.22});
 };
 site.cover.forEach((o,i)=>{
  if(!o.fixture||rng()>(continuous?.9*t+.08:.42))return;
  const s=fixturePixelSurface(o.fixture);
  if(canWear(s,'scuff'))add('fixture',i,'scuff');
 });
 site.doors.forEach((d,i)=>{if(rng()<(continuous?.08+.75*t:.5))
   add('door',i,d.style==='wood'?'scrape':'scuff');});
 site.walls.forEach((_,i)=>{if(rng()<(continuous?.02+.35*t:.13))add('wall',i,'scuff');});
 return marks;
}
