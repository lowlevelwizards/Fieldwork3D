/** VIS-01: A stable, presentation-only fog cache fingerprint.
 * Changing a briefing mode or replacing a site must invalidate the mask,
 * even when the number of discovered cells is unchanged.
 */
export type FogFingerprintInput={
  mode:string;seed:number|null;seenCount:number;revision:number;
  seenRevision?:number;
  actors:readonly {id:string;x:number;y:number;heading:number;
    posture:string;health:number}[];
  doors:readonly {id:string;fraction:number}[];
};
/** Preserve the exact historical delimiter/quantization contract without
 * allocating a temporary array for every actor and door at each repaint. */
function fogHeader(mode:string,seed:number|null,seenCount:number,
  seenRevision:number|undefined,revision:number):string{
  return mode+'|'+(seed??'none')+'|'+seenCount+'|'+
    (seenRevision??0)+'|'+revision;
}
export function fogFingerprint(state:FogFingerprintInput):string{
  let key=fogHeader(state.mode,state.seed,state.seenCount,
    state.seenRevision,state.revision);
  for(const a of state.actors)
    key+='|'+a.id+':'+Math.round(a.x*10)+':'+
      Math.round(a.y*10)+':'+Math.round(a.heading*100)+':'+
      a.posture+':'+a.health;
  for(const d of state.doors)
    key+='|'+d.id+':'+Math.round(d.fraction*100);
  return key;
}

/** Persistent memories can change much less often than moving sight cones.
 * Only scalar revisions and site identity enter this hot-path key. */
export function fogMemoryFingerprint(state:{
  mode:string;seed:number|null;seenRevision:number;
  rooms:number;walls:number;doors:number;cover:number;
}):string{
  return [state.mode,state.seed??'none',state.seenRevision,
    state.rooms,state.walls,state.doors,state.cover].join('|');
}

/** One live fog signature for Canvas2D and Three.js. No new LOS work.
 * Time and session identity are independent: renderers compare the latter
 * themselves so two sites with identical seed/actor data never share fog.
 */
import type {Session} from './breach-game.ts';
import {effectiveEyeHeight} from './breach-cover-height.ts';
export function fogSessionFingerprint(s:Session):string{
 let key=fogHeader(s.intel.mode,s.site?.seed??null,
   s.seenGround.size,s.seenGroundRevision,s.objectRevision);
 // Iterate the authoritative ordered roster directly: hidden hostiles do not
 // participate in player sight, and no temporary filter/map arrays are built.
 for(const a of s.operators){
   if(a.side!=='blue'||a.health<=0)continue;
   key+='|'+a.id+':'+Math.round(a.p.x*10)+':'+
     Math.round(a.p.y*10)+':'+Math.round(a.heading*100)+':'+
     a.posture+':'+a.health;
   // Match liveVisibility's low-eye blocker rule. Standing cover dips
   // can change the sight polygon without changing nominal posture.
   if(a.posture!=='crouch'&&effectiveEyeHeight(a)<25)key+=':low-eye';
 }
 for(const d of s.doors)
   key+='|'+d.id+':'+
     Math.round((d.openFraction??(d.open?1:0))*100);
 return key;
}

/** W5: per-presentation refresh gate. A bounded poll for moving sight,
 * immediate invalidation for authoritative lifecycle/memory changes.
 * Never retain a Session's mutable intel or seenGround collection. */
export class FogRefreshGate {
 private session:Session|null=null;
 private site:Session['site']|null=null;
 private mode='';
 private seenRevision=-1;private seenCount=-1;private objectRevision=-1;
 private seconds=-Infinity;private observedSeconds=-Infinity;private signature='';
 get owner(){return this.session;}
 private elapsed=Infinity;
 invalidate(){this.session=null;this.elapsed=Infinity;this.signature='';}
 poll(s:Session,dt:number,period:number,replaying=false,forceProbe=false):{paint:boolean;memoryInvalid:boolean}{
  this.elapsed+=Math.max(0,dt);
  const ownerChanged=this.session!==s||this.site!==s.site;
  const memoryInvalid=ownerChanged||this.mode!==s.intel.mode||
   this.seenRevision!==s.seenGroundRevision||this.seenCount!==s.seenGround.size||
   s.seconds<this.seconds;
  const seek=replaying&&Math.abs(s.seconds-this.observedSeconds)>.15;
  this.observedSeconds=s.seconds;
  const urgent=memoryInvalid||this.objectRevision!==s.objectRevision||seek;
  if(!urgent&&!forceProbe&&this.elapsed<period)return {paint:false,memoryInvalid:false};
  const signature=fogSessionFingerprint(s);
  const paint=urgent||signature!==this.signature;
  // Reset the probe cadence even if unchanged: don't hash every idle RAF.
  this.elapsed=0;this.session=s;this.site=s.site;this.mode=s.intel.mode;
  this.seenRevision=s.seenGroundRevision;this.seenCount=s.seenGround.size;
  this.objectRevision=s.objectRevision;this.seconds=s.seconds;this.signature=signature;
  return {paint,memoryInvalid};
 }
}
