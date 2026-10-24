import * as THREE from 'three';
import type { TerrainWater } from './hydrology';
import { CELL_SIZE, terrainHeight } from './terrain-model';

/**
 * Build 019 / 020 — visibly connected moving streams and temporary overbank
 * inundation, derived ONLY from stored runoff / flood litres in TerrainWater.
 * No ornamental water is generated if there is no actual mobile water.
 * Narrow stream strips trace routed downhill links across the same geometry.
 */
export class FlowField {
  private readonly channels:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private readonly overbank:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private readonly channelTint=new THREE.Color(0x426c79);
  private readonly floodTint=new THREE.Color(0x456f77);
  constructor(scene:THREE.Scene){
    const material=new THREE.MeshStandardMaterial({
      color:0xffffff,vertexColors:true,
      transparent:true,opacity:.92,roughness:.47,metalness:0,
      depthTest:true,depthWrite:false,side:THREE.DoubleSide,
    });
    this.channels=new THREE.Mesh(new THREE.BufferGeometry(),material);
    this.channels.frustumCulled=false;
    this.channels.renderOrder=2.15;
    scene.add(this.channels);
    this.overbank=new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({
        color:0xffffff,vertexColors:true,
        transparent:true,roughness:.72,metalness:0,
        depthTest:true,depthWrite:false,side:THREE.DoubleSide,
      }));
    this.overbank.frustumCulled=false;
    this.overbank.renderOrder=2.12;
    scene.add(this.overbank);
  }
  update(water:TerrainWater):void{
    const pos:number[]=[];
    const rgb:number[]=[];
    const floodPos:number[]=[];
    const floodRGBA:number[]=[];
    const {watershed}=water;
    for(const cell of watershed.cells){
      const index=cell.index;
      const litres=water.runoffLiters(index);
      const to=watershed.downhill[index];
      const isChannel=watershed.channels[index];

      // A stream exists wherever the measured network is transporting
      // water. Thin rills connect to larger tributaries, then main stem.
      if(to>=0 && litres>.045 && (isChannel || litres>.45)){
        const next=watershed.cells[to];
        const deltaX=next.x-cell.x,deltaZ=next.z-cell.z;
        const distance=Math.hypot(deltaX,deltaZ);
        if(distance>.001){
          const ux=-deltaZ/distance,uz=deltaX/distance;
          const width=Math.min(.19,Math.max(.035,
            .055+.025*Math.log1p(litres)));
          const startWidth=Math.max(.017,width*.75);
          const start=[
            [cell.x+ux*startWidth,cell.z+uz*startWidth],
            [cell.x-ux*startWidth,cell.z-uz*startWidth],
          ];
          const finish=[
            [next.x+ux*width,next.z+uz*width],
            [next.x-ux*width,next.z-uz*width],
          ];
          // Upstream and downstream heights come from the actual terrain.
          // A narrow surface film is raised just enough to remain visible.
          const depth=Math.min(.042,water.waterDepthAtCell(index)*.38);
          const vertices=[start[0],finish[0],finish[1],
            start[0],finish[1],start[1]];
          for(const p of vertices){
            pos.push(p[0],terrainHeight(p[0],p[1])+.012+depth,p[1]);
            const tint=this.channelTint;
            rgb.push(tint.r,tint.g,tint.b);
          }
        }
      }
      const flooded=water.floodLiters(index);
      if(flooded<=.06)continue;
      const depth=flooded/(1000*CELL_SIZE*CELL_SIZE);
      const alpha=Math.min(.78,.14+depth*4.5);
      const half=CELL_SIZE*.50;
      const corners=[
        [cell.x-half,cell.z-half],
        [cell.x+half,cell.z-half],
        [cell.x+half,cell.z+half],
        [cell.x-half,cell.z+half],
      ];
      // Smooth star-shaped spill into neighboring cells, not hard flat
      // rectangular panels. Actual cell flood storage drives coverage.
      for(let k=0;k<4;k++){
        for(const item of [
          {point:[cell.x,cell.z],opacity:alpha},
          {point:corners[k],opacity:.05*alpha},
          {point:corners[(k+1)%4],opacity:.05*alpha},
        ]){
          const p=item.point;
          floodPos.push(p[0],terrainHeight(p[0],p[1])+
            .015+Math.min(.095,depth*.28),p[1]);
          const tint=this.floodTint;
          floodRGBA.push(tint.r,tint.g,tint.b,item.opacity);
        }
      }
    }
    const stream=new THREE.BufferGeometry();
    stream.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    stream.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
    if(pos.length)stream.computeVertexNormals();
    this.channels.geometry.dispose();
    this.channels.geometry=stream;
    this.channels.visible=pos.length>0;

    const flood=new THREE.BufferGeometry();
    flood.setAttribute('position',new THREE.Float32BufferAttribute(floodPos,3));
    flood.setAttribute('color',new THREE.Float32BufferAttribute(floodRGBA,4));
    if(floodPos.length)flood.computeVertexNormals();
    this.overbank.geometry.dispose();
    this.overbank.geometry=flood;
    this.overbank.visible=floodPos.length>0;
  }
}
