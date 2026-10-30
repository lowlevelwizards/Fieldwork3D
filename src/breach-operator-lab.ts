/** Build 122: deterministic physical animation workbench.
 * Identical Build 119/120 rig and footstep scheduler as gameplay/replay.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createOperatorRig,poseOperator,type OperatorRig}
  from './breach-operator-rig.ts';
import {weaponGrips} from './breach-weapon-pose.ts';
import {LabMotionCache,TRACK_DURATION,type LabTrack}
  from './breach-lab-tracks.ts';
import type {WeaponId} from './breach-combat.ts';

const choose=<T extends HTMLElement>(id:string)=>
  document.getElementById(id)! as T;
const canvas=choose<HTMLCanvasElement>('preview');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.setClearColor(0xc4c5bd);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-28,28,34,-34,.1,600);
camera.position.set(65,48,68);
const control=new OrbitControls(camera,canvas);
control.enableDamping=true;control.dampingFactor=.11;
control.target.set(0,16,0);control.minZoom=.35;control.maxZoom=7;
scene.add(new THREE.HemisphereLight(0xffffff,0x8f9188,2.2));
const lamp=new THREE.DirectionalLight(0xffffff,2.3);
lamp.position.set(-40,90,45);lamp.castShadow=true;
lamp.shadow.mapSize.set(1024,1024);lamp.shadow.camera.left=-90;
lamp.shadow.camera.right=90;lamp.shadow.camera.top=90;
lamp.shadow.camera.bottom=-90;scene.add(lamp);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),
  new THREE.MeshStandardMaterial({color:0xaeb1aa,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
scene.add(new THREE.GridHelper(280,28,0x8b9791,0xb4bbb5));
const doorProp=new THREE.Group();
const panel=new THREE.Mesh(new THREE.BoxGeometry(3,37,23),
  new THREE.MeshStandardMaterial({color:0x998262,roughness:.85}));
panel.position.set(28,18.5,0);doorProp.add(panel);
const knob=new THREE.Mesh(new THREE.BoxGeometry(3.4,2.4,2.4),
  new THREE.MeshStandardMaterial({color:0xd6c28e}));
knob.position.set(25.5,20,8);doorProp.add(knob);
scene.add(doorProp);
const operator=choose<HTMLSelectElement>('operator'),
  weapon=choose<HTMLSelectElement>('weapon'),
  injury=choose<HTMLSelectElement>('injury'),
  diagnostic=choose<HTMLSelectElement>('diagnosticLayer'),
  timeline=choose<HTMLInputElement>('timeline'),
  timeOutput=choose<HTMLOutputElement>('timestamp'),
  diagnosticText=choose<HTMLOutputElement>('diagnosticText'),
  playPause=choose<HTMLButtonElement>('playPause'),
  loopButton=choose<HTMLButtonElement>('loopTrack');
let rig:OperatorRig|null=null,track:LabTrack='idle';
let cache=new LabMotionCache(track);
let clock=0,last=performance.now(),rate=1,playing=true,loop=true;
let view='iso',cameraFollow={x:0,z:0};
const debug=new THREE.Group();scene.add(debug);
const markerColors=[0xf1b77d,0x7cbbae,0xf2d88b,0xa0a8df];
const markers=Array.from({length:8},(_,i)=>{
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1.45,9,7),
    new THREE.MeshBasicMaterial({color:markerColors[i%4],
      depthTest:false}));
  debug.add(mesh);return mesh;
});
const guideGeometry=new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]);
const guide=new THREE.Line(guideGeometry,
  new THREE.LineBasicMaterial({color:0xe2a96e,depthTest:false}));
debug.add(guide);
const supportBoxes=[0,1].map(()=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(12,1,13),
    new THREE.MeshBasicMaterial({color:0x5eaa9f,wireframe:true,
      depthTest:false}));
  debug.add(mesh);return mesh;
});
const build=()=>{
  if(rig){scene.remove(rig.root);rig.dispose();}
  rig=createOperatorRig(operator.value,operator.value==='hostile'?'red':'blue');
  scene.add(rig.root);
};
operator.addEventListener('change',build);
function fit(next='iso'){
  view=next;
  const center=rig?.root.position??new THREE.Vector3();
  const dx=next==='front'?75:next==='top'?.01:next==='side'?0:65;
  const dz=next==='side'?75:next==='top'?.01:next==='front'?0:68;
  camera.position.set(center.x+dx,next==='top'?115:next==='front'||next==='side'?16:48,
    center.z+dz);
  camera.zoom=1.4;camera.updateProjectionMatrix();
  control.target.set(center.x,16,center.z);control.update();
  cameraFollow={x:center.x,z:center.z};
}
function chooseTrack(next:LabTrack){
  track=next;cache=new LabMotionCache(next);clock=0;playing=true;
  for(const b of document.querySelectorAll<HTMLButtonElement>('[data-pose]'))
    b.setAttribute('aria-pressed',String(b.dataset.pose===next));
  playPause.textContent='PAUSE';
}
document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button=>
  button.addEventListener('click',()=>chooseTrack(button.dataset.pose as LabTrack)));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>
  button.addEventListener('click',()=>fit(button.dataset.view)));
choose<HTMLButtonElement>('resetCamera').addEventListener('click',()=>fit());
choose<HTMLButtonElement>('diagnostics').addEventListener('click',()=>{
  diagnostic.value=diagnostic.value==='off'?'anchors':'off';
  choose<HTMLButtonElement>('diagnostics').setAttribute(
    'aria-pressed',String(diagnostic.value!=='off'));
});
diagnostic.addEventListener('change',()=>choose<HTMLButtonElement>(
  'diagnostics').setAttribute('aria-pressed',
  String(diagnostic.value!=='off')));
choose<HTMLButtonElement>('slowMotion').addEventListener('click',e=>{
  rate=rate===.25?1:.25;
  (e.currentTarget as HTMLButtonElement).setAttribute(
    'aria-pressed',String(rate<1));
});
playPause.addEventListener('click',()=>{
  playing=!playing;playPause.textContent=playing?'PAUSE':'PLAY';
});
loopButton.addEventListener('click',()=>{
  loop=!loop;loopButton.setAttribute('aria-pressed',String(loop));
});
choose<HTMLButtonElement>('restartTrack').addEventListener('click',()=>{
  clock=0;playing=true;playPause.textContent='PAUSE';
});
choose<HTMLButtonElement>('stepFrame').addEventListener('click',()=>{
  playing=false;playPause.textContent='PLAY';
  clock=Math.min(TRACK_DURATION,clock+1/60);
});
timeline.addEventListener('input',()=>{
  playing=false;playPause.textContent='PLAY';
  clock=Number(timeline.value)/1000;
});
function resize(){
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);
  const half=36,aspect=w/h;
  camera.left=-half*aspect;camera.right=half*aspect;
  camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
const world=new THREE.Vector3(),world2=new THREE.Vector3();
function showDiagnostics(){
  if(!rig)return;
  const layer=diagnostic.value;
  debug.visible=layer!=='off';
  if(!debug.visible){diagnosticText.textContent='';return;}
  const sampled=cache.sample(clock),f=sampled.state.feet;
  const feet=sampled.feet;
  for(const marker of markers)marker.visible=false;
  for(const box of supportBoxes)box.visible=false;
  guide.visible=false;
  const put=(i:number,x:number,y:number,z:number)=>{
    markers[i].visible=true;markers[i].position.set(x,y,z);
  };
  if(layer==='anchors'||layer==='targets'||layer==='support'||
    layer==='polygon'){
    for(let i=0;i<2;i++){
      const point=layer==='targets'?f[i].swingTo:f[i].plantedAt;
      put(i,point.x,2,point.y);
    }
  }
  if(layer==='support'){
    supportBoxes.forEach((box,i)=>{
      box.visible=true;
      box.position.set(f[i].plantedAt.x,1,f[i].plantedAt.y);
      box.rotation.y=rig!.root.rotation.y;
    });
  }
  if(layer==='polygon'){
    const coords=guideGeometry.getAttribute('position') as
      THREE.BufferAttribute;
    const left=f[0].plantedAt,right=f[1].plantedAt;
    coords.setXYZ(0,left.x,2,left.y);
    coords.setXYZ(1,right.x,2,right.y);
    coords.setXYZ(2,rig.root.position.x,2,rig.root.position.z);
    coords.needsUpdate=true;guide.visible=true;
  }
  if(layer==='planes'||layer==='limits'){
    rig.root.updateMatrixWorld(true);
    for(let i=0;i<2;i++){
      rig.feet[i].upper.getWorldPosition(world);
      rig.feet[i].lower.getWorldPosition(world2);
      put(i,world2.x,world2.y,world2.z);
      rig.arms[i].lower.getWorldPosition(world);
      put(i+2,world.x,world.y,world.z);
    }
  }
  if(layer==='weapon'){
    rig.root.updateMatrixWorld(true);
    const g=weaponGrips(weapon.value as WeaponId);
    const coords=[
      [g.stockX,0,0],[g.primaryX,g.primaryY,1.8],
      [g.supportX,g.supportY,-1.6]
    ];
    for(let i=0;i<coords.length;i++){
      const p=rig.weapon.localToWorld(
        new THREE.Vector3(...coords[i]));
      put(i,p.x,p.y,p.z);
    }
  }
  const trouble=rig.feet.filter(x=>x.outOfReach).length+
    rig.arms.filter(x=>x.outOfReach).length;
  diagnosticText.textContent=[
    'TIME '+clock.toFixed(3)+' / '+TRACK_DURATION.toFixed(2),
    'LEFT '+feet[0].phase.toUpperCase()+'  RIGHT '+
      feet[1].phase.toUpperCase(),
    'SPEED '+sampled.motion.speed.toFixed(1)+
      ' · REACH FLAGS '+trouble,
    'CONTACTS '+feet.filter(x=>x.contact).length+
      ' · STEP EVENTS '+sampled.state.lastStepAt.toFixed(2),
    layer==='replay'?'DETERMINISTIC 60 Hz SOURCE · SEEK-SAFE':''
  ].filter(Boolean).join('\n');
}
function draw(){
  if(!rig)return;
  const {motion,feet}=cache.sample(clock);
  doorProp.visible=track==='door';
  rig.root.position.set(motion.x,0,motion.z);
  poseOperator(rig,{x:motion.x,z:motion.z,heading:motion.heading,
    travelYaw:motion.travelYaw,seconds:clock,stride:clock*40,
    velocity:motion.speed,posture:motion.posture,
    injury:Math.max(motion.injury,Number(injury.value)),
    weapon:weapon.value as WeaponId,
    reload:motion.reload,reloadDuration:1.8,
    lastDoorAt:motion.doorAt,
    doorPoint:track==='door'?{x:25.5,y:8}:undefined,
    lastThrowAt:motion.throwAt,
    down:motion.down||Number(injury.value)===3,
    surrender:false,aiming:motion.aim>.2,
    firing:false,turning:motion.turning,aimBlend:motion.aim,
    replayFeet:feet,deterministic:true,shotHeading:motion.heading},0);
  const dx=motion.x-cameraFollow.x,dz=motion.z-cameraFollow.z;
  camera.position.x+=dx;camera.position.z+=dz;
  control.target.x+=dx;control.target.z+=dz;
  cameraFollow={x:motion.x,z:motion.z};
  timeline.value=String(Math.round(clock*1000));
  timeOutput.textContent=clock.toFixed(2)+'s';
  showDiagnostics();
  canvas.dataset.track=track;
  canvas.dataset.time=clock.toFixed(3);
  canvas.dataset.contactCount=String(feet.filter(x=>x.contact).length);
  control.update();renderer.render(scene,camera);
}
function tick(now:number){
  const elapsed=Math.min(.05,Math.max(0,(now-last)/1000));
  last=now;
  if(playing){
    clock+=elapsed*rate;
    if(clock>=TRACK_DURATION){
      if(loop)clock%=TRACK_DURATION;
      else{clock=TRACK_DURATION;playing=false;playPause.textContent='PLAY';}
    }
  }
  draw();requestAnimationFrame(tick);
}
build();fit();resize();chooseTrack('idle');requestAnimationFrame(tick);
