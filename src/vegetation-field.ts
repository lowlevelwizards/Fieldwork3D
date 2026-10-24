import * as THREE from 'three';
import { establishVegetation, type Plant, type PlantKind } from './vegetation-model';
import { terrainHeight, cellIndexAt } from './terrain-model';
import type { TerrainWater } from './hydrology';

/** Low-poly instanced foliage. All stems touch the authoritative heightfield,
 * receive world daylight/fog, and share a handful of draw calls on mobile.
 * No plant grows or disappears simply because the rain slider changes.
 */
export class VegetationField {
  readonly plants:readonly Plant[];
  private readonly meshes:THREE.InstancedMesh[]=[];
  private readonly canopy:{mesh:THREE.InstancedMesh;plants:Plant[];base:THREE.Color}[]=[];
  private lastUpdate=-Infinity;
  constructor(scene:THREE.Scene,seed=2601){
    this.plants=establishVegetation(seed);
    const classify=(kind:PlantKind)=>this.plants.filter(p=>p.kind===kind);
    const trunkMaterial=new THREE.MeshStandardMaterial({color:0x554736,roughness:1});
    const grass=this.build(scene,classify('grass'),
      new THREE.ConeGeometry(.030,.17,3),
      new THREE.MeshStandardMaterial({color:0x8ba777,roughness:1,side:THREE.DoubleSide}),
      .082,.0,0x83a16e);
    const reeds=this.build(scene,classify('reed'),
      new THREE.CylinderGeometry(.006,.009,.29,3),
      new THREE.MeshStandardMaterial({color:0x9f9e62,roughness:1}),
      .145,.0,0xa3aa6c);
    this.build(scene,classify('reed'),
      new THREE.ConeGeometry(.018,.065,4),
      new THREE.MeshStandardMaterial({color:0x927e55,roughness:1}),
      .305,0,0x97815b);
    const bushes=this.build(scene,classify('shrub'),
      new THREE.DodecahedronGeometry(.18,0),
      new THREE.MeshStandardMaterial({color:0x4a7352,roughness:1,flatShading:true}),
      .175,.12,0x52794f);
    const trees=classify('tree');
    this.build(scene,trees,new THREE.CylinderGeometry(.026,.042,.48,5),
      trunkMaterial,.24,0,0x6c5a40);
    const canopies=this.build(scene,trees,new THREE.IcosahedronGeometry(.33,1),
      new THREE.MeshStandardMaterial({color:0x477251,roughness:1,flatShading:true}),
      .61,.21,0x5e8759);
    for(const [mesh,plants,tint] of [
      [grass,classify('grass'),0x83a16e],
      [reeds,classify('reed'),0x9f9f69],
      [bushes,classify('shrub'),0x52794f],
      [canopies,trees,0x5e8759],
    ] as const){
      this.canopy.push({mesh,plants,base:new THREE.Color(tint)});
    }
  }
  private build(scene:THREE.Scene,plants:Plant[],geometry:THREE.BufferGeometry,
    material:THREE.Material,yOffset:number,spread:number,tint:number):THREE.InstancedMesh{
    const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,plants.length));
    mesh.count=plants.length;
    mesh.frustumCulled=false;
    const object=new THREE.Object3D(),color=new THREE.Color(tint);
    plants.forEach((p,i)=>{
      const scale=p.size*(p.kind==='grass'?.75:p.kind==='reed'?.72:1);
      object.position.set(p.x,terrainHeight(p.x,p.z)+yOffset*scale,p.z);
      object.rotation.set(0,p.angle,0);
      object.scale.set(scale,scale*(1+spread*(p.id%3)/3),scale);
      object.updateMatrix();mesh.setMatrixAt(i,object.matrix);
      const variation=.85+((p.id%11)/11)*.27;
      mesh.setColorAt(i,color.clone().multiplyScalar(variation));
    });
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.castShadow=plants.length<130;
    mesh.receiveShadow=true;scene.add(mesh);this.meshes.push(mesh);
    return mesh;
  }
  update(water:TerrainWater,now=performance.now()):void{
    if(now-this.lastUpdate<2500)return;
    this.lastUpdate=now;
    // Plants persist. Saturation only changes leaf tone gradually; shallow
    // flooding doesn't magically remove established shrubs or trees.
    for(const group of this.canopy){
      group.plants.forEach((p,i)=>{
        const wet=water.soilFraction(cellIndexAt(p.x,p.z));
        const delta=(wet-.50)*.25;
        const color=group.base.clone();
        color.offsetHSL(.004*delta,delta*.12,delta*.15);
        color.multiplyScalar(.86+(p.id%11)*.024);
        group.mesh.setColorAt(i,color);
      });
      if(group.mesh.instanceColor)group.mesh.instanceColor.needsUpdate=true;
    }
  }
  dispose(scene:THREE.Scene):void{
    for(const mesh of this.meshes){
      scene.remove(mesh);mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}
