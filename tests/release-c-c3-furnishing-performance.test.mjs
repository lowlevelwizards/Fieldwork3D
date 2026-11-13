import test from 'node:test';
import assert from 'node:assert/strict';
import {createTacticalFurnishingEvaluator}
 from '../src/worldgen/tactical-furnishing-evaluator.ts';
import {ballisticFurnishingValue} from '../src/worldgen/room-ballistic-furnishing.ts';
import {retainsTacticalSightline,tacticalFurnishingValue}
 from '../src/worldgen/room-sightline-audit.ts';
const room={id:'r',x:0,y:0,w:170,h:155,kind:'room',purpose:'office'};
const base={rooms:[room],walls:[],doors:[{id:'D',a:{x:0,y:52},b:{x:0,y:100}}],
 openings:[],cover:[{x:125,y:125,w:25,h:20,fixture:'bookcase'}]};
test('C3: cached baseline evaluator matches the original legal 2.5D scoring',()=>{
 const score=createTacticalFurnishingEvaluator(base,room);
 for(const candidate of [
  {x:70,y:76,w:52,h:24,fixture:'desk'},
  {x:90,y:96,w:65,h:31,fixture:'counter'},
  {x:95,y:65,w:54,h:25,fixture:'sofa'},
  {x:72,y:78,w:40,h:18,low:true,fixture:'desk'}]){
  const expected=retainsTacticalSightline(base,room,candidate,[])?(()=>{
   const b=ballisticFurnishingValue(base,room,candidate,[]);
   const sight=tacticalFurnishingValue(base,room,candidate,[]);
   return b===-Infinity||sight===-Infinity?-Infinity:b+sight;
  })():-Infinity;
  assert.equal(score(candidate),expected,
    'baseline reuse preserves existing functional and ballistic behavior');
 }
});
test('C3: repeated evaluator calls are pure, and never create props',()=>{
 const original=structuredClone(base);
 const evalCandidate=createTacticalFurnishingEvaluator(base,room);
 const candidate={x:70,y:76,w:52,h:24,fixture:'desk'};
 assert.equal(evalCandidate(candidate),evalCandidate(candidate));
 assert.deepEqual(base,original);
});
