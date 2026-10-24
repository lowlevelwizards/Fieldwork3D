import * as THREE from 'three';
import { TerrainWater } from './hydrology';
import { makeTerrainGeometry } from './terrain';
import { GRID_CELLS,localChannelProximity,terrainHeight } from './terrain-model';
import { mainRiverPosition, mainRiverStations } from './river-geography';
import {
  buildRiverRibbon, waterDepthForScenario,
  type RiverScenario,
} from './river-ribbon-model';
import { buildPondMeshes, makeReferencePond } from './river-pond-model';

type LabScenario=RiverScenario|'pond';
const scenarios:readonly LabScenario[]=[
  'dry','normal','high','flood','recession','pond','live',
];
const params=new URLSearchParams(window.location.search);
let scenario:LabScenario=scenarios.includes(params.get('scenario') as LabScenario)
  ?params.get('scenario') as LabScenario:'normal';
let debug=params.get('debug')==='1';
let overhead=params.get('view')==='overhead';
const canvas=document.querySelector<HTMLCanvasElement>('#riverCanvas');
const status=document.querySelector<HTMLElement>('#status');
const debugButton=document.querySelector<HTMLButtonElement>('#debug')!;
if(!canvas||!status||!debugButton)throw new Error('River lab missing UI');
const output=status;
const canvasView=canvas;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb8cdd0);
const renderer=new THREE.WebGLRenderer({
  canvas:canvasView,antialias:true,alpha:false,powerPreference:'low-power',
});
renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
scene.add(new THREE.HemisphereLight(0xe1f0f2,0x7d7c64,2.1));
const sun=new THREE.DirectionalLight(0xffe4b2,2.1);
sun.position.set(-5,12,-7);
scene.add(sun);
const geometry=makeTerrainGeometry();
const vertexColors=geometry.getAttribute('color') as THREE.BufferAttribute;
const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
const top=(GRID_CELLS+1)*(GRID_CELLS+1)+GRID_CELLS*GRID_CELLS;
for(let i=0;i<top;i++){
  const x=positions.getX(i),z=positions.getZ(i);
  const channel=localChannelProximity(x,z);
  const h=terrainHeight(x,z);
  const valley=.35+.65*channel;
  const lift=Math.max(0,h)*.06;
  vertexColors.setXYZ(i,
    .66-.065*valley+lift,
    .66+.032*valley+lift,
    .56-.018*valley+lift);
}
vertexColors.needsUpdate=true;
const ground=new THREE.Mesh(geometry,[
  new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,roughness:1,side:THREE.FrontSide,
  }),
  new THREE.MeshStandardMaterial({color:0x726858,roughness:1}),
]);
scene.add(ground);
const waterMaterial=new THREE.MeshStandardMaterial({
  color:0xffffff,vertexColors:true,transparent:true,
  depthTest:true,depthWrite:false,side:THREE.FrontSide,
  roughness:.44,metalness:0,
});
const riverMesh=new THREE.Mesh(new THREE.BufferGeometry(),waterMaterial);
const pondMesh=new THREE.Mesh(new THREE.BufferGeometry(),waterMaterial);
riverMesh.renderOrder=2;pondMesh.renderOrder=2;
riverMesh.frustumCulled=false;pondMesh.frustumCulled=false;
scene.add(riverMesh,pondMesh);
const debugLines=new THREE.Group();
debugLines.renderOrder=4;
scene.add(debugLines);
const camera=new THREE.OrthographicCamera(-7,7,7,-7,.1,90);
const orbit={yaw:Math.PI/4,zoom:1.0};
function updateCamera():void{
  const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight);
  const viewH=12/orbit.zoom,viewW=viewH*width/height;
  camera.left=-viewW/2;camera.right=viewW/2;
  camera.top=viewH/2;camera.bottom=-viewH/2;
  camera.updateProjectionMatrix();
  const d=overhead?21:23;
  const heightY=overhead?27:18;
  camera.position.set(d*Math.sin(orbit.yaw)*(overhead?.05:1),
    heightY,d*Math.cos(orbit.yaw)*(overhead?.05:1));
  camera.lookAt(0,-.05,0);
  camera.updateMatrixWorld();
}
function draw():void{updateCamera();renderer.render(scene,camera);}
function line(points:THREE.Vector3[],color:number):void{
  const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color,transparent:true,opacity:.90,depthTest:false,
    }));
  debugLines.add(mesh);
}
function clearLines():void{
  for(const child of [...debugLines.children]){
    const mesh=child as THREE.Line;
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    debugLines.remove(mesh);
  }
}
const live=new TerrainWater();
// A deterministic, *non-persistent* rain scenario. No simulation time
// advances during orbiting or screenshot capture.
for(let t=0;t<3;t+=.10)live.advance(5+t,.10,1);
const pondSample=makeReferencePond(new TerrainWater());

