import test from 'node:test';
import assert from 'node:assert/strict';
import {retainImpactMark} from '../src/breach-impact-evidence-buffer.ts';
import {BLOOD_MARK_LIMIT,IMPACT_MARK_LIMIT} from '../src/breach-effects.ts';
const mark=(id,x,surface='blood')=>({id,surface,p:{x,y:80},age:1,height:20});
test('nearby blood impacts refresh existing evidence instead of allocating',()=>{
 const s={impactMarks:[mark(1,10)]};
 retainImpactMark(s,mark(2,15));
 assert.equal(s.impactMarks.length,1);
 assert.equal(s.impactMarks[0].id,1);
 assert.equal(s.impactMarks[0].age,0);
});
test('blood and other impact marks remain bounded throughout long rounds',()=>{
 const s={impactMarks:[]};
 for(let i=0;i<BLOOD_MARK_LIMIT+12;i++)
  retainImpactMark(s,mark(i,i*10));
 assert.ok(s.impactMarks.filter(x=>x.surface==='blood').length<=BLOOD_MARK_LIMIT);
 assert.ok(s.impactMarks.length<=IMPACT_MARK_LIMIT);
 for(let i=0;i<IMPACT_MARK_LIMIT+14;i++)
  retainImpactMark(s,mark(i+100,i*13,'wall'));
 assert.equal(s.impactMarks.length,IMPACT_MARK_LIMIT);
});
