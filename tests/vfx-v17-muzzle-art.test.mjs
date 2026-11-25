import test from 'node:test';
import assert from 'node:assert/strict';
import {createMuzzleFlashGeometry,muzzleFlashAspect} from '../src/rendering/breach-muzzle-flash-art.ts';
test('V17 faceted muzzle flash uses one small colored mesh and no material groups',()=>{
 const g=createMuzzleFlashGeometry();
 const p=g.getAttribute('position'),c=g.getAttribute('color');
 assert.equal(p.count,72);assert.equal(c.count,p.count);assert.equal(g.groups.length,0);
 g.computeBoundingBox();
 assert.deepEqual(g.boundingBox.min.toArray(),[-3.5,-3.5,-3.5]);
 assert.deepEqual(g.boundingBox.max.toArray(),[3.5,3.5,3.5]);
 assert.ok(c.getX(2)>=c.getX(0)&&c.getY(2)>c.getY(0)&&c.getZ(2)>c.getZ(0));
 assert.ok(muzzleFlashAspect('rifle',false,null).x>muzzleFlashAspect('carbine',false,null).x);
 assert.ok(muzzleFlashAspect('shotgun',false,null).y>muzzleFlashAspect('smg',false,null).y);
 const pistol=muzzleFlashAspect('smg',true,null);
 assert.equal(pistol.x,pistol.y);assert.equal(pistol.y,pistol.z);
 assert.ok(muzzleFlashAspect('rifle',false,'muzzle-suppressor').y<muzzleFlashAspect('rifle',false,null).y);
 g.dispose();
});
