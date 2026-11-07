import assert from 'node:assert/strict';

/** Strict equality without recursively printing a complete Three.js scene on failure. */
export function assertIdentityEqual(actual, expected, message) {
  if ((actual !== null && typeof actual === 'object') || (expected !== null && typeof expected === 'object')) {
    assert.ok(Object.is(actual, expected), message ??
      `Object identity mismatch (${actual?.type ?? actual?.constructor?.name} / ${expected?.type ?? expected?.constructor?.name})`);
  } else assert.equal(actual, expected, message);
}
