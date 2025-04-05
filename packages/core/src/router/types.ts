import type { StandardSchemaV1 } from '@standard-schema/spec'

export type RouterResponse<Data = unknown> =
  | {
      success: true
      data: Data
    }
  | {
      success: false
      error: RouterErrorDetails
      procedure?: string
      input?: unknown
    }

export type RouterErrorDetails = {
  status: number
  message: string
  cause?: unknown
  stack?: string | undefined
  issues?: readonly StandardSchemaV1.Issue[]
}
