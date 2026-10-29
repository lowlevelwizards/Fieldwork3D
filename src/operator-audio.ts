/** Build 048. A tiny original procedural footfall synthesizer — unlocked
 * on the first deliberate gesture, entirely optional and never autoplayed.
 * Footsteps are emitted by measured foot travel in ActorFigure. */
export class FootstepAudio{
 private ctx:AudioContext|null=null;
 muted=true;
 enable(){
   if(typeof window==='undefined')return;
   try{
     this.ctx??=new AudioContext();
     void this.ctx.resume().catch(()=>{});
     this.muted=false;
   }catch{this.muted=true;}
 }
 toggle(){if(this.muted)this.enable();else this.muted=true;}
 step(wet:boolean,road:boolean){
   const ctx=this.ctx;
   if(!ctx||this.muted||ctx.state!=='running')return;
   const duration=wet?.11:.070,sampleRate=ctx.sampleRate;
   const buffer=ctx.createBuffer(1,Math.ceil(duration*sampleRate),sampleRate);
   const samples=buffer.getChannelData(0);
   for(let i=0;i<samples.length;i++){
     const t=i/sampleRate,env=Math.pow(1-t/duration,2);
     // Deterministic short banded thud, not an ambient loop or melody.
     const low=Math.sin(2*Math.PI*(wet?94:road?126:103)*t)*.48;
     const grit=(Math.sin(i*12.9898)*Math.sin(i*.3457))*.18;
     samples[i]=env*(low+grit);
   }
   const source=ctx.createBufferSource();source.buffer=buffer;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';
   filter.frequency.value=wet?440:road?980:680;
   const gain=ctx.createGain();gain.gain.value=.13;
   source.connect(filter).connect(gain).connect(ctx.destination);
   source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
   source.start();
 }
 dispose(){void this.ctx?.close().catch(()=>{});this.ctx=null;}
}
