import {
  RPC_ERROR,
  type Procedure,
  type RouterErrorDetails,
  type RouterResponse,
} from '@pl4dr/rpc-core'
import { Result, ResultAsync } from 'neverthrow'
import SuperJSON from 'superjson'
import { RPCError } from '../error'

export class Router<Context> {
  private procedures: Map<string, Procedure<any, any, unknown>> = new Map()
  private errorTap: (error: RouterErrorDetails) => void = () => {}

  public tapOnError(tap: (error: RouterErrorDetails) => void) {
    this.errorTap = tap

    return this
  }

  public register(procedure: Procedure<any, any, unknown>) {
    this.procedures.set(procedure.name, procedure)

    return this
  }

  public resolve(name: string): Procedure<any, any, Context> {
    const procedure = this.procedures.get(name)
    if (!procedure) {
      throw new RPCError('NOT_FOUND', 'Procedure not found!')
    }

    return procedure
  }

  private parseProcedure(pathname: string, req: Request) {
    const url = new URL(req.url)
    const procedureName = url.pathname
      .replace(pathname, '')
      .replace(/^\//, '')
      .replace(/\/$/, '')

    return this.resolve(procedureName)
  }

  private async parseInput(procedureName: string, req: Request) {
    switch (req.method) {
      case 'GET':
        const url = new URL(req.url)
        const inputJsonStr = decodeURIComponent(
          url.searchParams.get('input') ?? ''
        )

        const parseResult = Result.fromThrowable(SuperJSON.parse)(inputJsonStr)
        if (parseResult.isErr()) {
          // throw new RPCError('PARSE_ERROR', 'Invalid json input.', {
          //   cause: parseResult.error,
          //   procedure: procedureName,
          // })

          return null
        }

        return parseResult.value
      case 'POST':
        const bodyResult = await ResultAsync.fromPromise(req.json(), (e) => e)
        if (bodyResult.isErr()) {
          // throw new RPCError('PARSE_ERROR', 'Invalid json input.', {
          //   cause: bodyResult.error,
          //   procedure: procedureName,
          // })

          return null
        }

        const bodyJSON = bodyResult.value

        return SuperJSON.deserialize(bodyJSON)
    }

    throw new RPCError(
      'METHOD_NOT_SUPPORTED',
      `Procedure ${procedureName} does not support ${req.method} method.`,
      {
        procedure: procedureName,
      }
    )
  }

  private async processRequest(
    pathname: string,
    context: Context,
    request: Request
  ) {
    const procedure = this.parseProcedure(pathname, request)
    if (request.method !== procedure.method) {
      throw new RPCError(
        'METHOD_NOT_SUPPORTED',
        `Procedure ${procedure.name} does not support ${procedure.method} method.`,
        {
          procedure: procedure.name,
        }
      )
    }

    const input = await this.parseInput(procedure.name, request)
    return await procedure.callable.call(context, input)
  }

  private handleErrorTap(error: RouterErrorDetails) {
    try {
      this.errorTap(error)
    } catch {}
  }

  private formatError(e: unknown) {
    let errorDetails: RouterErrorDetails
    let erroredProcedure: string | undefined
    let erroredInput: unknown | undefined
    let status = 500

    if (e instanceof RPCError) {
      errorDetails = {
        status: e.code,
        message: e.message,
        issues: e.issues,
        stack: e.stack,
        cause: e.cause,
      }
      erroredProcedure = e.procedure
      erroredInput = e.input
      status = e.code
    } else if (e instanceof Error) {
      errorDetails = {
        status: RPC_ERROR.INTERNAL_SERVER_ERROR,
        message: e.message,
        stack: e.stack,
        cause: e.cause,
      }
    } else {
      errorDetails = {
        status: RPC_ERROR.INTERNAL_SERVER_ERROR,
        message: 'Unknown error',
        cause: e,
      }
    }

    if (process.env.NODE_ENV === 'production') {
      errorDetails.stack = undefined
    }

    return {
      success: false,
      error: errorDetails,
      procedure: erroredProcedure,
      input: erroredInput,
    } satisfies RouterResponse
  }

  public async process(options: {
    pathname: string
    context: Context
    request: Request
  }) {
    let response: RouterResponse = {
      success: true,
      data: undefined,
    }

    let status = 200

    try {
      response.data = await this.processRequest(
        options.pathname,
        options.context,
        options.request
      )
    } catch (e) {
      response = this.formatError(e)
      this.handleErrorTap(response.error)
    }

    const body = SuperJSON.stringify(response)
    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
