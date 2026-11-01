import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {conditionWallPixels} from '../src/worldgen/condition-wall.ts';
test('wall aging is seeded, continuous and visible at heavy neglect',()=>{
 const site=generateSite(126),fresh=conditionWallPixels(site,0,0);
 const ruined=conditionWallPixels(site,0,100);
 assert.deepEqual(fresh,conditionWallPixels(site,0,0));
 assert.deepEqual(ruined,conditionWallPixels(site,0,100));
 const alpha=p=>Array.from(p).filter((_,i)=>i%4===3);
 assert.ok(alpha(ruined).filter(x=>x>65).length>400);
 assert.equal(Math.max(...alpha(fresh)),0);
 assert.ok(new Set(alpha(ruined)).size>10);
});
