import type { ResultAsync } from 'neverthrow'
import type { Schema } from 'zod'
import type { RPCErrorContract } from '../error'

export type MockHandler<I, O> = (input: I) => Promise<O>

export type ProcedureHandler<Context, I, O> = (options: {
  ctx: Context
  input: I
}) => Promise<O>

export type MiddlewareHandler<ContextIn, ContextOut> = (options: {
  ctx: ContextIn
}) => Promise<ContextOut>

export interface ProcedureMeta<I, O, _Context = unknown> {
  readonly name: string
  readonly method: 'GET' | 'POST'

  readonly inputSchema: Schema<I>
  readonly outputSchema: Schema<O>
}

export interface Procedure<I, O, _Context = unknown>
  extends ProcedureMeta<I, O, _Context> {
  callable: {
    call(context: unknown, input: I): Promise<O>

    try(context: unknown, input: I): ResultAsync<O, RPCErrorContract>
  }

  readonly mocked: boolean
}

export type InferProcedureInput<P> =
  P extends Procedure<infer I, any, any> ? I : never

export type InferProcedureOutput<P> =
  P extends Procedure<any, infer O, any> ? O : never
