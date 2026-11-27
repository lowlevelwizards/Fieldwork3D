/** BT3R.8–10: selective silhouette sculpting around actual contents.
 * Carrier-local +Z outward, +Y up; a holder backs directly onto the carrier.
 * Six-point chamfered sections provide real shape with no decorative quads.
 */
import * as THREE from 'three';
import {attachmentFootprint,attachmentVariant,attachmentContentSlots,
 type AttachmentId,type AttachmentVariant,type AttachmentMaterial} from './operator-attachment-catalog.ts';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {gearMarkedMaterial,gearBoxMarkUV,type GearMark} from './operator-gear-pixel-art.ts';
import {TILE_WORLD_SIZE} from './rendering/pixel-recipes.ts';
import {nativePrimaryMagazine,SIDEARM_OPERATOR_SCALE} from './operator-attachment-reference.ts';
import {buildGlockAppearance,glockArtSockets} from './weapons/geometry/glock-family-silhouettes.ts';
export type AttachmentPalette=Record<AttachmentMaterial,THREE.Material>;
export type AttachmentVisual={
 root:THREE.Group;holder:THREE.Group;contents:THREE.Group[];
 contentSockets:THREE.Group[];interactionSocket:THREE.Object3D;
 footprint:ReturnType<typeof attachmentFootprint>;
};
type Part=(channel:AttachmentMaterial,x:number,y:number,z:number,w:number,h:number,d:number,name?:string,mark?:GearMark)=>void;
type Point=[number,number,number];
type Section={y:number;width:number;back:number;front:number;cut:number};
export function sculptGeometry(sections:Section[],hollow=false,wall=.30){
 const pos:number[]=[],uv:number[]=[],uv1:number[]=[];
 const low=sections[0].y,high=sections[sections.length-1].y;
 const width=Math.max(...sections.map(s=>s.width)),height=high-low;
 const ring=(s:Section):Point[]=>{
  const x=s.width/2,c=Math.min(s.cut,x*.5,(s.front-s.back)*.45);
  return [[-x,s.y,s.back],[x,s.y,s.back],[x,s.y,s.front-c],
   [x-c,s.y,s.front],[-x+c,s.y,s.front],[-x,s.y,s.front-c]];
 };
 const tri=(a:Point,b:Point,c:Point,mark=false)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
  const ex=c[0]-a[0],ey=c[1]-a[1],ez=c[2]-a[2];
  const nx=dy*ez-dz*ey,ny=dz*ex-dx*ez,nz=dx*ey-dy*ex;
  for(const v of [a,b,c]){
   pos.push(...v);
   uv.push((Math.abs(nx)>Math.abs(nz)?v[2]:v[0])/TILE_WORLD_SIZE,
    (Math.abs(ny)>Math.abs(nx)+Math.abs(nz)?v[2]:v[1])/TILE_WORLD_SIZE);
   uv1.push(mark?(v[0]+width/2)/width:.999,mark?(v[1]-low)/height:.999);
  }
 };
 const connect=(a:Point[],b:Point[],invert=false,marked=false)=>{
  for(let i=0;i<6;i++){
   const j=(i+1)%6,m=marked&&i===3;
   if(invert){tri(a[i],a[j],b[j],m);tri(a[i],b[j],b[i],m);}
   else{tri(a[i],b[j],a[j],m);tri(a[i],b[i],b[j],m);}
  }
 };
 const cap=(r:Point[],up:boolean)=>{
  for(let i=1;i<5;i++)if(up)tri(r[0],r[i+1],r[i]);else tri(r[0],r[i],r[i+1]);
 };
 const rings=sections.map(ring);
 cap(rings[0],false);
 for(let i=0;i<rings.length-1;i++)connect(rings[i],rings[i+1],false,true);
 if(hollow){
  // Inset each actual section, not just the mouth. Copying a wide mouth
  // down to the base made the cavity intersect/protrude through tapered
  // outer walls (especially the dump bag), leaving a rectangular ghost.
  // Offset the convex six-sided polygon along each edge normal; this
  // preserves the chamfer and guarantees a real, constant planar wall.
  const inset=(r:Point[],amount:number):Point[]=>{
   const width=r[1][0]-r[0][0],back=r[0][2],front=r[3][2];
   const cut=front-r[2][2];
   // Very small outer chamfers disappear under a true polygon offset.
   // Preserve a tiny inward-only chamfer rather than letting their
   // vertices cross, which would invert an interior facet.
   return ring({y:r[0][1],width:width-2*amount,back:back+amount,
    front:front-amount,cut:Math.max(.06,cut-(2-Math.SQRT2)*amount)});
  };
  // The cavity floor is a raised slice of the actual taper, not a
  // second copy of the bottom or a vertical prism with a wide footprint.
  const floorY=low+Math.min(wall,height*.2);
  const at=sections.findIndex(s=>s.y>=floorY);
  const lo=sections[at-1],hi=sections[at];
  const t=(floorY-lo.y)/(hi.y-lo.y);
  const floorSection:Section={y:floorY,width:lo.width+(hi.width-lo.width)*t,
   back:lo.back+(hi.back-lo.back)*t,front:lo.front+(hi.front-lo.front)*t,
   cut:lo.cut+(hi.cut-lo.cut)*t};
  const innerSections=[floorSection,...sections.filter(s=>s.y>floorY)];
  const innerRings=innerSections.map(s=>inset(ring(s),wall));
  // Top lip faces upward; cavity side normals point inward and floor up.
  // All surfaces share boundary vertices, with no overlapping cap or
  // redundant decorative ring. Non-indexed triangles keep hard facets.
  connect(rings[rings.length-1],innerRings[innerRings.length-1],false);
  for(let i=0;i<innerRings.length-1;i++)connect(innerRings[i],innerRings[i+1],true);
  cap(innerRings[0],true);
 }else cap(rings[rings.length-1],true);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('uv1',new THREE.Float32BufferAttribute(uv1,2));
 g.computeVertexNormals();return g;
}
export function createAttachmentVisual(id:AttachmentId,palette:AttachmentPalette,
 requested:AttachmentVariant='standard',sampleContents=false):AttachmentVisual{
 const variant=attachmentVariant(id,requested),footprint=attachmentFootprint(id,variant);
 const {width:W,height:H,depth:D}=footprint;
 const root=new THREE.Group();root.name='attachment-'+id;
 root.userData.attachmentId=id;root.userData.attachmentVariant=variant;
 const holder=new THREE.Group();holder.name='holder';root.add(holder);
 const contents:THREE.Group[]=[],contentSockets:THREE.Group[]=[];
 const parts=(g:THREE.Group,dx=0,dy=0,dz=0):Part=>(channel,x,y,z,w,h,d,name='panel',mark)=>{
  const source=palette[channel],m=mark?gearMarkedMaterial(source,mark,w*W,h*H):source;
  const geo=garmentBoxUV(new THREE.BoxGeometry(w*W,h*H,d*D),w*W,h*H,d*D,m,x*W,y*H,z*D);
  if(mark)gearBoxMarkUV(geo,w*W,h*H);
  const mesh=new THREE.Mesh(geo,m);mesh.name=name;mesh.position.set((x-dx)*W,(y-dy)*H,(z-dz)*D);
  mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 };
 const b=parts(holder);
 // Back face touches the belt; the lower body narrows modestly away from
 // the thigh. No mounting bridge, shelf, or independently floating tab.
 const shell=(channel:AttachmentMaterial,cx:number,sections:readonly (readonly [number,number,number,number,number])[],
  hollow=false,mark?:GearMark,name='sculpted-body',wall=.30)=>{
  const s=sections.map(([y,w,back,front,cut])=>({y:y*H,width:w*W,back:back*D,front:front*D,cut:cut*W}));
  const m=mark?gearMarkedMaterial(palette[channel],mark,Math.max(...s.map(v=>v.width)),s[s.length-1].y-s[0].y):palette[channel];
  const mesh=new THREE.Mesh(sculptGeometry(s,hollow,wall),m);mesh.name=name;mesh.position.x=cx*W;
  mesh.castShadow=true;mesh.receiveShadow=true;holder.add(mesh);
 };
 const pouch=(cx:number,w:number,bottom:number,top:number,mark:GearMark='band',channel:AttachmentMaterial='fabric')=>{
  shell(channel,cx,[[bottom,w*.94,.12,.92,.07],[top,w,0,1,.07]],true,mark,'open-pouch',.30);
 };
 const solid=(w:number,bottom:number,top:number,mark:GearMark='utility',front=.88)=>{
  shell('fabric',0,[[bottom,w*.86,.09,front*.89,.10],[bottom+.12,w,0,front,.11],
   [top,w,.02,front,.10]],false,mark);
 };
 const lid=(w:number,bottom:number,top:number)=>{
  shell('fabric',0,[[bottom,w,.11,1,.09],[top,w*.91,.02,.88,.08]],false,'flap','protective-lid');
  b('dark',0,bottom-.07,.88,.19,.18,.19,'broad-closure');
 };
 const cell=(x:number,y:number,z:number,draw?:(p:Part,g:THREE.Group)=>void)=>{
  const socket=new THREE.Group();socket.name='content-socket-'+contentSockets.length;
  socket.position.set(x*W,y*H,z*D);root.add(socket);contentSockets.push(socket);
  const g=new THREE.Group();g.name='sample-content-'+contents.length;socket.add(g);contents.push(g);g.visible=false;
  if(sampleContents&&draw){draw(parts(g,x,y,z),g);consolidateVisualGroup(g);}
 };
 switch(id){
 case 'pistol-mag-pouch':{
  const n=attachmentContentSlots(id,variant),w=n===2?.46:.94;
  for(let i=0;i<n;i++){
   const x=(i-(n-1)/2)*.49;pouch(x,w,-.94,-.25);
   cell(x,-.16,.52,p=>{
    p('contents',x,-.42,.52,w*.68,.72,.50,'magazine-body');
    p('hardware',x,-.075,.52,w*.78,.10,.60,'baseplate');
   });
  }break;
 }
 case 'primary-mag-pouch':
  pouch(0,.99,-.98,-.25,'band');
  cell(0,-.09,.51,(_p,g)=>{
   const geo=nativePrimaryMagazine(variant==='compact');
   const mag=new THREE.Mesh(geo,palette.contents);mag.name='native-primary-magazine';
   mag.position.y=Math.max(0,-H*.98+.30+ .04-(-H*.09+geo.boundingBox!.min.y));
   mag.castShadow=true;mag.receiveShadow=true;g.add(mag);
  });break;
 case 'shell-holder':
  shell('fabric',0,[[-.81,.98,0,.32,.05],[-.12,.98,0,.32,.05]],false,'shell','shell-backing');
  for(let i=0;i<4;i++){
   const x=(i-1.5)*.25;
   b('dark',x,-.52,.58,.19,.29,.62,'elastic-cell');
   cell(x,-.16,.64,p=>{
    p('accent',x,-.37,.64,.17,.59,.56,'shell-body');
    p('hardware',x,-.75,.64,.18,.17,.58,'shell-base');
   });
  }break;
 case 'rigid-holster':
  // Molded shell follows the narrower slide and widens at the mouth.
  shell('dark',0,[[-.98,.64,.10,.82,.10],[-.78,.72,.06,.90,.09],
   [-.22,.96,0,1,.10]],true,'holster','tapered-polymer-shell',.27);
  cell(0,-.19,.54,(_p,g)=>{
   const gun=buildGlockAppearance('glock-g19-gen3',{details:false});
   const pivot=glockArtSockets('glock-g19-gen3').holsterPivot;
   gun.position.set(-pivot.x,-pivot.y,-pivot.z);
   const cradle=new THREE.Group();cradle.scale.setScalar(SIDEARM_OPERATOR_SCALE);cradle.rotation.z=-Math.PI/2;
   cradle.add(gun);g.add(cradle);cradle.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(cradle);
   cradle.position.x-=((bounds.min.x+bounds.max.x)/2);
   cradle.position.y+=-H*.89+H*.19-bounds.min.y;
   cradle.position.z-=((bounds.min.z+bounds.max.z)/2);
   gun.traverse(o=>{if(o instanceof THREE.Mesh)o.material=palette.contents;});
  });break;
 case 'flap-holster':
  shell('fabric',0,[[-.98,.65,.1,.81,.10],[-.76,.76,.04,.88,.1],[-.29,.92,0,.89,.10]],false,'holster');
  lid(.98,-.33,-.04);cell(0,-.20,.51);break;
 case 'medical-pouch':
  solid(.98,-.95,-.09,'medical',.95);
  b('fabric',0,-.075,.44,.68,.13,.35,'grab-handle');
  cell(0,-.20,.51);break;
 case 'radio-holder':
  pouch(0,.91,-.97,-.49,'band');
  cell(0,-.22,.51,p=>{
   p('contents',0,-.50,.51,.72,.72,.60,'radio-body','radio');
   p('dark',.27,-.10,.47,.16,.20,.17,'antenna');
   p('hardware',-.24,-.17,.49,.23,.12,.25,'top-control');
  });break;
 case 'flashlight-holder':
  pouch(0,.91,-.92,-.54,'band');
  cell(0,-.22,.51,p=>{
   p('contents',0,-.49,.51,.53,.74,.48,'light-body');
   p('dark',0,-.14,.51,.82,.25,.78,'oversized-head');
   p('hardware',0,-.017,.51,.59,.034,.56,'lens');
  });break;
 case 'restraint-pouch':
  solid(.94,-.95,-.35,'leather',.83);lid(.98,-.37,-.09);break;
 case 'wedge-holder':
  pouch(0,.95,-.96,-.40,'band');
  for(let i=0;i<2;i++){
   const x=(i-.5)*.43;
   cell(x,-.18,.51,(_p,g)=>{
    const shape=new THREE.Shape();
    shape.moveTo(-.17*W,-.64*H);shape.lineTo(.17*W,-.64*H);
    shape.lineTo(.17*W,.10*H);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:D*.38,bevelEnabled:false,steps:1,curveSegments:1});
    geo.translate(0,0,-D*.19);
    const mesh=new THREE.Mesh(geo,palette.accent);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
   });
  }break;
 case 'grenade-pouch':
  shell('fabric',0,[[-.97,.76,.10,.83,.12],[-.72,.98,.02,1,.13],
   [-.34,.93,0,.96,.12]],true,'flap','rounded-canister-holder');
  cell(0,-.28,.52,p=>{
   p('contents',0,-.49,.52,.65,.69,.50,'sample-canister');
   p('hardware',0,-.13,.52,.54,.14,.49,'cap');
  });break;
 case 'utility-pouch':
  solid(.96,-.96,-.37,'utility');lid(.99,-.39,-.07);break;
 case 'dump-pouch':
  if(variant==='rolled')solid(.96,-.92,-.08,'dump',.98);
  else shell('fabric',0,[[-.98,.67,.15,.77,.10],[-.79,.85,.10,.92,.12],
   [-.21,1,0,1,.12]],true,'dump','flared-dump-bag',.46);
  break;
 }
 const interactionSocket=new THREE.Object3D();interactionSocket.name='interaction-socket';
 interactionSocket.position.set(0,-H*.10,D*.60);root.add(interactionSocket);
 consolidateVisualGroup(holder);
 return {root,holder,contents,contentSockets,interactionSocket,footprint};
}
export function setAttachmentSampleCount(visual:AttachmentVisual,count:number){
 const n=Number.isFinite(count)?Math.max(0,Math.floor(count)):0;
 visual.contents.forEach((content,index)=>{content.visible=index<n;});
}
export function placeAttachmentVisual(visual:AttachmentVisual,socket:{x:number;y:number;z:number;yaw:number;tilt?:number}){
 visual.root.position.set(socket.x,socket.y,socket.z);
 visual.root.rotation.set(socket.tilt??0,socket.yaw,0,'YXZ');
}
