import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filesFor,testFiles,affectedFeatures,featureFor,featureNames,root} from '../../scripts/verification/suites.mjs';
import {assessResults} from '../../scripts/verification/baseline.mjs';
import {assertIdentityEqual} from '../helpers/identity.mjs';
import {failureSignature} from '../../scripts/verification/reporter.mjs';

test('core membership is explicit, unique and references existing tests',()=>{
  const core=filesFor('core');
  assert.equal(new Set(core).size,core.length);
  assert.ok(core.length>=10);
  for(const file of core)assert.ok(testFiles().includes(file),file);
});
test('every maintained Node test belongs to exactly one feature',()=>{
  for(const file of testFiles()) assert.ok(featureNames.includes(featureFor(file)),file);
  const selected=featureNames.flatMap(name=>filesFor('feature',[name]));
  assert.deepEqual(selected.toSorted(),testFiles());
});
test('foundation, unknown and dependency changes receive broad coverage',()=>{
  for(const file of ['src/breach-core.ts','src/breach-game.ts','package-lock.json','src/new-system.ts'])
    assert.deepEqual(affectedFeatures([file]).toSorted(),featureNames.toSorted());
  assert.deepEqual(affectedFeatures(['README.md']),[]);
  assert.ok(affectedFeatures(['src/equipment-loadouts.ts']).includes('campaign'));
  assert.ok(affectedFeatures(['src/breach-replay.ts']).includes('replay'));
});
const file='tests/example.test.mjs',name='existing failure';
const entry={file,id:`${file} :: ${name}`,signature:'ERR_ASSERTION: broken',category:'unresolved',
  reason:'An investigated existing assertion',owner:'maintainer',nextAction:'Repair and remove entry',expires:'2099-01-01'};
const baseline={failures:[entry]};
const failure={file,name,type:'test:fail',signature:entry.signature,testType:'test'};
test('baseline permits only the exact observed existing failure',()=>{
  assert.equal(assessResults([failure],baseline,[file]).errors.length,0);
  assert.match(assessResults([{...failure,name:'new defect'}],baseline,[file]).errors.join('\n'),/NEW FAILURE/);
  assert.match(assessResults([{...failure,signature:'ERROR: another cause'}],baseline,[file]).errors.join('\n'),/CHANGED FAILURE/);
});
test('baseline catches resolved, removed, expired and skipped cases',()=>{
  assert.match(assessResults([{...failure,type:'test:pass'}],baseline,[file]).errors.join('\n'),/RESOLVED/);
  assert.match(assessResults([],baseline,[file]).errors.join('\n'),/Missing\/renamed/);
  assert.match(assessResults([failure],baseline,[file],new Date('2100-01-01')).errors.join('\n'),/Expired/);
  assert.match(assessResults([{...failure,skip:true}],baseline,[file]).errors.join('\n'),/Skipped/);
});
test('failure signatures preserve the assertion cause',()=>{
  assert.equal(failureSignature({code:'ERR_TEST_FAILURE',cause:{code:'ERR_ASSERTION',message:'Specific mismatch\nadditional detail'}}),
    'ERR_ASSERTION: Specific mismatch');
});
test('lockfile, package manager and runtime declarations agree',()=>{
  const read=p=>readFileSync(`${root}/${p}`,'utf8');
  const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
  assert.equal(pkg.engines.node,read('.node-version').trim());
  assert.equal(pkg.packageManager,`npm@${pkg.engines.npm}`);
  assert.deepEqual(lock.packages[''].devDependencies,pkg.devDependencies);
  assert.match(read('.npmrc'),/engine-strict=true/);
});

test('bounded scene assertions still require strict reference identity',()=>{
 const a={};a.self=a;
 assertIdentityEqual(a,a);
 assert.throws(()=>assertIdentityEqual(a,{self:a}),/Object identity mismatch/);
 assert.throws(()=>assertIdentityEqual(1,2));
});
