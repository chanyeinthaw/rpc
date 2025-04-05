import { makeProcedureBuilder } from './procedure/builder'
import { Router } from './router/router'

export function makeRPC<Context>() {
  const router = new Router<Context>()
  const procedure = makeProcedureBuilder<Context>()

  return {
    router,
    procedure,
  }
}
