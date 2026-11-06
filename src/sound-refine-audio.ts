/** Wave 02A: layered, cue-specific second-pass studies. All stems are
 * deterministic, independently shaped audio—not replayed copies of the base.
 * The Wave 01 waveform remains intact as the reference signal.
 */
import type {SoundSettings} from './sound-catalog.ts';
import {renderFocusedSound} from './sound-focus-audio.ts';
import {REFINEMENT_DIRECTIONS} from './sound-refine.ts';
const TAU=Math.PI*2;
type Profile={attack:number;body:number;material:number;
 mechanical:readonly number[];air:number;room:number;weight:number};
const P:Record<string,Profile>={
 'weapons.carbine':{attack:2600,body:104,material:1150,mechanical:[.079],air:.11,room:.056,weight:1},
 'weapons.rifle':{attack:2100,body:88,material:920,mechanical:[.101],air:.14,room:.068,weight:1},
 'weapons.rifle_suppressed':{attack:840,body:132,material:720,mechanical:[.042,.091],air:.085,room:.042,weight:.65},
 'combat.flash':{attack:3500,body:66,material:1400,mechanical:[.014,.086],air:.32,room:.068,weight:1},
 'doors.kick':{attack:970,body:82,material:540,mechanical:[.073,.145],air:.13,room:.081,weight:.88},
 'equipment.reload':{attack:1750,body:260,material:1180,mechanical:[.045,.137,.262],air:.035,room:.039,weight:.57},
 'movement.boot':{attack:820,body:106,material:670,mechanical:[.072],air:.058,room:.049,weight:.55},
 'impacts.body_hit':{attack:1230,body:91,material:860,mechanical:[.067],air:.068,room:.057,weight:.68},
 'doors.close':{attack:1300,body:123,material:540,mechanical:[.083,.177],air:.12,room:.072,weight:.72},
 'orders.waypoint':{attack:1710,body:430,material:1400,mechanical:[.034],air:.018,room:.026,weight:.39}
};
const MIX:readonly [number,number,number,number,number,number][]=[
 // core, attack, body, texture, mechanical, space
 [.92,.23,.00,.00,.00,.00],
 [.76,.16,.54,.00,.00,.00],
 [.81,.08,.00,.43,.00,.00],
 [.77,.12,.00,.00,.59,.00],
 [.75,.06,.00,.00,.00,.60],
 [.66,.20,.27,.19,.27,.22]
];
function hash(s:string){
 let h=2166136261;
 for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
 return h||1;
}
export function renderRefinedSound(id:string,s:SoundSettings,sampleRate=22050){
 const p=P[id];
 if(!p)return renderFocusedSound(id,s,sampleRate);
 const index=Number.isFinite(s.refinement)?Math.max(0,Math.min(5,Math.floor(s.refinement!))):0;
 const base=renderFocusedSound(id,{...s,refinement:-1},sampleRate);
 const tail=Math.min(2.4,Math.max(base.length/sampleRate,
  Math.max(...p.mechanical,0)+.13,p.air+.19,p.room*3.8+.16));
 const out=new Float32Array(Math.ceil(tail*sampleRate));
 const [core,atk,body,texture,action,space]=MIX[index];
 let seed=hash(id+'|refine|'+index),low=0,mid=0;
 const duration=Math.max(.055,s.length);
 let phaseBody=0,phaseAttack=0,phaseMaterial=0,prev=0;
 const tonalScale=Math.min(1.2,Math.max(.6,s.pitch/180));
 const decay=(t:number,start:number,length:number)=>
  t<start?0:Math.exp(-(t-start)/Math.max(.002,length));
 const envelope=(t:number,start:number,length:number)=>{
  if(t<start)return 0;
  const elapsed=t-start;
  return Math.min(1,elapsed/.0018)*Math.exp(-elapsed/Math.max(.002,length));
 };
 const mechanical=(t:number,n:number)=>{
  const on=p.mechanical[n]??0;
  return envelope(t,on,n===0?.017:.028);
 };
 let referenceEnergy=0,mixEnergy=0,peak=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const white=((seed>>>0)/2147483648)-1;
  const lowCoeff=Math.min(.86,TAU*(130+s.brightness*2900)/sampleRate);
  const midCoeff=Math.min(.92,TAU*(550+s.brightness*5300)/sampleRate);
  low+=(white-low)*lowCoeff;
  mid+=(white-mid)*midCoeff;
  const edge=white-mid;
  phaseBody+=TAU*p.body*(1-.23*Math.min(1,t/.23))/sampleRate;
  phaseAttack+=TAU*p.attack*tonalScale/sampleRate;
  phaseMaterial+=TAU*p.material/sampleRate;
  const wave=(i<base.length?base[i]:0);
  const contact=envelope(t,0,.013)*(edge*.69+
   Math.sin(phaseAttack)*.26+low*.25);
  const physical=envelope(t,0,Math.min(.35,.055+duration*.27))*
   (Math.sin(phaseBody)*.67+Math.sin(phaseBody*.51)*.23+low*.32);
  const rough=envelope(t,.009,Math.min(.19,.025+duration*.29))*
   ((white*.27+mid*.59+Math.sin(phaseMaterial)*.11)*
    (1+.16*Math.sin(TAU*83*t)));
  let mechanism=0;
  for(let n=0;n<p.mechanical.length;n++){
   const w=mechanical(t,n);
   if(w>0)mechanism+=w*(edge*.39+Math.sin(phaseMaterial*(1+.25*n))*.52+
     Math.sin(phaseAttack*.49)*.14);
  }
  const airEnvelope=envelope(t,Math.min(.019,p.air*.30),
   Math.min(.48,p.air+.02));
  const airy=airEnvelope*(mid*.55+low*.45);
  const reflection=(delay:number,amp:number)=>{
   const index=i-Math.round(delay*sampleRate);
   return index>=0&&index<base.length?base[index]*amp:0;
  };
  const environment=reflection(p.room,.65)+
   reflection(p.room*1.87,.43)+reflection(p.room*2.92,.24)+airy*.34;
  const mixed=wave*core+contact*atk*p.weight+
   physical*body*p.weight+rough*texture*p.weight+
   mechanism*action*p.weight+environment*space;
  // Softly duck the extra stems; prevent click buildup for very short UI cues.
  const candidate=Math.tanh(mixed*1.05)*.84;
  out[i]=candidate;
  if(i<base.length)referenceEnergy+=wave*wave;
  mixEnergy+=candidate*candidate;
  peak=Math.max(peak,Math.abs(candidate));
  prev=candidate;
 }
 // Perceptual A/B needs approximately matched loudness; do not let extra
 // layers win just by getting louder. Bound normalization and peak.
 void prev;
 const referenceRms=Math.sqrt(referenceEnergy/Math.max(1,base.length));
 const candidateRms=Math.sqrt(mixEnergy/Math.max(1,out.length));
 const boost=Math.max(.55,Math.min(1.6,
  referenceRms/Math.max(.00001,candidateRms)));
 const level=peak*boost>.86?.86/peak:boost;
 for(let i=0;i<out.length;i++)out[i]*=level;
 return out;
}
export function refinementModes(){return REFINEMENT_DIRECTIONS.length;}
