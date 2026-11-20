import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {inspectEquipmentMesh,measureEquipmentMesh}
 from '../src/equipment-visual-inspection.ts';

const mesh=(parent,x=0)=>{
 const item=new THREE.Mesh(new THREE.BoxGeometry(2,4,2),
  new THREE.MeshBasicMaterial());
 item.position.x=x;parent.add(item);return item;
};
function fixture(){
 const root=new THREE.Group(),chest=new THREE.Group(),hip=new THREE.Group();
 const pack=new THREE.Group();
 root.add(chest,hip,pack);
 const rigMesh=mesh(chest,8),beltMesh=mesh(hip,4),cuffMesh=mesh(pack,-4);
 const kit={slots:{utility:'utility-wedge'},
  fieldInventory:{version:1,stacks:[
   {itemId:'flashbang',quantity:1,location:'rig'},
   {itemId:'flashbang',quantity:1,location:'belt'},
   {itemId:'wedge',quantity:1,location:'pocket'},
   {itemId:'zip-tie',quantity:1,location:'backpack'}]}};
 const r={
  root,flashCanisters:[rigMesh,beltMesh],wedgeMeshes:[mesh(hip)],
  cuffMeshes:[cuffMesh],medicalPouch:mesh(chest),utilityTool:mesh(chest),
  radioUnit:mesh(chest),beltPouch:mesh(hip),
  visualKit:{magazines:{rig:[mesh(chest)],belt:[],pocket:[]},
   dayPack:mesh(pack),fieldPack:mesh(pack),chestRig:mesh(chest),
   fieldWebbing:mesh(chest),belt:mesh(hip),plateCarrier:mesh(chest),
   softArmor:mesh(chest)}
 };
 return {r,kit,rigMesh,beltMesh,cuffMesh,root};
}
test('inspection selects the actual object at its issued physical location',()=>{
 const {r,kit,rigMesh,beltMesh,root}=fixture();
 const children=root.children.length;
 assert.equal(inspectEquipmentMesh(r,kit,
  {kind:'field',id:'flashbang',location:'rig'}),rigMesh);
 assert.equal(inspectEquipmentMesh(r,kit,
  {kind:'field',id:'flashbang',location:'belt'}),beltMesh);
 assert.equal(inspectEquipmentMesh(r,kit,
  {kind:'field',id:'flashbang',location:'pocket'}),null);
 assert.equal(inspectEquipmentMesh(r,kit,
  {kind:'field',id:'frag',location:'rig'}),null);
 assert.equal(root.children.length,children,'inspection cannot add proxy gear');
});
test('concealed and invisible meshes do not falsely report visible inventory',()=>{
 const {r,kit,cuffMesh,rigMesh}=fixture();
 assert.equal(inspectEquipmentMesh(r,kit,
  {kind:'field',id:'zip-tie',location:'backpack'}),cuffMesh);
 assert.equal(inspectEquipmentMesh(r,kit,
  {kind:'magazine',location:'backpack'}),null);
 rigMesh.parent.visible=false;
 assert.equal(inspectEquipmentMesh(r,kit,
  {kind:'field',id:'flashbang',location:'rig'}),null);
 assert.equal(measureEquipmentMesh(rigMesh).visible,false);
});
test('reported extents use transformed mesh geometry, not approximate socket rings',()=>{
 const {r,kit,rigMesh}=fixture();
 rigMesh.parent.position.set(0,23,0);
 const target=inspectEquipmentMesh(r,kit,
  {kind:'field',id:'flashbang',location:'rig'});
 const result=measureEquipmentMesh(target);
 assert.equal(result.visible,true);
 assert.equal(result.center.x,8);
 assert.equal(result.center.y,23);
 assert.equal(result.size.y,4);
});
test('Operator Lab and all three prep flows expose real mesh inspection',()=>{
 const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const lab=file('operator-lab.html');
 for(const id of ['equipmentInspection','inspectionItem','inspectionLocation',
  'inspectionIndex','inspectionPose','inspectionStatus','inspectionSampleKit'])
  assert.match(lab,new RegExp('id="'+id+'"'));
 for(const path of ['src/ui/quick-play-configurator.ts',
  'src/ui/campaign-pre-go-prep.ts','src/breach-operations-board-controller.ts',
  'src/campaign-ui.ts'])
  assert.match(file(path),/onInspectItem:item=>[\s\S]{0,500}?inspectCarryItem\(item\)/);
});
