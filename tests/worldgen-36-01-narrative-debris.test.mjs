import test from 'node:test';
import assert from 'node:assert/strict';
import {planInteriorFragments,INTERIOR_FRAGMENT_LIMIT} from '../src/worldgen/interior-fragments.ts';
const room={id:'R',kind:'room',purpose:'office',x:0,y:0,w:260,h:240,tone:0};
const scene=(scenarioStyle,conditionLevel)=>({seed:10,scenarioStyle,
 condition:'occupied',conditionLevel,rooms:[room],cover:[],
 doors:[],windows:[{id:'W',x:150,y:0}],spawn:[],enemies:[],
 objective:{x:400,y:400},extract:{x:400,y:430}});
test('routine pristine rooms have no unexplained destroyed belongings',()=>{
 assert.deepEqual(planInteriorFragments(scene('routine',0)),[]);
});
test('disrupted rooms can show readable nonphysical environmental history',()=>{
 const site=scene('disrupted',0),a=planInteriorFragments(site);
 assert.ok(a.length>0,'disrupted office should not look sterile');
 assert.deepEqual(a,planInteriorFragments(site));
 assert.ok(a.every(x=>x.roomId==='R'&&Number.isFinite(x.x)&&Number.isFinite(x.y)));
 assert.ok(a.length<=INTERIOR_FRAGMENT_LIMIT);
 assert.ok(a.some(x=>x.kind==='glass'||x.kind==='paper'));
});
test('functional debris remains aesthetic only, not new cover or world collision',()=>{
 const site=scene('disrupted',83),cover=JSON.stringify(site.cover);
 planInteriorFragments(site);
 assert.equal(JSON.stringify(site.cover),cover);
});
