/** Owns recorded replay Bodycam activation, eligible observers and mounts.
 * Never queries hidden world state or changes the authoritative simulation.
 */
import type {TacticalScene3D} from './breach-3d.ts';
export type BodycamMount='chest'|'helmet';
export class ReplayBodycamController{
 active=false;mount:BodycamMount='chest';
 observers:string[]=[];groundObservers=new Set<string>();
 stop(stage:TacticalScene3D|null=null):void{
   this.active=false;stage?.setReplayBodycam(null);
 }
 reset(stage:TacticalScene3D|null=null):void{
   this.stop(stage);this.mount='chest';this.observers=[];
   this.groundObservers.clear();
 }
 apply(stage:TacticalScene3D|null,observerId:string|null):boolean{
   if(!this.active||!stage||!observerId)return false;
   stage.setReplayBodycam({actorId:observerId,mount:this.mount,
     stabilization:'balanced',fov:95});
   return true;
 }
 start(replaying:boolean,stage:TacticalScene3D|null,
   currentObserverId:string|null):string|null{
   if(!replaying||!stage||!this.observers.length)return null;
   const next=currentObserverId&&this.observers.includes(currentObserverId)?
     currentObserverId:this.observers[0];
   if(!next)return null;
   this.active=true;return next;
 }
 toggleMount(stage:TacticalScene3D|null,observerId:string|null):boolean{
   if(!this.active)return false;
   this.mount=this.mount==='chest'?'helmet':'chest';
   return this.apply(stage,observerId);
 }
}
