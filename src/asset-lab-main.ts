/** MAP 02: Browse live environmental geometry with names and inspection.
 * Built from the same scene construction used in tactical encounters.
 */
import * as THREE from 'three';
import {pixelPattern,PIXEL_SURFACES,PIXEL_WORLD_SIZE,TEXELS_PER_OPERATOR,type PixelSurface} from './rendering/pixel-recipes.ts';
import {materialProfile} from './rendering/pixel-profiles.ts';

import {TacticalScene3D} from './breach-3d.ts';
import {newSession} from './breach-game.ts';
import {activateSite,type Door,type Obstacle,type Segment,type Pt} from './breach-core.ts';
import {synchronizeShowroomSession} from './asset-lab-preview.ts';
import {showroomGrid,showroomSlot} from './asset-lab-layout.ts';
import {type Site,type WindowOpening} from './breach-site.ts';
import {assetLibrary,assetLibraryCategories,type AssetLibraryEntry} from './worldgen/asset-library.ts';
import {OPERATOR_REFERENCE_HEIGHT,WORLD_UNITS_PER_METRE,metres} from './worldgen/world-scale.ts';
import {CHARACTER_FIXTURE_IDS} from './worldgen/asset-character-visuals.ts';
import {assetReviewInventory} from './worldgen/asset-review.ts';
import {propDefinition} from './worldgen/asset-catalog.ts';
import {assetPrimarySurface,assetMaterialDescription} from './worldgen/material-inspection.ts';
import {wearPixels,type WearTextureKind} from './rendering/pixel-decals.ts';
import {canWear} from './worldgen/material-properties.ts';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const category=el<HTMLSelectElement>('category'),search=el<HTMLInputElement>('search');
const summary=el<HTMLElement>('summary'),detail=el<HTMLOutputElement>('detail');
const labelLayer=el<HTMLElement>('labels');
const all=assetLibrary();
const reviewById=new Map(assetReviewInventory().map(r=>[r.id,r]));
const reviewPicker=el<HTMLSelectElement>('review-status');
let contextShown=false,scaleReferenceShown=true;
let layout=showroomGrid(innerWidth);
const header=el<HTMLElement>('lab-header'),controls=el<HTMLElement>('controls');
const overlay=new THREE.Group();
const swatch=el<HTMLCanvasElement>('pixel-swatch');
const swatchContext=swatch.getContext('2d');
const cleanSwatch=el<HTMLCanvasElement>('pixel-clean-swatch');
const cleanContext=cleanSwatch.getContext('2d');
const liveWear=new THREE.Group();
let texturesShown=true;
let wearMultiplier=1,selectedWearKind:WearTextureKind='oil';
const wearPicker=el<HTMLSelectElement>('wear-kind');
const wearKinds:WearTextureKind[]=['oil','grease','rust','chip','crack','scratch',
 'drip','mud','footprint','mineral','fade','dust','stain','scrape','scuff',
 'soot','moss','paint-peel'];
for(const kind of wearKinds){
 const option=document.createElement('option');option.value=kind;
 option.textContent=kind.replaceAll('-',' ');
 wearPicker.append(option);
}
wearPicker.value=selectedWearKind;

