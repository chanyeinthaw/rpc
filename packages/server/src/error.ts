import { RPC_ERROR, type RPCErrorContract } from '@rpc/core'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export class RPCError extends Error implements RPCErrorContract {
  public readonly procedure: string | undefined
  public readonly input: unknown | undefined
  public readonly issues: readonly StandardSchemaV1.Issue[] | undefined
  public readonly code: number
  public readonly codeKey: keyof typeof RPC_ERROR

  constructor(
    code: keyof typeof RPC_ERROR,
    message: string,
    options?: ErrorOptions & {
      issues?: readonly StandardSchemaV1.Issue[]
      procedure?: string
      input?: unknown
    }
  ) {
    super(message, options)

    this.codeKey = code
    this.code = RPC_ERROR[code]

    if (options?.issues) this.issues = options.issues
    if (options?.procedure) this.procedure = options.procedure
    if (options?.input) this.input = options.input
  }
}
