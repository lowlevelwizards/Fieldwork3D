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
 return paths.filter((_,i)=>i%total===index-1);
}
