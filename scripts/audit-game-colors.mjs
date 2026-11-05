async function audit(){
  const fs=await import('node:fs');
  const path=await import('node:path');
  const outDir='docs/palette-audit-report';
  fs.mkdirSync(outDir,{recursive:true});
  function allFiles(root){
    let out=[];
    for(const d of fs.readdirSync(root,{withFileTypes:true})){
      const p=path.join(root,d.name);
      if(d.isDirectory())out.push(...allFiles(p));
      else if(/\.(ts|tsx|js|jsx|css|html|glsl|vert|frag)$/.test(p))out.push(p);
    }
    return out;
  }
  const files=[...allFiles('src'),...fs.readdirSync('.').filter(x=>/\.html$/.test(x))].sort();
  // Reachability is an approximation of the production Breach bundle,
  // separate from development labs and legacy landscapes in the same repo.
  const reachable=new Set(),queue=['index.html','src/breach-main.ts','src/breach-style.css'];
  while(queue.length){
    const p=queue.shift();
    if(reachable.has(p)||!fs.existsSync(p))continue;
    reachable.add(p);
    const source=fs.readFileSync(p,'utf8');
    const refs=[];
    for(const m of source.matchAll(/(?:from\s*|import\s*\(|import\s*|@import\s*)['"]([^'"]+)['"]/g))refs.push(m[1]);
    if(p.endsWith('.html'))for(const m of source.matchAll(/(?:src|href)=['"]([^'"]+)['"]/g))refs.push(m[1]);
    for(const ref of refs){
      if(!ref.startsWith('.'))continue;
      const base=path.posix.normalize(path.posix.join(path.posix.dirname(p),ref.split('?')[0]));
      for(const candidate of [base,base+'.ts',base+'.tsx',base+'.js',base+'.css',base+'/index.ts']){
        if(fs.existsSync(candidate)&&!reachable.has(candidate)){queue.push(candidate);break;}
      }
    }
  }
  const records=[],nonColor=[],procedural=new Map();
  function scope(p){
    if(p.endsWith('.css')||p.endsWith('.html')||p.includes('/ui/'))return 'UI / HUD';
    if(/operator.*camo|camouflage|camo-batch/.test(p))return 'Camouflage inks';
    if(/operator.*identity|operator.*hair|operator.*skin/.test(p))return 'Skin / hair';
    if(/operator|equipment/.test(p))return 'Operator / equipment';
    if(/building-palettes|room-floor|surface-material|worldgen/.test(p))return 'Architecture / props';
    if(/breach|combat|tactical/.test(p))return 'Combat / mission';
    return 'Landscape / other';
  }
  function add(raw,p,line,kind,ctx,flag=false){
    let hex=raw.replace(/^#|^0x/i,'').toLowerCase();
    if([3,4].includes(hex.length))hex=[...hex].map(x=>x+x).join('');
    if(![6,8].includes(hex.length))return;
    if(flag){nonColor.push([raw,p,line,ctx]);return;}
    records.push({hex:'#'+hex.slice(0,6),alpha:hex.length===8?hex.slice(6):'',file:p.replaceAll('\\','/'),line,kind,scope:scope(p),context:ctx.slice(0,150)});
  }
  for(const p of files){
    const s=fs.readFileSync(p,'utf8'),lines=s.split('\n');
    for(let i=0;i<lines.length;i++){
      const line=lines[i], lineNo=i+1;
      for(const m of line.matchAll(/\b0x([0-9a-f]{6})(?![0-9a-f])/gi)){
        const isBitwise=/math\.imul|>>>|(?:seed|hash|rng|crc)\s*[\(\[:=]|(?:&|\^)\s*0x[0-9a-f]{6}|0x[0-9a-f]{6}\s*(?:&|\^)/i.test(line);
        add(m[0],p,lineNo,'hex literal',line.trim(),isBitwise);
      }
      for(const m of line.matchAll(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![a-z0-9_-])/gi)){
        const cssSelector=/^\s*#[a-f0-9]{3,8}\s*[{,:.#[]/i.test(line);
        add(m[0],p,lineNo,'CSS hex',line.trim(),cssSelector);
      }
      for(const m of line.matchAll(/\brgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*([0-9.]+))?\s*\)/gi)){
        const rgb=[+m[1],+m[2],+m[3]];
        if(rgb.every(v=>v<=255)) {
          const h=rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
          add(h,p,lineNo,'RGB function'+(m[4]?' alpha:'+m[4]:''),line.trim());
        }
      }
      if(/(?:new\s+(?:THREE\.)?Color|mixColor|lerpColor|setHSL|ColorManagement|(?:linear|srgb|gamma)To|\.lerpColors|\.multiplyScalar|color\.setRGB|hsl\()/i.test(line)){
        procedural.set(p,(procedural.get(p)||0)+1);
      }
    }
    if(/camo|camouflage/i.test(p)){
      // Color triplets within named "colors" arrays in pattern recipes (not polygon vertices).
      const re=/\bcolors\s*:\s*\[([\s\S]{0,1600}?)\]\s*,?\s*(?:targetCoverage|motifs|description|shapeLanguage|tile)/g;
      for(const m of s.matchAll(re)){
        for(const t of m[1].matchAll(/\[\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\]/g)){
          const rgb=[+t[1],+t[2],+t[3]];
          if(rgb.some(v=>v>255))continue;
          const off=m.index+m[0].indexOf(m[1])+t.index;
          const line=1+s.slice(0,off).split('\n').length-1;
          add(rgb.map(n=>n.toString(16).padStart(2,'0')).join(''),p,line,'camouflage ink RGB triplet','colors array');
        }
      }
    }
  }
  const coreRecords=records.filter(r=>reachable.has(r.file));
  const coreUnique=new Set(coreRecords.map(r=>r.hex));
  const coreUsesByColor=new Map();
  for(const r of coreRecords)coreUsesByColor.set(r.hex,(coreUsesByColor.get(r.hex)||0)+1);
  const map=new Map();
  for(const r of records){
    if(!map.has(r.hex))map.set(r.hex,{hex:r.hex,n:0,files:new Set(),scopes:new Set(),examples:[],alpha:new Set()});
    const z=map.get(r.hex);z.n++;z.files.add(r.file);z.scopes.add(r.scope);
    if(z.examples.length<6&&!z.examples.some(x=>x.file===r.file))z.examples.push({file:r.file,line:r.line});
    if(r.alpha)z.alpha.add(r.alpha);
  }
  function oklab(hex){
    const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
    const l=Math.cbrt(.4122214708*v[0]+.5363325363*v[1]+.0514459929*v[2]);
    const m=Math.cbrt(.2119034982*v[0]+.6806995451*v[1]+.1073969566*v[2]);
    const s=Math.cbrt(.0883024619*v[0]+.2817188376*v[1]+.6299787005*v[2]);
    return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
  }
  const colors=[...map.values()].map(z=>({...z,files:[...z.files],scopes:[...z.scopes],alpha:[...z.alpha],lab:oklab(z.hex)})).sort((a,b)=>b.n-a.n);
  const delta=(a,b)=>Math.hypot(a.lab[0]-b.lab[0],a.lab[1]-b.lab[1],a.lab[2]-b.lab[2]);
  for(const c of colors){
    let best=null;
    for(const d of colors){
      if(c===d)continue;
      const x=delta(c,d);
      if(!best||x<best.dist)best={hex:d.hex,dist:x,sharedScope:d.scopes.some(s=>c.scopes.includes(s))};
    }
    c.nearest=best;
    c.protected=c.scopes.some(s=>['Camouflage inks','Skin / hair'].includes(s));
    c.rare=c.n===1||c.files.length===1;
    c.reviewable=!c.protected && c.nearest && c.nearest.dist<.022 && c.nearest.sharedScope;
  }
  function csv(x){return '"'+String(x??'').replaceAll('"','""').replaceAll('\n',' ')+'"';}
  const usageRows=[['hex','alpha_suffix','scope','breach_core_reachable','file','line','kind','source_context'],...records.map(r=>[r.hex,r.alpha,r.scope,reachable.has(r.file),r.file,r.line,r.kind,r.context])];
  fs.writeFileSync(outDir+'/all-color-uses.csv',usageRows.map(r=>r.map(csv).join(',')).join('\n')+'\n');
  const inventoryRows=[['hex','source_occurrences','breach_core_occurrences','distinct_files','domains','nearest_color','oklab_distance','same_domain','protected','rare','review_candidate','provisional_disposition','existence_justification','example_locations'],...colors.map(c=>[c.hex,c.n,coreUsesByColor.get(c.hex)||0,c.files.length,c.scopes.join(' | '),c.nearest?.hex,c.nearest?.dist.toFixed(4),c.nearest?.sharedScope,c.protected,c.rare,c.reviewable,c.protected?'PRESERVE IDENTITY':c.reviewable?'MERGE REVIEW':c.rare?'OUTLIER REVIEW':'KEEP / TOKENIZE',c.scopes.includes('Camouflage inks')?'Ink in a named pattern; preserve pattern-specific color ratio/contrast':c.scopes.includes('Skin / hair')?'Appearance identity; keep distinct only for meaningful appearance':c.scopes.includes('UI / HUD')?'Interface surface or semantic feedback; consolidate if same role and contrast':c.scopes.includes('Architecture / props')?'Building scheme/prop surface; retain only if role, material, or mood differs':c.scopes.includes('Operator / equipment')?'Material or garment colorway; align identical nominal equipment colors':c.scopes.includes('Combat / mission')?'Tactical marker, effect, or scene object; preserve functional legibility':'Environment/rendering or supporting color; needs context check',c.examples.map(z=>z.file+':'+z.line).join(' | ')])];
  fs.writeFileSync(outDir+'/all-unique-colors.csv',inventoryRows.map(r=>r.map(csv).join(',')).join('\n')+'\n');
  const byScope={};
  for(const r of records){const a=byScope[r.scope]??={uses:0,set:new Set()};a.uses++;a.set.add(r.hex);}
  const likely=colors.filter(c=>c.reviewable).sort((a,b)=>a.nearest.dist-b.nearest.dist||b.n-a.n);
  const rare=colors.filter(c=>c.rare&&!c.protected).sort((a,b)=>a.n-b.n||a.hex.localeCompare(b.hex));
  const md=[];
  md.push('# Fieldwork 3D / Breach — source color census');
  md.push('Generated from the checked-out repository HEAD by `node scripts/audit-game-colors.mjs`. No game colors were modified.');
  md.push('');
  md.push('## Scope and limitations');
  md.push('- Includes active `src/` TypeScript, CSS, JS, shaders, and top-level HTML; excludes docs, tests, scripts, dependency bundles, and compiled output.');
  md.push('- The **Breach core** reachability view follows statically resolvable imports from `index.html`, `src/breach-main.ts` and `src/breach-style.css`. Lab pages and separately loaded operator studio previews may be excluded unless imported; dynamic paths require manual inspection.');
  md.push('- Counts literal hex colors (`0xRRGGBB`, `#RGB`, `#RRGGBB`, alpha variants), literal integer `rgb/rgba()` calls, and `[R,G,B]` triplets explicitly defined in camouflage `colors` recipe arrays.');
  md.push('- A *source occurrence* is an authored literal, **not** pixel coverage, run-time screen area, or actual frequency of an item spawning. Multiple alpha values share the same RGB row, but are separately recorded in uses CSV.');
  md.push('- Generated color mixes, lighting, wear, camouflage sampling, gradients, HSL and runtime variants cannot be exhaustively enumerated statically. These require a subsequent runtime render/screenshot palette pass.');
  md.push('- The number of nearest neighbors is a discovery aid, **not** license to merge semantic roles indiscriminately. Color contrast, material readability, palette coverage, and context must be verified.');
  md.push('');
  md.push('## Totals');
  md.push('- Source files inspected: **'+files.length+'**');
  md.push('- Core Breach reachable source modules (approximate static import graph): **'+reachable.size+'**; core authored occurrences: **'+coreRecords.length+'**; core unique RGB: **'+coreUnique.size+'**.');
  md.push('- Literal color occurrences: **'+records.length+'**');
  md.push('- Distinct normalized RGB values: **'+colors.length+'**');
  md.push('- Single-use RGB colors: **'+colors.filter(c=>c.n===1).length+'**');
  md.push('- Colors appearing in only one file: **'+colors.filter(c=>c.files.length===1).length+'**');
  md.push('- Near-neighbor non-protected same-domain colors flagged for human review (OKLab < 0.022): **'+likely.length+'**');
  md.push('');
  md.push('| System | Source color mentions | Unique RGB values |');
  md.push('|---|---:|---:|');
  for(const [k,v] of Object.entries(byScope).sort((a,b)=>b[1].uses-a[1].uses))md.push('| '+k+' | '+v.uses+' | '+v.set.size+' |');
  md.push('');
  md.push('## Consolidation queue (human review; never automatic)');
  md.push('Two colors should merge only if they play **the same material or semantic role** and after representative visual checks. Values below are OKLab Euclidean distance; roughly <0.01 is very close, 0.01–0.022 is a possible near-match.');
  md.push('');
  md.push('| Value | Uses | Nearest | ΔOKLab | Scopes | Where |');
  md.push('|---|---:|---|---:|---|---|');
  for(const c of likely.slice(0,140))md.push('| '+c.hex+' | '+c.n+' | '+c.nearest.hex+' | '+c.nearest.dist.toFixed(4)+' | '+c.scopes.join(', ')+' | '+c.examples.slice(0,2).map(z=>z.file+':'+z.line).join('; ')+' |');
  md.push('');
  md.push('## Rarely authored non-camouflage, non-skin colors');
  md.push('Every entry here deserves inspection; one-off emergency signage, muzzle flashes, lighting and technical markings may be good exceptions.');
  md.push('');
  md.push('| Value | Uses | Files | Nearest | Source |');
  md.push('|---|---:|---:|---|---|');
  for(const c of rare.slice(0,240))md.push('| '+c.hex+' | '+c.n+' | '+c.files.length+' | '+(c.nearest?.hex||'')+' | '+c.examples.slice(0,2).map(z=>z.file+':'+z.line).join('; ')+' |');
  md.push('');
  md.push('## Protected families');
  md.push('- **Camouflage inks:** retain each pattern’s recognizable proportion, contrast and hue. Merge only within an individual pattern after visual reference comparison. Identical values may still be shared as a constant without altering the rendered result.');
  md.push('- **Skin and hair:** preserve distinct identities and physically plausible luminance steps; similarity in RGB alone is not a justification to reduce options.');
  md.push('- **UI semantic states and combat telegraphs:** explicit meaning and legibility override numerical closeness.');
  md.push('- **Architectural theme variation:** keep deliberate warm/cool tonal relationships, but consolidate identical *roles* (wood/trim/caps) if no meaningful visible difference.');
  md.push('');
  md.push('## Source dynamic color-generation hotspots');
  for(const [p,n] of [...procedural].sort((a,b)=>b[1]-a[1]).slice(0,50))md.push('- '+p+': '+n+' matching operations');
  md.push('');
  md.push('## Files');
  md.push('- [Full unique-RGB inventory](all-unique-colors.csv) — one row per normalized RGB, including usage count, source examples, nearest neighbor, and suggested review flag.');
  md.push('- [All source occurrences](all-color-uses.csv) — every detected literal location and alpha variant.');
  md.push('');
  fs.writeFileSync(outDir+'/README.md',md.join('\n')+'\n');
  fs.writeFileSync(outDir+'/summary.json',JSON.stringify({files:files.length,reachableFiles:reachable.size,coreOccurrences:coreRecords.length,coreDistinct:coreUnique.size,occurrences:records.length,distinct:colors.length,singletons:colors.filter(c=>c.n===1).length,singleFile:colors.filter(c=>c.files.length===1).length,reviewable:likely.length,system:Object.fromEntries(Object.entries(byScope).map(([k,v])=>[k,{uses:v.uses,unique:v.set.size}])),top:colors.slice(0,35).map(c=>({hex:c.hex,n:c.n,coreUses:coreUsesByColor.get(c.hex)||0,scope:c.scopes,examples:c.examples.slice(0,2)})),near:likely.slice(0,70).map(c=>({hex:c.hex,n:c.n,closest:c.nearest.hex,delta:c.nearest.dist,scope:c.scopes,example:c.examples[0]})),rare:rare.slice(0,70).map(c=>({hex:c.hex,n:c.n,example:c.examples[0]})),suspectNoncolors:nonColor.slice(0,25)},null,2)+'\n');
  console.log(JSON.stringify({files:files.length,colors:colors.length,occurrences:records.length,rare:rare.length,reviewable:likely.length}));
}
audit().catch(e=>{console.error(e);process.exitCode=1});
