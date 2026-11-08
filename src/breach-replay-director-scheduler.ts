/** R7 cinematic shot commitment. The shot solver can re-evaluate often,
 * but only meaningful tactical changes should trigger a camera edit.
 * Seeks are stateless: a target at a known timestamp gives the same pose.
 */
import type {DirectorShot,DirectorShotType}
  from './breach-replay-director-shots.ts';

const priority:Record<DirectorShotType,number>={
  reorientation:0,travel:1,overwatch:2,approach:3,stack:4,
  entry:5,breach:6,contact:7
};
const hold:Record<DirectorShotType,number>={
  reorientation:1.6,travel:2.7,overwatch:2.8,approach:2.7,
  stack:2.8,entry:1.7,breach:1.8,contact:2.1
};
export class ReplayDirectorScheduler{
  private chosen:DirectorShot|null=null;
  private lastTime=-Infinity;
  private heldUntil=-Infinity;
  private edits=0;
  reset():void{
    this.chosen=null;this.lastTime=-Infinity;
    this.heldUntil=-Infinity;this.edits=0;
  }
  get status(){
    return {shotType:this.chosen?.shotType??'none',
      subjects:this.chosen?.subjects??[],
      doorId:this.chosen?.doorId??null,
      occluded:this.chosen?.occluded??0,
      score:this.chosen?.score??0,
      holdUntil:this.heldUntil,edits:this.edits};
  }
  choose(time:number,proposal:DirectorShot|null,instant=false):DirectorShot|null{
    if(!proposal){this.reset();return null;}
    const jump=instant||time<this.lastTime-.02||
      time-this.lastTime>2;
    this.lastTime=time;
    if(!this.chosen||jump){
      this.chosen=proposal;this.heldUntil=time+hold[proposal.shotType];
      if(!jump)this.edits++;
      return proposal;
    }
    const old=this.chosen;
    const sameSubjects=proposal.subjects.some(id=>old.subjects.includes(id));
    const stable=old.shotType===proposal.shotType&&
      old.doorId===proposal.doorId&&sameSubjects;
    if(stable){
      // Preserve a moving shot, not a frozen focus point.
      this.chosen=proposal;
      return proposal;
    }
    const leavingDoor=old.doorId!==null&&
      old.doorId!==proposal.doorId;
    const crossingRoom=old.roomId!==null&&proposal.roomId!==null&&
      old.roomId!==proposal.roomId&&sameSubjects;
    const followingThroughDoor=old.doorId!==null&&
      old.doorId===proposal.doorId&&sameSubjects;
    const focusDrift=Math.hypot(old.focus.x-proposal.focus.x,
      old.focus.y-proposal.focus.y);
    const actionMoves=proposal.motion>10&&!sameSubjects;
    if(leavingDoor||crossingRoom||followingThroughDoor||
      actionMoves||sameSubjects&&focusDrift>54){
      // Architecture NEVER pins the camera after a threshold crossing.
      // Breach -> entry -> travel must follow the squad even if the
      // old high-priority door shot had time left on its hold.
      this.chosen=proposal;
      this.heldUntil=time+hold[proposal.shotType];
      this.edits++;
      return proposal;
    }
    const incoming=priority[proposal.shotType];
    const existing=priority[old.shotType];
    const emergency=incoming>=existing+3&&incoming>=5;
    const improvement=proposal.score-old.score;
    const durationElapsed=time>=this.heldUntil;
    if(!emergency&&(!durationElapsed||
      (incoming<=existing&&improvement<5))){
      if(sameSubjects){
        // Keep the edit classification during its minimum hold, but
        // update its physical composition so the actors cannot leave
        // the frame while a more dramatic event is being considered.
        this.chosen={...old,focus:proposal.focus,
          zoom:Math.min(old.zoom,proposal.zoom),
          actorsFramed:proposal.actorsFramed,
          occluded:proposal.occluded};
        return this.chosen;
      }
      return old;
    }
    if(!emergency&&improvement<1.5&&incoming<existing)return old;
    this.chosen=proposal;
    this.heldUntil=time+hold[proposal.shotType];
    this.edits++;
    return proposal;
  }
}
