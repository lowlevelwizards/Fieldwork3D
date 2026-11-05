/** P6.2 — Render-only directional shadow invalidation.
 * Active simulation still refreshes every rendered frame: a reloading,
 * turning or walking soldier must NEVER cast a stale shadow. Paused
 * geometrically unchanged scenes reuse the prior shadow-map result.
 */
export class ShadowUpdateController{
  private fingerprint:string|null=null;
  refreshes=0;reuses=0;
  shouldRefresh(active:boolean,signature:string){
    if(active||this.fingerprint!==signature){
      this.fingerprint=signature;
      this.refreshes++;
      return true;
    }
    this.reuses++;
    return false;
  }
  invalidate(){this.fingerprint=null;}
}

/** An exact presentation fingerprint for stationary encounters. Call only
 * outside running simulation; live frames use the immediate-update path. */
export function stationaryShadowFingerprint(input:{
  site:number|null;phase:string;selected:string;
  focusX:number;focusY:number;objectRevision:number;
  known:number;intelMode:string;lighting:string;
  actors:readonly {
    id:string;x:number;y:number;heading:number;posture:string;
    health:number;weaponYaw:number;recoil:number;
    reload:number;stride:number;weapon:string;
    equipment?:unknown;wardrobe?:unknown
  }[];
  doors:readonly {id:string;fraction:number;open:boolean}[];
  poseTime:number;
}):string{
  // JSON is confined to unchanged planning/terminal views rather than
  // called across all actors 60 times per second during active gameplay.
  return JSON.stringify(input);
}
