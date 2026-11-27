import {spawnSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const names=['backpack','belt','footwear'];
const all=()=>Object.fromEntries(names.map(n=>[n,true]));
// Shared equipment, presentation and build dependencies retain cross-domain coverage.
const shared=/^(?:src\/(?:operator-(?:wardrobe|visual-kit|uniform-fit|garment|gear|armor-attachment|studio)|breach-(?:operator|equipment|3d|pose|motion|animation)|equipment-|rendering\/)|tests\/(?:operator-wardrobe|operator-visual-fit|operator-garment|equipment-carry|equipment-07|sling-retention|breach-motion)|(?:package(?:-lock)?\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+)$|\.github\/workflows\/(?:ci|ci-equipment-acceptance)\.yml$|scripts\/verification\/ci-equipment-routing\.mjs$|tests\/ci-equipment-routing\.test\.mjs$)/;
const patterns={
 backpack:/^(?:src\/operator-backpack-|tests\/backpack-|scripts\/[^/]*backpack|\.github\/workflows\/backpack-critical\.yml$)/,
 belt:/^(?:src\/operator-(?:belt-|attachment-)|tests\/operator-(?:belt-|attachment-artwork)|scripts\/capture-belt-artwork|\.github\/workflows\/belt-artwork-critical\.yml$)/,
 footwear:/^(?:src\/operator-(?:footwear|boot|shoe|feet)|tests\/operator-footwear|tests\/breach-motion-boot|scripts\/[^/]*(?:footwear|boot|shoe)|\.github\/workflows\/footwear-critical\.yml$)/
};
// Explicitly disjoint domains only. Unrecognized source/tests fail closed.
const unrelated=/^(?:src\/(?:breach-(?:blood|fog|replay|intel|door|projectile|ballistic|enemy|civilian)|replay[\/-]|after-action[\/-]|vfx[\/-]|arsenal[\/]|weapons[\/])|tests\/(?:vfx-|replay-|after-action-|fog-|door-|arsenal-|weapon-|breach-(?:fog|blood|replay|door|projectile|ballistic)))/;
export function selectEquipment(paths){
 const result=Object.fromEntries(names.map(n=>[n,false]));
 for(const path of new Set(paths)){
  if(shared.test(path))return all();
  const matched=names.filter(n=>patterns[n].test(path));
  if(matched.length){for(const n of matched)result[n]=true;continue;}
  if(/^(?:src|tests)\//.test(path)&&!unrelated.test(path))return all();
 }
 return result;
}
function main(){
 const base=process.env.BASE_SHA,head=process.env.HEAD_SHA;
 let selected=all();
 if(base&&head){
  if(!/^[a-f0-9]{40}$/i.test(base)||!/^[a-f0-9]{40}$/i.test(head))throw Error('Invalid PR revision');
  const diff=spawnSync('git',['diff','--name-only','--no-renames','-z',base+'...'+head],{encoding:'utf8'});
  if(diff.status!==0)throw Error('Cannot determine equipment ownership: '+diff.stderr);
  selected=selectEquipment(diff.stdout.split('\0').filter(Boolean));
 }
 console.log(JSON.stringify(selected));
 appendFileSync(process.env.GITHUB_OUTPUT,Object.entries(selected).map(([key,value])=>key+'='+value).join('\n')+'\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main();
