import test from 'node:test';import assert from 'node:assert/strict';
import {initDoor,kickDoor} from '../src/breach-door.ts';
import {doorInteraction} from '../src/breach-interactions.ts';
const door={id:'TEST',a:{x:200,y:220},b:{x:248,y:220},
 openedAt:-1,open:false,locked:true,hinge:'a',swing:-1};
test('locked door rejects normal opening and supports cumulative forced entry',()=>{
 const d=initDoor(door,0);
 assert.ok(d.latchIntegrity>=2);
 const request={target:d,action:'open',actorId:'rook',
  actorPosition:{x:224,y:238}};
 assert.equal(doorInteraction(request).reason,'locked');
 for(let i=0;i<12&&!d.open;i++)kickDoor(d,{x:224,y:202});
 assert.equal(d.open,true);
 assert.equal(d.locked,false);
 assert.equal(doorInteraction(request).reason,'already-open');
});
test('industrial shutters cannot be kicked open',()=>{
 const d=initDoor({...door,kind:'shutter'},0);
 assert.equal(doorInteraction({target:d,action:'kick',actorId:'rook',
 actorPosition:{x:224,y:238}}).reason,'unsupported');
});
