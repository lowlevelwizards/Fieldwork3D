import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianPresentationVisible}
 from '../src/breach-civilian-visibility.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const make=()=>createCivilian({id:'civ:film',role:'resident',
 persona:'steady',activity:'idle',position:{x:120,y:80},
 heading:0,roomId:'a',appearanceSeed:6});
test('E5-C6 historical civilian visibility cannot leak future sightings',()=>{
 const c=make();
 assert.equal(civilianPresentationVisible({replayVisible:false},
   true,false,true),false);
 assert.equal(civilianPresentationVisible({replayVisible:true},
   true,false,false),true);
 assert.equal(civilianPresentationVisible({replayVisible:false},
   true,true,false),true);
 assert.equal(civilianPresentationVisible({},
   true,false,false),false);
});
test('E5-C6 original sightings persist through rewind and old films',()=>{
 const s=newSession();s.civilians.push(make());
 const f=snapshot(s);
 assert.equal(typeof f.civilians[0].visibleAtCapture,'boolean');
 f.civilians[0].visibleAtCapture=false;
 applyReplayFrame(s,f);
 assert.equal(s.civilians[0].replayVisible,false);
 assert.equal(civilianPresentationVisible(s.civilians[0],
  true,false,true),false);
 const old=snapshot(s);
 delete old.civilians[0].visibleAtCapture;
 applyReplayFrame(s,old);
 assert.equal(s.civilians[0].replayVisible,undefined);
});
