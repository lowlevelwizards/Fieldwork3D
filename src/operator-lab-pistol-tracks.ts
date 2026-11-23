/** Deterministic, seekable sidearm presentation facts for Operator Lab only.
 * The real operator rig consumes these via the existing secondary pose path.
 * Never author a game order, ammunition exchange, or player loadout.
 */
import type {LabTrack} from './breach-lab-tracks.ts';
export type LabPistolStance='high'|'low'|'ready'|'retention';
/** The Arsenal meshes are authored in their own units. The live holster
 * uses .37; at the operator's hand this is visibly toy-sized. This larger
 * Lab-only presentation scale preserves every original model's proportions
 * and grip socket, and never changes live gameplay muzzle or ballistics.
 */
export const LAB_PISTOL_PREVIEW_SCALE=.57;
export type LabPistolFrame=Readonly<{
 fraction:number;aim:number;pitch:number;recoil:number;
 stanceBlend:number;
 /** Empty-magazine reload only: overhand slide grab, rack and release. */
 slideRack:Readonly<{weight:number;pull:number}>|null;
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
 let fraction=1,aim=.12,pitch=0,recoil=0,stanceBlend=1;
 let slideRack:LabPistolFrame['slideRack']=null;
 let stance:LabPistolStance='ready';
 let reload:LabPistolFrame['reload']=null;
 switch(track){
  case 'pistol-draw':
   fraction=ease((t-.20)/.85);aim=.10;break;
  case 'pistol-holster':
   fraction=1-ease((t-.20)/.85);aim=.10;break;
  case 'high-ready':
  case 'pistol-high-ready':
   stance='high';pitch=.40;aim=0;break;
  case 'low-ready':
  case 'pistol-low-ready':
   stance='low';pitch=-.30;aim=0;break;
  case 'aim':
  case 'active-aim':
  case 'pistol-aim':
   aim=ease((t-.12)/.65);break;
  case 'point-shoot':
   // Intuitive, lower point shooting: short of the eye-line ADS extension.
   aim=.36;pitch=-.12;break;
  case 'short-stock':
   // Close retention is the correct sidearm equivalent of short stock.
   stance='retention';aim=0;pitch=-.06;break;
  case 'ready-to-ads':
   aim=ease((t-.50)/1.05);break;
  case 'ads-to-low':
   stance='low';stanceBlend=ease((t-.50)/1.05);
   aim=1-stanceBlend;pitch=-.30*stanceBlend;break;
  case 'pistol-fire':
   aim=1;
   // A controllable visual recoil pulse; no ammunition is consumed.
   recoil=Math.max(0,1-((Math.max(0,t-.35)%.46)/.15))*(t>=.35?1:0);
   pitch=recoil*.16;
   break;
  case 'pistol-retention':
   stance='retention';aim=0;pitch=-.06;break;
  case 'reload':
  case 'reload-retention':
  case 'reload-emergency':
  case 'reload-interrupt':
  case 'pistol-reload':
  case 'pistol-reload-retention':
  case 'pistol-reload-emergency':
  case 'pistol-reload-interrupt':{
   aim=0;
   if(track==='pistol-reload-interrupt'||track==='reload-interrupt'){
    if(t<.95)reload={progress:clamp((t-.15)/1.2)*.65,retain:true};
   }else{
    const empty=track==='pistol-reload-emergency'||track==='reload-emergency';
    // Extend ONLY the empty reload to allow a real post-insertion slide
    // manipulation that can be inspected by scrubbing.
    const duration=empty?2.08:1.45;
    const p=clamp((t-.35)/duration);
    if(t>=.35&&t<=.35+duration)reload={
     progress:p,retain:!empty
    };
    if(empty&&t>=.35&&t<=.35+duration){
     const weight=ease((p-.71)/.09)*(1-ease((p-.90)/.09));
     const pull=ease((p-.80)/.045)*(1-ease((p-.855)/.045));
     if(weight>0)slideRack={weight,pull};
    }
   }
   break;
  }
  case 'ready':
  case 'pistol-ready':aim=.12;break;
  default:
   // Ordinary movement and ready tracks can still be inspected with the
   // selected pistol. Existing long-gun track timing remains untouched.
   // Movement/idle/action tracks keep a stable, physical pistol ready.
   // They never default to an unseen rifle handling stance.
 }
 return {fraction,aim,pitch,recoil,stance,stanceBlend,reload,slideRack};
}
