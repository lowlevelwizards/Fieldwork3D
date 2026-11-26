import * as THREE from 'three';
import {STUDIO_INSPECTION_LIGHT,STUDIO_KEY_DIRECTION,studioShadowPalette} from './operator-studio-lighting.ts';
import type {WallEffect} from './worldgen/wall-surface-recipe.ts';
/** Single on-demand inspection scene. Uses the tactical studio light
 * constants, not full live fog/shadow/room grading. Context forms are
 * schematic and do not claim to be production fixture models. */
export function createMaterialSpecimen(canvas:HTMLCanvasElement){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x273630);
 scene.add(new THREE.HemisphereLight(STUDIO_INSPECTION_LIGHT.sky,studioShadowPalette('plum-plus').ground,1.20));
 const fill=new THREE.DirectionalLight(studioShadowPalette('plum-plus').fill,.60);fill.position.set(-35,23,30);scene.add(fill);
 const key=new THREE.DirectionalLight(STUDIO_INSPECTION_LIGHT.key,2.35);key.position.copy(STUDIO_KEY_DIRECTION).multiplyScalar(300);scene.add(key);
 const camera=new THREE.OrthographicCamera(-80,80,45,-45,.1,1000);
 const root=new THREE.Group();scene.add(root);
 const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
 const material=(color:number)=>{const m=new THREE.MeshStandardMaterial({color,roughness:1});materials.push(m);return m;};
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{
  const g=new THREE.BoxGeometry(w,h,d);geometries.push(g);
  const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);root.add(mesh);return mesh;
 };
 const body=material(0x9c9d91),trim=material(0x777c70),floor=material(0x797e71),wood=material(0x846b53),steel=material(0x788a89);
 box(96,56,6,0,28,0,body);
 box(100,2,50,0,-1,22,floor);
 box(96,3,2,0,1.5,4,trim);
 const wallMaterial=material(0xffffff);
 const g=new THREE.PlaneGeometry(96,56);geometries.push(g);
 const face=new THREE.Mesh(g,wallMaterial);face.position.set(0,28,3.05);root.add(face);
 const jamb=box(4,50,3,-47,25,5,trim);
 const sill=box(28,2,5,0,19,6,trim);
 const bench=box(34,3,16,0,23,13,wood);
 const leg1=box(3,22,3,-13,11,18,steel),leg2=box(3,22,3,13,11,18,steel);
 const basin=box(24,5,14,0,23,13,steel);
 let texture:THREE.DataTexture|undefined;
 function draw(bytes:Uint8Array,width:number,height:number,kind:WallEffect|undefined,close:boolean,front:boolean){
  texture?.dispose();
  texture=new THREE.DataTexture(bytes,width,height,THREE.RGBAFormat);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;
  texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.needsUpdate=true;
  wallMaterial.map=texture;wallMaterial.needsUpdate=true;
  jamb.visible=kind==='chip'||kind==='contact';sill.visible=kind==='runoff';
  bench.visible=leg1.visible=leg2.visible=kind==='grease'||kind==='workgrime';basin.visible=kind==='splash';
  const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),aspect=w/h,span=close?43:70;
  camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;
  camera.position.set(front?0:110,front?28:100,front?180:175);camera.lookAt(0,28,7);camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);renderer.render(scene,camera);
 }
 function dispose(){texture?.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();}
 return {draw,dispose};
}
