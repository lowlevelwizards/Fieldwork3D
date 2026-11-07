/** Tactile S4 live-playback pass. The Sound Lab master selections stay dry and
 * unaltered; the game optionally adds physical low-mid impulses after attack.
 * An independently chosen room acoustic response acts AFTER this dry treatment.
 * No allocations or random sampling inside the simulation update.
 */
const TAU=Math.PI*2;
export type TactileProfile={hz:number;body:number;decay:number;
 attack:number;pitchRange:number;events:readonly [number,number][]};
const weight=(hz:number,body:number,decay:number,attack:number,
 pitchRange:number,events:readonly [number,number][]=[[0,1]]):TactileProfile=>
 ({hz,body,decay,attack,pitchRange,events});
const PROFILES:Record<string,TactileProfile>={
 'weapons.smg':weight(106,.34,.120,.005,.048),
 'weapons.carbine':weight(96,.43,.165,.006,.048),
 'weapons.rifle':weight(79,.48,.190,.007,.043),
 'weapons.shotgun':weight(73,.51,.230,.008,.050),
 'weapons.smg_suppressed':weight(116,.22,.100,.004,.050),
 'weapons.carbine_suppressed':weight(110,.26,.114,.005,.047),
 'weapons.rifle_suppressed':weight(105,.28,.135,.005,.046),
 'weapons.shotgun_suppressed':weight(91,.28,.150,.007,.045),
 'combat.flash':weight(67,.56,.290,.008,.048,[[0,1],[.075,.18]]),
 'doors.kick':weight(94,.46,.175,.009,.070,[[0,1],[.10,.25]]),
 'doors.kick_resisted':weight(114,.36,.134,.009,.065),
 'doors.forced_open':weight(95,.40,.189,.009,.065,[[0,1],[.10,.23]]),
 'doors.close':weight(119,.33,.143,.009,.069,[[0,1],[.08,.20]]),
 'doors.open':weight(158,.17,.092,.007,.066),
 'movement.boot':weight(129,.25,.100,.008,.082,[[0,1],[.057,.24]]),
 'impacts.body_hit':weight(100,.36,.150,.008,.072),
 'equipment.reload':weight(188,.18,.086,.005,.072,[[.047,.75],[.136,1],[.265,.67]]),
 'equipment.mag_out':weight(202,.10,.050,.004,.073),
 'equipment.mag_in':weight(197,.16,.077,.004,.070),
 'equipment.bolt_release':weight(165,.18,.093,.004,.064),
 'equipment.charging_handle':weight(196,.14,.074,.004,.064),
 'equipment.flash_throw':weight(190,.10,.060,.004,.060)
};
export function tactileProfile(id:string):TactileProfile|null{
 return PROFILES[id]??null;
}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
/** Seeded, non-looping microvariation. No Math.random, no extra PCM cache keys.
 * Different adjacent event ids cycle through distinct pitch/timbre directions.
 * The Sound Lab and all UI/planning cues remain unchanged.
 */
export function variationForSound(id:string,seed:number){
 const p=tactileProfile(id);
 if(!p)return {rate:1,timbreDb:0,gain:1};
 const raw=Math.abs(Math.floor(Number.isFinite(seed)?seed:0));
 // Coprime stride 5 avoids repeating the immediately preceding variation.
 const i=(raw*5+hashString(id))%8;
 const rateSequence=[-.85,.41,-.20,.89,-.56,.13,.68,-.34];
 const timbreSequence=[-.8,.6,-.3,.85,.2,-.65,.45,-.1];
 const gainSequence=[-.6,.35,-.24,.5,.15,-.43,.66,-.39];
 return {
  rate:1+rateSequence[i]*p.pitchRange,
  timbreDb:timbreSequence[i]*2.8,
  gain:1+gainSequence[i]*.045
 };
}
export function hashString(input:string):number{
 let h=2166136261;
 for(let i=0;i<input.length;i++)
  h=Math.imul(h^input.charCodeAt(i),16777619)>>>0;
 return h>>>0;
}
/** Bass is a physical, non-reverberant stage—not extra room bass.
 * The second harmonic makes mass audible on compact phone speakers.
 * Preserve the original contact edge; stronger resonance begins a few ms
 * after the hit and fades before the room's reflections take over.
 */
export function renderTactileBody(id:string,dry:Float32Array,
 sampleRate:number):Float32Array{
 const p=tactileProfile(id);
 if(!p||!dry.length)return dry;
 const sr=clamp(Math.round(sampleRate),4000,96000);
 const out=new Float32Array(dry);
 // Gently reinforce existing low mids, but do not replace contact detail.
 let low=0;
 const alpha=Math.min(.94,TAU*210/sr);
 for(let i=0;i<out.length;i++){
  low+=(dry[i]-low)*alpha;
  out[i]+=low*.115;
 }
 for(const [start,scale] of p.events){
  const offset=Math.round(start*sr);
  const end=Math.min(out.length,offset+Math.ceil(p.decay*5*sr));
  let phase=0,phase2=0;
  for(let i=offset;i<end;i++){
   const t=(i-offset)/sr;
   const rise=1-Math.exp(-t/Math.max(.002,p.attack));
   const envelope=rise*Math.exp(-t/p.decay);
   const freq=p.hz*(1-.17*Math.min(1,t/(p.decay*1.2)));
   phase+=TAU*freq/sr;phase2+=TAU*freq*2.05/sr;
   const body=Math.sin(phase)*.64+Math.sin(phase2)*.37+
    Math.sin(phase*.55)*.15;
   out[i]+=body*envelope*p.body*scale;
  }
 }
 let peak=0;
 for(const value of out)peak=Math.max(peak,Math.abs(value));
 const trim=peak>.92?.92/peak:1;
 if(trim!==1)for(let i=0;i<out.length;i++)out[i]*=trim;
 return out;
}
