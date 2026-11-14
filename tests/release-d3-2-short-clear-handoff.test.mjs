import test from 'node:test';
import assert from 'node:assert/strict';
import {shortClearLegPastStalledLeaf} from '../src/breach-motor-door.ts';
import {doorLeafSegment,OPERATOR_RADIUS} from '../src/breach-core.ts';
const d={id:'D',a:{x:100,y:100},b:{x:150,y:100},kind:'hinged',
 hinge:'a',swing:-1,open:true,openFraction:.65,angularVelocity:0,
 wedged:false,heldBy:null,locked:false};
const leaf=doorLeafSegment(d);
const mid={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
const len=Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y);
const n={x:-(leaf.b.y-leaf.a.y)/len,y:(leaf.b.x-leaf.a.x)/len};
const at=(gap)=>({x:mid.x+n.x*gap,y:mid.y+n.y*gap});
test('D3.2.3: genuinely short, swept-clear leg can continue at partial stalled angle',()=>{
 let checks=0;
 assert.equal(shortClearLegPastStalledLeaf(at(15),at(14),d,1,
  ()=>{checks++;return true}),true);
 assert.equal(checks,1);
 assert.equal(shortClearLegPastStalledLeaf(at(15),at(14),d,1,
  ()=>false),false,'world collision must still have veto');
 assert.equal(shortClearLegPastStalledLeaf(at(15),at(OPERATOR_RADIUS),d,1,
  ()=>true),false,'endpoint cannot be inside leaf radius');
});
test('D3.2.3: no early, remote, active-hinge, locked or held bypass',()=>{
 const pass=()=>true;
 for(const bad of [{open:false},{locked:true},{heldBy:'A'},
   {angularVelocity:.25},{openFraction:.2},{wedged:true}]){
  assert.equal(shortClearLegPastStalledLeaf(at(15),at(14),
   {...d,...bad},2,pass),false,JSON.stringify(bad));
 }
 assert.equal(shortClearLegPastStalledLeaf(at(15),at(14),d,.2,pass),false);
 assert.equal(shortClearLegPastStalledLeaf(at(15),at(48),d,2,pass),false);
});
test('D3.2.3: opening handoff protects exactly its leaf from incidental CLOSE',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/breach-motor-collision.ts',import.meta.url),'utf8');
 assert.match(src,/door\.id===clearingDoorId/);
 assert.match(src,/originalDeferClosing\?\.\(door\)===true/);
 assert.match(src,/sweptBodyClear\(a\.p,desiredMove/);
});
