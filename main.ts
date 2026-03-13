import * as logic from "./logic.ts"

export function text_indent(text: string): string {
  return text.replace(/^(?!$)/gm, "  ")
}

export function dot_string(x: string): string {
  return '"' + x.replace(/["\\]/g, (c) => "\\" + c).replace(/\n/g, "\\l") + '"'
}

export function compare_signal(a: Signal, b: Signal): boolean {
  return (
    a.name === b.name &&
    (a.type ?? "item") === (b.type ?? "item") &&
    (a.quality ?? "normal") === (b.quality ?? "normal") &&
    (a.copy_count_from_input ?? true) === (b.copy_count_from_input ?? true)
  )
}

export type Signal = {
  name: string
  type?: "item" | "virtual-signal" | string // TODO
  quality?: "normal" | "uncommon" | "rare" | "epic" | "legendary"
  copy_count_from_input?: boolean
}
export type SignalNetworks = {
  red?: boolean
  green?: boolean
}

export type DeciderComparator = "=" | "≠" | "<" | "≤" | ">" | "≥"
export type DeciderCondition = {
  compare_type?: "and" // TODO |"or"
  first_signal: Signal
  first_signal_networks?: SignalNetworks
  comparator: DeciderComparator
} & (
  | { constant: number; second_signal?: never; second_signal_networks?: never }
  | {
      constant?: never
      second_signal: Signal
      second_signal_networks?: SignalNetworks
    }
)
