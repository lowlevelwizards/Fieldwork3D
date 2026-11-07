/** Replay UX V2 — small, pure UI transition rules.
 * Recording state, historical disclosure and time sampling remain owned by replay.
 */
export type ReplaySurface='none'|'moments'|'analyze'|'share';
export type ReplayCameraChoice='free'|'operator'|'squad'|'director';
export type ReplayPerspective='iso'|'top'|'plan2d';
export const REPLAY_SPEED_OPTIONS=[0.25,0.5,0.75,1,1.5,2,4] as const;
export type ReplaySpeed=typeof REPLAY_SPEED_OPTIONS[number];

export function toggleReplaySurface(
  current:ReplaySurface,requested:Exclude<ReplaySurface,'none'>
):ReplaySurface{
  return current===requested?'none':requested;
}
export function replayCameraAvailable(
  choice:ReplayCameraChoice,perspective:ReplayPerspective,
  hasScene:boolean,bodycam:boolean
):boolean{
  if(bodycam)return choice==='free';
  if(choice==='squad'||choice==='director'||choice==='operator')
    return perspective!=='plan2d'&&hasScene;
  return true;
}
export function resolvedReplayCamera(
  choice:ReplayCameraChoice,perspective:ReplayPerspective,
  hasScene:boolean,bodycam:boolean
):ReplayCameraChoice{
  return replayCameraAvailable(choice,perspective,hasScene,bodycam)?
    choice:'free';
}
export function isReplaySpeed(value:number):value is ReplaySpeed{
  return REPLAY_SPEED_OPTIONS.some(speed=>speed===value);
}
export function clampReplayTime(time:number,duration:number):number{
  if(!Number.isFinite(duration)||duration<=0)return 0;
  if(!Number.isFinite(time))return 0;
  return Math.min(duration,Math.max(0,time));
}
