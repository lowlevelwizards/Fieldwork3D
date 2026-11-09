import test from 'node:test';
import assert from 'node:assert/strict';
import {captureMotionFrameOrigins,buildMotionFrameProposals}
  from '../src/breach-motion-frame-input.ts';
import {resolveMovementFrame}
  from '../src/breach-movement-authority.ts';

const pt=(x,y)=>({x,y});
function operator(id,side,health,p){
 return {id,side,health,p,carriedById:null};
}
function civilian(id,health,p,carriedById=null){
 return {id,health,p,carriedById};
}
function reference(operators,civilians,origins){
 return [
   ...operators.map(a=>({id:a.id,side:a.side,
     from:origins.get(a.id)??a.p,to:a.p,alive:a.health>0,
     carried:!!a.carriedById})),
   ...civilians.map(c=>({id:c.id,side:'neutral',
     from:origins.get(c.id)??c.p,to:c.p,
     alive:c.health>0||!!c.carriedById,carried:!!c.carriedById}))
 ];
}
test('fixed-tick captures independent pre-motor origins in actor order',()=>{
 const blue=operator('blue','blue',4,pt(20,30));
 const red=operator('red','red',2,pt(80,30));
 const inactive=operator('down','red',0,pt(60,40));
 const c1=civilian('civil',1,pt(85,45));
 const c2=civilian('carried',0,pt(70,47),'blue');
 const operators=[blue,red,inactive],civilians=[c1,c2];
 const originals=captureMotionFrameOrigins(operators,civilians);
 assert.deepEqual([...originals.keys()],['blue','red','down','civil','carried']);
 blue.p.x=30;red.p.y=40;c1.p.y=55;c2.p.x=77;
 assert.deepEqual(originals.get('blue'),pt(20,30));
 assert.deepEqual(originals.get('red'),pt(80,30));
 assert.deepEqual(originals.get('civil'),pt(85,45));
 const proposals=buildMotionFrameProposals(operators,civilians,originals);
 assert.deepEqual(proposals,reference(operators,civilians,originals));
 assert.strictEqual(proposals[0].to,blue.p);
 assert.notStrictEqual(proposals[0].from,blue.p);
 assert.equal(proposals[2].alive,false);
 assert.equal(proposals[4].alive,true,'carried incapacitated body remains in authority');
 assert.equal(proposals[4].carried,true);
});
test('new frame proposal boundary leaves hard-body right-of-way unchanged',()=>{
 const a=operator('a','blue',4,pt(0,0));
 const b=operator('b','red',4,pt(30,0));
 const c=civilian('c',1,pt(45,0));
 const operators=[a,b],civilians=[c];
 const original=captureMotionFrameOrigins(operators,civilians);
 a.p=pt(20,0);b.p=pt(12,0);c.p=pt(40,0);
 const expected=resolveMovementFrame(
   reference(operators,civilians,original),()=>true);
 const actual=resolveMovementFrame(
   buildMotionFrameProposals(operators,civilians,original),()=>true);
 assert.deepEqual(actual,expected);
 assert.ok(actual.some(x=>x.blocked),'opposing bodies must still conflict');
});
