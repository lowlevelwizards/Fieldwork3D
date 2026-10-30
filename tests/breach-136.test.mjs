import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,beginReload,advanceReload}
 from '../src/breach-game.ts';
import {magazineKit,reserveRounds,fullestMagazineIndex,reloadPhase}
 from '../src/breach-magazines.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
const finish=(s,a)=>{for(let i=0;i<280&&a.reload>0;i++)
 advanceReload(s,a,1/60);};
test('136: magazine kit preserves round counts and selects fullest spare',()=>{
 const kit=magazineKit('rook','carbine',29,12);
 assert.deepEqual(kit.map(m=>m.rounds),[12,12,5]);
 assert.equal(reserveRounds(kit),29);
 assert.equal(fullestMagazineIndex(kit,'carbine'),0);
 assert.equal(reloadPhase(.4,'retention'),'remove');
});
test('136: retention reload keeps partial ammunition and original magazine',()=>{
 const s=newSession(),a=team(s)[0];a.magazine=5;
 const total=a.magazine+a.reserve;
 assert.ok(beginReload(s,a));
 assert.equal(a.reloadMode,'retention');
 assert.equal(a.magazine,5,'magazine remains installed until removal');
 advanceReload(s,a,a.reloadDuration*.32);
 assert.equal(a.magazine,0);
 assert.equal(s.dropped.length,0,'retained mag never falls to ground');
 assert.ok(a.spareMagazines.some(m=>m.rounds===5));
 finish(s,a);
 assert.equal(a.reloadMode,null);
 assert.equal(a.magazine,12);
 assert.equal(a.magazine+a.reserve,total);
 assert.equal(reserveRounds(a.spareMagazines),a.reserve);
});
test('136: empty reload drops the empty magazine only at physical detach',()=>{
 const s=newSession(),a=team(s)[0];a.magazine=0;
 assert.ok(beginReload(s,a));
 assert.equal(s.dropped.length,0);
 advanceReload(s,a,a.reloadDuration*.31);
 assert.equal(s.dropped.length,1);
 assert.equal(s.dropped[0].rounds,0);
 finish(s,a);
 assert.equal(a.magazine,12);
 assert.equal(a.reserve,24);
});
test('136: shell-fed weapon loads individual rounds with no box magazine',()=>{
 const s=newSession(0,891237),a=team(s).find(x=>x.weapon==='shotgun');
 assert.ok(a);
 a.magazine=2;
 const total=a.magazine+a.reserve;
 assert.ok(beginReload(s,a));assert.equal(a.reloadMode,'shells');
 advanceReload(s,a,a.reloadDuration*.62);
 assert.ok(a.magazine>2&&a.magazine<6);
 finish(s,a);
 assert.equal(a.magazine,6);
 assert.equal(a.magazine+a.reserve,total);
 assert.equal(s.dropped.length,0);
});
test('136: interrupted reload and replay preserve ownership without duplication',()=>{
 const s=newSession(),a=team(s)[0];a.magazine=3;
 assert.ok(beginReload(s,a));
 advanceReload(s,a,a.reloadDuration*.35);
 const total=a.magazine+a.reserve;
 assert.equal(a.magazine,0);
 const f=snapshot(s);
 a.spareMagazines=[];
 applyReplayFrame(s,f);
 assert.equal(a.magazine+a.reserve,total);
 assert.equal(reserveRounds(a.spareMagazines),a.reserve);
 a.reload=0;a.reloadMode=null;
 assert.equal(a.magazine,0);
});
