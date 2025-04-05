import type {
  MiddlewareHandler,
  MockHandler,
  Procedure,
  ProcedureHandler,
} from '@pl4dr/rpc-core'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { ResultAsync } from 'neverthrow'
import { z, type ZodVoid } from 'zod'
import { RPCError } from '../error'
import { schema } from '../utils/schema'

export class ProcedureBuilder<
  Context,
  Input extends StandardSchemaV1 = ZodVoid,
  Output extends StandardSchemaV1 = ZodVoid,
> {
  private inputSchema: Input = z.void() as any
  private outputSchema: Output = z.void() as any
  private middlewares: Array<MiddlewareHandler<unknown, unknown>> = []
  private procedureName: string = 'UNNAMED'
  private errorTap: (error: RPCError) => void = () => {}

  constructor(source?: ProcedureBuilder<Context, Input, Output>) {
    if (source) {
      this.inputSchema = source.inputSchema
      this.outputSchema = source.outputSchema
      this.middlewares = source.middlewares
      this.procedureName = source.procedureName
      this.errorTap = source.errorTap
    }
  }

  private clone() {
    return new ProcedureBuilder<any, any, any>(this)
  }

  public name(name: string) {
    this.procedureName = name

    return this.clone()
  }

  public tapOnError(tap: (error: RPCError) => void) {
    this.errorTap = tap

    return this.clone()
  }

  public input<I extends StandardSchemaV1>(
    schema: I
  ): ProcedureBuilder<Context, I, Output> {
    this.inputSchema = schema as any

    return this.clone()
  }

  public output<O extends StandardSchemaV1>(
    schema: O
  ): ProcedureBuilder<Context, Input, O> {
    this.outputSchema = schema as any

    return this.clone()
  }

  public use<ContextOut>(
    middleware: MiddlewareHandler<Context, ContextOut>
  ): ProcedureBuilder<ContextOut, Input, Output> {
    this.middlewares.push(middleware as MiddlewareHandler<unknown, unknown>)

    return this.clone()
  }

  public query(handler: ProcedureHandler<Context, Input, Output>) {
    return this.build('GET', handler)
  }

  public mutation(handler: ProcedureHandler<Context, Input, Output>) {
    return this.build('POST', handler)
  }

  public mock(
    handler: MockHandler<Input, Output>,
    type: 'query' | 'mutation' = 'query'
  ) {
    const method = type === 'query' ? 'GET' : 'POST'
    if (this.procedureName === 'UNNAMED') {
      throw new Error('Procedure name is not set')
    }

    async function call(_: unknown, input: StandardSchemaV1.InferInput<Input>) {
      return await handler(input)
    }

    return {
      name: this.procedureName,
      method: method,

      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,

      callable: {
        call,
        try: ResultAsync.fromThrowable(call, (e) => e as RPCError),
      },

      mocked: true,
    } satisfies Procedure<Input, Output, unknown>
  }

  private build(
    method: 'GET' | 'POST',
    handler: ProcedureHandler<Context, Input, Output>
  ) {
    if (this.procedureName === 'UNNAMED') {
      throw new Error('Procedure name is not set')
    }

    const procedureName = this.procedureName
    const inputSchema = this.inputSchema
    const outputSchema = this.outputSchema
    const middlewares = this.middlewares
    const errorTap = this.errorTap

    async function call(
      context: unknown,
      input: StandardSchemaV1.InferInput<Input>
    ) {
      const inputParseResult = schema(inputSchema).parse(input)
      if (inputParseResult.success === false) {
        throw new RPCError('PARSE_ERROR', 'Error parsing input', {
          issues: inputParseResult.issues,
          procedure: procedureName,
        })
      }

      let currentContext: unknown = context
      for (const middleware of middlewares) {
        const contextOut = await middleware({
          ctx: currentContext,
        })

        currentContext = contextOut
      }

      let output
      try {
        output = await handler({
          ctx: currentContext as Context,
          input: inputParseResult.value,
        })
      } catch (e) {
        let error: RPCError
        if (e instanceof RPCError) {
          error = new RPCError(e.codeKey, e.message, {
            cause: e.cause,
            procedure: procedureName,
            input: inputParseResult.value,
          })
        } else {
          error = new RPCError(
            'INTERNAL_SERVER_ERROR',
            'Internal server error',
            {
              cause: e,
              procedure: procedureName,
              input: inputParseResult.value,
            }
          )
        }

        try {
          errorTap(error)
        } catch {}

        throw error
      }

      const outputParseResult = schema(outputSchema).parse(output)
      if (outputParseResult.success === false) {
        throw new RPCError('PARSE_ERROR', 'Error parsing output', {
          issues: outputParseResult.issues,
          procedure: procedureName,
          input: inputParseResult.value,
        })
      }

      return outputParseResult.value
    }

    return {
      name: this.procedureName,
      method,

      inputSchema,
      outputSchema,

      callable: {
        call,
        try: ResultAsync.fromThrowable(call, (e) => e as RPCError),
      },

      mocked: false,
    } satisfies Procedure<Input, Output, unknown>
  }
}

export function makeProcedureBuilder<Context>() {
  return new ProcedureBuilder<Context>()
}
