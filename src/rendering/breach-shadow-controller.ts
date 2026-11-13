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

/** Direct paused-scene shadow comparison. Unlike JSON fingerprints, this
 * allocates nothing when an idle frame is unchanged. The saved appearance
 * key is produced by the already-running rig/wardrobe presentation and
 * detects in-place Studio edits (rather than trusting mutable references).
 * In-progress animation always takes the immediate-refresh path.
 */
export type PausedShadowActor={
 id:string;p:{x:number;y:number};heading:number;posture:string;
 health:number;weaponYaw:number;recoil:number;reload:number;
 stride:number;weapon:string;equipment?:unknown;wardrobe?:unknown
};
export type PausedShadowDoor={
 id:string;open:boolean;openFraction?:number
};
export type PausedShadowScene={
 site:number|null;phase:string;selected:string;
 focusX:number;focusY:number;objectRevision:number;
 known:number;intelMode:string;lighting:string;
 poseTime:number;simulationTime:number;
 actors:readonly PausedShadowActor[];
 doors:readonly PausedShadowDoor[];
 /** Existing live operator-rig appearance fingerprint (or undefined before
  * that actor has been built). Evaluated for every actor every idle frame. */
 appearanceKey:(actor:PausedShadowActor)=>string|undefined;
};
type ShadowActorStamp={
 id:string;x:number;y:number;heading:number;posture:string;
 health:number;weaponYaw:number;recoil:number;reload:number;
 stride:number;weapon:string;appearance:string
};
type ShadowDoorStamp={id:string;fraction:number;open:boolean};
type ShadowSceneStamp={
 site:number|null;phase:string;selected:string;
 focusX:number;focusY:number;objectRevision:number;known:number;
 intelMode:string;lighting:string;poseTime:number;simulationTime:number;
 actors:ShadowActorStamp[];doors:ShadowDoorStamp[];
};
export class PausedShadowSceneController{
 private snapshot:ShadowSceneStamp|null=null;
 refreshes=0;reuses=0;
 invalidate(){this.snapshot=null;}
 shouldRefresh(active:boolean,scene:PausedShadowScene):boolean{
  // Running and finishing animation must refresh shadows every frame.
  if(active){this.snapshot=null;this.refreshes++;return true;}
  const prev=this.snapshot;
  let same=!!prev&&
   prev.site===scene.site&&prev.phase===scene.phase&&
   prev.selected===scene.selected&&prev.focusX===scene.focusX&&
   prev.focusY===scene.focusY&&
   prev.objectRevision===scene.objectRevision&&
   prev.known===scene.known&&prev.intelMode===scene.intelMode&&
   prev.lighting===scene.lighting&&prev.poseTime===scene.poseTime&&
   prev.simulationTime===scene.simulationTime&&
   prev.actors.length===scene.actors.length&&
   prev.doors.length===scene.doors.length;
  // Key computation is already done by the rig before shadow submission.
  // Do not hold equipment/wardrobe references: these mutate in the Studio.
  const appearance=(a:PausedShadowActor)=>
    scene.appearanceKey(a)??JSON.stringify([a.equipment??null,a.wardrobe??null]);
  if(same)for(let i=0;i<scene.actors.length;i++){
   const a=scene.actors[i],b=prev!.actors[i];
   if(a.id!==b.id||a.p.x!==b.x||a.p.y!==b.y||
      a.heading!==b.heading||a.posture!==b.posture||
      a.health!==b.health||a.weaponYaw!==b.weaponYaw||
      a.recoil!==b.recoil||a.reload!==b.reload||
      a.stride!==b.stride||a.weapon!==b.weapon||
      appearance(a)!==b.appearance){same=false;break;}
  }
  if(same)for(let i=0;i<scene.doors.length;i++){
   const d=scene.doors[i],p=prev!.doors[i];
   if(d.id!==p.id||d.open!==p.open||
      (d.openFraction??(d.open?1:0))!==p.fraction){
    same=false;break;
   }
  }
  if(same){this.reuses++;return false;}
  this.snapshot={
   site:scene.site,phase:scene.phase,selected:scene.selected,
   focusX:scene.focusX,focusY:scene.focusY,
   objectRevision:scene.objectRevision,known:scene.known,
   intelMode:scene.intelMode,lighting:scene.lighting,
   poseTime:scene.poseTime,simulationTime:scene.simulationTime,
   actors:scene.actors.map(a=>({
    id:a.id,x:a.p.x,y:a.p.y,heading:a.heading,
    posture:a.posture,health:a.health,weaponYaw:a.weaponYaw,
    recoil:a.recoil,reload:a.reload,stride:a.stride,
    weapon:a.weapon,appearance:appearance(a)
   })),
   doors:scene.doors.map(d=>({id:d.id,open:d.open,
    fraction:d.openFraction??(d.open?1:0)}))
  };
  this.refreshes++;return true;
 }
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
  poseTime:number;simulationTime:number;
}):string{
  // JSON is confined to unchanged planning/terminal views rather than
  // called across all actors 60 times per second during active gameplay.
  return JSON.stringify(input);
}

/** Tiny cube accents cast no discernible tactical silhouette at normal zoom.
 * Medium structural bars and all major fixtures keep their real shadows. */
export const shadowEligibleBox=(w:number,h:number,d:number):boolean=>
  Math.abs(w*h*d)>=64;
