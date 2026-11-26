/** WC2: stable, room-motivated covering assignments; no physical changes. */
import type {Site,Room,WindowOpening} from '../breach-site.ts';
import {normalizeWindowCovering,type CoveringFamily,type CoveringPalette,type CoveringPosition,type WindowCovering} from '../breach-window-coverings.ts';
const privateRooms=new Set(['bedroom','guest','bathroom','restroom','exam','treatment']);
const publicRooms=new Set(['sales','checkout','lobby','reception','waiting','dining']);
const residential=new Set(['house','townhouse','apartment','motel']);
const industrial=new Set(['garage','warehouse','utility']);
function sample(seed:number,id:string,salt:string):number{
 let n=(seed^0x811c9dc5)>>>0;
 for(const c of id+'|'+salt)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;n=Math.imul(n,0x846ca68b);n^=n>>>16;
 return (n>>>0)/4294967296;
}
/** Matches renderer rotation: local +Z maps to world -X for vertical walls. */
export function windowRoomFaces(site:Pick<Site,'rooms'>,w:WindowOpening):{room:Room;side:-1|1}[]{
 const result:{room:Room;side:-1|1}[]=[];
 for(const side of [-1,1] as const){
  const x=w.x-(w.vertical?side*13:0),y=w.y+(w.vertical?0:side*13);
  const room=site.rooms.find(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h);
  if(room)result.push({room,side});
 }return result;
}
export function chooseWindowCovering(site:Site,w:WindowOpening,seed:number):WindowCovering|undefined{
 if(w.treatment==='boarded'||w.treatment==='bars'||w.style==='clerestory'||w.style==='wire')return;
 const faces=windowRoomFaces(site,w);
 if(!faces.length)return;
 const face=faces.find(f=>privateRooms.has(f.room.purpose??''))??
  faces.find(f=>['office','meeting','study','cubicles'].includes(f.room.purpose??''))??faces[0];
 const role=face.room.purpose??'',kind=site.archetype??'house';
 const rng=(salt:string)=>sample(seed,w.id+'|'+face.room.id,salt);
 const chance=rng('presence'),choice=rng('family'),state=rng('state');
 const privacy=privateRooms.has(role),publicRoom=publicRooms.has(role);
 const vacant=site.condition==='vacant'||site.condition==='neglected';
 let family:CoveringFamily|undefined,side=face.side;
 if(w.interior){
  // Keep shared public glazing and kitchens clear.
  if(!['office','meeting','study','cubicles'].includes(role)||chance>.36)return;
  family=choice<.55?'vertical-blind':'horizontal-blind';
 }else if(residential.has(kind)){
  if(chance>(privacy?.94:vacant?.42:.78))return;
  family=kind==='motel'?(choice<.68?'curtain':'roller-shade'):
   choice<.51?'curtain':choice<.88?'horizontal-blind':
   kind==='house'||kind==='townhouse'?'hinged-shutter':'roller-shade';
 }else if(kind==='office'||kind==='clinic'){
  if(chance>(privacy?.95:publicRoom?.30:.70))return;
  family=kind==='clinic'&&privacy?'roller-shade':choice<.43?'vertical-blind':choice<.76?'horizontal-blind':'roller-shade';
 }else if(kind==='retail'||kind==='restaurant'){
  if(chance>(publicRoom?.22:.62))return;
  family=kind==='retail'&&w.style==='storefront'&&choice<.45?'rolling-shutter':
   kind==='restaurant'&&choice<.5?'curtain':'roller-shade';
 }else if(industrial.has(kind)){
  if(chance>.18)return;family='rolling-shutter';
 }
 if(!family)return;
 const hard=family.includes('shutter');
 if(hard){if(w.interior||faces.length!==1)return;side=face.side===1?-1:1;}
 // Hard shutters remain fully stowed until physical/traversal ownership in WC5.
 const opening:CoveringPosition=hard?1:privacy?(state<.62?0:state<.84?.25:.5):
  publicRoom?(state<.7?1:.5):state<.22?0:state<.42?.25:state<.72?.5:1;
 const palette:CoveringPalette=hard?'slate':(['linen','sand','sage','slate'] as const)[Math.floor(sample(seed,face.room.id,'palette')*4)]!;
 return normalizeWindowCovering({covering:{family,side,opening,palette,
  tilted:family.includes('blind')&&opening!==1&&!privacy&&rng('tilt')<.23}});
}
