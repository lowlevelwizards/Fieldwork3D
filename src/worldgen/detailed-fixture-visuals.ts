/** Lightweight, recognizable geometry for the former generic cubes.
 * Authoritative in both missions and the asset showroom. The scene owns
 * reusable box geometry; each feature is a handful of flat-shaded primitives.
 */
import * as THREE from 'three';
import type {Obstacle} from '../breach-core.ts';
import type {FixtureVisualContext} from './fixture-visuals.ts';
import {propDefinition} from './asset-catalog.ts';
export const DETAILED_FIXTURE_IDS=new Set([
 'nightstand','side-table','rug','lamp','shower','office-chair',
 'computer','printer','cash-register','display-rack','product-box',
 'crate','box','pallet','compressor','cable-reel','planter','picnic-table',
 'patio-chair','grill','shed','dumpster','shipping-container','books',
 'papers','mug','tools','trash','packages','picture-frame',
]);
export function renderDetailedFixture(group:THREE.Group,c:Obstacle,
 fixture:string,ctx:FixtureVisualContext,wood:THREE.Material,
 steel:THREE.Material,olive:THREE.Material,metal:THREE.Material):boolean{
 if(!DETAILED_FIXTURE_IDS.has(fixture))return false;
 const w=c.w,d=c.h,H=propDefinition(fixture)?.height??20;
 const b=(x:number,y:number,z:number,bw:number,bh:number,bd:number,
    mat:THREE.Material,cast=true)=>
   ctx.box(group,c.x+x,y,c.y+z,Math.max(.4,bw),Math.max(.3,bh),
     Math.max(.4,bd),mat,cast);
 const ink=ctx.solid(0x363f40),light=ctx.solid(0xc5bca4),
   paper=ctx.solid(0xb9b09a),red=ctx.solid(0xa77762),
   green=ctx.solid(0x536e55),glass=ctx.solid(0x64848a,.36);
 const legs=(top:number,spanW=w*.78,spanD=d*.75)=>{
   for(const sx of [-1,1])for(const sz of [-1,1])
    b(sx*spanW*.5,top*.5,sz*spanD*.5,2.6,top,2.6,steel);
 };
 switch(fixture){
 case 'nightstand':case 'side-table':{
   const drawer=fixture==='nightstand';
   const y=H-1.2;b(0,y,0,w,2.4,d,wood);
   legs(drawer?H*.69:H-2.4);
   if(drawer){
    b(0,H*.70,d*.42,w*.78,H*.28,2,steel,false);
    b(0,H*.70,d*.48,3,2,1,light,false);
    b(0,3,0,w*.80,3,d*.78,wood);
   }
   return true;
 }
 case 'rug':{
   b(0,.19,0,w,.38,d,red,false);
   b(0,.42,0,w*.90,.1,d*.85,olive,false);
   for(const sx of [-1,1])b(sx*w*.46,.35,0,1,.2,d*.80,light,false);
   return true;
 }
 case 'lamp':{
   b(0,.9,0,w*.48,1.8,d*.48,steel);
   b(0,H*.42,0,2.1,H*.78,2.1,metal);
   b(0,H*.83,0,w*.86,H*.27,d*.86,paper,false);
   b(0,H-.6,0,w*.76,1.2,d*.76,wood,false);
   return true;
 }
 case 'shower':{
   b(0,.85,0,w,1.7,d,light);
   b(0,2.5,0,w*.84,1.4,d*.83,steel,false);
   for(const sx of [-1,1]){
    b(sx*w*.45,H*.48,-d*.45,1.5,H*.95,1.5,steel);
    b(sx*w*.45,H*.50,d*.45,1.5,H*.95,1.5,steel);
   }
   b(0,H*.5,-d*.47,w*.85,H*.85,1,glass,false);
   b(w*.44,H*.5,0,1,H*.85,d*.82,glass,false);
   b(-w*.20,H*.68,-d*.32,2,H*.44,2,metal);
   b(-w*.20,H*.84,-d*.18,w*.27,1.2,3.5,metal);
   return true;
 }
 case 'office-chair':{
   b(0,10,0,w*.83,3,d*.78,olive);
   b(0,H*.69,-d*.37,w*.87,H*.52,3.4,olive);
   b(0,6,0,2.5,9,2.5,steel);
   for(const sign of [-1,1]){
    b(sign*w*.25,3,0,w*.45,2,3,ink);
    b(0,3,sign*d*.23,3,2,d*.46,ink);
    b(sign*w*.25,12,0,2.2,5,2.2,steel);
   }
   return true;
 }
 case 'computer':{
   b(0,1,0,w*.71,2,d*.63,ink);
   b(0,H*.58,-d*.19,w*.83,H*.70,2.2,steel);
   b(0,H*.60,-d*.10,w*.71,H*.58,.8,glass,false);
   b(0,3,d*.29,w*.68,1.3,d*.22,light,false);
   b(0,2.0,-d*.10,2.3,5,2.3,steel);
   return true;
 }
 case 'printer':{
   b(0,H*.48,0,w*.96,H*.72,d*.92,steel);
   b(0,H*.88,-d*.22,w*.79,2,d*.32,ink,false);
   b(0,H*.62,d*.48,w*.80,2.2,4,ink,false);
   b(0,H*.62,d*.57,w*.62,.4,4,paper,false);
   b(w*.34,H*.86,d*.20,2,1.2,1,green,false);
   return true;
 }
 case 'cash-register':{
   b(0,H*.22,0,w,H*.44,d,steel);
   b(0,H*.55,-d*.18,w*.82,H*.34,d*.52,ink);
   b(0,H*.78,-d*.22,w*.63,1.3,d*.37,glass,false);
   b(0,H*.30,d*.49,w*.71,2,1.8,wood,false);
   b(w*.29,H*.52,d*.38,2,1.5,2,light,false);
   return true;
 }
 case 'display-rack':{
   for(const sx of [-1,1])b(sx*w*.45,H*.5,0,2.8,H,d*.8,steel);
   for(const y of [3,H*.34,H*.63,H*.91]){
    b(0,y,0,w,2,d,wood);
    if(y>4)for(const sx of [-.30,0,.30])
      b(sx*w,y+3,0,w*.18,5,d*.33,y>H*.6?red:olive,false);
   }
   b(0,H*.92,d*.40,w,3,2,metal);
   return true;
 }
 case 'product-box':case 'box':case 'packages':case 'crate':{
   const crate=fixture==='crate',bundle=fixture==='packages';
   const base=crate?wood:bundle?paper:olive;
   b(0,H*.48,0,w*.96,H*.93,d*.96,base);
   b(0,H*.96,0,w,.9,d,steel,false);
   if(crate){
    for(const sz of [-1,1])for(const sx of [-.32,.32])
      b(sx*w,H*.51,sz*d*.51,w*.22,H*.72,1.4,wood,false);
    for(const sx of [-1,1])
      b(sx*w*.48,H*.51,0,1.6,H*.72,d*.8,steel,false);
   }else{
    b(0,H*.97,0,w*.14,.7,d,light,false);
    b(0,H*.57,d*.5,w*.47,H*.28,.7,paper,false);
    if(bundle)b(w*.22,H*.32,d*.51,w*.13,H*.35,.9,red,false);
   }
   return true;
 }
 case 'pallet':{
   for(const sx of [-.37,0,.37])b(sx*w,2.2,0,w*.15,4.2,d*.93,steel);
   for(const sz of [-.35,0,.35])b(0,H-.9,sz*d,w*.93,1.8,d*.20,wood);
   for(const sx of [-.44,.44])b(sx*w,H*.52,0,3,2,d*.95,wood);
   return true;
 }
 case 'compressor':{
   const tank=new THREE.Mesh(
     new THREE.CylinderGeometry(d*.36,d*.36,w*.70,10),steel);
   tank.rotation.z=Math.PI/2;tank.position.set(c.x,H*.42,c.y);
   tank.castShadow=true;group.add(tank);
   b(0,H*.70,0,w*.33,H*.35,d*.44,ink);
   b(-w*.28,H*.20,-d*.31,4,H*.35,4,metal);
   b(w*.28,H*.20,-d*.31,4,H*.35,4,metal);
   b(0,H*.38,d*.41,w*.68,1.6,2,light,false);
   return true;
 }
 case 'cable-reel':{
   const spool=ctx.solid(0x826b51);
   const radius=d*.45;
   for(const sx of [-1,1]){
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(
      radius,radius,2.5,10),spool);
    disc.rotation.z=Math.PI/2;
    disc.position.set(c.x+sx*w*.40,radius,c.y);
    disc.castShadow=true;group.add(disc);
   }
   const cable=new THREE.Mesh(new THREE.CylinderGeometry(
      radius*.62,radius*.62,w*.74,10),ink);
   cable.rotation.z=Math.PI/2;
   cable.position.set(c.x,radius,c.y);cable.castShadow=true;group.add(cable);
   b(0,radius,0,w*.9,2.2,2,steel,false);
   return true;
 }
 case 'planter':{
   b(0,H*.20,0,w*.75,H*.40,d*.75,red);
   b(0,H*.41,0,w*.87,2,d*.87,wood);
   b(0,H*.62,0,w*.46,H*.35,d*.46,green);
   for(const sx of [-.25,.25])
     b(sx*w,H*.81,sx*d,w*.35,H*.33,d*.32,green);
   return true;
 }
 case 'picnic-table':{
   b(0,H-1.6,0,w*.74,3.2,d*.48,wood);
   for(const sz of [-1,1]){
    b(0,H*.49,sz*d*.36,w*.92,3,d*.19,wood);
    b(-w*.28,H*.35,sz*d*.22,3,H*.68,3,steel);
    b(w*.28,H*.35,sz*d*.22,3,H*.68,3,steel);
   }
   return true;
 }
 case 'patio-chair':{
   b(0,H*.40,0,w*.78,3,d*.76,olive);
   b(0,H*.72,-d*.37,w*.78,H*.55,2.6,olive);
   legs(H*.40,w*.60,d*.64);
   for(const sx of [-1,1])b(sx*w*.43,H*.53,0,2.0,2,d*.70,metal);
   return true;
 }
 case 'grill':{
   b(0,H*.70,0,w*.81,H*.36,d*.78,ink);
   b(0,H*.94,0,w*.85,H*.12,d*.83,steel);
   b(0,H*.55,d*.36,w*.63,2,1.3,metal,false);
   for(const sx of [-1,1])b(sx*w*.28,H*.32,0,2.6,H*.56,2.6,steel);
   b(0,H*.96,-d*.22,w*.27,1.2,1.3,wood,false);
   return true;
 }
 case 'shed':{
   b(0,H*.39,0,w*.97,H*.75,d*.94,wood);
   for(const sz of [-1,1]){
    const roof=b(0,H*.84,sz*d*.25,w*1.08,3,d*.63,steel);
    roof.rotation.x=sz*.36;
   }
   b(0,H*.34,d*.49,w*.30,H*.61,1.1,ink,false);
   b(w*.105,H*.34,d*.52,2,2,1.3,light,false);
   for(const sx of [-.36,.36])
    b(sx*w,H*.46,d*.49,w*.11,H*.26,1.1,glass,false);
   return true;
 }
 case 'dumpster':{
   b(0,H*.43,0,w*.96,H*.78,d*.94,green);
   b(0,H*.85,-d*.25,w*.98,3,d*.51,ink);
   b(0,H*.88,d*.25,w*.98,3,d*.46,ink);
   for(const sx of [-1,1]){
    b(sx*w*.48,H*.46,0,2.4,H*.75,d,steel);
    b(sx*w*.35,2,0,4,4,4,ink);
   }
   b(0,H*.40,d*.49,w*.72,1.6,1,light,false);
   return true;
 }
 case 'shipping-container':{
   b(0,H*.5,0,w,H,d*.95,red);
   for(const sx of [-1,1])
    b(sx*w*.495,H*.50,0,2.5,H,d,metal);
   for(const sz of [-1,1]){
    for(let n=-7;n<=7;n++)
     b(n*w/16,H*.50,sz*d*.49,2.3,H*.82,1.3,steel,false);
   }
   for(const sx of [-.25,.25]){
    b(w*.50,H*.50,sx*d,1.5,H*.90,2,ink,false);
    b(w*.51,H*.45,sx*d,2.5,H*.65,1,metal,false);
   }
   b(0,H*.97,0,w,2.6,d,steel);
   return true;
 }
 case 'books':{
   for(const [n,color] of [wood,red,green].entries())
    b((n-1)*w*.27,3.1+n*.45,0,w*.23,6+n*.9,d*.88,color);
   return true;
 }
 case 'papers':{
   for(let n=0;n<4;n++)
    b((n-1.5)*.48,.26+n*.12,(n%2)*.36,w*.86,.15,d*.85,paper,false);
   return true;
 }
 case 'mug':{
   const cup=new THREE.Mesh(new THREE.CylinderGeometry(
     w*.36,w*.30,H*.80,9),light);
   cup.position.set(c.x,H*.42,c.y);cup.castShadow=true;group.add(cup);
   const handle=new THREE.Mesh(new THREE.TorusGeometry(
     w*.20,.58,5,9,Math.PI*1.7),steel);
   handle.position.set(c.x+w*.40,H*.51,c.y);group.add(handle);
   return true;
 }
 case 'tools':{
   for(const dx of [-.27,0,.27]){
    b(dx*w,1.2,0,1.4,2.4,d*.78,wood);
    b(dx*w,3.2,-d*.20,w*.19,1.5,3.1,metal);
   }
   return true;
 }
 case 'trash':{
   b(0,H*.49,0,w*.82,H*.90,d*.82,steel);
   b(0,H*.96,0,w,1.6,d,ink);
   for(const dx of [-.22,.18])b(dx*w,H*.94,0,w*.30,1,d*.37,paper,false);
   return true;
 }
 case 'picture-frame':{
   b(0,H*.50,0,w,H,d*.80,wood);
   b(0,H*.50,d*.44,w*.81,H*.83,.5,red,false);
   b(-w*.16,H*.61,d*.48,w*.22,H*.24,.3,light,false);
   b(w*.22,H*.37,d*.48,w*.28,H*.32,.3,olive,false);
   return true;
 }
 default:return false;
 }
}
