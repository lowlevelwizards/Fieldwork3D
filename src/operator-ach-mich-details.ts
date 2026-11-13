/** ACH/MICH first-pass finish: exposed binding + four restraint anchors,
 * with a permanent basic four-point chin strap. Cosmetic, static and cheap.
 * Everything is authored in canonical head space (-Z forward).
 */
import * as THREE from 'three';
import {ACH_MICH_SHELLS} from './operator-headwear-silhouettes.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
export type AchMichDetailLayers={bare:THREE.Group;strap:THREE.Group};
const profiles={
 ach:{side:5.075,frontSide:4.40,sideFrontEdge:4.40,ear:2.68,nape:2.68,
  forward:-5.535,rear:5.60,frontBoltY:5.22,rearBoltY:4.68},
 'mich-2002':{side:5.03,frontSide:4.55,sideFrontEdge:4.715,ear:4.05,nape:3.37,
  forward:-5.70,rear:5.75,frontBoltY:5.75,rearBoltY:5.13},
 'mich-2001':{side:5.015,frontSide:4.55,sideFrontEdge:5.945,ear:5.95,nape:3.33,
  forward:-5.71,rear:5.66,frontBoltY:6.50,rearBoltY:5.05}
} as const;
function ribbon(group:THREE.Group,material:THREE.Material,
 a:readonly number[],b:readonly number[],width:number,axis:'x'|'y'){
 const vertices:number[]=[];
 const v=axis==='y'?[0,width/2,0]:[width/2,0,0];
 for(const p of [a.map((q,i)=>q-v[i]),a.map((q,i)=>q+v[i]),
  b.map((q,i)=>q+v[i]),a.map((q,i)=>q-v[i]),
  b.map((q,i)=>q+v[i]),b.map((q,i)=>q-v[i])])vertices.push(...p);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);mesh.castShadow=false;
 mesh.receiveShadow=false;group.add(mesh);
}
export function createAchMichDetails(parent:THREE.Group,id:string):AchMichDetailLayers{
 if(!(ACH_MICH_SHELLS as readonly string[]).includes(id))
  throw Error('ACH/MICH details require an ACH/MICH shell');
 const p=profiles[id as keyof typeof profiles];
 const bare=new THREE.Group(),strap=new THREE.Group();
 bare.name=id+'-exposed-shell-binding-and-screws';
 strap.name=id+'-standard-four-point-chinstrap';
 parent.add(bare,strap);
 const trim=new THREE.MeshStandardMaterial({color:0x252c2a,roughness:.99,
  flatShading:true,side:THREE.DoubleSide});
 const boltMat=new THREE.MeshStandardMaterial({color:0x677066,roughness:.84,flatShading:true});
 const cloth=new THREE.MeshStandardMaterial({color:0x4d554c,roughness:1,
  flatShading:true,side:THREE.DoubleSide});
 // The binding follows the actual uncovered lower shell edge.
 ribbon(bare,trim,[-p.side,p.frontSide,p.forward-.025],
  [p.side,p.frontSide,p.forward-.025],.19,'y');
 ribbon(bare,trim,[-p.side,p.nape,p.rear+.035],
  [p.side,p.nape,p.rear+.035],.19,'y');
 for(const sign of [-1,1] as const){
  const x=sign*(p.side+.10);
  if(id==='ach'){
   ribbon(bare,trim,[x,p.frontSide,-4.95],[x,p.frontSide,-2.0],.19,'y');
   ribbon(bare,trim,[x,p.ear,-2.0],[x,p.ear,5.04],.19,'y');
  }else{
   // No fictitious binding across the genuine high-/mid-cut ear aperture.
   ribbon(bare,trim,[x,p.sideFrontEdge,-4.6],
    [x,p.sideFrontEdge,-2.0],.19,'y');
   ribbon(bare,trim,[x,p.nape,3.95],[x,p.nape,5.1],.19,'y');
  }
  // MICH 2001 has a genuinely open rear side; its rear anchor belongs on
  // the nape return, not in the empty ear interval.
  const rearAnchorZ=id==='mich-2001'?4.18:2.72;
  const stud=new THREE.BoxGeometry(.16,.39,.39);
  for(const [z,y] of [[-2.60,p.frontBoltY],[rearAnchorZ,p.rearBoltY]]){
   const bolt=new THREE.Mesh(stud,boltMat);
   bolt.name='ach-mich-retention-screw';
   bolt.position.set(sign*(p.side+.11),y,z);
   bolt.castShadow=false;bolt.receiveShadow=false;bare.add(bolt);
  }
  const anchorFront:[number,number,number]=[sign*4.85,p.frontBoltY,-2.50];
  const anchorBack:[number,number,number]=[sign*4.85,p.rearBoltY,rearAnchorZ];
  const cheek:[number,number,number]=[sign*3.95,1.15,-3.90];
  const chin:[number,number,number]=[sign*1.55,.10,-4.48];
  ribbon(strap,cloth,anchorFront,cheek,.40,'x');
  ribbon(strap,cloth,anchorBack,cheek,.38,'x');
  ribbon(strap,cloth,cheek,chin,.43,'x');
 }
 ribbon(strap,cloth,[-1.55,.10,-4.48],[1.55,.10,-4.48],.48,'y');
 consolidateVisualGroup(bare);
 consolidateVisualGroup(strap);
 bare.userData.achMichRetentionScrews=4;
 strap.userData.achMichFourPoint=true;
 return {bare,strap};
}
export function updateAchMichDetails(layers:AchMichDetailLayers,
 cover:boolean,allowStrap:boolean):void{
 layers.bare.visible=!cover;
 layers.strap.visible=allowStrap;
}
