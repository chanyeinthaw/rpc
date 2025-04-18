import type {
  MiddlewareHandler,
  MockHandler,
  Procedure,
  ProcedureHandler,
  ProcedureMeta,
} from '@be4/core'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { ResultAsync } from 'neverthrow'
import { z, type Schema } from 'zod'
import { RPCError } from '../error'

export class ProcedureBuilder<
  Context,
  Input = void,
  Output = void,
  HandlerInput = void,
> {
  private inputSchema: Schema<Input> = z.void() as unknown as Schema<Input>
  private outputSchema: Schema<Output> = z.void() as unknown as Schema<Output>
  private middlewares: Array<MiddlewareHandler<unknown, unknown>> = []
  private procedureName: string = 'UNNAMED'
  private errorTap: (error: RPCError) => void = () => {}

  constructor(source?: ProcedureBuilder<Context, Input, Output, HandlerInput>) {
    if (source) {
      this.inputSchema = source.inputSchema
      this.outputSchema = source.outputSchema
      this.middlewares = [...source.middlewares]
      this.procedureName = source.procedureName
      this.errorTap = source.errorTap
    }
  }

  public name(
    name: string
  ): ProcedureBuilder<Context, Input, Output, HandlerInput> {
    const b = new ProcedureBuilder(this)
    b.procedureName = name

    return b
  }

  public tapOnError(
    tap: (error: RPCError) => void
  ): ProcedureBuilder<Context, Input, Output, HandlerInput> {
    const b = new ProcedureBuilder(this)
    b.errorTap = tap

    return b
  }

  public input<I extends StandardSchemaV1>(
    schema: I
  ): ProcedureBuilder<
    Context,
    StandardSchemaV1.InferInput<I>,
    Output,
    StandardSchemaV1.InferOutput<I>
  > {
    const b = new ProcedureBuilder(this)
    b.inputSchema = schema as any

    return b as ProcedureBuilder<
      Context,
      StandardSchemaV1.InferInput<I>,
      Output,
      StandardSchemaV1.InferOutput<I>
    >
  }

  public output<O>(
    schema: Schema<O>
  ): ProcedureBuilder<Context, Input, O, HandlerInput> {
    const b = new ProcedureBuilder(this)
    b.outputSchema = schema as any

    return b as unknown as ProcedureBuilder<Context, Input, O, HandlerInput>
  }

  public use<ContextOut>(
    middleware: MiddlewareHandler<Context, ContextOut>
  ): ProcedureBuilder<ContextOut, Input, Output, HandlerInput> {
    const b = new ProcedureBuilder(this)
    b.middlewares.push(middleware as MiddlewareHandler<unknown, unknown>)

    return b as unknown as ProcedureBuilder<
      ContextOut,
      Input,
      Output,
      HandlerInput
    >
  }

  public query(handler: ProcedureHandler<Context, HandlerInput, Output>) {
    return this.build('GET', handler)
  }

  public mutation(handler: ProcedureHandler<Context, HandlerInput, Output>) {
    return this.build('POST', handler)
  }

  public get contract() {
    return {
      query: this._contract('GET'),
      mutation: this._contract('POST'),
    }
  }

  private _contract(method: 'GET' | 'POST') {
    const builder = new ProcedureBuilder(this)

    return {
      name: this.procedureName,
      method,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,

      builder: builder as ProcedureBuilder<
        Context,
        Input,
        Output,
        HandlerInput
      >,
    } satisfies ProcedureMeta<Input, Output, Context> & {
      builder: ProcedureBuilder<Context, Input, Output, HandlerInput>
    }
  }

  public mock(
    handler: MockHandler<Input, Output>,
    type: 'query' | 'mutation' = 'query'
  ) {
    const method = type === 'query' ? 'GET' : 'POST'
    if (this.procedureName === 'UNNAMED') {
      throw new Error('Procedure name is not set')
    }

    async function call(_: unknown, input: Input) {
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
    handler: ProcedureHandler<Context, HandlerInput, Output>
  ) {
    if (this.procedureName === 'UNNAMED') {
      throw new Error('Procedure name is not set')
    }

    const procedureName = this.procedureName
    const inputSchema = this.inputSchema
    const outputSchema = this.outputSchema
    const middlewares = this.middlewares
    const errorTap = this.errorTap

    async function call(context: unknown, input: Input) {
      const inputParseResult = inputSchema.safeParse(input)
      if (inputParseResult.success === false) {
        throw new RPCError('PARSE_ERROR', 'Error parsing input', {
          issues: inputParseResult.error.issues,
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
          input: inputParseResult.data as unknown as HandlerInput,
        })
      } catch (e) {
        let error: RPCError
        if (e instanceof RPCError) {
          error = new RPCError(e.code, e.message, {
            cause: e.cause,
            procedure: procedureName,
            input: inputParseResult.data,
          })
        } else {
          error = new RPCError(
            'INTERNAL_SERVER_ERROR',
            'Internal server error',
            {
              cause: e,
              procedure: procedureName,
              input: inputParseResult.data,
            }
          )
        }

        try {
          errorTap(error)
        } catch {}

        throw error
      }

      const outputParseResult = outputSchema.safeParse(output)
      if (outputParseResult.success === false) {
        throw new RPCError('PARSE_ERROR', 'Error parsing output', {
          issues: outputParseResult.error.issues,
          procedure: procedureName,
          input: inputParseResult.data,
        })
      }

      return outputParseResult.data
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
