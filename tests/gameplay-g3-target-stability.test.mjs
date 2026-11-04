import test from 'node:test';
import assert from 'node:assert/strict';
import {selectFireableContact}
 from '../src/breach-target-selection.ts';
const origin={x:0,y:0};
const targets=[{id:'close',p:{x:15,y:0}},
 {id:'tracked',p:{x:40,y:0}}];
test('when both confirmed contacts lack a safe shot, retain visible target lock',()=>{
 const result=selectFireableContact(origin,targets,'tracked',()=>false);
 assert.equal(result?.id,'tracked');
});
test('a safe firing lane takes precedence over blocked current lock',()=>{
 const result=selectFireableContact(origin,targets,'tracked',x=>x.id==='close');
 assert.equal(result?.id,'close');
});
test('existing safe target remains stable even when another is closer',()=>{
 const result=selectFireableContact(origin,targets,'tracked',()=>true);
 assert.equal(result?.id,'tracked');
});
test('missing previous target falls back to nearest confirmed visible contact',()=>{
 const result=selectFireableContact(origin,targets,'gone',()=>false);
 assert.equal(result?.id,'close');
});
test('one visible contact can be tracked even if fire is physically blocked',()=>{
 const result=selectFireableContact(origin,[targets[0]],null,()=>false);
 assert.equal(result?.id,'close');
});
test('nothing acquired without a confirmed visible contact',()=>{
 assert.equal(selectFireableContact(origin,[],null,()=>true),null);
});
