import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,planMove,team,toggling,stepSession}
 from '../src/breach-game.ts';
import {COVER,activateSite,passable}
 from '../src/breach-core.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const site={
 seed:651,name:'TRAVERSAL RECOVERY LAB',layout:'corridor',training:true,
 rooms:[],roomCount:0,
 walls:[
  {a:{x:90,y:100},b:{x:250,y:100}},
  {a:{x:90,y:140},b:{x:250,y:140}}
 ],
 doors:[],cover:[{x:172,y:120,w:21,h:22,fixture:'crate',low:true}],
 entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:120,y:193},{x:120,y:220},{x:120,y:245}],
 enemies:[],windows:[],objective:{x:225,y:120},
 extract:{x:225,y:120},
 bounds:{minX:0,minY:0,maxX:400,maxY:310}
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('a newly occupied landing causes a continuous reverse to safe ground',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 const lead=team(s)[0],goal={x:222,y:120};
 const seenPositions=[],elapsed=[];
 let obstacleAdded=false,retreating=false,recovered=false;
 try{
  assert.ok(planMove(s,lead.id,goal));
  toggling(s);
  for(let i=0;i<900;i++){
   const before={...lead.p};
   if(!obstacleAdded&&lead.traversal&&
      lead.traversalElapsed>lead.traversal.duration*.31){
     const landing=lead.traversal.landing;
     s.coverState.push({x:landing.x,y:landing.y,
       w:20,h:20,fixture:'fridge',low:false});
     COVER.splice(0,COVER.length,...s.coverState);
     s.objectRevision++;
     obstacleAdded=true;
   }
   stepSession(s,1/60);
   if(obstacleAdded){
     seenPositions.push({...lead.p});
     if(lead.traversal){
       elapsed.push(lead.traversalElapsed);
       retreating ||=lead.traversalRetreating;
     }else if(retreating&&distance(lead.p,{x:150.5,y:120})<7){
       recovered=true;break;
     }
   }
   assert.ok(distance(before,lead.p)<7,
    'never teleport across blocked geometry during a recovery');
  }
  assert.ok(obstacleAdded,'test did not reach a real vault');
  assert.ok(retreating,'the motor failed to reverse from an occupied landing');
  assert.ok(recovered,'operator never made it back to a safe approach');
  assert.ok(passable(lead.p),'recovery must finish outside solid furniture');
  assert.ok(lead.plan.length>0,'author MOVE must remain after a failed vault');
  assert.ok(elapsed.some((t,i)=>i>0&&t<elapsed[i-1]),
   'retreat must move the simulation clock backwards in small steps');
  assert.ok(seenPositions.length>10);
 }finally{activateSite(null);}
});
test('replay retains the reverse flag and owns its own actor state',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const a=team(s)[0];
  a.traversalRetreating=true;
  const frame=snapshot(s);
  assert.equal(frame.actors.find(x=>x.id===a.id).traversalRetreating,true);
  a.traversalRetreating=false;
  applyReplayFrame(s,frame);
  assert.equal(a.traversalRetreating,true);
 }finally{activateSite(null);}
});
