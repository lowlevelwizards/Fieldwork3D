import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {routeWithSqueezeWorld} from '../src/breach-squeeze-route.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {diagnoseMovement} from '../src/breach-nav-diagnostics.ts';
const site=(doors=[])=>({seed:1,doors,walls:[],cover:[],
 bounds:{minX:0,minY:0,maxX:1200,maxY:800}});
test('world replan accounts for a physically open leaf rather than rerouting through it',()=>{
 const leaf={id:'LEAF',a:{x:180,y:200},b:{x:228,y:200},
  hinge:'a',swing:-1,open:true,openFraction:1,openedAt:0};
 activateSite(site([leaf]));
 try{
  const from={x:120,y:180},to={x:260,y:180};
  const path=routeWithSqueezeWorld(from,to,[leaf]);
  assert.ok(path.length,'must find an actual route around the leaf');
  let previous=from;
  for(const next of path){
   assert.ok(sweptBodyClear(previous,next,[leaf]),
     'every motor path segment must clear the actual leaf');
   previous=next;
  }
 }finally{activateSite(null);}
});
test('expanded bounds are authoritative in movement obstruction diagnostics',()=>{
 activateSite(site());
 try{
  const from={x:800,y:350},to={x:820,y:350};
  assert.equal(diagnoseMovement(from,to,[],[]).blocker,'clear');
 }finally{activateSite(null);}
});
