import type { Procedure } from '@be4/core'

export function makeDirectCaller<Context>(
  createContext: () => Promise<Context>
) {
  function direct<Input, Output>(procedure: Procedure<Input, Output, Context>) {
    async function call(input: Input) {
      const context = await createContext()
      return await procedure.callable.call(context, input)
    }

    async function tryCall(input: Input) {
      const context = await createContext()
      return await procedure.callable.try(context, input)
    }

    return {
      call,
      try: tryCall,
    }
  }

  return direct
}
