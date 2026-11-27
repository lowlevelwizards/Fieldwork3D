/** BT1: four distinct belt silhouettes. The band and the mounting surface
 * share a single authored pelvis-local frame. No inventory is issued here.
 */
import * as THREE from 'three';
import {BELT_PROFILES,BELT_STYLES} from './operator-belt-profile.ts';
import {BELT_CENTER_Y,beltContactSegments} from './operator-belt-frame.ts';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
function piece(root:THREE.Group,material:THREE.Material,x:number,y:number,z:number,
 w:number,h:number,d:number,yaw=0,name='belt-detail'){
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,material,x,y,z),material);
 mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.y=yaw;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
export function createBeltSilhouettes(parent:THREE.Group,fabric:THREE.Material,
 dark:THREE.Material,hardware:THREE.Material):Record<string,THREE.Group>{
 const result:Record<string,THREE.Group>={};
 for(const style of BELT_STYLES){
  const root=new THREE.Group();root.name=style;root.visible=false;parent.add(root);result[style]=root;
  if(style==='no-belt')continue;
  const p=BELT_PROFILES[style];
  for(const seg of beltContactSegments()){
   const front=seg.index===0,war=style==='padded-belt';
   const h=war&&front?1.5:p.height;
   const depth=war&&front?.5:p.thickness;
   const y=BELT_CENTER_Y+(war&&!front?.36:0);
   const x=seg.x+seg.normalX*depth/2,z=seg.z+seg.normalZ*depth/2;
   // Chunky flat segments with small corner overlap, not high-poly tubing.
   piece(root,fabric,x,y,z,seg.length+.24,h,depth,seg.yaw,'belt-band');
   if(style==='battle-belt'||(war&&!front)){
    const skin=depth*.22;
    piece(root,dark,seg.x+seg.normalX*(depth-skin/2),y-h*.32,
     seg.z+seg.normalZ*(depth-skin/2),seg.length+.12,.26,skin,seg.yaw,'belt-lower-edge');
    piece(root,dark,seg.x+seg.normalX*(depth-skin/2),y+h*.32,
     seg.z+seg.normalZ*(depth-skin/2),seg.length+.12,.26,skin,seg.yaw,'belt-upper-edge');
    // Readable structural blocks only, not a mesh per individual stitch.
    if(!front){
     const n=seg.length>4?2:1;
     for(let i=0;i<n;i++){
      const offset=(i-(n-1)/2)*seg.length/(n+1);
      piece(root,fabric,seg.x+seg.normalX*(depth+.09)+Math.cos(seg.yaw)*offset,y,
       seg.z+seg.normalZ*(depth+.09)-Math.sin(seg.yaw)*offset,
       Math.min(1.15,seg.length*.37),h*.72,.25,seg.yaw,'belt-webbing-panel');
     }
    }
   }
  }
  // Front fastener at positive X. Broad shapes remain legible at game zoom.
  const fx=beltContactSegments()[0].x+(style==='padded-belt'?.5:p.thickness);
  if(style==='plain-belt'){
   // Four sides of a rectangular buckle with fabric visible through the center.
   for(const side of [-1,1]){
    piece(root,hardware,fx+.18,BELT_CENTER_Y+side*.62,0,.36,.28,2.45,0,'leather-buckle-edge');
    piece(root,hardware,fx+.18,BELT_CENTER_Y,side*1.08,.36,1.1,.29,0,'leather-buckle-edge');
   }
   piece(root,hardware,fx+.28,BELT_CENTER_Y,0,.25,.19,1.85,0,'leather-buckle-tongue');
  }else if(style==='duty-belt'){
   piece(root,dark,fx+.34,BELT_CENTER_Y,0,.76,1.9,3.25,0,'utility-buckle');
   piece(root,hardware,fx+.77,BELT_CENTER_Y,0,.17,1.1,.48,0,'utility-buckle-release');
   for(const side of [-1,1])piece(root,dark,fx+.13,BELT_CENTER_Y,side*3.05,.45,2.05,.58,0,'utility-keeper');
  }else{
   piece(root,dark,fx+.21,BELT_CENTER_Y,0,.5,1.7,2.95,0,'quick-release-base');
   for(const side of [-1,1]){
    piece(root,hardware,fx+.49,BELT_CENTER_Y,side*.78,.48,1.48,1.36,0,'quick-release-half');
    piece(root,dark,fx+.6,BELT_CENTER_Y,side*1.52,.25,.8,.31,0,'quick-release-tab');
   }
  }
 }
 return result;
}
