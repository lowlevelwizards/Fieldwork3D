import * as THREE from 'three';

/**
 * Subtle sub-cell color grain, sampled in continuous world coordinates.
 * The physically sampled vertex colors still determine the large-scale
 * green/soil distribution. There are no new tiles, decal planes or
 * extra texture assets to align with the water surface.
 */
export function injectGroundCoverGrain(shader:{
  vertexShader:string;fragmentShader:string;
}):void{
  const vertexCommon='#include <common>';
  const begin='#include <begin_vertex>';
  const fragmentCommon='#include <common>';
  const fragmentColor='#include <color_fragment>';
  if(!shader.vertexShader.includes(vertexCommon)||
    !shader.vertexShader.includes(begin)||
    !shader.fragmentShader.includes(fragmentCommon)||
    !shader.fragmentShader.includes(fragmentColor))
    throw new Error('Standard surface shader anchors changed');

  shader.vertexShader=shader.vertexShader
    .replace(vertexCommon,vertexCommon+`
attribute float terrainCover;
varying float vTerrainCover;
varying vec2 vTerrainXZ;`)
    .replace(begin,begin+`
vTerrainCover=terrainCover;
vTerrainXZ=position.xz;`);

  shader.fragmentShader=shader.fragmentShader
    .replace(fragmentCommon,fragmentCommon+`
varying float vTerrainCover;
varying vec2 vTerrainXZ;
float coverHash(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float coverNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=coverHash(i),b=coverHash(i+vec2(1.0,0.0));
  float c=coverHash(i+vec2(0.0,1.0)),d=coverHash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}`)
    .replace(fragmentColor,fragmentColor+`
float coverFineGrain=coverNoise(vTerrainXZ*24.0);
float coverMediumGrain=coverNoise(vTerrainXZ*7.0);
float coverGrain=(coverFineGrain-.5)*.13+(coverMediumGrain-.5)*.065;
diffuseColor.rgb *= 1.0+coverGrain*clamp(vTerrainCover,0.0,1.0);`);
}

export function createGroundCoverMaterial():THREE.MeshStandardMaterial{
  const material=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:true,roughness:1,flatShading:false,
  });
  material.onBeforeCompile=injectGroundCoverGrain;
  material.customProgramCacheKey=()=>'fieldwork-ground-cover-030';
  return material;
}
