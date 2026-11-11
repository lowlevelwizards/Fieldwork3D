/** Package A0: conservative, reproducible architecture census.
 * This tool reports review candidates, NEVER proves a module or export is dead.
 * Static analysis cannot resolve runtime reflection, arbitrary dynamic imports,
 * browser deep links, generated URLs, or non-repository entrypoints.
 *
 * Usage: node scripts/verification/consolidation-inventory.mjs --check
 *        node scripts/verification/consolidation-inventory.mjs --json artifacts/consolidation/inventory.json --markdown artifacts/consolidation/inventory.md
 */
import ts from 'typescript';
import {existsSync,readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname,extname,join,normalize,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const defaultRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const SOURCE=/\.(?:ts|tsx|js|jsx|mjs|cjs|css|json)$/;
const PARSE=/\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP=new Set(['.git','node_modules','dist','artifacts','coverage','.cache']);
const toPosix=value=>value.split(sep).join('/');
const unique=values=>[...new Set(values)].sort();
const stable=(a,b)=>a.localeCompare(b,'en');

function walk(root,path=''){
 const full=join(root,path),list=[];
 if(!existsSync(full))return list;
 for(const name of readdirSync(full,{withFileTypes:true}).sort((a,b)=>stable(a.name,b.name))){
  if(name.isDirectory()){
   if(!SKIP.has(name.name))list.push(...walk(root,join(path,name.name)));
  }else if(name.isFile())list.push(toPosix(join(path,name.name)));
 }
 return list;
}
function localReference(origin,spec,files){
 if(!spec.startsWith('.')&&!spec.startsWith('/'))return null;
 const clean=spec.split(/[?#]/)[0];
 const base=normalize(join(spec.startsWith('/')?'':dirname(origin),clean.replace(/^\//,'')));
 const candidate=toPosix(base);
 for(const value of [candidate,candidate+'.ts',candidate+'.tsx',candidate+'.js',
  candidate+'.mjs',candidate+'.css',candidate+'.json',
  candidate+'/index.ts',candidate+'/index.js']){
  if(files.has(value))return value;
 }
 return {unresolved:candidate};
}
function parseCode(path,source,record){
 const kind=path.endsWith('.tsx')?ts.ScriptKind.TSX:
  path.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS;
 const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind);
 const add=(value,kind)=>{if(typeof value==='string')record.references.push({target:value,kind});};
 const literal=node=>node&&ts.isStringLiteralLike(node)?node.text:null;
 const modifier=(node,flag)=>node.modifiers?.some(m=>m.kind===flag);
 function visit(node){
  if(ts.isImportDeclaration(node)){
   const clause=node.importClause;
   const named=clause?.namedBindings;
   const typeOnly=!!clause?.isTypeOnly||
    !!(named&&ts.isNamedImports(named)&&!clause?.name&&
      named.elements.length>0&&named.elements.every(e=>e.isTypeOnly));
   add(literal(node.moduleSpecifier),typeOnly?'type':'import');
  }
  if(ts.isExportDeclaration(node)){
   add(literal(node.moduleSpecifier),node.isTypeOnly?'type':'export');
   if(node.exportClause&&ts.isNamedExports(node.exportClause)){
    for(const e of node.exportClause.elements)record.exports.push(e.name.text);
   }else if(!node.exportClause)record.exports.push('*');
  }
  if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference))
   add(literal(node.moduleReference.expression),'import');
  if(modifier(node,ts.SyntaxKind.ExportKeyword)){
   if(modifier(node,ts.SyntaxKind.DefaultKeyword))record.exports.push('default');
   else if(node.name?.text)record.exports.push(node.name.text);
   else if(ts.isVariableStatement(node))
    for(const decl of node.declarationList.declarations)
     if(ts.isIdentifier(decl.name))record.exports.push(decl.name.text);
  }
  if(ts.isCallExpression(node)){
   const callee=node.expression;
   if(callee.kind===ts.SyntaxKind.ImportKeyword){
    const path=literal(node.arguments[0]);
    if(path)add(path,'dynamic-import');
    else record.uncertain.push('nonliteral-import');
   }else if(ts.isIdentifier(callee)&&callee.text==='require'){
    const path=literal(node.arguments[0]);
    if(path)add(path,'require');
    else record.uncertain.push('nonliteral-require');
   }else if(callee.getText(ast).includes('import.meta.glob')){
    record.uncertain.push('vite-glob');
   }
  }
  if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='URL'){
   const url=literal(node.arguments?.[0]);
   const meta=node.arguments?.[1]?.getText(ast)??'';
   if(url&&meta.includes('import.meta.url'))add(url,'url-asset');
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
}
function parseHtml(source,record){
 for(const match of source.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)){
  const spec=match[1];
  if(spec.startsWith('.')||spec.startsWith('/'))record.references.push({target:spec,kind:'html'});
 }
 for(const match of source.matchAll(/\b(?:window\.location\.replace|location\.replace)\s*\(\s*["']([^"']+)["']/g))
  record.uncertain.push('html-navigation:'+match[1]);
}
function analyzeText(path,source,record){
 for(const match of source.matchAll(/\b(?:\.get|\.getAll|\.has)\s*\(\s*['"]([a-zA-Z][\w-]+)['"]\s*\)/g)){
  if(source.includes('URLSearchParams'))record.flags.push(match[1]);
 }
 for(const match of source.matchAll(/\b(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g))
  record.storageKeys.push(match[1]);
 if(path.endsWith('.css')){
  for(const match of source.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g))
   record.references.push({target:match[1],kind:'css-import'});
 }
}
function reachable(roots,graph){
 const queue=[...roots],seen=new Set();
 while(queue.length){
  const path=queue.pop();
  if(seen.has(path))continue;
  seen.add(path);
  for(const next of graph.get(path)??[])if(!seen.has(next))queue.push(next);
 }
 return seen;
}
function cycles(graph,nodes){
 let index=0;const ids=new Map(),low=new Map(),stack=[],stacked=new Set(),out=[];
 function visit(node){
  ids.set(node,index);low.set(node,index++);stack.push(node);stacked.add(node);
  for(const next of graph.get(node)??[]){
   if(!nodes.has(next))continue;
   if(!ids.has(next)){visit(next);low.set(node,Math.min(low.get(node),low.get(next)));}
   else if(stacked.has(next))low.set(node,Math.min(low.get(node),ids.get(next)));
  }
  if(low.get(node)===ids.get(node)){
   const group=[];let next;
   do{next=stack.pop();stacked.delete(next);group.push(next);}while(next!==node);
   if(group.length>1||(graph.get(node)??[]).includes(node))
    out.push(group.sort(stable));
  }
 }
 for(const node of [...nodes].sort(stable))if(!ids.has(node))visit(node);
 return out.sort((a,b)=>b.length-a.length||stable(a[0],b[0]));
}
export function scanRepository(root=defaultRoot){
 const paths=walk(root),files=new Set(paths),records=new Map(),graph=new Map(),allGraph=new Map();
 const roots={runtime:[],tests:[],tooling:[]},unresolved=[];
 const workflows=paths.filter(p=>p.startsWith('.github/workflows/')&&/\.ya?ml$/.test(p));
 const testEntries=paths.filter(p=>/^tests\/.*\.test\.(?:mjs|js|ts)$/.test(p));
 const scripts=paths.filter(p=>/^scripts\/.*\.(?:mjs|js|ts)$/.test(p));
 for(const path of paths){
  if(!SOURCE.test(path)&&!path.endsWith('.html'))continue;
  const source=readFileSync(join(root,path),'utf8');
  const record={path,bytes:Buffer.byteLength(source),lines:source.split(/\r?\n/).length,
   references:[],exports:[],flags:[],storageKeys:[],uncertain:[]};
  if(PARSE.test(path))parseCode(path,source,record);
  if(path.endsWith('.html'))parseHtml(source,record);
  analyzeText(path,source,record);
  records.set(path,record);
 }
 for(const [path,record] of records){
  const runtime=[],all=[];
  for(const ref of record.references){
   const resolved=localReference(path,ref.target,files);
   if(resolved?.unresolved){
    unresolved.push({path,target:ref.target,kind:ref.kind,expected:resolved.unresolved});
   }else if(resolved){
    all.push(resolved);
    if(ref.kind!=='type')runtime.push(resolved);
   }
  }
  graph.set(path,unique(runtime));allGraph.set(path,unique(all));
 }
 for(const p of paths.filter(p=>p.endsWith('.html')&&!p.includes('/')))
  roots.runtime.push(p);
 roots.tests=testEntries;
 roots.tooling=[...scripts,'vite.config.ts'].filter(p=>files.has(p));
 // Compute both physical runtime reachability and conservative reference reachability.
 const active=reachable(roots.runtime,graph);
 const test=reachable(roots.tests,allGraph);
 const tool=reachable(roots.tooling,allGraph);
 const typeAndRuntime=reachable(roots.runtime,allGraph);
 const sourcePaths=paths.filter(p=>p.startsWith('src/')&&SOURCE.test(p));
 const classifications={runtime:[],typeReferenced:[],testOnly:[],toolOnly:[],unreferenced:[]};
 for(const p of sourcePaths){
  if(active.has(p))classifications.runtime.push(p);
  else if(typeAndRuntime.has(p))classifications.typeReferenced.push(p);
  else if(test.has(p))classifications.testOnly.push(p);
  else if(tool.has(p))classifications.toolOnly.push(p);
  else classifications.unreferenced.push(p);
 }
 const incoming=new Map();
 for(const [p,children] of allGraph)for(const c of children){
  if(!incoming.has(c))incoming.set(c,new Set());
  incoming.get(c).add(p);
 }
 const topDependencies=sourcePaths.map(p=>({
  path:p,imports:graph.get(p)?.length??0,
  importers:incoming.get(p)?.size??0,lines:records.get(p)?.lines??0,
  exports:unique(records.get(p)?.exports??[]).length
 })).sort((a,b)=>b.imports-a.imports||stable(a.path,b.path)).slice(0,35);
 const runtimeSrc=new Set([...active].filter(p=>p.startsWith('src/')));
 const workflowTestUses=new Map();
 for(const path of workflows){
  const text=readFileSync(join(root,path),'utf8');
  for(const match of text.matchAll(/tests\/[a-zA-Z0-9_./-]+\.test\.mjs/g)){
   if(!workflowTestUses.has(match[0]))workflowTestUses.set(match[0],new Set());
   workflowTestUses.get(match[0]).add(path);
  }
 }
 let sha=null;
 try{sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
 catch{/* Source archives can still be audited. */}
 return {
  schema:1,commit:sha,interpretation:'Review candidates only. Nonliteral imports, source-data references, external deep links and code generation may not resolve.',
  counts:{files:paths.length,source:sourcePaths.length,tests:testEntries.length,
   scripts:scripts.length,htmlEntrypoints:roots.runtime.length,workflows:workflows.length,
   runtimeReachable:classifications.runtime.length,
   typeReferenced:classifications.typeReferenced.length,
   testOnly:classifications.testOnly.length,
   toolOnly:classifications.toolOnly.length,
   unreferenced:classifications.unreferenced.length,
   unresolvedLocalReferences:unresolved.length},
  roots,topDependencies,
  classifications,
  cycles:cycles(graph,runtimeSrc),
  unresolvedLocalReferences:unresolved.slice(0,250),
  unresolvedReferenceTruncated:unresolved.length>250,
  uncertainDynamic:paths.filter(p=>records.get(p)?.uncertain.length)
   .map(p=>({path:p,reasons:unique(records.get(p).uncertain)})),
  queryFlags:paths.filter(p=>records.get(p)?.flags.length)
   .map(p=>({path:p,keys:unique(records.get(p).flags)})),
  storageKeys:paths.filter(p=>records.get(p)?.storageKeys.length)
   .map(p=>({path:p,keys:unique(records.get(p).storageKeys)})),
  duplicateWorkflowTests:[...workflowTestUses].filter(([,v])=>v.size>1)
   .map(([test,uses])=>({test,workflows:[...uses].sort(stable)}))
   .sort((a,b)=>b.workflows.length-a.workflows.length||stable(a.test,b.test)).slice(0,80)
 };
}
export function markdownReport(data){
 const c=data.counts;
 const lines=[
  '# Package A0 — Generated architecture inventory',
  '',
  'Commit: '+(data.commit??'unknown source archive'),
  '',
  '> Conservative STATIC review inventory, not authorization to delete code.',
  '> HTML entrypoints and explicit relative imports are traced; reflection,',
  '> arbitrary dynamic paths, external deep links and runtime-generated URLs can',
  '> preserve code that appears unreferenced. Investigate each candidate.',
  '',
  '| Metric | Count |','|---|---:|',
  ...Object.entries(c).map(([k,v])=>'| '+k+' | '+v+' |'),
  '',
  '## Highest direct dependency counts',
  '',
  '| File | Direct dependencies | Referencing modules | Lines |',
  '|---|---:|---:|---:|',
  ...data.topDependencies.slice(0,25).map(x=>'| '+x.path+' | '+x.imports+' | '+x.importers+' | '+x.lines+' |'),
  '',
  '## Review candidates (NOT proven dead)',
  '',
  ...['testOnly','toolOnly','unreferenced','typeReferenced'].flatMap(key=>[
   '### '+key+' ('+data.classifications[key].length+')',
   ...data.classifications[key].slice(0,65).map(p=>'- '+p),
   data.classifications[key].length>65?'- ... see JSON for complete inventory':'',''
  ]),
  '## Runtime dependency cycles',
  '',
  'Detected groups: '+data.cycles.length,
  ...data.cycles.slice(0,25).map(g=>'- '+g.join(' → ')),
  '',
  '## Unresolved and dynamic references',
  '',
  'Unresolved local references: '+c.unresolvedLocalReferences,
  'Nonliteral/dynamic markers: '+data.uncertainDynamic.length+' files',
  ...data.uncertainDynamic.slice(0,25).map(x=>'- '+x.path+': '+x.reasons.join(', ')),
  '',
  '## Repeated workflow test references',
  '',
  ...data.duplicateWorkflowTests.slice(0,30)
    .map(x=>'- '+x.test+': '+x.workflows.length+' workflows'),
  '',
  'The JSON report includes complete candidate lists, recognized URL flags,',
  'storage keys, unresolved local references, and static graph diagnostics.'
 ];
 return lines.join('\n')+'\n';
}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
 const report=scanRepository();
 if(args.includes('--check')){
  if(report.counts.source<100||report.counts.htmlEntrypoints<1||
   !report.roots.runtime.includes('index.html')||
   !report.classifications.runtime.includes('src/breach-main.ts')){
   console.error('Invalid runtime entrypoint scan: baseline source graph incomplete.');
   process.exitCode=1;
  }
 }
 if(args.includes('--json')){
  const path=resolve(value('--json'));
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(report,null,2)+'\n');
 }
 if(args.includes('--markdown')){
  const path=resolve(value('--markdown'));
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,markdownReport(report));
 }
 console.log('A0 inventory: '+JSON.stringify(report.counts)+
  '; runtime cycles='+report.cycles.length+
  '; review candidates are NOT deletion proof.');
}
