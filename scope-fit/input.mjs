export const ANSWER_KEYS = Object.freeze(['reseller', 'distributor', 'billing', 'commitment', 'renewal', 'renewalDate', 'agreement']);

// Shared visibility rule. Search/replace do not carry a global test cursor between calls.
const hiddenCharacters = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/gu;
export function hasHiddenCharacters(value) { return String(value).search(hiddenCharacters) !== -1; }
export function visibleText(value) {
  return String(value).replace(hiddenCharacters, char => `[U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}]`);
}
export function exactTextJson(value) {
  if (typeof value !== 'string') throw new TypeError('Evidence text must be a string');
  return JSON.stringify(value).replace(hiddenCharacters,
    char => char.split('').map(unit => '\\u' + unit.charCodeAt(0).toString(16).padStart(4, '0')).join(''));
}

// Capture descriptor values once. Proxies can trap reflection; no claim of detecting
// every proxy is made. A captured plain-data tree is either consistent or rejected.
export function frozenData(value) {
  const active = new Set(); let nodes = 0;
  function copy(item, depth) {
    if (++nodes > 10000 || depth > 12) throw new TypeError('Input data exceeds the supported shape limit');
    if (item === null || item === undefined || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) return item;
    if (typeof item === 'string') {
      if (item.length > 2_000_000) throw new TypeError('Input text exceeds the supported limit');
      return item;
    }
    if (typeof item !== 'object') throw new TypeError('Input must contain plain data, not functions or other unsupported values');
    let descriptors, prototype;
    try { descriptors = Object.getOwnPropertyDescriptors(item); prototype = Object.getPrototypeOf(item); }
    catch { throw new TypeError('Input data could not be captured'); }
    const array = Array.isArray(item);
    if (!array && prototype !== Object.prototype && prototype !== null) throw new TypeError('Input must contain plain objects, not class instances');
    if (active.has(item)) throw new TypeError('Input must not contain cycles');
    if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) throw new TypeError('Input must not contain symbol properties');
    active.add(item);
    const entries = [];
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === 'length') continue;
      if (!Object.hasOwn(descriptor, 'value')) throw new TypeError('Input must not contain accessor properties');
      if (array && !/^(0|[1-9]\d*)$/.test(key)) throw new TypeError('Input arrays must contain only indexed data');
      entries.push([key, copy(descriptor.value, depth + 1)]);
    }
    let result;
    if (array) {
      const length = descriptors.length?.value;
      if (!Number.isInteger(length) || length > 10000 || entries.length !== length || entries.some(([key]) => Number(key) >= length)) throw new TypeError('Input arrays must be bounded and dense');
      const indexed = Object.fromEntries(entries);
      result = Array.from({ length }, (_, index) => indexed[index]);
    } else result = Object.fromEntries(entries);
    active.delete(item);
    return Object.freeze(result);
  }
  return copy(value, 0);
}

export function captureAnswers(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('answers must be a plain object');
  const all = frozenData(input);
  const captured = Object.fromEntries(ANSWER_KEYS.filter(key => Object.hasOwn(all, key)).map(key => [key, all[key]]));
  for (const [key, value] of Object.entries(captured)) {
    if (value !== null && value !== undefined && typeof value !== 'string') throw new TypeError(`${key} must be a scalar response`);
    if (typeof value === 'string' && value.length > 128) throw new TypeError(`${key} response is too long`);
  }
  return Object.freeze(captured);
}

export const RESPONSE_CHOICES = Object.freeze({
  reseller: Object.freeze(["yes", "no", "unknown"]),
  distributor: Object.freeze(["pax8", "other", "unknown"]),
  billing: Object.freeze(["halopsa", "other", "unknown"]),
  commitment: Object.freeze(["annual-m365-nce", "monthly", "other", "unknown"]),
  renewal: Object.freeze(["exact", "within-60-approx", "unknown"]),
  agreement: Object.freeze(["yes", "no", "unknown", "not-asked"]),
});

// Shared calendar contract. Inactive raw date responses are deliberately not parsed.
export function isoDateUTC(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError('renewalDate must be an ISO calendar date (YYYY-MM-DD)');
  const [year, month, day] = value.split('-').map(Number);
  if (year === 0) throw new TypeError('renewalDate must use a calendar year from 0001 to 9999');
  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, day);
  const utc = parsed.getTime();
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) throw new TypeError('renewalDate is not a valid calendar date');
  return utc;
}
export function validIsoDate(value) { try { isoDateUTC(value); return true; } catch { return false; } }
// Typed structural equality preserves key presence, arrays and undefined values.
export function sameData(left, right) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && sameData(left[key], right[key]));
}
