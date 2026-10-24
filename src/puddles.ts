import * as THREE from 'three';
import {
  GRID_CELLS, CELL_SIZE, WORLD_HALF, terrainHeight,
} from './terrain-model';
import { type TerrainWater } from './hydrology';
import type { EnvironmentState } from './environment-conditions';

type Vertex = { x:number;z:number;h:number };

// Clip a triangle of actual GROUND against a horizontal water surface.
// The intersection runs along the land contour, rather than drawing oval
// decals at arbitrary elevations.
function submergedPolygon(triangle:Vertex[], level:number):Vertex[] {
  const output:Vertex[]=[];
  for(let i=0;i<triangle.length;i++){
    const a=triangle[i], b=triangle[(i+1)%triangle.length];
    const aInside=a.h<=level, bInside=b.h<=level;
    if(aInside)output.push(a);
    if(aInside!==bInside){
      const t=(level-a.h)/(b.h-a.h);
      output.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,h:level});
    }
  }
  return output;
}

/**
 * A single 3-D water surface at an equal level in each flooded catchment.
 * One rendered mesh; terrain z-buffer hides any shoreline overlaps.
 * Volume stays exclusively in TerrainWater.
 */
export class PuddleField {
  private readonly surface:THREE.Mesh;
  private readonly material:THREE.ShaderMaterial;
  private lastVolumes:number[]=[];

  constructor(scene:THREE.Scene){
    // The old Phong material sampled bright sky colors as specular, which
    // bleached the ponds into opaque-looking white discs in midday sun.
    // A restrained, depth-sensitive shader keeps water dark and translucent
    // at the shore while preserving an occasional small sky/sun glint.
    this.material=new THREE.ShaderMaterial({
      transparent:true,
      depthTest:true,
      depthWrite:false,
      side:THREE.DoubleSide,
      toneMapped:false,
      uniforms:{
        deepColor:{value:new THREE.Color(0x274750)},
        shoreColor:{value:new THREE.Color(0x516b65)},
        skyColor:{value:new THREE.Color(0x7c969b)},
        sunlight:{value:0},
        sunDirection:{value:new THREE.Vector3(0,1,0)},
        hour:{value:0},
        rainfall:{value:0},
      },
      vertexShader:`
        attribute float aDepth;
        varying float vDepth;
        varying vec3 vWorld;
        void main(){
          vDepth = aDepth;
          vec4 world=modelMatrix*vec4(position,1.0);
          vWorld=world.xyz;
          gl_Position=projectionMatrix*viewMatrix*world;
        }
      `,
      fragmentShader:`
        uniform vec3 deepColor;
        uniform vec3 shoreColor;
        uniform vec3 skyColor;
        uniform float sunlight;
        uniform vec3 sunDirection;
        uniform float hour;
        uniform float rainfall;
        varying float vDepth;
        varying vec3 vWorld;
        void main(){
          // Shoreline tint fades through the first few centimetres.
          float depthFactor=smoothstep(0.0,0.075,vDepth);
          float shoreFade=smoothstep(0.001,0.028,vDepth);
          vec3 viewDirection=normalize(cameraPosition-vWorld);
          float grazing=pow(1.0-max(dot(vec3(0.0,1.0,0.0),viewDirection),0.0),3.0);
          vec3 color=mix(shoreColor,deepColor,depthFactor);
          color=mix(color,skyColor,0.10+0.14*grazing);
          // Only a restrained glint, never a broad white Phong highlight.
          vec3 reflection=reflect(-normalize(sunDirection),vec3(0.0,1.0,0.0));
          float glint=pow(max(dot(viewDirection,reflection),0.0),95.0);
          color+=vec3(0.12,0.13,0.11)*glint*min(1.0,sunlight/2.2);
          // Fine surface disturbance comes from the same world clock and
          // intensifies during rainfall. A paused world freezes its water.
          float ripple=sin(vWorld.x*29.0+hour*8.0)
                      *sin(vWorld.z*23.0-hour*6.5);
          color+=vec3(.018,.022,.022)*ripple*(.20+.80*rainfall)*shoreFade;
          float opacity=mix(.13,.91,shoreFade);
          gl_FragColor=vec4(max(color,vec3(0.0)),opacity);
          #include <colorspace_fragment>
        }
      `,
    });
    this.surface=new THREE.Mesh(new THREE.BufferGeometry(),this.material);
    // Shadows and shallow mist (1) come before water (2); rain (3/4)
    // and sky clouds (5) composite afterward, as in the previous fix.
    this.surface.renderOrder=2;
    this.surface.frustumCulled=false;
    scene.add(this.surface);
  }

