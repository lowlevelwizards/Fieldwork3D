import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,doorLeafSegment,pointToSegment,OPERATOR_RADIUS,passable}
 from '../src/breach-core.ts';
import {initDoor,pressDoorOnBodyAttempt,advanceDoor,pushDoor}
 from '../src/breach-door.ts';
import {bodyClear,sweptBodyClear,escapeOpenDoorOverlap}
 from '../src/breach-navigation.ts';

const make=()=>{
 const d=initDoor({id:'TRAP',a:{x:290,y:260},b:{x:332,y:260},
   hinge:'a',swing:-1,kind:'hinged',open:true,openedAt:0},0);
 d.openFraction=1;d.angularVelocity=0;d.pushTarget=1;
 return d;
};
const len=p=>Math.hypot(p.x,p.y);
function basis(d){
 const leaf=doorLeafSegment(d),mid={
   x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 const t={x:(leaf.b.x-leaf.a.x)/len({
   x:leaf.b.x-leaf.a.x,y:leaf.b.y-leaf.a.y}),
   y:(leaf.b.y-leaf.a.y)/len({
     x:leaf.b.x-leaf.a.x,y:leaf.b.y-leaf.a.y})};
 // Where the panel travels when its opening angle increases.
 const open={x:(d.swing??-1)*t.y,y:-(d.swing??-1)*t.x};
 const point=(v,units)=>({x:mid.x+v.x*units,y:mid.y+v.y*units});
 return {leaf,mid,t,open,point};
}
test('normal capsule does not become the tiny hinge collider while door opens',()=>{
 const door=make(),b=basis(door);
 const future=doorLeafSegment({...door,openFraction:1.15});
 const middle={x:(future.a.x+future.b.x)/2,
   y:(future.a.y+future.b.y)/2};
 const actor={x:middle.x+b.open.x*5.5,y:middle.y+b.open.y*5.5};
 assert.ok(pointToSegment(actor,doorLeafSegment(door))>
   pointToSegment(actor,future));
 assert.ok(pointToSegment(actor,future)<OPERATOR_RADIUS+1);
 pushDoor(door,3);
 let previous=pointToSegment(actor,doorLeafSegment(door));
 for(let i=0;i<90;i++){
   advanceDoor(door,1/60,[actor]);
   const current=pointToSegment(actor,doorLeafSegment(door));
   // It is fine for the door to eventually swing *past* the actor,
   // provided every intermediate hinge tick respects full capsule radius.
   if(previous>=OPERATOR_RADIUS+1-.01)
     assert.ok(current>=OPERATOR_RADIUS+1-.06,
       'hinge entered normal body capsule on tick '+i);
   else assert.ok(current>=previous-.06,
     'hinge deepened an existing overlap on tick '+i);
   previous=current;
 }
});
test('reverse-face solo pressure closes, opposite face continues to open',()=>{
 const door=make(),basisAt=basis(door);
 const closer=basisAt.point(basisAt.open,14);
 const intoDoor=basisAt.point(basisAt.open,-14);
 const closing=pressDoorOnBodyAttempt(closer,intoDoor,[door],1/60,[closer]);
 assert.equal(closing?.doorId,door.id);
 assert.equal(door.open,false,'solo incidental closing is intentional');
 assert.ok(door.openFraction<=1,'closing pressure cannot push further open');
 // Verify opening pressure independently, before the first door is latched.
 const openingDoor=make(),openingBasis=basis(openingDoor);
 const opener=openingBasis.point(openingBasis.open,-14);
 const through=openingBasis.point(openingBasis.open,14);
 const opening=pressDoorOnBodyAttempt(opener,through,[openingDoor],1/60,[opener]);
 assert.equal(opening?.doorId,openingDoor.id);
 assert.equal(opening?.advanced,true);
 assert.equal(openingDoor.open,true);
});
test('overlapped operator cannot travel along inside leaf; bounded escape increases clearance',()=>{
 const d=make(),b=basis(d),from=b.mid;
 const parallel=b.point(b.t,13);
 assert.equal(bodyClear(from,[d]),false);
 assert.equal(sweptBodyClear(from,parallel,[d]),false,
   'a parallel move must not ghost along inside the panel');
 let p=from;
 for(let i=0;i<18&&!bodyClear(p,[d]);i++){
   const next=escapeOpenDoorOverlap(p,parallel,[d],1.35);
   assert.ok(next,'embedded operator needs safe escape step '+i);
   assert.ok(passable(next,OPERATOR_RADIUS));
   assert.ok(len({x:next.x-p.x,y:next.y-p.y})<=1.351);
   assert.ok(sweptBodyClear(p,next,[d]));
   assert.ok(pointToSegment(next,b.leaf)>pointToSegment(p,b.leaf));
   p=next;
 }
 assert.equal(bodyClear(p,[d]),true,
   'operator must become completely free of leaf without teleporting');
});
test('escape never penetrates a wall or a different door',()=>{
 const d=make(),b=basis(d),from=b.mid;
 const wall={a:{x:280,y:240},b:{x:280,y:310}};
 const site={seed:11,doors:[d],walls:[wall],cover:[],
   bounds:{minX:0,minY:0,maxX:650,maxY:540}};
 activateSite(site);
 try{
   let p=from;
   for(let i=0;i<8;i++){
     const next=escapeOpenDoorOverlap(p,b.point(b.t,20),[d],1.25);
     if(!next)break;
     assert.ok(sweptBodyClear(p,next,[d]));
     assert.equal(passable(next),true);
     p=next;
   }
 }finally{activateSite(null);}
});
