import { assert, assertEquals } from "jsr:@std/assert"
import { And, Atom, False, Or, True } from "./logic.ts"
import { compare_signal } from "./main.ts"
import type { DeciderComparator } from "./main.ts"

const A = new Atom({
  first_signal: { name: "signal-A", type: "virtual" },
  comparator: ">",
  constant: 0,
})
const B = new Atom({
  first_signal: { name: "signal-B", type: "virtual" },
  comparator: ">",
  constant: 0,
})
const C = new Atom({
  first_signal: { name: "signal-C", type: "virtual" },
  comparator: ">",
  constant: 0,
})
const D = new Atom({
  first_signal: { name: "signal-D", type: "virtual" },
  comparator: ">",
  constant: 0,
})

/**
 * Test simplification if one absorbs the other.
 */
function test_simplification({
  left,
  right,
  str_left,
  str_right,
}: {
  left: Atom
  right: Atom
  str_left: string
  str_right: string
}): void {
  Deno.test(`absorption: ${str_left} ∨ ${str_right} == ${str_left}`, () => {
    const or = new Or(left, right)
    assertEquals(or.simplify(), left)
  })
  if (!left.equals(right)) {
    Deno.test(
      `absorption: ${str_right} ∨ ${str_left} == ${right.absorbs(left) ? str_right : str_left}`,
      () => {
        const or = new Or(right, left)
        assertEquals(or.simplify(), right.absorbs(left) ? right : left)
      },
    )
    Deno.test(
      `absorption: ${str_left} ∧ ${str_right} == ${!right.absorbs(left) ? str_right : str_left}`,
      () => {
        const and = new And(left, right)
        assertEquals(and.simplify(), !right.absorbs(left) ? right : left)
      },
    )
  }
  Deno.test(`absorption: ${str_right} ∧ ${str_left} == ${str_right}`, () => {
    const and = new And(right, left)
    assertEquals(and.simplify(), right)
  })
}

const comparators: ReadonlyArray<DeciderComparator> = [
  "=",
  "≠",
  "<",
  "≤",
  ">",
  "≥",
]
type ByComparator<T> = Record<DeciderComparator, T>
type ByConst<T> = [T, T, T]

function test_signal_absorption(): void {
  function foo(): ByComparator<boolean> {
    return {
      "=": false,
      "≠": false,
      "<": false,
      "≤": false,
      ">": false,
      "≥": false,
    }
  }

  const absorp: ByComparator<ByComparator<boolean>> = {
    "=": foo(),
    "≠": foo(),
    "<": foo(),
    "≤": foo(),
    ">": foo(),
    "≥": foo(),
  }

  absorp["="]["="] = true

  absorp["≠"]["≠"] = true
  absorp["≠"]["<"] = true
  absorp["≠"][">"] = true

  absorp["<"]["<"] = true

  absorp["≤"]["="] = true
  absorp["≤"]["<"] = true
  absorp["≤"]["≤"] = true

  absorp[">"][">"] = true

  absorp["≥"]["="] = true
  absorp["≥"][">"] = true
  absorp["≥"]["≥"] = true

  for (const rel0 of comparators) {
    for (const rel1 of comparators) {
      const expect = absorp[rel0][rel1]

      const left = new Atom({
        first_signal: A.condition.first_signal,
        comparator: rel0,
        second_signal: B.condition.first_signal,
      })
      const right = new Atom({
        first_signal: A.condition.first_signal,
        comparator: rel1,
        second_signal: B.condition.first_signal,
      })
      const str_left = `(A${rel0}B)`
      const str_right = `(A${rel1}B)`

      Deno.test(
        `${expect ? "superset" : "nop"}: ${str_left} ${expect ? "⊇" : "⊉"} ${str_right}`,
        () => {
          assertEquals(left.absorbs(right), expect)
        },
      )
      if (expect) {
        test_simplification({ left, right, str_left, str_right })
      }
    }
  }
}

