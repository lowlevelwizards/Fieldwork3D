/** MAP 02: Browse live environmental geometry with names and inspection.
 * Built from the same scene construction used in tactical encounters.
 */
import * as THREE from 'three';
import {TacticalScene3D} from './breach-3d.ts';
import {newSession} from './breach-game.ts';
import {activateSite,type Door,type Obstacle,type Segment,type Pt} from './breach-core.ts';
import {initDoor} from './breach-door.ts';
import {type Site,type WindowOpening} from './breach-site.ts';
import {assetLibrary,assetLibraryCategories,type AssetLibraryEntry} from './worldgen/asset-library.ts';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const category=el<HTMLSelectElement>('category'),search=el<HTMLInputElement>('search');
const summary=el<HTMLElement>('summary'),detail=el<HTMLOutputElement>('detail');
const labelLayer=el<HTMLElement>('labels');
const all=assetLibrary();
const PAGE_SIZE=12,COLUMNS=4,DX=155,DY=139;
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
let labels:{node:HTMLButtonElement;p:Pt;height:number}[]=[];
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
   const col=index%COLUMNS,row=Math.floor(index/COLUMNS);
   const x=118+col*DX,y=95+row*DY;
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
   }else if(item.id==='door'||item.id==='shutter'){
     const width=item.id==='shutter'?96:48;
     doors.push({id:'door-'+index,a:{x:x-width/2,y},b:{x:x+width/2,y},
       kind:item.id==='shutter'?'shutter':'hinged',open:false,openedAt:-1});
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
   rooms:[{id:'showroom',x:20,y:18,w:665,h:495,kind:'room',purpose:'showroom',tone:1}],
   walls,doors,windows,openings,cover,dressing,wallDetails,entrance:{x:350,y:485},
   spawn:[],enemies:[],objective:{x:350,y:450},extract:{x:350,y:450},
   roomCount:1,bounds:{minX:0,minY:0,maxX:705,maxY:535},programLocked:true,
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
 outline.position.set(118+(index%COLUMNS)*DX,h/2,
   95+Math.floor(index/COLUMNS)*DY);
 overlay.add(outline);
}
let shownEntries:readonly AssetLibraryEntry[]=[];
function focusSelected(){
 const index=shownEntries.findIndex(item=>item.id===selectedId);
 if(index<0)return;
 stage.view.focus={x:118+(index%COLUMNS)*DX,
   y:95+Math.floor(index/COLUMNS)*DY};
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
function refresh(){
 const found=filtered(),max=Math.max(0,Math.ceil(found.length/PAGE_SIZE)-1);
 page=Math.min(page,max);
 const shown=found.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
 shownEntries=shown;
 clearOutline();
 const site=sampleSite(shown);
 session.site=site;
 session.doors=site.doors.map(initDoor);
 activateSite(site);
 stage.applySite(site);
 labelLayer.replaceChildren();labels=[];
 for(const [index,item] of shown.entries()){
   const node=document.createElement('button');
   node.textContent=item.label;node.dataset.assetId=item.id;
   node.title=item.id+' · '+item.category;
   node.addEventListener('click',()=>select(item));
   labelLayer.append(node);
   labels.push({node,p:{x:118+(index%COLUMNS)*DX,y:95+Math.floor(index/COLUMNS)*DY},
     height:Math.min(58,item.height+13)});
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
el<HTMLButtonElement>('fit').addEventListener('click',()=>stage.resetCamera());
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
   if(lastMid)stage.panBetween(lastMid.x,lastMid.y,mid.x,mid.y);
   if(lastGap>8)stage.zoomAt(gap/lastGap,mid.x,mid.y);
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
 e.preventDefault();stage.zoomAt(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);
},{passive:false});
window.addEventListener('resize',()=>stage.resize(innerWidth,innerHeight));
refresh();
let last=performance.now();
function frame(now:number){
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 stage.update(session,'',dt,null,true);
 for(const marker of labels){
   const at=stage.project(marker.p,marker.height);
   marker.node.style.left=at.x+'px';marker.node.style.top=at.y+'px';
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
