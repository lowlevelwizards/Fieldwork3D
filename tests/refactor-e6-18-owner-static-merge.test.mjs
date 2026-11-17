import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {consolidateOwnedStaticSiteDetails} from
 '../src/rendering/breach-owner-static-merge.ts';
import {readFileSync} from 'node:fs';

function ownersFixture(){
 const root=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial({color:0x888888});
 const trans=new THREE.MeshBasicMaterial({transparent:true,opacity:.35});
 const owner=new THREE.Group();
 owner.position.set(30,0,40);owner.rotation.y=Math.PI/3;
 root.add(owner);
 const parts=[];
 for(const [x,z] of [[1,2],[7,2],[11,-4]]){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,3,5),mat);
  mesh.position.set(x,4,z);mesh.castShadow=true;mesh.receiveShadow=true;
  owner.add(mesh);parts.push(mesh);
 }
 const stencil=new THREE.Mesh(new THREE.PlaneGeometry(5,2),trans);
 owner.add(stencil);
 return {root,owner,parts,stencil,mat,trans};
}
const bbox=(root)=>{
 root.updateWorldMatrix(true,true);
 const box=new THREE.Box3();
 root.traverse(obj=>{
  if(obj instanceof THREE.Mesh&&obj.visible&&obj.material instanceof THREE.MeshStandardMaterial){
   const g=obj.geometry.clone().applyMatrix4(obj.matrixWorld);
   g.computeBoundingBox();box.union(g.boundingBox);g.dispose();
  }
 });
 return box;
};
test('E6.18 merges rigid details within owner while preserving world geometry and room visibility',()=>{
 const v=ownersFixture(),before=bbox(v.root);
 const result=consolidateOwnedStaticSiteDetails([{obj:v.owner}],new Map());
 assert.deepEqual(result,{ownerGroups:1,sourceMeshes:3,mergedMeshes:1,avoidedDraws:2});
 assert.equal(v.owner.children.length,2);
 assert.ok(v.owner.children.includes(v.stencil));
 const merged=v.owner.children.find(x=>x instanceof THREE.Mesh&&x!==v.stencil);
 assert.equal(merged.material,v.mat);
 assert.equal(merged.castShadow,true);
 const after=bbox(v.root);
 assert.ok(before.min.distanceTo(after.min)<.00001);
 assert.ok(before.max.distanceTo(after.max)<.00001);
 v.owner.visible=false;
 assert.equal(merged.parent.visible,false);
 v.root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
 v.mat.dispose();v.trans.dispose();
});
test('E6.18 excludes interaction threshold, wedge and translucent door geometry',()=>{
 const frame=new THREE.Group(),root=new THREE.Group();root.add(frame);
 const mat=new THREE.MeshStandardMaterial(),glass=new THREE.MeshStandardMaterial({transparent:true,opacity:.4});
 const make=(m,x)=>{const obj=new THREE.Mesh(new THREE.BoxGeometry(2,3,4),m);
  obj.position.x=x;frame.add(obj);return obj;};
 const a=make(mat,0),b=make(mat,8),threshold=make(mat,16),wedge=make(mat,18);
 const pane=make(glass,20);
 const door={frame,threshold,wedge};
 const result=consolidateOwnedStaticSiteDetails([],new Map([['one',door]]));
 assert.equal(result.avoidedDraws,1);
 assert.equal(frame.children.length,4);
 assert.ok(frame.children.includes(threshold));assert.ok(frame.children.includes(wedge));
 assert.ok(frame.children.includes(pane));
 assert.ok(!frame.children.includes(a));assert.ok(!frame.children.includes(b));
 // Excluded objects retain their exact references for tactical interactions.
 assert.equal(door.threshold,threshold);
 assert.equal(door.wedge,wedge);
 root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
 mat.dispose();glass.dispose();
});
test('E6.18 keeps distinct materials, transform groups, metadata and alpha separate',()=>{
 const group=new THREE.Group(),m=new THREE.MeshStandardMaterial(),other=m.clone();
 const left=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),m);
 const right=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),other);
 const meta=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),m);
 meta.userData.interactive=true;
 const nested=new THREE.Group(),child=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),m);
 nested.add(child);group.add(left,right,meta,nested);
 const out=consolidateOwnedStaticSiteDetails([{obj:group}],new Map());
 assert.equal(out.avoidedDraws,0);
 assert.equal(group.children.length,4);
 group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
 m.dispose();other.dispose();
});
test('E6.18 only executes after preexisting site cross-owner instancing',()=>{
 const source=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
 const flush=source.indexOf('host.staticBatches.flush(host.root)');
 const merged=source.indexOf('if(e618Enabled)consolidateOwnedStaticSiteDetails(');
 assert.ok(flush>=0&&merged>flush);
 assert.match(source,/new URLSearchParams\(location.search\).get\('e618Batch'\)!=='0'/);
});
