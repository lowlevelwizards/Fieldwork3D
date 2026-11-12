import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,liveVisibility} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {presentDecor,presentArchitecturalOpening} from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {shotVisibility,architecturalOpeningKnown} from '../src/breach-presentation.ts';
import {PresentationSightMemo} from '../src/rendering/breach-presentation-sight-memo.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('P1.2 unknown and remembered decor exactly match the original',()=>{
 const s=newSession(0,23,'true-blind');
 try{
  const memo=new PresentationSightMemo(),p={x:150,y:190};
  const detail={position:p,microKey:'micro:unused',fineKey:'fine:unused'};
  memo.begin(s);
  const original=presentDecor(s,detail,false,false,null);
  assert.equal(presentDecor(s,detail,false,false,null,
   p=>memo.query(s,'decor','item',p)),original);
  assert.equal(memo.stats().queries,1);
  s.seenGround.add(detail.microKey);
  assert.equal(presentDecor(s,detail,false,false,null,
   p=>memo.query(s,'decor','item',p)),true);
  assert.equal(memo.stats().queries,1,'remembered ground skips new LOS');
  assert.equal(presentDecor(s,detail,false,true,new Set()),false,
   'personal replay ignores current live sight');
 }finally{activateSite(null);}
});
test('P1.2 openings and shots retain their original LOS decisions',()=>{
 const s=newSession(0,24,'true-blind');
 try{
  const memo=new PresentationSightMemo(),opening=s.site?.openings?.[0];
  memo.begin(s);
  if(opening){
   const original=architecturalOpeningKnown(s,opening);
   const actual=presentArchitecturalOpening(s,opening,false,null,null,
    p=>memo.query(s,'opening','a',p));
   assert.equal(actual,original);
  }
  const shot={id:15,side:'red',start:{x:125,y:160},end:{x:155,y:178}};
  assert.deepEqual(shotVisibility(s,shot),
   shotVisibility(s,shot,p=>memo.query(s,'effect',shot.id,p)));
  assert.equal(memo.query(s,'effect','explicit',{x:125,y:160}),
   liveVisibility(s,{x:125,y:160}));
 }finally{activateSite(null);}
});
test('P1.2 scene keeps personal replay bypass and full source fallback',()=>{
 const s=source('src/breach-3d.ts');
 assert.match(s,/presentationSight\.begin\(s,allowPresentationSightReuse\(/);
 assert.match(s,/!!replay\|\|!!replayDisclosurePolicy/);
 assert.match(s,/presentationSight\.reset\(\)/);
 assert.match(s,/presentationSight\.query\(s,'decor',i,p\)/);
 assert.match(s,/presentationSight\.query\(s,'opening',i,p\)/);
 assert.match(s,/s,'door',door\.id,doorCenter\(door\)/);
 assert.match(s,/s,'impact',markIndex,mark\.p/);
 assert.match(s,/presentationSightPolicy=presentationSightPolicy\(/);
});
