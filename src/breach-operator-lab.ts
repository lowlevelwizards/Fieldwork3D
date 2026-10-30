import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createOperatorRig,poseOperator,type OperatorRig} from './breach-operator-rig.ts';
import type {WeaponId} from './breach-combat.ts';
const canvas=document.querySelector<HTMLCanvasElement>('#preview')!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.setClearColor(0xc4c5bd);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-28,28,34,-34,.1,600);
camera.position.set(67,48,75);
const control=new OrbitControls(camera,canvas);
control.enableDamping=true;control.dampingFactor=.11;
control.target.set(0,16,0);control.minZoom=.35;control.maxZoom=7;
scene.add(new THREE.HemisphereLight(0xffffff,0x8f9188,2.2));
const lamp=new THREE.DirectionalLight(0xffffff,2.3);
lamp.position.set(-40,90,45);lamp.castShadow=true;
lamp.shadow.mapSize.set(1024,1024);lamp.shadow.camera.left=-90;
lamp.shadow.camera.right=90;lamp.shadow.camera.top=90;
lamp.shadow.camera.bottom=-90;scene.add(lamp);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),
  new THREE.MeshStandardMaterial({color:0xaeb1aa,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
scene.add(new THREE.GridHelper(120,12,0x8b9791,0xb4bbb5));
let rig:OperatorRig|null=null,pose='idle',clock=0,stride=0;
let last=performance.now();
const choose=<T extends HTMLElement>(id:string)=>document.getElementById(id)! as T;
const operator=choose<HTMLSelectElement>('operator'),
  weapon=choose<HTMLSelectElement>('weapon'),
  injury=choose<HTMLSelectElement>('injury');
const build=()=>{
  if(rig){scene.remove(rig.root);rig.dispose();}
  rig=createOperatorRig(operator.value,operator.value==='hostile'?'red':'blue');
  scene.add(rig.root);
};
operator.addEventListener('change',build);
function fit(view='iso'){
  const distance=75;
  camera.position.copy(view==='front'?new THREE.Vector3(distance,16,0):
    view==='side'?new THREE.Vector3(0,16,distance):
    view==='top'?new THREE.Vector3(.01,110,.01):
    new THREE.Vector3(65,48,68));
  camera.zoom=1.4;camera.updateProjectionMatrix();
  control.target.set(0,16,0);control.update();
}
document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button=>{
  button.addEventListener('click',()=>{pose=button.dataset.pose!;clock=0;stride=0;
    for(const b of document.querySelectorAll<HTMLButtonElement>('[data-pose]'))
      b.setAttribute('aria-pressed',String(b===button));});
});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>
  button.addEventListener('click',()=>fit(button.dataset.view)));
choose<HTMLButtonElement>('resetCamera').addEventListener('click',()=>fit());
function resize(){
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);
  const aspect=w/h;const half=36;
  camera.left=-half*aspect;camera.right=half*aspect;
  camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
function tick(now:number){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;clock+=dt;
  const moving=pose==='walk'||pose==='strafe'||pose==='turn';
  if(moving)stride+=dt*(pose==='turn'?25:50);
  const speed=moving?pose==='turn'?18:52:0;
  const x=moving?(pose==='strafe'?Math.sin(clock*.5)*3:Math.sin(clock*.7)*4):0;
  const z=pose==='strafe'?Math.sin(clock*.6)*4:0;
  const heading=pose==='turn'?Math.sin(clock*.8)*Math.PI:.3;
  if(rig){
    rig.root.position.set(x,0,z);
    poseOperator(rig,{x,z,heading,seconds:clock,stride,
      velocity:speed,posture:pose==='crouch'?'crouch':'stand',
      injury:Number(injury.value),weapon:weapon.value as WeaponId,
      reload:pose==='reload'?1.8*(1-(clock%1.8)/1.8):0,
      reloadDuration:1.8,lastDoorAt:pose==='door'?clock-(clock%1.2):-100,
      lastThrowAt:pose==='flash'?clock-(clock%1.4):-100,
      down:Number(injury.value)===3,surrender:false,
      aiming:pose==='aim'||pose==='strafe',firing:false,turning:0},dt);
  }
  control.update();renderer.render(scene,camera);
  requestAnimationFrame(tick);
}
build();fit();resize();requestAnimationFrame(tick);
