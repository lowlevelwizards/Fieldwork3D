import test from 'node:test';
import assert from 'node:assert/strict';
import {styleArchitecturalDoors} from '../src/worldgen/door-families.ts';
import {generateSite} from '../src/breach-site.ts';
import {auditArchitecturalFeatures} from '../src/worldgen/architecture-feature-audit.ts';

const doorBetween=(kind,left,right,seed=6,id='D1')=>{
 const door={id,a:{x:160,y:44},b:{x:160,y:92},open:false,openedAt:-1};
 const room=(id,purpose,x)=>({id,purpose,x,y:0,w:160,h:140,
   kind:'room',tone:0});
 return styleArchitecturalDoors({archetype:kind,rooms:[
   room('A',left,0),room('B',right,160)],doors:[door]},seed).doors[0];
};

test('door construction follows privacy and working circulation, not a random glass roll',()=>{
 for(const kind of ['office','clinic','house','apartment']){
  const door=doorBetween(kind,'hallway','bathroom');
  assert.notEqual(door.style,'glazed');
  assert.notEqual(door.style,'french');
 }
 const patient=doorBetween('clinic','hallway','exam');
 assert.notEqual(patient.style,'glazed');
 assert.equal(doorBetween('restaurant','kitchen','dining').style,'fire');
 assert.ok(['steel','reinforced'].includes(
   doorBetween('garage','bay','workshop').style));
 const front=doorBetween('retail','sales','lobby',6,'FRONT');
 assert.equal(front.style,'glazed');
 assert.equal(front.kind,'sliding');
 const meeting=doorBetween('office','hallway','meeting');
 assert.ok(['pocket','glazed'].includes(meeting.style));
 if(meeting.style==='pocket')assert.equal(meeting.kind,'sliding');
});

test('generated maps preserve physical architecture and put specialist fixtures in their trade',()=>{
 const specialist={
  'prep-table':['kitchen','service'],
  'commercial-range':['kitchen'],
  'dish-station':['kitchen','service'],
  'handwash-station':['exam','treatment','staff'],
  'instrument-cart':['exam','treatment'],
  'retail-endcap':['sales','checkout'],
  'packing-station':['packing','loading'],
  'parts-bin':['parts','workshop']
 };
 let windows=0,fixtures=0;
 for(let seed=1;seed<=22;seed++){
  const site=generateSite(seed);
  assert.deepEqual(auditArchitecturalFeatures(site).issues,[]);
  windows+=(site.windows??[]).length;
  for(const leaf of site.doors.filter(d=>d.pairedWith)){
   const other=site.doors.find(d=>d.id===leaf.pairedWith);
   assert.ok(other);
   assert.equal(other.pairedWith,leaf.id);
   assert.equal(other.style,leaf.style);
  }
  for(const item of site.cover){
   const expected=specialist[item.fixture];
   if(!expected)continue;
   fixtures++;
   const room=site.rooms.find(r=>item.x>r.x&&item.x<r.x+r.w&&
     item.y>r.y&&item.y<r.y+r.h);
   assert.ok(room,'specialist fixture must be placed in an interior room');
   assert.ok(expected.includes(room.purpose),
     item.fixture+' should not appear in '+room.purpose);
  }
 }
 assert.ok(windows>25,'facades should provide usable daylight');
 assert.ok(fixtures>0,'specialist fixtures should reach the playable map generator');
});
