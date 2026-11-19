/** EQA3.16N — anatomical support for unarmed moving characters.
 * Never moves a motor, a planned footfall or a shot-time armed body.
 * This is a small render-only correction between a real planted support
 * shoe and the visual pelvis; lower-leg IK must resolve the same hip.
 */
import type {FootTarget} from './breach-footsteps.ts';

const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export function npcLocomotionSupport(
 position:{x:number;y:number},heading:number,speed:number,
 feet:readonly [FootTarget,FootTarget],moving:boolean
):{pelvisForward:number;chestForward:number}{
 if(!moving||speed<5)return {pelvisForward:0,chestForward:0};
 const directionX=Math.cos(heading),directionY=Math.sin(heading);
 let total=0,count=0;
 for(const foot of feet){
  if(!foot.contact)continue;
  total+=(foot.position.x-position.x)*directionX+
    (foot.position.y-position.y)*directionY;
  count++;
 }
 // A support foot ahead of the root receives some of the upper-body
 // weight. Avoid dragging the hips backward after a trailing touchdown:
 // forward gait needs a slight forward chest bias, especially when running.
 // No extra foot solver, hysteresis, procedural step or timestamp.
 const movingWeight=clamp(speed/24,0,1);
 const pelvisForward=count?
  clamp(total/count*.28,-.6,2.2)*movingWeight:0;
 const chestForward=pelvisForward+clamp(speed/90,0,.60);
 return {pelvisForward,chestForward};
}
