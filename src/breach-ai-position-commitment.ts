/** Keep a chosen local cover move long enough to finish.
 * This never supplies a destination or overrides the physical motor.
 */
const clamp=(v:number,min:number,max:number)=>
 Math.max(min,Math.min(max,v));
export function coverMoveDeadline(now:number,distance:number,
  travelSpeed=48):number{
 const units=clamp(distance,0,250);
 const speed=clamp(travelSpeed,8,80);
 const seconds=clamp(1.3+units/(speed*.56),3.2,9);
 return now+seconds;
}
export function coverMoveCommitted(
  hasCover:boolean,remainingDistance:number,now:number,
  deadline:number):boolean{
 return hasCover&&remainingDistance>10&&now<deadline;
}
