import { makeRPC, RPCError } from '@pl4dr/rpc-server'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

describe('procedure creation', () => {
  test('can create query procedure', () => {
    const { procedure } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function ({ input }) {
        return input
      })

    expect(HelloProcedure.name).toBe('hello')
    expect(HelloProcedure.method).toBe('GET')
    expect(HelloProcedure.mocked).toBe(false)

    expect(HelloProcedure).toHaveProperty('inputSchema')
    expect(HelloProcedure).toHaveProperty('outputSchema')
    expect(HelloProcedure).toHaveProperty('callable')
  })

  test('can create mutation procedure', () => {
    const { procedure } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .mutation(async function ({ input }) {
        return input
      })

    expect(HelloProcedure.name).toBe('hello')
    expect(HelloProcedure.method).toBe('POST')
    expect(HelloProcedure.mocked).toBe(false)

    expect(HelloProcedure).toHaveProperty('inputSchema')
    expect(HelloProcedure).toHaveProperty('outputSchema')
    expect(HelloProcedure).toHaveProperty('callable')
  })

  test('can crate mocked procedure', () => {
    const { procedure } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .mock(async function (input) {
        return input
      }, 'mutation')

    expect(HelloProcedure.name).toBe('hello')
    expect(HelloProcedure.method).toBe('POST')
    expect(HelloProcedure.mocked).toBe(true)

    expect(HelloProcedure).toHaveProperty('inputSchema')
    expect(HelloProcedure).toHaveProperty('outputSchema')
    expect(HelloProcedure).toHaveProperty('callable')
  })
})

describe('procedure calling', () => {
  test('can try call procedure - without context', async () => {
    const { procedure } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function ({ input }) {
        return 'Hello, ' + input
      })

    const result = await HelloProcedure.callable.try(null, 'world')
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toBe('Hello, world')
  })

  test('can call procedure - without context', async () => {
    const { procedure } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function ({ input }) {
        return 'Hello, ' + input
      })

    const result = await HelloProcedure.callable.call(null, 'world')
    expect(result).toBe('Hello, world')
  })

  test('can try call procedure - with context', async () => {
    const { procedure } = makeRPC<{
      day: string
    }>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function ({ input, ctx }) {
        return `Hello, ${input} on ${ctx.day}`
      })

    const result = await HelloProcedure.callable.try(
      {
        day: 'Monday',
      },
      'world'
    )
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toBe('Hello, world on Monday')
  })

  test('can call procedure - with context', async () => {
    const { procedure } = makeRPC<{
      day: string
    }>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function ({ input, ctx }) {
        return `Hello, ${input} on ${ctx.day}`
      })

    const result = await HelloProcedure.callable.call(
      {
        day: 'Monday',
      },
      'world'
    )
    expect(result).toBe('Hello, world on Monday')
  })

  test('returns error result on error', async () => {
    const { procedure } = makeRPC<any>()

    const HelloProcedure = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function () {
        throw new Error('something went wrong')
      })

    const result = await HelloProcedure.callable.try(null, 'world')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().message).toBe('Internal server error')

    const HelloProcedure1 = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function () {
        throw new RPCError('FORBIDDEN', 'Forbidden')
      })

    const result1 = await HelloProcedure1.callable.try(null, 'world')
    expect(result1.isErr()).toBe(true)
    expect(result1._unsafeUnwrapErr().code).toBe('FORBIDDEN')
    expect(result1._unsafeUnwrapErr().message).toBe('Forbidden')

    const HelloProcedure2 = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function () {
        return ''
      })

    const result2 = await HelloProcedure2.callable.try(null, 1 as any)
    expect(result2.isErr()).toBe(true)
    expect(result2._unsafeUnwrapErr().code).toBe('PARSE_ERROR')
    expect(result2._unsafeUnwrapErr().issues).toBeTruthy()

    const HelloProcedure3 = procedure
      .name('hello')
      .input(z.string())
      .output(z.string())
      .query(async function () {
        return 1 as any
      })

    const result3 = await HelloProcedure3.callable.try(null, '')
    expect(result3.isErr()).toBe(true)
    expect(result3._unsafeUnwrapErr().code).toBe('PARSE_ERROR')
    expect(result3._unsafeUnwrapErr().issues).toBeTruthy()
  })
})
