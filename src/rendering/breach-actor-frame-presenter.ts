/** Reconcile visible actor/civilian scene ownership from one authoritative frame.
 * Never creates collision objects, discovers hidden actors, or mutates the Session.
 */
import * as THREE from 'three';
import type {Session} from '../breach-game.ts';
import type {ReplayDisclosure} from '../breach-replay-visibility.ts';
import {presentCivilian} from './breach-3d-disclosure-presenter.ts';
import {createCivilianRig,updateCivilianRig,type CivilianRig}
 from '../breach-civilian-visuals.ts';
export type FrameActorVisual={
 root:THREE.Group;status:THREE.Mesh;contactShadows:THREE.Mesh[];
};
export type ActorSceneReconciliationHost<T extends FrameActorVisual>={
 scene:THREE.Scene;actors:Map<string,T>;
 civilianRigs:Map<string,CivilianRig>;
 actorIds:Set<string>;civilianIds:Set<string>;
};
export function reconcileSceneActorLifetimes<T extends FrameActorVisual>(
 s:Session,host:ActorSceneReconciliationHost<T>,omniscient:boolean,
 replayDisclosurePolicy:ReplayDisclosure|null):void{
 const {scene,actors,civilianRigs}=host;
 const current=host.actorIds;current.clear();
 for(const actor of s.operators)current.add(actor.id);
 for(const [id,object] of actors)if(!current.has(id)){
   object.root.visible=false;object.status.visible=false;
   for(const shadow of object.contactShadows)shadow.visible=false;
 }
 const present=host.civilianIds;present.clear();
 for(const civil of s.civilians)present.add(civil.id);
 for(const [id,rig] of civilianRigs){
   if(present.has(id))continue;
   scene.remove(rig.root);civilianRigs.delete(id);
 }
 for(const civil of s.civilians){
   const visible=presentCivilian(s,civil,omniscient,replayDisclosurePolicy);
   let rig=civilianRigs.get(civil.id);
   if(!visible&&!rig)continue;
   if(!rig){
     rig=createCivilianRig(civil);
     civilianRigs.set(civil.id,rig);
     scene.add(rig.root);
   }
   updateCivilianRig(rig,civil,s.seconds);
   rig.root.visible=visible;
 }
}
