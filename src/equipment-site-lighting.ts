/** Build 26.01: deterministic, room-aware lighting fixtures and power.
 * Uses the existing physical room program, not arbitrary world-space dots.
 * This is an authoring contract for both tactical illumination and rendering.
 */
import type {Site} from './breach-site.ts';
import type {IlluminationSource} from './equipment-light-field.ts';
import type {SitePowerState,SitePowerCircuit} from './equipment-site-power.ts';
export type LightingMode='day'|'evening'|'night'|'blackout'|'emergency';
export type SiteLight={id:string;roomId:string;p:{x:number;y:number};
 kind:'ceiling'|'fluorescent'|'worklight'|'emergency'|'street';
 power:'mains'|'backup';intensity:number;range:number};
export type SiteLightingProgram={
 mode:LightingMode;ambient:number;fixtures:SiteLight[];
 sources:IlluminationSource[];
};
const LIGHT_CAP=32;
const mod=(v:number,n:number)=>((v%n)+n)%n;
/** Stable potential lights, including currently dark/failed fixtures.
 * The existing planSiteLighting(site,mode) remains byte-for-byte legacy.
 * L1.1 keeps fixture identity independent of active source selection.
 */
export type SiteLightTopology={
 id:string;roomId:string;p:{x:number;y:number};
 kind:SiteLight['kind'];mainCircuit:SitePowerCircuit;
 /** Physical lamp head height for the pooled renderer. */
 height?:number;
 backupEligible:boolean;failed:boolean;intensity:number;range:number;
};
export function siteLightingTopology(site:Site):SiteLightTopology[]{
 const count=Math.min(LIGHT_CAP,site.rooms.length);
 const neglected=site.condition==='vacant'||site.condition==='neglected';
 const result:SiteLightTopology[]=[];
 for(let index=0;index<count;index++){
  const room=site.rooms[index];
  if(room.w<16||room.h<16)continue;
  const purpose=(room.purpose??'').toLowerCase();
  const work=/kitchen|work|garage|storage|shop|utility|maintenance|service/.test(purpose);
  const backup=/hall|corridor|stair|exit|entry|vestibule/.test(purpose)||
   room.kind==='hall';
  const kind=backup?'emergency':work?'worklight':
   /office|retail|clinic|warehouse/.test(site.archetype??'')?'fluorescent':'ceiling';
  result.push({
   id:'light:'+room.id,roomId:room.id,
   p:{x:room.x+room.w/2,y:room.y+room.h/2},
   kind,mainCircuit:index%2===0?'mains:0':'mains:1',
   backupEligible:backup,failed:neglected&&mod(site.seed+index*23,7)<3,
   intensity:work?.66:.56,
   range:Math.max(55,Math.min(160,Math.max(room.w,room.h)*.62))
  });
 }
 if(site.streetInfrastructure){
  const lamps=site.cover.filter(c=>c.fixture==='street-lamp'&&!c.destroyed&&!c.toppled).slice(0,3);
  for(const [index,c] of lamps.entries()){
   if(result.length>=LIGHT_CAP)break;
   const turn=c.orientation??0,dir=[{x:0,y:1},{x:1,y:0},{x:0,y:-1},{x:-1,y:0}][turn];
   const depth=turn%2?c.w:c.h;
   result.push({id:'street-light:'+(c.id??c.x+':'+c.y),roomId:'public-street',
    p:{x:c.x+dir.x*depth*1.23,y:c.y+dir.y*depth*1.23},height:97*.954,
    kind:'street',mainCircuit:'mains:1',backupEligible:false,
    failed:neglected&&mod(site.seed+index*23,7)<3,intensity:.62,range:145});
  }
 }
 return result;
}
function poweredSiteLighting(site:Site,mode:LightingMode,
 state:SitePowerState):SiteLightingProgram{
 const ambient=mode==='day'?.85:mode==='evening'?.44:
  mode==='night'?.10:mode==='blackout'?.035:.055;
 const fixtures:SiteLight[]=[];
 for(const f of siteLightingTopology(site)){
  if(state.switches[f.id]===false||(f.kind==='street'&&mode==='day'))continue;
  const mains=state.circuits[f.mainCircuit]&&!f.failed;
  const backup=!mains&&f.backupEligible&&state.circuits['backup:emergency'];
  if(!mains&&!backup)continue;
  fixtures.push({
   id:f.id,roomId:f.roomId,p:f.p,
   kind:backup?'emergency':f.kind,
   power:backup?'backup':'mains',
   intensity:backup?.35:f.intensity,range:f.range
  });
 }
 return {mode,ambient,fixtures,
  sources:fixtures.map(f=>({id:f.id,p:f.p,range:f.range,
   intensity:f.intensity,enabled:true}))};
}
/** No power override means strictly historical preset-only behavior. */
export function planSiteLighting(site:Site,mode:LightingMode='day',
 power?:SitePowerState):SiteLightingProgram{
 if(power&&power.mode===mode)return poweredSiteLighting(site,mode,power);
 const ambient=mode==='day'?.85:mode==='evening'?.44:
  mode==='night'?.10:mode==='blackout'?.035:.055;
 const fixtureCount=Math.min(LIGHT_CAP,site.rooms.length);
 const fixtures:SiteLight[]=[];
 const condition=site.condition??'occupied';
 const neglected=condition==='vacant'||condition==='neglected';
 for(let index=0;index<fixtureCount;index++){
  const room=site.rooms[index];
  if(room.w<16||room.h<16)continue;
  const purpose=(room.purpose??'').toLowerCase();
  const work=/kitchen|work|garage|storage|shop|utility|maintenance|service/.test(purpose);
  const backup=/hall|corridor|stair|exit|entry|vestibule/.test(purpose)||
   room.kind==='hall';
  const kind=backup?'emergency':work?'worklight':
   /office|retail|clinic|warehouse/.test(site.archetype??'')?'fluorescent':'ceiling';
  const failure=neglected&&mod(site.seed+index*23,7)<3;
  const mainsOn=mode!=='blackout'&&mode!=='emergency'&&!failure;
  const backupOn=(mode==='emergency'||mode==='blackout')&&backup;
  if(!mainsOn&&!backupOn)continue;
  const x=room.x+room.w/2,y=room.y+room.h/2;
  const power=backupOn?'backup' as const:'mains' as const;
  fixtures.push({
   id:'light:'+room.id,roomId:room.id,p:{x,y},power,
   kind:backupOn?'emergency':kind,
   intensity:backupOn?.35:work?.66:.56,
   range:Math.max(55,Math.min(160,Math.max(room.w,room.h)*.62))
  });
 }
 // Legacy snapshots without ST metadata retain their exact old light list.
 if(site.streetInfrastructure&&mode!=='day'&&mode!=='blackout'&&mode!=='emergency'){
  for(const f of siteLightingTopology(site))if(f.kind==='street'&&!f.failed)
   fixtures.push({id:f.id,roomId:f.roomId,p:f.p,kind:f.kind,power:'mains',intensity:f.intensity,range:f.range});
 }
 const sources:IlluminationSource[]=fixtures.map(f=>({
  id:f.id,p:f.p,range:f.range,intensity:f.intensity,enabled:true}));
 return {mode,ambient,fixtures,sources};
}
