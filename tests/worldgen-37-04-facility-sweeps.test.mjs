import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {specializeBlueprint} from '../src/worldgen/subtype-blueprints.ts';
const cases=[
 ['house','bungalow','dining'],
 ['townhouse','historic-rowhouse','study'],
 ['office','professional-office','meeting'],
 ['garage','fabrication-shop','bay'],
 ['warehouse','bulk-storage','packing'],
 ['utility','pump-station','equipment'],
 ['clinic','specialist-clinic','exam'],
];
const count=(p,role)=>p.cells.flat().filter(x=>x===role).length;
test('real residential, industrial and institutional building subtypes alter programs',()=>{
 for(const [kind,subtype,from] of cases){
  const a=architecturalBlueprint(kind,0),
   b=specializeBlueprint(a,subtype,0);
  assert.deepEqual(blueprintIssues(b),[],kind+' '+subtype);
  assert.equal(count(b,from),count(a,from)-1,kind+' '+subtype);
  assert.match(b.family,new RegExp(subtype));
  assert.deepEqual(b,specializeBlueprint(a,subtype,0));
 }
});
test('critical operational rooms survive different subtype layouts',()=>{
 const required={
  house:['living','kitchen','bedroom'],
  townhouse:['living','bedroom'],
  garage:['bay','workshop'],
  warehouse:['loading','storage'],
  utility:['equipment','control'],
  clinic:['waiting','exam'],
  motel:['guest','reception']
 };
 for(const [kind,subtype] of [...cases.map(([kind,subtype])=>[kind,subtype]),
   ['motel','courtyard-motel']]){
  for(let seed=0;seed<10;seed++){
   const plan=specializeBlueprint(architecturalBlueprint(kind,seed),
     subtype,seed);
   assert.deepEqual(blueprintIssues(plan),[],kind+' '+seed);
   for(const role of required[kind]??[])
    assert.ok(count(plan,role)>0,kind+' '+subtype+' missing '+role);
  }
 }
});
