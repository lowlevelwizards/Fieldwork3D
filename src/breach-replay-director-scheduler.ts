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
    const stable=old.shotType===proposal.shotType&&
      old.doorId===proposal.doorId&&
      proposal.subjects.some(id=>old.subjects.includes(id));
    if(stable){
      // Permit continuous follow without changing the edit. Slow camera
      // damping downstream maintains the selected cinematic composition.
      this.chosen=proposal;
      return proposal;
    }
    const incoming=priority[proposal.shotType];
    const existing=priority[old.shotType];
    const emergency=incoming>=existing+3&&incoming>=5;
    const improvement=proposal.score-old.score;
    const durationElapsed=time>=this.heldUntil;
    if(!emergency&&(!durationElapsed||
      (incoming<=existing&&improvement<5))){
      // Track previous group while the shot is held, but never let the
      // rejected new subject yank the camera across the level.
      return old;
    }
    // Prevent repeated reselects from slightly better scores.
    if(!emergency&&improvement<1.5&&incoming<existing)return old;
    this.chosen=proposal;
    this.heldUntil=time+hold[proposal.shotType];
    this.edits++;
    return proposal;
  }
}
