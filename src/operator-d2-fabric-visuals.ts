/** D2-A1. Three fitted balaclavas in canonical -Z-forward head space.
 * Rig skin skull is an 8x8x8 block at local y=3 (front z=-4).
 * Apertures are real empty geometry: no painted skin plates.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
export type D2BalaclavaId='balaclava-one'|'balaclava-three'|'balaclava-open';
type Section={name:string;x:number;y:number;z:number;w:number;h:number;d:number;front?:boolean};
function part(parent:THREE.Group,m:THREE.Material,p:Section){
 const mesh=new THREE.Mesh(mapBoxPixelUV(
  new THREE.BoxGeometry(p.w,p.h,p.d),p.w,p.h,p.d),m);
 mesh.name=p.name;mesh.position.set(p.x,p.y,p.z);
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.d2FrontPanel=!!p.front;
 parent.add(mesh);return mesh;
}
const front=(name:string,x:number,y:number,w:number,h:number):Section=>({
 name,x,y,z:-4.22,w,h,d:.38,front:true
});
const shared:Section[]=[
 {name:'crown',x:0,y:7.23,z:0,w:8.5,h:.48,d:8.5},
 {name:'back',x:0,y:3.03,z:4.22,w:8.5,h:8.2,d:.42},
 {name:'left-temple',x:-4.23,y:3.03,z:0,w:.42,h:8.2,d:8.5},
 {name:'right-temple',x:4.23,y:3.03,z:0,w:.42,h:8.2,d:8.5},
 {name:'neck',x:0,y:-1.28,z:1.5,w:8.25,h:1.75,d:5.7},
 {name:'chin-neck',x:0,y:-1.22,z:-3.2,w:6.6,h:1.45,d:1.55}
];
const fronts:Record<D2BalaclavaId,Section[]>={
 'balaclava-one':[
  front('brow',0,5.83,8.50,2.75),
  front('covered-mouth',0,1.12,8.50,3.2),
  front('left-eye-edge',-3.82,3.58,.86,1.95),
  front('right-eye-edge',3.82,3.58,.86,1.95)
 ],
 'balaclava-three':[
  front('brow',0,5.83,8.5,2.7),
  front('mid-face-band',0,2.52,8.5,.53),
  front('lower-jaw',0,-.20,8.5,1.03),
  front('eye-bridge',0,3.65,.86,1.67),
  front('left-eye-edge',-3.64,3.65,1.16,1.67),
  front('right-eye-edge',3.64,3.65,1.16,1.67),
  front('left-mouth-edge',-3.0,1.16,2.60,2.22),
  front('right-mouth-edge',3.0,1.16,2.60,2.22)
 ],
 'balaclava-open':[
  front('hood-forehead',0,6.08,8.5,2.23),
  front('chin-band',0,-.48,8.5,.52),
  front('left-face-edge',-3.82,2.85,.86,4.35),
  front('right-face-edge',3.82,2.85,.86,4.35)
 ]
};
export function createD2Balaclava(id:D2BalaclavaId,cloth:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 for(const p of shared)part(root,cloth,p);
 for(const p of fronts[id])part(root,cloth,p);
 if(id==='balaclava-three'){
  // Toggle for the two-hole look; still one catalog model.
  const optional=new THREE.Group();
  optional.name='d2-two-hole-mouth-cover';
  optional.userData.d2TwoHoleOption=true;
  optional.visible=false;
  part(optional,cloth,front('two-hole-fill',0,1.20,3.48,1.9));
  root.add(optional);
 }
 return root;
}
