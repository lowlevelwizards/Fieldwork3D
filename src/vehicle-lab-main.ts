import * as THREE from 'three';
import {VEHICLE_FAMILIES,VEHICLE_DIMENSIONS,VEHICLE_CONFIGURATIONS,VEHICLE_PAINTS,type VehicleFamily} from './worldgen/vehicle-catalog.ts';
import {acquireVehicleTemplate,createVehicleMaterial} from './worldgen/vehicle-visual.ts';
import {StaticVisualTemplateLibrary,type StaticVisualLease} from './rendering/fieldwork-visual-template-library.ts';
import type {Obstacle} from './breach-core.ts';
const select=(id:string)=>document.getElementById(id) as HTMLSelectElement;
const family=select('family'),configuration=select('configuration'),paint=select('paint'),condition=select('condition'),view=select('view'),count=select('count'),batch=select('batch'),footprint=select('footprint');
const canvas=document.getElementById('canvas') as HTMLCanvasElement,viewport=document.getElementById('viewport')!,output=document.getElementById('diagnostics')!;
function options(el:HTMLSelectElement,values:readonly string[]){el.replaceChildren(...values.map((v,i)=>new Option(v,String(i))));}
options(family,VEHICLE_FAMILIES);options(paint,['White','Silver','Charcoal','Black','Beige','Brown','Blue','Navy','Green','Olive','Red','Ochre']);
const selected=()=>VEHICLE_FAMILIES[Number(family.value)]??'sedan';
function updateConfigs(){options(configuration,VEHICLE_CONFIGURATIONS[selected()]);}
updateConfigs();
const scene=new THREE.Scene();scene.background=new THREE.Color(0x51564f);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,5000);
scene.add(new THREE.HemisphereLight(0xe4e6dd,0x77745e,2.1));
const key=new THREE.DirectionalLight(0xfff0d9,2);key.position.set(100,250,170);scene.add(key);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:0x666960,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.3;scene.add(ground);
const root=new THREE.Group();scene.add(root);
const cache=new StaticVisualTemplateLibrary(64),material=createVehicleMaterial();
const outlineMaterial=new THREE.LineBasicMaterial({color:0xd5bf81});
let leases:StaticVisualLease[]=[],outlineGeometries:THREE.BufferGeometry[]=[],instances:THREE.InstancedMesh[]=[];
let span=130,triangles=0,vehicleCount=0,mainMeshes=0;
function clear(){
 root.clear();for(const lease of leases)lease.release();leases=[];
 for(const g of outlineGeometries)g.dispose();outlineGeometries=[];
 for(const i of instances)i.dispose();instances=[];
}
function obstacle(id:VehicleFamily,index:number,x:number,z:number):Obstacle{
 const [w,h]=VEHICLE_DIMENSIONS[id];
 const cfg=Number(count.value)===6?0:Number(configuration.value);
 return {fixture:id,x,y:z,w,h,artVariant:(cfg%VEHICLE_CONFIGURATIONS[id].length)+(Number(paint.value)%VEHICLE_PAINTS.length)*VEHICLE_CONFIGURATIONS[id].length,
 artCondition:condition.value as Obstacle['artCondition'],id:'preview-'+index};
}
function rebuild(){
 clear();triangles=0;vehicleCount=Number(count.value);mainMeshes=0;
 const columns=Math.ceil(Math.sqrt(vehicleCount)),rows=Math.ceil(vehicleCount/columns);
 span=Math.max(130,columns*158,rows*88);
 const useBatch=batch.value==='instanced'&&vehicleCount!==6&&vehicleCount>1;
 const positions=Array.from({length:vehicleCount},(_,i)=>[(i%columns-(columns-1)/2)*158,(Math.floor(i/columns)-(rows-1)/2)*88] as const);
 if(useBatch){
  const lease=acquireVehicleTemplate(cache,obstacle(selected(),0,0,0),0,()=>material)!;leases.push(lease);
  const mesh=lease.root.children[0] as THREE.Mesh;
  const instanced=new THREE.InstancedMesh(mesh.geometry,material,vehicleCount);
  const transform=new THREE.Matrix4();
  positions.forEach(([x,z],i)=>instanced.setMatrixAt(i,transform.makeTranslation(x,0,z)));
  instanced.instanceMatrix.needsUpdate=true;instanced.computeBoundingSphere();root.add(instanced);instances.push(instanced);
  triangles=mesh.geometry.getAttribute('position').count/3*vehicleCount;mainMeshes=1;
 }else for(let i=0;i<vehicleCount;i++){
  const id=vehicleCount===6?VEHICLE_FAMILIES[i]:selected(),[x,z]=positions[i];
  const lease=acquireVehicleTemplate(cache,obstacle(id,i,x,z),0,()=>material)!;leases.push(lease);
  const mesh=lease.root.children[0] as THREE.Mesh;triangles+=mesh.geometry.getAttribute('position').count/3;
  root.add(lease.root);mainMeshes++;
 }
 if(footprint.value==='on')positions.forEach(([x,z],i)=>{
  const id=vehicleCount===6?VEHICLE_FAMILIES[i]:selected(),[w,d,h]=VEHICLE_DIMENSIONS[id];
  const b=new THREE.BoxGeometry(w,h,d),g=new THREE.EdgesGeometry(b);b.dispose();outlineGeometries.push(g);
  const line=new THREE.LineSegments(g,outlineMaterial);line.position.set(x,h/2,z);root.add(line);
 });
 draw();
}
function draw(){
 const width=Math.max(1,viewport.clientWidth),height=Math.max(1,viewport.clientHeight),aspect=width/height;
 renderer.setSize(width,height,false);
 const extent=span*(vehicleCount===1?.64:.76),halfX=extent*Math.max(1,aspect),halfY=extent*Math.max(1,1/aspect);
 camera.left=-halfX;camera.right=halfX;camera.top=halfY;camera.bottom=-halfY;
 camera.up.set(0,1,0);
 switch(view.value){
  case 'side':camera.position.set(0,23,1000);break;
  case 'front':camera.position.set(1000,23,0);break;
  case 'rear':camera.position.set(-1000,23,0);break;
  case 'top':camera.position.set(0,1000,0);camera.up.set(0,0,-1);break;
  default:camera.position.set(690,850,690);
 }
 camera.lookAt(0,vehicleCount===1&&view.value!=='top'?18:0,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
 output.textContent=vehicleCount+' vehicles · '+triangles.toLocaleString()+' vehicle triangles · '+mainMeshes+' vehicle draws · '+renderer.info.render.calls+' total draws · '+cache.stats().geometries+' cached geometries';
}
family.addEventListener('change',()=>{updateConfigs();rebuild();});
for(const el of [configuration,paint,condition,count,batch,footprint])el.addEventListener('change',rebuild);
view.addEventListener('change',draw);new ResizeObserver(draw).observe(viewport);rebuild();
window.addEventListener('pagehide',()=>{clear();cache.clear();material.dispose();outlineMaterial.dispose();ground.geometry.dispose();ground.material.dispose();renderer.dispose();},{once:true});
