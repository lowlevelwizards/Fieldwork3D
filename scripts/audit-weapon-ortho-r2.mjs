/** Offline actual-mesh silhouette audit: side, top and front orthographic SVGs.
 * All polygons are obtained directly from the exact game mesh tree. This is
 * not a separate authored illustration and never changes runtime geometry.
 *
 * Run: node --experimental-strip-types scripts/audit-weapon-ortho-r2.mjs
 * Output: reports/weapon-ortho-r2.html (gitignored/local review artifact).
 */
import * as THREE from 'three';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';

const steel=new THREE.MeshBasicMaterial({color:0xb5beb1});
const dark=new THREE.MeshBasicMaterial({color:0x69756d});
const t=(n)=>Number(n).toFixed(2);
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
function axisPoint(v,view,scale){
 if(view==='side')return [v.x*scale,-v.y];
 if(view==='top')return [v.x*scale,-v.z];
 return [v.z,-v.y]; // front: depth Z horizontal, Y vertical
}
function panel(group,view,scale){
 const polys=[];
 group.updateMatrixWorld(true);
 group.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  const geo=o.geometry,pos=geo.getAttribute('position'),idx=geo.getIndex();
  const n=idx?idx.count:pos.count;
  const col=o.material===dark?'#7e9185':
   o.material===steel?'#cdd7c9':'#a8ac92';
  for(let i=0;i+2<n;i+=3){
   const pts=[];
   for(let j=0;j<3;j++){
    const k=idx?idx.getX(i+j):i+j;
    const v=new THREE.Vector3(pos.getX(k),pos.getY(k),pos.getZ(k));
    v.applyMatrix4(o.matrixWorld);
    pts.push(axisPoint(v,view,scale));
   }
   const twiceArea=Math.abs((pts[1][0]-pts[0][0])*(pts[2][1]-pts[0][1])-
     (pts[2][0]-pts[0][0])*(pts[1][1]-pts[0][1]));
   if(twiceArea<1e-8)continue;
   polys.push('<polygon points="'+pts.map(p=>p.map(t).join(',')).join(' ')+
    '" fill="'+col+'" />');
  }
 });
 const wide=view!=='front';
 const vb=wide?'-22 -12 46 24':'-6 -10 12 20';
 return '<div class="panel"><b>'+view.toUpperCase()+'</b><svg '+
  'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+view+
  ' orthographic outline" viewBox="'+vb+'" preserveAspectRatio="xMidYMid meet">'+
  '<path d="M -21 0H22" stroke="#415c55" stroke-width=".08"/>'+
  polys.join('')+'</svg></div>';
}
let body='',totalMeshes=0,totalTriangles=0;
for(const preset of FAMILY_PRESETS){
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),preset.id);
 const model=buildWeaponSilhouette(preset.weapon,steel,dark,cfg);
 const scale=resolveWeaponAssembly(cfg).lengthScale;
 const box=new THREE.Box3().setFromObject(model);
 const meshes=model.children.length;
 const triangles=model.children.reduce((sum,o)=>{
  if(!(o instanceof THREE.Mesh))return sum;
  return sum+(o.geometry.index?o.geometry.index.count:
   o.geometry.attributes.position.count)/3;
 },0);
 totalMeshes+=meshes;totalTriangles+=triangles;
 body+='<section class="preset"><div class="meta"><strong>'+
  htmlEscape(preset.name)+'</strong><small>'+htmlEscape(preset.id)+
  ' · '+meshes+' meshes · '+Math.round(triangles)+' triangles · scale '+
  t(scale)+' · local muzzle X='+t(box.max.x)+'</small></div><div class="views">'+
  ['side','top','front'].map(view=>panel(model,view,scale)).join('')+
  '</div></section>';
 clearWeaponSilhouette(model);
}
steel.dispose();dark.dispose();
const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Fieldwork Weapon Ortho R2</title><style>'+
 'body{margin:0;padding:22px;background:#101e1a;color:#eef2e7;font:14px system-ui}'+
 'header{max-width:1040px;margin:auto auto 24px}h1{font-size:25px}p{color:#b4c6b8}'+
 '.preset{max-width:1040px;margin:0 auto 12px;background:#1d312b;border:1px solid #557064;'+
 'border-radius:8px;padding:12px;box-sizing:border-box}.meta{display:flex;'+
 'justify-content:space-between;flex-wrap:wrap;gap:6px}.meta small{color:#c8d5ca}'+
 '.views{display:grid;grid-template-columns:2fr 2fr 1fr;gap:8px;margin-top:9px}'+
 '.panel{background:#152620;border:1px solid #31463c;border-radius:5px;padding:5px}'+
 '.panel b{font-size:10px;letter-spacing:.08em;color:#9fb5a6}'+
 '.panel svg{display:block;width:100%;height:120px}'+
 '@media(max-width:660px){.views{grid-template-columns:1fr}.panel svg{height:140px}}'+
 '</style></head><body><header><h1>FIELDWORK / WEAPON ORTHO R2</h1>'+
 '<p>Generated from actual geometry, not separate art. Fixed orthographic views;'+
 ' same game scale across presets. Exterior-only comparative silhouettes.</p>'+
 '<p>11 presets · '+totalMeshes+' visible meshes · '+
 Math.round(totalTriangles)+' triangles · no firearm mechanisms</p></header>'+
 body+'</body></html>';
const target=process.argv[2]??'reports/weapon-ortho-r2.html';
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,html,'utf8');
console.log('Weapon geometry orthographic review: '+target+' ('+
 FAMILY_PRESETS.length+' presets, '+totalMeshes+' meshes)');
