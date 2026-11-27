import {restoreBeltFlashRest} from './operator-belt-flash-pouches.ts';
/** F6.2 — one reusable, physically issued flash canister handoff.
 * No cloned mesh, geometry allocation, projectile, sound or inventory write.
 * The SAME canister is moved between its authored pouch and support hand.
 */
import type {OperatorRig} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import {sampleEquipmentGesture}
 from './breach-equipment-interaction-pose.ts';
import {visibleFlashCanisters,flashCanisterSocket,
 visibleDoorWedges,wedgeSocket,visibleFlexCuffs,flexCuffSocket}
 from './equipment-field-visuals.ts';

const heldIndex=(r:OperatorRig):number|null=>{
 const v=r.root.userData.fieldworkHeldFlashIndex;
 return typeof v==='number'&&v>=0&&v<r.flashCanisters.length?v:null;
};
/** Called *after* the single accepted pose/frame commit. A hand attachment
 * follows the finished hand pose without a second solver or world transform.
 * Restore uses the CURRENT authoritative field inventory on cancellation
 * and on a backwards film seek; a consumed item never reappears.
 */
export function presentFlashHandoff(r:OperatorRig,p:OperatorPose,
 allowed:boolean):void{
 const action=allowed&&p.equipmentInteraction?.item==='flashbang'?
  p.equipmentInteraction:null;
 const inHand=!!action&&sampleEquipmentGesture(action).inHand;
 const old=heldIndex(r);
 if(!inHand&&old===null)return; // Idle frames incur no inventory walk.
 const items=visibleFlashCanisters(p.equipment,p.flashCharges);
 const target=inHand&&action?items.findIndex(item=>item.location===action.location):-1;
 const selected=target>=0?target:null;
 if(old!==null&&old!==selected){
  const mesh=r.flashCanisters[old];
  const item=items[old];
  if(mesh){
   mesh.visible=!!item;
   if(item&&!restoreBeltFlashRest(r,mesh)){
    const socket=flashCanisterSocket(item.location,item.index);
    const parent=socket.bone==='chest'?r.chest:
      socket.bone==='pack'?r.pack:r.hip;
    if(mesh.parent!==parent)parent.add(mesh);
    mesh.position.set(socket.x,socket.y,socket.z);
    mesh.rotation.set(0,0,0);
   }
  }
 }
 r.root.userData.fieldworkHeldFlashIndex=selected;
 if(selected===null)return;
 const mesh=r.flashCanisters[selected];
 if(!mesh)return;
 if(mesh.parent!==r.arms[0].hand)r.arms[0].hand.add(mesh);
 // The already rendered in-hand instance belongs to this very hand.
 mesh.position.set(.35,-3.8,0);
 mesh.rotation.set(0,0,Math.PI*.30);
 mesh.visible=true;
}

/** F6.3: same live wedge mesh, same existing carrier. The already-mounted
 * 3D door wedge is controlled by authoritative door.wedged, not this prop.
 */
export function presentWedgeHandoff(r:OperatorRig,p:OperatorPose,
 allowed:boolean):void{
 const action=allowed&&p.equipmentInteraction?.item==='wedge'?
  p.equipmentInteraction:null;
 const inHand=!!action&&sampleEquipmentGesture(action).inHand;
 const prev=r.root.userData.fieldworkHeldWedgeIndex;
 const old=typeof prev==='number'&&prev>=0&&prev<r.wedgeMeshes.length?
  prev:null;
 if(!inHand&&old===null)return;
 const items=visibleDoorWedges(p.equipment,p.wedgeRemaining);
 const target=inHand&&action?items.findIndex(item=>item.location===action.location):-1;
 const selected=target>=0?target:null;
 if(old!==null&&old!==selected){
  const mesh=r.wedgeMeshes[old],item=items[old];
  if(mesh){
   mesh.visible=!!item;
   if(item){
    const socket=wedgeSocket(item.location,item.index);
    const parent=socket.bone==='chest'?r.chest:
      socket.bone==='pack'?r.pack:r.hip;
    if(mesh.parent!==parent)parent.add(mesh);
    mesh.position.set(socket.x,socket.y,socket.z);
    mesh.rotation.set(0,0,-.19);
   }
  }
 }
 r.root.userData.fieldworkHeldWedgeIndex=selected;
 if(selected===null)return;
 const mesh=r.wedgeMeshes[selected];
 if(!mesh)return;
 if(mesh.parent!==r.arms[0].hand)r.arms[0].hand.add(mesh);
 mesh.position.set(0,-3,0);
 mesh.rotation.set(0,0,.15);
 mesh.visible=true;
}

/** F6.4: exactly one actual flex-cuff pair leaves its worn pouch and rides
 * the existing support-hand transform. The gameplay's RESTRAIN transaction
 * and the civilian's restrained state remain entirely separate authorities.
 */
export function presentFlexCuffHandoff(r:OperatorRig,p:OperatorPose,
 allowed:boolean):void{
 const action=allowed&&p.equipmentInteraction?.item==='zip-tie'?
  p.equipmentInteraction:null;
 const inHand=!!action&&sampleEquipmentGesture(action).inHand;
 const previous=r.root.userData.fieldworkHeldCuffIndex;
 const old=typeof previous==='number'&&previous>=0&&
  previous<r.cuffMeshes.length?previous:null;
 if(!inHand&&old===null)return;
 const items=visibleFlexCuffs(p.equipment,p.restraintRemaining);
 const target=inHand&&action?items.findIndex(item=>item.location===action.location):-1;
 const selected=target>=0?target:null;
 if(old!==null&&old!==selected){
  const mesh=r.cuffMeshes[old],item=items[old];
  if(mesh){
   mesh.visible=!!item;
   if(item){
    const socket=flexCuffSocket(item.location,item.index);
    const parent=socket.bone==='chest'?r.chest:
      socket.bone==='pack'?r.pack:r.hip;
    if(mesh.parent!==parent)parent.add(mesh);
    mesh.position.set(socket.x,socket.y,socket.z);
    mesh.rotation.set(Math.PI*.5,0,0);
   }
  }
 }
 r.root.userData.fieldworkHeldCuffIndex=selected;
 if(selected===null)return;
 const mesh=r.cuffMeshes[selected];
 if(!mesh)return;
 if(mesh.parent!==r.arms[0].hand)r.arms[0].hand.add(mesh);
 mesh.position.set(.6,-2.6,0);
 mesh.rotation.set(Math.PI*.5,0,0);
 mesh.visible=true;
}
