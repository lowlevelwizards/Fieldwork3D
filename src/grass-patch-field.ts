import * as THREE from 'three';
import { establishGrassPatch, type GrassBlade } from './grass-atom';

/**
 * One grass atom: a local patch of individual broad-leaf blades, not an
 * entire region's vegetation generator. One instanced draw call for mobile.
 */
export class GrassPatchField {
  readonly blades:readonly GrassBlade[];
  readonly mesh:THREE.InstancedMesh;
  constructor(scene:THREE.Scene){
    this.blades=establishGrassPatch(240);
    // Root, broad base, narrowing midrib, softly leaning tip. The local
    // template is 0.25 m high; instance scales retain real-world heights.
    const vertices=[
      -.025,0,0,    .025,0,0,
      -.013,.115,.012, .013,.115,.012,
      0,.25,.028,
    ];
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setIndex([0,1,3,0,3,2,2,3,4]);
    geometry.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({
      color:0xffffff,roughness:1,metalness:0,
      side:THREE.DoubleSide,flatShading:true,
    });
    this.mesh=new THREE.InstancedMesh(geometry,material,
      Math.max(1,this.blades.length));
    this.mesh.count=this.blades.length;
    this.mesh.frustumCulled=false;
    this.mesh.castShadow=false;
    this.mesh.receiveShadow=true;
    const obj=new THREE.Object3D();
    const shaded=new THREE.Color();
    this.blades.forEach((blade,i)=>{
      const scale=blade.height/.25;
      obj.position.set(blade.x,blade.y+.004,blade.z);
      obj.rotation.set(0,blade.angle,blade.lean);
      obj.scale.set(blade.width/.05,scale,blade.width/.05);
      obj.updateMatrix();
      this.mesh.setMatrixAt(i,obj.matrix);
      shaded.setHSL(.265+blade.tint*.045,.27+blade.tint*.13,
        .28+blade.tint*.13);
      this.mesh.setColorAt(i,shaded);
    });
    this.mesh.instanceMatrix.needsUpdate=true;
    if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
    this.mesh.renderOrder=1.25;
    scene.add(this.mesh);
  }
}
