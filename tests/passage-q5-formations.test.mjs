import test from 'node:test';
import assert from 'node:assert/strict';
import {DOOR_RANGE_FORMATIONS,doorRangeFormationSpawns}
 from '../src/breach-door-range-formations.ts';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('Q5 six distinct formations mirrored onto both door approach faces',()=>{
 assert.equal(DOOR_RANGE_FORMATIONS.length,6);
 const signatures=new Set();
 for(const form of DOOR_RANGE_FORMATIONS){
  const north=doorRangeFormationSpawns(form.id,'north');
  const south=doorRangeFormationSpawns(form.id,'south');
  assert.equal(north.length,4);
  for(let i=0;i<4;i++){
   assert.ok(north[i].y<242,'north approach is outside wall');
   assert.ok(south[i].y>278,'south approach is outside wall');
   assert.equal(north[i].x,south[i].x);
   assert.equal(north[i].y+south[i].y,520);
   for(let j=i+1;j<4;j++)
    assert.ok(d(north[i],north[j])>=23,'distinct start capsules');
  }
  signatures.add(north.map(p=>p.x+':'+p.y).join(';'));
  const site=doorRangeSite('inward-left',form.id,'south');
  assert.deepEqual(site.spawn,south);
 }
 assert.equal(signatures.size,6);
});
test('Q5 mirrored right and left are flanking, split holds two each',()=>{
 const left=doorRangeFormationSpawns('left','north');
 const right=doorRangeFormationSpawns('right','north');
 const split=doorRangeFormationSpawns('split','north');
 assert.ok(left.every(p=>p.x<290));
 assert.ok(right.every(p=>p.x>332));
 assert.equal(split.filter(p=>p.x<290).length,2);
 assert.equal(split.filter(p=>p.x>332).length,2);
});

test('Q5 split pairs retain their approach flanks in the actual stack plans',async()=>{
 const {newSession,team,planSquadEntry}=await import('../src/breach-game.ts');
 const {activateSite}=await import('../src/breach-core.ts');
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('inward-left','split','north'),{enableCivilians:false});
 try{
  assert.equal(planSquadEntry(s,'ENTRY'),true);
  const stacks=team(s).slice(0,4).map(a=>
   a.plan.find(n=>n.stackDoorId==='ENTRY')?.p);
  assert.ok(stacks.every(Boolean));
  assert.ok(stacks[0].x<311&&stacks[1].x<311,
   'left pair stages on left side');
  assert.ok(stacks[2].x>311&&stacks[3].x>311,
   'right pair stages on right side');
 }finally{activateSite(null);}
});
