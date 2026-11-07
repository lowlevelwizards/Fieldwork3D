/** Original lightweight procedural SFX engine shared by the lab and game.
 * No external assets, no timers, no gameplay simulation / hidden-intel reads.
 * The same PCM renderer drives audition, playback, WAV and ZIP export.
 */
import {SOUND_BY_ID,readSoundPack,resolvePlayableSoundSettings,
 type SoundSettings,type SoundPack} from './sound-catalog.ts';

import {renderFocusedSound} from './sound-focus-audio.ts';
import {renderRefinedSound} from './sound-refine-audio.ts';
import {renderCompoundSound} from './sound-compound-audio.ts';
import {renderAcousticResponse,type AcousticResponse} from './sound-room-filter.ts';
import {renderTactileBody,tactileProfile,variationForSound} from './sound-live-tactility.ts';
const rate=22050;
const TAU=Math.PI*2;
function hash(value:string){
 let h=2166136261;for(let i=0;i<value.length;i++)
  h=Math.imul(h^value.charCodeAt(i),16777619)>>>0;
 return h||1;
}
export function renderSound(id:string,settings:SoundSettings,
 sampleRate=rate):Float32Array{
 const entry=SOUND_BY_ID.get(id);if(!entry)return new Float32Array(0);
 if(settings.compound!==undefined&&settings.compound>=0)
  return renderCompoundSound(id,settings,sampleRate);
 if(settings.refinement!==undefined&&settings.refinement>=0)
  return renderRefinedSound(id,settings,sampleRate);
 if(settings.concept>=0)return renderFocusedSound(id,settings,sampleRate);
 const family=entry.family,seconds=Math.min(4.6,settings.length+
  settings.tail*.25+settings.room*.3);
 const length=Math.ceil(sampleRate*seconds),out=new Float32Array(length);
 let seed=hash(id),low=0;
 const pitch=settings.pitch,base=Math.max(.04,settings.length);
 const isAmbient=family==='ambient';
 const isMetal=family==='metal'||family==='glass';
 const isShot=family==='shot'||family==='blast';
 const isVoice=family==='voice';
 const isUI=family==='ui'||family==='electronic';
 const body=family==='step'||family==='door'||family==='wood'||
   family==='impact'||isShot;
 const attack=isAmbient?.11:isShot?.0015:isUI?.005:.007;
 const fade=.06+settings.tail*.48;
 let phase=0,phase2=0;
 for(let i=0;i<length;i++){
  const t=i/sampleRate,progress=t/base;
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=((seed>>>0)/2147483648)-1;
  // Simple stable banded-noise filter; brighter => sharper material.
  const filterHz=120+settings.brightness*10000;
  const a=Math.min(.98,TAU*filterHz/sampleRate);
  low+=(noise-low)*a;
  const grit=(low*.75+(noise-low)*.55)*settings.noise;
  const down=1-.34*settings.punch*Math.min(1,progress);
  phase+=TAU*pitch*down/sampleRate;
  phase2+=TAU*pitch*2.07/sampleRate;
  const harmonic=Math.sin(phase)+.26*Math.sin(phase2);
  let signal=grit*.73+harmonic*(1-settings.noise*.66)*.55;
  if(isMetal)signal+=Math.sin(phase*2.77)*.25+
    Math.sin(phase2*1.51)*.16;
  if(isShot)signal+=Math.sin(TAU*(pitch*.48)*t)*.56+
    (t<.015?noise*(1-t/.015)*.50:0);
  if(body)signal+=Math.sin(phase*.51)*settings.punch*.28;
  if(isVoice)signal=Math.sin(phase)*(0.24+Math.sin(TAU*11*t)*.12)+
    grit*.38+Math.sin(phase*2.1)*.10;
  if(family==='water')signal=grit*.90+Math.sin(phase*3.9)*.13;
  if(family==='cloth')signal=grit*.82+Math.sin(phase)*.05;
  if(isUI)signal=harmonic*.62+grit*.20;
  if(family==='mechanism'&&t>.055&&t<.092)
   signal+=noise*.45;
  if(family==='step'&&t>.06&&t<.105)
   signal+=grit*.33; // toe follow-through
  const envelope=isAmbient?
   Math.min(1,t/attack)*Math.min(1,(seconds-t)/.20)*.52:
   Math.min(1,t/attack)*Math.exp(-3.9*t/(base*(.56+
      settings.tail*.54)))+
   (t>base*.58?Math.exp(-7*(t-base*.58)/Math.max(.05,fade))*
      settings.tail*.09:0);
  const raw=signal*envelope;
  // Smooth limiting instead of unchecked peak amplification.
  out[i]=Math.tanh(raw*1.15)*.80;
 }
 // Low-cost early reflections (no reverb node/audio tail allocation).
 if(settings.room>.015){
  const delay=Math.floor(sampleRate*(.045+settings.room*.085));
  const amount=settings.room*.23;
  for(let i=length-1;i>=delay;i--)
   out[i]=Math.max(-1,Math.min(1,out[i]+out[i-delay]*amount));
 }
 return out;
}
export function encodeSoundWav(samples:Float32Array,sampleRate=rate):Uint8Array{
 const bytes=new Uint8Array(44+samples.length*2);
 const view=new DataView(bytes.buffer);
 const ascii=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)
   bytes[offset+i]=value.charCodeAt(i);};
 ascii(0,'RIFF');view.setUint32(4,bytes.length-8,true);
 ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);
 view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);
 view.setUint16(32,2,true);view.setUint16(34,16,true);
 ascii(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){
  const sample=Math.max(-1,Math.min(1,samples[i]));
  view.setInt16(44+i*2,sample<0?Math.round(sample*32768):
   Math.round(sample*32767),true);
 }
 return bytes;
}
export function downloadSound(bytes:BlobPart[],name:string,
 type='application/octet-stream'){
 const url=URL.createObjectURL(new Blob(bytes,{type}));
 const a=document.createElement('a');a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),8000);
}
function crc32(bytes:Uint8Array){
 let crc=0xffffffff;
 for(const byte of bytes){crc^=byte;
  for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^0xffffffff)>>>0;
}
/** Browser-native uncompressed ZIP (no third-party library or external upload). */
export function packageSoundZip(files:{name:string;data:Uint8Array}[]){
 const enc=new TextEncoder(),chunks:Uint8Array[]=[],central:Uint8Array[]=[];
 let offset=0,centralBytes=0;
 const header=(length:number)=>new Uint8Array(length);
 const set16=(d:Uint8Array,o:number,n:number)=>
   new DataView(d.buffer).setUint16(o,n,true);
 const set32=(d:Uint8Array,o:number,n:number)=>
   new DataView(d.buffer).setUint32(o,n,true);
 for(const file of files){
  const name=enc.encode(file.name),size=file.data.length,crc=crc32(file.data);
  const local=header(30+name.length);
  set32(local,0,0x04034b50);set16(local,4,20);
  set16(local,8,0);set32(local,14,crc);
  set32(local,18,size);set32(local,22,size);
  set16(local,26,name.length);local.set(name,30);
  chunks.push(local,file.data);
  const meta=header(46+name.length);
  set32(meta,0,0x02014b50);set16(meta,4,20);set16(meta,6,20);
  set32(meta,16,crc);set32(meta,20,size);set32(meta,24,size);
  set16(meta,28,name.length);set32(meta,42,offset);
  meta.set(name,46);central.push(meta);centralBytes+=meta.length;
  offset+=local.length+size;
 }
 const end=header(22);
 set32(end,0,0x06054b50);set16(end,8,files.length);
 set16(end,10,files.length);set32(end,12,centralBytes);set32(end,16,offset);
 const result=new Uint8Array(offset+centralBytes+end.length);
 let p=0;for(const chunk of [...chunks,...central,end]){
  result.set(chunk,p);p+=chunk.length;
 }
 return result;
}
export type PlayOptions={level?:number;pan?:number;
 output?:AudioNode|null;rate?:number;acoustics?:AcousticResponse|null;
 /** Opt-in live-game physicality. Sound Lab and legacy test mix remain dry. */
 liveTactile?:boolean;variationSeed?:number;
 onSource?:(source:AudioBufferSourceNode)=>void;}
