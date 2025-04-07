import type { ProcedureHandler } from '@be4/core'
import type { ProcedureBuilder } from './builder'

export type InferProcedureInputFromBuilder<P> =
  P extends ProcedureBuilder<any, infer I, any> ? I : never

export type InferProcedureOutputFromBuilder<P> =
  P extends ProcedureBuilder<any, any, infer O> ? O : never

export type InferProcedureHandler<P> =
  P extends ProcedureBuilder<infer Context, infer Input, infer Output>
    ? ProcedureHandler<Context, Input, Output>
    : never

export type InferProcedureHandlerOptions<P> =
  P extends ProcedureBuilder<infer Context, infer Input, infer Output>
    ? Parameters<ProcedureHandler<Context, Input, Output>>[0]
    : never

export type InferProcedureHandlerOutput<P> =
  P extends ProcedureBuilder<infer Context, infer Input, infer Output>
    ? ReturnType<ProcedureHandler<Context, Input, Output>>
    : never