function test_constant_absorption(): void {
  // Create a big table of relations and set the ones that are expected to be
  // true to true.

  function foo(): ByComparator<ByConst<boolean>> {
    return {
      "=": [false, false, false],
      "≠": [false, false, false],
      "<": [false, false, false],
      "≤": [false, false, false],
      ">": [false, false, false],
      "≥": [false, false, false],
    }
  }

  const absorp: ByComparator<ByConst<ByComparator<ByConst<boolean>>>> = {
    "=": [foo(), foo(), foo()],
    "≠": [foo(), foo(), foo()],
    "<": [foo(), foo(), foo()],
    "≤": [foo(), foo(), foo()],
    ">": [foo(), foo(), foo()],
    "≥": [foo(), foo(), foo()],
  }

  // equal

  absorp["="][0]["="][0] = true
  absorp["="][1]["="][1] = true
  absorp["="][2]["="][2] = true

  // not equal

  absorp["≠"][0]["="][1] = true
  absorp["≠"][0]["="][2] = true
  absorp["≠"][1]["="][0] = true
  absorp["≠"][1]["="][2] = true
  absorp["≠"][2]["="][0] = true
  absorp["≠"][2]["="][1] = true

  absorp["≠"][0]["≠"][0] = true
  absorp["≠"][1]["≠"][1] = true
  absorp["≠"][2]["≠"][2] = true

  absorp["≠"][0]["<"][0] = true
  absorp["≠"][1]["<"][0] = true
  absorp["≠"][1]["<"][1] = true
  absorp["≠"][2]["<"][0] = true
  absorp["≠"][2]["<"][1] = true
  absorp["≠"][2]["<"][2] = true

  absorp["≠"][1]["≤"][0] = true
  absorp["≠"][2]["≤"][0] = true
  absorp["≠"][2]["≤"][1] = true

  absorp["≠"][0][">"][0] = true
  absorp["≠"][0][">"][1] = true
  absorp["≠"][0][">"][2] = true
  absorp["≠"][1][">"][1] = true
  absorp["≠"][1][">"][2] = true
  absorp["≠"][2][">"][2] = true

  absorp["≠"][0]["≥"][1] = true
  absorp["≠"][0]["≥"][2] = true
  absorp["≠"][1]["≥"][2] = true

  // less than

  absorp["<"][1]["="][0] = true
  absorp["<"][2]["="][0] = true
  absorp["<"][2]["="][1] = true

  absorp["<"][0]["<"][0] = true
  absorp["<"][1]["<"][0] = true
  absorp["<"][1]["<"][1] = true
  absorp["<"][2]["<"][0] = true
  absorp["<"][2]["<"][1] = true
  absorp["<"][2]["<"][2] = true

  absorp["<"][1]["≤"][0] = true
  absorp["<"][2]["≤"][0] = true
  absorp["<"][2]["≤"][1] = true

  // greater than

  absorp[">"][0]["="][1] = true
  absorp[">"][0]["="][2] = true
  absorp[">"][1]["="][2] = true

  absorp[">"][0][">"][0] = true
  absorp[">"][0][">"][1] = true
  absorp[">"][0][">"][2] = true
  absorp[">"][1][">"][1] = true
  absorp[">"][1][">"][2] = true
  absorp[">"][2][">"][2] = true

  absorp[">"][0]["≥"][1] = true
  absorp[">"][0]["≥"][2] = true
  absorp[">"][1]["≥"][2] = true

  // less equal

  absorp["≤"][0]["="][0] = true
  absorp["≤"][1]["="][0] = true
  absorp["≤"][1]["="][1] = true
  absorp["≤"][2]["="][0] = true
  absorp["≤"][2]["="][1] = true
  absorp["≤"][2]["="][2] = true

  absorp["≤"][0]["<"][0] = true
  absorp["≤"][0]["<"][1] = true
  absorp["≤"][1]["<"][0] = true
  absorp["≤"][1]["<"][1] = true
  absorp["≤"][1]["<"][2] = true
  absorp["≤"][2]["<"][0] = true
  absorp["≤"][2]["<"][1] = true
  absorp["≤"][2]["<"][2] = true

  absorp["≤"][0]["≤"][0] = true
  absorp["≤"][1]["≤"][0] = true
  absorp["≤"][1]["≤"][1] = true
  absorp["≤"][2]["≤"][0] = true
  absorp["≤"][2]["≤"][1] = true
  absorp["≤"][2]["≤"][2] = true

  // greater equal

  absorp["≥"][0]["="][0] = true
  absorp["≥"][0]["="][1] = true
  absorp["≥"][0]["="][2] = true
  absorp["≥"][1]["="][1] = true
  absorp["≥"][1]["="][2] = true
  absorp["≥"][2]["="][2] = true

  absorp["≥"][0][">"][0] = true
  absorp["≥"][0][">"][1] = true
  absorp["≥"][0][">"][2] = true
  absorp["≥"][1][">"][0] = true
  absorp["≥"][1][">"][1] = true
  absorp["≥"][1][">"][2] = true
  absorp["≥"][2][">"][1] = true
  absorp["≥"][2][">"][2] = true

  absorp["≥"][0]["≥"][0] = true
  absorp["≥"][0]["≥"][1] = true
  absorp["≥"][0]["≥"][2] = true
  absorp["≥"][1]["≥"][1] = true
  absorp["≥"][1]["≥"][2] = true
  absorp["≥"][2]["≥"][2] = true

  // run all tests for constants

  for (const rel0 of comparators) {
    for (const rel1 of comparators) {
      for (const c0 of [0, 1, 2]) {
        for (const c1 of [0, 1, 2]) {
          const expect = absorp[rel0][c0][rel1][c1]

          const left = new Atom({
            first_signal: A.condition.first_signal,
            comparator: rel0,
            constant: c0,
          })
          const right = new Atom({
            first_signal: A.condition.first_signal,
            comparator: rel1,
            constant: c1,
          })
          const str_left = `(A${rel0}${c0})`
          const str_right = `(A${rel1}${c1})`

          Deno.test(
            `${expect ? "superset" : "nop"}: ${str_left} ${expect ? "⊇" : "⊉"} ${str_right}`,
            () => {
              assertEquals(left.absorbs(right), expect)
            },
          )
          if (expect) {
            test_simplification({ left, right, str_left, str_right })
          }
        }
      }
    }
  }
}

