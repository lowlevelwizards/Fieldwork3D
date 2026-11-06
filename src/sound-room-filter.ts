/** Offline procedural acoustic filter applied to a dry game cue at playback.
 * Distinct environments generate early echoes, low-frequency buildup and
 * decaying diffuse reflections. The dry cue is ALWAYS the same Wave 03 source.
 * CPU: O(samples × 5), with the resulting AudioBuffer cached in sound-synth.
 * No ray tracing, allocations or geometry work on the 60 Hz simulation tick.
 */
export type AcousticResponse={
 /** Stable quantized fingerprint for AudioBuffer cache and test logs. */
 key:string;
 space:'small'|'medium'|'large'|'exterior';
 /** Length before the first wall return, in seconds. */
 early:number;
 /** Wet reflection amplitude, bounded to avoid tiring overlapping gunfire. */
 wet:number;
 /** Room decay in seconds; exterior reflections decay almost immediately. */
 tail:number;
 /** Relative near-field room resonance; never replaces the source bass. */
 bass:number;
 /** Absorption of high frequencies in the reflected path. */
 damping:number;
 /** Barrier muffling on the direct sound; independent from perceived volume. */
 occlusion:number;
};
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
/** Deterministic tiny tapped/damped reverb; no network audio assets needed. */
export function renderAcousticResponse(dry:Float32Array,
 sampleRate:number,response:AcousticResponse):Float32Array{
 if(!dry.length)return new Float32Array(0);
 const rate=Math.max(4000,Math.min(96000,Math.round(sampleRate)));
 const p=response;
 const needed=Math.ceil(clamp(p.tail,.03,1.4)*rate);
 const out=new Float32Array(dry.length+needed);
 // First lowpass separates low-end pressure from high-pitched muzzle edge.
 // Muffle is for barriers; bass is from room resonances. They are separate.
 let low=0,blocked=0;
 const lo=Math.min(.92,2*Math.PI*170/rate);
 const cut=Math.min(.92,2*Math.PI*(3100-2600*clamp(p.occlusion,0,1))/rate);
 const strength=clamp(p.occlusion,0,.85);
 const reference=new Float32Array(dry.length);
 for(let i=0;i<dry.length;i++){
  const v=dry[i];
  low+=(v-low)*lo;
  blocked+=(v-blocked)*cut;
  const x=v*(1-strength)+blocked*strength;
  // The resonant boost should remain small relative to dry transient.
  const shaped=x+low*clamp(p.bass,0,.3);
  reference[i]=shaped;
  out[i]+=shaped;
 }
 if(p.wet>.002){
  const delays=[1,1.53,2.13,3.02,4.41];
  const gains=[.52,.35,.24,.13,.085];
  const wet=clamp(p.wet,0,.48);
  const tail=clamp(p.tail,.04,1.4);
  // A little density from unequal early/late bounces; keep outdoor dry.
  for(let k=0;k<delays.length;k++){
   const offset=Math.max(1,Math.round(p.early*delays[k]*rate));
   if(offset>=out.length)continue;
   let reflected=0;
   const dampHz=clamp(6400*(1-clamp(p.damping,0,.94))*.95+.4*1300,
    300,7500);
   const damp=Math.min(.9,2*Math.PI*dampHz/rate);
   const decay=Math.exp(-(offset/rate)/tail);
   const scale=wet*gains[k]*decay;
   for(let i=0;i<reference.length&&i+offset<out.length;i++){
    reflected+=(reference[i]-reflected)*damp;
    out[i+offset]+=reflected*scale;
   }
  }
  // Repeated, increasingly damped reverberant contacts in large/hard rooms.
  // A sparse FDN approximation (one bounded feedback delay) is sufficient
  // for mobile; zero feedback when outside.
  const feedbackDelay=Math.max(1,Math.round((p.early*1.67+.011)*rate));
  const feedbackGain=clamp(.26*wet*Math.exp(-feedbackDelay/rate/tail),0,.13);
  if(feedbackGain>.003){
   let lp=0;
   const damping=Math.min(.8,2*Math.PI*(650+1900*(1-p.damping))/rate);
   const start=feedbackDelay*2;
   for(let i=start;i<out.length;i++){
    lp+=(out[i-feedbackDelay]-lp)*damping;
    const arrival=(i-dry.length)/rate;
    const envelope=arrival>0?Math.exp(-arrival/Math.max(.03,tail*.45)):1;
    out[i]+=lp*feedbackGain*envelope;
   }
  }
 }
 // Room reflections add energy: normalise by peak, never hard-clip the
 // sharp initial transient. The user's chosen waveform stays recognizable.
 let peak=0;
 for(const v of out)peak=Math.max(peak,Math.abs(v));
 const trim=peak>.92?.92/peak:1;
 for(let i=0;i<out.length;i++)out[i]*=trim;
 return out;
}
