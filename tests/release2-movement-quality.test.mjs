import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MovementQualitySurvey} from '../src/breach-movement-quality.ts';

test('TM10 metric collector distinguishes attempted routes from idle operators',()=>{
 const a={id:'rook',p:{x:0,y:0},recoveryAttempts:0,
  blockedTime:0,motorPause:null,squeeze:false,orderIssue:null};
 const b={...a,id:'ash',p:{x:100,y:100}};
 const actors=[a,b];
 const survey=new MovementQualitySurvey(actors,new Map([['rook',{x:90,y:0}]]));
 survey.sample(actors,1/60);
 a.blockedTime=.9;a.motorPause='passage';a.squeeze=true;
 a.recoveryAttempts=2;survey.sample(actors,1/60);
 survey.sample(actors,1/60);
 a.p={x:90,y:0};a.blockedTime=0;a.motorPause=null;a.squeeze=false;
 survey.sample(actors,1/60);
 const report=survey.finish(actors);
 assert.equal(report.plansAccepted,1);
 assert.equal(report.arrivals,1);
 assert.equal(report.stallEpisodes,1);
 assert.equal(report.retries,2);
 assert.ok(report.passageWaitSeconds>0);
 assert.ok(report.squeezeSeconds>0);
 assert.equal(report.incomplete,0);
 assert.equal(report.details.find(d=>d.actor==='ash').planned,false);
});
test('TM10 seeded command uses actual physical simulation and returns valid observations',()=>{
 const result=spawnSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-movement-quality.mjs','1','65'
 ],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',
   timeout:120000,maxBuffer:5*1024*1024});
 assert.equal(result.signal,null,result.stderr);
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.count,1);
 assert.equal(report.rows.length,1);
 assert.equal(report.rows[0].details.length,4);
 assert.equal(report.summary.invalidPositions,0);
 assert.ok(report.summary.plansAccepted>=0);
});
