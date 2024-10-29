export function randomNcharString(n = 6) {  // creates a random n-char string
  // we compute a random number base36 between (for n=6) 100000 and zzzzzz
  let cap = Math.pow(36, n - 1);  // for n=6 it's the equivalent of parseInt("100000", 36)
  let range = Math.pow(36, n - 1) * 35; // for n=6 it's the equivalent of parseInt("z00000", 36)
  return (Math.floor(Math.random() * range) + cap).toString(36);
}