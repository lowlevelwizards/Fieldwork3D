import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeContactPacing,summarizeContactPacing}
 from '../src/breach-contact-pacing-audit.ts';
const frame=(time,x,enemyX)=>({t:time,actors:[
 {id:'rook',p:{x,y:0},health:4},
 {id:'guard0',p:{x:enemyX,y:0},health:4}]});
test('R8A: long approach versus near-no-contact remain distinct',()=>{
 const distant=analyzeContactPacing([frame(0,0,280),frame(14,55,280)],
  [],['guard0'],1);
 assert.equal(distant.reason,'approach-still-distant');
 const close=analyzeContactPacing([frame(0,0,90),frame(14,50,90)],
  [],['guard0'],1);
 assert.equal(close.reason,'nearby-without-acquisition');
});
test('R8A: genuinely immobile and unplanned missions receive separate labels',()=>{
 assert.equal(analyzeContactPacing([frame(0,0,90),frame(12,8,90)],[],
  ['guard0'],1).reason,'movement-stalled');
 assert.equal(analyzeContactPacing([frame(0,0,90)],[],
  ['guard0'],0).reason,'no-valid-orders');
});
test('R8A: confirmed intel and shots must come from recorded events',()=>{
 const events=[{t:3,kind:'intel',text:'ROOK SPOTTED HOSTILE'},
  {t:4,kind:'shot',text:'GUARD FIRED'}];
 const r=analyzeContactPacing([frame(0,0,100),frame(6,55,100)],
   events,['guard0'],1);
 assert.equal(r.reason,'engaged');
 assert.equal(summarizeContactPacing([r]).confirmed,1);
 assert.equal(analyzeContactPacing([frame(0,0,100)],[],['guard0'],1).firstShotAt,null);
});
