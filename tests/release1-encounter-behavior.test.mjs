import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EncounterBehaviorSurvey} from '../src/breach-encounter-quality.ts';

function fixture(){
 const hostile={id:'red-1',side:'red',p:{x:40,y:40},health:3,alert:'idle',
  blockedTime:0,surrendered:false};
 const civilian={id:'civ-1',p:{x:90,y:90},health:2,state:'routine',
  homeRoomId:'room-1'};
 const s={site:{encounter:{actors:[{roomId:'room-1'}],neutrals:[{}]}},
  operators:[hostile],civilians:[civilian],shots:[],nextShotId:1,
  seconds:0};
 return {s,hostile,civilian};
}
test('survey measures actual transitions, displacement, evidence and idle time',()=>{
 const {s,hostile,civilian}=fixture();
 const survey=new EncounterBehaviorSurvey(s);
 s.seconds=1;survey.sample(s,1);
 assert.equal(survey.finish(s,{injected:false,at:null}).hostiles.idleActorSeconds,1);
 hostile.alert='investigating';
 s.seconds=2;survey.sample(s,1);
 s.seconds=4.2;survey.sample(s,2.2);
 hostile.p={x:50,y:40};hostile.alert='cover';
 civilian.state='fleeing';civilian.p={x:80,y:90};
 s.nextShotId=3;s.seconds=5;survey.sample(s,.8);
 const report=survey.finish(s,{injected:true,at:1.5});
 assert.equal(report.population.activeCivilians,1);
 assert.equal(report.hostiles.investigationsStarted,1);
 assert.equal(report.hostiles.investigationsEnded,1);
 assert.equal(report.hostiles.investigationsWithoutProgress,1);
 assert.equal(report.hostiles.movedActors,1);
 assert.equal(report.civilians.changedStateActors,1);
 assert.equal(report.civilians.movedActors,1);
 assert.equal(report.combat.shots,2);
 assert.deepEqual(report.roomOccupancy,{'room-1':2});
});
test('empty eligible populations remain valid and cannot cause invented outcomes',()=>{
 const {s}=fixture();s.operators=[];s.civilians=[];s.site={encounter:{actors:[],neutrals:[]}};
 const survey=new EncounterBehaviorSurvey(s);
 s.seconds=.1;survey.sample(s,.1);
 const result=survey.finish(s,{injected:false,at:null});
 assert.equal(result.population.activeHostiles,0);
 assert.equal(result.population.activeCivilians,0);
 assert.equal(result.hostiles.investigationsStarted,0);
 assert.equal(result.combat.shots,0);
 const source=readFileSync(new URL('../scripts/audit-mission-quality.mjs',import.meta.url),'utf8');
 assert.match(source,/behavior=process\.argv\.includes\('--behavior'\)/);
 assert.match(source,/if\(behavior\)\{/);
 assert.match(source,/stepSession\(probe,1\/60\);survey\.sample/);
});
