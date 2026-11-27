/** Compare real builders and fitted harnesses against the BP5 commit.
 * Temporary baseline modules share the existing material/light helpers. */
import {execFileSync} from 'node:child_process';
import {writeFile,mkdir,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {enableBakedGearAO} from '../src/operator-baked-gear-ao.ts';
import {createPackPreview,updatePackPreview} from '../src/operator-backpack-preview.ts';
const baseline='efd1b6e9828f4f2d4964362c4a0d1bf7b3707849';
const names=['geometry','catalog','fit','art','preview'];
const paths=names.map(n=>'src/.bp5-before-'+n+'.ts');
function materials(){
 const fabric=new THREE.MeshStandardMaterial({flatShading:true});
 fabric.userData.fieldworkFabric=true;enableBakedGearAO(fabric);
 return {fabric,trim:new THREE.MeshStandardMaterial({flatShading:true}),dark:new THREE.MeshStandardMaterial({flatShading:true})};
}
function measure(root){
 const out={components:0,drawCalls:0,vertices:0,triangles:0};
 if(!root)return out;
 root.traverse(o=>{
  if(o.userData.fieldworkPackComponents!==undefined)out.components+=o.userData.fieldworkPackComponents;
  if(!o.isMesh)return;
  const v=o.geometry.getAttribute('position').count;
  out.vertices+=v;out.triangles+=(o.geometry.index?.count??v)/3;out.drawCalls++;
 });
 return out;
}
try{
 for(const [i,n] of names.entries()){
  let source=execFileSync('git',['show',baseline+':src/operator-backpack-'+n+'.ts'],{encoding:'utf8'});
  for(const dep of names)source=source.replaceAll('./operator-backpack-'+dep+'.ts','./.bp5-before-'+dep+'.ts');
  if(n==='geometry')source=source.replace('consolidateVisualGroup(root);return root;','root.userData.fieldworkPackComponents=root.children.length;consolidateVisualGroup(root);return root;');
  await writeFile(paths[i],source);
 }
 const old=await import('../src/.bp5-before-preview.ts');
 const rows=[];
 for(const style of ['hydration','admin-pack','day-pack','assault-pack']){
  const make=(create,update)=>{
   const chest=new THREE.Group(),parent=new THREE.Group();chest.add(parent);
   const state=create(parent,chest,materials());
   const art=update(state,true,style,'plate-jpc','chest-placard','combat-shirt');
   assert.ok(art);return {body:measure(art.root),harness:measure(state.harness)};
  };
  const before=make(old.createPackPreview,old.updatePackPreview);
  const after=make(createPackPreview,updatePackPreview);
  rows.push({style:style==='admin-pack'?'assault-panel':style,before,after});
  assert.ok(after.body.triangles<before.body.triangles,style+' body triangle reduction');
  assert.ok(after.body.vertices<before.body.vertices,style+' body vertex reduction');
  assert.ok(after.body.components<before.body.components,style+' component reduction');
  assert.ok(after.harness.triangles<=before.harness.triangles,style+' harness triangle reduction');
  assert.ok(after.body.drawCalls<=4,style+' body draw budget');
 }
 const roster=[];
 for(const style of ['hydration','admin-pack','day-pack','assault-pack','field-pack','rucksack','medic-pack','comms-pack','civilian-pack']){
  const chest=new THREE.Group(),parent=new THREE.Group();chest.add(parent);
  const state=createPackPreview(parent,chest,materials());
  const art=updatePackPreview(state,true,style,'plate-jpc','chest-placard','combat-shirt');
  assert.ok(art);const body=measure(art.root),harness=measure(state.harness);
  const cap={hydration:5,'admin-pack':7,'day-pack':10,'assault-pack':13,'field-pack':12,rucksack:12,'medic-pack':7,'comms-pack':8,'civilian-pack':4}[style];
  assert.ok(body.components<=cap,style+' component budget');assert.ok(body.drawCalls<=4,style+' batch budget');
  assert.ok(body.triangles<=650&&harness.triangles<=400,style+' geometry budget');
  roster.push({style:art.style,body,harness});
 }
 await mkdir('backpack-art-captures',{recursive:true});
 await writeFile('backpack-art-captures/geometry-audit.json',JSON.stringify(rows,null,2));
 await writeFile('backpack-art-captures/roster-audit.json',JSON.stringify(roster,null,2));
 console.log(JSON.stringify({beforeAfter:rows,roster},null,2));
}finally{for(const p of paths)await unlink(p).catch(()=>{});}
