import { Module, ArithmeticCombinator, DeciderCombinator } from "./main.ts"
import { And, Atom, Or } from "./logic.ts"

function create_submodule() {
  const submod = new Module({
    inputs: ["a", "b"],
    outputs: ["a", "b"],
  })
  const arithmetic = new ArithmeticCombinator({
    first_constant: 0,
    operation: "OR",
    second_constant: 1,
    output_signal: { name: "iron-ore" },
  })
  submod.add(arithmetic)
  submod.inputs.a.connect(arithmetic.inputs.red)
  submod.inputs.b.connect(arithmetic.inputs.green)
  arithmetic.outputs.red.connect(submod.outputs.b)
  arithmetic.outputs.green.connect(submod.outputs.a)
  return submod
}

const module = new Module({
  inputs: ["in0", "in1", "in2", "in3"],
  outputs: ["out0", "out1", "out2"],
  label: "?",
})

const decider = new DeciderCombinator([], [])
module.add(decider)

const submod = create_submodule()
module.add(submod)

module.inputs.in0.connect(decider.inputs.red)
module.inputs.in1.connect(decider.inputs.green)
module.inputs.in1.connect(submod.inputs.b)
module.inputs.in2.connect(submod.inputs.a)
module.inputs.in3.connect(module.outputs.out2)

decider.outputs.red.connect(submod.inputs.a)
decider.outputs.green.connect(module.outputs.out0)

submod.outputs.b.connect(module.outputs.out1)

//console.log(module.dot())

const a = new Atom({
  first_signal: { name: "iron-ore" },
  comparator: "≤",
  second_signal: { name: "copper-ore" },
})
console.error(a.subsumes(a))
const cond = new And(
  new And(a, a),
  new Or(
    new Atom({
      first_signal: { name: "heavy-oil", type: "liquid" },
      comparator: ">",
      second_signal: { name: "light-oil", type: "liquid" },
    }),
    new Atom({
      first_signal: { name: "coal" },
      comparator: "≠",
      constant: 3,
    }),
    new Atom({
      first_signal: { name: "coal" },
      comparator: "≠",
      constant: 3,
    }),
  ),
)
console.log(cond.to_dnf().simplify().dot())
//console.error(cond.to_decider_conditions())
