import test from 'node:test';
import assert from 'node:assert/strict';
import {assessUnitContracts} from '../src/worldgen/unit-contracts.ts';
import {generateSite} from '../src/breach-site.ts';

test('a named residence is incomplete when its required facilities are missing',()=>{
 const rooms=['living','bedroom','kitchen','bathroom'].map((purpose,i)=>
  ({id:'r'+i,unitId:'A',kind:'room',purpose,x:120*i,y:0,w:115,h:105}));
 const base={rooms,cover:[],doors:[],units:[{id:'A',kind:'apartment',roomIds:rooms.map(r=>r.id)}]};
 const report=assessUnitContracts(base)[0];
 assert.equal(report.structuralComplete,true);
 assert.equal(report.complete,false);
 assert.ok(report.incompleteRooms.length>0);
 const incomplete=assessUnitContracts({...base,rooms:rooms.filter(r=>r.purpose!=='bathroom')})[0];
 assert.deepEqual(incomplete.missingRoles,['bathroom']);
});
test('generated apartments and motel suites are independently audited',()=>{
 for(const [seed,scale,minimum] of [[2,'medium',2],[2,'large',4],[8,'standard',4],[19,'expanded',4]]){
  const site=generateSite(seed,scale);
  const reports=assessUnitContracts(site);
  assert.ok(reports.length>=minimum,seed+' '+scale);
  assert.ok(reports.every(r=>r.structuralComplete),
   JSON.stringify(reports.filter(r=>!r.structuralComplete)));
  assert.deepEqual(reports,assessUnitContracts(generateSite(seed,scale)));
 }
});
