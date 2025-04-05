import type { RouterErrorDetails } from '@pl4dr/rpc-core'

export type RPCClientErrorCode =
  | 'VALIDATION_ERROR'
  | 'FETCH_ERROR'
  | 'PARSE_ERROR'
  | 'RPC_ERROR'

export class RPCClientError<Input = unknown> extends Error {
  public readonly procedure?: string
  public readonly input?: Input
  public readonly rpcErrCode?: RouterErrorDetails['code']

  constructor(
    public code: RPCClientErrorCode,
    error: RouterErrorDetails<Input>,
    options?: ErrorOptions
  ) {
    super(error.message, options)

    this.procedure = error.procedure
    this.input = error.input
    this.rpcErrCode = error.code
  }
}
