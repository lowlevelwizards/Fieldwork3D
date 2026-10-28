import * as THREE from 'three';
import {BUILDINGS,deckYAt,physicalGroundAt,roadCenterX,
  roadYAt,riverSurfaceY,SITE_CENTER} from './regional-physical';
import {establishRegionalPlants,plantsNear,
  type RegionalPlant} from './regional-ecology';
import {regionRiverX,globalSouthM} from './playable-region-model';
import type {GroundedActor} from './regional-actors';
const earth=new THREE.MeshStandardMaterial({color:0x988a72,roughness:1});
const roof=new THREE.MeshStandardMaterial({color:0x787c70,roughness:1});
const wall=new THREE.MeshStandardMaterial({color:0xc0bcaa,roughness:1});
const bark=new THREE.MeshStandardMaterial({color:0x625b4b,roughness:1});
const leaf=new THREE.MeshStandardMaterial({color:0x657f5d,roughness:1,flatShading:true});
const brush=new THREE.MeshStandardMaterial({color:0x84936b,roughness:1,flatShading:true});
const waterMat=new THREE.MeshStandardMaterial({
  color:0x7baeb2,roughness:.62,transparent:true,opacity:.83,
  side:THREE.DoubleSide,depthWrite:false,
});
const shadowMat=new THREE.MeshBasicMaterial({
  color:0x24392b,transparent:true,opacity:.18,depthWrite:false,
});
function ribbon(points:{x:number;z:number;y:number;width:number}[],material:THREE.Material):THREE.Mesh{
  const verts:number[]=[],faces:number[]=[];
  points.forEach((p,i)=>{
    verts.push(p.x-p.width/2,p.y,p.z,p.x+p.width/2,p.y,p.z);
    if(i>0){const n=i*2;faces.push(n-2,n-1,n,n-1,n+1,n);}
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(faces);g.computeVertexNormals();
  return new THREE.Mesh(g,material);
}
/** World geometry is static, regional heightfield and source of truth are
 * independent of the tiny 10m laboratory and its persistent water solver. */
export class CutwoodsPhysicalScene{
  readonly group=new THREE.Group();
  readonly plants=establishRegionalPlants();
  private readonly nearGroup=new THREE.Group();
  private nearX=Infinity;private nearZ=Infinity;
  private readonly vegetationMeshes:THREE.Mesh[]=[];
  constructor(scene:THREE.Scene){
    const river:{x:number;z:number;y:number;width:number}[]=[];
    const road:{x:number;z:number;y:number;width:number}[]=[];
    for(let z=-500;z<=500;z+=4){
      const center=regionRiverX(globalSouthM('cutwoods',z));
      river.push({x:center,z,y:riverSurfaceY(z)+.04,width:17});
      const rx=roadCenterX(z);
      const deck=deckYAt(rx,z);
      road.push({x:rx,z,y:deck??roadYAt(rx,z),width:6.1});
    }
    const riverMesh=ribbon(river,waterMat),roadMesh=ribbon(road,earth);
    riverMesh.renderOrder=2;roadMesh.renderOrder=3;
    this.group.add(riverMesh,roadMesh);
    for(const site of BUILDINGS){
      const floorY=physicalGroundAt(site.x,site.z);
      const body=new THREE.Group();
      body.position.set(site.x,floorY,site.z);
      const block=(x:number,y:number,z:number,w:number,h:number,d:number,
        material:THREE.Material)=>{
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
        mesh.position.set(x,y,z);body.add(mesh);
      };
      block(0,-.06,0,site.width+.5,.2,site.depth+.5,earth);
      block(0,site.height/2,-site.depth/2,site.width,site.height,.45,wall);
      block(-site.width/2,site.height/2,0,.45,site.height,site.depth,wall);
      block(site.width/2,site.height/2,0,.45,site.height,site.depth,wall);
      // Southward-facing open entrance, 3m wide, no invisible door collider.
      const side=(site.width-3)/2;
      block(-(3+side)/2,site.height/2,site.depth/2,side,site.height,.45,wall);
      block((3+side)/2,site.height/2,site.depth/2,side,site.height,.45,wall);
      block(0,site.height-.65,site.depth/2,3,1.3,.45,wall);
      block(0,site.height+.22,0,site.width+.9,.45,site.depth+.9,roof);
      this.group.add(body);
    }
    const marker=new THREE.Mesh(new THREE.TorusGeometry(2.5,.15,5,32),
      new THREE.MeshBasicMaterial({color:0xe3bf80,depthTest:false}));
    marker.rotation.x=-Math.PI/2;
    marker.position.set(SITE_CENTER.x,
      physicalGroundAt(SITE_CENTER.x,SITE_CENTER.z)+.22,SITE_CENTER.z);
    marker.renderOrder=5;this.group.add(marker);
    this.group.add(this.nearGroup);
    scene.add(this.group);
  }
  updateVegetation(x:number,z:number,force=false):void{
    if(!force&&Math.hypot(x-this.nearX,z-this.nearZ)<23)return;
    this.nearX=x;this.nearZ=z;
    for(const mesh of this.vegetationMeshes){
      this.nearGroup.remove(mesh);mesh.geometry.dispose();
    }
    this.vegetationMeshes.length=0;
    const visible=plantsNear(this.plants,x,z,160);
    const draw=(subset:RegionalPlant[],type:'tree'|'shrub')=>{
      if(!subset.length)return;
      const tree=type==='tree';
      const trunkShape=new THREE.CylinderGeometry(tree?.085:.045,tree?.13:.06,1,6);
      const crownShape=new THREE.IcosahedronGeometry(1,0);
      const shadeShape=new THREE.CircleGeometry(1,12);
      const trunks=new THREE.InstancedMesh(trunkShape,bark,subset.length);
      const canopies=new THREE.InstancedMesh(crownShape,tree?leaf:brush,subset.length);
      const shadows=new THREE.InstancedMesh(shadeShape,shadowMat,subset.length);
      const dummy=new THREE.Object3D(),color=new THREE.Color();
      for(let i=0;i<subset.length;i++){
        const p=subset[i],ground=physicalGroundAt(p.x,p.z);
        dummy.rotation.set(0,(p.id%47)*.34,0);
        dummy.position.set(p.x,ground+p.height*(tree?.33:.20),p.z);
        dummy.scale.set(1,p.height*(tree?.65:.35),1);
        dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
        dummy.position.set(p.x,ground+p.height*(tree?.76:.69),p.z);
        dummy.scale.set(p.crown,p.height*(tree?.39:.40),p.crown*.91);
        dummy.updateMatrix();canopies.setMatrixAt(i,dummy.matrix);
        color.setHSL(.25+(p.id%13)*.005,.22+(p.id%5)*.017,
          .32+(p.id%7)*.011);
        canopies.setColorAt(i,color);
        dummy.rotation.set(-Math.PI/2,0,0);
        dummy.position.set(p.x,ground+.02,p.z);
        dummy.scale.set(p.crown*.83,p.crown*.76,1);
        dummy.updateMatrix();shadows.setMatrixAt(i,dummy.matrix);
      }
      for(const mesh of [trunks,canopies,shadows]){
        mesh.instanceMatrix.needsUpdate=true;
        if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
        mesh.frustumCulled=false;
        this.vegetationMeshes.push(mesh);this.nearGroup.add(mesh);
      }
    };
    draw(visible.filter(p=>p.kind==='tree'),'tree');
    draw(visible.filter(p=>p.kind==='shrub'),'shrub');
  }
  dispose(scene:THREE.Scene):void{
    scene.remove(this.group);
    this.group.traverse(obj=>{
      if(obj instanceof THREE.Mesh&&!this.vegetationMeshes.includes(obj))
        obj.geometry.dispose();
    });
    for(const mesh of this.vegetationMeshes)mesh.geometry.dispose();
  }
}
const uniforms={
  player:new THREE.MeshStandardMaterial({color:0x4b91a5,roughness:1}),
  northline:new THREE.MeshStandardMaterial({color:0x6d8d84,roughness:1}),
  commune:new THREE.MeshStandardMaterial({color:0xbc7365,roughness:1}),
};
const skin=new THREE.MeshStandardMaterial({color:0xbdb8a6,roughness:1});
const pack=new THREE.MeshStandardMaterial({color:0x696d55,roughness:1});
export class ActorFigure{
  readonly group=new THREE.Group();
  private readonly legs:THREE.Group[]=[];
  private readonly arms:THREE.Group[]=[];
  readonly actor:GroundedActor;
  constructor(scene:THREE.Scene,actor:GroundedActor){
    this.actor=actor;
    const add=(parent:THREE.Object3D,w:number,h:number,d:number,
      material:THREE.Material,x:number,y:number,z:number)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
      mesh.position.set(x,y,z);parent.add(mesh);
    };
    const mat=uniforms[actor.team];
    add(this.group,.45,.70,.24,mat,0,1.12,0);
    add(this.group,.30,.28,.30,skin,0,1.59,0);
    add(this.group,.40,.47,.19,pack,0,1.10,-.22);
    for(const sign of [-1,1]){
      const leg=new THREE.Group();
      leg.position.set(sign*.14,.85,0);
      add(leg,.17,.78,.18,mat,0,-.38,0);
      this.legs.push(leg);this.group.add(leg);
      const arm=new THREE.Group();
      arm.position.set(sign*.34,1.35,0);
      add(arm,.16,.56,.17,mat,0,-.26,0);
      this.arms.push(arm);this.group.add(arm);
    }
    // Small facing marker is part of the character silhouette.
    add(this.group,.13,.07,.20,skin,0,1.58,.17);
    scene.add(this.group);
    this.update(0);
  }
  update(time:number):void{
    const a=this.actor;
    this.group.position.set(a.x,a.y,a.z);
    this.group.rotation.y=a.heading;
    this.group.visible=a.health>0;
    const amount=Math.min(1,Math.hypot(a.vx,a.vz)/Math.max(.1,a.speed));
    const cycle=time*7.5+Number(a.id.length);
    this.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(cycle+i*Math.PI)*.38*amount;});
    this.arms.forEach((arm,i)=>{arm.rotation.x=-Math.sin(cycle+i*Math.PI)*.24*amount;});
  }
  dispose(scene:THREE.Scene):void{
    scene.remove(this.group);
    this.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
  }
}
