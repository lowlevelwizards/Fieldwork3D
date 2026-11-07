import path from 'node:path';
export function failureSignature(error) {
  const cause = error?.cause ?? error;
  const message = String(cause?.message ?? '').split('\n').find(line => line.trim()) ?? '';
  return `${cause?.code ?? error?.code ?? 'ERROR'}: ${message.trim()}`;
}
export default async function* reporter(source) {
  for await (const {type, data} of source) {
    if (type === 'test:summary') {
      yield JSON.stringify({type, ...data}) + '\n';
    }
    if (type !== 'test:pass' && type !== 'test:fail') continue;
    const error = data.details?.error;
    const cause = error?.cause ?? error;
    yield JSON.stringify({
      type, name:data.name, file:path.relative(process.cwd(), data.file ?? data.entryFile ?? ''),
      line:data.line, nesting:data.nesting, skip:data.skip, todo:data.todo,
      durationMs:data.details?.duration_ms, testType:data.details?.type,
      signature:error ? failureSignature(error) : undefined,
      error:error ? {message:cause?.message, stack:cause?.stack, code:cause?.code} : undefined,
    }) + '\n';
  }
}
