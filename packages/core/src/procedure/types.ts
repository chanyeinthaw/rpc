import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ResultAsync } from 'neverthrow'
import type { RPCErrorContract } from '../error'

export type MockHandler<
  I extends StandardSchemaV1,
  O extends StandardSchemaV1,
> = (
  input: StandardSchemaV1.InferOutput<I>
) => Promise<StandardSchemaV1.InferInput<O>>

export type ProcedureHandler<
  Context,
  I extends StandardSchemaV1,
  O extends StandardSchemaV1,
> = (options: {
  ctx: Context
  input: StandardSchemaV1.InferOutput<I>
}) => Promise<StandardSchemaV1.InferInput<O>>

export type MiddlewareHandler<ContextIn, ContextOut> = (options: {
  ctx: ContextIn
}) => Promise<ContextOut>

export interface ProcedureMeta<
  I extends StandardSchemaV1,
  O extends StandardSchemaV1,
  _Context = unknown,
> {
  readonly name: string
  readonly method: 'GET' | 'POST'

  readonly inputSchema: I
  readonly outputSchema: O
}

export interface Procedure<
  I extends StandardSchemaV1,
  O extends StandardSchemaV1,
  _Context = unknown,
> extends ProcedureMeta<I, O, _Context> {
  callable: {
    call(
      context: unknown,
      input: StandardSchemaV1.InferInput<I>
    ): Promise<StandardSchemaV1.InferOutput<O>>

    try(
      context: unknown,
      input: StandardSchemaV1.InferInput<I>
    ): ResultAsync<StandardSchemaV1.InferOutput<O>, RPCErrorContract>
  }

  readonly mocked: boolean
}

export type InferProcedureInput<P> =
  P extends Procedure<infer I, any, any>
    ? StandardSchemaV1.InferOutput<I>
    : never

export type InferProcedureOutput<P> =
  P extends Procedure<any, infer O, any>
    ? StandardSchemaV1.InferOutput<O>
    : never
