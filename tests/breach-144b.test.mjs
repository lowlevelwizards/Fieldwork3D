import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../src/',import.meta.url);
test('144B: 2D blood is painted beneath architecture and visibility fog',()=>{
  const main=readFileSync(new URL('breach-main.ts',root),'utf8');
  const render=main.slice(main.indexOf('function render(){'),
    main.indexOf('function useSelectedGround('));
  assert.match(render,/furniture\(\);renderGroundMarks\(\);architecture\(\);fog\(\)/);
  const contacts=main.slice(main.indexOf('function contacts(){'),
    main.indexOf('function renderGroundMarks(){'));
  assert.doesNotMatch(contacts,/for\(const mark of state\.impactMarks\)/);
});
test('144B: 3D blood lies on floor, below fog and opaque wall geometry',()=>{
  const scene=readFileSync(new URL('breach-3d.ts',root),'utf8');
  assert.match(scene,/mark\.surface==='blood'\?\.85/);
  assert.match(scene,/this\.smoothFog\.position\.set\(W\/2,1\.05,H\/2\)/);
  assert.match(scene,/this\.smoothFog\.renderOrder=1000/);
  assert.match(scene,/map:this\\.fogTexture,transparent:true,depthTest:true/);
});