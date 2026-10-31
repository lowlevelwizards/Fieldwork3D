import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {routeWithSqueezeWorld,routeWithSqueezeIntel}
  from '../src/breach-squeeze-route.ts';
import {bodyClear,sweptProfileClear,squeezeFacing}
  from '../src/breach-navigation.ts';
const wall=(a,b)=>({a,b});
test('190A: closed physical wall rejects normal body but admits oriented squeeze',()=>{
  activateSite({walls:[
    wall({x:230,y:20},{x:230,y:200}),
    wall({x:230,y:215.5},{x:230,y:720})
  ],cover:[]});
  try{
    const a={x:192,y:208},b={x:272,y:208},path=routeWithSqueezeWorld(a,b,[]);
    assert.ok(path.length,'narrow centerline must exist');
    assert.ok(!bodyClear({x:230,y:208},[]));
    assert.ok(sweptProfileClear({x:227,y:208},{x:237,y:208},
      [],squeezeFacing(0),'squeeze'));
  }finally{activateSite(null);}
});
test('190A: known wall uses same narrow planning profile',()=>{
  activateSite({walls:[
    wall({x:230,y:20},{x:230,y:200}),
    wall({x:230,y:215.5},{x:230,y:720})
  ],cover:[]});
  try{
    const intel={walls:new Set([0,1]),cover:new Set(),doors:new Set()};
    assert.ok(routeWithSqueezeIntel(intel,{x:192,y:208},
      {x:272,y:208}).length);
  }finally{activateSite(null);}
});
