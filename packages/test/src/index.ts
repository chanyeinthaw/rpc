import { generateContractsFromSpec, makeRPC, RPCError } from '@be4/server'
import { z } from 'zod'

function setup() {
  const { router, procedure } = makeRPC<any>()

  const VoidProcedure = procedure
    .name('VoidProcedure')
    .output(z.string())
    .query(async function () {
      return 'void'
    })

  const HelloProcedure = procedure
    .name('HelloProcedure')
    .input(
      z.object({
        name: z.string().min(5, 'Too short'),
        arr: z.array(z.enum(['a', 'b', 'c'])),
      })
    )
    .output(z.string())
    .query(async function ({ input }) {
      return 'hello ' + input
    })

  const ThrowProcedure = procedure
    .name('ThrowProcedure')
    .input(z.string())
    .output(z.string())
    .mutation(async function () {
      throw new RPCError('UNAUTHORIZED', 'Unauthorized')
    })

  router.register(VoidProcedure)
  router.register(HelloProcedure)
  router.register(ThrowProcedure)

  return JSON.stringify(router.specs(), null, 2)
}

const specs = setup()
const code = await generateContractsFromSpec(specs)

console.log(code)
