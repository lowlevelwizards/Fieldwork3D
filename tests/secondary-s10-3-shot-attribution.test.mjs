import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {ReplayBallisticsRecorder} from '../src/breach-replay-ballistics.ts';
import {ReplaySoundTimeline} from '../src/breach-replay-audio.ts';
import {inspectRecordedShot} from '../src/breach-replay-shot-inspector.ts';

test('S10.3: replay inspector, soundtrack and caliber derive weapon from the fired Glock shot',()=>{
 const s=newSession(),a=team(s)[0];
 const primary=a.weapon;
 s.shots.push({id:1001,shooterId:a.id,targetId:null,
  start:{x:100,y:120},end:{x:180,y:120},age:0,
  firedAt:4.5,hit:false,side:'blue',
  healthBefore:4,healthAfter:4,down:false,
  secondaryWeapon:'glock-g19x',weapon:'glock-g19x'});
 const recorder=new ReplayBallisticsRecorder();
 recorder.capture(s);
 assert.equal(recorder.shots.length,1);
 const shot=recorder.shots[0];
 assert.equal(shot.secondaryWeaponAtFire,'glock-g19x');
 assert.equal(shot.weaponAtFire,primary,'the primary is still saved separately');
 assert.equal(shot.nominalCaliberAtFire,'9×19 mm');
 assert.equal(shot.suppressedAtFire,false);
 const view=inspectRecordedShot(shot,null,true);
 assert.equal(view.weapon,'glock-g19x');
 const sounds=new ReplaySoundTimeline(recorder.shots,[]);
 assert.equal(sounds.events[0].weapon,'smg','9mm sound bank compatibility only');
 assert.equal(sounds.events[0].secondaryWeapon,'glock-g19x');
 assert.equal(sounds.events[0].suppressed,false);
});
