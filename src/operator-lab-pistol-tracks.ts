/** Deterministic, seekable sidearm presentation facts for Operator Lab only.
 * The real operator rig consumes these via the existing secondary pose path.
 * Never author a game order, ammunition exchange, or player loadout.
 */
import type {LabTrack} from './breach-lab-tracks.ts';
export type LabPistolStance='high'|'low'|'ready'|'retention';
export type LabPistolFrame=Readonly<{
 fraction:number;aim:number;pitch:number;recoil:number;
 stance:LabPistolStance;reload:Readonly<{
  progress:number;retain:boolean
 }> | null;
}>;
export const isLabPistolTrack=(track:LabTrack):boolean=>
 track.startsWith('pistol-');
const clamp=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const ease=(n:number)=>{const v=clamp(n);return v*v*(3-2*v);};
export function sampleLabPistolFrame(track:LabTrack,time:number):LabPistolFrame{
 const t=Math.max(0,Math.min(4,Number.isFinite(time)?time:0));
 let fraction=1,aim=.2,pitch=0,recoil=0;
 let stance:LabPistolStance='ready';
 let reload:LabPistolFrame['reload']=null;
 switch(track){
  case 'pistol-draw':
   fraction=ease((t-.20)/.85);aim=.10;break;
  case 'pistol-holster':
   fraction=1-ease((t-.20)/.85);aim=.10;break;
  case 'pistol-high-ready':
   stance='high';pitch=.58;aim=0;break;
  case 'pistol-low-ready':
   stance='low';pitch=-.48;aim=0;break;
  case 'pistol-aim':
   aim=ease((t-.18)/.75);break;
  case 'pistol-fire':
   aim=1;
   // A controllable visual recoil pulse; no ammunition is consumed.
   recoil=Math.max(0,1-((Math.max(0,t-.35)%.46)/.15))*(t>=.35?1:0);
   pitch=recoil*.16;
   break;
  case 'pistol-retention':
   stance='retention';aim=0;pitch=-.13;break;
  case 'pistol-reload':
  case 'pistol-reload-retention':
  case 'pistol-reload-emergency':
  case 'pistol-reload-interrupt':{
   aim=0;
   if(track==='pistol-reload-interrupt'){
    if(t<.95)reload={progress:clamp((t-.15)/1.2)*.65,retain:true};
   }else{
    const p=clamp((t-.35)/1.45);
    if(t>=.35&&t<=1.8)reload={
     progress:p,retain:track!=='pistol-reload-emergency'
    };
   }
   break;
  }
  case 'pistol-ready':aim=.18;break;
  default:
   // Ordinary movement and ready tracks can still be inspected with the
   // selected pistol. Existing long-gun track timing remains untouched.
   if(track==='aim'||track==='active-aim'||track==='point-shoot')
    aim=1;
 }
 return {fraction,aim,pitch,recoil,stance,reload};
}
