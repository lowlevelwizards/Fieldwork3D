/** P1 Photo Mode: one presentation-only owner, independent from tactical
 * planning, fixed-step simulation, replay film and archived evidence. */
import type {Session} from './breach-game.ts';
import type {TacticalScene3D,ViewMode,PhotoCameraSnapshot} from './breach-3d.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import type {ReplayCameraController} from './breach-replay-camera-controller.ts';
import type {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import {capturePhotoFrame,photoFilterCss,type PhotoCaptureRequest}
 from './breach-photo-capture.ts';
import {INITIAL_PHOTO_SETTINGS,photographCanEnter,
 type PhotoLens,type PhotoGuide} from './breach-photo-state.ts';
import {savePhoto,makePhotoThumbnail,listPhotos,readPhotoThumbnail,readPhoto,deletePhoto,
 type PhotoMetadata,type PhotoStored} from './breach-photo-library.ts';
import {mountBreachPhotoUi} from './ui/breach-photo-ui.ts';

type Ports={
 getState:()=>Session;getStage:()=>TacticalScene3D|null;
 getSelected:()=>string;
 getViewMode:()=>ViewMode;isReplaying:()=>boolean;
 getPlayback:()=>ReplayPlaybackController;
 getCamera:()=>ReplayCameraController;
 getBodycam:()=>ReplayBodycamController;
 getKnowledge:()=>ReplayKnowledgeController;
 isLoading:()=>boolean;isMenu:()=>boolean;videoActive:()=>boolean;
 requestHud:()=>void;invalidateFog:()=>void;
 restoreReplayCamera:()=>void;showHelp:(message:string,ms:number)=>void;
};
type Pending={filter:PhotoCaptureRequest['filter'];strength:number;
 ratio:PhotoCaptureRequest['ratio']};
export function createBreachPhotoModeController(ports:Ports){
 const ui=mountBreachPhotoUi();
 const settings={...INITIAL_PHOTO_SETTINGS};
 let active=false,dirty=false,busy=false,pending:Pending|null=null;
 let cameraSnapshot:PhotoCameraSnapshot|null=null;
 let originalLens:PhotoLens='ortho';
 let playbackWasPlaying=false;
 let originalKnowledge:{
  observerId:string|null;omniscient:boolean;groundLensOn:boolean
 }|null=null;
 let generation=0,selectedPhoto:string|null=null,viewerUrl:string|null=null;
 let selectedPhotoRecord:PhotoStored|null=null;
 let replayClean=false;
 let photoCamId:string|null=null;
 let photoCamMount:'helmet'|'chest'='helmet';
 const temporaryUrls=new Set<string>();
 const pointerMap=new Map<number,{x:number;y:number,button:number}>();
 let lastDistance=0;
 let lastMid:{x:number;y:number}|null=null;
 const status=(message:string)=>{ui.status.textContent=message;};
 const markDirty=()=>{dirty=true;};
 function releaseGalleryUrls():void{
  for(const url of temporaryUrls)URL.revokeObjectURL(url);
  temporaryUrls.clear();
  if(viewerUrl){URL.revokeObjectURL(viewerUrl);viewerUrl=null;}
 }
 function frameGuides():void{
  const screen=innerWidth/Math.max(1,innerHeight);
  const ratio=settings.ratio==='screen'?screen:
   settings.ratio==='16:9'?16/9:settings.ratio==='4:5'?.8:1;
  const width=Math.min(innerWidth,innerHeight*ratio);
  const height=width/ratio;
  ui.frame.style.width=width+'px';
  ui.frame.style.height=height+'px';
  ui.guide.dataset.guide=settings.guide;
  // Only the world is filtered; guides and controls remain legible.
  const scene=ports.getStage()?.canvas;
  if(scene)scene.style.filter=active?
   photoFilterCss(settings.filter,settings.strength):'';
  // For Floor Plan, the 2D canvas IS the world and may be filtered.
  const overlay=document.getElementById('breachCanvas');
  if(overlay)overlay.style.filter=active&&
   (ports.getViewMode()==='plan2d'||!ports.getStage())?
    photoFilterCss(settings.filter,settings.strength):'';
 }
 function clearPhotoCam():void{
  photoCamId=null;ui.mount.hidden=true;
  ports.getStage()?.setPhotoLiveBodycam(false);
  ports.getStage()?.setReplayBodycam(null);
  if(originalKnowledge){
   const knowledge=ports.getKnowledge();
   knowledge.observerId=originalKnowledge.observerId;
   knowledge.omniscient=originalKnowledge.omniscient;
   knowledge.groundLensOn=originalKnowledge.groundLensOn;
   ports.invalidateFog();
  }
 }
 function lens(next:PhotoLens):void{
  if(!active)return;
  const stage=ports.getStage();
  if(!stage){settings.lens='ortho';ui.lens.value='ortho';return;}
  if(next==='cam'){
   if(!ports.isReplaying()){
    const candidate=ports.getSelected();
    if(!ports.getState().operators.some(a=>a.id===candidate&&a.health>0)){
     status('SELECT AN ACTIVE OPERATOR FOR CAM');
     ui.lens.value=settings.lens;return;
    }
    stage.setPhotoPerspective(false);
    photoCamId=candidate;photoCamMount='helmet';
    stage.setReplayBodycam({actorId:candidate,mount:photoCamMount,
     stabilization:'balanced',fov:95});
    ui.mount.hidden=false;ui.mount.textContent='CAM · HELMET';
    stage.setPhotoLiveBodycam(true);
    settings.lens='cam';ui.lens.value='cam';markDirty();frameGuides();return;
   }
   const b=ports.getBodycam();
   const cam=ports.getCamera();
   const candidate=cam.directorCamActor&&b.observers.includes(cam.directorCamActor)?
    cam.directorCamActor:
    b.observers.includes(cam.followId)?cam.followId:b.observers[0];
   if(!candidate){
    status('CAM REQUIRES RECORDED OPERATOR SIGHT');
    ui.lens.value=settings.lens;return;
   }
   const knowledge=ports.getKnowledge();
   knowledge.observerId=candidate;knowledge.omniscient=false;
   knowledge.groundLensOn=false;
   stage.setPhotoPerspective(false);
   photoCamId=candidate;photoCamMount=cam.camMount;
   stage.setReplayBodycam({actorId:candidate,mount:photoCamMount,
    stabilization:'balanced',fov:95});
   ui.mount.hidden=false;ui.mount.textContent='CAM · '+photoCamMount.toUpperCase();
   ports.invalidateFog();
  }else{
   if(settings.lens==='cam')clearPhotoCam();
   // Taking over a Director shot releases its automatic physical anchor on
   // first explicit lens change; the frozen shot remains the starting view.
   stage.setReplayDirectorCameraAnchor(null);
   stage.setReplayDirectorFocus(null);
   stage.setReplayDirectorSubjects([]);
   stage.setPhotoPerspective(next==='wide');
  }
  settings.lens=next;ui.lens.value=next;
  markDirty();frameGuides();
 }
 function enter():void{
  const state=ports.getState();
  if(!photographCanEnter({site:!!state.site,loading:ports.isLoading(),
   menu:ports.isMenu(),already:active,video:ports.videoActive()})){
   ports.showHelp('PHOTO MODE UNAVAILABLE IN THIS VIEW',2400);return;
  }
  const stage=ports.getStage(),cam=ports.getCamera(),bodycam=ports.getBodycam();
  cameraSnapshot=stage?.capturePhotoCameraSnapshot()??null;
  originalKnowledge={observerId:ports.getKnowledge().observerId,
   omniscient:ports.getKnowledge().omniscient,
   groundLensOn:ports.getKnowledge().groundLensOn};
  playbackWasPlaying=ports.getPlayback().playing;
  if(ports.isReplaying())ports.getPlayback().pause();
  originalLens=ports.isReplaying()&&
   (bodycam.active||cam.mode==='director'&&cam.lens==='cam')?
    'cam':ports.isReplaying()&&cam.mode==='director'&&cam.lens==='wide'?
    'wide':'ortho';
  settings.lens=originalLens;
  if(stage){stage.cancelFocusGlide();stage.setPhotoClean(true);}
  active=true;busy=false;pending=null;dirty=true;
  pointerMap.clear();lastMid=null;lastDistance=0;
  ui.lens.value=settings.lens;
  photoCamId=settings.lens==='cam'?(cameraSnapshot?.bodycam?.actorId??cam.directorCamActor):null;
  photoCamMount=cameraSnapshot?.bodycam?.mount??cam.camMount;
  ui.mount.hidden=settings.lens!=='cam';
  ui.mount.textContent='CAM · '+photoCamMount.toUpperCase();
  ui.lens.querySelector<HTMLOptionElement>('option[value="cam"]')!.disabled=false;
  if(settings.lens==='wide')stage?.setPhotoPerspective(true);
  if(settings.lens==='cam'&&!stage?.isReplayBodycamActive())lens('cam');
  document.body.classList.add('photo-mode');
  ui.gesture.hidden=false;ui.hud.hidden=false;
  ui.shutter.disabled=false;status('DRAG TO ORBIT · PINCH TO ZOOM');
  frameGuides();ports.requestHud();
 }
 function exit():void{
  if(!active)return;
  active=false;pending=null;busy=false;dirty=false;
  pointerMap.clear();ui.gesture.hidden=true;ui.hud.hidden=true;
  document.body.classList.remove('photo-mode');
  const stage=ports.getStage();
  stage?.setPhotoPerspective(false);stage?.setPhotoLiveBodycam(false);
  stage?.setPhotoClean(false);
  if(cameraSnapshot)stage?.restorePhotoCameraSnapshot(cameraSnapshot);
  cameraSnapshot=null;
  if(originalKnowledge){
   const knowledge=ports.getKnowledge();
   knowledge.observerId=originalKnowledge.observerId;
   knowledge.omniscient=originalKnowledge.omniscient;
   knowledge.groundLensOn=originalKnowledge.groundLensOn;
  }
  originalKnowledge=null;ports.invalidateFog();
  stage?.canvas.style.removeProperty('filter');
  document.getElementById('breachCanvas')?.style.removeProperty('filter');
  if(ports.isReplaying()){
   ports.restoreReplayCamera();
   if(playbackWasPlaying)ports.getPlayback().play();
  }
  ports.requestHud();
 }
 function resetCamera():void{
  const stage=ports.getStage();
  if(!active||!stage||!cameraSnapshot)return;
  clearPhotoCam();stage.restorePhotoCameraSnapshot(cameraSnapshot);
  settings.lens=originalLens;ui.lens.value=settings.lens;
  if(originalLens==='wide')stage.setPhotoPerspective(true);
  if(originalLens==='cam')lens('cam');
  markDirty();status('ORIGINAL CAMERA RESTORED');
 }
 function shutter():void{
  if(!active||busy||pending)return;
  busy=true;ui.shutter.disabled=true;
  pending={filter:settings.filter,strength:settings.strength,ratio:settings.ratio};
  dirty=true;status('CAPTURING…');
 }
 async function onFrame(scene:HTMLCanvasElement|null,overlay:HTMLCanvasElement){
  if(!active)return;
  dirty=false;
  const request=pending;
  if(!request)return;
  pending=null;
  try{
   const captured=await capturePhotoFrame({scene,overlay,...request});
   const state=ports.getState();
   const time=ports.isReplaying()?ports.getPlayback().time:state.seconds;
   const meta:PhotoMetadata={
    id:'photo-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),
    createdAt:Date.now(),site:state.site?.name??'FIELDWORK',
    source:ports.isReplaying()?'replay':'live',at:time,
    lens:settings.lens,filter:request.filter,ratio:request.ratio,
    width:captured.width,height:captured.height,bytes:captured.blob.size
   };
   const thumbnail=await makePhotoThumbnail(captured.blob);
   await savePhoto({meta,image:captured.blob,thumbnail});
   if(active)status('PHOTO SAVED · OPEN GALLERY TO VIEW OR SHARE');
   ports.showHelp('PHOTO SAVED TO DEVICE LIBRARY',1900);
  }catch(error){
   const reason=error instanceof Error?error.message:'PHOTO CAPTURE FAILED';
   if(active)status(reason);
   ports.showHelp(reason,3200);
  }finally{
   busy=false;ui.shutter.disabled=false;
  }
 }
 function updatePointer(e:PointerEvent):void{
  const previous=pointerMap.get(e.pointerId);
  if(!previous||!active)return;
  const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
  previous.x=e.clientX;previous.y=e.clientY;
  const stage=ports.getStage();
  if(!stage||ports.getViewMode()==='plan2d')return;
  if(pointerMap.size>1){
   const [a,b]=[...pointerMap.values()];
   const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const distance=Math.hypot(a.x-b.x,a.y-b.y);
   if(lastMid)stage.panBetween(lastMid.x,lastMid.y,mid.x,mid.y);
   if(lastDistance>8&&distance>8)stage.zoomAt(distance/lastDistance,mid.x,mid.y);
   lastDistance=distance;lastMid=mid;markDirty();return;
  }
  if(settings.lens==='cam')return;
  stage.setReplayDirectorCameraAnchor(null);
  if(previous.button===2||e.shiftKey)stage.pan(dx,dy);
  else stage.orbit(dx,dy);
  markDirty();
 }
 async function renderGallery():Promise<void>{
  const current=++generation;releaseGalleryUrls();
  ui.viewer.hidden=true;selectedPhoto=null;selectedPhotoRecord=null;
  ui.galleryGrid.replaceChildren();ui.galleryStatus.textContent='LOADING PHOTOS…';
  try{
   const rows=await listPhotos();
   if(current!==generation||ui.gallery.hidden)return;
   ui.galleryStatus.textContent=rows.length?
    rows.length+' SAVED PHOTOGRAPHS · THIS DEVICE':
    'NO SAVED PHOTOGRAPHS YET';
   for(const meta of rows){
    const thumbnail=await readPhotoThumbnail(meta.id);
    if(current!==generation||ui.gallery.hidden)return;
    if(!thumbnail)continue;
    const url=URL.createObjectURL(thumbnail);temporaryUrls.add(url);
    const button=document.createElement('button');button.type='button';
    const img=document.createElement('img');img.src=url;img.loading='lazy';
    img.alt=meta.site+' at '+meta.at.toFixed(1)+' seconds';
    const title=document.createElement('span');
    title.textContent=meta.site+' · '+meta.lens.toUpperCase();
    button.append(img,title);
    button.addEventListener('click',()=>{void selectPhoto(meta.id);});
    ui.galleryGrid.append(button);
   }
  }catch(error){
   ui.galleryStatus.textContent=error instanceof Error?
    error.message:'PHOTO LIBRARY UNAVAILABLE';
  }
 }
 async function selectPhoto(id:string):Promise<void>{
  try{
   const photo=await readPhoto(id);if(!photo)return;
   if(viewerUrl)URL.revokeObjectURL(viewerUrl);
   viewerUrl=URL.createObjectURL(photo.image);
   ui.viewerImage.src=viewerUrl;
   selectedPhoto=id;selectedPhotoRecord=photo;ui.viewer.hidden=false;
   ui.galleryGrid.hidden=true;
   ui.galleryStatus.textContent=photo.meta.site+' · '+photo.meta.width+
    ' × '+photo.meta.height+' · '+photo.meta.source.toUpperCase();
  }catch(error){
   ui.galleryStatus.textContent=error instanceof Error?error.message:'PHOTO UNAVAILABLE';
  }
 }
 function closeGallery():void{
  ++generation;ui.gallery.hidden=true;
  ui.galleryGrid.hidden=false;ui.viewerImage.removeAttribute('src');
  releaseGalleryUrls();ui.viewer.hidden=true;selectedPhoto=null;
  selectedPhotoRecord=null;
 }
 function openGallery():void{
  ui.gallery.hidden=false;ui.galleryGrid.hidden=false;
  void renderGallery();
 }
 async function withSelectedPhoto(action:'export'|'share'|'delete'):Promise<void>{
  if(!selectedPhoto)return;
  // The viewed Blob is already loaded, so Web Share starts inside the user
  // activation rather than after an IndexedDB await (important on iOS).
  const item=selectedPhotoRecord??await readPhoto(selectedPhoto);
  if(!item)return;
  if(action==='delete'){
   if(!confirm('Delete this photograph from this device?'))return;
   await deletePhoto(selectedPhoto);
   ui.galleryGrid.hidden=false;void renderGallery();return;
  }
  const file=new File([item.image],item.meta.id+'.jpg',{type:'image/jpeg'});
  if(action==='share'&&navigator.share){
   try{
    if(!navigator.canShare||navigator.canShare({files:[file]})){
     await navigator.share({files:[file],title:'Fieldwork Photo'});
     return;
    }
   }catch(error){
    if(error instanceof DOMException&&error.name==='AbortError')return;
   }
  }
  const url=URL.createObjectURL(item.image),anchor=document.createElement('a');
  anchor.href=url;anchor.download=file.name;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
 }
 ui.clean.addEventListener('click',()=>{
  if(!ports.isReplaying())return;
  replayClean=!replayClean;
  document.body.classList.toggle('replay-clean',replayClean);
  ui.clean.textContent=replayClean?'◫ SHOW HUD':'◫ HIDE HUD';
  ui.clean.title=replayClean?'Restore the replay interface':
    'Hide replay interface for a clean camera view';
  ui.clean.setAttribute('aria-label',replayClean?'Show replay HUD':'Hide replay HUD');
  ui.clean.setAttribute('aria-pressed',String(replayClean));
  markDirty();ports.requestHud();
 });
 ui.live.addEventListener('click',enter);
 ui.replay.addEventListener('click',enter);
 ui.access.addEventListener('click',openGallery);
 ui.close.addEventListener('click',exit);
 ui.reset.addEventListener('click',resetCamera);
 ui.focus.addEventListener('click',()=>{
  if(!active||settings.lens==='cam')return;
  const actor=ports.getState().operators.find(a=>a.id===ports.getSelected());
  const stage=ports.getStage();if(!stage||!actor)return;
  stage.setReplayDirectorCameraAnchor(null);
  stage.focusOn(actor.p);markDirty();status('FRAMING SELECTED OPERATOR');
 });
 ui.fit.addEventListener('click',()=>{
  if(!active||settings.lens==='cam')return;
  const stage=ports.getStage();if(!stage)return;
  stage.setReplayDirectorCameraAnchor(null);
  stage.resetCamera();markDirty();status('SITE FIT');
 });
 ui.mount.addEventListener('click',()=>{
  if(!active||settings.lens!=='cam'||!photoCamId)return;
  photoCamMount=photoCamMount==='helmet'?'chest':'helmet';
  ports.getStage()?.setReplayBodycam({actorId:photoCamId,mount:photoCamMount,
   stabilization:'balanced',fov:95});
  ui.mount.textContent='CAM · '+photoCamMount.toUpperCase();markDirty();
 });
 ui.shutter.addEventListener('click',shutter);
 ui.galleryOpen.addEventListener('click',openGallery);
 ui.galleryClose.addEventListener('click',closeGallery);
 ui.back.addEventListener('click',()=>{ui.viewer.hidden=true;ui.galleryGrid.hidden=false;});
 ui.export.addEventListener('click',()=>{void withSelectedPhoto('export');});
 ui.share.addEventListener('click',()=>{void withSelectedPhoto('share');});
 ui.remove.addEventListener('click',()=>{void withSelectedPhoto('delete');});
 ui.lens.addEventListener('change',()=>lens(ui.lens.value as PhotoLens));
 ui.ratio.addEventListener('change',()=>{settings.ratio=ui.ratio.value as PhotoCaptureRequest['ratio'];frameGuides();});
 ui.guides.addEventListener('change',()=>{settings.guide=ui.guides.value as PhotoGuide;frameGuides();});
 ui.filter.addEventListener('change',()=>{
  settings.filter=ui.filter.value as PhotoCaptureRequest['filter'];frameGuides();
 });
 ui.strength.addEventListener('input',()=>{
  settings.strength=Number(ui.strength.value)/100;frameGuides();
 });
 ui.gesture.addEventListener('pointerdown',e=>{
  if(!active)return;e.preventDefault();
  ui.gesture.setPointerCapture(e.pointerId);
  pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button});
  if(pointerMap.size>=2){
   const [a,b]=[...pointerMap.values()];
   lastDistance=Math.hypot(a.x-b.x,a.y-b.y);
   lastMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  }
 });
 ui.gesture.addEventListener('pointermove',e=>{e.preventDefault();updatePointer(e);});
 const releasePointer=(e:PointerEvent)=>{
  pointerMap.delete(e.pointerId);lastMid=null;lastDistance=0;
  if(ui.gesture.hasPointerCapture(e.pointerId))
   ui.gesture.releasePointerCapture(e.pointerId);
 };
 ui.gesture.addEventListener('pointerup',releasePointer);
 ui.gesture.addEventListener('pointercancel',releasePointer);
 ui.gesture.addEventListener('wheel',e=>{
  if(!active)return;e.preventDefault();
  const stage=ports.getStage();if(!stage||settings.lens==='cam')return;
  stage.zoomAt(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);markDirty();
 },{passive:false});
 window.addEventListener('resize',()=>{if(active){frameGuides();markDirty();}});
 window.addEventListener('keydown',e=>{
  if(e.isComposing||e.altKey||e.ctrlKey||e.metaKey||
   e.target instanceof HTMLElement&&e.target.closest('input,select,textarea'))return;
  if(!ui.gallery.hidden){if(e.code==='Escape'){
   e.preventDefault();e.stopImmediatePropagation();closeGallery();}return;}
  if(!active){
   if(e.code==='KeyP'){e.preventDefault();enter();}
   return;
  }
  if(e.code==='Escape'||e.code==='KeyP'){
   e.preventDefault();e.stopImmediatePropagation();exit();
  }else if(e.code==='Space'&&!e.repeat){
   e.preventDefault();e.stopImmediatePropagation();shutter();
  }
 },true);
 return {get active(){return active;},get replayClean(){return replayClean&&ports.isReplaying();},
  clearReplayClean(){replayClean=false;document.body.classList.remove('replay-clean');
   ui.clean.textContent='◫ HIDE HUD';
   ui.clean.title='Hide replay interface for a clean camera view';
   ui.clean.setAttribute('aria-label','Hide replay HUD');
   ui.clean.setAttribute('aria-pressed','false');},
  get needsFrame(){return active&&
  (dirty||pending!==null);},onFrame,exit,openGallery};
}
