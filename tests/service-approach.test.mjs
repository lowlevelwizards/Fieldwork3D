import test from 'node:test';
import assert from 'node:assert/strict';
import {NavigationGrid} from '../src/navigation/grid.ts';
import {serviceApproach,hasArrived} from '../src/navigation/service-approach.ts';
const from={x:10,z:10};
test('approach reaches a slightly obstructed off-grid service anchor',()=>{
 const nav=new NavigationGrid([
  {kind:'box',x:2,z:2,halfX:1.0,halfZ:1.0},
 ]);
 const anchor={x:2,z:3.48};
 const route=serviceApproach(nav,from,anchor);
 assert.ok(route.length>0);
 assert.ok(hasArrived(route.at(-1),anchor));
 assert.ok(nav.canOccupy(route.at(-1)));
});
test('never labels a waypoint beyond clearance as physically arrived',()=>{
 const nav=new NavigationGrid([{kind:'box',x:2,z:2,halfX:5,halfZ:5}]);
 const anchor={x:2,z:2};
 assert.deepEqual(serviceApproach(nav,from,anchor),[]);
 assert.equal(hasArrived({x:2,z:3.7},anchor),false);
});
test('all network service anchors have an actual physical approach from the truck',()=>{
 const obstacles=[
 {kind:'box',x:-18,z:-7.5,halfX:1.696,halfZ:1.166},
 {kind:'box',x:-3,z:-6.7,halfX:1.007,halfZ:.61},
 {kind:'box',x:1.3,z:-9.3,halfX:.84,halfZ:.55},
 {kind:'box',x:24,z:-23,halfX:1.007,halfZ:.583},
 {kind:'circle',x:29,z:-19,radius:1.5},
 {kind:'box',x:8,z:7,halfX:.96,halfZ:.70}];
 const nav=new NavigationGrid(obstacles);
 const positions=[{x:-18,z:-5.4},{x:-3,z:-4.85},{x:1.3,z:-7.98},{x:24,z:-20.8},{x:29,z:-16.7}];
 for(const point of positions) {
 const path=serviceApproach(nav,from,point);
 assert.ok(path.length,'access to '+JSON.stringify(point));
 assert.ok(hasArrived(path.at(-1),point),'arrived '+JSON.stringify(point));
 }
});
