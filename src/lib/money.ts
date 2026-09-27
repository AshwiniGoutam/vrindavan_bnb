/**
 * All money in the system is stored and computed as integer paise.
 * Never store or compute rupees as floating point.
 */
export type Paise = number;

export function assertPaise(value: number, label = "amount"): asserts value is Paise {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer number of paise, got ${value}`);
}

export const rupeesToPaise = (rupees: number): Paise => Math.round(rupees * 100);
export const paiseToRupees = (paise: Paise): number => paise / 100;

/** Percentage of an amount, rounded half-up to the nearest paisa. `percent` may be fractional (e.g. 2.5). */
export function percentOf(amount: Paise, percent: number): Paise {
  return Math.round((amount * percent) / 100);
}

/**
 * Split `total` across `weights` proportionally so the parts sum exactly to `total`
 * (largest-remainder method). Used to spread a discount over eligible lines.
 */
export function allocate(total: Paise, weights: number[]): Paise[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors;
}

const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

/** ₹5,999 for whole rupees, ₹5,999.50 otherwise. */
export function formatINR(paise: Paise): string {
  return paise % 100 === 0 ? inrWhole.format(paise / 100) : inrExact.format(paise / 100);
}

export function savePercent(compareAt: Paise, price: Paise): number {
  if (compareAt <= 0 || price >= compareAt) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
