/** WA0.3 isolated WebGL reference capture; no gameplay or persistence writes. */
import * as THREE from 'three';
import {addArsenalInspectionLighting} from './inspection-lighting.ts';
import {configureGraphicRendererOutput} from '../rendering/graphic-lighting-profile.ts';

import {refs,equipped,customEntries,construct,bounds} from './wa-art-models.ts';
const q=new URLSearchParams(location.search),platform=q.get('platform');
const selected=refs.filter(r=>r.platform==='ar15').concat(customEntries.filter(r=>r.custom?.partId==='ar-stock-moe'));
const holder=document.getElementById('sheet')!,status=document.getElementById('status')!;
const scene=new THREE.Scene();addArsenalInspectionLighting(scene);
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true});
configureGraphicRendererOutput(renderer);renderer.setPixelRatio(1);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);
const silhouette=new THREE.MeshBasicMaterial({color:0x242a25,side:THREE.DoubleSide});
const viewDefs=[
 ['side',[0,0,1],[0,1,0]],['reverse',[0,0,-1],[0,1,0]],
 ['three-quarter',[.42,.29,1],[0,1,0]],['top',[0,1,0],[0,0,-1]],
 ['front',[1,0,0],[0,1,0]],['silhouette',[0,0,1],[0,1,0]]
] as const;
const vector=(v:readonly number[])=>new THREE.Vector3(v[0],v[1],v[2]);
function orient(b:THREE.Box3,def:typeof viewDefs[number]){
 const center=b.getCenter(new THREE.Vector3());
 camera.position.copy(center).addScaledVector(vector(def[1]).normalize(),150);
 camera.up.copy(vector(def[2]));camera.lookAt(center);camera.updateMatrixWorld(true);
 const p=new THREE.Box3();
 for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])
  p.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 return p.getSize(new THREE.Vector3());
}
function shot(b:THREE.Box3,def:typeof viewDefs[number],width:number,height:number,span?:number){
 const projected=orient(b,def),aspect=width/height;
 const horizontal=span??Math.max(projected.x,projected.y*aspect)*1.16;
 camera.left=-horizontal/2;camera.right=horizontal/2;camera.top=horizontal/aspect/2;camera.bottom=-camera.top;
 camera.updateProjectionMatrix();renderer.setSize(width,height,false);
 const hidden:THREE.Object3D[]=[];
 if(def[0]==='silhouette')scene.traverseVisible(n=>{if(n instanceof THREE.Mesh&&(n.userData.weaponPixelArt||n.name.startsWith('family-art-'))){hidden.push(n);n.visible=false;}});
 scene.overrideMaterial=def[0]==='silhouette'?silhouette:null;
 try{renderer.render(scene,camera);}finally{for(const n of hidden)n.visible=true;scene.overrideMaterial=null;}
 const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles;
 const gl=renderer.getContext(),pixels=new Uint8Array(width*height*4);
 gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 let foreground=0,edge=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>12){
   foreground++;if(x===0||y===0||x===width-1||y===height-1)edge++;
  }
 }
 if(foreground<5||edge>0)throw Error('Blank or clipped capture '+def[0]+' '+width+'x'+height+' foreground='+foreground+' edge='+edge);
 const src=renderer.domElement.toDataURL('image/png');
 scene.overrideMaterial=null;
 return {src,width,height,horizontalSpan:horizontal,calls,triangles,foreground,edge};
}
const records:object[]=[];
async function generate(){
 if(!selected.length)throw Error('Unknown or empty cohort: '+platform);
 // Compute one fixed span across each scale cohort, independent of selected platform.
 const spans={primary:0,sidearm:0};
 for(const entry of refs){
  const m=construct(entry);try{
   const size=bounds(m.model).getSize(new THREE.Vector3());
   const cohort=entry.sidearm?'sidearm':'primary';
   spans[cohort]=Math.max(spans[cohort],Math.max(size.x,size.y*2)*1.16);
  }finally{m.cleanup();}
 }
 for(const entry of selected){
  const m=construct(entry);scene.add(m.model);
  try{
   const b=bounds(m.model),cohort=entry.sidearm?'sidearm':'primary';
   const row=document.createElement('section');row.className='preset';row.dataset.id=entry.id;
   const heading=document.createElement('h2');heading.textContent=entry.name+' — '+entry.id+' · '+entry.status;
   const views=document.createElement('div');views.className='views';row.append(heading,views);
   const panels:{name:string;metrics:Omit<ReturnType<typeof shot>,'src'>}[]=[];
   const add=(name:string,result:ReturnType<typeof shot>)=>{
    const {src,...metrics}=result;panels.push({name,metrics});
    const fig=document.createElement('figure');fig.dataset.view=name;
    const img=document.createElement('img');img.src=src;img.width=metrics.width;img.height=metrics.height;img.alt=entry.name+' '+name;
    const cap=document.createElement('figcaption');cap.textContent=name;
    fig.append(img,cap);views.append(fig);
   };
   if(false){
    for(const v of viewDefs.filter(v=>['side','reverse','three-quarter'].includes(v[0])))add(v[0]+'-fit',shot(b,v,480,240));
   }else{
    for(const v of viewDefs)add(v[0]+'-fit',shot(b,v,480,240));
    if(!entry.equipped)add('side-shared',shot(b,viewDefs[0],480,240,spans[cohort]));
    add('native-128',shot(b,viewDefs[0],128,64));
    add('native-64',shot(b,viewDefs[0],64,32));
   }
   const hidden:THREE.Mesh[]=[];
   m.model.traverseVisible(n=>{if(n instanceof THREE.Mesh&&!n.name.startsWith('family-stock-')){hidden.push(n);n.visible=false;}});
   try{
    const isolated=bounds(m.model);
    for(const v of viewDefs.filter(v=>['side','top','three-quarter','silhouette'].includes(v[0])))
     add('stock-'+v[0],shot(isolated,v,480,240));
   }finally{for(const n of hidden)n.visible=true;}
   holder.append(row);
   records.push({id:entry.id,platform:entry.platform,status:entry.status,cohort,accepted:m.accepted,custom:entry.custom?{partId:entry.custom.partId,hostId:entry.custom.hostId,parts:entry.custom.config.build?.parts}:null,panels});
  }finally{scene.remove(m.model);m.cleanup();}
  status.textContent='Captured '+records.length+' / '+selected.length;
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 }
 await Promise.all([...holder.querySelectorAll('img')].map(img=>img.decode()));
 const report=document.createElement('script');report.id='wa0-report';report.type='application/json';
 report.textContent=JSON.stringify({schema:'fieldwork-wa0-webgl-baseline',version:1,spans,lighting:'shared Arsenal inspection',renderer:{antialias:false,pixelRatio:1,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,outputColorSpace:renderer.outputColorSpace},views:viewDefs,records});
 document.body.append(report);
 renderer.dispose();silhouette.dispose();renderer.forceContextLoss();
 document.body.dataset.wa0Complete='true';
}
generate().catch(error=>{status.textContent=String(error);document.body.dataset.wa0Failed=String(error);console.error(error);});