function meshFromData(
  mesh:THREE.Mesh,
  data:{position:number[];color:number[];normal:number[]},
):void{
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(data.color,4));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normal,3));
  mesh.geometry.dispose();mesh.geometry=g;
  mesh.visible=data.position.length>0;
}
function update():void{
  const current=scenario==='pond'?'normal':scenario;
  const river=buildRiverRibbon(current,live);
  meshFromData(riverMesh,river);
  pondMesh.visible=false;
  if(scenario==='pond'||scenario==='flood'){
    const pond=buildPondMeshes(pondSample);
    if(pond.triangles>0)meshFromData(pondMesh,pond);
  }
  clearLines();
  if(debug){
    const stations=mainRiverStations(terrainHeight,96);
    const center:THREE.Vector3[]=[],left:THREE.Vector3[]=[];
    const right:THREE.Vector3[]=[],levels:THREE.Vector3[]=[];
    for(const s of stations){
      const half=waterDepthForScenario(current,s.z,live);
      const centerPoint=mainRiverPosition(s.z,0);
      center.push(new THREE.Vector3(centerPoint.x,s.bedY+.012,centerPoint.z));
      const l=mainRiverPosition(s.z,-.46),r=mainRiverPosition(s.z,.46);
      left.push(new THREE.Vector3(l.x,terrainHeight(l.x,l.z)+.013,l.z));
      right.push(new THREE.Vector3(r.x,terrainHeight(r.x,r.z)+.013,r.z));
      levels.push(new THREE.Vector3(centerPoint.x,s.bedY+half+.03,centerPoint.z));
    }
    line(center,0xe89c36);line(left,0xa9865c);
    line(right,0xa9865c);line(levels,0x51c0f4);
  }
  debugLines.visible=debug;
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(b=>
    b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario)));
  debugButton.setAttribute('aria-pressed',String(debug));
  const widest=Math.max(...river.diagnostics.map(s=>s.widthM));
  output.textContent=scenario.toUpperCase()+
    ' · '+river.triangles+' connected triangles'+
    ' · MAX WET WIDTH '+widest.toFixed(2)+' m'+
    ' · MAX LEVEL STEP '+(river.maxTriangleHeightM*1000).toFixed(1)+' mm'+
    (scenario==='live'?' · REAL STORED LITRES '+live.totalLiters().toFixed(0)+' L':'')+
    (debug?' · ORANGE=AXIS  TAN=BANKS  BLUE=WATER SURFACE':'');
  const p=new URLSearchParams();
  p.set('scenario',scenario);p.set('view',overhead?'overhead':'oblique');
  if(debug)p.set('debug','1');
  history.replaceState({},'',window.location.pathname+'?'+p.toString());
  draw();
  document.documentElement.dataset.riverLabReady='true';
}
document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(b=>
  b.addEventListener('click',()=>{
    const next=b.dataset.scenario as LabScenario;
    if(scenarios.includes(next)){scenario=next;update();}
  }));
debugButton.addEventListener('click',()=>{debug=!debug;update();});
document.querySelector('#overhead')?.addEventListener('click',()=>{
  overhead=true;draw();
  update();
});
document.querySelector('#oblique')?.addEventListener('click',()=>{
  overhead=false;draw();
  update();
});
const activePointers=new Map<number,{x:number;y:number}>();
let dragX=0,lastPinch=0;
canvasView.addEventListener('pointerdown',e=>{
  canvasView.setPointerCapture(e.pointerId);
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  dragX=e.clientX;lastPinch=0;
});
canvasView.addEventListener('pointermove',e=>{
  if(!activePointers.has(e.pointerId))return;
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const pts=[...activePointers.values()];
  if(pts.length===1&&!overhead){
    orbit.yaw-=(e.clientX-dragX)*.008;dragX=e.clientX;draw();
  }else if(pts.length===2){
    const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
    if(lastPinch)orbit.zoom=clampZoom(orbit.zoom*dist/lastPinch);
    lastPinch=dist;draw();
  }
});
const release=(e:PointerEvent)=>{activePointers.delete(e.pointerId);lastPinch=0;};
canvasView.addEventListener('pointerup',release);
canvasView.addEventListener('pointercancel',release);
canvasView.addEventListener('wheel',e=>{
  e.preventDefault();orbit.zoom=clampZoom(orbit.zoom*(e.deltaY>0?.93:1.07));draw();
},{passive:false});
function clampZoom(v:number):number{return Math.max(.65,Math.min(3.3,v));}
window.addEventListener('resize',()=>{
  renderer.setSize(innerWidth,innerHeight,false);draw();
});
renderer.setSize(innerWidth,innerHeight,false);
update();
