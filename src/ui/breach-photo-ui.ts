/** Minimal photography surface. No simulation, replay or camera authority. */
import './breach-photo-mode.css';
const byId=<T extends HTMLElement>(id:string):T=>{
 const el=document.getElementById(id);
 if(!el)throw Error('Missing Photo Mode UI: '+id);
 return el as T;
};
export function mountBreachPhotoUi(){
 const live=document.createElement('button');
 live.type='button';live.id='photoToggleLive';live.className='photo-entry';
 live.title='Enter Photo Mode';live.setAttribute('aria-label','Enter Photo Mode');
 live.textContent='◉ PHOTO';
 document.querySelector('.top-controls')?.append(live);
 const replay=document.createElement('button');
 replay.type='button';replay.id='photoToggleReplay';replay.className='photo-entry';
 replay.title='Enter replay Photo Mode';replay.textContent='◉ PHOTO';
 document.getElementById('replayTopHud')?.prepend(replay);
 const clean=document.createElement('button');
 clean.type='button';clean.id='replayCleanToggle';clean.textContent='◫ HIDE HUD';
 clean.className='photo-entry';clean.setAttribute('aria-pressed','false');
 clean.title='Hide replay interface for a clean camera view';
 clean.setAttribute('aria-label','Hide replay HUD');
 document.getElementById('replayTopHud')?.prepend(clean);
 const access=document.createElement('button');
 access.type='button';access.id='photoLibraryAccess';
 access.textContent='PHOTO LIBRARY';
 document.querySelector('#siteSettings [data-site-panel="mission"] .replay-library-entry')?.append(access);

 const gesture=document.createElement('div');
 gesture.id='photoGestureSurface';gesture.className='photo-gesture-surface';
 gesture.hidden=true;gesture.setAttribute('aria-label','Photo camera: drag to orbit, pinch to zoom');
 gesture.innerHTML=`<div id="photoFrameOverlay" class="photo-frame-overlay" aria-hidden="true">
 <div id="photoFramingGuide" class="photo-framing-guide"></div></div>`;
 const hud=document.createElement('section');hud.id='photoHud';
 hud.className='photo-hud';hud.hidden=true;hud.setAttribute('aria-label','Photo Mode controls');
 hud.innerHTML=`<div class="photo-topbar"><strong>FIELDWORK <span>/ PHOTO</span></strong>
   <button type="button" id="photoClose" aria-label="Exit Photo Mode">✕ CLOSE</button></div>
 <div class="photo-bottom">
  <div class="photo-options">
   <label>LENS <select id="photoLens" aria-label="Photo camera lens">
    <option value="ortho">ORTHO</option><option value="wide">WIDE</option>
    <option value="cam">CAM</option></select></label>
   <button type="button" id="photoMount" hidden>CAM · HELMET</button>
   <label>FRAME <select id="photoRatio" aria-label="Photo aspect ratio">
    <option value="screen">SCREEN</option><option value="16:9">16:9</option>
    <option value="4:5">4:5</option><option value="1:1">1:1</option></select></label>
   <label>GUIDE <select id="photoGuide" aria-label="Composition guides">
    <option value="thirds">THIRDS</option><option value="center">CENTER</option>
    <option value="off">OFF</option></select></label>
   <label>LOOK <select id="photoFilter" aria-label="Photo color treatment">
    <option value="original">ORIGINAL</option><option value="muted">MUTED</option>
    <option value="mono">B&W</option><option value="warm">WARM</option>
    <option value="contrast">CONTRAST</option></select></label>
   <label class="photo-strength-label">STRENGTH <input id="photoStrength"
    type="range" min="0" max="100" step="5" value="100"/></label>
  </div>
  <div class="photo-actions">
   <button type="button" id="photoFit">FIT SITE</button>
   <button type="button" id="photoFocus">FOCUS OPERATOR</button>
   <button type="button" id="photoReset">RESET</button>
   <button type="button" id="photoShutter" class="photo-shutter"
    aria-label="Take photograph"><span></span></button>
   <button type="button" id="photoGalleryOpen">GALLERY</button>
  </div>
  <output id="photoStatus" role="status" aria-live="polite">DRAG TO ORBIT · PINCH TO ZOOM</output>
 </div>`;
 const gallery=document.createElement('section');
 gallery.id='photoLibraryDialog';gallery.className='photo-library-dialog';
 gallery.hidden=true;gallery.setAttribute('role','dialog');
 gallery.setAttribute('aria-modal','true');gallery.setAttribute('aria-label','Photo library');
 gallery.innerHTML=`<div class="photo-library-panel">
  <div class="photo-library-heading"><strong>FIELDWORK / PHOTO LIBRARY</strong>
    <button id="photoGalleryClose" type="button">✕ CLOSE</button></div>
  <output id="photoGalleryStatus" role="status">YOUR PHOTOGRAPHS</output>
  <div id="photoGalleryGrid" class="photo-gallery-grid"></div>
  <div id="photoGalleryViewer" class="photo-gallery-viewer" hidden>
    <img id="photoGalleryImage" alt="Saved Fieldwork photograph"/>
    <div class="photo-gallery-actions">
     <button id="photoGalleryBack" type="button">BACK</button>
     <button id="photoGalleryExport" type="button">EXPORT</button>
     <button id="photoGalleryShare" type="button">SHARE</button>
     <button id="photoGalleryDelete" type="button">DELETE</button>
    </div>
  </div></div>`;
 document.body.append(gesture,hud,gallery);
 return {live,replay,access,clean,gesture,hud,gallery,
  frame:byId<HTMLElement>('photoFrameOverlay'),
  guide:byId<HTMLElement>('photoFramingGuide'),
  close:byId<HTMLButtonElement>('photoClose'),
  reset:byId<HTMLButtonElement>('photoReset'),
  fit:byId<HTMLButtonElement>('photoFit'),
  focus:byId<HTMLButtonElement>('photoFocus'),
  mount:byId<HTMLButtonElement>('photoMount'),
  shutter:byId<HTMLButtonElement>('photoShutter'),
  lens:byId<HTMLSelectElement>('photoLens'),
  ratio:byId<HTMLSelectElement>('photoRatio'),
  guides:byId<HTMLSelectElement>('photoGuide'),
  filter:byId<HTMLSelectElement>('photoFilter'),
  strength:byId<HTMLInputElement>('photoStrength'),
  status:byId<HTMLOutputElement>('photoStatus'),
  galleryOpen:byId<HTMLButtonElement>('photoGalleryOpen'),
  galleryClose:byId<HTMLButtonElement>('photoGalleryClose'),
  galleryStatus:byId<HTMLOutputElement>('photoGalleryStatus'),
  galleryGrid:byId<HTMLElement>('photoGalleryGrid'),
  viewer:byId<HTMLElement>('photoGalleryViewer'),
  viewerImage:byId<HTMLImageElement>('photoGalleryImage'),
  back:byId<HTMLButtonElement>('photoGalleryBack'),
  export:byId<HTMLButtonElement>('photoGalleryExport'),
  share:byId<HTMLButtonElement>('photoGalleryShare'),
  remove:byId<HTMLButtonElement>('photoGalleryDelete')
 };
}
