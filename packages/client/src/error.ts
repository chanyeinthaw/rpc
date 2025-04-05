import type { RouterErrorDetails } from '@pl4dr/rpc-core'

export type RPCClientErrorCode =
  | 'VALIDATION_ERROR'
  | 'FETCH_ERROR'
  | 'PARSE_ERROR'
  | 'RPC_ERROR'

export class RPCClientError<Input = unknown> extends Error {
  public procedure?: string
  public input?: Input
  public error: Omit<RouterErrorDetails, 'status'> & {
    status?: number
  }

  constructor(
    public code: RPCClientErrorCode,
    options: {
      procedure?: string
      input?: Input
      error: Omit<RouterErrorDetails, 'status'> & {
        status?: number
      }
    }
  ) {
    super(options.error.message)

    this.procedure = options.procedure
    this.input = options.input
    this.error = options.error
  }
}
