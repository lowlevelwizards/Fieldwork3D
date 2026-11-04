import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEncounterActivities} from '../src/worldgen/encounter-activities.ts';
test('initial activities face appropriate furniture and sentries remain alert',()=>{
 const site={rooms:[{kind:'room',id:'a',x:0,y:0,w:180,h:180}],
  cover:[{x:95,y:50,w:30,h:20,fixture:'desk'}],
  doors:[{a:{x:150,y:0},b:{x:170,y:0}}]};
 const occupants=[{id:'o',role:'occupant',position:{x:50,y:50},heading:0,
  activity:'idle',readiness:'attentive'}];
 const result=assignEncounterActivities(site,occupants,'routine',42);
 assert.equal(result[0].activity,'working');
 assert.equal(result[0].readiness,'relaxed');
 assert.equal(result[0].heading,0);
 assert.deepEqual(result,assignEncounterActivities(site,occupants,'routine',42));
 const guard=assignEncounterActivities(site,[{...occupants[0],role:'sentry'}],
  'defensive',42)[0];
 assert.equal(guard.readiness,'prepared');assert.equal(guard.activity,'watching');
});

test('G4b: lookouts observe local exterior windows, sentries observe doors',()=>{
 const site={rooms:[{kind:'room',id:'front',x:0,y:0,w:200,h:160}],
  cover:[],doors:[
    {a:{x:200,y:70},b:{x:200,y:90}},
    {a:{x:400,y:70},b:{x:400,y:90}}
  ],windows:[{x:0,y:80,interior:false}]};
 const actor={id:'a',role:'sentry',position:{x:100,y:80},
  heading:1,activity:'idle',readiness:'relaxed'};
 const sentry=assignEncounterActivities(site,[actor],'guarded',5)[0];
 const lookout=assignEncounterActivities(site,[{...actor,role:'lookout'}],
  'guarded',5)[0];
 assert.equal(sentry.activity,'watching');
 assert.ok(Math.abs(sentry.heading)<.02,
  'sentry aims at the actual local east doorway');
 assert.ok(Math.abs(Math.abs(lookout.heading)-Math.PI)<.02,
  'lookout prefers the real west facade window');
 assert.equal(sentry.readiness,'prepared');
});
test('G4b: investigators and reserves have distinct pre-contact readiness',()=>{
 const site={rooms:[{kind:'room',id:'r',x:0,y:0,w:160,h:160}],
  cover:[],doors:[{a:{x:150,y:0},b:{x:160,y:0}}]};
 const actor={id:'q',role:'investigator',position:{x:65,y:65},
  heading:.9,activity:'idle',readiness:'relaxed'};
 const investigator=assignEncounterActivities(site,[actor],'routine',15)[0];
 const reserve=assignEncounterActivities(site,[{...actor,role:'reserve'}],
   'defensive',15)[0];
 assert.equal(investigator.activity,'watching');
 assert.equal(investigator.readiness,'suspicious');
 assert.equal(reserve.activity,'watching');
 assert.equal(reserve.readiness,'prepared');
});
test('G4b: remote openings never redirect a sentry in a different wing',()=>{
 const site={rooms:[{kind:'room',id:'r',x:0,y:0,w:180,h:180}],
  cover:[],doors:[{a:{x:220,y:20},b:{x:220,y:30}}],
  windows:[{x:250,y:80,interior:false}]};
 const actor={id:'s',role:'sentry',position:{x:100,y:100},
  heading:.72,activity:'idle',readiness:'prepared'};
 const result=assignEncounterActivities(site,[actor],'guarded',9)[0];
 assert.equal(result.heading,.72);
});
