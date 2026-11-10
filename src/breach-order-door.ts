/** Stage 8: explicit authoritative door OPEN/CLOSE/KICK/HOLD order,
 * including real sweep impact and repeated bounded kick attempts.
 */
import {OPERATOR_RADIUS,doorCenter,doorLeafSegment,type Pt}
 from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {doorInteraction} from './breach-interactions.ts';
import {kickDoor,doorWouldStrikeActors} from './breach-door.ts';
import {KICK_DURATION} from './breach-door-actions.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {completeOrder,clearCurrentOrderIssue,
 failCurrentOrder as failOrder} from './breach-order-lifecycle.ts';
import type {OrderExecutionPort} from './breach-order-execution-port.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({...p});
const pop=completeOrder;
export function createDoorOrderHandler(port:OrderExecutionPort){
 const {pairedLeaves,notify,hear,battleEvent}=port;
 const failCurrentOrder=(s:Session,a:TeamActor,n:PlanNode,reason:string)=>
  failOrder(s,a,n,reason,port.notify);
 return function executeDoorOrder(s:Session,a:TeamActor,n:PlanNode,dt:number):boolean{
  if(n.kind==='door'){
    const door=s.doors.find(d=>d.id===n.doorId);
    if(!door){
      failCurrentOrder(s,a,n,'DOOR MISSING');return true;
    }
    if((n.method==='close'&&!door.open)||
       (n.method!=='close'&&n.method!=='kick'&&n.method!=='hold'&&
        door.open&&(door.openFraction??1)>=.98)){
      // The requested state already exists: legitimate completion.
      pop(a);return true;
    }
    const interaction=doorInteraction({target:door,actorId:a.id,
      actorPosition:a.p,action:n.method??'open'});
    // A deliberately exhausted kick sequence is terminal until its order
    // is edited. Never replay the last kick every fixed update.
    if(a.orderIssue?.nodeId===n.id&&n.method==='kick'&&
       /KICK RESISTED|KICK BLOCKED/.test(a.orderIssue.reason)&&!door.open){
      a.velocity=0;return true;
    }
    if(!interaction.allowed&&a.actionTimer===0){
      failCurrentOrder(s,a,n,'DOOR BLOCKED · '+
        (interaction.reason??'UNAVAILABLE').toUpperCase());
      return true;
    }
    clearCurrentOrderIssue(a);
    const required=n.method==='kick'?KICK_DURATION:
      n.method==='hold'?1.3:n.method==='close'?.75:.78;
    if(a.actionTimer===0){
      a.lastDoorAt=s.seconds;a.lastDoorId=door.id;
      a.lastDoorMethod=n.method??'open';
    }
    a.actionTimer+=dt;
    if(n.method==='kick'&&a.actionTimer>=required*.53&&
       a.actionTimer-dt<required*.53){
      if(!door.open){
        const outcome=kickDoor(door,a.p);
        door.lastKickAt=s.seconds;
        if(outcome.opened){
          door.openedAt=s.seconds;
          // Kicks into an occupied sweep impact the actual body. A validated
          // displacement clears room for the hinge; pinned actors remain solid.
          const impactLeaf=doorLeafSegment({...door,openFraction:.60});
          for(const struck of s.operators){
            if(struck===a||struck.health<=0||
               !doorWouldStrikeActors({...door,openFraction:0},.60,
                 [struck.p],OPERATOR_RADIUS+1))continue;
            const along=Math.max(0,Math.min(1,(
              (struck.p.x-impactLeaf.a.x)*(impactLeaf.b.x-impactLeaf.a.x)+
              (struck.p.y-impactLeaf.a.y)*(impactLeaf.b.y-impactLeaf.a.y))/
              Math.max(1,d(impactLeaf.a,impactLeaf.b)**2)));
            const closest={x:impactLeaf.a.x+
              (impactLeaf.b.x-impactLeaf.a.x)*along,
              y:impactLeaf.a.y+(impactLeaf.b.y-impactLeaf.a.y)*along};
            const dx=struck.p.x-closest.x,dy=struck.p.y-closest.y;
            const mag=Math.hypot(dx,dy)||1;
            const lx=impactLeaf.b.x-impactLeaf.a.x,
              ly=impactLeaf.b.y-impactLeaf.a.y;
            const length=Math.hypot(lx,ly)||1;
            // First try the real radial impact, then a short slip along
            // either edge when the defender is pinned against furniture.
            // Every candidate is swept and other characters remain solid.
            const directions=[
              {x:dx/mag,y:dy/mag},
              {x:lx/length,y:ly/length},
              {x:-lx/length,y:-ly/length}
            ];
            let displaced=false;
            for(const dir of directions){
              for(const distance of [18,12,7,3]){
                const dest={x:struck.p.x+dir.x*distance,
                  y:struck.p.y+dir.y*distance};
                if(!sweptBodyClear(struck.p,dest,s.doors)||
                   s.operators.some(other=>other!==struck&&
                     other.health>0&&d(other.p,dest)<13)||
                   s.civilians.some(other=>other.health>0&&
                     d(other.p,dest)<13))continue;
                struck.priorP=clone(struck.p);struck.p=dest;
                displaced=true;break;
              }
              if(displaced)break;
            }
            struck.doorStunUntil=Math.max(struck.doorStunUntil??0,
              s.seconds+.85);
            struck.lastBashAt=s.seconds;struck.lastBashRole='receive';
            struck.fireCd=Math.max(struck.fireCd,.85);
            struck.aim=Math.max(0,struck.aim-.7);
            struck.velocity=0;struck.nav=[];
            battleEvent(s,'door',a,struck.p,
              struck.name+' STRUCK BY DOOR');
          }
        }
        hear(s,doorCenter(door),340,'kick');
        const result=!outcome.pushSide?'WRONG SIDE · CANNOT KICK INWARD':
          outcome.opened?'FORCED OPEN':'KICK RESISTED';
        notify(s,door.id+' '+result);
        battleEvent(s,'door',a,doorCenter(door),door.id+' '+result);
        if(!outcome.pushSide){
          failCurrentOrder(s,a,n,'KICK BLOCKED · WRONG SIDE');return true;
        }
      }
    }
    if(a.actionTimer>=required){
      if(n.method==='kick'){
        // Keep kicking automatically until the latch yields, but avoid
        // an endless loop for a held or physically impossible opening.
        if(!door.open&&(door.kicks??0)<8){
          a.actionTimer=0;return true;
        }
        if(!door.open){
          failCurrentOrder(s,a,n,'KICK RESISTED · CHECK ENTRY SIDE');return true;
        }
        pop(a);return true;
      }
      if(n.method==='hold'){
        if(door.open){
          failCurrentOrder(s,a,n,'DOOR MUST BE CLOSED TO HOLD');return true;
        }else{
          for(const leaf of pairedLeaves(s,door))leaf.heldBy=a.id;
          notify(s,door.id+' HELD CLOSED · BRACED');
          battleEvent(s,'door',a,doorCenter(door),door.id+' BRACED');
        }
        pop(a);return true;
      }
      if(n.method==='close'){
        for(const leaf of pairedLeaves(s,door)){
          leaf.heldBy=null;leaf.open=false;leaf.openedAt=s.seconds;
        }
        hear(s,doorCenter(door),90,'door');
        notify(s,door.id+' CLOSING');
        battleEvent(s,'door',a,doorCenter(door),door.id+' CLOSING');
      }else{
        if(pairedLeaves(s,door).some(leaf=>leaf.heldBy)){
          failCurrentOrder(s,a,n,'DOOR BRACED SHUT');return true;
        }
        for(const leaf of pairedLeaves(s,door)){
          const wasOpening=leaf.open;
          leaf.open=true;leaf.openedAt=s.seconds;
          // Reopening an ajar leaf must continue from its physical angle.
          // Never zero moving hinge velocity or rewind the panel.
          leaf.pushTarget=Math.max(1,leaf.pushTarget??1);
          if(!wasOpening)leaf.angularVelocity=0;
        }
        hear(s,doorCenter(door),145,'door');
        notify(s,door.id+' OPENED');
        battleEvent(s,'door',a,doorCenter(door),door.id+' OPENED');
      }
      pop(a);
    }
  }
 return n.kind==='door';
 };
}
