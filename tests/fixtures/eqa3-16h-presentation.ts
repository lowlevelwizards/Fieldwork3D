/** Isolated, test-only THREE scene: genuine rig/presentation functions with
 * scripted actor states. No game combat, fog, AI or navigation is simulated.
 * This permits repeatable camera-scale pose comparisons without changing
 * any production UI, world, or authorized player orders.
 */
import * as THREE from 'three';
import {createCivilian} from '../../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig}
 from '../../src/breach-civilian-visuals.ts';
import {createOperatorRig,poseOperator}
 from '../../src/breach-operator-rig.ts';
import {hostilePhysicalityAt}
 from '../../src/breach-hostile-physicality.ts';

type PoseInfo={name:string;kind:'civilian'|'hostile';headYaw:number;
 headPitch:number;visible:boolean};
const canvas=document.getElementById('frame') as HTMLCanvasElement;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x37413b);
scene.add(new THREE.HemisphereLight(0xf0f2e7,0x525451,2.2));
const key=new THREE.DirectionalLight(0xfff0d7,2.5);
key.position.set(-200,350,280);scene.add(key);
const renderer=new THREE.WebGLRenderer({
 canvas,antialias:true,preserveDrawingBuffer:true,
 powerPreference:'low-power'
});
renderer.setPixelRatio(1);renderer.setSize(1100,660,false);
renderer.shadowMap.enabled=false;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
const camera=new THREE.OrthographicCamera(-315,315,189,-189,1,2500);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(580,340),
 new THREE.MeshStandardMaterial({color:0x58655c,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.5;scene.add(ground);
const cases=[
 {name:'CALM / IDLE',state:'routine',since:0,velocity:0},
 {name:'HEARD / ATTENTIVE',state:'attentive',since:3.4,velocity:0,heard:true},
 {name:'ALARM / FLINCH',state:'startled',since:3.82,velocity:0,flinch:true},
 {name:'FROZEN / GUARD',state:'frozen',since:3.5,velocity:0},
 {name:'HIDING / LOW',state:'hiding',since:2.0,velocity:0},
 {name:'FLEE / RUN',state:'fleeing',since:3.0,velocity:66},
 {name:'SECURE / KNEEL',state:'compliant',since:2.9,velocity:0,contact:true},
 {name:'RESTRAINED',state:'compliant',since:2.0,velocity:0,restrained:true},
 {name:'FOLLOW / WALK',state:'escorted',since:2.8,velocity:35},
 {name:'INJURED',state:'wounded',since:2.0,velocity:0,injured:true}
] as const;
const hostiles=[
 {name:'HOSTILE / IDLE',alert:'idle',heard:false,suppression:0,aim:0,velocity:0},
 {name:'HOSTILE / HEARD',alert:'investigating',heard:true,suppression:0,aim:0,velocity:0},
 {name:'HOSTILE / AIM',alert:'engaging',heard:true,suppression:.8,aim:.95,velocity:0},
 {name:'HOSTILE / COVER',alert:'cover',heard:false,suppression:.9,aim:0,velocity:0},
 {name:'HOSTILE / RETREAT',alert:'retreat',heard:true,suppression:.9,aim:0,velocity:25}
] as const;
const reports:PoseInfo[]=[];
for(let i=0;i<cases.length;i++){
 const input=cases[i];
 const c=createCivilian({
  id:'audit:civilian:'+i,role:'visitor',persona:'steady',
  activity:'idle',position:{x:(i%5-2)*108,y:(Math.floor(i/5)-1)*108},
  heading:0,roomId:'audit',appearanceSeed:120+i*11
 });
 c.state=input.state;
 c.stateSince=input.since;c.velocity=input.velocity;
 if('heard' in input&&input.heard){
  c.lastEvidenceAt=3.8;c.lastEvidenceId='audio/271';
  c.threatEstimate={x:c.p.x+20,y:c.p.y+100};
 }
 if('flinch' in input&&input.flinch)c.lastFlinchAt=3.8;
 if('contact' in input&&input.contact){
  c.lastContactAt=3.85;c.lastContactPoint={x:c.p.x+10,y:c.p.y+60};
 }
 if('restrained' in input&&input.restrained)c.restrained=true;
 if('injured' in input&&input.injured){c.health=1;c.injuryStage=1;}
 const rig=createCivilianRig(c,true);
 updateCivilianRig(rig,c,4);
 scene.add(rig.root);
 reports.push({name:input.name,kind:'civilian',
  headYaw:rig.character.head.rotation.y,headPitch:rig.character.head.rotation.x,
  visible:rig.root.visible});
}
for(let i=0;i<hostiles.length;i++){
 const input=hostiles[i],x=(i-2)*108,z=108;
 const state={
  side:'red' as const,p:{x,y:z},heading:0,health:2,
  surrendered:false,alert:input.alert,aim:input.aim,
  velocity:input.velocity,reload:0,suppression:input.suppression,
  lastNoiseAt:input.heard?3.8:-100,
  heard:input.heard?{x:x+20,y:z+95}:null,contact:null
 };
 const rig=createOperatorRig('audit:hostile:'+i,'red',true);
 const poseSeconds=4;
 poseOperator(rig,{
  x,z,heading:0,velocity:state.velocity,seconds:poseSeconds,
  stride:state.velocity>5?.3:0,
  posture:'stand',injury:0,weapon:'carbine',
  reload:0,reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:state.aim>.20,firing:false,
  turning:0,deterministic:true,
  poseDiagnostics:false,aimBlend:state.aim
 } as Parameters<typeof poseOperator>[1],0);
 const physical=hostilePhysicalityAt(
  state as Parameters<typeof hostilePhysicalityAt>[0],poseSeconds);
 rig.head.rotation.y+=physical.headYaw;
 rig.head.rotation.x+=physical.headPitch;
 rig.root.position.set(x,0,z);
 scene.add(rig.root);
 reports.push({name:input.name,kind:'hostile',
  headYaw:rig.head.rotation.y,headPitch:rig.head.rotation.x,
  visible:rig.root.visible});
}
(document.getElementById('labels') as HTMLElement).replaceChildren(
 ...reports.map(r=>{
  const span=document.createElement('span');span.textContent=r.name;return span;
 }));
const target=new THREE.Vector3(0,10,0);
function render(view:'iso'|'overhead'){
 if(view==='overhead'){
  camera.position.set(0,650,1);camera.up.set(0,0,-1);
 }else{
  camera.position.set(125,360,560);camera.up.set(0,1,0);
 }
 camera.lookAt(target);camera.updateProjectionMatrix();
 renderer.render(scene,camera);
 const gl=renderer.getContext();
 const {width,height}=canvas;
 const buf=new Uint8Array(4*width*height);
 gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,buf);
 // Raw framebuffer coverage (not screenshots alone): verify actual GPU
 // draw and enough pixels differ from the ground/background.
 let occupancy=0;
 for(let i=0;i<buf.length;i+=4){
  const r=buf[i],g=buf[i+1],b=buf[i+2];
  if(r>g*1.13||b>g*1.18||r+g+b>590)occupancy++;
 }
 const poseFinite=reports.every(r=>r.visible&&Number.isFinite(r.headYaw)&&
  Number.isFinite(r.headPitch)&&Math.abs(r.headYaw)<1.2);
 const stats={view,drawCalls:renderer.info.render.calls,
  triangles:renderer.info.render.triangles,
  occupancy,poseFinite,actors:reports.length,
  headEvidence:reports.filter(x=>Math.abs(x.headYaw)>.02).length,
  guarding:reports.filter(x=>Math.abs(x.headPitch)>.02).length};
 document.body.dataset.eqa316Review=JSON.stringify(stats);
 document.body.dataset.eqa316Ready='true';
 return stats;
}
const interfaceWindow=window as typeof window&{
 __eqa316?:{render:typeof render;reports:PoseInfo[]}
};
interfaceWindow.__eqa316={render,reports};
render('iso');
