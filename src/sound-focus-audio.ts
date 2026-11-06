/** Eight distinct synthesis constructions for first-round sound exploration.
 * They are deliberately bold sketches: the user chooses a character before
 * any fine-tuning or sample-based Foley recording. Deterministic/no network.
 */
import type {SoundSettings} from './sound-catalog.ts';
const TAU=Math.PI*2;
function hash(value:string){
 let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 return h||1;
}
export function renderFocusedSound(id:string,s:SoundSettings,sampleRate:number){
 const mode=Math.max(0,Math.min(7,Math.floor(s.concept??0)));
 const duration=[.58,1.35,1,1.03,1.28,1.75,.83,1.8][mode];
 const seconds=Math.min(4.6,Math.max(.08,s.length*duration+
  s.tail*(mode===7?.45:.13)+s.room*.17+.055));
 const out=new Float32Array(Math.ceil(seconds*sampleRate));
 let seed=hash(id+':'+mode),lo=0,mid=0,phase=0,phase2=0;
 const idSalt=(hash(id)%31)/31;
 const base=Math.max(.035,s.length),freq=s.pitch;
 const transient=(t:number,on:number,rate:number)=>
  t>=on?Math.exp(-(t-on)*rate):0;
 const shaper=(value:number)=>Math.tanh(value*1.55)*.78;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const white=((seed>>>0)/2147483648)-1;
  const lowpass=Math.min(.95,(120+s.brightness*4500)/sampleRate*TAU);
  lo+=(white-lo)*lowpass;
  mid+=(white-mid)*Math.min(.9,(650+s.brightness*7800)/sampleRate*TAU);
  const high=white-mid,grain=white*.45+mid*.55;
  const drop=1-Math.min(.8,t/base)*s.punch*.57;
  phase+=TAU*freq*drop/sampleRate;
  phase2+=TAU*freq*2.38/sampleRate;
  const lowTone=Math.sin(phase*.55);
  const tone=Math.sin(phase),metal=Math.sin(phase*2.91)+Math.sin(phase2*1.34)*.48;
  const smack=transient(t,0,95/base)*white;
  let v=0;
  switch(mode){
   case 0: { // almost point-source dry snap
    const e=Math.exp(-t*10/Math.max(.07,base));
    v=(high*.94+tone*.16+smack*.5)*e*(.35+.65*s.punch);
    break;
   }
   case 1: { // strongly low-frequency pressure with slower body
    const e=Math.exp(-t*2.7/Math.max(.07,base));
    v=(lowTone*.95+lo*.67+Math.sin(phase*.25)*.34)*e+
      smack*.28;
    break;
   }
   case 2: { // broken, layered abrasive noise and little grains
    const grains=1+.32*Math.sin(TAU*87*t)+.22*Math.sin(TAU*133*t);
    const e=Math.exp(-t*5/Math.max(.09,base));
    v=(white*.82+high*.4+Math.sign(tone)*.22)*grains*e+
      transient(t,base*.15,36/base)*grain*.28;
    break;
   }
   case 3: { // clearly staggered components: knock / contact / reset
    const d1=transient(t,0,18/Math.max(.07,base));
    const d2=transient(t,Math.min(.09,base*.32),35/Math.max(.07,base));
    const d3=transient(t,Math.min(.21,base*.69),48/Math.max(.07,base));
    v=grain*d1*.65+metal*d1*.19+
      (high*.75+tone*.26)*d2*.9+
      (metal*.36+grain*.36)*d3;
    break;
   }
   case 4: { // pneumatic noise, swells and breath
    const rise=Math.min(1,t/Math.max(.012,base*.16));
    const e=rise*Math.exp(-t*2.9/Math.max(.08,base));
    v=(mid*.88+lo*.27+Math.sin(phase*.82)*.08)*e+
      smack*.16;
    break;
   }
   case 5: { // semi-tonal ring of mismatched resonators
    const e=Math.exp(-t*3.5/Math.max(.09,base*(1+s.tail*.75)));
    const ring=metal*.42+Math.sin(phase*.73)*.32+Math.sin(phase*4.23)*.14;
    v=ring*e+grain*transient(t,0,34/base)*.33;
    break;
   }
   case 6: { // deliberately bandwidth limited and quantized/tape-like
    const loFi=Math.round((mid*.58+Math.sign(tone)*.31)*7)/7;
    const gated=1-.22*Math.sin(TAU*37*t);
    const e=Math.exp(-t*6.5/Math.max(.07,base));
    v=(loFi*.97+lo*.18)*gated*e+
      Math.round(smack*5)/5*.37;
    break;
   }
   default: { // distance and architecture: repeated reflections
    const e=Math.exp(-t*4.2/Math.max(.07,base));
    const reflected=(delay:number,strength:number)=>
      t>=delay?Math.exp(-(t-delay)*3.3/Math.max(.1,base))*strength*
       Math.sin(TAU*(freq*.71)*(t-delay)):0;
    v=(mid*.48+tone*.32)*e+
      reflected(.053,.53)+reflected(.114,.42)+
      reflected(.219,.3)+
      lo*Math.exp(-t*2/Math.max(.1,base))*.13;
    break;
   }
  }
  // Surface identity is retained as a light cue-specific modulation.
  if(mode!==1&&mode!==4)v+=Math.sin(phase2*(.17+idSalt*.12))*
   Math.exp(-t*6/Math.max(.08,base))*.06;
  const attack=Math.min(1,t/.0025);
  const release=Math.min(1,(seconds-t)/.022);
  v*=attack*Math.max(0,release);
  out[i]=shaper(v)*(.72+.28*s.noise);
 }
 return out;
}
