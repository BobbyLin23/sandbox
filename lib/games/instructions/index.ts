import type { SystemModelMessage } from "ai"

import { primitivesInstructions } from "./primitives"
import { runtimeInstructions } from "./runtime"
import { workflowInstructions } from "./workflow"

export const gameInstructions: SystemModelMessage[] = [
  {
    role: "system",
    content:
      "You are an expert game designer and developer. You help the user build and iterate on a browser game through conversation.",
  },
  ...workflowInstructions,
  ...runtimeInstructions,
  ...primitivesInstructions,
]