Deno.test("compare_signals(A, A)", () => {
  assert(compare_signal(A.condition.first_signal, A.condition.first_signal))
})
Deno.test("compare_signals(A, B)", () => {
  assert(!compare_signal(A.condition.first_signal, B.condition.first_signal))
})

// absorption
test_signal_absorption()
test_constant_absorption()

// True
Deno.test("A ∨ ¬A == ⊤", () => {
  assertEquals(A.or(A.not()).simplify(), new True())
})
Deno.test("⊤ ∨ A == ⊤", () => {
  assertEquals(new True().or(A).simplify(), new True())
})
Deno.test("A ∨ ⊤ == ⊤", () => {
  assertEquals(A.or(new True()).simplify(), new True())
})
Deno.test("⊤ ∧ A == A", () => {
  assertEquals(new True().and(A).simplify(), A)
})
Deno.test("A ∧ ⊤ == A", () => {
  assertEquals(A.and(new True()).simplify(), A)
})

// False
Deno.test("A ∧ ¬A == ⊥", () => {
  assertEquals(A.and(A.not()).simplify(), new False())
})
Deno.test("⊥ ∨ A == A", () => {
  assertEquals(new False().or(A).simplify(), A)
})
Deno.test("A ∨ ⊥ == A", () => {
  assertEquals(A.or(new False()).simplify(), A)
})
Deno.test("⊥ ∧ A == ⊥", () => {
  assertEquals(new False().and(A).simplify(), new False())
})
Deno.test("A ∧ ⊥ == ⊥", () => {
  assertEquals(A.and(new False()).simplify(), new False())
})

// distributive law
Deno.test("A ∨ (A ∧ B) == A", () => {
  assertEquals(A.or(A.and(B)).simplify(), A)
})
Deno.test("A ∧ (A ∨ B) == A", () => {
  assertEquals(A.and(A.or(B)).simplify(), A)
})

// disjunctive normal form
Deno.test("(A ∨ B) ∧ (C ∨ D) == (A ∧ C) ∨ (A ∧ D) ∨ (B ∧ C) ∨ (B ∧ D)", () => {
  assertEquals(
    new And(A.or(B), C.or(D)).to_dnf(),
    new Or(A.and(C), A.and(D), B.and(C), B.and(D)),
  )
})
