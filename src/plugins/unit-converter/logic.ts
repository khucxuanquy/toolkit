export type Category = "length" | "weight" | "temperature" | "currency";
export type Rates = Record<string, number>;

// Multipliers to a base unit (metre / kilogram).
const FACTORS: Record<"length" | "weight", Record<string, number>> = {
  length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    mi: 1609.344,
    yd: 0.9144,
    ft: 0.3048,
    in: 0.0254,
  },
  weight: { kg: 1, g: 0.001, mg: 0.000001, t: 1000, lb: 0.45359237, oz: 0.028349523 },
};

export const UNITS: Record<Category, string[]> = {
  length: ["m", "km", "cm", "mm", "mi", "yd", "ft", "in"],
  weight: ["kg", "g", "mg", "t", "lb", "oz"],
  temperature: ["°C", "°F", "K"],
  currency: ["USD", "VND", "EUR", "JPY", "GBP", "AUD", "CNY", "KRW", "THB", "SGD"],
};

const toCelsius = (v: number, unit: string) =>
  unit === "°C" ? v : unit === "°F" ? ((v - 32) * 5) / 9 : v - 273.15;
const fromCelsius = (c: number, unit: string) =>
  unit === "°C" ? c : unit === "°F" ? (c * 9) / 5 + 32 : c + 273.15;

export function convert(
  category: Category,
  from: string,
  to: string,
  value: number,
  rates?: Rates | null,
): number {
  if (category === "temperature") return fromCelsius(toCelsius(value, from), to);
  if (category === "currency") {
    if (!rates || !rates[from] || !rates[to]) return NaN;
    return (value * rates[to]) / rates[from];
  }
  const f = FACTORS[category];
  return (value * f[from]) / f[to];
}

/** Trim long float tails for display. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n);
}

export const RATES_API = "https://open.er-api.com/v6/latest/USD";
