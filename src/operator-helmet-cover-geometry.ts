/** Minimal fitted textile for the three active ACH/MICH cuts only.
 * The shell geometry is never modified. One static drape and one hem;
 * no alternate hidden hardware/covers are constructed.
 */
import * as THREE from 'three';
import {ACH_MICH_SHELLS} from './operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry,type AchMichCoverShell}
 from './operator-ach-mich-cover-drape.ts';
import {pasgtCoverTexture} from './operator-pasgt-cover-texture.ts';
import {type HelmetSetupV1} from './operator-helmet-setup-policy.ts';
import {type HeadwearCamoId} from './operator-headwear-camo.ts';
export type ModernHelmetCoverLayers={
 fitted:THREE.Group;fabric:THREE.MeshStandardMaterial;activePrint:string;
};
export function createModernHelmetCoverLayers(parent:THREE.Group,shell:string):
 ModernHelmetCoverLayers{
 if(!(ACH_MICH_SHELLS as readonly string[]).includes(shell))
  throw Error('Unsupported fitted helmet shell: '+shell);
 const fabric=new THREE.MeshStandardMaterial({
  color:0xffffff,roughness:.97,metalness:0,flatShading:true,
  vertexColors:false,side:THREE.DoubleSide
 });
 fabric.userData.fieldworkStudioHelmetShellCover=true;
 fabric.userData.fieldworkStudioSoftGear=true;
 const fitted=new THREE.Group();
 fitted.visible=false;parent.add(fitted);
 const drape=new THREE.Mesh(createAchMichDrapedGeometry(
  shell as AchMichCoverShell),fabric);
 drape.name='ach-mich-h3-three-sewn-panel-drape';
 drape.castShadow=true;drape.receiveShadow=false;
 const hem=new THREE.Mesh(createAchMichDrapedGeometry(
  shell as AchMichCoverShell,true),fabric);
 hem.name='ach-mich-h3-simple-continuous-fabric-hem';
 hem.castShadow=false;hem.receiveShadow=false;
 fitted.add(drape,hem);
 fabric.map=pasgtCoverTexture(undefined,'ach-mich-solid');
 return {fitted,fabric,activePrint:''};
}
export function updateModernHelmetCoverLayers(v:ModernHelmetCoverLayers,
 _shell:string,setup:HelmetSetupV1,camo:HeadwearCamoId|undefined,
 operatorId:string,roll=0):void{
 const covered=setup.cover==='fitted';
 v.fitted.visible=covered;
 const print=covered&&camo?camo:undefined;
 const map=pasgtCoverTexture(print,operatorId,roll);
 if(v.fabric.map!==map){v.fabric.map=map;v.fabric.needsUpdate=true;}
 v.fabric.color.setHex(0xffffff);
 v.activePrint=print??'';
}
