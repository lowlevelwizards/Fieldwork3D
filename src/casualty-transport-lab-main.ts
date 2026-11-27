import * as THREE from 'three';
import {createOperatorRig,poseOperator} from './breach-operator-rig.ts';
import type {OperatorPose} from './breach-operator-animation-contract.ts';
import {initialEquipmentLoadout} from './equipment-loadouts.ts';
import {civilianSharedEquipment} from './breach-civilian-visuals.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from './equipment-weapon-assemblies.ts';
import {loadedCarrierHeading} from './breach-loaded-carrier-pose.ts';
import {patientTransportContacts} from './breach-transport-patient-pose.ts';
import {buildTransportLabTrack,labObstacles,type LabScenario} from './casualty-transport-lab-track.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const select=(id:string)=>el<HTMLSelectElement>(id);
const stage=el('stage'),slider=el<HTMLInputElement>('time'),detail=el('detail');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x34473f);
const camera=new THREE.OrthographicCamera(-100,100,70,-70,.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio));stage.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf6f0da,0x52645b,2.2));
const light=new THREE.DirectionalLight(0xffe2b3,2.3);light.position.set(-55,100,70);scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:0x596b60}));
floor.rotation.x=-Math.PI/2;scene.add(floor);
const grid=new THREE.GridHelper(400,40,0x708275,0x65766b);grid.position.y=.08;scene.add(grid);
const carrier=createOperatorRig('ct-lab-carrier','blue',true);scene.add(carrier.root);
let patient=createOperatorRig('ct-lab-patient','blue',true);scene.add(patient.root);
const obstacles=new THREE.Group();scene.add(obstacles);
const material=new THREE.MeshStandardMaterial({color:0x8e806b});
const markerGeometry=new THREE.SphereGeometry(1.2,8,6),markerMaterial=new THREE.MeshBasicMaterial({color:0xffc354});
const markers=[0,1].map(()=>{const mesh=new THREE.Mesh(markerGeometry,markerMaterial);scene.add(mesh);return mesh;});
const lines=[0,1].map(()=>{const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffc354}));scene.add(line);return line;});
const kit=initialEquipmentLoadout();
const base:OperatorPose={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,turning:0,deterministic:true,poseDiagnostics:true};
let track=buildTransportLabTrack('drag','straight'),frame=0,playing=false,last=0,acc=0,dirty=true;
const mode=()=>select('mode').value as TransportMode;
const scenario=()=>select('scenario').value as LabScenario;
function rebuild(){
 playing=false;el('play').textContent='PLAY';frame=0;
 track=buildTransportLabTrack(mode(),scenario());slider.max=String(track.length-1);
 for(const object of [...obstacles.children]){obstacles.remove(object);(object as THREE.Mesh).geometry.dispose();}
 for(const o of labObstacles(scenario())){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(o.w,22,o.h),material);
  mesh.position.set(o.x+o.w/2,11,o.y+o.h/2);obstacles.add(mesh);
 }
 dirty=true;
}
function draw(){
 const t=track[frame],m=mode(),sling=select('sling').value,neutral=select('subject').value==='civilian';
 const heading=t.pose?loadedCarrierHeading(m,t.carrier,t.patient,t.heading):t.heading;
 const config=setWeaponAttachment(initialWeaponConfiguration('carbine'),'sling',sling);
 carrier.root.position.set(t.carrier.x,0,t.carrier.y);
 patient.root.position.set(t.patient.x,0,t.patient.y);
 const busy=t.stage!=='released',supported=sling!=='sling-none';
 const retentionMode=sling==='sling-single-point'?'front-slung':'side-slung';
 poseOperator(patient,{...base,x:t.patient.x,z:t.patient.y,heading:Math.PI,seconds:t.time,down:true,downProgress:1,injury:3,
  unarmedPreview:neutral,worldWeaponReleased:!neutral,equipment:neutral?civilianSharedEquipment():kit,transportPatient:t.pose},0);
 poseOperator(carrier,{...base,x:t.carrier.x,z:t.carrier.y,heading,travelYaw:t.heading,seconds:t.time,
  velocity:t.speed,stride:t.stride,equipment:kit,weaponConfiguration:config,gait:'walk',
  primaryGrounded:busy&&!supported,retentionTransition:busy&&supported?{mode:retentionMode,desired:retentionMode,weight:1}:undefined,
  transportContact:t.contact,loadedTransport:t.pose?{mode:m,patientId:'patient',patient:t.patient,heading:t.heading,patientPose:t.pose}:undefined},0);
 const points=t.pose?patientTransportContacts(t.pose,heading):null;
 const show=!!points&&el<HTMLInputElement>('contacts').checked;
 const errors:number[]=[];
 for(let i=0;i<2;i++){
  markers[i].visible=lines[i].visible=show;
  if(points){const wrist=carrier.arms[i].hand.getWorldPosition(new THREE.Vector3());errors.push(wrist.distanceTo(points[i]));
   markers[i].position.copy(points[i]);const pos=lines[i].geometry.getAttribute('position');pos.setXYZ(0,wrist.x,wrist.y,wrist.z);pos.setXYZ(1,points[i].x,points[i].y,points[i].z);pos.needsUpdate=true;lines[i].geometry.computeBoundingSphere();}
 }
 const focus=new THREE.Vector3((t.carrier.x+t.patient.x)/2,t.pose?.mode==='carry'?21:12,(t.carrier.y+t.patient.y)/2);
 const view=select('view').value;
 const offset=view==='side'?new THREE.Vector3(0,30,145):view==='top'?new THREE.Vector3(0,170,.01):new THREE.Vector3(92,95,110);
 camera.position.copy(focus).add(offset);camera.lookAt(focus);
 const width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight),aspect=width/height;
 const vertical=t.pose?.mode==='carry'?(aspect<1?48:35):(aspect<1?82:62);camera.left=-vertical*aspect;camera.right=vertical*aspect;camera.top=vertical;camera.bottom=-vertical;camera.updateProjectionMatrix();
 renderer.setSize(width,height,false);renderer.render(scene,camera);
 slider.value=String(frame);detail.textContent=t.stage.toUpperCase()+' · '+t.time.toFixed(2)+'s / FRAME '+frame+'\nSPEED '+t.speed.toFixed(1)+' · SEPARATION '+Math.hypot(t.carrier.x-t.patient.x,t.carrier.y-t.patient.y).toFixed(1)+' · BLOCKED '+t.blocked+'\nWRIST ERROR '+(errors.length?errors.map(e=>e.toFixed(2)).join(' / '):'—');
}
for(const id of ['mode','scenario'])select(id).onchange=rebuild;
for(const id of ['sling','view'])select(id).onchange=()=>{dirty=true;};
select('subject').onchange=()=>{scene.remove(patient.root);patient.dispose();patient=createOperatorRig('ct-lab-patient',select('subject').value==='red'?'red':'blue',true);scene.add(patient.root);dirty=true;};
el('play').onclick=()=>{playing=!playing;el('play').textContent=playing?'PAUSE':'PLAY';if(frame===track.length-1)frame=0;dirty=true;};
el('reset').onclick=rebuild;el('step').onclick=()=>{playing=false;el('play').textContent='PLAY';frame=Math.min(frame+1,track.length-1);dirty=true;};
for(const id of ['pickup','loaded','release'])el(id).onclick=()=>{playing=false;el('play').textContent='PLAY';frame=Math.max(0,track.findIndex(t=>t.stage===id));dirty=true;};
slider.oninput=()=>{playing=false;el('play').textContent='PLAY';frame=Number(slider.value);dirty=true;};
el<HTMLInputElement>('contacts').onchange=()=>{dirty=true;};
new ResizeObserver(()=>{dirty=true;}).observe(stage);
function animate(now:number){requestAnimationFrame(animate);if(playing){acc+=Math.min(.1,(now-last)/1000);while(acc>=1/60){acc-=1/60;frame=Math.min(frame+1,track.length-1);dirty=true;}if(frame===track.length-1){playing=false;el('play').textContent='PLAY';}}else acc=0;last=now;if(dirty){dirty=false;draw();}}
rebuild();requestAnimationFrame(animate);
