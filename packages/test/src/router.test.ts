import { RPC_ERROR_CODE, type RouterResponse } from '@pl4dr/rpc-core'
import { makeRPC, RPCError } from '@pl4dr/rpc-server'
import SuperJSON from 'superjson'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

describe('router', () => {
  test('can register procedure', () => {
    const { procedure, router } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function ({ input }) {
        return 'hello ' + input
      })

    router.register(HelloProcedure)

    expect(router.resolve(HelloProcedure.name)).toBeTruthy()
    expect(router.resolve(HelloProcedure.name).name).toBe(HelloProcedure.name)
  })

  test('can process request', async () => {
    const { procedure, router } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function ({ input }) {
        return 'hello ' + input
      })

    router.register(HelloProcedure)

    const input = encodeURIComponent(SuperJSON.stringify('world'))
    const url = new URL('/rpc/hello', 'http://localhost:4000')
    url.searchParams.set('input', input)

    const response = await router.process({
      pathname: '/rpc',
      context: {},
      request: new Request(url, {
        method: 'GET',
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')

    const body = await response.json()
    const data = SuperJSON.deserialize(body)

    expect(data).toStrictEqual({
      result: {
        data: 'hello world',
      },
    })
  })

  test('can process request on mocked procedure', async () => {
    const { procedure, router } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .mock(async function (input) {
        return 'hello ' + input
      }, 'mutation')

    router.register(HelloProcedure)

    const input = SuperJSON.stringify('world')
    const url = new URL('/rpc/hello', 'http://localhost:4000')

    const response = await router.process({
      pathname: '/rpc',
      context: {},
      request: new Request(url, {
        method: 'POST',
        body: input,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')

    const body = await response.json()
    const data = SuperJSON.deserialize(body)

    expect(data).toStrictEqual({
      result: {
        data: 'hello world',
      },
    })
  })

  test('returns error on validation failure', async () => {
    const { procedure, router } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string().min(10, 'Too short'))
      .output(z.string())
      .query(async function ({ input }) {
        return 'hello ' + input
      })

    router.register(HelloProcedure)

    const input = encodeURIComponent(SuperJSON.stringify('world'))
    const url = new URL('/rpc/hello', 'http://localhost:4000')
    url.searchParams.set('input', input)

    const response = await router.process({
      pathname: '/rpc',
      context: {},
      request: new Request(url, {
        method: 'GET',
      }),
    })

    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toBe('application/json')

    const body = await response.json()
    const data = SuperJSON.deserialize<RouterResponse>(body)

    expect(data).toHaveProperty('message')

    if ('message' in data) {
      expect(data.data.httpStatus).toBe(400)
      expect(data.data.issues).toBeTruthy()
      expect(data.data.issues?.[0]?.message).toBe('Too short')
    }
  })

  test('returns error on throw', async () => {
    const { procedure, router } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function () {
        throw new RPCError('FORBIDDEN', 'Forbidden')
      })

    router.register(HelloProcedure)

    const input = encodeURIComponent(SuperJSON.stringify('world'))
    const url = new URL('/rpc/hello', 'http://localhost:4000')
    url.searchParams.set('input', input)

    const response = await router.process({
      pathname: '/rpc',
      context: {},
      request: new Request(url, {
        method: 'GET',
      }),
    })

    expect(response.status).toBe(RPC_ERROR_CODE.FORBIDDEN)
    expect(response.headers.get('content-type')).toBe('application/json')

    const body = await response.json()
    const data = SuperJSON.deserialize<RouterResponse>(body)

    expect(data).toHaveProperty('message')

    if ('message' in data) {
      expect(data.data.code).toBe('FORBIDDEN')
      expect(data.data.message).toBe('Forbidden')
    }
  })
})
