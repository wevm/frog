import { serve } from '../src/cli/Cli.js'

export type Result = {
  /** Exit code, or `undefined` when the command never exited non-zero. */
  code: number | undefined
  /** Parsed envelope: `{ ok: true, data }` or `{ ok: false, error }`. */
  envelope: Envelope
  /** Raw stdout. */
  stdout: string
}

type Envelope =
  | { data: Record<string, unknown>; meta?: Record<string, unknown>; ok: true }
  | { error: { code: string; message: string }; meta?: Record<string, unknown>; ok: false }

/**
 * Runs the CLI in-process.
 *
 * incur's `serve` dependency injection means no subprocess, and asserting the JSON envelope rather
 * than formatted text keeps the tests indifferent to help and layout changes.
 */
export async function run(
  argv: readonly string[],
  env: Record<string, string | undefined> = {},
): Promise<Result> {
  let stdout = ''
  let code: number | undefined
  await serve([...argv, '--json', '--full-output'], {
    env,
    exit(value) {
      code ??= value
    },
    stdout(value) {
      stdout += value
    },
  })
  return { code, envelope: JSON.parse(stdout) as Envelope, stdout }
}

/** Runs the CLI and asserts it succeeded, returning the data payload. */
export async function data<value = Record<string, unknown>>(
  argv: readonly string[],
  env?: Record<string, string | undefined>,
): Promise<value> {
  const result = await run(argv, env)
  if (!result.envelope.ok)
    throw new Error(`Expected success, got ${result.envelope.error.code}: ${result.stdout}`)
  return result.envelope.data as value
}

/** Runs the CLI and asserts it failed, returning the error. */
export async function error(
  argv: readonly string[],
  env?: Record<string, string | undefined>,
): Promise<{ code: string; message: string }> {
  const result = await run(argv, env)
  if (result.envelope.ok) throw new Error(`Expected failure, got ${result.stdout}`)
  return result.envelope.error
}
