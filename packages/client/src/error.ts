import type { RouterErrorDetails } from '@pl4dr/rpc-core'

export type RPCClientErrorCode =
  | 'VALIDATION_ERROR'
  | 'FETCH_ERROR'
  | 'PARSE_ERROR'
  | 'RPC_ERROR'

export class RPCClientError<Input = unknown, Output = unknown> extends Error {
  public readonly procedure?: string
  public readonly input?: Input
  public readonly output?: Output
  public readonly rpcErrCode?: RouterErrorDetails['code']

  constructor(
    public code: RPCClientErrorCode,
    error: RouterErrorDetails<Input>,
    options?: ErrorOptions & {
      output?: Output
    }
  ) {
    super(error.message, options)

    this.procedure = error.procedure
    this.input = error.input
    this.output = options?.output
    this.rpcErrCode = error.code
  }
}
