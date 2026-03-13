import type { DeciderCondition } from "./main.ts"
import { compare_signal, dot_string, text_indent } from "./main.ts"

export class Term {
  protected constructor() {}

  equals(this: Readonly<this>, other: Readonly<Term>): boolean {
    return this.absorbs(other) && other.absorbs(this)
  }

  absorbs(this: Readonly<this>, other: Readonly<Term>): boolean {
    throw new Error("not implemented")
  }

  not(this: Readonly<this>): Term {
    throw new Error("not implemented")
  }

  and(this: Readonly<this>, other: Readonly<Term>): And {
    return new And(this, other)
  }

  or(this: Readonly<this>, other: Readonly<Term>): Or {
    return new Or(this, other)
  }

  /**
   * Convert to disjunctive normal form.
   */
  to_dnf(this: Readonly<this>): Term {
    throw new Error("not implemented")
  }

  simplify(this: Readonly<this>): Term {
    return this
  }

  to_decider_conditions(this: Readonly<this>): DeciderCondition[] {
    const dnf = this.to_dnf().simplify()
    const conditions: DeciderCondition[] = []
    for (const cnf of dnf instanceof Or ? dnf.terms : [dnf]) {
      let compare_type: "and" | undefined = undefined
      for (const t of cnf instanceof And ? cnf.terms : [cnf]) {
        if (!(t instanceof Atom)) {
          throw new Error("internal error: invalid disjunctive normal form")
        }
        conditions.push({
          ...t.condition,
          compare_type: compare_type,
        })
        compare_type = "and"
      }
    }
    return conditions
  }

  /** @internal */
  dot_node(this: Readonly<this>, prefix: string): string {
    throw new Error("not implemented")
  }

  dot(this: Readonly<this>): string {
    return "digraph {\n" + text_indent(this.dot_node("root")) + "}"
  }
}

export class Atom extends Term {
  public constructor(
    readonly condition: Readonly<DeciderCondition & { compare_type?: never }>,
  ) {
    super()
  }

  override absorbs(this: Readonly<this>, other: Readonly<Term>): boolean {
    if (other instanceof True) {
      return false
    } else if (other instanceof False) {
      return true
    } else if (other instanceof Atom) {
      let a = this.condition
      let b = other.condition

      // compare first_signal
      if (!compare_signal(a.first_signal, b.first_signal)) {
        // reverse a or b and try again
        if (
          a.constant === undefined &&
          compare_signal(this.reverse().condition.first_signal, b.first_signal)
        ) {
          a = this.reverse().condition
        } else if (
          b.constant === undefined &&
          compare_signal(a.first_signal, other.reverse().condition.first_signal)
        ) {
          b = other.reverse().condition
        } else {
          return false
        }
      }

      if (
        (a.first_signal_networks?.red ?? true) !==
          (b.first_signal_networks?.red ?? true) ||
        (a.first_signal_networks?.green ?? true) !==
          (b.first_signal_networks?.green ?? true)
      ) {
        return false
      }

      if (a.second_signal === undefined) {
        // compare constant
        if (b.second_signal !== undefined) {
          return false
        }
        switch (a.comparator) {
          case "=":
            return b.comparator === "=" && b.constant === a.constant
          case "≤":
            return (
              (b.comparator === "=" && b.constant <= a.constant) ||
              (b.comparator === "≤" && b.constant <= a.constant) ||
              (b.comparator === "<" && b.constant <= a.constant + 1)
            )
          case "≥":
            return (
              (b.comparator === "=" && b.constant >= a.constant) ||
              (b.comparator === "≥" && b.constant >= a.constant) ||
              (b.comparator === ">" && b.constant >= a.constant - 1)
            )
          case "<":
            return (
              (b.comparator === "=" && b.constant < a.constant) ||
              (b.comparator === "≤" && b.constant < a.constant) ||
              (b.comparator === "<" && b.constant <= a.constant)
            )
          case ">":
            return (
              (b.comparator === "=" && b.constant > a.constant) ||
              (b.comparator === "≥" && b.constant > a.constant) ||
              (b.comparator === ">" && b.constant >= a.constant)
            )
          case "≠":
            return (
              (b.comparator === "=" && b.constant != a.constant) ||
              (b.comparator === "≤" && b.constant < a.constant) ||
              (b.comparator === "≥" && b.constant > a.constant) ||
              (b.comparator === "<" && b.constant <= a.constant) ||
              (b.comparator === ">" && b.constant >= a.constant) ||
              (b.comparator === "≠" && b.constant === a.constant)
            )
        }
      } else {
        // compare second signal
        if (
          b.second_signal === undefined ||
          !compare_signal(a.second_signal, b.second_signal) ||
          (a.second_signal_networks?.red ?? true) !==
            (b.second_signal_networks?.red ?? true) ||
          (a.second_signal_networks?.green ?? true) !==
            (b.second_signal_networks?.green ?? true)
        ) {
          return false
        }
        switch (a.comparator) {
          case "=":
            return b.comparator === "="
          case "≤":
            return (
              b.comparator === "=" ||
              b.comparator === "≤" ||
              b.comparator === "<"
            )
          case "≥":
            return (
              b.comparator === "=" ||
              b.comparator === "≥" ||
              b.comparator === ">"
            )
          case "<":
            return b.comparator === "<"
          case ">":
            return b.comparator === ">"
          case "≠":
            return (
              b.comparator === "<" ||
              b.comparator === ">" ||
              b.comparator === "≠"
            )
        }
      }
    } else if (other instanceof And) {
      return other.terms.some((t) => this.absorbs(t))
    } else if (other instanceof Or) {
      return other.terms.every((t) => this.absorbs(t))
    } else {
      return false
    }
  }

