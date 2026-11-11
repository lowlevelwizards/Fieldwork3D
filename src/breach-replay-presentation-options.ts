/** Transient replay display *preferences*, never recorded knowledge or playback.
 * Keep immutable snapshots stable between UI actions for render-frame callers.
 */
export type ReplayPreset='clean'|'movement'|'combat'|'visibility'|'custom';
export type ReplayPlanScope='all'|'selected'|'none';
export type ReplayPlanVersion='active'|'original';
export type ReplayTraceMode='off'|'recent'|'selected';
export type ReplayGhostMode='off'|'selected'|'squad';
export type ReplayTrailMode='off'|'recent'|'full';

export type ReplayPresentationOptions=Readonly<{
 replayXrayOn:boolean;
 replayAnalysis:boolean;
 replayPlanScope:ReplayPlanScope;
 replayPlanVersion:ReplayPlanVersion;
 replayNameTags:boolean;
 replayContactMarkers:boolean;
 replayObjectiveMarkers:boolean;
 replayTraceMode:ReplayTraceMode;
 replayGhostMode:ReplayGhostMode;
 replayTrailMode:ReplayTrailMode;
 replayPreset:ReplayPreset;
}>;

export const INITIAL_REPLAY_PRESENTATION_OPTIONS:ReplayPresentationOptions=
 Object.freeze({
  replayXrayOn:false,replayAnalysis:false,
  replayPlanScope:'selected',replayPlanVersion:'active',
  replayNameTags:true,replayContactMarkers:true,replayObjectiveMarkers:true,
  replayTraceMode:'off',replayGhostMode:'off',replayTrailMode:'off',
  replayPreset:'clean'
 });

export const REPLAY_ENTRY_PRESENTATION_OPTIONS:ReplayPresentationOptions=
 Object.freeze({
  ...INITIAL_REPLAY_PRESENTATION_OPTIONS,
  replayXrayOn:true,replayPlanScope:'none'
 });

export function createReplayPresentationOptions(){
 let options:ReplayPresentationOptions=INITIAL_REPLAY_PRESENTATION_OPTIONS;
 const patch=(next:Partial<ReplayPresentationOptions>):ReplayPresentationOptions=>{
  // Avoid new objects and redraw churn for no-op actions.
  if(Object.entries(next).every(([key,value])=>
    options[key as keyof ReplayPresentationOptions]===value))return options;
  options=Object.freeze({...options,...next});return options;
 };
 const resetForReplay=()=>{
  options=REPLAY_ENTRY_PRESENTATION_OPTIONS;return options;
 };
 const resetForMission=()=>{
  options=INITIAL_REPLAY_PRESENTATION_OPTIONS;return options;
 };
 const clearOverlays=()=>patch({
  replayNameTags:false,replayContactMarkers:false,
  replayPlanScope:'none',replayObjectiveMarkers:false,replayAnalysis:false,
  replayTraceMode:'off',replayGhostMode:'off',replayTrailMode:'off'
 });
 const setPreset=(preset:ReplayPreset)=>patch({replayPreset:preset});
 const applyPreset=(preset:Exclude<ReplayPreset,'custom'>)=>{
  // Match legacy presets exactly: unspecified fields stay unchanged.
  setPreset(preset);
  if(preset==='clean')return clearOverlays();
  if(preset==='movement')return patch({
   replayAnalysis:true,replayPlanScope:'selected',replayPlanVersion:'active',
   replayTraceMode:'off',replayGhostMode:'off',replayTrailMode:'recent'
  });
  if(preset==='combat')return patch({
   replayAnalysis:false,replayPlanScope:'none',replayTraceMode:'recent',
   replayGhostMode:'off',replayTrailMode:'off'
  });
  // Visibility is a display preset; recorded sight/observer is untouched.
  return patch({
   replayAnalysis:false,replayPlanScope:'none',replayTraceMode:'off',
   replayGhostMode:'off',replayTrailMode:'off'
  });
 };
 return {
  get options():ReplayPresentationOptions{return options;},
  patch,resetForReplay,resetForMission,clearOverlays,
  setPreset,applyPreset
 };
}
export type ReplayPresentationOptionsController=
 ReturnType<typeof createReplayPresentationOptions>;
