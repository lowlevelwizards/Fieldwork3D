import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,personDetected,isDetected,isSeen,
 inSight,geometricallyVisible} from '../src/breach-game.ts';
import {stage1ContactSite} from './fixtures/breach-stage1-contract-runner.mjs';
import {presentActor} from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {scanEnemyVisualEvidence} from '../src/breach-ai-visual-evidence.ts';

test('V2 real session shows unidentified person without granting target ID',()=>{
 const s=newSession(0,undefined,'true-blind','small','hold',
  stage1ContactSite());
 const friendly=team(s)[0],hostile=enemies(s)[0];
 friendly.heading=Math.atan2(hostile.p.y-friendly.p.y,
   hostile.p.x-friendly.p.x);
 hostile.heading=Math.atan2(friendly.p.y-hostile.p.y,
   friendly.p.x-hostile.p.x);
 assert.ok(geometricallyVisible(friendly,hostile,s),
  'known fixture has an actual unobstructed forward sightline');
 friendly.awareness.visualProgress[hostile.id]=.20;
 assert.ok(personDetected(friendly,hostile,s));
 assert.ok(isDetected(s,hostile));
 assert.ok(presentActor(s,hostile,false,null),
  'live renderer may show a physically sighted unidentified silhouette');
 assert.equal(inSight(friendly,hostile,s),false);
 assert.equal(isSeen(s,hostile),false,
  'the same silhouette cannot grant acquired enemy intelligence');
 friendly.heading+=Math.PI;
 assert.equal(personDetected(friendly,hostile,s),false,
  'a stored progress value cannot reveal a shape through the rear cone');
});

test('V2 enemy sees a silhouette without fabricating confirmed contact',()=>{
 const s=newSession(0,undefined,'true-blind','small','hold',
  stage1ContactSite());
 const guard=enemies(s)[0],friendly=team(s)[0];
 guard.heading=Math.atan2(friendly.p.y-guard.p.y,
   friendly.p.x-guard.p.x);
 guard.awareness.visualProgress[friendly.id]=.25;
 const confirmed=scanEnemyVisualEvidence(s,guard,1/60,inSight);
 assert.deepEqual(confirmed,[]);
 assert.equal(guard.lastVisualSuspicionId,'silhouette/'+friendly.id);
 assert.equal(guard.suspicion.stage,'curious');
 assert.equal(guard.suspicion.pressure<.3,true,
  'an unknown silhouette cannot trigger confirmed target-level alert');
});
