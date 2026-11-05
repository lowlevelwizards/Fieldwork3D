/** R5H4 faceted police face shield. Hinges live on the helmet; all
 * shield parts share one head-local pivot, never the eyewear render layer.
 */
import * as THREE from 'three';
import type {PoliceVisorOptions} from './operator-police-visor-policy.ts';
export type PoliceVisorLayers={
 pivot:THREE.Group;shield:THREE.Group;reinforcement:THREE.Group;
 lens:THREE.MeshStandardMaterial;
};
function box(parent:THREE.Group,mat:THREE.Material,x:number,y:number,z:number,
 w:number,h:number,d:number,name:string){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 mesh.position.set(x,y,z);mesh.name=name;
 mesh.castShadow=true;parent.add(mesh);
}
function quad(parent:THREE.Group,mat:THREE.Material,name:string,
 left:number,right:number,zLeft:number,zRight:number){
 // Face top/bottom are relative to shared hinge at Y5.35, Z-.70.
 const t=-.42,b=-6.66;
 const verts=new Float32Array([
  left,t,zLeft,right,t,zRight,left,b,zLeft+.18,
  right,t,zRight,right,b,zRight+.18,left,b,zLeft+.18
 ]);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.BufferAttribute(verts,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.renderOrder=3;
 parent.add(mesh);
}
export function createPoliceVisor(model:THREE.Group):PoliceVisorLayers{
 const frame=new THREE.MeshStandardMaterial({color:0x282e33,
  roughness:.84,metalness:.03,flatShading:true});
 const lens=new THREE.MeshStandardMaterial({color:0xcde3e3,opacity:.23,
  transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,
  roughness:.15,metalness:0,flatShading:true});
 const pivot=new THREE.Group();pivot.name='police-visor-swing';
 pivot.position.set(0,5.35,-.70);model.add(pivot);
 const shield=new THREE.Group();shield.name='police-shield-and-opaque-frame';
 pivot.add(shield);
 // One joined center with two inward swept outer facets, no double glass.
 quad(shield,lens,'visor-center',-3.70,3.70,-5.93,-5.93);
 quad(shield,lens,'visor-left-facet',-5.35,-3.70,-5.10,-5.93);
 quad(shield,lens,'visor-right-facet',3.70,5.35,-5.93,-5.10);
 box(shield,frame,0,-.48,-5.70,10.80,.65,.65,'visor-brow-crossbar');
 box(shield,frame,0,-6.65,-5.75,10.30,.30,.40,'visor-lower-border');
 for(const sign of [-1,1]){
  box(model,frame,sign*5.45,5.35,-.70,1.05,1.15,1.18,'police-fixed-pivot');
  box(shield,frame,sign*5.36,-3.50,-5.07,.43,6.15,.45,'visor-side-frame');
 }
 const reinforcement=new THREE.Group();reinforcement.name='police-reinforced-frame';
 shield.add(reinforcement);
 box(reinforcement,frame,0,-.75,-5.73,10.70,.43,.70,'heavy-upper-retainer');
 for(const sign of [-1,1])
  box(reinforcement,frame,sign*5.05,-3.40,-5.08,.54,5.86,.46,'heavy-side-retainer');
 pivot.visible=false;reinforcement.visible=false;
 return {pivot,shield,reinforcement,lens};
}
export function updatePoliceVisor(v:PoliceVisorLayers,
 options:PoliceVisorOptions|undefined,headwear:string,
 fit:{compatible:boolean}){
 const position=options?.policeVisorPosition??'none';
 v.pivot.visible=headwear==='police-helmet'&&fit.compatible&&position!=='none';
 if(!v.pivot.visible)return;
 v.pivot.rotation.x=position==='raised'?Math.PI*100/180:0;
 const smoke=options?.policeVisorTint==='smoke';
 v.lens.color.setHex(smoke?0x546975:0xcde3e3);
 v.lens.opacity=smoke?.44:.23;
 v.reinforcement.visible=options?.policeVisorFrame==='reinforced';
}
