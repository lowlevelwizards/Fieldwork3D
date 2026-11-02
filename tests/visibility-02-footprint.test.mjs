import test from 'node:test';
import assert from 'node:assert/strict';
import {insideSiteFootprint,exteriorBriefedAt,accessibleExteriorWall}
  from '../src/breach-site-footprint.ts';
import {intelFogLevel} from '../src/breach-intel.ts';
const room=(x,y,w=40,h=40)=>({x,y,w,h,id:x+':'+y,kind:'room',tone:0});
const site=(rooms)=>({seed:4,rooms});
const blankIntel={mode:'exterior-known'};
test('VIS-02: notched building footprint preserves exposed and internal edges',()=>{
 const s=site([room(0,0),room(40,0),room(0,40)]);
 assert.equal(insideSiteFootprint(s,{x:10,y:10}),true);
 assert.equal(insideSiteFootprint(s,{x:65,y:65}),false);
 assert.equal(exteriorBriefedAt(s,{x:65,y:65}),true);
 assert.equal(intelFogLevel(blankIntel,s,{x:65,y:65},false,false),1);
 assert.equal(intelFogLevel(blankIntel,s,{x:20,y:20},false,false),2);
});
test('VIS-02: enclosed internal court never receives exterior briefing',()=>{
 const rooms=[];
 for(let y=0;y<5;y++)for(let x=0;x<5;x++)
   if(x===0||y===0||x===4||y===4)rooms.push(room(x*40,y*40));
 const s=site(rooms);
 assert.equal(insideSiteFootprint(s,{x:100,y:100}),false);
 assert.equal(exteriorBriefedAt(s,{x:100,y:100}),false);
 assert.equal(intelFogLevel(blankIntel,s,{x:100,y:100},false,false),2);
 assert.equal(exteriorBriefedAt(s,{x:-20,y:-20}),true);
});
test('VIS-02: exterior walls briefed, interior partitions not',()=>{
 const s=site([room(0,0),room(40,0)]);
 assert.equal(accessibleExteriorWall(s,{a:{x:0,y:0},b:{x:0,y:40}}),true);
 assert.equal(accessibleExteriorWall(s,{a:{x:40,y:0},b:{x:40,y:40}}),false);
});
