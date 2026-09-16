/**
 * A compact 64-bit simhash fingerprint of a text body. Two pages with
 * a small Hamming distance between their fingerprints have very
 * similar content - the standard technique for near-duplicate
 * detection at scale (used internally by search engines for this
 * exact purpose), computed here with zero external dependencies.
 */
function hashToken(token) {
  // Simple 64-bit-ish string hash (two 32-bit hashes combined via BigInt).
  let h1 = 0n;
  let h2 = 0n;
  for (let i = 0; i < token.length; i++) {
    const code = BigInt(token.charCodeAt(i));
    h1 = (h1 * 31n + code) & 0xffffffffn;
    h2 = (h2 * 131n + code) & 0xffffffffn;
  }
  return (h1 << 32n) | h2;
}

function computeSimhash(text) {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

  if (tokens.length === 0) return '0'.repeat(16);

  // 5-word shingles carry more signal than single words.
  const shingles = [];
  for (let i = 0; i < tokens.length - 4; i++) {
    shingles.push(tokens.slice(i, i + 5).join(' '));
  }
  const shingleSet = shingles.length > 0 ? shingles : tokens;

  const bitWeights = new Array(64).fill(0);

  shingleSet.forEach((shingle) => {
    const hash = hashToken(shingle);
    for (let bit = 0; bit < 64; bit++) {
      const isSet = (hash >> BigInt(bit)) & 1n;
      bitWeights[bit] += isSet ? 1 : -1;
    }
  });

  let fingerprint = 0n;
  for (let bit = 0; bit < 64; bit++) {
    if (bitWeights[bit] > 0) fingerprint |= 1n << BigInt(bit);
  }

  return fingerprint.toString(16).padStart(16, '0');
}

function hammingDistance(hexA, hexB) {
  const a = BigInt('0x' + hexA);
  const b = BigInt('0x' + hexB);
  let xor = a ^ b;
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}

module.exports = { computeSimhash, hammingDistance };
