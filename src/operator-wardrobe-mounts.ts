/** Named visual sockets for advanced Wardrobe placement.
 * This does not create inventory or change access timing. Invalid positions
 * are ignored; the existing authoritative carry ledger remains the truth.
 */
import type {CarryLocation} from './equipment-carry-placement.ts';
import type {EquipmentCarrySocket} from './equipment-carry-visuals.ts';
export type WardrobeMountedKind='medical'|'utility';
export type WardrobeMount={id:string;name:string;location:CarryLocation;
 kind:WardrobeMountedKind;socket:EquipmentCarrySocket;longAllowed:boolean};
const entries:WardrobeMount[]=[];
const m=(kind:WardrobeMountedKind,id:string,name:string,location:CarryLocation,
 bone:EquipmentCarrySocket['bone'],x:number,y:number,z:number,
 longAllowed=false)=>{
 entries.push({kind,id,name,location,longAllowed,
  socket:{bone,x,y,z,angle:0}});
};
for(const kind of ['medical','utility'] as const){
 m(kind,kind+'-rig-left','Chest left','rig','chest',1.1,-3.6,-8.6,false);
 m(kind,kind+'-rig-right','Chest right','rig','chest',1.1,-3.6,8.6,false);
 m(kind,kind+'-belt-left','Belt left','belt','hip',.3,-2.7,-8.35,false);
 m(kind,kind+'-belt-right','Belt right','belt','hip',.3,-2.7,8.35,false);
 m(kind,kind+'-belt-rear','Belt rear','belt','hip',-4.2,-2.5,-6.9,false);
 m(kind,kind+'-pack-left','Pack left','backpack','pack',-1.3,1.8,-8.5,true);
 m(kind,kind+'-pack-right','Pack right','backpack','pack',-1.3,1.8,8.5,true);
 m(kind,kind+'-pocket-left','Left pocket','pocket','hip',-1.6,-4,-6.4,false);
 m(kind,kind+'-pocket-right','Right pocket','pocket','hip',-1.6,-4,6.4,false);
}
export const WARDROBE_MOUNTS:readonly WardrobeMount[]=entries;
export const wardrobeMount=(id:string)=>WARDROBE_MOUNTS.find(x=>x.id===id);
const longTools=['utility-breach','utility-pry','utility-cutter'];
export function resolveWardrobeDisplayMount(
 kind:WardrobeMountedKind,location:CarryLocation,
 requested:string|undefined,itemId:string,
 hasBackpack:boolean):EquipmentCarrySocket|undefined{
 if(!requested)return;
 const chosen=wardrobeMount(requested);
 if(!chosen||chosen.kind!==kind||chosen.location!==location)return;
 if(chosen.socket.bone==='pack'&&!hasBackpack)return;
 if(kind==='utility'&&longTools.includes(itemId)&&!chosen.longAllowed)
  return; // never mount a long tool through the operator's thigh
 return chosen.socket;
}
