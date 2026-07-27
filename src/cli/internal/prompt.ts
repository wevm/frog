import { spawn } from 'node:child_process'
import * as clack from '@clack/prompts'

/**
 * Binds every prompt to stderr so stdout stays a clean data channel for pipes and agents.
 *
 * Spread into each clack call.
 */
export const stream = { output: process.stderr } as const

/** Whether the process can prompt at all. */
export function interactive(): boolean {
  return Boolean(process.stdin.isTTY && process.stderr.isTTY)
}

/** Unwraps a clack result, converting a cancellation into a throw. */
export function required<value>(value: value | symbol): value {
  if (clack.isCancel(value)) throw new CancelledError()
  return value as value
}

/**
 * Opens `file` in an editor and waits.
 *
 * The editor edits the real entry, not a scratch copy.
 */
export async function edit(file: string, options: edit.Options): Promise<void> {
  const { command } = options
  const [bin, ...args] = command.split(/\s+/)
  if (!bin) throw new EditorError({ command })

  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, [...args, file], { stdio: 'inherit' })
    child.on('error', () => reject(new EditorError({ command })))
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new EditorError({ command }))))
  })
}

export declare namespace edit {
  type Options = {
    /** Editor command, possibly with arguments (e.g. `code -w`). */
    command: string
  }
}

/** Thrown when the user cancels a prompt. */
export class CancelledError extends Error {
  override name = 'prompt.CancelledError'
  code = 'CANCELLED' as const

  constructor() {
    super('Cancelled.')
  }
}

/** Thrown when the configured editor is missing or exits non-zero. */
export class EditorError extends Error {
  override name = 'prompt.EditorError'
  code = 'EDITOR_FAILED' as const

  constructor(options: { command: string }) {
    super(`Editor \`${options.command}\` failed. Set $EDITOR, or pass --body instead.`)
  }
}
