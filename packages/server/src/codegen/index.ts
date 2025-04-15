import dedent from 'dedent'
import { RefResolver } from 'json-schema-ref-resolver'
import { jsonSchemaToZod } from 'json-schema-to-zod'
import { format } from 'prettier'
import { z } from 'zod'

const ProcedureSpecSchema = z.object({
  procedures: z.array(
    z.object({
      name: z.string(),
      method: z.enum(['GET', 'POST']),
      inputSchema: z.any(),
      outputSchema: z.any(),
    })
  ),
})

function resolveSchema(schema: any) {
  const refResolver = new RefResolver()
  refResolver.addSchema({
    $id: 'sourceSchema',
    ...schema,
  })
  const resolved = refResolver.getDerefSchema('sourceSchema')
  return jsonSchemaToZod(resolved, {
    module: 'none',
  })
}

export function generateContractsFromSpec(spec: string) {
  const specObject = ProcedureSpecSchema.parse(JSON.parse(spec))

  const procedureCodeBlocks: string[] = ['import { z } from "zod"']

  for (const procedure of specObject.procedures) {
    const inputSchema = resolveSchema(procedure.inputSchema)
    const outputSchema = resolveSchema(procedure.outputSchema)
    const procedureName = procedure.name
    const method = procedure.method

    const code = dedent`
      export const ${procedureName} = {
        name: '${procedureName}',
        method: '${method}',
        inputSchema: ${inputSchema},
        outputSchema: ${outputSchema},
      }
    `
    procedureCodeBlocks.push(code)
  }

  return format(procedureCodeBlocks.join('\n\n'), {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    trailingComma: 'es5',
    useTabs: false,
  })
}
