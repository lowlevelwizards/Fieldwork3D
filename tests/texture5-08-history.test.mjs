import test from 'node:test';
import assert from 'node:assert/strict';
import {planHistoryWear,applySurfaceRepair,generateSurfaceHistory} from '../src/worldgen/surface-history.ts';
const site={seed:42,archetype:'garage',condition:'neglected',conditionLevel:100,
 rooms:[{id:'r',kind:'room',tone:0,purpose:'bay',x:0,y:0,w:200,h:180}],
 cover:[{fixture:'vehicle-lift',x:70,y:80,w:70,h:50}],doors:[],walls:[]};
const history={version:1,siteSeed:42,
 incidents:[{id:'history:incident',roomId:'r',kind:'oil',severity:.9,source:'usage'}],
 repairs:[]};
test('damage events follow actual fixtures and produce coherent spatial clusters',()=>{
 const marks=planHistoryWear(site,history);
 assert.equal(marks.length,3);
 assert.equal(marks[0].x,70);
 assert.equal(marks[0].y,80);
 assert.ok(marks.slice(1).every(m=>Math.abs(m.x-70)<32&&Math.abs(m.y-80)<28));
 assert.deepEqual(marks,planHistoryWear(site,history));
});
test('repairs preserve a mismatched surface while attenuating primary damage',()=>{
 const fixed=applySurfaceRepair(history,{incidentId:'history:incident',quality:1});
 const marks=planHistoryWear(site,fixed);
 assert.equal(marks.length,1);
 assert.equal(marks[0].kind,'fade');
 assert.equal(marks[0].id,'history:incident:repair');
});
test('environmental history is stable and limited',()=>{
 const generated=generateSurfaceHistory(site);
 assert.deepEqual(generated,generateSurfaceHistory(site));
 assert.ok(generated.incidents.length<=10);
});
