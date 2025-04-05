import type { StandardSchemaV1 } from '@standard-schema/spec'

type SchemaParseResult<T> =
  | {
      success: true
      value: T
    }
  | {
      success: false
      issues: readonly StandardSchemaV1.Issue[]
    }

export function schema<T extends StandardSchemaV1>(schema: T) {
  function parse(
    input: unknown
  ): SchemaParseResult<StandardSchemaV1.InferOutput<T>> {
    const result = schema['~standard'].validate(input)
    if (result instanceof Promise) {
      throw new Error('Schema is async')
    }

    if (result.issues) {
      return {
        success: false,
        issues: result.issues,
      }
    }

    return {
      success: true,
      value: result.value,
    }
  }

  return { parse }
}