  /*
  override equals(other: Readonly<Term>): boolean {
    if (!(other instanceof Atom)) {
      return false
    }
    function eq(a: DeciderCondition, b: DeciderCondition): boolean {
      return (
        compare_signal(a.first_signal, b.first_signal) &&
        (a.first_signal_networks?.red ?? true) === (b.first_signal_networks?.red ?? true) &&
        (a.first_signal_networks?.green ?? true) === (b.first_signal_networks?.green ?? true) &&
        a.comparator === b.comparator &&
        a.constant === b.constant &&
        (a.second_signal === undefined ||
          (b.second_signal !== undefined &&
            compare_signal(a.second_signal, b.second_signal) &&
            (a.second_signal_networks?.red ?? true) === (b.second_signal_networks?.red ?? true) &&
            (a.second_signal_networks?.green ?? true) === (b.second_signal_networks?.green ?? true)))
      )
    }
    if (eq(this.condition, other.condition)) {
      return true
    }
    let reverse
    try {
      reverse = this.reverse() // FIXME infinite recursion
    } catch (e) {
      return false
    }
    return eq(reverse.condition, other.condition)
  }
  */

  /**
   * Swap first and second signal.
   */
  reverse(this: Readonly<this>): Atom {
    if (this.condition.constant !== undefined) {
      console.error("cannot reverse condition with a constant:", this)
      throw new Error(
        `cannot reverse condition with a constant: ${JSON.stringify(this.condition)}`,
      )
    }
    const comparator = (
      {
        "=": "=",
        "≠": "≠",
        "<": ">",
        ">": "<",
        "≤": "≥",
        "≥": "≤",
      } as const
    )[this.condition.comparator]
    return new Atom({
      ...this.condition,
      comparator: comparator,
    })
  }

  override not(): Atom {
    const comparator = (
      {
        "=": "≠",
        "≠": "=",
        "<": "≥",
        ">": "≤",
        "≤": ">",
        "≥": "<",
      } as const
    )[this.condition.comparator]
    return new Atom({
      ...this.condition,
      comparator: comparator,
    })
  }

  override to_dnf(): Term {
    return this
  }

  override to_decider_conditions(): DeciderCondition[] {
    return [this.condition]
  }

  override dot_node(node_id: string): string {
    return `${node_id} [label=${dot_string(JSON.stringify(this.condition, null, 2)).replace(/"$/, '\\l"')}];\n`
  }
}

export class True extends Atom {
  constructor() {
    super({
      first_signal: {
        name: "everything",
        type: "virtual",
      },
      comparator: "≠",
      constant: 0,
    })
  }

  override equals(other: Readonly<Term>): boolean {
    return other instanceof True
  }

  override absorbs(other: Readonly<Term>): true {
    return true
  }
}

export class False extends Atom {
  constructor() {
    super({
      first_signal: {
        name: "anything",
        type: "virtual",
      },
      comparator: "=",
      constant: 0,
    })
  }

  override equals(other: Readonly<Term>): boolean {
    return other instanceof False
  }

  override absorbs(other: Readonly<Term>): false {
    return false
  }
}

class Clause extends Term {
  readonly terms: readonly [
    Readonly<Term>,
    Readonly<Term>,
    ...ReadonlyArray<Term>,
  ]

  protected static from_array<T extends Clause>(
    this: new (
      first: Readonly<Term>,
      second: Readonly<Term>,
      ...tail: ReadonlyArray<Term>
    ) => T,
    terms: ReadonlyArray<Readonly<Term>>,
  ): T | Term {
    if (terms.length == 0) {
      throw new Error("internal error: empty clause")
    } else if (terms.length < 2) {
      return terms[0]
    } else {
      const [a, b, ...cs] = terms
      return new this(a, b, ...cs)
    }
  }

