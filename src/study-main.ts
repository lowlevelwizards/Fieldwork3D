import * as THREE from 'three';
import {StudyWorld,groundHeight,roadX,walkable} from './study-world.ts';
import {StudySoldier} from './study-soldier.ts';

const canvas=document.querySelector<HTMLCanvasElement>('#studyCanvas');
const help=document.querySelector<HTMLElement>('#helpPanel');
const helpButton=document.querySelector<HTMLButtonElement>('#helpButton');
const closeHelp=document.querySelector<HTMLButtonElement>('#closeHelp');
const crouchButton=document.querySelector<HTMLButtonElement>('#crouchButton');
const stanceLabel=document.querySelector<HTMLElement>('#stanceLabel');
const stateLabel=document.querySelector<HTMLElement>('#stateLabel');
const stick=document.querySelector<HTMLElement>('#joystick');
const stickKnob=document.querySelector<HTMLElement>('#joystickKnob');
if(!canvas||!help||!helpButton||!closeHelp||!crouchButton||
  !stanceLabel||!stateLabel||!stick||!stickKnob)
  throw new Error('Art-study controls missing');
const ui={canvas,help,helpButton,closeHelp,crouchButton,stanceLabel,
  stateLabel,stick,stickKnob};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x728078);
scene.fog=new THREE.FogExp2(0x819087,.0078);
const renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,
  powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.setClearColor(0x6f7d71,1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.13;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xd9ddc9,0x464c3f,1.75));
const sun=new THREE.DirectionalLight(0xf0dcac,2.45);
sun.position.set(-15,36,19);
sun.castShadow=true;
sun.shadow.mapSize.set(1536,1536);
sun.shadow.camera.left=-37;sun.shadow.camera.right=37;
sun.shadow.camera.top=40;sun.shadow.camera.bottom=-40;
sun.shadow.camera.near=1;sun.shadow.camera.far=125;
sun.shadow.normalBias=.017;sun.shadow.bias=-.00018;
scene.add(sun);
const world=new StudyWorld(scene);
const soldier=new StudySoldier(scene);

