/** Restrained light response for wear layers; no physically false glossy rust. */
import {artRGB,artHex,artLuma,relativeArtColor} from './material-art-contrast.ts';
import type {PixelSurface} from './pixel-recipes.ts';
import type {WearEffect} from '../worldgen/material-properties.ts';
import {materialProperties,wearSubstrateColor} from '../worldgen/material-properties.ts';
export function wearFinish(surface:PixelSurface,effect:WearEffect,baseColor?:number){
 const p=materialProperties(surface);
 const wet=['oil','grease','puddle'].includes(effect);
 const metallic=effect==='chip'&&p.substrate==='steel';
 const roughness=wet?.32:effect==='rust'||effect==='moss'?.98:
   effect==='scratch'?.55:Math.min(1,p.roughness+.06);
 const metalness=metallic?.45:0;
 const substrate=wearSubstrateColor(surface);
 const color=effect==='chip'||effect==='paint-peel'?substrate:
  effect==='oil'?0x30362f:effect==='grease'?0x63523c:
  effect==='rust'?0xa4633b:effect==='moss'?0x59754b:
  effect==='mineral'?0xd9d7c5:effect==='soot'?0x4b4943:
  effect==='scratch'||effect==='scrape'?substrate:
  effect==='fray'?0xc6b89f:effect==='abrade'?0xa99c87:
  effect==='fade'?0xd2ccba:effect==='dust'?0xb3a48a:
  effect==='drip'?0x77877a:effect==='mud'?0x78634c:
  effect==='scuff'?0x666b60:effect==='crack'?0x5c5a51:0x817963;
 if(baseColor===undefined)return {roughness,metalness,color,rimColor:color};
 const base=artRGB(baseColor),light=artLuma(base)>180;
 const direction=effect==='mineral'||effect==='scuff'||effect==='scratch'||effect==='abrade'||effect==='fray'?(light?'dark':'light'):
  effect==='fade'?'light':effect==='oil'||effect==='soot'||effect==='grease'?'dark':'auto';
 const strong=effect==='mineral'||effect==='oil'||effect==='paint-peel'||effect==='rust'||effect==='chip';
 const core=relativeArtColor(base,artRGB(color),.75,strong?46:25,strong?108:68,direction);
 const rimTarget=effect==='rust'?0xc59161:effect==='chip'||effect==='paint-peel'?wearSubstrateColor(surface):effect==='oil'?0x676b55:effect==='mineral'?0xb8b8a0:effect==='moss'?0x91a16d:color;
 const rim=strong||effect==='moss'?relativeArtColor(base,artRGB(rimTarget),.55,18,55,direction):core;
 return {roughness,metalness,color:artHex(core),rimColor:artHex(rim)};
}
