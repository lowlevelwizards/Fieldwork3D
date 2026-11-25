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

test('W6 commercial, clinical and service fixtures match generated room contracts',()=>{
 for(const [fixtureId,purpose,kind] of [
  ['commercial-range','kitchen','grease'],['dish-station','service','splash'],
  ['utility-sink','service','splash'],['handwash-station','exam','splash'],
  ['sink','half-bath','splash'],['workbench','packing','workgrime'],
  ['packing-station','packing','workgrime']
 ]){
  const source={...fixture(fixtureId,35,24),orientation:0};
  const input={...site,rooms:[{...site.rooms[0],purpose}],cover:[source]};
  const event=planFixtureWallResidue(input,56).get(0)?.get(1)?.[0];
  assert.equal(event?.kind,kind,fixtureId);
  assert.equal(event?.cause,'fixture:'+fixtureId+':'+fixtureId);
  assert.equal(planFixtureWallResidue({...input,cover:[{...source,orientation:2}]},56).size,0,'approach wall');
  assert.equal(planFixtureWallResidue({...input,cover:[{...source,destroyed:true}]},56).size,0);
  assert.equal(planFixtureWallResidue({...input,cover:[{...source,toppled:true}]},56).size,0);
  assert.equal(planFixtureWallResidue({...input,windows:[{id:'v',x:35,y:0,width:40,vertical:false,sillHeight:14,headHeight:45}]},56).size,0,'window overlap');
 }
});
test('W6 prefers the authored rear at a corner, and never spans a segment end',()=>{
 const corner={...site,walls:[...site.walls,{a:{x:0,y:100},b:{x:0,y:0}}],cover:[{...fixture('stove',15,24),orientation:0}]};
 const plan=planFixtureWallResidue(corner,56);
 assert.equal(plan.size,1);assert.ok(plan.has(0));
 const event=plan.get(0).get(1)[0];
 assert.ok(event.x-event.width/2>=0);
 const reversed={...site,walls:[{a:{x:140,y:0},b:{x:0,y:0}}],cover:[{...fixture('stove',35,24),orientation:0}]};
 const reverse=planFixtureWallResidue(reversed,56);
 assert.equal(reverse.get(0).get(-1)[0].x,105);
});
test('W6 story stamps respect thresholds and preserve clean and non-story texture bytes',()=>{
 const plan=planFixtureWallResidue(site,56),plain=planWallFaces(site,0,56),story=planWallFaces(site,0,56,plan);
 for(const level of [0,10,23])assert.deepEqual(atlasWallStrip(story,level,128),atlasWallStrip(plain,level,128));
 for(const effect of ['none','fade','contact','chip','damp','runoff','crack','repair','moss','rust'])
  assert.deepEqual(atlasWallStrip(story,100,128,effect),atlasWallStrip(plain,100,128,effect));
 for(const level of [0,25,50,75,100])assert.ok(selectWallEvents(story.front,level).length<=[0,1,2,3,4][level/25]);
});
