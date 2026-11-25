import test from 'node:test';
import assert from 'node:assert/strict';
import {windowShardPose,settledWindowShardPose,WINDOW_SHARD_DURATION,WINDOW_SETTLED_SHARDS_PER_PANE,WINDOW_SHARD_CAPACITY,WindowShardSlotCache} from '../src/rendering/window-shatter-presentation.ts';
const pane={x:40,y:60,width:42,vertical:true,shattered:true,shatteredAt:2};
const scratch=()=>({x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1,heightScale:1});
test('V6 settled shards exist only after recorded burst and remain deterministic across seeks',()=>{
 const p=scratch(),q=scratch();
 assert.equal(settledWindowShardPose(pane,1,0,p),false);
 assert.equal(settledWindowShardPose(pane,2.5,0,p),false);
 assert.ok(windowShardPose(pane,2.5,0));
 assert.equal(windowShardPose(pane,4,0),null);
 assert.equal(settledWindowShardPose(pane,4,0,p),true);
 assert.equal(settledWindowShardPose(pane,120,0,q),true);
 assert.deepEqual(p,q);
 assert.equal(settledWindowShardPose({...pane,shattered:false},4,0,q),false);
 assert.equal(settledWindowShardPose({...pane,shatteredAt:undefined},4,0,q),false);
 assert.equal(settledWindowShardPose(pane,4,WINDOW_SETTLED_SHARDS_PER_PANE,q),false);
 for(let i=0;i<WINDOW_SETTLED_SHARDS_PER_PANE;i++){
  assert.ok(settledWindowShardPose(pane,4,i,p));
  assert.ok(Math.abs(p.z-pane.y)<pane.width/2);
  assert.ok(Math.abs(p.x-pane.x)<15);
  assert.equal(p.heightScale,.60);
 }
});
test('V6 exact slot cache avoids unchanged matrix uploads and supports reset',()=>{
 const p=scratch(),cache=new WindowShardSlotCache();
 assert.ok(cache.changed(0,p));assert.equal(cache.changed(0,p),false);
 assert.ok(cache.changed(0,p,.25));assert.equal(cache.changed(0,p,.25),false);
 p.x=7;assert.ok(cache.changed(0,p,.25));
 assert.ok(cache.changed(WINDOW_SHARD_CAPACITY-1,p));
 assert.equal(cache.changed(WINDOW_SHARD_CAPACITY,p),false);
 cache.reset();assert.ok(cache.changed(0,p,.25));
});