let swatchSeed=0,swatchCondition='clean',currentSurface:PixelSurface='wood';
const surfacePicker=el<HTMLSelectElement>('material-family');
for(const kind of PIXEL_SURFACES){
 const option=document.createElement('option');option.value=kind;
 option.textContent=kind.replaceAll('-',' ');surfacePicker.append(option);
}
function swatchMaterial(kind:PixelSurface){
 currentSurface=kind;
 surfacePicker.value=kind;
 if(!swatchContext)return;
 const bytes=pixelPattern(kind,swatchSeed,32);
 if(cleanContext)cleanContext.putImageData(new ImageData(new Uint8ClampedArray(bytes),32,32),0,0);
 // Preview-only localized condition examples. Does not mutate game materials.
 if(swatchCondition!=='clean'){
   const n=swatchCondition==='neglected'?3:2;
   for(let p=0;p<n;p++){
     const left=5+p*9,top=8+(p%2)*13;
     for(let y=top;y<top+3;y++)for(let x=left;x<left+4;x++){
       const i=(y*32+x)*4;
       bytes[i]=bytes[i+1]=bytes[i+2]=swatchCondition==='vacant'?237:223;
     }
   }
 }
 swatchContext.putImageData(new ImageData(new Uint8ClampedArray(bytes),32,32),0,0);
 el<HTMLElement>('pixel-detail').textContent=kind.toUpperCase()+
   ' · 32×32 source tile · '+TEXELS_PER_OPERATOR+
   ' texels/operator · '+PIXEL_WORLD_SIZE.toFixed(2)+' world units/texel'+
   ' · '+materialProfile(kind).structure+' · '+swatchCondition+' · seed '+swatchSeed;
}
function drawWearPreview(){
 const canvas=el<HTMLCanvasElement>('wear-swatch'),ctx=canvas.getContext('2d');
 if(!ctx)return;
 const pixels=wearPixels(selectedWearKind,swatchSeed);
 const dst=new Uint8ClampedArray(pixels);
 for(let i=0;i<dst.length;i+=4){
   // Pixel-perfect RGB compositing on neutral backing for a readable gallery.
   const alpha=dst[i+3]/255*Math.min(1,.45*wearMultiplier);
   const base=208,ink=selectedWearKind==='rust'?123:
     selectedWearKind==='oil'?54:93;
   dst[i]=Math.round(base*(1-alpha)+ink*alpha);
   dst[i+1]=Math.round(base*(1-alpha)+(selectedWearKind==='rust'?79:ink)*alpha);
   dst[i+2]=Math.round(base*(1-alpha)+(selectedWearKind==='rust'?49:ink)*alpha);
   dst[i+3]=255;
 }
 ctx.putImageData(new ImageData(dst,32,32),0,0);
 const asset=all.find(x=>x.id===selectedId);
 const surface=asset?assetPrimarySurface(asset):currentSurface;
 el<HTMLElement>('wear-diagnostics').textContent=
  selectedWearKind.toUpperCase()+' · '+(canWear(surface,selectedWearKind)?
   'COMPATIBLE':'INCOMPATIBLE')+' with '+surface+
   ' · preview ×'+wearMultiplier;
}
let outline:THREE.LineSegments|null=null;
let showBounds=false;
for(const kind of assetLibraryCategories()){
 const opt=document.createElement('option');opt.value=kind;opt.textContent=kind;
 category.append(opt);
}
let page=0,selectedId:string|null=null;
// Preview-only variants: all tactical footprints remain catalog authoritative.
const showroomVariants=new Map<string,number>();
const showroomMaterials=new Map<string,PixelSurface>();
const session=newSession(0,101);
session.operators=[]; // There are no actors in the asset showroom.
const stage=new TacticalScene3D();
stage.scene.add(liveWear);
const wearPreviewMaterials=new Map<string,THREE.MeshBasicMaterial>();
function clearLiveWear(){
 for(const child of liveWear.children){
   if(child instanceof THREE.Mesh)child.geometry.dispose();
 }
 liveWear.clear();
}
function showLiveWear(item:AssetLibraryEntry){
 clearLiveWear();
 if(swatchCondition==='clean'||item.origin==='dressing')return;
 const kind=selectedWearKind;
 if(!canWear(assetPrimarySurface(item),kind))return;
 let mat=wearPreviewMaterials.get(kind);
 if(!mat){
   const texture=new THREE.DataTexture(wearPixels(kind),32,32,THREE.RGBAFormat);
   texture.needsUpdate=true;texture.magFilter=THREE.NearestFilter;
   texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
   mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.22,
     depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});
   wearPreviewMaterials.set(kind,mat);
 }
 mat.opacity=Math.min(1,.22*wearMultiplier);
 const ix=shownEntries.findIndex(x=>x.id===item.id);if(ix<0)return;
 const at=showroomSlot(ix,layout);
 const decal=new THREE.Mesh(new THREE.PlaneGeometry(
   Math.max(3,item.width*.42),Math.max(3,item.height*.22)),mat);
 decal.position.set(at.x,Math.max(3,item.height*.24),at.y+item.depth/2+.7);
 decal.castShadow=false;decal.receiveShadow=false;liveWear.add(decal);
}
stage.setMode('iso');
stage.scene.add(overlay);
// A full-size tactical operator silhouette accompanies EVERY asset preview.
// These translucent calibration figures have no collision or AI presence.
const scaleGuides=new THREE.Group(),structureSamples=new THREE.Group();
stage.scene.add(scaleGuides,structureSamples);
const guideMat=new THREE.MeshStandardMaterial({
 color:0xd5bb83,roughness:.95,transparent:true,opacity:.64,depthWrite:false,
});
const guideParts:[
 number,number,number,number,number,number
][]=[
 [0,26,0,8,16,5],   // torso
 [0,38,0,7,8,7],    // head; highest point = 42
 [-2.4,10,0,3,20,4],[2.4,10,0,3,20,4], // legs
 [-5.3,25,0,3,15,4],[5.3,25,0,3,15,4], // arms
];
const guideGeometries=guideParts.map(p=>new THREE.BoxGeometry(p[3],p[4],p[5]));
const architectureMat=new THREE.MeshStandardMaterial({
 color:0xb8a98e,roughness:1,flatShading:true,
});
function refreshScaleGuides(items:readonly AssetLibraryEntry[]){
 scaleGuides.clear();
 if(!items.length)return;
 // Six shared meshes instead of six draw calls PER displayed asset.
 const dummy=new THREE.Object3D();
 for(let i=0;i<guideParts.length;i++){
   const part=guideParts[i];
   const mesh=new THREE.InstancedMesh(guideGeometries[i],guideMat,items.length);
   for(const [index] of items.entries()){
     const at=showroomSlot(index,layout);
     const item=items[index];
     // Never put the scale figure inside a vehicle or large tree trunk.
     dummy.position.set(at.x+Math.min(71,item.width*.5+12)+part[0],
       part[1],at.y+Math.min(60,item.depth*.5+12)+part[2]);
     dummy.updateMatrix();
     mesh.setMatrixAt(index,dummy.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
   mesh.castShadow=false;mesh.receiveShadow=false;
   scaleGuides.add(mesh);
 }
}
function refreshArchitectureSamples(items:readonly AssetLibraryEntry[]){
 for(const child of structureSamples.children)
   if(child instanceof THREE.Mesh)child.geometry.dispose();
 structureSamples.clear();
 for(const [index,item] of items.entries()){
   if(!['floor','wall-cap','baseboard'].includes(item.id))continue;
   const at=showroomSlot(index,layout),h=item.height;
   const geometry=new THREE.BoxGeometry(item.width,h,item.depth);
   const mesh=new THREE.Mesh(geometry,architectureMat);
   mesh.position.set(at.x,item.id==='wall-cap'?41:
     item.id==='baseboard'?2:Math.max(.5,h/2),at.y);
   structureSamples.add(mesh);
 }
}
let labels:{node:HTMLButtonElement;p:Pt}[]=[];
function filtered(){
 const term=search.value.trim().toLowerCase();
 const status=reviewPicker.value;
 return all.filter(item=>(!status||reviewById.get(item.id)?.status===status)&&
   (!category.value||item.category===category.value)&&
   (!term||[item.id,item.label,item.category,...item.rooms].join(' ').toLowerCase().includes(term)));
}
function sampleSite(items:readonly AssetLibraryEntry[]):Site{
 const cover:Obstacle[]=[],walls:Segment[]=[],doors:Door[]=[];
 const windows:WindowOpening[]=[],openings:NonNullable<Site['openings']>=[];
 const dressing:NonNullable<Site['dressing']>=[];
 const wallDetails:NonNullable<Site['wallDetails']>=[];
 for(const [index,item] of items.entries()){
   const {x,y}=showroomSlot(index,layout);
   if(item.origin==='fixture'){
     cover.push({x,y,w:item.width,h:item.depth,low:item.cover==='low',
       fixture:item.id,artVariant:index+(showroomVariants.get(item.id)??0),
      ...(item.id===selectedId?{
        artCondition:el<HTMLSelectElement>('surface-condition').value as 'clean'|'used'|'neglected'|'vacant',
        artSurface:showroomMaterials.get(item.id),
      }:{})});
     if(contextShown&&item.id===selectedId){
       // Real catalog models, not fake context mockups.
       const companion:Record<string,string>={
         'office-chair':'desk',shower:'sink',dumpster:'trash-bin',
         sedan:'parking-block',pickup:'parking-block',van:'parking-block',
         suv:'parking-block',vehicle:'parking-block',
         'tree-broadleaf':'shrub-round','tree-conifer':'shrub-round',
         'tree-scrub':'shrub-round','tool-chest':'workbench',
       };
       const other=propDefinition(companion[item.id]??'');
       if(other)cover.push({x:x+Math.min(49,(item.width+other.width)*.5+8),
         y:y+Math.min(52,(item.depth+other.depth)*.5+8),
         w:other.width,h:other.depth,low:other.cover==='low',fixture:other.id});
     }
   }else if(item.origin==='dressing'){
     dressing.push({id:item.id,roomId:'showroom',kind:item.id.slice(7) as
       NonNullable<Site['dressing']>[number]['kind'],
       x,y,elevation:0,angle:0});
   }else if(item.id==='wall'){
     walls.push({a:{x:x-40,y},b:{x:x+40,y}});
   }else if(item.id==='service-hatch'){
     openings.push({id:'service-hatch-'+index,
       a:{x:x-29,y},b:{x:x+29,y},kind:'serving'});
     cover.push({x,y,w:58,h:10,fixture:'window-sill',low:true});
   }else if(item.id==='window'||item.id.startsWith('window:')){
     windows.push({id:'window-'+index,x,y,width:52,vertical:false,
       style:item.id==='window:interior'||item.id==='window:full-height'?'picture':item.id.startsWith('window:')?
         item.id.slice(7) as NonNullable<WindowOpening['style']>:'standard',
       interior:item.id==='window:interior',
       sillHeight:item.id==='window:full-height'?0:item.id==='window:interior'?9:undefined,
       headHeight:item.id==='window:full-height'?39:item.id==='window:interior'?37:undefined});
   }else if(item.id==='door'||item.id==='shutter'||item.id.startsWith('door:')){
     const width=item.id==='shutter'?96:48;
     doors.push({id:'door-'+index,a:{x:x-width/2,y},b:{x:x+width/2,y},
       kind:item.id==='shutter'?'shutter':['door:sliding-glass','door:barn','door:pocket'].includes(item.id)?'sliding':'hinged',
       slideDirection:['door:sliding-glass','door:barn','door:pocket'].includes(item.id)?1:undefined,
       open:false,openedAt:-1,
       style:item.id==='door:sliding-glass'?'glazed':item.id.startsWith('door:')?
         item.id.slice(5) as NonNullable<Door['style']>:'wood'});
   }else if(item.id.startsWith('wall-detail:')){
     const id=item.id.slice('wall-detail:'.length);
     walls.push({a:{x:x-37,y:y-6},b:{x:x+37,y:y-6}});
     wallDetails.push({id:item.id,roomId:'showroom',
       kind:id as NonNullable<Site['wallDetails']>[number]['kind'],
       x,y,height:id==='light-switch'?17:id==='exit-sign'?31:
         id==='electrical-box'||id==='breaker-panel'?21:25,
       angle:0,width:item.width,depth:item.height});
   }else if(item.id==='arch'){
     openings.push({id:'arch-'+index,a:{x:x-36,y},b:{x:x+36,y},kind:'arch'});
   }
 }
 return {
   seed:1,name:'ASSET SHOWROOM',archetype:'warehouse',layout:'office',
   rooms:[{id:'showroom',x:12,y:12,w:layout.width-24,h:layout.height-24,
     kind:'room',purpose:'showroom',tone:1}],
   walls,doors,windows,openings,cover,dressing,wallDetails,
   entrance:{x:layout.width/2,y:layout.height-24},
   spawn:[],enemies:[],objective:{x:layout.width/2,y:layout.height-32},
   extract:{x:layout.width/2,y:layout.height-32},
   roomCount:1,bounds:{minX:0,minY:0,maxX:layout.width,maxY:layout.height},
   programLocked:true,
 };
}
function clearOutline(){
 if(outline){overlay.remove(outline);outline.geometry.dispose();
   (outline.material as THREE.Material).dispose();outline=null;}
}
function showSelectionOutline(){
 clearOutline();
 if(!showBounds||!selectedId)return;
 const index=shownEntries.findIndex(item=>item.id===selectedId);
 if(index<0)return;
 const item=shownEntries[index];
 const h=Math.max(1,item.height),w=item.width,d=item.depth;
 const geometry=new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d));
 const material=new THREE.LineBasicMaterial({color:item.solid?0xf1aa75:0x90c8b8,
   depthTest:true,transparent:true,opacity:.86});
 outline=new THREE.LineSegments(geometry,material);
 const at=showroomSlot(index,layout);
 outline.position.set(at.x,h/2,at.y);
 overlay.add(outline);
}
let shownEntries:readonly AssetLibraryEntry[]=[];
function focusSelected(){
 const index=shownEntries.findIndex(item=>item.id===selectedId);
 if(index<0)return;
 stage.view.focus=showroomSlot(index,layout);
 const item=shownEntries[index];
 stage.view.zoom=Math.max(1.95,Math.min(5.2,
   3.25*Math.sqrt(48/Math.max(item.width,item.depth,item.height))));
 stage.updateCamera(1);
}
function select(item:AssetLibraryEntry){
 selectedId=item.id;
 const pixelKind:PixelSurface=assetPrimarySurface(item);
 swatchMaterial(showroomMaterials.get(item.id)??pixelKind);
 showLiveWear(item);
 el<HTMLElement>('material-diagnostics').textContent=assetMaterialDescription(item);
 detail.textContent=item.label+' ['+item.id+'] · '+item.category.toUpperCase()+
   '\n'+item.width+' × '+item.depth+' × '+item.height+' world units ('+
    [item.width,item.depth,item.height].map(v=>metres(v).toFixed(2)).join(' × ')+
    ' m) · cover: '+item.cover+
   ' · '+(item.solid?'physical':'visual-only')+
   '\n'+item.origin+' / '+item.presentation+
   (CHARACTER_FIXTURE_IDS.has(item.id)?
     ' · silhouette trim '+((showroomVariants.get(item.id)??0)+1)+' / 3':'')+
   (item.presentation==='shared-shape'?' (generic model — review recommended)':'')+
   (item.rooms.length?'\nRooms: '+item.rooms.join(', '):'');
 for(const marker of labels)marker.node.setAttribute('aria-pressed',
   String(marker.node.dataset.assetId===selectedId));
 el<HTMLButtonElement>('variant').disabled=!CHARACTER_FIXTURE_IDS.has(item.id);
 showSelectionOutline();
}
/** Keep the preview canvas above the bottom inspector. The 3D projection
 * and HTML names must be measured in the SAME visible viewport.
 */
