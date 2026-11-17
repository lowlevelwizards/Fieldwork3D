import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {setWallMaterialPassFlags}
 from '../src/rendering/breach-cutaway-depth-policy.ts';

test('E6.19 known facade fade preserves transparent pass but releases depth writing',()=>{
 const m=new THREE.MeshStandardMaterial({transparent:false,depthWrite:true,opacity:1});
 setWallMaterialPassFlags(m,true,true);
 assert.equal(m.transparent,true);
 assert.equal(m.depthWrite,true);
 const version=m.version;
 m.opacity=.38;
 setWallMaterialPassFlags(m,true,false);
 assert.equal(m.transparent,true);
 assert.equal(m.depthWrite,false);
 assert.equal(m.version,version,'depth-only change needs no shader rebuild');
 m.opacity=1;
 setWallMaterialPassFlags(m,true,true);
 assert.equal(m.depthWrite,true);
 assert.equal(m.version,version);
 m.dispose();
});
test('E6.19 interior cutaway transition and no-op draw frames',()=>{
 const m=new THREE.MeshStandardMaterial();
 setWallMaterialPassFlags(m,true,false);
 assert.equal(m.transparent,true);
 assert.equal(m.depthWrite,false);
 setWallMaterialPassFlags(m,false,true);
 assert.equal(m.transparent,false);
 assert.equal(m.depthWrite,true);
 const v=m.version;
 for(let i=0;i<6;i++)setWallMaterialPassFlags(m,false,true);
 assert.equal(m.version,v);
 m.dispose();
});
test('E6.19 keeps actual cutaway, fog ownership and façade order',()=>{
 const src=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(src,/const surfaceTransparent=translucent\|\|knownFacade/);
 assert.match(src,/setWallMaterialPassFlags\(material,surfaceTransparent,!translucent\)/);
 assert.match(src,/wall\.mesh\.renderOrder=surfaceTransparent\?1001:0/);
 assert.match(src,/spatialSurfaceKnown\(s,'wall',wall.index\)/);
 assert.match(src,/const patina=wall\.mesh\.userData\.patinaMaterial/);
});
