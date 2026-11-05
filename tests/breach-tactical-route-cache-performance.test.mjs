import test from 'node:test';
import assert from 'node:assert/strict';
import {TacticalRouteCache} from '../src/breach-tactical-route-cache.ts';

test('motor route memo returns independent mutable paths and exact-origin keys',()=>{
 const cache=new TacticalRouteCache();
 let calls=0;
 const route=()=>{calls++;return [{x:15,y:15},{x:60,y:60}];};
 const from={x:10.001,y:10},to={x:60,y:60};
 const first=cache.get(from,to,10,1,'static',route);
 first[0].x=999;first.push({x:777,y:777});
 const second=cache.get(from,to,10,2,'static',route);
 assert.deepEqual(second,[{x:15,y:15},{x:60,y:60}]);
 assert.equal(calls,1);
 cache.get({x:10.002,y:10},to,10,2,'static',route);
 assert.equal(calls,2,'no approximate/snapped origin route acceptance');
 cache.get(from,to,10,2,'doors/open:0.6',route);
 assert.equal(calls,3,'world door state changes the route key');
 cache.get(from,to,11,2,'static',route);
 assert.equal(calls,4,'moved geometry invalidates all route results');
});

test('known unreachable goal avoids repeated searches but retries after timeout or revision',()=>{
 const cache=new TacticalRouteCache();let attempts=0;
 const fail=()=>{attempts++;return [];};
 for(let tick=1;tick<=13;tick++)
  assert.deepEqual(cache.get({x:3,y:5},{x:80,y:80},1,tick,'static',fail),[]);
 assert.equal(attempts,1);
 cache.get({x:3,y:5},{x:80,y:80},1,14,'static',fail);
 assert.equal(attempts,2);
 cache.get({x:3,y:5},{x:80,y:80},2,15,'static',fail);
 assert.equal(attempts,3,'a topology revision bypasses negative cache');
});

test('bounded route memo never grows unbounded under random destination churn',()=>{
 const cache=new TacticalRouteCache();
 for(let i=0;i<600;i++)
  cache.get({x:i,y:i/2},{x:i+18,y:i+20},0,i,'static',()=>
    [{x:i+18,y:i+20}]);
 assert.ok(cache.misses>=600);
 assert.ok(cache.hits===0);
});
