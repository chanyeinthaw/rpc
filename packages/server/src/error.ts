import { RPC_ERROR_CODE, type RPCErrorContract } from '@pl4dr/rpc-core'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export class RPCError extends Error implements RPCErrorContract {
  public readonly procedure: string | undefined
  public readonly input: unknown | undefined
  public readonly issues: readonly StandardSchemaV1.Issue[] | undefined

  constructor(
    public readonly code: keyof typeof RPC_ERROR_CODE,
    message: string,
    options?: ErrorOptions & {
      issues?: readonly StandardSchemaV1.Issue[]
      procedure?: string
      input?: unknown
    }
  ) {
    super(message, options)

    if (options?.issues) this.issues = options.issues
    if (options?.procedure) this.procedure = options.procedure
    if (options?.input) this.input = options.input
  }
}
