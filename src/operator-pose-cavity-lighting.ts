/** R5.5-A. Per-rig GPU receiver cavities, driven by solved IK.
 * No per-frame CPU shadow raycasts, geometry edits, or extra draw calls.
 * Materials are per-rig so uniforms cannot leak into another operator.
 */
import * as THREE from 'three';
type Kind='torso'|'thigh';
type Layer={source:THREE.MeshStandardMaterial;
 material:THREE.MeshStandardMaterial;value:THREE.Vector2};
export type OperatorPoseCavity={torso:Layer;thighs:[Layer,Layer]};
const attach=(mesh:THREE.Mesh,source:THREE.MeshStandardMaterial,
 kind:Kind):Layer=>{
 const material=source.clone(),value=new THREE.Vector2();
 material.userData.fieldworkPoseCavity=kind;
 material.customProgramCacheKey=()=> 'fieldwork-r5-cavity-'+kind;
 material.onBeforeCompile=shader=>{
  shader.uniforms.fieldworkCavity={value};
  shader.vertexShader='varying vec3 vFWCavityLocal;\n'+
   shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvFWCavityLocal=position;');
  const code=kind==='torso'?
   'float side=smoothstep(4.3,6.8,abs(vFWCavityLocal.z));\n'+
   'float band=smoothstep(-2.5,0.5,vFWCavityLocal.y)*'+
   '(1.0-smoothstep(3.8,6.5,vFWCavityLocal.y));\n'+
   'float arm=vFWCavityLocal.z<0.0?fieldworkCavity.x:fieldworkCavity.y;\n'+
   'float cavity=.32*side*band*arm;':
   'float upper=1.0-smoothstep(-0.48,-0.08,vFWCavityLocal.y);\n'+
   'float inner=1.0-smoothstep(-0.20,0.56,vFWCavityLocal.x);\n'+
   'float cavity=.22*upper*inner*fieldworkCavity.x;';
  shader.fragmentShader='uniform vec2 fieldworkCavity;\n'+
   'varying vec3 vFWCavityLocal;\n'+
   shader.fragmentShader.replace('#include <color_fragment>',
    '#include <color_fragment>\n'+code+
    '\ndiffuseColor.rgb*=1.0-clamp(cavity,0.0,.36);');
 };
 mesh.material=material;
 return {source,material,value};
};
export function createOperatorPoseCavity(
 torso:THREE.Mesh,thighs:readonly [THREE.Mesh,THREE.Mesh],
 cloth:THREE.MeshStandardMaterial,trousers:THREE.MeshStandardMaterial
):OperatorPoseCavity{
 return {torso:attach(torso,cloth,'torso'),
  thighs:[attach(thighs[0],trousers,'thigh'),
   attach(thighs[1],trousers,'thigh')]};
}
export function armCavityStrength(axisY:number,elbowSpread:number,
 down=false):number{
 const raised=THREE.MathUtils.clamp((axisY+.5)/1.3,0,1);
 const opened=THREE.MathUtils.clamp((elbowSpread-1.6)/8.5,0,1);
 return THREE.MathUtils.clamp((1-raised*.86)*(1-opened*.60)*
  (down?.25:1),0,1);
}
export function thighCavityStrength(crouch:boolean,
 stride:number,down=false):number{
 return down?.18:THREE.MathUtils.clamp(.65+(crouch?.23:0)+
  .10*Math.abs(Math.sin(stride*Math.PI*2)),0,1);
}
function sync(layer:Layer){
 const a=layer.material,b=layer.source;
 const recompile=a.map!==b.map||a.aoMap!==b.aoMap||
  a.alphaMap!==b.alphaMap||a.transparent!==b.transparent||
  a.vertexColors!==b.vertexColors;
 a.color.copy(b.color);
 a.map=b.map;a.aoMap=b.aoMap;a.aoMapIntensity=b.aoMapIntensity;
 a.alphaMap=b.alphaMap;a.transparent=b.transparent;
 a.opacity=b.opacity;a.alphaTest=b.alphaTest;
 a.vertexColors=b.vertexColors;a.roughness=b.roughness;
 a.metalness=b.metalness;
 a.emissive.copy(b.emissive);a.emissiveIntensity=b.emissiveIntensity;
 if(recompile)a.needsUpdate=true;
}
const up=new THREE.Vector3(0,1,0);
export function updateOperatorPoseCavity(
 state:OperatorPoseCavity,
 arms:readonly {upper:THREE.Mesh}[],
 elbowSpread:readonly number[],
 posture:'stand'|'crouch',stride:number,down:boolean,quality=1
):void{
 for(let i=0;i<2;i++){
  const y=up.set(0,1,0).applyQuaternion(arms[i].upper.quaternion).y;
  state.torso.value.setComponent(i,
   quality*armCavityStrength(y,elbowSpread[i]??0,down));
 }
 const thigh=quality*thighCavityStrength(posture==='crouch',stride,down);
 for(const layer of state.thighs){layer.value.set(thigh,0);sync(layer);}
 sync(state.torso);
}
