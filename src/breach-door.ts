/** Physical hinges, handles, and deterministic door clearance. */
import {sweptBodyClear,bodyClear} from './breach-navigation.ts';
import {doorCenter,route,pointToSegment,
  doorYaw,doorLeafSegment,WALLS,COVER,activeSite,initialDoors,
  pointToSegment as distanceToWall,
  OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
export {doorYaw,doorLeafSegment};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const DOOR_REACH=39;
/** A body can extend the opening leaf's sweep without manual PUSH orders. */
// Fraction * 1.54 radians: a normal OPEN is about 88 degrees,
// while sustained body pressure may extend it to about 118 degrees.
// A door should never fold back almost 180 degrees through the room.
export const PUSHED_OPEN_LIMIT=1.34;
/** The actor must approach the leaf or already be in sustained contact. */
export function approachingDoorLeaf(from:Pt,next:Pt,d:Door):boolean{
 if(!d.open||d.kind==='shutter'||d.kind==='sliding'||d.wedged||d.heldBy)return false;
 const leaf=doorLeafSegment(d);
 const prior=pointToSegment(from,leaf),approach=pointToSegment(next,leaf);
 // Footsteps are short fixed ticks: a real body contact may reduce the
 // clearance by only a few hundredths per frame. Accept sustained pressure
 // from within the shoulder envelope, before the solid capsule stalls.
 return approach<24&&(approach<prior-.015||
   (prior<21&&approach<=prior+.25));
}

export function handlePoint(d:Door):Pt{
  if(d.kind==='shutter')return doorCenter(d);
  // Handle follows the actual rotated leaf, letting the support hand track
  // the contact point instead of reaching for an empty closed-door position.
  const leaf=doorLeafSegment(d);
  return {x:leaf.a.x+(leaf.b.x-leaf.a.x)*.82,
    y:leaf.a.y+(leaf.b.y-leaf.a.y)*.82};
}
export function doorReachable(p:Pt,d:Door):boolean{
  // An opened leaf can be grabbed from anywhere along its actual panel.
  // Requiring proximity to the empty frame made closing a swung door
  // impossible even with the operator's hand against the leaf.
  if(d.open&&(d.openFraction??1)>.15)
    return pointToSegment(p,doorLeafSegment(d))<DOOR_REACH;
  return (dist(p,handlePoint(d))<DOOR_REACH||pointToSegment(p,d)<31)&&
    dist(p,doorCenter(d))<DOOR_REACH+16;
}
/** When a moving body actually meets a reachable closed or still-opening
 * leaf, attempt the SAME lawful OPEN interaction even if an almost tangent
 * route segment misses the door-crossing detector. Never force locks,
 * skip hinge collision, or auto-open fully traversable leaves.
 */
/** Walking to an authored door is still real navigation. Any other
 * reachable ordinary closed leaf may be opened along that approach.
 * Only the explicitly targeted door preserves KICK/CLOSE/HOLD priority.
 * This never modifies the player's queued order or bypasses a lock.
 */
export function canAutoOpenEnRoute(plan:{
 kind:string;doorId?:string;method?:string}|null|undefined,
 candidateDoorId:string,ai=false):boolean{
 if(ai)return true;
 if(plan?.kind==='move'||plan?.kind==='pie')return true;
 if(plan?.kind!=='door')return false;
 return candidateDoorId!==plan.doorId||(plan.method??'open')==='open';
}
export function autoDoorAtBodyContact(from:Pt,to:Pt,
 doors:readonly Door[]):Door|undefined{
 const touching=doors.filter(d=>{
   if((d.open&&doorClear(d))||!doorReachable(from,d))
     return false;
   const leaf=doorLeafSegment(d);
   const before=pointToSegment(from,leaf),after=pointToSegment(to,leaf);
   // A full-body motor stops at radius+1, BEFORE the center crosses
   // the leaf. Engage within a bounded shoulder envelope instead of
   // waiting until a planned step penetrates the solid door.
   return before<OPERATOR_RADIUS+7&&after<OPERATOR_RADIUS+7&&
     after<before-.015;
 });
 return touching.sort((a,b)=>
   pointToSegment(to,doorLeafSegment(a))-
   pointToSegment(to,doorLeafSegment(b))||a.id.localeCompare(b.id))[0];
}
export function doorApproach(from:Pt,d:Door):Pt|null{
  const m=doorCenter(d),len=dist(d.a,d.b)||1;
  const t={x:(d.b.x-d.a.x)/len,y:(d.b.y-d.a.y)/len};
  const n={x:-t.y,y:t.x};
  const side=Math.sign((from.x-m.x)*n.x+(from.y-m.y)*n.y)||1;
  const candidates:Pt[]=[];
  if(d.open&&(d.openFraction??1)>.15){
    const leaf=doorLeafSegment(d),dx=leaf.b.x-leaf.a.x,dy=leaf.b.y-leaf.a.y;
    const length=Math.hypot(dx,dy)||1;
    const leafNormal={x:-dy/length,y:dx/length};
    const leafSide=Math.sign((from.x-leaf.a.x)*leafNormal.x+
      (from.y-leaf.a.y)*leafNormal.y)||1;
    for(const fraction of [.25,.5,.78])
      for(const reach of [17,23,29]){
        candidates.push({x:leaf.a.x+dx*fraction+leafNormal.x*reach*leafSide,
          y:leaf.a.y+dy*fraction+leafNormal.y*reach*leafSide});
      }
  }
  for(const point of [handlePoint(d),m])
    for(const outward of [20,24,29])
      for(const along of [0,-12,12])
        candidates.push({x:point.x+n.x*outward*side+t.x*along,
          y:point.y+n.y*outward*side+t.y*along});
  return candidates.filter(p=>bodyClear(p,[d])&&doorReachable(p,d)&&
    route(from,p).length).sort((a,b)=>dist(a,from)-dist(b,from))[0]??null;
}
export function initDoor(d:Door,i:number):Door{
 const prepared:Door={...d,pushTarget:1,hinge:d.hinge??(i%3===0?'b':'a'),
   swing:d.swing??(d.id==='FRONT'?-1:i%2===0?1:-1),openFraction:d.open?1:0,
   angularVelocity:0,resistance:d.resistance??1,
   latchIntegrity:d.locked?Math.max(2.2,d.latchIntegrity??0):
     d.latchIntegrity??1.05,frameIntegrity:d.frameIntegrity??2.5,
   kicks:d.kicks??0,forced:d.forced??false,heldBy:d.heldBy??null};
 if(doorSwingBlocked(prepared,.32)){
   const opposite=prepared.swing===1?-1:1;
   if(!doorSwingBlocked({...prepared,swing:opposite},.32))
     prepared.swing=opposite;
 }
 return prepared;
}
/** A small fixed-step hinge motor with damped impulses; no renderer physics. */
export function pushDoor(d:Door,force:number):boolean{
 if(d.wedged||d.heldBy||(!d.open&&(d.openFraction??0)<.08))return false;
 // Body contact should request the full physically attainable opening,
 // not inch the desired stop upward 0.028 per frame while the operator
 // stands still. The motor still sweeps against walls, cover, and actors.
 if((d.openFraction??0)>=.08&&force>0)
   d.pushTarget=PUSHED_OPEN_LIMIT;
 d.angularVelocity=Math.max(-5.5,Math.min(5.5,
   (d.angularVelocity??0)+force/Math.max(.35,d.resistance??1)));
 d.open=true;
 return true;
}
export function kickDoor(d:Door,from?:Pt):{opened:boolean;pushSide:boolean}{
 // Industrial shutters are lifted via their controls. A kick cannot
 // unrealistically throw a heavy, vertically guided steel panel open.
 if(d.wedged||d.kind==='shutter'||d.kind==='sliding')
  return {opened:false,pushSide:false};
 // Retain the legacy direct impulse API for already-open hinged leaves.
 // Authored game kicks always pass the operator position and use integrity.
 if(!from){
   d.open=true;d.kickImpulse=1;
   d.angularVelocity=Math.max(13,d.angularVelocity??0);
   return {opened:true,pushSide:true};
 }
 const center=doorCenter(d);
 const leaf=doorLeafSegment({...d,openFraction:.62});
 const cross=(p:Pt)=>(d.b.x-d.a.x)*(p.y-center.y)-
   (d.b.y-d.a.y)*(p.x-center.x);
 const pushSide=cross(from)*cross(leaf.b)<0;
 d.kicks=(d.kicks??0)+1;
 // Hinges cannot reverse because of an impact from the pull side.
 // The rattled door stays latched; the player must use the other side
 // or open it by hand. Never animate a kick opening into the kicker.
 if(!pushSide)return {opened:false,pushSide:false};
 const brace=d.heldBy?.75:0;
 d.latchIntegrity=Math.max(-1,(d.latchIntegrity??1.05)-1.2+brace);
 const opened=(d.latchIntegrity??1)<=0;
 if(opened){
   d.heldBy=null;d.locked=false;d.jammed=false;
   d.forced=true;d.open=true;d.kickImpulse=1;
   d.angularVelocity=Math.max(9,d.angularVelocity??0);
 }
 return {opened,pushSide};
}
/** A swept leaf cannot move further into a living actor's body.
 * Existing overlap may resolve by moving away; it must never deepen.
 */
/** Sample the COMPLETE moving panel arc, including between hinge motor
 * endpoints. A short tick may have clear endpoints but sweep over a capsule,
 * particularly at the tip of a wide leaf or on coarse simulation ticks.
 * Bodies already touching the leaf may only be released, never penetrated.
 */
const doorSweepSteps=(d:Door,next:number)=>{
 const current=d.openFraction??(d.open?1:0);
 return Math.max(1,Math.ceil(dist(d.a,d.b)*Math.abs(next-current)*
   (d.kind==='hinged'||!d.kind?1.54:1)/2));
};
export function doorWouldStrikeActors(d:Door,next:number,actors:readonly Pt[],
 radius=OPERATOR_RADIUS):boolean{
 if(!actors.length)return false;
 const current=d.openFraction??(d.open?1:0);
 const origin=doorLeafSegment(d);
 const steps=doorSweepSteps(d,next);
 return actors.some(actor=>{
  const initial=pointToSegment(actor,origin);
  for(let i=1;i<=steps;i++){
   const fraction=current+(next-current)*i/steps;
   const gap=pointToSegment(actor,doorLeafSegment({...d,openFraction:fraction}));
   if(gap<radius+1&&gap<initial-.01)return true;
  }
  return false;
 });
}
/** Test every segment of the hinge sweep against architecture, not merely
 * the last frame; a leaf may not tunnel through a thin doorstop or fixture. */
export function doorSwingBlocked(d:Door,next:number,actors:readonly Pt[]=[], actorRadius=OPERATOR_RADIUS){
 if(d.kind==='shutter')return false;
 if(doorWouldStrikeActors(d,next,actors,actorRadius))return true;
 if(d.kind==='sliding')return false;
 // Standalone lab fixtures have no corresponding architectural model.
 const registered=activeSite()?.doors??initialDoors();
 if(!registered.some(real=>real.id===d.id))return false;
 const current=d.openFraction??(d.open?1:0);
 const steps=doorSweepSteps(d,next);
 for(let step=1;step<=steps;step++){
  const fraction=current+(next-current)*step/steps;
  const leaf=doorLeafSegment({...d,openFraction:fraction});
  for(const t of [.35,.55,.75,.94,.99]){
   const p={x:leaf.a.x+(leaf.b.x-leaf.a.x)*t,
     y:leaf.a.y+(leaf.b.y-leaf.a.y)*t};
   if(WALLS.some(w=>distanceToWall(p,w)<1.25))return true;
   if(COVER.some(o=>Math.abs(o.x-p.x)<o.w/2+1.25&&
     Math.abs(o.y-p.y)<o.h/2+1.25))return true;
  }
 }
 return false;
}
export function advanceDoor(d:Door,dt:number,actors:readonly Pt[]=[]){
  if(d.wedged)d.open=false;
  // Fixed internal substeps prevent a paused or coarse test tick from
  // overshooting a hinge and keep old half-second door timings intact.
  let remaining=Math.max(0,Math.min(dt,.5));
  while(remaining>1e-8){
    const h=Math.min(1/60,remaining);
    const target=d.open?Math.max(1,d.pushTarget??1):0;
    const current=d.openFraction??(d.open?1:0);
    // Hinge orientation stays fixed throughout the mission.
    const v=d.angularVelocity??0;
    const kicked=(d.kickImpulse??0)>0;
    const acceleration=kicked?(target-current)*10-v*3:
      (target-current)*64-v*12;
    const velocity=Math.max(-4.5,Math.min(kicked?15:5.5,
      v+acceleration*h));
    const next=Math.max(0,Math.min(d.open?target:PUSHED_OPEN_LIMIT,current+velocity*h));
    const blocked=Math.abs(next-current)>.0001&&
      (d.open?next>.12:next<current)&&doorSwingBlocked(d,next,
        // Use the SAME full operator capsule as movement. A reduced hinge
        // radius previously let the moving leaf rotate inside operators,
        // leaving them overlapping an otherwise solid collision panel.
        // doorWouldStrikeActors already allows rotation AWAY from a
        // touched/overlapping body, but never deeper into its capsule.
        actors,OPERATOR_RADIUS);
    d.openFraction=blocked?current:next;
    d.angularVelocity=blocked||next===0||(d.open&&next>=target)?0:velocity;
    if(blocked||next>=.98)d.kickImpulse=0;
    if(!d.open&&next<=.02)d.pushTarget=1;
    remaining-=h;
  }
}

/** Coupled contact resolution: the *attempted body sweep*, not mere proximity,
 * creates pressure. Move the hinge one deterministic substep before the
 * operator's own clearance test, so it can yield instead of deadlocking with
 * the operator. A blocked hinge never enables ghosting through the leaf.
 */
export type BodyDoorContact={doorId:string;advanced:boolean};
export function pressDoorOnBodyAttempt(from:Pt,to:Pt,doors:Door[],
  dt:number,actors:readonly Pt[]):BodyDoorContact|null{
  const length=dist(from,to);
  if(length<.0001)return null;
  const steps=Math.max(1,Math.ceil(length/2));
  const nearby:{door:Door;distance:number}[]=[];
  for(const door of doors){
    if(!door.open||door.kind==='shutter'||door.kind==='sliding'||
       door.wedged||door.heldBy||
       (door.openFraction??0)<.08||
       (door.openFraction??0)>=PUSHED_OPEN_LIMIT-.001)continue;
    const panel=doorLeafSegment(door);
    // A hinged door can only be pushed farther OPEN in the direction its
    // leaf is actually rotating. Opposite-side contact must not drive the
    // hinge into (or through) the operator.
    const vx=to.x-from.x,vy=to.y-from.y;
    const lx=panel.b.x-panel.a.x,ly=panel.b.y-panel.a.y;
    const leafLength=Math.hypot(lx,ly)||1;
    const openingX=(door.swing??-1)*ly/leafLength;
    const openingY=-(door.swing??-1)*lx/leafLength;
    if(vx*openingX+vy*openingY<Math.hypot(vx,vy)*.12)continue;
    const before=pointToSegment(from,panel);
    // The capsule must be near the *actual rotating leaf*.
    if(before>OPERATOR_RADIUS+7)continue;
    let minimum=before;
    for(let i=1;i<=steps;i++){
      const t=i/steps;
      const point={x:from.x+(to.x-from.x)*t,
        y:from.y+(to.y-from.y)*t};
      minimum=Math.min(minimum,pointToSegment(point,panel));
    }
    if(minimum>OPERATOR_RADIUS+1.5||
       minimum>before-.015&&before>OPERATOR_RADIUS+1)continue;
    nearby.push({door,distance:minimum});
  }
  nearby.sort((a,b)=>a.distance-b.distance||
    a.door.id.localeCompare(b.door.id));
  const contact=nearby[0];
  if(!contact)return null;
  const door=contact.door;
  const initial=door.openFraction??0;
  pushDoor(door,2.5);
  // Door motion gets a small share of this very simulation tick. The main
  // global motor subsequently handles normal animation and swept obstacles.
  advanceDoor(door,Math.min(Math.max(0,dt),1/60),actors);
  return {doorId:door.id,advanced:(door.openFraction??0)>initial+.0001};
}
/** An entry gate is clear only when an actual full-size operator capsule
 * can traverse the threshold. Angle percentages are not aperture widths:
 * they vary with hinge end, panel length, sliding direction and frame.
 * Keep the lift height rule for shutters (vertical collision geometry).
 */
export function doorClear(d:Door):boolean{
 if(!d.open)return false;
 const fraction=d.openFraction??1;
 if(d.kind==='shutter')return fraction>=.72;
 if(fraction<.08)return false;
 const width=dist(d.a,d.b);
 if(width<OPERATOR_RADIUS*2+4)return false;
 const m=doorCenter(d);
 const tangent={x:(d.b.x-d.a.x)/width,y:(d.b.y-d.a.y)/width};
 const normal={x:-tangent.y,y:tangent.x};
 const depth=Math.max(OPERATOR_RADIUS+12,Math.min(28,width*.62));
 // Probe the center and modest shoulder-safe offsets; do not mistake a
 // tiny latch-side sliver for a passable body-width opening.
 for(const lateral of [0,-.17,.17,-.3,.3]){
  const along=lateral*width;
  if(Math.abs(along)>width/2-OPERATOR_RADIUS-2)continue;
  const center={x:m.x+tangent.x*along,y:m.y+tangent.y*along};
  const from={x:center.x-normal.x*depth,y:center.y-normal.y*depth};
  const to={x:center.x+normal.x*depth,y:center.y+normal.y*depth};
  if(bodyClear(from,[d])&&bodyClear(to,[d])&&
    sweptBodyClear(from,to,[d]))return true;
 }
 return false;
}


/** Tiny, strictly physical shoulder-yield when a door FIRST starts opening.
 * Return a possible actor step away from its next leaf position, never a
 * teleport, a collision override, or a change in hinge direction. The game
 * must validate this step against ALL walls, doors, furniture, and actors.
 * A blocked sidestep leaves the door blocked as usual.
 */
export function initialOpeningYieldCandidate(d:Door,actor:Pt,
  maxStep=1.4):Pt|null{
 const fraction=d.openFraction??0;
 if(!d.open||d.kind==='sliding'||d.kind==='shutter'||d.wedged||
    fraction>=.36||(d.pushTarget??1)>1.01)return null;
 const leaf=doorLeafSegment(d);
 const future=doorLeafSegment({...d,openFraction:Math.min(.50,fraction+.065)});
 const before=pointToSegment(actor,leaf),after=pointToSegment(actor,future);
 const clearance=OPERATOR_RADIUS+1;
 // Only a shoulder near the sweep's edge may yield. Never displace an
 // already-embedded body, someone far away, or someone the door misses.
 if(before<clearance-.6||before>clearance+4||
    after>=before-.015||after>=clearance+1.7)return null;
 const vx=future.b.x-future.a.x,vy=future.b.y-future.a.y;
 const square=vx*vx+vy*vy;
 const along=square>1e-6?Math.max(0,Math.min(1,
   ((actor.x-future.a.x)*vx+(actor.y-future.a.y)*vy)/square)):0;
 const near={x:future.a.x+vx*along,y:future.a.y+vy*along};
 const dx=actor.x-near.x,dy=actor.y-near.y;
 const length=Math.hypot(dx,dy);
 if(length<.001)return null;
 const step=Math.max(0,Math.min(maxStep,clearance+1.8-after));
 return step>.025?{x:actor.x+dx/length*step,
   y:actor.y+dy/length*step}:null;
}
