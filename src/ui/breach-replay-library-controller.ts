/** Replay library orchestration: playback/save lifecycle, debrief favorites,
 * entry/return navigation and downloads. The library UI owns DOM rows and file
 * picker interactions; breach-replay-library.ts remains the storage authority.
 */
import {createReplayLibraryUi} from './breach-replay-library-ui.ts';
import {captureReplayArchive,restoreReplayArchive}
  from '../breach-replay-archive.ts';
import {loadSavedReplay,saveReplayArchive,getSavedReplayBookmarks,
  saveReplayBookmarks} from '../breach-replay-library.ts';
import {readFavoriteMissions,addFavoriteMission,removeFavoriteMission,
  writeFavoriteMissions,type FavoriteMission}
  from '../breach-mission-favorites.ts';
import {serializeReplayReport} from '../breach-replay-export-json.ts';
import type {MissionStartSnapshot} from '../breach-mission-restart.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import type {ReplayBookmark} from '../breach-replay-chapters.ts';

const FAVORITE_MISSIONS_STORAGE='fieldwork3d.favorite-missions.v1';
type ReplayLibraryElements={
  replayLibraryDialog:HTMLElement;
  replayLibraryStatus:HTMLElement;
  replayLibraryList:HTMLElement;
  replayLibraryBackdrop:HTMLElement;
  replayImportButton:HTMLButtonElement;
  replayImportInput:HTMLInputElement;
  openReplayLibrary:HTMLButtonElement;
  closeReplayLibrary:HTMLButtonElement;
  saveReplayDebrief:HTMLButtonElement;
  replaySaveArchive:HTMLButtonElement;
  favoriteMission:HTMLButtonElement;
  favoriteMissionsList:HTMLElement;
  replayExportJson:HTMLButtonElement;
};
type ReplayLibraryHooks={
  ui:ReplayLibraryElements;
  showUiHelp:(message:string,duration:number)=>void;
  closeMissionSettings:(restoreFocus:boolean)=>void;
  isReplaying:()=>boolean;
  getRecorder:()=>MissionRecorder;
  setRecorder:(recorder:MissionRecorder)=>void;
  getBookmarks:()=>ReplayBookmark[];
  applyLoadedBookmarks:(bookmarks:ReplayBookmark[])=>void;
  enterReplay:()=>void;
  exitReplay:()=>void;
  refreshHud:()=>void;
  getFavoriteDraft:()=>{start:MissionStartSnapshot;label:string}|null;
  playFavorite:(favorite:FavoriteMission)=>void;
  canPlayFavorite:()=>boolean;
  hideCampaignScreen:()=>void;
  returnToCampaignMenu:()=>void;
  /** Application flow owns title-menu return, not this archive controller. */
  onLibraryOpen?:(fromMenu:boolean)=>void;
  onLibraryClose?:(restoreMenu:boolean)=>boolean;
};

