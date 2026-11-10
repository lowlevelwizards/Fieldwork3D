import {sessionWorldGeometry} from './breach-world-context.ts';
/** Stage 7: handle physical closed leaves and intentional automatic
 * opens before body contact. Explicit authored DOOR actions retain priority.
 */
import {pointToSegment,doorLeafSegment,doorBlocksSegment,doorCenter,
 OPERATOR_RADIUS,type Pt} from './breach-core.ts';
import type {TeamActor,Session} from './breach-game.ts';
import {canAutoOpenEnRoute,autoDoorAtBodyContact,doorApproach,
 doorReachable,doorWouldStrikeActors} from './breach-door.ts';
import {doorInteraction} from './breach-interactions.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {d,type ActorMotorHooks} from './breach-motor-contract.ts';

export function handleMotorDoor(
 a:TeamActor,p:Pt,next:Pt,move:Pt,dt:number,s:Session,
 hooks:ActorMotorHooks):{paused:boolean;closed:boolean}{
  // Identify the leaf for closed-door authored handling; open hinged
  // leaves are pushed by the coupled swept-body solver below, not by
  // standing nearby or crossing a broad radius trigger.
  const closedDoor=s.doors.filter(door=>
    pointToSegment(move,doorLeafSegment(door))<24||
    doorBlocksSegment(door,{a:a.p,b:move}))
    .sort((u,v)=>pointToSegment(move,doorLeafSegment(u))-
      pointToSegment(move,doorLeafSegment(v)))[0];
  // Look ahead to the route's next node, stopping to open a door before
  // the actor's capsule contacts the physical leaf.
  // Crossing a physical closed door during a move implicitly attempts to
  // open it, even if a briefed doorway missed the drawn-path insertion.
  // Deliberate DOOR actions (including KICK) retain priority and must not
  // be preempted by this convenience interaction.
  const pendingDoor=a.plan[0];
  // A route toward an authored door may cross OTHER doors. Do not let
  // the destination DOOR node disable ordinary collision-aware opening
  // of an intervening closed leaf; this was the G4d seeded deadlock.
  const automaticCandidates=s.doors.filter(door=>
    canAutoOpenEnRoute(pendingDoor,door.id,a.side==='red')).sort((left,right)=>
      pointToSegment(a.p,doorLeafSegment(left))-
      pointToSegment(a.p,doorLeafSegment(right))||
      left.id.localeCompare(right.id));
  const doorAhead=automaticCandidates.find(door=>{
    if(door.open&&(door.openFraction??0)>=.72)return false;
    if(!doorReachable(a.p,door))return false;
    return doorBlocksSegment(door,{a:a.p,b:next})||
      doorBlocksSegment(door,{a:a.p,b:p});
  })??autoDoorAtBodyContact(a.p,move,automaticCandidates,sessionWorldGeometry(s));
  if(doorAhead){
    // A cautious defender should operate a door from a real clear stance,
    // not repeatedly crowd its swing while touching the handle.
    if(a.side==='red'&&!doorAhead.open&&a.actionTimer===0&&
       doorWouldStrikeActors({...doorAhead,openFraction:0},.46,
         [a.p],OPERATOR_RADIUS+1)){
      const staged=doorApproach(a.p,doorAhead,sessionWorldGeometry(s));
      if(staged&&d(staged,a.p)>5&&d(staged,a.p)<50&&
         sweptBodyClear(a.p,staged,s.doors,8,sessionWorldGeometry(s))){
        a.nav.unshift(staged);a.velocity=0;
        a.motorPause='door-opening';return {paused:true,closed:false};
      }
    }
    a.motorPause='door-opening';
    const opening=doorInteraction({target:doorAhead,actorId:a.id,
      actorPosition:a.p,action:'open'});
    if(opening.reason==='held'||opening.reason==='locked'||
       opening.reason==='obstructed'){
      a.motorPause=opening.reason==='held'?'door-held':
        opening.reason==='locked'?'door-locked':'door-obstructed';
      a.lastBlocker='door';
      a.velocity=0;a.blockedTime+=dt;
      // A blocked door remains physically closed; no AI magic opening.
      if(a.side==='red'&&a.blockedTime>1.2){
        a.nav=[];a.alert='cover';a.contact=null;
      }
      return {paused:true,closed:false};
    }
    a.velocity=0;a.actionTimer+=dt;
    if(a.actionTimer>=.36&&!doorAhead.open){
      doorAhead.open=true;doorAhead.openedAt=s.seconds;
      hooks.hear(s,doorCenter(doorAhead),125,'door');
      hooks.notify(s,a.name+' OPENED '+doorAhead.id);
    }
    if((doorAhead.openFraction??0)<.72)return {paused:true,closed:false};
    a.actionTimer=0;
  }else if(a.side==='red')a.actionTimer=0;
  const closed=!!closedDoor&&!closedDoor.open&&
    pointToSegment(move,doorLeafSegment(closedDoor))<9.5&&
    pointToSegment(move,doorLeafSegment(closedDoor))<
      pointToSegment(a.p,doorLeafSegment(closedDoor))+0.001;

 return {paused:false,closed};
}