  constructor(
    first: Readonly<Term>,
    second: Readonly<Term>,
    ...tail: ReadonlyArray<Term>
  ) {
    super()
    this.terms = [first, second, ...tail]
  }

  /*
  override equals(other: Readonly<Term>): boolean {
    return (
      other instanceof Clause &&
      other instanceof (this.constructor as Function) &&
      this.is_superset_of(other) &&
      other.is_superset_of(this)
    )
  }
  */

  protected dot_attrs(): string {
    throw new Error("not implemented")
  }

  override dot_node(node_id: string): string {
    let text = `${node_id} [${this.dot_attrs()}]\n`
    this.terms.forEach((t: Readonly<Term>, i: number) => {
      text += t.dot_node(`${node_id}_${i}`)
      text += `${node_id} -> ${node_id}_${i};\n`
    })
    return text
  }
}

export class And extends Clause {
  override absorbs(this: Readonly<this>, other: Readonly<Term>): boolean {
    return this.terms.every((t) => t.absorbs(other))
  }

  override not(): Term {
    return Or.from_array(this.terms.map((t) => t.not()))
  }

  override and(other: Readonly<Term>): And {
    return new And(
      ...this.terms,
      ...(other instanceof And ? other.terms : [other]),
    )
  }

  override to_dnf(): Term {
    const options: ReadonlyArray<ReadonlyArray<Term>> = this.terms
      .map((t) => t.to_dnf())
      .map((t) => (t instanceof Or ? (t.terms as ReadonlyArray<Term>) : [t]))
    let products: Array<ReadonlyArray<Term>> = [[]]
    for (const opts of options) {
      const next: Array<ReadonlyArray<Term>> = []
      for (const prod of products) {
        for (const o of opts) {
          next.push([...prod, ...(o instanceof And ? o.terms : [o])])
        }
      }
      products = next
    }
    const conjs: ReadonlyArray<Term> = products.map((atoms) =>
      And.from_array(atoms),
    )
    return Or.from_array(conjs)
  }

  override simplify(this: Readonly<this>): Term {
    const a = this.terms.map((t) => t.simplify())
    // Remove right term if there exists an equal or more specific term to
    // the left of it.
    const b = a.filter((right, i) => {
      return !a.slice(0, i).some((left) => right.absorbs(left))
    })
    // Remove left term if there exists a more specific term to the right
    // of it. (If they were equal they were removed already.)
    const c = b.filter((left, i) => {
      return !b.slice(i + 1).some((right) => left.absorbs(right))
    })
    // ¬right ⊇ left ⇒ left ∩ right = ∅
    if (
      c.some((left, i) =>
        c.slice(i + 1).some((right) => right.not().absorbs(left)),
      )
    ) {
      return new False()
    }
    return And.from_array(c)
  }

  override dot_attrs(): string {
    return "label=" + dot_string("∧")
  }
}

export class Or extends Clause {
  override absorbs(this: Readonly<this>, other: Readonly<Term>): boolean {
    return this.terms.some((t) => t.absorbs(other))
  }

  override not(): Term {
    return And.from_array(this.terms.map((t) => t.not()))
  }

  override or(other: Readonly<Term>): Or {
    return new Or(
      ...this.terms,
      ...(other instanceof Or ? other.terms : [other]),
    )
  }

  override to_dnf(): Term {
    const terms: Array<Readonly<Term>> = []
    for (let t of this.terms) {
      t = t.to_dnf()
      if (t instanceof Or) {
        terms.concat(t.terms)
      } else {
        terms.push(t)
      }
    }
    return Or.from_array(terms)
  }

  override simplify(this: Readonly<this>): Term {
    const a = this.terms.map((t) => t.simplify())
    // Remove right term if there exists an equal or more general term to
    // the left of it.
    const b = a.filter((right, i) => {
      return !a.slice(0, i).some((left) => left.absorbs(right))
    })
    // Remove left term if there exists a more general term to the right
    // of it. (If they were equal they were removed already.)
    const c = b.filter((left, i) => {
      return !b.slice(i + 1).some((right) => right.absorbs(left))
    })
    // left ⊇ ¬right ⇒ left ∨ right = ⊤
    if (
      c.some((left, i) =>
        c.slice(i + 1).some((right) => left.absorbs(right.not())),
      )
    ) {
      return new True()
    }
    return Or.from_array(c)
  }

  override dot_attrs(): string {
    return "label=" + dot_string("∨")
  }
}