const bufferCache=new WeakMap<AudioContext,Map<string,AudioBuffer>>();
/** No autoplay: caller must unlock AudioContext on a user gesture. */
export function playDesignedSound(ctx:AudioContext,id:string,
 settings:SoundSettings,options:PlayOptions={}):AudioBufferSourceNode|null{
 if(ctx.state!=='running')return null;
 const tactile=options.liveTactile===true&&tactileProfile(id)!==null;
 const environment=options.acoustics;
 const key=id+'|'+Object.values(settings).join(',')+
  '|room='+(environment?.key??'dry')+'|body='+(tactile?'S4':'original');
 let cache=bufferCache.get(ctx);
 if(!cache){cache=new Map();bufferCache.set(ctx,cache);}
 let buffer=cache.get(key);
 if(!buffer){
  const sourcePCM=renderSound(id,settings,ctx.sampleRate);
  if(!sourcePCM.length)return null;
  const dry=tactile?renderTactileBody(id,sourcePCM,ctx.sampleRate):sourcePCM;
  // Room reverb still varies with space; only halve its redundant bass boost
  // when a physical low-end impulse is already added to the dry sound.
  const acoustic=environment&&tactile?
   {...environment,bass:environment.bass*.52}:environment;
  const pcm=acoustic?renderAcousticResponse(dry,ctx.sampleRate,acoustic):dry;
  buffer=ctx.createBuffer(1,pcm.length,ctx.sampleRate);
  buffer.getChannelData(0).set(pcm);
  if(cache.size>=64)cache.delete(cache.keys().next().value!);
  cache.set(key,buffer);
 }
 const variation=tactile?variationForSound(id,options.variationSeed??0):
  {rate:1,timbreDb:0,gain:1};
 const source=ctx.createBufferSource();source.buffer=buffer;
 source.playbackRate.value=Math.max(.25,Math.min(4,
  (options.rate??1)*variation.rate));
 const gain=ctx.createGain();
 gain.gain.value=Math.min(.8,Math.max(0,settings.gain))*
  Math.max(0,Math.min(1,options.level??1))*.40*variation.gain;
 source.connect(gain);
 let output:AudioNode=gain;
 let color:BiquadFilterNode|null=null;
 if(tactile&&variation.timbreDb!==0){
  color=ctx.createBiquadFilter();color.type='peaking';
  color.frequency.value=1480;color.Q.value=.80;
  color.gain.value=variation.timbreDb;
  output.connect(color);output=color;
 }
 let panNode:StereoPannerNode|null=null;
 if(typeof ctx.createStereoPanner==='function'){
  panNode=ctx.createStereoPanner();
  panNode.pan.value=Math.max(-1,Math.min(1,options.pan??0));
  output.connect(panNode);output=panNode;
 }
 output.connect(ctx.destination);
 if(options.output)output.connect(options.output);
 source.onended=()=>{
  source.disconnect();gain.disconnect();color?.disconnect();
  panNode?.disconnect();
 };
 source.start();
 return source;
}
/** In-game bridge. Returns true for a recognized cue, including user-muted cues.
 * Unknown ids fall through to the previous generic tone system.
 */
export function playPackSound(ctx:AudioContext,id:string,
 options:PlayOptions={},pack?:SoundPack):boolean{
 if(!SOUND_BY_ID.has(id))return false;
 const saved=pack??readSoundPack();
 const choice=saved.choices[id];
 if(!choice?.enabled||saved.master<=0)return true;
 const settings=resolvePlayableSoundSettings(saved,id);
 if(!settings)return true;
 // New exploratory sounds stay audition-only until explicitly chosen in Wave 01.
 // Older v1 packs and first-time visitors keep their established game audio.
 const approved=saved.choices[id]?.explored===true;
 const playable=approved?settings:{...settings,concept:-1};
 const source=playDesignedSound(ctx,id,{...playable,
  gain:playable.gain*saved.master},options);
 if(source)options.onSource?.(source);
 return true;
}
