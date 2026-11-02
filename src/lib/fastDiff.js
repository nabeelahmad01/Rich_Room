/**
 * Fast Deep Equality & State Bailout Helper
 * Prevents unnecessary re-renders, DOM diffing, input focus loss,
 * and scroll jumping during frequent background polling.
 */

export function areEqual(a, b) {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // RegExp comparison
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // Array comparison
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;

  // Set comparison
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const val of a) {
      if (!b.has(val)) return false;
    }
    return true;
  }

  // Map comparison
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key) || !areEqual(val, b.get(key))) return false;
    }
    return true;
  }

  // Plain Object comparison
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!areEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * React state update helper that bails out of re-renders if the incoming
 * state is deeply equal to the previous state.
 *
 * @param {Function} setter - React useState dispatch function
 * @param {any|Function} nextVal - The new value or functional updater
 */
export function diffSet(setter, nextVal) {
  if (typeof setter !== 'function') return;

  if (typeof nextVal === 'function') {
    setter(prev => {
      const evaluated = nextVal(prev);
      return areEqual(prev, evaluated) ? prev : evaluated;
    });
  } else {
    setter(prev => (areEqual(prev, nextVal) ? prev : nextVal));
  }
}

/**
 * Sanitize game titles by stripping non-breaking spaces, zero-width characters,
 * duplicate whitespace, and trimming.
 *
 * @param {string} title
 * @returns {string}
 */
export function cleanGameTitle(title) {
  if (typeof title !== 'string') return '';
  return title
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
