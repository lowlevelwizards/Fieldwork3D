import test from 'node:test';
import assert from 'node:assert/strict';
import {assessUnitContracts} from '../src/worldgen/unit-contracts.ts';
import {generateSite} from '../src/breach-site.ts';

test('a named residence is incomplete when its required facilities are missing',()=>{
 const rooms=['living','bedroom','kitchen','bathroom'].map((purpose,i)=>
  ({id:'r'+i,unitId:'A',kind:'room',purpose,x:115*i,y:0,w:115,h:105}));
 const doors=[
  {id:'FRONT',a:{x:30,y:105},b:{x:78,y:105}},
  {id:'BATH',a:{x:345,y:30},b:{x:345,y:78}}
 ];
 const base={rooms,cover:[],doors,units:[{id:'A',kind:'apartment',roomIds:rooms.map(r=>r.id)}]};
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

test('dwelling labels do not imply a private entrance or usable bathroom door',()=>{
 const rooms=[
  {id:'G',unitId:'M',kind:'room',purpose:'guest',x:0,y:0,w:150,h:130},
  {id:'B',unitId:'M',kind:'room',purpose:'bathroom',x:150,y:0,w:100,h:130},
  {id:'H',kind:'hall',purpose:'hallway',x:0,y:130,w:150,h:65}
 ];
 const base={rooms,doors:[],cover:[],units:[{id:'M',kind:'motel',roomIds:['G','B']}]};
 const absent=assessUnitContracts(base)[0];
 assert.equal(absent.missingEntry,true);
 assert.equal(absent.missingBathAccess,true);
 assert.equal(absent.structuralComplete,false);
 const entrance={id:'GUEST-ENTRY',a:{x:45,y:130},b:{x:93,y:130}};
 const bathDoor={id:'BATH',a:{x:150,y:35},b:{x:150,y:83}};
 const fixed=assessUnitContracts({...base,doors:[entrance,bathDoor]})[0];
 assert.equal(fixed.missingEntry,false);
 assert.equal(fixed.missingBathAccess,false);
 assert.equal(fixed.structuralComplete,true);
 assert.equal(fixed.complete,false,'fixtures are still physically missing');
});
test('a doorway directly into another private unit never counts as shared entry',()=>{
 const rooms=[
  {id:'A',unitId:'A',kind:'room',purpose:'living',x:0,y:0,w:100,h:100},
  {id:'B',unitId:'B',kind:'room',purpose:'living',x:100,y:0,w:100,h:100}
 ];
 const door={id:'BAD',a:{x:100,y:20},b:{x:100,y:68}};
 const units=['A','B'].map(id=>({id,kind:'apartment',roomIds:[id]}));
 const result=assessUnitContracts({rooms,doors:[door],cover:[],units});
 assert.ok(result.every(u=>u.crossUnitDoorIds.includes('BAD')));
 assert.ok(result.every(u=>u.missingEntry));
});
