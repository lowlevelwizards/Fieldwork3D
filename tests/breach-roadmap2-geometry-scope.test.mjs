import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,activeSite,withTemporarySiteGeometry,
 WALLS,COVER,activeGeometryRevision} from '../src/breach-core.ts';
import {auditSite} from '../src/breach-site-audit.ts';
import {generateSite} from '../src/breach-site.ts';

const sample={walls:[{a:{x:22,y:25},b:{x:82,y:25}}],
 cover:[{x:40,y:60,w:20,h:20,low:false}],doors:[]};
test('temporary geometry scope restores displaced live cover, active site and wall identity',()=>{
 activateSite(sample);
 try{
  const savedSite=activeSite();
  COVER.splice(0,1,{...COVER[0],x:54});
  const beforeCover=[...COVER],beforeWalls=[...WALLS];
  const revision=activeGeometryRevision();
  const other={walls:[],cover:[{x:200,y:200,w:8,h:8,low:true}],doors:[]};
  const output=withTemporarySiteGeometry(other,()=>{
   assert.equal(activeSite(),other);
   assert.equal(WALLS.length,0);
   COVER.push({x:210,y:210,w:4,h:4,low:true});
   return 42;
  });
  assert.equal(output,42);
  assert.equal(activeSite(),savedSite);
  assert.deepEqual(COVER,beforeCover);
  assert.deepEqual(WALLS,beforeWalls);
  assert.ok(activeGeometryRevision()>revision);
 }finally{activateSite(null);}
});
test('nested/throwing temporary scopes unwind without leaking scene geometry',()=>{
 activateSite(sample);
 try{
  const first={walls:[],cover:[],doors:[]};
  const second={walls:[{a:{x:3,y:2},b:{x:3,y:8}}],cover:[],doors:[]};
  assert.throws(()=>withTemporarySiteGeometry(first,()=>{
   withTemporarySiteGeometry(second,()=>assert.equal(activeSite(),second));
   assert.equal(activeSite(),first);
   throw Error('audit failed');
  }),/audit failed/);
  assert.equal(activeSite(),sample);
  assert.equal(COVER.length,1);
 }finally{activateSite(null);}
});
test('integrated site audit restores the active live mission instead of resetting to training',()=>{
 const live=generateSite(7,'small'),audited=generateSite(19,'small');
 activateSite(live);
 try{
  const oldWalls=[...WALLS];
  const displaced={...COVER[0],x:COVER[0].x+7};
  COVER.splice(0,1,displaced);
  const saved=[...COVER];
  const result=auditSite(audited);
  assert.equal(result.seed,audited.seed);
  assert.equal(activeSite(),live);
  assert.deepEqual(WALLS,oldWalls);
  assert.deepEqual(COVER,saved);
 }finally{activateSite(null);}
});