let crouch=false;
const start={x:roadX(10),z:10};
const player={
  x:start.x,z:start.z,vx:0,vz:0,destination:null as {x:number;z:number}|null,
};
soldier.update(player.x,player.z,0,0,false,1/60);
const camera=new THREE.OrthographicCamera(-12,12,15,-15,.1,300);
const target=new THREE.Vector3(player.x-6.0,0,player.z-8.5);
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
let yaw=.58,elevation=THREE.MathUtils.degToRad(56),height=31.5;
let cameraReady=false,previous=performance.now();
const keys=new Set<string>();
const movement=new Set(['KeyW','KeyA','KeyS','KeyD',
  'ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
type Contact={id:number;x:number;y:number;initialX:number;initialY:number;
  oldX:number;oldY:number;role:'move'|'view';type:string;moved:boolean};
const contacts=new Map<number,Contact>();
let pinchDist=0;
const stickOrigin={x:0,y:0};
let stickAxis={x:0,y:0};
function resize(){
  const aspect=innerWidth/Math.max(1,innerHeight);
  // Keep a human figure readable on a tall phone; no kilometre survey.
  height=THREE.MathUtils.clamp(innerWidth<570?30:32,27,35);
  camera.top=height/2;camera.bottom=-height/2;
  camera.left=-height*aspect/2;camera.right=height*aspect/2;
  camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);
}
function orbitCamera(dx:number,dy:number){
  yaw-=dx*.0038;
  elevation=THREE.MathUtils.clamp(elevation+dy*.0027,
    THREE.MathUtils.degToRad(42),THREE.MathUtils.degToRad(68));
}
function updateCamera(dt:number){
  // The camera follows the person but composes the road and farmhouse
  // ahead. It has no remote tactical pan or overhead survey.
  const aheadX=player.x-6.0,aheadZ=player.z-8.5;
  const alpha=cameraReady?1-Math.exp(-3.9*dt):1;
  target.x+=alpha*(aheadX-target.x);
  target.z+=alpha*(aheadZ-target.z);
  target.y+=alpha*(groundHeight(target.x,target.z)+.7-target.y);
  const radius=47;
  camera.position.set(target.x+Math.sin(yaw)*Math.cos(elevation)*radius,
    target.y+Math.sin(elevation)*radius,
    target.z+Math.cos(yaw)*Math.cos(elevation)*radius);
  camera.lookAt(target);camera.updateMatrixWorld();
  cameraReady=true;
}
function screenMovement(x:number,y:number){
  return {x:x*Math.cos(yaw)-y*Math.sin(yaw),
    z:-x*Math.sin(yaw)-y*Math.cos(yaw)};
}
function cursorToWorld(clientX:number,clientY:number):{x:number;z:number}|null{
  const rect=ui.canvas.getBoundingClientRect();
  mouse.set((clientX-rect.left)/rect.width*2-1,
    1-(clientY-rect.top)/rect.height*2);
  raycaster.setFromCamera(mouse,camera);
  const hit=raycaster.intersectObject(world.ground,false)[0];
  return hit?{x:hit.point.x,z:hit.point.z}:null;
}
function walkTo(clientX:number,clientY:number){
  const next=cursorToWorld(clientX,clientY);
  if(next&&walkable(next.x,next.z))player.destination=next;
}
function toggleCrouch(){
  crouch=!crouch;
  ui.crouchButton.setAttribute('aria-pressed',String(crouch));
  ui.stanceLabel.textContent=crouch?'STAND':'CROUCH';
}
function setHelp(open:boolean){
  ui.help.hidden=!open;
  ui.helpButton.setAttribute('aria-expanded',String(open));
  keys.clear();player.destination=null;stickAxis={x:0,y:0};
  ui.stick.classList.remove('visible');
  contacts.clear();
}
ui.helpButton.addEventListener('click',()=>setHelp(ui.help.hidden));
ui.closeHelp.addEventListener('click',()=>setHelp(false));
ui.crouchButton.addEventListener('click',toggleCrouch);
window.addEventListener('keydown',e=>{
  if(movement.has(e.code)){keys.add(e.code);e.preventDefault();}
  if(e.code==='KeyC'&&!e.repeat){toggleCrouch();e.preventDefault();}
  if(e.code==='KeyR'&&!e.repeat){
    yaw=.58;elevation=THREE.MathUtils.degToRad(56);e.preventDefault();
  }
  if(e.code==='Escape')setHelp(false);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
function clearMotion(){
  keys.clear();contacts.clear();stickAxis={x:0,y:0};
  ui.stick.classList.remove('visible');pinchDist=0;
}
window.addEventListener('blur',clearMotion);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)clearMotion();
});
ui.canvas.addEventListener('contextmenu',e=>e.preventDefault());
ui.canvas.addEventListener('pointerdown',e=>{
  if(!ui.help.hidden)return;
  e.preventDefault();
  ui.canvas.setPointerCapture(e.pointerId);
  const rect=ui.canvas.getBoundingClientRect();
  const leftTouch=e.pointerType!=='mouse'&&e.clientX-rect.left<rect.width*.48&&
    e.clientY-rect.top>rect.height*.39;
  const role=leftTouch?'move':'view';
  const contact:Contact={id:e.pointerId,x:e.clientX,y:e.clientY,
    initialX:e.clientX,initialY:e.clientY,oldX:e.clientX,oldY:e.clientY,
    role,type:e.pointerType,moved:false};
  contacts.set(e.pointerId,contact);
  if(role==='move'){
    stickOrigin.x=e.clientX;stickOrigin.y=e.clientY;
    ui.stick.style.left=e.clientX+'px';ui.stick.style.top=e.clientY+'px';
    ui.stick.classList.add('visible');
    ui.stickKnob.style.transform='translate(-50%,-50%)';
  }
});
ui.canvas.addEventListener('pointermove',e=>{
  const p=contacts.get(e.pointerId);if(!p)return;
  e.preventDefault();
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  p.oldX=p.x;p.oldY=p.y;p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(p.x-p.initialX,p.y-p.initialY)>9)p.moved=true;
  if(p.role==='move'){
    const xx=p.x-stickOrigin.x,yy=p.y-stickOrigin.y;
    const length=Math.max(1,Math.hypot(xx,yy));
    const strength=THREE.MathUtils.clamp((length-8)/66,0,1);
    stickAxis={x:xx/length*strength,y:-yy/length*strength};
    const r=Math.min(length,47)/length;
    ui.stickKnob.style.transform='translate(calc(-50% + '+xx*r+
      'px),calc(-50% + '+yy*r+'px))';
    return;
  }
  const others=[...contacts.values()].filter(c=>c.role==='view');
  if(others.length===2){
    const d=Math.hypot(others[0].x-others[1].x,others[0].y-others[1].y);
    if(pinchDist>10&&d>10){
      const scale=d/pinchDist;
      height=THREE.MathUtils.clamp(height/scale,21,43);
      camera.top=height/2;camera.bottom=-height/2;
      camera.left=-height*innerWidth/innerHeight/2;camera.right=-camera.left;
      camera.updateProjectionMatrix();
    }
    pinchDist=d;
  }else if(p.moved)orbitCamera(dx,dy);
});
function finishPointer(e:PointerEvent,cancel:boolean){
  const p=contacts.get(e.pointerId);if(!p)return;
  if(!cancel&&!p.moved&&p.role==='view'&&contacts.size===1&&
    e.button!==2)walkTo(e.clientX,e.clientY);
  contacts.delete(e.pointerId);
  if(p.role==='move'){
    stickAxis={x:0,y:0};ui.stick.classList.remove('visible');
  }
  if(ui.canvas.hasPointerCapture(e.pointerId))
    ui.canvas.releasePointerCapture(e.pointerId);
  if(contacts.size<2)pinchDist=0;
}
ui.canvas.addEventListener('pointerup',e=>finishPointer(e,false));
ui.canvas.addEventListener('pointercancel',e=>finishPointer(e,true));
ui.canvas.addEventListener('lostpointercapture',e=>finishPointer(e,true));
ui.canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  height=THREE.MathUtils.clamp(height*Math.exp(e.deltaY*.0007),21,43);
  camera.top=height/2;camera.bottom=-height/2;
  camera.left=-height*innerWidth/innerHeight/2;camera.right=-camera.left;
  camera.updateProjectionMatrix();
},{passive:false});
window.addEventListener('resize',()=>{resize();updateCamera(0);});
function updateActor(dt:number){
  const x=(Number(keys.has('KeyD')||keys.has('ArrowRight'))-
    Number(keys.has('KeyA')||keys.has('ArrowLeft')))+stickAxis.x;
  const y=(Number(keys.has('KeyW')||keys.has('ArrowUp'))-
    Number(keys.has('KeyS')||keys.has('ArrowDown')))+stickAxis.y;
  const axisLength=Math.hypot(x,y);
  let wanted={x:0,z:0};
  if(axisLength>.06){
    const magnitude=Math.min(axisLength,1);
    wanted=screenMovement(x/axisLength*magnitude,y/axisLength*magnitude);
    player.destination=null;
  }else if(player.destination){
    const dx=player.destination.x-player.x,dz=player.destination.z-player.z;
    const d=Math.hypot(dx,dz);
    if(d<.28)player.destination=null;
    else wanted={x:dx/d,z:dz/d};
  }
  const speed=crouch?1.55:3.00;
  const lerp=1-Math.exp(-12*dt);
  player.vx+=(wanted.x*speed-player.vx)*lerp;
  player.vz+=(wanted.z*speed-player.vz)*lerp;
  const nx=player.x+player.vx*dt,nz=player.z+player.vz*dt;
  if(walkable(nx,nz)){player.x=nx;player.z=nz;}
  else{
    let moved=false;
    if(walkable(nx,player.z)){player.x=nx;moved=true;}else player.vx=0;
    if(walkable(player.x,nz)){player.z=nz;moved=true;}else player.vz=0;
    if(!moved)player.destination=null;
  }
  soldier.update(player.x,player.z,player.vx,player.vz,crouch,dt);
}
let statusBefore='';
function frame(now:number){
  const dt=Math.min(.06,Math.max(.001,(now-previous)/1000));previous=now;
  if(ui.help.hidden)updateActor(dt);
  updateCamera(dt);
  const status=(Math.hypot(player.vx,player.vz)>.2?'MOVING':'STILL')+
    (crouch?' / LOW':' / STANDING');
  if(status!==statusBefore){ui.stateLabel.textContent=status;statusBefore=status;}
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
resize();updateCamera(0);requestAnimationFrame(frame);
