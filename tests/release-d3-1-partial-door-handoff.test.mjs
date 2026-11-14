import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
import {approachingDoorLeaf,physicallyOpeningDoorLeaf} from '../src/breach-door.ts';
const p=(x,y)=>({x,y});
const door={id:'HALF',a:p(100,80),b:p(148,80),kind:'hinged',
 hinge:'a',swing:-1,open:true,openFraction:.30};
test('D3.1: near-panel advancing footstep is real contact, not remote or retreating',()=>{
 const leaf=doorLeafSegment(door);
 const mid=p((leaf.a.x+leaf.b.x)/2,(leaf.a.y+leaf.b.y)/2);
 const ux=-(leaf.b.y-leaf.a.y)/Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y);
 const uy=(leaf.b.x-leaf.a.x)/Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y);
 const from=p(mid.x+ux*12,mid.y+uy*12);
 const advance=p(mid.x+ux*11,mid.y+uy*11);
 const retreat=p(mid.x+ux*13,mid.y+uy*13);
 assert.ok(pointToSegment(from,leaf)<21);
 assert.equal(approachingDoorLeaf(from,advance,door),true);
 const len=Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y);
 const opening=p((door.swing??-1)*(leaf.b.y-leaf.a.y)/len,
  -(door.swing??-1)*(leaf.b.x-leaf.a.x)/len);
 const openFrom=p(mid.x-opening.x*12,mid.y-opening.y*12);
 const openTo=p(mid.x-opening.x*11,mid.y-opening.y*11);
 const closeFrom=p(mid.x+opening.x*12,mid.y+opening.y*12);
 const closeTo=p(mid.x+opening.x*11,mid.y+opening.y*11);
 assert.equal(physicallyOpeningDoorLeaf(openFrom,openTo,door),true);
 assert.equal(physicallyOpeningDoorLeaf(closeFrom,closeTo,door),false,
  'physical handoff must not push a partial leaf closed');
 assert.equal(approachingDoorLeaf(from,retreat,door),false);
 assert.equal(approachingDoorLeaf(p(1000,1000),p(999,999),door),false);
 assert.equal(approachingDoorLeaf(from,advance,{...door,open:false}),false);
 assert.equal(approachingDoorLeaf(from,advance,{...door,wedged:true}),false);
});
test('D3.1: partial leaf handoff stays within the ordinary body motor and authored MOVE',()=>{
 const s=readFileSync(new URL('../src/breach-motor-door.ts',import.meta.url),'utf8');
 assert.match(s,/a\.actionTimer>=\.65&&/);
 assert.match(s,/physicallyOpeningDoorLeaf\(a\.p,move,doorAhead\)/);
 assert.match(s,/pendingDoor\?\.kind==='move'/);
 assert.match(s,/pendingDoor\?\.kind==='pie'/);
 assert.match(s,/operatorCrossingDoor\(a,doorAhead\)\|\|physicallyTouching/);
});
