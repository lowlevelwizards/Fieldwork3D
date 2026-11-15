/** Deterministic bounded regression shards; no test is omitted or repeated. */
export function shardTestPaths(paths,args=process.argv.slice(2)){
 const flags=args.filter(arg=>arg.startsWith('--shard='));
 if(!flags.length)return paths;
 if(flags.length!==1)throw Error('Specify exactly one --shard=N/TOTAL');
 const match=/^--shard=(\d+)\/(\d+)$/.exec(flags[0]);
 if(!match)throw Error('Expected --shard=N/TOTAL');
 const index=Number(match[1]),total=Number(match[2]);
 if(total<1||total>32||index<1||index>total)
  throw Error('Shard number must be within 1..TOTAL, TOTAL <=32');
 // Place expensive per-model live 3D geometry/pose tests in independent
 // final shards. Every test file is still selected once; ordinary regression
 // tests never share a job with these memory-intensive rendering checks.
 const heavy=paths.filter(path=>/^tests\/operator-headwear-camo-pose-(?:patrol-cap|boonie-[1-4]|ach|mich-2001|pasgt)\.test\.mjs$/.test(path));
 if(total>heavy.length&&heavy.length){
  const ordinary=paths.filter(path=>!heavy.includes(path));
  const regularCount=total-heavy.length;
  if(index>regularCount)return [heavy[index-regularCount-1]];
  return ordinary.filter((_,i)=>i%regularCount===index-1);
 }
 return paths.filter((_,i)=>i%total===index-1);
}
