/** Saved replay library UI. Archive persistence stays in breach-replay-library.
 * Keeps DOM rendering, file picker/export and async busy/generation ownership
 * out of the tactical application entrypoint.
 */
import {listSavedReplays,loadSavedReplay,deleteSavedReplay,
  setSavedReplayFavorite,getSavedReplayBookmarks,saveReplayArchive}
  from '../breach-replay-library.ts';
import {exportPortableReplay,importPortableReplay,REPLAY_FILE_SUFFIX}
  from '../breach-replay-portable.ts';
import {formatReplayTime} from '../breach-replay-transport.ts';

type UiRefs={
 replayLibraryDialog:HTMLElement;replayLibraryStatus:HTMLElement;
 replayLibraryList:HTMLElement;replayLibraryBackdrop:HTMLElement;
 replayImportButton:HTMLButtonElement;replayImportInput:HTMLInputElement;
};
export function createReplayLibraryUi(config:{
 ui:UiRefs;showUiHelp:(message:string,duration:number)=>void;
 playSavedReplay:(id:string)=>void;
 closeMissionSettings:(restoreFocus:boolean)=>void;
 isReplaying:()=>boolean;
}){
 const ui=config.ui;
 const showUiHelp=config.showUiHelp;
 const playSavedReplay=config.playSavedReplay;
 const closeMissionSettings=config.closeMissionSettings;
 let replayLibraryBusy=false;
 let replayLibraryRenderGeneration=0;
async function renderSavedReplayLibrary():Promise<void>{
  const generation=++replayLibraryRenderGeneration;
  if(ui.replayLibraryDialog.hidden)return;
  ui.replayLibraryStatus.textContent='READING LOCAL RECORDINGS…';
  try{
    const entries=await listSavedReplays();
    if(generation!==replayLibraryRenderGeneration||
      ui.replayLibraryDialog.hidden)return;
    const fragment=document.createDocumentFragment();
    for(const item of entries){
      const row=document.createElement('div');
      row.className='replay-library-row';row.setAttribute('role','listitem');
      const information=document.createElement('div');
      information.className='replay-library-item-info';
      const name=document.createElement('strong');
      name.textContent=item.siteName;
      const details=document.createElement('span');
      details.textContent=item.missionType.toUpperCase()+' · '+
        formatReplayTime(item.duration)+' · '+item.frameCount+' FRAMES'+
        (item.complete?'':' · PARTIAL');
      information.append(name,details);
      const watch=document.createElement('button');watch.type='button';
      watch.textContent='WATCH';watch.className='replay-library-watch';watch.title='Open saved recording';
      watch.addEventListener('click',()=>{void playSavedReplay(item.id);});
      const favorite=document.createElement('button');favorite.type='button';
      favorite.textContent=item.favorite?'★':'☆';favorite.className='replay-library-favorite';
      favorite.setAttribute('aria-label',
        (item.favorite?'Unfavorite ':'Favorite ')+item.siteName);
      favorite.setAttribute('aria-pressed',String(item.favorite));
      favorite.addEventListener('click',async()=>{
        if(replayLibraryBusy)return;
        replayLibraryBusy=true;
        try{
          await setSavedReplayFavorite(item.id,!item.favorite);
          await renderSavedReplayLibrary();
        }catch(error){replayLibraryFailure(error);}
        finally{replayLibraryBusy=false;}
      });
      const exportFile=document.createElement('button');exportFile.type='button';
      exportFile.textContent='EXPORT';exportFile.title='Download full replay file';
      exportFile.addEventListener('click',()=>{void exportSavedReplayFile(item.id);});
      const remove=document.createElement('button');remove.type='button';
      remove.textContent='DELETE';
      remove.setAttribute('aria-label','Delete replay '+item.siteName);
      remove.addEventListener('click',async()=>{
        if(replayLibraryBusy)return;
        if(remove.dataset.confirm!=='yes'){
          remove.dataset.confirm='yes';remove.textContent='CONFIRM';
          return;
        }
        replayLibraryBusy=true;
        try{
          await deleteSavedReplay(item.id);
          await renderSavedReplayLibrary();
        }catch(error){replayLibraryFailure(error);}
        finally{replayLibraryBusy=false;}
      });
      const more=document.createElement('details');
      more.className='replay-library-actions';
      const summary=document.createElement('summary');
      summary.textContent='MORE';
      summary.setAttribute('aria-label','More actions for '+item.siteName);
      const secondary=document.createElement('div');
      secondary.className='replay-library-actions-list';
      secondary.append(exportFile,remove);
      more.append(summary,secondary);
      more.addEventListener('toggle',()=>{
        if(!more.open){remove.dataset.confirm='';remove.textContent='DELETE';}
      });
      row.append(information,watch,favorite,more);
      fragment.append(row);
    }
    ui.replayLibraryList.replaceChildren(fragment);
    ui.replayLibraryStatus.textContent=entries.length?
      entries.length+' SAVED RECORDING'+(entries.length===1?'':'S')+
      ' · LOCAL DEVICE ONLY':
      'NO SAVED REPLAYS YET · SAVE ONE FROM A MISSION DEBRIEF';
  }catch(error){
    if(generation!==replayLibraryRenderGeneration)return;
    replayLibraryFailure(error);
  }
}
function replayLibraryFailure(error:unknown):void{
  console.warn('[Replay Library]',error);
  ui.replayLibraryStatus.textContent=error instanceof Error?
    error.message:'REPLAY STORAGE FAILED';
  showUiHelp('REPLAY LIBRARY UNAVAILABLE · CHECK DEVICE STORAGE',3400);
}
/** Portable file actions are always explicit, on-demand and bounded. */
async function exportSavedReplayFile(id:string):Promise<void>{
  if(replayLibraryBusy)return;
  replayLibraryBusy=true;
  try{
    const archive=await loadSavedReplay(id);
    const marks=await getSavedReplayBookmarks(id);
    const blob=await exportPortableReplay({...archive,bookmarks:marks});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download=id+REPLAY_FILE_SUFFIX;
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),12000);
    ui.replayLibraryStatus.textContent='FULL REPLAY FILE EXPORTED';
  }catch(error){replayLibraryFailure(error);}
  finally{replayLibraryBusy=false;}
}
async function importSavedReplayFile(file:File):Promise<void>{
  if(replayLibraryBusy)return;
  replayLibraryBusy=true;
  ui.replayLibraryStatus.textContent='VALIDATING REPLAY FILE…';
  try{
    const archive=await importPortableReplay(file);
    // Import never silently overwrites an existing recording with the same ID.
    const id='replay-import-'+Date.now().toString(36)+'-'+
      Math.random().toString(36).slice(2,9);
    await saveReplayArchive({...archive,id,createdAt:Date.now()});
    await renderSavedReplayLibrary();
    showUiHelp('COMPLETE REPLAY IMPORTED TO DEVICE',3100);
  }catch(error){replayLibraryFailure(error);}
  finally{replayLibraryBusy=false;}
}
ui.replayImportButton.addEventListener('click',()=>{
  if(!replayLibraryBusy)ui.replayImportInput.click();
});
ui.replayImportInput.addEventListener('change',()=>{
  const file=ui.replayImportInput.files?.[0];
  ui.replayImportInput.value='';
  if(file)void importSavedReplayFile(file);
});

function showSavedReplayLibrary():void{
  if(config.isReplaying())return;
  closeMissionSettings(false);
  ui.replayLibraryDialog.hidden=false;
  ui.replayLibraryBackdrop.hidden=false;
  ui.replayLibraryList.replaceChildren();
  void renderSavedReplayLibrary();
}
function hideSavedReplayLibrary():void{
  ui.replayLibraryDialog.hidden=true;
  ui.replayLibraryBackdrop.hidden=true;
  replayLibraryRenderGeneration++;
}

 return {
  get busy(){return replayLibraryBusy;},
  set busy(value:boolean){replayLibraryBusy=value;},
  render:renderSavedReplayLibrary,
  failure:replayLibraryFailure,
  exportFile:exportSavedReplayFile,
  importFile:importSavedReplayFile,
  show:showSavedReplayLibrary,
  hide:hideSavedReplayLibrary,
 };
}
