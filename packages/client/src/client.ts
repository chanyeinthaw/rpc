import type { ProcedureMeta, RouterResponse } from '@rpc/core'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { err, ok, Result, ResultAsync } from 'neverthrow'
import SuperJSON from 'superjson'
import { RPCClientError } from './error'
import { schema } from './utils/schema'

type Fetch = typeof fetch
type BaseProcedureMeta = ProcedureMeta<any, any, any>

function validateData<T extends StandardSchemaV1>(
  procedureName: string,
  schemaObj: T,
  data: StandardSchemaV1.InferInput<T>
): Result<
  StandardSchemaV1.InferOutput<T>,
  RPCClientError<StandardSchemaV1.InferInput<T>>
> {
  const inputResult = schema(schemaObj).parse(data)
  if (!inputResult.success) {
    return err(
      new RPCClientError('VALIDATION_ERROR', {
        procedure: procedureName,
        input: data,
        error: {
          message: 'Error validating input',
          issues: inputResult.issues,
        },
      })
    )
  }

  return ok(inputResult.value)
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

  function procedure<
    Input extends StandardSchemaV1,
    Output extends StandardSchemaV1,
  >(procedure: ProcedureMeta<Input, Output, unknown>) {
    async function call(
      input: StandardSchemaV1.InferInput<Input>
    ): Promise<
      Result<
        StandardSchemaV1.InferOutput<Output>,
        RPCClientError<StandardSchemaV1.InferInput<Input>>
      >
    > {
      const inputResult = validateData(
        procedure.name,
        procedure.inputSchema,
        input
      )
      if (inputResult.isErr()) return inputResult

      const request = prepareRequest(procedure.name, procedure.method, input)
      const responsePromise = fetchFn(request)

      const responseResult = await ResultAsync.fromPromise(
        responsePromise,
        (e) => e
      )
      if (responseResult.isErr()) {
        return err(
          new RPCClientError('FETCH_ERROR', {
            procedure: procedure.name,
            input,
            error: {
              message: 'Fetch error',
              cause: responseResult.error,
            },
          })
        )
      }

      const parsedOutputResult = await ResultAsync.fromThrowable(async () => {
        const json = await responseResult.value.json()
        return SuperJSON.deserialize<RouterResponse>(json)
      })()
      if (parsedOutputResult.isErr()) {
        return err(
          new RPCClientError('PARSE_ERROR', {
            procedure: procedure.name,
            input,
            error: {
              message: 'Error parsing json response',
              cause: parsedOutputResult.error,
            },
          })
        )
      }

      if (parsedOutputResult.value.success === false) {
        return err(
          new RPCClientError('RPC_ERROR', {
            procedure: procedure.name,
            input: parsedOutputResult.value.input,
            error: parsedOutputResult.value.error,
          })
        )
      }

      const outputResult = validateData(
        procedure.name,
        procedure.outputSchema,
        parsedOutputResult.value.data
      )

      return outputResult
    }

    async function callUnsafe(input: StandardSchemaV1.InferInput<Input>) {
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
