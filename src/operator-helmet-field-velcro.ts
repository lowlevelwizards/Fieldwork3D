/** H9.6 fabric conforming Velcro and identifier panels.
 * Sample actual ACH/MICH cover triangles at four panel corners; avoid
 * H8's XY planes that could stand upright through the crown or face.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover,type CoverRegion} from './operator-helmet-surface.ts';

type FabricRegion=CoverRegion;
const corners=(u:number,v:number,du:number,dv:number)=>[
 [u-du,v-dv],[u+du,v-dv],[u+du,v+dv],[u-du,v+dv]
] as const;
const contour=(shell:AchMichCoverShell,region:FabricRegion,
 u:number,v:number,du:number,dv:number,offset:number)=>{
 const frames=corners(u,v,du,dv).map(([x,y])=>
  sampleHelmetCover(shell,region,x,y,offset));
 if(frames.some(f=>!f))throw Error('H9.6 missing '+shell+' '+region+' fabric panel');
 return frames.map(f=>f!.position);
};
const meshQuad=(g:THREE.Group,material:THREE.Material,
 name:string,pts:THREE.Vector3[])=>{
 const verts:number[]=[];
 for(const i of [0,1,2,0,2,3])verts.push(...pts[i].toArray());
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.userData.h9CoverConforming=true;g.add(mesh);
 return mesh;
};
function panel(shell:AchMichCoverShell,region:FabricRegion,
 u:number,v:number,du:number,dv:number,
 group:THREE.Group,base:THREE.Material,edge:THREE.Material,name:string){
 const binding=contour(shell,region,u,v,du,dv,.205);
 meshQuad(group,edge,name+'-stitched-hem',binding);
 const cloth=contour(shell,region,u,v,du*.91,dv*.83,.239);
 meshQuad(group,base,name+'-surface',cloth);
}
export function addAchMichVelcro(
 shell:AchMichCoverShell,g:THREE.Group,
 olive:THREE.Material,dark:THREE.Material):void{
 // Cross-shell shape is large, but remains flush with the textile.
 panel(shell,'crown',0,-.10,.45,.34,g,olive,dark,'crown-velcro');
 for(const region of ['left','right'] as const)
  panel(shell,region,.27,.32,.39,.24,g,olive,dark,region+'-velcro');
 panel(shell,'back',0,.23,.43,.24,g,olive,dark,'rear-velcro');
 g.userData.h10GraphicPanelsEnlarged=true;
 g.userData.h9ConformingPanels=4;
 g.userData.h9CornerSamples=32;
}
export function addAchMichIdentifierPatch(
 shell:AchMichCoverShell,g:THREE.Group,
 fabric:THREE.Material,dark:THREE.Material,marker:THREE.Material):void{
 panel(shell,'left',.29,.35,.43,.25,g,fabric,dark,'left-identifier');
 // One clear, restrained insignia made of two fitted cloth segments.
 const bar=contour(shell,'left',.29,.35,.24,.070,.288);
 meshQuad(g,marker,'left-identifier-center-mark',bar);
 g.userData.h10GraphicPatchEnlarged=true;
 g.userData.h9ConformingPatch=true;
 g.userData.h9LeftSideNormal=true;
}
