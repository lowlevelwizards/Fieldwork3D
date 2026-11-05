import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,doorLeafSegment,pointToSegment,route,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {initDoor,doorApproach,pressDoorOnBodyAttempt} from '../src/breach-door.ts';
import {bodyClear} from '../src/breach-navigation.ts';
const door=()=>{const d=initDoor({
 id:'R5-STAGE',a:{x:290,y:260},b:{x:332,y:260},hinge:'a',
 swing:-1,kind:'hinged',open:true,openedAt:0
},0);d.openFraction=.68;d.angularVelocity=0;return d;};
const siteFor=d=>({
 seed:31,doors:[d],walls:[],cover:[],
 bounds:{minX:0,minY:0,maxX:640,maxY:520}
});
test('R5: a swung door staging point follows legal full-size body geometry',()=>{
 const d=door();activateSite(siteFor(d));
 try{
  const from={x:308,y:211},staging=doorApproach(from,d);
  assert.ok(staging,'an open leaf still has accessible handle staging');
  assert.ok(bodyClear(staging,[d]));
  assert.ok(pointToSegment(staging,doorLeafSegment(d))>=OPERATOR_RADIUS+1);
  assert.ok(route(from,staging,p=>bodyClear(p,[d])).length>0);
 }finally{activateSite(null);}
});
test('R5: route-aware staging works for the opposite hinge and swing',()=>{
 for(const hinge of ['a','b'])for(const swing of [-1,1]){
  const d=door();d.hinge=hinge;d.swing=swing;
  activateSite(siteFor(d));
  try{
   const from={x:307,y:210},candidate=doorApproach(from,d);
   assert.ok(candidate,'missing physically reachable staging '+hinge+','+swing);
   assert.ok(bodyClear(candidate,[d]));
  }finally{activateSite(null);}
 }
});
test('R5: controlled body pressure still responds to legitimate leaf contact',()=>{
 for(const fraction of [.25,.76]){
  const d=door();d.openFraction=1;
  const leaf=doorLeafSegment(d);
  const vx=leaf.b.x-leaf.a.x,vy=leaf.b.y-leaf.a.y;
  const norm={x:-vy/Math.hypot(vx,vy),y:vx/Math.hypot(vx,vy)};
  const spot={x:leaf.a.x+vx*fraction,y:leaf.a.y+vy*fraction};
  // On the opening side, a shoulder advances into the swinging leaf.
  const future=doorLeafSegment({...d,openFraction:1.08});
  const ahead={x:future.a.x+(future.b.x-future.a.x)*fraction,
    y:future.a.y+(future.b.y-future.a.y)*fraction};
  const p1={x:spot.x+norm.x*14,y:spot.y+norm.y*14};
  const p2={x:spot.x-norm.x*14,y:spot.y-norm.y*14};
  const before=pointToSegment(p1,leaf),after=pointToSegment(p1,future);
  const from=after>before?p1:p2;
  const to={x:spot.x*2-from.x,y:spot.y*2-from.y};
  const contact=pressDoorOnBodyAttempt(from,to,[d],1/60,[from]);
  assert.equal(contact?.doorId,d.id,'contact at '+fraction+' lever');
  assert.equal(contact?.advanced,true,'door must yield to bounded pressure');
 }
});
