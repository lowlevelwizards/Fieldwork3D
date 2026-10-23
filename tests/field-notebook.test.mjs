import test from 'node:test';
import assert from 'node:assert/strict';
import {FieldNotebook,crewActivity} from '../src/fieldwork/field-notebook.ts';
import {NetworkJob} from '../src/fieldwork/network-job.ts';
import {CrewMission} from '../src/crew/crew-mission.ts';

test('unobserved machines are absent from notebook; generator report preserves provenance',()=>{
 const job=new NetworkJob(1),notes=new FieldNotebook();
 assert.equal(notes.sorted().length,0);
 assert.match(notes.lead(job),/first reading/);
 const generator=job.inspect('generator').observation;
 notes.record(generator,'MICA');
 assert.equal(notes.sorted().length,1);
 assert.equal(notes.sorted()[0].observer,'MICA');
 assert.equal(notes.readings.has('relay'),false);
 assert.match(notes.lead(job),/Generator good/);
});
test('evidence gives correct upstream lead rather than leaking hidden fault',()=>{
 const job=new NetworkJob(0),notes=new FieldNotebook();
 notes.record(job.inspect('relay').observation,'ROOK');
 assert.match(notes.lead(job),/Trace upstream/);
 assert.doesNotMatch(notes.lead(job),/Identified worksite/);
 notes.record(job.inspect('generator').observation,'MICA');
 assert.equal(job.diagnosed,true);
 assert.match(notes.lead(job),/Generator/);
});
test('readings update without duplicate entries, and sequential observations are ordered',()=>{
 const job=new NetworkJob(1),notes=new FieldNotebook();
 notes.record(job.inspect('generator').observation,'MICA');
 notes.record(job.inspect('relay').observation,'ROOK');
 notes.record(job.inspect('relay').observation,'ROOK');
 assert.equal(notes.sorted().length,2);
 assert.equal(notes.sorted().at(-1).station,'relay');
 notes.note('Mica fetched part');notes.note('Mica fetched part');
 assert.equal(notes.events.length,1);
});
test('crew wording tracks actual assignment, no omniscient status',()=>{
 const c=new CrewMission();
 assert.match(crewActivity(c,true),/checking generator/);
 c.diagnose('terminal');
 assert.match(crewActivity(c,false),/heading to supplies/);
 for(let i=0;i<30;i++)c.advance(.05,true,false,false);
 assert.match(crewActivity(c,false),/carrying replacement/);
});
