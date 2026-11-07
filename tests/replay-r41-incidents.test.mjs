import test from 'node:test';
import assert from 'node:assert/strict';
import {indexReplayIncidents,featuredReplayIncidents,
  INCIDENT_GAP_SECONDS} from '../src/breach-replay-incidents.ts';
const ev=(n,t,kind,x=100,y=100,actor='rook')=>({
  key:'e:'+n,source:'battle',order:n,t,kind,actor,
  p:x===null?undefined:{x,y},text:kind
});
test('one doorway/contact/engagement forms an evidence-based incident',()=>{
  const all=[
    ev(1,10,'door',100,100),
    ev(2,11,'intel',120,120,'guard'),
    ev(3,12,'shot',110,110),
    ev(4,12.2,'shot',110,110),
    ev(5,13,'wound',115,111,'moss')
  ];
  const incidents=indexReplayIncidents(all,60);
  assert.equal(incidents.length,1);
  assert.deepEqual(incidents[0].eventKeys,all.map(e=>e.key));
  assert.equal(incidents[0].label,'CASUALTY DURING ENGAGEMENT');
  assert.equal(incidents[0].end,13);
  assert.match(incidents[0].summary,/2 shots/);
  assert.equal(incidents[0].eventCount,5);
});
test('simultaneous distant fights do not collapse into one episode',()=>{
  const incidents=indexReplayIncidents([
    ev(1,5,'shot',100,100,'rook'),
    ev(2,5,'shot',550,550,'rook'),
    ev(3,6,'wound',120,120,'moss'),
    ev(4,6,'down',565,540,'ash')
  ],80);
  assert.equal(incidents.length,2);
  assert.deepEqual(incidents.map(i=>i.eventCount),[2,2]);
});
test('long continuous fire stays bounded and does not bridge the whole mission',()=>{
  const evs=Array.from({length:20},(_,i)=>ev(i,i,'shot'));
  const incidents=indexReplayIncidents(evs,30);
  assert.equal(incidents.length,2);
  assert.ok(incidents.every(i=>i.end-i.start<=12));
  assert.equal(INCIDENT_GAP_SECONDS,3);
});
test('null location associates only with the same known actor',()=>{
  const incidents=indexReplayIncidents([
    ev(1,4,'door',80,80,'rook'),
    ev(2,5,'completed',null,null,'moss'),
    ev(3,6,'blocked',null,null,'rook')
  ],15);
  assert.equal(incidents.length,2);
  assert.deepEqual(incidents.map(i=>i.eventCount),[2,1]);
});
test('restricted input cannot reveal any event excluded from disclosure',()=>{
  const known=[ev(1,3,'door',10,20),ev(2,4,'shot',10,20)];
  const hidden=ev(3,5,'down',10,20,'secretHostile');
  const input=indexReplayIncidents(known,10);
  assert.equal(input[0].eventKeys.includes(hidden.key),false);
  assert.equal(input[0].summary.includes('downed'),false);
  const full=indexReplayIncidents([...known,hidden],10);
  assert.equal(full[0].eventCount,3);
});
test('priority chooses consequential distinct incidents rather than gunfire volume',()=>{
  const records=[
    ...Array.from({length:25},(_,i)=>ev(i,i*.2,'shot',20,20)),
    ev(50,18,'objective',450,450,'moss'),
    ev(51,30,'down',650,650,'ash'),
    ev(52,40,'flash',700,700,'rook'),
    ev(53,50,'intel',70,70,'moss')
  ];
  const result=featuredReplayIncidents(indexReplayIncidents(records,60),3);
  assert.equal(result.length,3);
  assert.ok(result.some(i=>i.kind==='objective'));
  assert.ok(result.some(i=>i.kind==='casualty'));
  assert.equal(result.some(i=>i.start===0),false);
});
test('rejects invalid/out of range timestamps, stable order, never modifies input',()=>{
  const events=[ev(2,3,'shot'),ev(1,2,'door'),ev(3,500,'down'),
    ev(4,NaN,'wound'),ev(5,1,'unknown')];
  const clone=events.slice();
  const indexed=indexReplayIncidents(events,10);
  assert.equal(indexed.length,1);
  assert.deepEqual(indexed[0].eventKeys,['e:1','e:2']);
  assert.deepEqual(events,clone);
  assert.equal(indexReplayIncidents(events,0).length,0);
});
