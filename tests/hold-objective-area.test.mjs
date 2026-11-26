import test from 'node:test';
import assert from 'node:assert/strict';
import {holdObjectiveBounds,inHoldObjectiveBounds} from '../src/breach-objective-intel.ts';

test('hold bounds follow a small room rather than a center-radius check',()=>{
 const site={rooms:[{id:'room',kind:'room',x:40,y:60,w:90,h:110}]};
 const bounds=holdObjectiveBounds(site,{x:85,y:115});
 assert.deepEqual(bounds,{minX:46,minY:66,maxX:124,maxY:164});
 assert.equal(inHoldObjectiveBounds({x:48,y:160},bounds),true);
 assert.equal(inHoldObjectiveBounds({x:45,y:115},bounds),false);
 assert.equal(inHoldObjectiveBounds({x:85,y:165},bounds),false);
});
test('large hold rooms use a bounded eight-cell subsection without crossing walls',()=>{
 const site={rooms:[{id:'hall',kind:'room',x:20,y:30,w:300,h:200}]};
 const bounds=holdObjectiveBounds(site,{x:40,y:60});
 assert.deepEqual(bounds,{minX:26,minY:36,maxX:154,maxY:164});
 assert.equal(inHoldObjectiveBounds({x:155,y:100},bounds),false);
});
test('legacy and exterior objectives retain the original fallback',()=>{
 assert.equal(holdObjectiveBounds(undefined,{x:1,y:1}),null);
 assert.equal(holdObjectiveBounds({rooms:[]},{x:1,y:1}),null);
});
