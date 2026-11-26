/** Optional one-rig developer inspection. Never advances simulation or owns equipment. */
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from './breach-operator-rig.ts';
import type {TeamActor} from './breach-game.ts';
export function createEnemyKitPreview(canvas:HTMLCanvasElement){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
 renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x192522);
 scene.add(new THREE.HemisphereLight(0xfff5e4,0x39463b,2.2));
 const key=new THREE.DirectionalLight(0xfff1d9,2.4);key.position.set(80,140,100);scene.add(key);
 const fill=new THREE.DirectionalLight(0xc6dbed,.65);fill.position.set(-80,50,-90);scene.add(fill);
 const rig=createOperatorRig('eb-preview','red',true);scene.add(rig.root);
 const camera=new THREE.OrthographicCamera(-45,45,45,-45,.1,1000);
 let actor:TeamActor|null=null;
 function render(){
  if(!actor)return;
  const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
  renderer.setSize(width,height,false);
  const bounds=new THREE.Box3().setFromObject(rig.root),center=bounds.getCenter(new THREE.Vector3());
  // Fixed shared character scale; hidden geometry must not determine framing.
  const half=37,aspect=width/height;
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
  camera.position.set(center.x+95,34+42,center.z+120);camera.lookAt(center.x,29,center.z);
  camera.updateProjectionMatrix();renderer.render(scene,camera);
 }
 new ResizeObserver(render).observe(canvas);
 return {show(a:TeamActor){
  actor=a;
  poseOperator(rig,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',injury:0,
   weapon:a.weapon,weaponConfiguration:a.weaponConfiguration,equipment:a.equipment,wardrobe:a.wardrobe,
   appearanceSeed:a.appearanceSeed,reload:0,reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
   down:false,surrender:false,aiming:false,firing:false,turning:0,deterministic:true},0);
  render();
 }};
}
