import type { fr } from "./fr";

export type { Locale } from "../specs";

type Source = typeof fr;

export type MessageKey = keyof Source;

/** A full dictionary for one locale. en.ts is typed with it, so a missing or extra key fails to compile. */
export type Messages = { readonly [K in MessageKey]: string };

/** Keys with a singular `_one` variant, picked by Intl.PluralRules when `n` is one. */
export type PluralKey = { [K in MessageKey]: `${K}_one` extends MessageKey ? K : never }[MessageKey];

type Placeholders<S extends string> = S extends `${string}{${infer Name}}${infer Rest}` ? Name | Placeholders<Rest> : never;

type Value = string | number;

/**
 * Variables accepted by `tf(key, vars)`: every `{name}` of the French source string,
 * plus `n` (a number) for keys that have a `_one` variant.
 */
export type MessageVars<K extends MessageKey> = { [P in Placeholders<Source[K]>]: Value } & (K extends PluralKey
  ? { n: number }
  : unknown);

export interface Translator {
  readonly locale: import("../specs").Locale;
  t(key: MessageKey): string;
  /** Narrows a key built at runtime (e.g. from a plan id) before calling `t`. */
  has(key: string): key is MessageKey;
  tf<K extends MessageKey>(key: K, vars: MessageVars<K>): string;
}
