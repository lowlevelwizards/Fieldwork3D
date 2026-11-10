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
export function fogFingerprint(state:FogFingerprintInput):string{
  return [state.mode,state.seed??'none',state.seenCount,
    state.seenRevision??0,state.revision,
    ...state.actors.map(a=>[
      a.id,Math.round(a.x*10),Math.round(a.y*10),
      Math.round(a.heading*100),a.posture,a.health
    ].join(':')),
    ...state.doors.map(d=>d.id+':'+Math.round(d.fraction*100))
  ].join('|');
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
 return fogFingerprint({
   mode:s.intel.mode,seed:s.site?.seed??null,
   seenCount:s.seenGround.size,seenRevision:s.seenGroundRevision,
   revision:s.objectRevision,
   actors:s.operators.filter(a=>a.side==='blue'&&a.health>0).map(a=>({
     id:a.id,x:a.p.x,y:a.p.y,heading:a.heading,
     posture:a.posture,health:a.health
   })),
   doors:s.doors.map(d=>({id:d.id,
     fraction:d.openFraction??(d.open?1:0)}))
 });
}
