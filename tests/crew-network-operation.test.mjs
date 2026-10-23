import test from 'node:test';
import assert from 'node:assert/strict';
import { NetworkJob } from '../src/fieldwork/network-job.ts';
import { CrewMission } from '../src/crew/crew-mission.ts';
import { FieldNotebook } from '../src/fieldwork/field-notebook.ts';
import {nextNetworkFault} from '../src/systems/power-network.ts';

function tickCrew(crew,{atTruck=false,nearRook=false,atHome=false}={},frames=36){
  let last=null;
  for(let i=0;i<frames;i++)last=crew.advance(.05,atTruck,nearRook,atHome)??last;
  return last;
}
function work(job,crew){
  const hasPart=!job.requiresHardware||crew.rookHasFuse;
  const safe=crew.powerIsolated && job.network.breakerIsolated;
  assert.ok(job.begin(hasPart,safe),'work is available at the real machine');
  for(let i=0;i<85 && job.phase==='working';i++)job.update(.05,true,hasPart,safe);
  assert.equal(job.phase,'prepared');
}
function restorePower(job,crew){
  if(crew.powerIsolated){
    assert.equal(crew.requestReenergize(),true);
    assert.equal(tickCrew(crew,{atTruck:true}),'energized');
    assert.equal(job.network.reenergize(),true);
  }
}
test('every network fault supports diagnosis, supplies, safe work, power-on, test and crew return',()=>{
 for(let index=0;index<6;index++){
  const job=new NetworkJob(index);
  const crew=new CrewMission();
  const notes=new FieldNotebook();
  const observation=job.inspect(job.target);
  notes.record(observation.observation,index===0?'MICA':'ROOK');
  assert.equal(job.diagnosed,true);
  assert.equal(notes.sorted()[0].station,job.target);
  const assignment=nextNetworkFault(index)==='contactor'?'isolation':
    nextNetworkFault(index)==='fuse'?'fuse':'terminal';
  assert.equal(crew.diagnose(assignment),true);
  const collected=tickCrew(crew,{atTruck:true});
  if(assignment==='isolation'){
    assert.equal(collected,'isolated');
    job.network.isolate();
  }else{
    assert.equal(collected,'collect');
    assert.equal(crew.stage,'delivering');
    assert.equal(tickCrew(crew,{nearRook:false}),null);
    assert.equal(crew.stage,'delivering');
    assert.equal(tickCrew(crew,{nearRook:true}),'delivered');
    assert.equal(crew.rookHasFuse,true);
    if(job.requiresIsolation){
      assert.equal(crew.reassignIsolation(),true);
      assert.equal(tickCrew(crew,{atTruck:true}),'isolated');
      job.network.isolate();
    }
  }
  work(job,crew);
  if(crew.rookHasFuse)assert.equal(crew.installFuse(),true);
  restorePower(job,crew);
  let result=job.test();
  if(result==='trip'){
    assert.equal(index,4);
    assert.equal(crew.reassignIsolation(),true);
    assert.equal(tickCrew(crew,{atTruck:true}),'isolated');
    job.network.isolate();
    work(job,crew);
    restorePower(job,crew);
    result=job.test();
  }
  assert.equal(result,'complete','scenario '+index);
  assert.equal(job.network.mastOnline,true);
  assert.equal(crew.finishJob(true),true);
  tickCrew(crew,{atHome:false});
  assert.equal(crew.stage,'returning');
  assert.equal(tickCrew(crew,{atHome:true}),'finished');
 }
});
test('losing sight or stepping away does not complete another person’s unfinished task',()=>{
 const job=new NetworkJob(1);
 const crew=new CrewMission();
 job.inspect('switchgear');
 crew.diagnose('terminal');tickCrew(crew,{atTruck:true});
 tickCrew(crew,{nearRook:true},4); // handoff begins, then receiver walks away
 assert.equal(crew.stage,'handoff');
 assert.equal(tickCrew(crew,{nearRook:false},3),null);
 assert.equal(crew.stage,'delivering');
 assert.equal(crew.rookHasFuse,false);
 assert.equal(tickCrew(crew,{nearRook:true}),'delivered');
 crew.reassignIsolation();tickCrew(crew,{atTruck:true});job.network.isolate();
 const safe=crew.powerIsolated && job.network.breakerIsolated;
 assert.ok(job.begin(true,safe));
 job.update(.4,true,true,safe);job.release();
 for(let i=0;i<15;i++)job.update(.05,true,true,safe);
 assert.equal(job.phase,'working');
 assert.ok(job.progress>0);
 job.update(.05,false,true,safe); // Rook left equipment
 assert.equal(job.phase,'diagnosed');
 assert.equal(job.network.repaired,false);
 assert.ok(job.begin(true,safe));
 for(let i=0;i<85 && job.phase==='working';i++)job.update(.05,true,true,safe);
 assert.equal(job.phase,'prepared');
});
test('defer after diagnosis never invents power, and crews can end responsibly',()=>{
 const job=new NetworkJob(2),crew=new CrewMission();
 job.inspect('junction');
 crew.diagnose('terminal');
 assert.equal(job.defer(),true);
 assert.equal(crew.finishJob(false),true);
 assert.equal(job.network.mastOnline,false);
 assert.equal(tickCrew(crew,{atHome:true}),'finished');
});
