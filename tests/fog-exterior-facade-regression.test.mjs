import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accessibleExteriorWall,exteriorBriefedAt} from '../src/breach-site-footprint.ts';
import {spatialSurfaceKnown} from '../src/breach-presentation.ts';

const room=(id,x,y,w,h)=>({id,x,y,w,h,kind:'room',tone:0});
const outer={a:{x:100,y:100},b:{x:100,y:230}};
const internal={a:{x:220,y:100},b:{x:220,y:230}};
const site={seed:42,bounds:{minX:0,minY:0,maxX:500,maxY:500},
 rooms:[room('A',100,100,120,130),room('B',220,100,120,130)],
 walls:[outer,internal],
 doors:[],cover:[]};

test('only publicly reachable exterior wall segments qualify as façades',()=>{
 assert.equal(accessibleExteriorWall(site,outer),true);
 assert.equal(accessibleExteriorWall(site,internal),false,
  'a partition with a room on both sides can never be drawn over unknown fog');
 assert.equal(exteriorBriefedAt(site,{x:80,y:160}),true);
 assert.equal(exteriorBriefedAt(site,{x:180,y:160}),false);
});
test('exterior-known briefing does not magically disclose an interior partition',()=>{
 const fake={intel:{mode:'exterior-known',walls:new Set([0]),doors:new Set(),
   rooms:new Set(),cover:new Set()}};
 assert.equal(spatialSurfaceKnown(fake,'wall',0),true);
 assert.equal(spatialSurfaceKnown(fake,'wall',1),false);
});
test('exterior window locations must be physically on reachable perimeter',()=>{
 const exteriorWindow={a:{x:100,y:140},b:{x:100,y:175}};
 const internalWindow={a:{x:220,y:140},b:{x:220,y:175}};
 assert.equal(accessibleExteriorWall(site,exteriorWindow),true);
 assert.equal(accessibleExteriorWall(site,internalWindow),false);
});
test('3D retains qualified façades while the ground fog respects scene depth',()=>{
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(scene,/import \{exteriorBriefedAt,accessibleExteriorWall\}/);
 assert.match(scene,/const exterior=accessibleExteriorWall\(site,wall\)/);
 assert.match(scene,/wall\.exterior&&!omniscient&&!bodycamAudition&&[\s\S]*?spatialSurfaceKnown\(s,'wall',wall\.index\)/);
 assert.match(scene,/const surfaceTransparent=translucent\|\|knownFacade/);
 assert.match(scene,/material\.transparent=surfaceTransparent/);
 assert.match(scene,/wall\.mesh\.renderOrder=surfaceTransparent\?1001:0/);
 const openings=readFileSync(new URL('../src/rendering/breach-site-openings-builder.ts',import.meta.url),'utf8');
 assert.match(openings,/host\.promoteFacadeDetails\(frame\);[\s\S]*?host\.promoteFacadeDetails\(leaf\);/);
 assert.match(openings,/publicWindow=!opening\.interior&&accessibleExteriorWall\(site,edge\)/);
 assert.match(openings,/if\(publicWindow\)\{[\s\S]*?host\.promoteFacadeDetails\(group\)/);
 assert.match(scene,/node\.renderOrder=1002/);
 assert.match(scene,/this\.siteMaterials\.track\(original\.clone\(\)\)/);
 assert.match(scene,/map:this\.fogTexture,transparent:true,depthTest:true,opacity:1/);
});
