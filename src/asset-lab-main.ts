/** MAP 02: Browse live environmental geometry with names and inspection.
 * Built from the same scene construction used in tactical encounters.
 */
import * as THREE from 'three';
import {TacticalScene3D} from './breach-3d.ts';
import {newSession} from './breach-game.ts';
import {activateSite,type Door,type Obstacle,type Segment,type Pt} from './breach-core.ts';
import {synchronizeShowroomSession} from './asset-lab-preview.ts';
import {showroomGrid,showroomSlot} from './asset-lab-layout.ts';
import {type Site,type WindowOpening} from './breach-site.ts';
import {assetLibrary,assetLibraryCategories,type AssetLibraryEntry} from './worldgen/asset-library.ts';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const category=el<HTMLSelectElement>('category'),search=el<HTMLInputElement>('search');
const summary=el<HTMLElement>('summary'),detail=el<HTMLOutputElement>('detail');
const labelLayer=el<HTMLElement>('labels');
const all=assetLibrary();
let layout=showroomGrid(innerWidth);
const header=el<HTMLElement>('lab-header'),controls=el<HTMLElement>('controls');
const overlay=new THREE.Group();
let outline:THREE.LineSegments|null=null;
let showBounds=false;
for(const kind of assetLibraryCategories()){
 const opt=document.createElement('option');opt.value=kind;opt.textContent=kind;
 category.append(opt);
}
let page=0,selectedId:string|null=null;
const session=newSession(0,101);
session.operators=[]; // There are no actors in the asset showroom.
const stage=new TacticalScene3D();
stage.setMode('iso');
stage.scene.add(overlay);
let labels:{node:HTMLButtonElement;p:Pt}[]=[];
function filtered(){
 const term=search.value.trim().toLowerCase();
 return all.filter(item=>(!category.value||item.category===category.value)&&
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
     cover.push({x,y,w:item.width,h:item.depth,low:item.cover==='low',fixture:item.id});
   }else if(item.origin==='dressing'){
     dressing.push({id:item.id,roomId:'showroom',kind:item.id.slice(7) as
       NonNullable<Site['dressing']>[number]['kind'],
       x,y,elevation:0,angle:0});
   }else if(item.id==='wall'||item.id==='wall-cap'||item.id==='baseboard'){
     walls.push({a:{x:x-40,y},b:{x:x+40,y}});
   }else if(item.id==='window'||item.id.startsWith('window:')){
     windows.push({id:'window-'+index,x,y,width:52,vertical:false,
       style:item.id.startsWith('window:')?
         item.id.slice(7) as NonNullable<WindowOpening['style']>:'standard'});
   }else if(item.id==='door'||item.id==='shutter'||item.id.startsWith('door:')){
     const width=item.id==='shutter'?96:48;
     doors.push({id:'door-'+index,a:{x:x-width/2,y},b:{x:x+width/2,y},
       kind:item.id==='shutter'?'shutter':'hinged',open:false,openedAt:-1,
       style:item.id.startsWith('door:')?
         item.id.slice(5) as NonNullable<Door['style']>:'wood'});
   }else if(item.id.startsWith('wall-detail:')){
     const id=item.id.slice('wall-detail:'.length);
     walls.push({a:{x:x-37,y:y-6},b:{x:x+37,y:y-6}});
     wallDetails.push({id:item.id,roomId:'showroom',
       kind:id as NonNullable<Site['wallDetails']>[number]['kind'],
       x,y,height:23,angle:0,width:22,depth:17});
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
 stage.view.zoom=3.3;stage.updateCamera(1);
}
function select(item:AssetLibraryEntry){
 selectedId=item.id;
 detail.textContent=item.label+' ['+item.id+'] · '+item.category.toUpperCase()+
   '\n'+item.width+' × '+item.depth+' × '+item.height+' world units · cover: '+item.cover+
   ' · '+(item.solid?'physical':'visual-only')+
   '\n'+item.origin+' / '+item.presentation+
   (item.presentation==='shared-shape'?' (generic model — review recommended)':'')+
   (item.rooms.length?'\nRooms: '+item.rooms.join(', '):'');
 for(const marker of labels)marker.node.setAttribute('aria-pressed',
   String(marker.node.dataset.assetId===selectedId));
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
 const found=filtered(),max=Math.max(0,Math.ceil(found.length/layout.pageSize)-1);
 page=Math.min(page,max);
 const shown=found.slice(page*layout.pageSize,(page+1)*layout.pageSize);
 shownEntries=shown;
 clearOutline();
 const site=sampleSite(shown);
 synchronizeShowroomSession(session,site);
 activateSite(site);
 stage.applySite(site);
 fitShowroom();
 labelLayer.replaceChildren();labels=[];
 for(const [index,item] of shown.entries()){
   const node=document.createElement('button');
   node.textContent=item.label;node.dataset.assetId=item.id;
   node.title=item.id+' · '+item.category;
   node.addEventListener('click',()=>select(item));
   labelLayer.append(node);
   labels.push({node,p:showroomSlot(index,layout)});
 }
 if(selectedId){
   const selected=shown.find(x=>x.id===selectedId);
   if(selected)select(selected);else selectedId=null;
 }
 if(!selectedId&&shown[0])select(shown[0]);
 if(!shown.length)detail.textContent='No assets match this filter.';
 summary.textContent=found.length+' assets · page '+(page+1)+' / '+(max+1);
 el<HTMLButtonElement>('previous').disabled=page===0;
 el<HTMLButtonElement>('next').disabled=page===max;
}
el<HTMLButtonElement>('next').addEventListener('click',()=>{page++;selectedId=null;refresh();});
el<HTMLButtonElement>('previous').addEventListener('click',()=>{page--;selectedId=null;refresh();});
category.addEventListener('change',()=>{page=0;selectedId=null;refresh();});
search.addEventListener('input',()=>{page=0;selectedId=null;refresh();});
el<HTMLButtonElement>('iso').addEventListener('click',()=>stage.setMode('iso'));
el<HTMLButtonElement>('top').addEventListener('click',()=>stage.setMode('top'));
el<HTMLButtonElement>('fit').addEventListener('click',fitShowroom);
el<HTMLButtonElement>('focus').addEventListener('click',focusSelected);
el<HTMLButtonElement>('bounds').addEventListener('click',()=>{
 showBounds=!showBounds;
 el<HTMLButtonElement>('bounds').setAttribute('aria-pressed',String(showBounds));
 showSelectionOutline();
});
el<HTMLButtonElement>('review').addEventListener('click',()=>{
 const weak=all.filter(a=>a.presentation==='shared-shape');
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
