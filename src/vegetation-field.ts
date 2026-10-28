import * as THREE from 'three';
import { establishWoodyVegetation,type WoodyLandscape,
  type WoodyPlant } from './vegetation-model';
import { createWoodyGeometry } from './vegetation-geometry';

/**
 * One stable set of physical trees and shrubs. Species and maturity stay
 * deliberately simple. Four shared instanced draw groups (tree trunk, tree
 * crown, crown lobes, shrub stems, shrub foliage) remain cheap on iPhone.
 */
export class VegetationField {
  readonly world:WoodyLandscape;
  private readonly scene:THREE.Scene;
  private readonly meshes:THREE.InstancedMesh[]=[];
  constructor(scene:THREE.Scene,seed=31){
    this.scene=scene;
    this.world=establishWoodyVegetation(seed);
    const g=createWoodyGeometry();
    const bark=new THREE.MeshStandardMaterial({color:0x736850,roughness:1});
    const foliage=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true});
    const shrubBark=new THREE.MeshStandardMaterial({color:0x6a6551,roughness:1});
    const leaves=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true});
    const treeTrunks=this.add(g.trunk,bark,this.world.trees.length,true);
    const treeCrowns=this.add(g.crown,foliage,this.world.trees.length,true);
    const treeLobes=this.add(g.crownLobe,foliage,this.world.trees.length*2,true);
    const shrubStems=this.add(g.shrubStem,shrubBark,this.world.shrubs.length,false);
    const shrubCanopies=this.add(g.shrubCrown,leaves,this.world.shrubs.length*3,true);
    const obj=new THREE.Object3D(),color=new THREE.Color();
    const treeTone=(p:WoodyPlant,lobe:number)=>{
      color.setHSL(.273+.042*p.variation+.012*lobe,
        .26+.10*p.variation,.265+.11*p.variation+.02*lobe);
      return color;
    };
    for(let i=0;i<this.world.trees.length;i++){
      const p=this.world.trees[i],s=p.scale;
      obj.rotation.set(0,p.angle,0);
      obj.position.set(p.x,p.y+.455*s-.025,p.z);
      obj.scale.set(s,.91*s,s);
      obj.updateMatrix();treeTrunks.setMatrixAt(i,obj.matrix);
      // Main crown overlaps the trunk top and the two supporting lobes.
      obj.position.set(p.x,p.y+1.14*s,p.z);
      obj.scale.set(1.08*s,.95*s,1.07*s);
      obj.updateMatrix();treeCrowns.setMatrixAt(i,obj.matrix);
      treeCrowns.setColorAt(i,treeTone(p,0));
      for(let l=0;l<2;l++){
        const a=p.angle+(l===0?.15:2.45);
        obj.position.set(p.x+Math.cos(a)*.27*s,
          p.y+(1.06+(l===0?.14:-.12))*s,
          p.z+Math.sin(a)*.27*s);
        obj.scale.set((.96+.12*l)*s,(.94+.15*l)*s,.96*s);
        obj.rotation.set(0,a,0);obj.updateMatrix();
        treeLobes.setMatrixAt(i*2+l,obj.matrix);
        treeLobes.setColorAt(i*2+l,treeTone(p,l+1));
      }
    }
    for(let i=0;i<this.world.shrubs.length;i++){
      const p=this.world.shrubs[i],s=p.scale;
      obj.position.set(p.x,p.y+.11*s-.009,p.z);
      obj.rotation.set(0,p.angle,0);
      obj.scale.set(s,.22*s,s);obj.updateMatrix();
      shrubStems.setMatrixAt(i,obj.matrix);
      for(let l=0;l<3;l++){
        const a=p.angle+l*Math.PI*2/3;
        const offset=l===0?.065:.11;
        obj.position.set(p.x+Math.cos(a)*offset*s,
          p.y+(.24+(l%2)*.035)*s,
          p.z+Math.sin(a)*offset*s);
        obj.rotation.set(0,a*.38,0);
        obj.scale.set((.91+l*.11)*s,(.77+(l%2)*.17)*s,
          (.86+(2-l)*.05)*s);
        obj.updateMatrix();shrubCanopies.setMatrixAt(i*3+l,obj.matrix);
        color.setHSL(.275+p.variation*.05+l*.007,
          .27+p.variation*.10,.29+p.variation*.075+l*.017);
        shrubCanopies.setColorAt(i*3+l,color);
      }
    }
    for(const mesh of this.meshes){
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
  }
  private add(geometry:THREE.BufferGeometry,material:THREE.Material,
    count:number,shadows:boolean):THREE.InstancedMesh{
    const mesh=new THREE.InstancedMesh(geometry,material,Math.max(count,1));
    mesh.count=count;
    mesh.frustumCulled=false; // 10m world, very low instance counts
    mesh.castShadow=shadows;
    mesh.receiveShadow=true;
    this.scene.add(mesh);this.meshes.push(mesh);
    return mesh;
  }
  dispose():void{
    const materials=new Set<THREE.Material>();
    for(const mesh of this.meshes){
      this.scene.remove(mesh);mesh.geometry.dispose();
      if(Array.isArray(mesh.material))mesh.material.forEach(m=>materials.add(m));
      else materials.add(mesh.material);
    }
    for(const m of materials)m.dispose();
  }
}
