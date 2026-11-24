/** W2: integrate static finish coverage into the existing wall's lit albedo.
 * One shared shader shape, per-material mask and dimensions; no geometry copies.
 * The selected face is explicit; the opposite face retains its base material. */
import * as THREE from 'three';
import type {WallSurfaceRecipe} from '../worldgen/wall-surface-recipe.ts';
export function integrateWallSurface(material:THREE.MeshStandardMaterial,texture:THREE.DataTexture,recipe:WallSurfaceRecipe,baked=false){
 const original=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  original.call(material,shader,renderer);
  shader.uniforms.fwWallMask={value:texture};
  shader.uniforms.fwWallExtent={value:new THREE.Vector2(recipe.length,recipe.height)};
  shader.uniforms.fwWallSide={value:recipe.face};
  shader.vertexShader='varying vec3 vFWWallPosition;\nvarying float vFWWallFace;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFWWallPosition=position;\nvFWWallFace=normal.z;');
  const map=baked?`if(vFWWallFace*fwWallSide>.5){
      vec2 fwUV=clamp(vec2(vFWWallPosition.x/fwWallExtent.x+.5,.5-vFWWallPosition.y/fwWallExtent.y),0.0,1.0);
      diffuseColor.rgb=texture2D(fwWallMask,fwUV).rgb;
    }else{
      #include <map_fragment>
    }`:`#include <map_fragment>
    if(vFWWallFace*fwWallSide>.5){
      vec2 fwUV=clamp(vec2(vFWWallPosition.x/fwWallExtent.x+.5,.5-vFWWallPosition.y/fwWallExtent.y),0.0,1.0);
      vec4 fwWear=texture2D(fwWallMask,fwUV);
      vec3 fwColor=fwWear.rgb;
      #ifdef USE_MAP
        fwColor*=sampledDiffuseColor.rgb;
      #endif
      diffuseColor.rgb=mix(diffuseColor.rgb,fwColor,fwWear.a);
    }
  `;
  shader.fragmentShader='uniform sampler2D fwWallMask;\nuniform vec2 fwWallExtent;\nuniform float fwWallSide;\nvarying vec3 vFWWallPosition;\nvarying float vFWWallFace;\n'+shader.fragmentShader.replace('#include <map_fragment>',map);
 };
 material.customProgramCacheKey=()=>key+':w2-anchored-wall-v2:'+(baked?'baked':'mask');
 material.needsUpdate=true;
}
