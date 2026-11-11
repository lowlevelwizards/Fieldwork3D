/** Navigation semantics only: neither the tactical Session nor its playback
 * recorder ever lives in this module. All presentation/worker side effects
 * remain with their existing mission, replay and UI controllers.
 */
import type {CampaignMode} from './breach-app-mode.ts';
import type {Session} from './breach-game.ts';

export type AppSurface='menu'|'home'|'briefing'|'tactical'|'debrief'|'replay';
export type AppOverlay='quick-play-creator'|'settings'|'replay-library'|null;
export type ReplayEntry='debrief'|'library';
export type AppFlowSnapshot=Readonly<{
 mode:CampaignMode;
 surface:AppSurface;
 overlay:AppOverlay;
 replayReturn:Exclude<AppSurface,'replay'>|null;
 replayEntry:ReplayEntry|null;
 libraryReturnsToMenu:boolean;
}>;

export function createBreachAppFlow(initialMode:CampaignMode){
 let mode=initialMode;
 let surface:AppSurface=mode==='menu'?'menu':mode==='home'?'home':'tactical';
 let overlay:AppOverlay=null;
 let replayReturn:Exclude<AppSurface,'replay'>|null=null;
 let replayEntry:ReplayEntry|null=null;
 let libraryReturnsToMenu=false;
 const inMission=()=>mode==='quick'||mode==='mission';
 const snapshot=():AppFlowSnapshot=>Object.freeze({
  mode,surface,overlay,replayReturn,replayEntry,libraryReturnsToMenu
 });
 return {
  get mode(){return mode;},
  get surface(){return surface;},
  get overlay(){return overlay;},
  get replayReturn(){return replayReturn;},
  snapshot,
  /** Menu/Home are actual top-level surfaces; Quick/Campaign are mission
   * context labels and cannot independently create a new mission screen.
   */
  setMode(next:CampaignMode):void{
   mode=next;
   if(next==='menu'||next==='home'){
    surface=next;overlay=null;replayReturn=null;replayEntry=null;
    libraryReturnsToMenu=false;
   }
  },
  /** Invoked only after the mission controller has actually mounted a
   * replacement Session; opening overlays never calls this method.
   */
  missionMounted():void{
   if(!inMission())return;
   surface='tactical';overlay=null;
   replayReturn=null;replayEntry=null;libraryReturnsToMenu=false;
  },
  /** Reconcile terminal/deploy phases from the simulation's actual state.
   * Planning does not auto-close a briefing or invent a new one.
   */
  observePhase(phase:Session['phase']):void{
   if(!inMission()||surface==='replay')return;
   if(phase==='won'||phase==='lost'){surface='debrief';overlay=null;}
   else if(phase==='running'){surface='tactical';if(overlay==='settings')overlay=null;}
   else if(surface==='debrief')surface='tactical';
  },
  briefingVisibility(visible:boolean):boolean{
   if(!inMission()||surface==='replay')return false;
   if(visible){surface='briefing';if(overlay==='settings')overlay=null;}
   else if(surface==='briefing')surface='tactical';
   return true;
  },
  settingsVisibility(visible:boolean):boolean{
   if(!inMission()||surface==='replay')return false;
   if(visible){
    if(overlay&&overlay!=='settings')return false;
    overlay='settings';
   }else if(overlay==='settings')overlay=null;
   return true;
  },
  creatorVisibility(visible:boolean):boolean{
   if(surface==='replay')return false;
   if(visible){
    if(overlay&&overlay!=='quick-play-creator')return false;
    overlay='quick-play-creator';
   }else if(overlay==='quick-play-creator')overlay=null;
   return true;
  },
  /** A library opened from the front menu must continue to return there
   * through archive playback, but a debrief library must not force a menu.
   */
  openLibrary(fromMenu=false):boolean{
   if(surface==='replay')return false;
   if(overlay&&overlay!=='replay-library')return false;
   if(fromMenu)libraryReturnsToMenu=true;
   overlay='replay-library';return true;
  },
  /** Returns true only when the caller needs to reveal the title menu.
   * The UI controller alone owns actual library/dialog closing and focus.
   */
  closeLibrary(restoreMenu=true):boolean{
   if(overlay==='replay-library')overlay=null;
   if(!restoreMenu)return false;
   const shouldRestore=libraryReturnsToMenu;
   libraryReturnsToMenu=false;
   if(shouldRestore){mode='menu';surface='menu';}
   return shouldRestore;
  },
  beginReplay(entry:ReplayEntry):boolean{
   if(surface==='replay')return false;
   if(entry==='library'&&!inMission()&&!libraryReturnsToMenu&&
      surface!=='menu'&&surface!=='home')return false;
   replayReturn=surface;
   replayEntry=entry;surface='replay';overlay=null;
   return true;
  },
  /** Exit the historical view; library hooks may then reopen the library
   * overlay, while a debrief return restores its mounted workspace.
   */
  exitReplay():boolean{
   if(surface!=='replay'||!replayReturn)return false;
   surface=replayReturn;replayReturn=null;replayEntry=null;overlay=null;
   return true;
  }
 };
}
export type BreachAppFlow=ReturnType<typeof createBreachAppFlow>;
