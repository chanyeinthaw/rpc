import { RPC_ERROR_CODE, type RPCErrorContract } from '@be4/core'
import type { ZodIssue } from 'zod'

export class RPCError extends Error implements RPCErrorContract {
  public readonly procedure: string | undefined
  public readonly input: unknown | undefined
  public readonly issues: ZodIssue[] | undefined

  constructor(
    public readonly code: keyof typeof RPC_ERROR_CODE,
    message: string,
    options?: ErrorOptions & {
      issues?: ZodIssue[]
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