  update(water:TerrainWater,env:EnvironmentState,rainAmount:number):void {
    // Daylight can tint the sky reflection, but cannot wash ponds to white.
    const skyTint=this.material.uniforms.skyColor.value as THREE.Color;
    skyTint.setHex(env.skyHorizon).lerp(new THREE.Color(0x526f78),.82);
    const sunDir=this.material.uniforms.sunDirection.value as THREE.Vector3;
    sunDir.set(env.sunDirection.x,env.sunDirection.y,env.sunDirection.z);
    this.material.uniforms.sunlight.value=env.sunlight;
    this.material.uniforms.hour.value=env.hour;
    this.material.uniforms.rainfall.value=rainAmount;

    const volumes=water.watershed.basins.map(b=>water.basinLiters(b.id));
    const changed=volumes.length!==this.lastVolumes.length ||
      volumes.some((v,i)=>Math.abs(v-(this.lastVolumes[i]??0))>.09);
    if(!changed)return;
    this.lastVolumes=volumes;
    const positions:number[]=[];
    const depths:number[]=[];
    const {watershed}=water;
    for(const basin of watershed.basins){
      const level=water.surfaceLevel(basin.id);
      if(level===null)continue;
      const y=level+.003; // a water surface must sit just above submerged land
      for(const cellIndex of basin.cellIndexes){
        const row=Math.floor(cellIndex/GRID_CELLS);
        const col=cellIndex%GRID_CELLS;
        const x=-WORLD_HALF+col*CELL_SIZE,z=-WORLD_HALF+row*CELL_SIZE;
        const tl={x,z,h:terrainHeight(x,z)};
        const tr={x:x+CELL_SIZE,z,h:terrainHeight(x+CELL_SIZE,z)};
        const br={x:x+CELL_SIZE,z:z+CELL_SIZE,h:terrainHeight(x+CELL_SIZE,z+CELL_SIZE)};
        const bl={x,z:z+CELL_SIZE,h:terrainHeight(x,z+CELL_SIZE)};
        const center=watershed.cells[cellIndex];
        const cc={x:center.x,z:center.z,h:center.height};
        const triangles:Vertex[][]=[
          [tl,cc,tr],[tr,cc,br],[br,cc,bl],[bl,cc,tl],
        ];
        for(const triangle of triangles){
          const polygon=submergedPolygon(triangle,level);
          if(polygon.length<3)continue;
          for(let i=1;i<polygon.length-1;i++){
            const a=polygon[0],b=polygon[i],c=polygon[i+1];
            // Skip degenerate shore slivers.
            const area=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
            if(Math.abs(area)<1e-9)continue;
            positions.push(a.x,y,a.z,b.x,y,b.z,c.x,y,c.z);
            // Depth is measured from the actual terrain at each vertex.
            // Water is strongest in the deeper centre and transparent where
            // it crosses the ground contour: no artificial hard white rim.
            depths.push(Math.max(0,level-a.h),
                        Math.max(0,level-b.h),
                        Math.max(0,level-c.h));
          }
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('aDepth',new THREE.Float32BufferAttribute(depths,1));
    if(positions.length)geometry.computeBoundingSphere();
    this.surface.geometry.dispose();
    this.surface.geometry=geometry;
    this.surface.visible=positions.length>0;
  }
}
