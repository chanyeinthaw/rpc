import type { StandardSchemaV1 } from '@standard-schema/spec'

export type RouterResponse<Data = unknown> =
  | {
      result: {
        data: Data
      }
    }
  | {
      message: string
      code: number
      data: RouterErrorDetails<unknown>
    }

export type RouterErrorDetails<Input = unknown> = {
  code: string
  httpStatus: number
  message: string
  procedure?: string
  issues?: readonly StandardSchemaV1.Issue[]
  stack?: string
  input?: Input
}
