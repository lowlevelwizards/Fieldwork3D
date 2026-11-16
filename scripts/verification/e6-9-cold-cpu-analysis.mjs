/** E6.9: offline-only summary of a Chromium DevTools CPU Profile.
 * A sampled JavaScript stack is not a GPU execution timer. Sample deltas
 * approximate profiler coverage (including idle/native waits), not CPU billing.
 * No imported browser/game modules, safe for node --test.
 */
const cleanUrl=url=>String(url??'').replace(/^.*?(\/src\/|\/node_modules\/)/,'$1').split('?')[0];
const functionName=f=>f?.functionName||'(anonymous)';
function classifyStack(stack){
 const leaf=stack[0]?.callFrame??{};
 const name=functionName(leaf);
 if(name==='(idle)')return 'idle';
 if(name==='(program)'||name==='(garbage collector)')
  return name==='(program)'?'browser-program':'garbage-collection';
 const list=stack.map(n=>functionName(n.callFrame)).join(' | ');
 const lower=list.toLowerCase();
 if(/webglshadowmap|rendershadow/.test(lower))return 'shadow-render';
 if(/renderbufferdirect|renderobjects|drawbuffers|drawarrays|drawelements/.test(lower))
  return 'draw-dispatch';
 if(/projectobject|traversevisible|frustum|sortobjects/.test(lower))
  return 'scene-traversal';
 if(/webglprograms|webgluniforms|getprogram|setprogram|refreshprogram|compile|onbeforecompile|uniforms/.test(lower))
  return 'program-material';
 if(/webgltextures|webglattributes|webglgeometries|webglobjects|uploadtexture/.test(lower))
  return 'geometry-texture';
 if(stack.some(n=>String(n.callFrame?.url??'').includes('/node_modules/three')||String(n.callFrame?.url??'').includes('/deps/three')))
  return 'three-other';
 if(stack.some(n=>/breach-3d[.]ts|breach-quickplay-controller[.]ts/.test(n.callFrame?.url??'')))
  return 'game-scene';
 if(stack.some(n=>/\/src\//.test(n.callFrame?.url??'')))return 'game-other';
 if(name==='(root)'||name==='(idle)'||!name)return 'other';
 return 'browser-native-other';
}
export function summarizeColdCpuProfile(profile,{maxFrames=24}={}){
 if(!profile||!Array.isArray(profile.nodes)||
    !Array.isArray(profile.samples)||!Array.isArray(profile.timeDeltas)||
    profile.samples.length!==profile.timeDeltas.length||
    !profile.samples.length)throw Error('E6.9 CPU profile missing samples');
 const lookup=new Map(profile.nodes.map(n=>[n.id,n]));
 const seen=new Map(),buckets=new Map(),leafCounts=new Map();
 let sampledUs=0,unmapped=0;
 for(let i=0;i<profile.samples.length;i++){
  const delta=Math.max(0,Number(profile.timeDeltas[i])||0);
  sampledUs+=delta;
  const node=lookup.get(profile.samples[i]);
  if(!node){unmapped++;continue;}
  let stack=seen.get(node.id);
  if(!stack){
   stack=[];let cursor=node;
   while(cursor&&stack.length<100){
    stack.push(cursor);cursor=lookup.get(cursor.parent);
   }
   seen.set(node.id,stack);
  }
  const bucket=classifyStack(stack);
  const b=buckets.get(bucket)??{samples:0,approxMs:0};
  b.samples++;b.approxMs+=delta/1000;buckets.set(bucket,b);
  const frame=node.callFrame??{};
  const key=functionName(frame)+' @ '+cleanUrl(frame.url);
  const f=leafCounts.get(key)??{function:functionName(frame),
   source:cleanUrl(frame.url),samples:0,approxMs:0};
  f.samples++;f.approxMs+=delta/1000;leafCounts.set(key,f);
 }
 return {
  schema:'fieldwork-e6.9-cpu-summary-v1',
  sampleCount:profile.samples.length,
  unmappedSamples:unmapped,
  profileWallMs:Math.max(0,(profile.endTime-profile.startTime)/1000),
  sampledIntervalMs:sampledUs/1000,
  approximateBuckets:Object.fromEntries([...buckets.entries()].sort(
   (a,b)=>b[1].approxMs-a[1].approxMs)),
  topExclusiveSampleFrames:[...leafCounts.values()].sort(
   (a,b)=>b.approxMs-a.approxMs).slice(0,maxFrames),
  warning:'DevTools statistical JS sampling and sample intervals; includes idle/native waits and sampling overhead. Frames and buckets are diagnostic, not exclusive GPU cost, FPS, or true CPU utilization.'
 };
}