let lastCanvasWidth=0,lastCanvasHeight=0,lastCanvasTop=-1;
function sizeShowroomViewport(){
 const top=Math.round(header.getBoundingClientRect().bottom);
 const bottom=Math.round(controls.getBoundingClientRect().top);
 const width=innerWidth,height=Math.max(180,bottom-top);
 if(width===lastCanvasWidth&&height===lastCanvasHeight&&
   top===lastCanvasTop)return;
 lastCanvasWidth=width;lastCanvasHeight=height;lastCanvasTop=top;
 stage.canvas.style.top=top+'px';
 stage.canvas.style.bottom='auto';
 stage.canvas.style.height=height+'px';
 stage.resize(width,height);
}
function fitShowroom(){
 sizeShowroomViewport();
 stage.resetCamera();
 // A complete orthographic fit at every camera aspect/rotation.
 const aspect=lastCanvasWidth/Math.max(1,lastCanvasHeight);
 const diagonal=Math.hypot(layout.width,layout.height);
 const baseSpan=Math.max(820,(diagonal+66)/aspect);
 const desired=Math.max(layout.height*1.35,
   (diagonal*.94+60)/Math.max(.1,aspect),
   diagonal*.94+60);
 stage.view.zoom=Math.max(.65,Math.min(3.5,baseSpan/desired));
 stage.updateCamera(1);
}
function refresh(){
 clearLiveWear();
 const found=filtered(),max=Math.max(0,Math.ceil(found.length/layout.pageSize)-1);
 page=Math.min(page,max);
 const shown=found.slice(page*layout.pageSize,(page+1)*layout.pageSize);
 shownEntries=shown;
 clearOutline();
 const site=sampleSite(shown);
 synchronizeShowroomSession(session,site);
 activateSite(site);
 stage.applySite(site);
 refreshScaleGuides(shown);
 refreshArchitectureSamples(shown);
 fitShowroom();
 labelLayer.replaceChildren();labels=[];
 for(const [index,item] of shown.entries()){
   const node=document.createElement('button');
   node.textContent=item.label;node.dataset.assetId=item.id;
   node.title=item.id+' · '+item.category;
   node.addEventListener('click',()=>{select(item);if(contextShown)refresh();});
   labelLayer.append(node);
   labels.push({node,p:showroomSlot(index,layout)});
 }
 if(selectedId){
   const selected=shown.find(x=>x.id===selectedId);
   if(selected)select(selected);else selectedId=null;
 }
 if(!selectedId&&shown[0])select(shown[0]);
 if(!shown.length)detail.textContent='No assets match this filter.';
 summary.textContent=found.length+' assets · page '+(page+1)+' / '+(max+1)+
   ' · '+WORLD_UNITS_PER_METRE+' units/m · gold figure: '+
   metres(OPERATOR_REFERENCE_HEIGHT).toFixed(1)+'m operator reference';
 el<HTMLButtonElement>('previous').disabled=page===0;
 el<HTMLButtonElement>('next').disabled=page===max;
}
el<HTMLButtonElement>('next').addEventListener('click',()=>{page++;selectedId=null;refresh();});
el<HTMLButtonElement>('previous').addEventListener('click',()=>{page--;selectedId=null;refresh();});
category.addEventListener('change',()=>{page=0;selectedId=null;refresh();});
reviewPicker.addEventListener('change',()=>{page=0;selectedId=null;refresh();});
search.addEventListener('input',()=>{page=0;selectedId=null;refresh();});
el<HTMLButtonElement>('iso').addEventListener('click',()=>stage.setMode('iso'));
el<HTMLButtonElement>('top').addEventListener('click',()=>stage.setMode('top'));
el<HTMLButtonElement>('fit').addEventListener('click',fitShowroom);
el<HTMLButtonElement>('focus').addEventListener('click',focusSelected);
el<HTMLButtonElement>('scale-reference').addEventListener('click',()=>{
 scaleReferenceShown=!scaleReferenceShown;
 scaleGuides.visible=scaleReferenceShown;
 el<HTMLButtonElement>('scale-reference').setAttribute('aria-pressed',String(scaleReferenceShown));
});
el<HTMLButtonElement>('context').addEventListener('click',()=>{
 contextShown=!contextShown;
 el<HTMLButtonElement>('context').setAttribute('aria-pressed',String(contextShown));
 el<HTMLButtonElement>('context').textContent=contextShown?'CONTEXT ON':'CONTEXT OFF';
 refresh();
});
wearPicker.addEventListener('change',()=>{
 selectedWearKind=wearPicker.value as WearTextureKind;
 drawWearPreview();
 const asset=all.find(x=>x.id===selectedId);
 if(asset)showLiveWear(asset);
});
el<HTMLButtonElement>('wear-boost').addEventListener('click',()=>{
 wearMultiplier=wearMultiplier===1?2:wearMultiplier===2?4:1;
 stage.setWearExaggeration(wearMultiplier);
 for(const material of wearPreviewMaterials.values())
  material.opacity=Math.min(1,.22*wearMultiplier);
 el<HTMLButtonElement>('wear-boost').textContent='WEAR ×'+wearMultiplier;
 drawWearPreview();
});
surfacePicker.addEventListener('change',()=>{
 const selected=surfacePicker.value as PixelSurface;
 if(selectedId)showroomMaterials.set(selectedId,selected);
 swatchMaterial(selected);refresh();
});
el<HTMLSelectElement>('surface-condition').addEventListener('change',e=>{
 swatchCondition=(e.currentTarget as HTMLSelectElement).value;
 swatchMaterial(currentSurface);
 refresh(); // apply material-aware finish on the actual previewed geometry
});
el<HTMLButtonElement>('texture-variant').addEventListener('click',()=>{
 swatchSeed=(swatchSeed+1)%4;
 swatchMaterial(currentSurface);drawWearPreview();
});
for(const [id,zoom] of [['zoom-close',4.5],['zoom-tactical',2.3],
  ['zoom-overview',.95]] as const){
 el<HTMLButtonElement>(id).addEventListener('click',()=>{
   focusSelected();
   stage.view.zoom=zoom;stage.updateCamera(1);
 });
}
el<HTMLButtonElement>('textures').addEventListener('click',()=>{
 texturesShown=!texturesShown;
 stage.setPixelTextures(texturesShown);
 el<HTMLButtonElement>('textures').setAttribute('aria-pressed',String(texturesShown));
 el<HTMLButtonElement>('textures').textContent=texturesShown?'TEXTURES ON':'TEXTURES OFF';
});
el<HTMLButtonElement>('bounds').addEventListener('click',()=>{
 showBounds=!showBounds;
 el<HTMLButtonElement>('bounds').setAttribute('aria-pressed',String(showBounds));
 showSelectionOutline();
});
el<HTMLButtonElement>('variant').addEventListener('click',()=>{
 if(!selectedId||!CHARACTER_FIXTURE_IDS.has(selectedId))return;
 showroomVariants.set(selectedId,((showroomVariants.get(selectedId)??0)+1)%3);
 refresh();focusSelected();
});
el<HTMLButtonElement>('review').addEventListener('click',()=>{
 const weak=all.filter(a=>a.origin==='fixture');
 if(!weak.length)return;
 const next=weak[(weak.findIndex(a=>a.id===selectedId)+1)%weak.length];
 category.value='';search.value=next.id;
 page=0;selectedId=null;refresh();focusSelected();
});
const fingers=new Map<number,Pt>();
let lastMid:Pt|null=null,lastGap=0;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const canvasY=(y:number)=>y-stage.canvas.getBoundingClientRect().top;
document.body.addEventListener('pointerdown',event=>{
 if((event.target as Element).closest('header,#controls,#labels'))return;
 event.preventDefault();document.body.setPointerCapture(event.pointerId);
 fingers.set(event.pointerId,{x:event.clientX,y:event.clientY});
});
document.body.addEventListener('pointermove',event=>{
 const prior=fingers.get(event.pointerId);if(!prior)return;
 const next={x:event.clientX,y:event.clientY};
 const dx=next.x-prior.x,dy=next.y-prior.y;fingers.set(event.pointerId,next);
 if(fingers.size===2){
   const [a,b]=[...fingers.values()];
   const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},gap=distance(a,b);
   if(lastMid)stage.panBetween(lastMid.x,canvasY(lastMid.y),mid.x,canvasY(mid.y));
   if(lastGap>8)stage.zoomAt(gap/lastGap,mid.x,canvasY(mid.y));
   lastMid=mid;lastGap=gap;
 }else stage.orbit(dx,dy);
});
const release=(event:PointerEvent)=>{
 fingers.delete(event.pointerId);
 if(fingers.size<2){lastMid=null;lastGap=0;}
};
document.body.addEventListener('pointerup',release);
document.body.addEventListener('pointercancel',release);
window.addEventListener('wheel',e=>{
 e.preventDefault();stage.zoomAt(Math.exp(-e.deltaY*.001),e.clientX,canvasY(e.clientY));
},{passive:false});
window.addEventListener('resize',()=>{
 const next=showroomGrid(innerWidth);
 if(next.columns!==layout.columns){layout=next;page=0;refresh();}
 else{sizeShowroomViewport();fitShowroom();}
});
refresh();
new ResizeObserver(()=>sizeShowroomViewport()).observe(controls);
let last=performance.now();
function frame(now:number){
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 stage.update(session,'',dt,null,true);
 for(const marker of labels){
   // The label is attached to its model's GROUND FOOTPRINT, not an
   // invented height from catalog metadata. It stays under the preview
   // after camera orbit, zoom, filtering and page changes.
   const at=stage.project(marker.p,0);
   const viewport=stage.canvas.getBoundingClientRect();
   const x=Math.max(52,Math.min(innerWidth-52,at.x));
   const y=viewport.top+at.y+9;
   marker.node.hidden=at.x<-12||at.x>innerWidth+12||
     y<viewport.top+4||y>viewport.bottom-15;
   marker.node.style.left=x+'px';marker.node.style.top=y+'px';
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
