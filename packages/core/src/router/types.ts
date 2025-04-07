import { type ZodIssue } from 'zod'

export type RouterResponse<Data = unknown, Input = unknown> =
  | {
      result: {
        data: Data
      }
    }
  | {
      message: string
      code: number
      data: RouterErrorDetails<Input>
    }

export type RouterErrorDetails<Input = unknown> = {
  code: string
  httpStatus: number
  message: string
  procedure?: string
  issues?: ZodIssue[]
  stack?: string
  input?: Input
}
