/** Contextual visual causes: contact areas, leaks and tracked dirt from real fixtures. */
import {seeded,type Site} from '../breach-site.ts';
import {roomPixelSurface} from './pixel-surface-selection.ts';
import {canWear,type WearEffect} from './material-properties.ts';
import {effectiveCondition} from './condition-visual.ts';
import type {WearMark,WearKind} from './environment-wear.ts';
export type ActivitySource='mechanical-leak'|'water-use'|'foot-traffic'|
 'work-contact'|'storage-dust';
const rules:Record<string,{kind:WearKind;source:ActivitySource;max:number}>={
 'vehicle-lift':{kind:'oil',source:'mechanical-leak',max:32},
 compressor:{kind:'grease',source:'mechanical-leak',max:24},
 workbench:{kind:'scratch',source:'work-contact',max:18},
 'tool-chest':{kind:'grease',source:'work-contact',max:13},
 sink:{kind:'drip',source:'water-use',max:14},
 'laundry-machine':{kind:'drip',source:'water-use',max:16},
 shelf:{kind:'dust',source:'storage-dust',max:16},
 rack:{kind:'dust',source:'storage-dust',max:16},
};
export function planActivityWear(site:Site):WearMark[]{
 const rng=seeded(site.seed^0x9be715ad);
 const condition=site.condition??'occupied';
 const continuous=site.conditionLevel!==undefined,t=effectiveCondition(site)/100;
 if(continuous&&t<.04)return [];
 const budget=continuous?Math.min(20,Math.round(t*21)):
   condition==='occupied'?2:condition==='busy'?7:
   condition==='neglected'||condition==='disturbed'?14:9;
 const result:WearMark[]=[];
 for(const [i,item] of site.cover.entries()){
  if(!item.fixture||result.length>=budget)break;
  const rule=rules[item.fixture];if(!rule)continue;
  const room=site.rooms.find(r=>item.x>=r.x&&item.x<=r.x+r.w&&
    item.y>=r.y&&item.y<=r.y+r.h);
  if(!room)continue;
  const material=roomPixelSurface(site.archetype,room.purpose??room.kind);
  if(!canWear(material,rule.kind as WearEffect))continue;
  if(!continuous&&condition==='occupied'&&(rule.kind==='oil'||rule.kind==='grease'))continue;
  if(rng()>(continuous?.08+.90*t:condition==='occupied'?.25:.75))continue;
  const size=Math.min(rule.max,Math.max(10,item.w*.55));
  const x=Math.max(room.x+size/2,Math.min(room.x+room.w-size/2,item.x));
  const y=Math.max(room.y+size/2,Math.min(room.y+room.h-size/2,item.y+item.h*.17));
  result.push({id:room.id+':activity:'+i,roomId:room.id,
    kind:rule.kind,x,y,width:size,depth:size*.72,
    rotation:Math.floor(rng()*4)*Math.PI/2,
    opacity:continuous?.12+.34*t:condition==='neglected'?.42:.29});
 }
 return result;
}
