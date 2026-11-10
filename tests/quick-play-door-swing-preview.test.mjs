import test from 'node:test';
import assert from 'node:assert/strict';
import {previewKnownDoorSwing} from '../src/breach-door-swing-preview.ts';

const door={id:'KNOWN',a:{x:0,y:0},b:{x:60,y:0},
 open:false,openedAt:0,hinge:'a',swing:1,openFraction:0};

test('normal hinge preview is neutral and reaches full leaf angle',()=>{
 const clear=previewKnownDoorSwing(door,[]);
 assert.deepEqual(clear,{tone:'clear',reachable:1,contact:null});
 assert.equal(previewKnownDoorSwing(door,[{x:200,y:200}]).tone,'clear');
});

test('known body in the opening swing limits the ghost door',()=>{
 const blocked=previewKnownDoorSwing(door,[{x:50,y:-8}]);
 assert.equal(blocked.tone,'blocked');
 assert.ok(blocked.reachable<.46);
 assert.ok(blocked.contact!==null);
});

test('a person near the opposite side is warning-only, not a fake collision',()=>{
 const near=previewKnownDoorSwing(door,[{x:50,y:12}]);
 assert.equal(near.tone,'near');
 assert.equal(near.reachable,1);
});

test('sliding and shutter leaves have no fabricated hinge sweep',()=>{
 for(const kind of ['sliding','shutter'])
  assert.equal(previewKnownDoorSwing({...door,kind},[{x:50,y:-8}]).tone,'clear');
});

test('preview caller must pass only disclosed actors, not mission truth',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/breach-2d-world-renderer.ts',import.meta.url),'utf8');
 assert.match(source,/a\.side==='blue'\|\|isSeen\(state,a\)/);
 assert.match(source,/civilianPresentationVisible\(c,false,false,liveVisibility\(state,c\.p\)\)/);
 assert.match(source,/!replaying&&state\.phase==='planning'/);
 assert.doesNotMatch(source,/doorSwingBlocked\(door/);
});
