/** Build 26.01: deterministic, room-aware lighting fixtures and power.
 * Uses the existing physical room program, not arbitrary world-space dots.
 * This is an authoring contract for both tactical illumination and rendering.
 */
import type {Site} from './breach-site.ts';
import type {IlluminationSource} from './equipment-light-field.ts';
export type LightingMode='day'|'evening'|'night'|'blackout'|'emergency';
export type SiteLight={id:string;roomId:string;p:{x:number;y:number};
 kind:'ceiling'|'fluorescent'|'worklight'|'emergency';
 power:'mains'|'backup';intensity:number;range:number};
export type SiteLightingProgram={
 mode:LightingMode;ambient:number;fixtures:SiteLight[];
 sources:IlluminationSource[];
};
const LIGHT_CAP=32;
const mod=(v:number,n:number)=>((v%n)+n)%n;
export function planSiteLighting(site:Site,mode:LightingMode='day'):SiteLightingProgram{
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
 const sources:IlluminationSource[]=fixtures.map(f=>({
  id:f.id,p:f.p,range:f.range,intensity:f.intensity,enabled:true}));
 return {mode,ambient,fixtures,sources};
}