export function createBreachReplayLibraryController(config:ReplayLibraryHooks){
  const ui=config.ui;
  let previousRecorder:MissionRecorder|null=null;
  let activeSavedReplayId:string|null=null;
  let activeFavoriteId:string|null=null;
  let entrySource:'debrief'|'library'='debrief';
  const savedRecordingIds=new WeakMap<MissionRecorder,string>();
  const view=createReplayLibraryUi({
    ui,showUiHelp:config.showUiHelp,
    playSavedReplay:(id)=>{void playSavedReplay(id);},
    closeMissionSettings:config.closeMissionSettings,
    isReplaying:config.isReplaying
  });
  const failure=(error:unknown)=>view.failure(error);
  const show=(fromMenu=false)=>{
    view.show();
    config.onLibraryOpen?.(fromMenu);
  };
  const hide=(restoreMenu=true)=>{
    view.hide();
    if(config.onLibraryClose?.(restoreMenu))config.returnToCampaignMenu();
  };
  const renderFavorites=()=>{
    const list=ui.favoriteMissionsList;
    const entries=favoriteMissions().slice().reverse();
    const fragment=document.createDocumentFragment();
    if(!entries.length){
      const empty=document.createElement('p');
      empty.className='favorite-empty';
      empty.textContent='Favorite an operation from its debrief to play it again later.';
      fragment.append(empty);
    }
    for(const saved of entries){
      const row=document.createElement('div');
      row.className='favorite-mission-entry';
      row.setAttribute('role','listitem');
      const info=document.createElement('div');
      info.className='favorite-mission-name';
      const title=document.createElement('strong');title.textContent=saved.label;
      const caption=document.createElement('span');
      caption.textContent=saved.start.missionType.toUpperCase()+
        ' · '+(saved.start.site?.scale??'standard').toUpperCase();
      info.append(title,caption);
      const play=document.createElement('button');play.type='button';
      play.textContent='PLAY';play.disabled=!config.canPlayFavorite();
      play.title='Start an independent Quick Play rematch';
      play.addEventListener('click',()=>config.playFavorite(saved));
      const remove=document.createElement('button');remove.type='button';
      remove.textContent='×';
      remove.setAttribute('aria-label','Delete favorite '+saved.label);
      remove.addEventListener('click',()=>{
        if(!persistFavoriteMissions(removeFavoriteMission(favoriteMissions(),saved.id))){
          config.showUiHelp('COULD NOT UPDATE FAVORITES',2900);
          return;
        }
        if(activeFavoriteId===saved.id)activeFavoriteId=null;
        renderFavorites();config.refreshHud();
      });
      row.append(info,play,remove);fragment.append(row);
    }
    list.replaceChildren(fragment);
  };
  function favoriteMissions():FavoriteMission[]{
    try{return readFavoriteMissions(
      localStorage.getItem(FAVORITE_MISSIONS_STORAGE));}
    catch{return [];}
  }
  function persistFavoriteMissions(history:FavoriteMission[]):boolean{
    try{
      localStorage.setItem(FAVORITE_MISSIONS_STORAGE,
        writeFavoriteMissions(history));
      return true;
    }catch{return false;}
  }
  function favoriteCurrentMission():void{
    const draft=config.getFavoriteDraft();
    if(!draft)return;
    const favorites=favoriteMissions();
    if(activeFavoriteId&&favorites.some(item=>item.id===activeFavoriteId)){
      config.showUiHelp('MISSION ALREADY IN FAVORITES',2700);
      return;
    }
    const createdAt=Date.now();
    const id='favorite-'+createdAt.toString(36)+'-'+
      Math.random().toString(36).slice(2,9);
    try{
      if(!persistFavoriteMissions(addFavoriteMission(
        favorites,draft.start,id,draft.label,createdAt)))
        throw Error('Storage unavailable');
      activeFavoriteId=id;
      renderFavorites();config.refreshHud();
      config.showUiHelp('MISSION SAVED TO FAVORITES',3200);
    }catch(error){
      console.warn('[Favorite mission]',error);
      config.showUiHelp('COULD NOT SAVE FAVORITE · CHECK LOCAL STORAGE',3500);
    }
  }
  function syncSavedButtons():void{
    const recorder=config.getRecorder();
    const saved=Boolean(activeSavedReplayId||savedRecordingIds.get(recorder));
    ui.saveReplayDebrief.disabled=view.busy||recorder.frames.length<2||saved;
    ui.saveReplayDebrief.textContent=saved?'REPLAY SAVED':'SAVE REPLAY';
    ui.replaySaveArchive.disabled=view.busy||saved;
    ui.replaySaveArchive.textContent=saved?'SAVED TO LIBRARY':'SAVE REPLAY';
  }
  async function saveCurrentReplay():Promise<void>{
    const recorder=config.getRecorder();
    if(view.busy||recorder.frames.length<2)return;
    if(activeSavedReplayId||savedRecordingIds.has(recorder)){
      config.showUiHelp('REPLAY ALREADY SAVED TO LIBRARY',2800);
      return;
    }
    view.busy=true;syncSavedButtons();
    try{
      const createdAt=Date.now();
      const id='replay-'+createdAt.toString(36)+'-'+
        Math.random().toString(36).slice(2,9);
      await saveReplayArchive(captureReplayArchive(recorder,id,createdAt));
      savedRecordingIds.set(recorder,id);
      if(config.isReplaying())activeSavedReplayId=id;
      const bookmarks=config.getBookmarks();
      if(bookmarks.length)await saveReplayBookmarks(id,bookmarks);
      config.showUiHelp('FULL REPLAY SAVED TO DEVICE LIBRARY',3400);
      if(!ui.replayLibraryDialog.hidden)await view.render();
    }catch(error){failure(error);}
    finally{view.busy=false;syncSavedButtons();config.refreshHud();}
  }
  async function playSavedReplay(id:string):Promise<void>{
    if(view.busy||config.isReplaying())return;
    view.busy=true;
    try{
      const archive=await loadSavedReplay(id);
      const stored=restoreReplayArchive(archive);
      if(stored.frames.length<2)throw Error('Replay recording has no film');
      const bookmarks=await getSavedReplayBookmarks(id);
      previousRecorder=config.getRecorder();
      config.setRecorder(stored);
      hide(false);
      config.closeMissionSettings(false);
      entrySource='library';
      config.enterReplay();
      if(!config.isReplaying())throw Error('Could not open saved replay');
      activeSavedReplayId=id;
      config.applyLoadedBookmarks(bookmarks);
      config.showUiHelp('PLAYING SAVED OPERATION · ORIGINAL MISSION UNCHANGED',3800);
    }catch(error){
      activeSavedReplayId=null;
      if(config.isReplaying())config.exitReplay();
      if(previousRecorder){
        config.setRecorder(previousRecorder);
        previousRecorder=null;
      }
      failure(error);
      if(ui.replayLibraryDialog.hidden)show();
    }finally{view.busy=false;config.refreshHud();}
  }
  async function persistCurrentBookmarks():Promise<void>{
    const replayId=activeSavedReplayId;
    if(!replayId){
      config.showUiHelp('BOOKMARK ADDED · SAVE REPLAY TO PRESERVE',2800);
      return;
    }
    try{
      await saveReplayBookmarks(replayId,config.getBookmarks());
      if(activeSavedReplayId===replayId)
        config.showUiHelp('BOOKMARK SAVED TO REPLAY LIBRARY',2400);
    }catch(error){failure(error);}
  }
  function afterReplayExit():void{
    if(previousRecorder){
      config.setRecorder(previousRecorder);
      previousRecorder=null;
    }
    activeSavedReplayId=null;
    if(entrySource==='library'){
      entrySource='debrief';
      show();
    }
  }
  function resetSession():void{
    previousRecorder=null;
    activeSavedReplayId=null;activeFavoriteId=null;
    entrySource='debrief';
    // Mission replacement is not a Back action from the library.
    // Never let a menu-origin archive turn a newly mounted Quick Play
    // favorite back into title-menu mode during releasePresentation().
    hide(false);
  }
  function openFromMenu():void{
    config.hideCampaignScreen();
    show(true);
  }
  function exportJsonReport():void{
    try{
      const recorder=config.getRecorder();
      const blob=new Blob([serializeReplayReport(recorder)],
        {type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      const seed=recorder.manifest?.site?.seed??'mission';
      anchor.href=url;
      anchor.download='fieldwork-breach-'+seed+'-'+
        Math.round(recorder.duration)+'s-report.json';
      document.body.append(anchor);anchor.click();anchor.remove();
      // iOS WebKit may require the object URL after navigation starts.
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      config.showUiHelp('FULL-RECONSTRUCTION JSON REPORT EXPORTED',2500);
    }catch(error){
      console.warn('[Replay JSON export]',error);
      config.showUiHelp('JSON EXPORT UNAVAILABLE',3500);
    }
  }
  ui.openReplayLibrary.addEventListener('click',()=>show());
  ui.closeReplayLibrary.addEventListener('click',()=>hide());
  ui.replayLibraryBackdrop.addEventListener('click',()=>hide());
  ui.saveReplayDebrief.addEventListener('click',()=>{void saveCurrentReplay();});
  ui.replaySaveArchive.addEventListener('click',()=>{void saveCurrentReplay();});
  ui.favoriteMission.addEventListener('click',favoriteCurrentMission);
  ui.replayExportJson.addEventListener('click',exportJsonReport);
  return {
    get busy(){return view.busy;},
    get activeSavedReplayId(){return activeSavedReplayId;},
    get activeFavoriteId(){return activeFavoriteId;},
    isRecorderSaved:(recorder:MissionRecorder)=>savedRecordingIds.has(recorder),
    activateFavorite:(id:string)=>{activeFavoriteId=id;},
    markDebriefEntry:()=>{entrySource='debrief';},
    render:()=>view.render(),
    renderFavorites,
    failure,show,hide,openFromMenu,resetSession,afterReplayExit,
    saveCurrentReplay,playSavedReplay,persistCurrentBookmarks,syncSavedButtons
  };
}
