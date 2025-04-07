import type { ProcedureMeta, RouterResponse } from '@be4/core'
import { err, ok, Result, ResultAsync } from 'neverthrow'
import SuperJSON from 'superjson'
import { type Schema } from 'zod'
import { RPCClientError } from './error'

type Fetch = typeof fetch
type BaseProcedureMeta = ProcedureMeta<any, any, any>

function validateInput<T, O>(
  procedureName: string,
  schemaObj: Schema<T>,
  data: T
): Result<T, RPCClientError<T, O>> {
  const inputResult = schemaObj.safeParse(data)
  if (!inputResult.success) {
    return err(
      new RPCClientError<T, O>('VALIDATION_ERROR', {
        code: 'VALIDATION_ERROR',
        httpStatus: -1,
        procedure: procedureName,
        input: data,
        message: 'Error validating input',
        issues: inputResult.error.issues,
      })
    )
  }

  return ok(inputResult.data)
}

function validateOutput<T, O>(
  procedureName: string,
  schemaObj: Schema<O>,
  input: T,
  data: O
): Result<O, RPCClientError<T, O>> {
  const inputResult = schemaObj.safeParse(data)
  if (!inputResult.success) {
    return err(
      new RPCClientError<T, O>(
        'VALIDATION_ERROR',
        {
          code: 'VALIDATION_ERROR',
          httpStatus: -1,
          procedure: procedureName,
          input: input,
          message: 'Error validating input',
          issues: inputResult.error.issues,
        },
        {
          output: data,
        }
      )
    )
  }

  return ok(inputResult.data)
}

export function makeRPCClient(options: { baseURL: string; fetch?: Fetch }) {
  const baseURL = options.baseURL
  const fetchFn = options.fetch ?? fetch

  function prepareRequest(
    procedure: BaseProcedureMeta['name'],
    method: BaseProcedureMeta['method'],
    input: unknown
  ) {
    let jsonInput = SuperJSON.stringify(input)
    jsonInput = method === 'GET' ? encodeURIComponent(jsonInput) : jsonInput

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')

    const url = new URL(baseURL)
    url.pathname = `${url.pathname}/${procedure}`

    if (method === 'GET') url.searchParams.set('input', jsonInput)

    return new Request(url.toString(), {
      method,
      headers,
      body: method === 'POST' ? jsonInput : undefined,
    })
  }

  function procedure<Input, Output>(
    procedure: ProcedureMeta<Input, Output, unknown>
  ) {
    async function call(
      input: Input
    ): Promise<Result<Output, RPCClientError<Input, Output>>> {
      const inputResult = validateInput<Input, Output>(
        procedure.name,
        procedure.inputSchema,
        input
      )
      if (inputResult.isErr()) {
        return err(inputResult.error)
      }

      const request = prepareRequest(procedure.name, procedure.method, input)
      const responsePromise = fetchFn(request)

      const responseResult = await ResultAsync.fromPromise(
        responsePromise,
        (e) => e
      )
      if (responseResult.isErr()) {
        return err(
          new RPCClientError<Input, Output>(
            'FETCH_ERROR',
            {
              code: 'FETCH_ERROR',
              httpStatus: -1,
              procedure: procedure.name,
              input,
              message: 'Fetch error',
            },
            {
              cause: responseResult.error,
            }
          )
        )
      }

      const parsedOutputResult = await ResultAsync.fromThrowable(async () => {
        const json = await responseResult.value.json()
        return SuperJSON.deserialize<RouterResponse<Output, Input>>(json)
      })()
      if (parsedOutputResult.isErr()) {
        return err(
          new RPCClientError<Input, Output>(
            'PARSE_ERROR',
            {
              code: 'PARSE_ERROR',
              httpStatus: -1,
              procedure: procedure.name,
              input,
              message: 'Error parsing json response',
            },
            {
              cause: parsedOutputResult.error,
            }
          )
        )
      }

      if ('message' in parsedOutputResult.value) {
        return err(
          new RPCClientError<Input, Output>(
            'RPC_ERROR',
            parsedOutputResult.value.data
          )
        )
      }

      const outputResult = validateOutput<Input, Output>(
        procedure.name,
        procedure.outputSchema,
        inputResult.value,
        parsedOutputResult.value.result.data
      )

      return outputResult
    }

    async function callUnsafe(input: Input) {
      const result = await call(input)
      if (result.isErr()) throw result.error

      return result.value
    }

    return {
      try: call,
      call: callUnsafe,
    }
  }

  return { procedure }
}
