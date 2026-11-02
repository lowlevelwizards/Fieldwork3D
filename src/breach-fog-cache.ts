/** VIS-01: A stable, presentation-only fog cache fingerprint.
 * Changing a briefing mode or replacing a site must invalidate the mask,
 * even when the number of discovered cells is unchanged.
 */
export type FogFingerprintInput={
  mode:string;seed:number|null;seenCount:number;revision:number;
  actors:readonly {id:string;x:number;y:number;heading:number;
    posture:string;health:number}[];
  doors:readonly {id:string;fraction:number}[];
};
export function fogFingerprint(state:FogFingerprintInput):string{
  return [state.mode,state.seed??'none',state.seenCount,state.revision,
    ...state.actors.map(a=>[
      a.id,Math.round(a.x*10),Math.round(a.y*10),
      Math.round(a.heading*100),a.posture,a.health
    ].join(':')),
    ...state.doors.map(d=>d.id+':'+Math.round(d.fraction*100))
  ].join('|');
}
