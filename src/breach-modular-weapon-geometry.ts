/** Small authored cuboid modules for AK and AR weapon-family appearances.
 * Render geometry only on weapon/configuration changes. Coordinates share the
 * legacy stock-to-muzzle axis; shot and clearance continue to own physics.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {FAMILY_PARTS,type FamilyPartSlot,type WeaponFamilyBuild}
 from './equipment-weapon-families.ts';

type Finish=0|1|2;
type Block=readonly [number,number,number,number,number,number,Finish];
const WOOD=new THREE.MeshStandardMaterial({color:0x755039,roughness:.93,flatShading:true});
const partBox=(root:THREE.Group,slot:FamilyPartSlot,id:string,n:number,
 spec:Block,steel:THREE.Material,dark:THREE.Material,angle=0)=>{
 const [x,y,z,w,h,d,finish]=spec;
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),
  finish===0?steel:finish===1?dark:WOOD);
 mesh.position.set(x,y,z);
 if(angle)mesh.rotation.z=angle;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.name='family-'+slot+'-'+id+'-'+n;
 root.add(mesh);
};
const add=(root:THREE.Group,slot:FamilyPartSlot,id:string,shapes:readonly Block[],
 steel:THREE.Material,dark:THREE.Material)=>{
 shapes.forEach((shape,i)=>partBox(root,slot,id,i,shape,steel,dark));
};
const wood=(id:string):Finish=>/wood/.test(id)?2:1;
const receiverShapes=(build:WeaponFamilyBuild):Block[]=>{
 const id=build.parts.receiver;
 if(build.family==='ar'){
  const carry=id==='ar-a1'||id==='ar-a2'||id==='ar-retro';
  return [
   [-2,0,0,10.5,3.7,3.7,0],[-3.7,1.5,2.1,5.6,.6,.42,1],
   [-2.2,-2.0,0,5.3,1,3.15,1],[-5.25,.2,0,1.2,3.8,3.6,1],
   ...(carry?[
    [-2.1,3.15,0,7.0,1.0,2.0,0],
    [-4.4,2.1,0,1.0,1.5,1.9,0],
    [.1,2.1,0,1.0,1.5,1.9,0]
   ] as Block[]:[
    [-1.3,2.25,0,8.0,.65,2.3,1],
    [-3,2.75,0,1.4,.9,1.8,0]
   ] as Block[])
  ];
 }
 return [
  [-2.4,.1,0,11.1,3.6,3.8,0],
  [-2.2,2.05,0,10.3,.75,3.35,1],
  [-5.8,-.65,0,2.4,3.0,3.5,1],
  [.6,-1.6,0,5.7,1.0,3.6,0],
  [-2.1,.1,2.15,5.4,1.4,.4,1],
  [-1.4,.1,-2.15,4.8,.7,.4,1],
  [2.25,2.6,0,1.4,.7,1.7,0]
 ];
};
const stockShapes=(build:WeaponFamilyBuild):Block[]=>{
 const id=build.parts.stock,anchor=FAMILY_PARTS[id].stockX??-13.5;
 const rear=anchor+.6;
 if(build.family==='ar'){
  if(id==='ar-fixed')return [
   [-9.55,-.55,0,7.8,3.2,3.7,1],
   [rear,-.5,0,1.1,4.65,4.35,1],
   [-6.15,-.3,0,2.0,2.7,3.35,0]
  ];
  return [
   [-9.05,-.4,0,6.6,1.3,1.55,0],
   [-10.65,-1.25,0,3.9,2.8,3.5,1],
   [rear,-1.45,0,1.1,4.2,4.05,1],
   [-9.6,-2.95,0,1.0,1.4,2.5,1]
  ];
 }
 if(id==='ak-sidefold')return [
  [-9.8,.0,1.35,6.0,1.05,1.0,0],
  [-9.8,-1.9,1.35,6.0,.9,1.0,0],
  [rear,-1.0,.3,1.2,3.8,3.6,1],
  [-7.9,-.95,1.2,1.0,2.2,.9,0]
 ];
 const mat:Finish=id==='ak-wood'?2:1;
 return [
  [-9.6,-.8,0,8.0,3.4,3.8,mat],
  [rear,-.8,0,1.1,4.2,4.2,1],
  [-7.0,-.25,0,2.1,2.7,3.4,mat]
 ];
};
const gripShapes=(build:WeaponFamilyBuild):Block[]=>{
 const id=build.parts.grip,material:Finish=wood(id);
 return build.family==='ar'?[
  [0,-3.85,0,3.0,4.0,2.6,material],
  [-.25,-5.5,0,3.3,.8,2.7,material]
 ]:[
  [-1.35,-3.8,0,3.1,4.0,2.7,material],
  [-1.55,-5.65,0,3.4,.75,2.9,material]
 ];
};
const magazineShapes=(build:WeaponFamilyBuild):Block[]=>{
 const id=build.parts.magazine;
 if(build.family==='ar')return [
  [3.65,-3.35,0,3.1,2.5,2.7,0],
  [3.9,id==='ar-mag20'?-5.35:-6,0,3.2,
   id==='ar-mag20'?2.6:3.9,2.65,1],
  [4.05,id==='ar-mag20'?-6.5:-7.7,0,3.5,.8,3.05,1]
 ];
 return [
  [4.45,-3.5,0,3.45,2.65,3,0],
  [5,-5.75,0,3.5,3.4,2.85,1],
  [6.15,-7.3,0,3.6,1.35,2.9,1],
  [7,-8,0,3.75,.7,3.05,1]
 ];
};
const handguardShapes=(build:WeaponFamilyBuild):Block[]=>{
 const id=build.parts.handguard;
 const length=FAMILY_PARTS[id].length;
 const long=length==='long',short=length==='short';
 const x=long?10.0:short?8.0:8.85;
 const w=long?12.8:short?7.9:10.2;
 const mat:Finish=wood(id);
 if(build.family==='ar')return [
  [x,.1,0,w,3.0,long?3.8:3.6,mat],
  [x,1.8,0,w,.75,3.6,mat],
  [x,-1.7,0,w,.65,3.5,mat],
  ...(/rail|quad/.test(id)?[
   [x,.1,2.0,w,.55,.5,0],
   [x,.1,-2.0,w,.55,.5,0]
  ] as Block[]:[])
 ];
 return [
  [x,.05,0,w,2.9,3.55,mat],
  [x,2.0,0,w*.75,1.0,2.7,mat],
  [x,-1.65,0,w*.8,.7,3.5,mat],
  [x+1.2,1.4,0,w*.55,.6,1.6,0],
  ...(/rail/.test(id)?[[x,2.75,0,w*.7,.55,1.8,0] as Block]:[])
 ];
};
const barrelShapes=(build:WeaponFamilyBuild):Block[]=>{
 const barrel=build.parts.barrel,length=FAMILY_PARTS[barrel].length;
 const short=length==='short',long=length==='long';
 const start=long?14.5:short?11.3:13.4;
 const x=(19.5+start)/2,w=19.5-start;
 if(build.family==='ar')return [
  [x,0,0,w,1.4,1.5,0],
  [18.95,0,0,1.1,1.85,1.9,1],
  ...(!short?[[16.3,2.25,0,1.05,4.1,1.5,0] as Block]:[])
 ];
 return [
  [x,0,0,w,1.55,1.65,0],
  [18.95,0,0,1.1,2.0,2.15,1],
  [short?17.1:16.3,1.95,0,1.15,3.6,2.1,0],
  [short?14.1:13.4,1.05,0,2.3,1.6,2.2,1]
 ];
};
export function buildModularWeaponSilhouette(build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 add(root,'receiver',build.parts.receiver,receiverShapes(build),steel,dark);
 add(root,'stock',build.parts.stock,stockShapes(build),steel,dark);
 add(root,'grip',build.parts.grip,gripShapes(build),steel,dark);
 add(root,'magazine',build.parts.magazine,magazineShapes(build),steel,dark);
 add(root,'handguard',build.parts.handguard,handguardShapes(build),steel,dark);
 add(root,'barrel',build.parts.barrel,barrelShapes(build),steel,dark);
 return root;
}
