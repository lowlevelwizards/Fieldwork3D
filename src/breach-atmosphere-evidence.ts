/** Bounded cosmetic tails retained at the normal shot/flash expiry.
 * No influence on health, sight, audio, penetration, or combat history. */
import type {Session} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {isIntermediateMaterialCue} from './breach-material-cues.ts';
export type PuffKind='dust'|'wood'|'stone'|'flash'|'muzzle';
export const PUFF_LIFE:Readonly<Record<PuffKind,number>>=Object.freeze({dust:1.45,wood:1.10,stone:1.35,flash:3.2,muzzle:1.6});
export const ATMOSPHERE_LIMIT=32;
export type AtmosphereCue={key:string;id:number;kind:PuffKind;p:Pt;height:number;at:number};
function isDust(surface:string|undefined):surface is 'dust'|'wood'|'stone'{return surface==='dust'||surface==='wood'||surface==='stone';}
export function retainAtmosphereTails(s:Pick<Session,'seconds'|'shots'|'flashBursts'|'atmosphere'>,h:number):void{
 let list=s.atmosphere;
 if(list?.length){
  let write=0;for(const c of list)if(s.seconds-c.at<PUFF_LIFE[c.kind])list[write++]=c;
  list.length=write;
 }
 const append=(key:string,id:number,kind:PuffKind,p:Pt,height:number,at:number)=>{
  list??=(s.atmosphere=[]);
  if(list.some(c=>c.key===key))return;
  list.push({key,id,kind,p:{...p},height,at});
  if(list.length>ATMOSPHERE_LIMIT)list.shift();
 };
 for(const shot of s.shots){
  if(shot.age+h<.40)continue;
  const at=s.seconds-(shot.age+h);
  if(isDust(shot.surface))append('shot:'+shot.id,shot.id,shot.surface,shot.end,shot.impactHeight??1,at);
  append('muzzle:'+shot.id,shot.id,'muzzle',shot.start,shot.muzzleHeight??15,at);
  for(const cue of shot.materialImpacts??[])
   if(isDust(cue.surface)&&isIntermediateMaterialCue(shot,cue))
    append('material:'+cue.id,cue.id,cue.surface,cue.p,cue.height,at);
 }
 for(const flash of s.flashBursts)if(flash.age+h>=.70)
  append('flash:'+flash.id,flash.id,'flash',flash.p,13,s.seconds-(flash.age+h));
}
