/** Wave 03 tactile compound renderer.
 * Wave 02 waveform is the reference and never modified. Independent acoustic
 * stems simulate contact, inertia, surfaces and aftermath at different times.
 * Zero network/sample dependencies. Finite, deterministic, peak-limited output.
 */
import type {SoundSettings} from './sound-catalog.ts';
import {renderRefinedSound} from './sound-refine-audio.ts';
const TAU=Math.PI*2;
type Stem='contact'|'mass'|'scrape'|'handle'|'rattle'|'click'|'settle'|'air';
type Event={kind:Stem;at:number;length:number;level:number};
type Profile={body:number;surface:number;metal:number;scale:number;room:number;
 action:'mechanical'|'soft'|'door'|'weapon'|'ui'};
const profiles:Record<string,Profile>={
 'weapons.carbine':{body:108,surface:1740,metal:1450,scale:1,room:.065,action:'weapon'},
 'weapons.rifle':{body:89,surface:1380,metal:1260,scale:1,room:.074,action:'weapon'},
 'weapons.rifle_suppressed':{body:127,surface:820,metal:1120,scale:.82,room:.045,action:'weapon'},
 'combat.flash':{body:63,surface:1330,metal:870,scale:1,room:.088,action:'weapon'},
 'doors.kick':{body:84,surface:590,metal:680,scale:1,room:.085,action:'door'},
 'equipment.reload':{body:230,surface:880,metal:1850,scale:1,room:.03,action:'mechanical'},
 'movement.boot':{body:118,surface:590,metal:430,scale:.65,room:.043,action:'soft'},
 'impacts.body_hit':{body:96,surface:710,metal:910,scale:.7,room:.049,action:'soft'},
 'doors.close':{body:131,surface:450,metal:920,scale:1,room:.069,action:'door'},
 'orders.waypoint':{body:420,surface:1200,metal:1520,scale:.23,room:.009,action:'ui'}
};
function hash(s:string){
 let h=2166136261;
 for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
 return h||1;
}
function schedule(i:number,p:Profile):Event[]{
 const es:Event[]=[];
 const add=(kind:Stem,at:number,length:number,level:number)=>{
  es.push({kind,at:Math.max(0,at*p.scale),length:Math.max(.009,length*p.scale),level});
 };
 switch(i){
  case 0: // short first contact / quiet late settling
   add('contact',0,.015,.30);add('settle',.087,.063,.33);break;
  case 1: // the preparatory physical movement is audible BEFORE the body
   add('handle',.002,.036,.33);
   add('mass',.055,.082,.44);add('settle',.149,.047,.23);break;
  case 2: // multiple non-identical secondary reactions
   add('mass',.034,.072,.38);
   add('rattle',.089,.047,.48);add('settle',.159,.048,.31);break;
  case 3: // contact, action, mechanical return, not a repeated whole sound
   add('click',.033,.021,.38);add('rattle',.110,.037,.42);
   add('click',.194,.019,.31);break;
  case 4: // material-specific grain and scrape in separate stages
   add('scrape',.014,.111,.51);add('contact',.068,.020,.24);
   add('settle',.149,.061,.25);break;
  default: // comprehensive but conservative composite of useful pieces
   add('handle',.002,.032,.21);add('contact',.041,.019,.28);
   add('mass',.072,.093,.31);add('scrape',.102,.069,.24);
   add('rattle',.175,.038,.27);add('air',.218,.116,.20);break;
 }
 // UI controls must never generate long mechanical/resonant noises.
 if(p.action==='ui')return es.map(e=>({...e,
  level:e.level*.54,length:e.length*.7}));
 return es;
}
function addStem(out:Float32Array,sampleRate:number,id:string,index:number,
 event:Event,p:Profile,settings:SoundSettings){
 const start=Math.round(event.at*sampleRate);
 const end=Math.min(out.length,start+Math.ceil(event.length*sampleRate*4));
 const decay=Math.max(.004,event.length);
 const pitch=Math.min(1.5,Math.max(.72,settings.pitch/240));
 const f=event.kind==='mass'?p.body:
  event.kind==='click'?p.metal*1.4:
  event.kind==='rattle'?p.metal*.85:
  event.kind==='contact'?p.metal:
  event.kind==='settle'?p.body*1.2:p.surface;
 let seed=hash(id+'|'+index+'|'+event.kind+'|'+start);
 let lp=0,phase=0,phase2=0;
 const filter=Math.min(.9,TAU*(f*.64+settings.brightness*1100)/sampleRate);
 for(let i=start;i<end;i++){
  const t=(i-start)/sampleRate;
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const white=((seed>>>0)/2147483648)-1;
  lp+=(white-lp)*filter;
  const high=white-lp;
  const e=Math.min(1,t/.0013)*Math.exp(-t/decay);
  phase+=TAU*f*pitch*(1-.20*Math.min(1,t/.06))/sampleRate;
  phase2+=TAU*f*2.27*pitch/sampleRate;
  const tone=Math.sin(phase),ring=Math.sin(phase2)+Math.sin(phase*.64)*.42;
  let v=0;
  switch(event.kind){
   case 'contact':v=high*.64+lp*.26+tone*.24;break;
   case 'mass':v=tone*.74+Math.sin(phase*.53)*.42+lp*.20;break;
   case 'scrape':v=(lp*.65+high*.29)*(1+.27*Math.sin(TAU*51*t))+
       Math.sin(phase*.31)*.12;break;
   case 'handle':v=lp*.39+tone*.15+high*.22;break;
   case 'rattle':v=ring*.38+high*.43+
       Math.sin(TAU*97*t)*lp*.18;break;
   case 'click':v=ring*.54+high*.31;break;
   case 'settle':v=lp*.38+Math.sin(phase*.58)*.33;break;
   case 'air':v=lp*.48+high*.21;break;
  }
  const makeSoft=event.kind==='handle'||event.kind==='scrape'||event.kind==='settle';
  const level=makeSoft?.60:.92;
  out[i]+=v*e*event.level*level;
 }
}
export function renderCompoundSound(id:string,s:SoundSettings,sampleRate=22050):Float32Array{
 const p=profiles[id];
 if(!p||s.refinement===undefined||s.refinement<0)
  return renderRefinedSound(id,{...s,compound:-1},sampleRate);
 const index=Math.max(0,Math.min(5,Math.floor(s.compound??0)));
 const base=renderRefinedSound(id,{...s,compound:-1},sampleRate);
 const events=schedule(index,p);
 const delay=index===1?Math.round(.042*p.scale*sampleRate):0;
 const longest=Math.max(...events.map(x=>x.at+x.length*4),0);
 const tailSeconds=Math.min(3.7,Math.max((base.length+delay)/sampleRate,
   longest+.035,p.room*4+.14));
 const out=new Float32Array(Math.ceil(tailSeconds*sampleRate));
 const referenceRatio=[.84,.70,.75,.70,.75,.62][index];
 for(let i=0;i<base.length&&i+delay<out.length;i++)
  out[i+delay]+=base[i]*referenceRatio;
 for(let n=0;n<events.length;n++)
  addStem(out,sampleRate,id,index*13+n,events[n],p,s);
 // Long reverb is not an automatic ingredient. Only the deliberately
 // environmental composite has a small number of early object reflections.
 if(index===5&&p.action!=='ui'){
  const taps=[p.room,p.room*1.85,p.room*2.79];
  for(let j=0;j<taps.length;j++){
   const offset=Math.round(taps[j]*sampleRate);
   for(let i=base.length-1;i>=0;i--){
    const dest=i+offset;
    if(dest<out.length)out[dest]+=base[i]*[.10,.065,.035][j];
   }
  }
 }
 // Equalize to original source to make preference discovery about tactile
 // character and not volume. Hard peak ceiling prevents additive clipping.
 let srcSq=0,dstSq=0,peak=0;
 for(let i=0;i<base.length;i++)srcSq+=base[i]*base[i];
 for(const v of out){dstSq+=v*v;peak=Math.max(peak,Math.abs(v));}
 const srcRms=Math.sqrt(srcSq/Math.max(1,base.length));
 const dstRms=Math.sqrt(dstSq/Math.max(1,out.length));
 const gain=Math.max(.66,Math.min(1.5,srcRms/Math.max(.00001,dstRms)));
 const safe=Math.min(gain,.88/Math.max(.001,peak));
 for(let i=0;i<out.length;i++)out[i]=Math.tanh(out[i]*safe*1.06)*.89;
 return out;
}
