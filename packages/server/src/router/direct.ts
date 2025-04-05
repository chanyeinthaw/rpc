import type { Procedure } from '@rpc/core'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export function makeDirectCaller<Context>(
  createContext: () => Promise<Context>
) {
  function direct<
    Input extends StandardSchemaV1,
    Output extends StandardSchemaV1,
  >(procedure: Procedure<Input, Output, Context>) {
    async function call(input: StandardSchemaV1.InferInput<Input>) {
      const context = await createContext()
      return await procedure.callable.call(context, input)
    }

    async function tryCall(input: StandardSchemaV1.InferInput<Input>) {
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
