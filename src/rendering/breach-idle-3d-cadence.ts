/** P2.2 — a *diagnostic experiment*, never an implicit production FPS cap.
 * This gates only a paused 3D scene's expensive WebGL update/submit. The
 * tactical RAF, input, HUD, order authoring and 2D overlays always continue.
 * Explicit ?idle3d=30 enables it; default behavior remains unchanged.
 */
export const IDLE_3D_TARGET_FRAME_MS=1000/30;
export const IDLE_3D_INPUT_GRACE_MS=800;
export type Idle3DFrameInput=Readonly<{
 enabled:boolean;mode:'idle'|'live'|'replay'|'suspended';
 inputGraceMs?:number;
 viewMode:'iso'|'top'|'plan2d';studioOccludes:boolean;
 now:number;lastSceneAt:number;lastSceneMode:string|null;
 sameSession:boolean;lastInputAt:number;
}>;
export function shouldSubmitIdle3D(x:Idle3DFrameInput):boolean{
 if(!x.enabled||x.mode!=='idle'||x.viewMode==='plan2d'||
    x.studioOccludes)return true;
 // A new mission, mode transition or initial rendering must never be held.
 if(!x.sameSession||x.lastSceneMode!=='idle'||
    !Number.isFinite(x.lastSceneAt))return true;
 // Dragging, tapping, zooming, keyboard commands and camera easing stay at
 // normal cadence. This is not an input/gameplay throttle.
 if(x.now-x.lastInputAt<(x.inputGraceMs??IDLE_3D_INPUT_GRACE_MS))return true;
 // Allow 1.5ms tolerance for browsers with 16.67ms RAF cadence.
 return x.now-x.lastSceneAt>=IDLE_3D_TARGET_FRAME_MS-1.5;
}
