import test from 'node:test';
import assert from 'node:assert/strict';
import {planFixtureWallResidue} from '../src/worldgen/wall-story-residue.ts';
import {planWallFaces,atlasWallStrip,selectWallEvents,resolveWallSurfaceMode} from '../src/worldgen/wall-surface-recipe.ts';
import {buildWallAtlas} from '../src/rendering/wall-surface-atlas.ts';
const fixture=(fixture,x,y)=>({id:fixture,x,y,w:24,h:24,topHeight:24,fixture});
const site={seed:23,archetype:'restaurant',condition:'occupied',walls:[{a:{x:0,y:0},b:{x:140,y:0}}],rooms:[{id:'k',x:0,y:0,w:140,h:100,purpose:'kitchen',kind:'room'}],cover:[fixture('stove',35,16),fixture('sink',100,16)],doors:[],windows:[]};
test('fixture residue is deterministic, face-local, height-anchored and absent without a source',()=>{
 const plan=planFixtureWallResidue(site,56);
 assert.deepEqual(plan,planFixtureWallResidue(site,56));
 const events=plan.get(0).get(1);
 assert.deepEqual(events.map(e=>e.kind),['grease','splash']);assert.equal(plan.get(0).has(-1),false);
 for(const e of events){assert.ok(e.y+e.height/2<=32);assert.ok(e.x-e.width/2>=0&&e.x+e.width/2<=140);}
 assert.equal(planFixtureWallResidue({...site,cover:[]},56).size,0);
 assert.equal(planFixtureWallResidue({...site,cover:[fixture('stove',35,60)]},56).size,0);
 assert.equal(planFixtureWallResidue({...site,rooms:[{...site.rooms[0],purpose:'office'}]},56).size,0);
 const shop={...site,rooms:[{...site.rooms[0],purpose:'workshop'}],cover:[fixture('workbench',35,16)]};
 assert.equal(planFixtureWallResidue(shop,56).get(0).get(1)[0].kind,'workgrime');
});
test('W6 uses existing condition cap, face strip and texture resources; production remains W3',()=>{
 const plan=planFixtureWallResidue(site,56),plain=planWallFaces(site,0,56),story=planWallFaces(site,0,56,plan);
 assert.deepEqual(story.back,plain.back);
 assert.deepEqual(atlasWallStrip(story,0,128),atlasWallStrip(plain,0,128));
 for(const kind of ['grease','splash'])assert.notDeepEqual(atlasWallStrip(story,100,128,kind),atlasWallStrip(story,100,128,'none'));
 assert.ok(selectWallEvents(story.front,100).length<=4);
 const old=buildWallAtlas(site,56,100,'all',true),next=buildWallAtlas(site,56,100,'all',true,undefined,true);
 assert.equal(old.pages.length,next.pages.length);assert.equal(old.pages[0].image.data.length,next.pages[0].image.data.length);
 assert.notDeepEqual(old.pages[0].image.data,next.pages[0].image.data);
 assert.ok(next.pages[0].image.data.every((v,i)=>i%4!==3||v===255));
 old.pages.forEach(t=>t.dispose());next.pages.forEach(t=>t.dispose());
 assert.deepEqual(resolveWallSurfaceMode(null),{effect:'all',atlas:true});
 assert.deepEqual(resolveWallSurfaceMode('story'),{effect:'all',atlas:true,story:true});
});
