import * as THREE from 'three';
import {FOOTWEAR,FOOTWEAR_IDS,canonicalFootwear,footwearColor,resolveFootwearHem,type FootwearId} from './operator-footwear-catalog.ts';
import {LEG_LOWER_LENGTH,LEG_ANKLE_HEIGHT} from './breach-leg-geometry.ts';
/** FW2–8: toe +X in the existing legacy ankle frame. Sole bottoms
 * sit at -LEG_ANKLE_HEIGHT. No new bones, collision bodies or pose offsets. */
type Pt=readonly [number,number];
type Style={sole:readonly Pt[];upper:readonly Pt[];width:number;shaft:number;shaftWidth:number;toe?:readonly Pt[]};
const bottom=-LEG_ANKLE_HEIGHT;
const STYLES:Record<Exclude<FootwearId,'bare-feet'>,Style>={
 'combat-boots':{sole:[[-2.4,bottom],[5.6,bottom],[5.6,-.64],[-2.4,-.64]],upper:[[-2.3,-.64],[5.5,-.64],[5.5,.45],[4.7,1.02],[1.35,1.02],[-.1,1.95],[-2.25,1.95]],width:5.8,shaft:3.9,shaftWidth:3.82},
 'leather-boots':{sole:[[-2.4,bottom],[.15,bottom],[.15,-1.15],[5.6,-1.15],[5.6,-.86],[-2.4,-.86]],upper:[[-2.35,-.86],[5.55,-.86],[5.55,.78],[1.1,.78],[-.3,1.75],[-2.3,1.75]],width:5.6,shaft:4.15,shaftWidth:3.72},
 'hiking-boots':{sole:[[-2.4,bottom],[5.6,bottom],[5.6,-.48],[2.1,-.65],[-2.4,-.5]],upper:[[-2.25,-.5],[5.45,-.48],[5.45,.32],[4.6,.94],[1.65,.94],[.25,1.7],[-1.95,1.25]],toe:[[3.45,-.45],[5.45,-.45],[5.45,.32],[4.6,.94],[3.45,.94]],width:5.8,shaft:2.35,shaftWidth:3.78},
 'hiking-shoes':{sole:[[-2.4,bottom],[5.6,bottom],[5.6,-.55],[1.2,-.78],[-2.4,-.6]],upper:[[-2.3,-.6],[5.45,-.55],[5.45,.25],[4.65,.75],[1.45,.75],[-.2,1.25],[-2.25,1.05]],width:5.65,shaft:0,shaftWidth:0},
 sneakers:{sole:[[-2.4,bottom],[5.6,bottom],[5.6,-.82],[-2.4,-.82]],upper:[[-2.3,-.82],[5.5,-.82],[5.5,.5],[1.1,.5],[-.1,.98],[-2.3,.98]],width:5.6,shaft:0,shaftWidth:0}
};
type Model={foot:THREE.Group;shaft:THREE.Group;sock:THREE.Mesh|null;upper:THREE.MeshStandardMaterial|null};
export type FootwearVisuals={models:Record<FootwearId,Model>[];materials:THREE.MeshStandardMaterial[];active:FootwearId};
const material=(color:number,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness,flatShading:true});
function prism(parent:THREE.Group,points:readonly Pt[],width:number,mat:THREE.Material,name:string){
 const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,steps:1,curveSegments:1});
 geo.translate(0,0,-width/2);
 const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function box(parent:THREE.Group,w:number,h:number,d:number,y:number,mat:THREE.Material,name:string){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.y=y;mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function group(parent:THREE.Object3D,name:string){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
export function createFootwearVisuals(legs:readonly {lower:THREE.Mesh;shoe?:THREE.Mesh}[],skin:THREE.MeshStandardMaterial):FootwearVisuals{
 const materials:THREE.MeshStandardMaterial[]=[];
 const rubber=material(0x333530),sneakerSole=material(0xd1cec2),sockMaterial=material(0x53554c);
 materials.push(rubber,sneakerSole,sockMaterial);
 const uppers=new Map<FootwearId,THREE.MeshStandardMaterial>();
 for(const id of FOOTWEAR_IDS){if(id==='bare-feet')continue;const p=FOOTWEAR[id];const m=material(p.colors[p.defaultColor],id==='leather-boots'?.76:.94);uppers.set(id,m);materials.push(m);}
 const models:FootwearVisuals['models']=[];
 for(const leg of legs){
  if(!leg.shoe)continue;
  const variants={} as Record<FootwearId,Model>;
  for(const id of FOOTWEAR_IDS){
   const foot=group(leg.shoe,'footwear:'+id),shaft=group(leg.lower,'footwear-shaft:'+id);
   const upper=uppers.get(id)??null;
   let sock:THREE.Mesh|null=null;
   if(id==='bare-feet'){
    prism(foot,[[-2.1,bottom],[4.85,bottom],[5.1,-.65],[4.4,.05],[1.2,.25],[-.2,.95],[-2.0,.85]],4.75,skin,'bare-foot');
   }else{
    const s=STYLES[id];
    prism(foot,s.sole,s.width,id==='sneakers'?sneakerSole:rubber,'sole');
    prism(foot,s.upper,s.width-.22,upper!,'upper');
    if(s.toe)prism(foot,s.toe,s.width-.12,rubber,'toe-color-block');
    if(s.shaft){
     const h=s.shaft/LEG_LOWER_LENGTH;
     box(shaft,s.shaftWidth,h+.045,s.shaftWidth,.5-h/2+.012,upper!,'shaft');
    }
    const h=(FOOTWEAR[id].height==='mid'?3.48:3.05)/LEG_LOWER_LENGTH;
    if(FOOTWEAR[id].height!=='high')sock=box(shaft,3.45,h,3.55,.5-h/2,sockMaterial,'sock');
   }
   foot.visible=id==='combat-boots';shaft.visible=false;
   variants[id]={foot,shaft,sock,upper};
  }
  models.push(variants);
 }
 return {models,materials,active:'combat-boots'};
}
export function updateFootwearVisuals(v:FootwearVisuals,id:string,trousers:string,requested:'unbloused'|'bloused'|'cuffed',color?:string){
 const active=canonicalFootwear(id)??'combat-boots',hem=resolveFootwearHem(trousers,active,requested);
 v.active=active;
 for(const variants of v.models)for(const key of FOOTWEAR_IDS){
  const model=variants[key],show=key===active;
  model.foot.visible=show;
  model.shaft.visible=show&&key!=='bare-feet'&&(hem!=='unbloused'||trousers==='base-shorts'&&FOOTWEAR[key].height!=='low');
  if(model.sock)model.sock.visible=show&&hem!=='unbloused';
  if(show&&model.upper){const p=FOOTWEAR[key];model.upper.color.setHex(p.colors[footwearColor(key,color)]);}
 }
}
export function footwearRoots(v:FootwearVisuals):THREE.Group[]{
 return v.models.flatMap(variants=>FOOTWEAR_IDS.flatMap(id=>[variants[id].foot,variants[id].shaft]));
}
