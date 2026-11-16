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
 }
 for(const d of s.doors)
   key+='|'+d.id+':'+
     Math.round((d.openFraction??(d.open?1:0))*100);
 return key;
}
