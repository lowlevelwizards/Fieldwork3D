/** D2-F3/F4 fabric wraps use a single real connected cloth surface per
 * wearing mode. No box-based substitute is rendered beneath these models. */
import * as THREE from 'three';
import {createD2GaiterMode} from './operator-d2-gaiter-v2.ts';
import {createD2ShemaghMode} from './operator-d2-shemagh-v2.ts';
import {createD2BandanaMode} from './operator-d2-bandana-v2.ts';
export type D2WrapId='gaiter'|'shemagh'|'bandana';
export type D2WrapMode='lowered'|'mouth'|'nose'|'draped'|
 'face-wrap'|'head-wrap'|'raised';
export function createD2FabricWrap(id:D2WrapId,cloth:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 if(id==='gaiter')
  for(const mode of ['lowered','mouth','nose'] as const)
   root.add(createD2GaiterMode(mode,cloth));
 else if(id==='shemagh')
  for(const mode of ['draped','face-wrap','head-wrap'] as const)
   root.add(createD2ShemaghMode(mode,cloth));
 else
  for(const mode of ['raised','lowered'] as const)
   root.add(createD2BandanaMode(mode,cloth));
 const defaultMode=id==='gaiter'?'nose':id==='shemagh'?'draped':'raised';
 for(const mode of root.children)mode.visible=mode.userData.d2WrapMode===defaultMode;
 return root;
}
