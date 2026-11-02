import test from 'node:test';
import assert from 'node:assert/strict';
import {unionRoomRects,exteriorKnownFogRects,fogUvAt}
 from '../src/breach-fog-domain.ts';
const room=(x,y,w,h)=>({id:x+':'+y,x,y,w,h,kind:'room',tone:0});
const site=(rooms)=>({seed:17,rooms,
 bounds:{minX:0,minY:0,maxX:640,maxY:740}});
const covers=(parts,p)=>parts.some(r=>p.x>r.x&&p.x<r.x+r.w&&
 p.y>r.y&&p.y<r.y+r.h);
const totalArea=rects=>rects.reduce((a,r)=>a+r.w*r.h,0);
test('VIS-11: overlapping townhouse rooms have exact nonoverlapping union',()=>{
 const rooms=[room(100,100,100,240),room(180,100,140,240),
  room(150,290,140,110)];
 const a=unionRoomRects(rooms);
 assert.equal(totalArea(a),100*240+140*240+140*110-
  20*240-50*50-110*50+20*50);
 assert.equal(covers(a,{x:170,y:200}),true);
 assert.equal(covers(a,{x:110,y:110}),true);
 assert.equal(covers(a,{x:330,y:200}),false);
 // A vertical projected fog sheet must never include the lawn at x=330.
 for(const r of a){
  assert.ok(r.w>0&&r.h>0);
  assert.ok(rooms.some(q=>r.x+r.w/2>=q.x&&r.x+r.w/2<=q.x+q.w&&
   r.y+r.h/2>=q.y&&r.y+r.h/2<=q.y+q.h));
 }
});
test('VIS-11: a courtyard gap is not converted into a giant bounding rectangle',()=>{
 const rooms=[room(100,100,120,40),room(100,140,40,140),
  room(180,140,40,140)];
 const a=exteriorKnownFogRects(site(rooms));
 assert.equal(covers(a,{x:120,y:120}),true);
 // Open bottom edge of U connects the center to surrounding outdoors.
 assert.equal(covers(a,{x:160,y:230}),false);
 assert.equal(covers(a,{x:235,y:160}),false);
});
test('VIS-11: completely enclosed court remains undiscovered',()=>{
 const rooms=[room(100,100,200,40),room(100,140,40,120),
  room(260,140,40,120),room(100,260,200,40)];
 const a=exteriorKnownFogRects(site(rooms));
 assert.equal(covers(a,{x:200,y:200}),true);
 assert.equal(covers(a,{x:320,y:200}),false);
});
test('VIS-11: mask UV corners align with authoritative site coordinates',()=>{
 const b={minX:-90,minY:-70,maxX:910,maxY:990};
 assert.deepEqual(fogUvAt({x:-90,y:-70},b),{u:0,v:1});
 assert.deepEqual(fogUvAt({x:910,y:990},b),{u:1,v:0});
 assert.deepEqual(fogUvAt({x:410,y:460},b),{u:.5,v:.5});
});
test('VIS-11: no automatic room reveal occurs',()=>{
 const s=site([room(100,100,200,200)]);
 const a=exteriorKnownFogRects(s);
 assert.equal(covers(a,{x:200,y:200}),true);
 // A black quad is present even at the room center; operator LOS alone
 // determines its transparency through the shared canonical mask texture.
});
