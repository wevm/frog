import fs from 'node:fs'
import type { Readable } from 'node:stream'

/** How long to wait for the first byte when it is unclear whether anything is coming. */
export const grace = 100

/**
 * Reads piped input, or nothing when there is none.
 *
 * `isTTY` is not enough on its own, and neither is `fstat`. A terminal and `/dev/null` are character
 * devices and never have input. A pipe or a redirected file certainly does. A socket is ambiguous: Node
 * presents a spawned child's pipe as a socket, so that is how a harness supplies input from code, but a
 * worker thread can also be handed a socket that never carries anything and never closes. Reading that
 * blocks forever.
 *
 * So the certain cases are read without a deadline, which leaves a slow writer free to take its time, and
 * only a socket has to prove itself within {@link grace}.
 *
 * @returns The input, or `undefined` when nothing was piped in.
 */
export async function read(options: read.Options = {}): Promise<string | undefined> {
  if (options.stream) return consume(options.stream)

  const source = kind()
  if (source === 'none') return undefined
  if (source === 'ambiguous' && !(await arriving(process.stdin, options.grace ?? grace)))
    return undefined

  return consume(process.stdin)
}

export declare namespace read {
  /** Options for {@link read}. */
  type Options = {
    /** Milliseconds a socket has to produce its first byte. */
    grace?: number | undefined
    /** Stream to read instead of standard input. Read to the end with no deadline. */
    stream?: Readable | undefined
  }
}

/** Reads a stream to the end. */
async function consume(stream: Readable): Promise<string | undefined> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer))
  const contents = Buffer.concat(chunks).toString('utf8')
  return contents.trim() ? contents : undefined
}

/** What standard input is, as far as it can be told. */
function kind(): 'ambiguous' | 'certain' | 'none' {
  try {
    const stats = fs.fstatSync(0)
    if (stats.isFIFO() || stats.isFile()) return 'certain'
    if (stats.isSocket()) return 'ambiguous'
    return 'none'
  } catch {
    return 'none'
  }
}

/** Whether a stream produces anything within the deadline. */
function arriving(stream: Readable, deadline: number): Promise<boolean> {
  if (stream.readableEnded) return Promise.resolve(false)

  return new Promise((resolve) => {
    const settle = (value: boolean) => {
      clearTimeout(timer)
      stream.off('end', ended)
      stream.off('readable', ready)
      resolve(value)
    }
    const ended = () => settle(false)
    const ready = () => settle(true)

    const timer = setTimeout(() => settle(false), deadline)
    // Nothing is consumed here, so `consume` still sees every byte.
    stream.once('readable', ready)
    stream.once('end', ended)
  })
}

/**
 * Splits piped input into a title and a body.
 *
 * Shaped like a commit message: the first line is the title, the rest is the body. That avoids asking a
 * caller to quote a multi-line string on a command line, where an apostrophe in the body ends the
 * argument and breaks the whole invocation.
 *
 * @param contents - Piped input.
 * @returns The title and body, or `undefined` when there is no title to take.
 */
export function parse(contents: string): { body: string; title: string } | undefined {
  const lines = contents.replace(/\r\n/g, '\n').split('\n')

  const start = lines.findIndex((line) => line.trim())
  if (start === -1) return undefined

  const title = lines[start]?.trim()
  if (!title) return undefined

  return {
    body: lines
      .slice(start + 1)
      .join('\n')
      .trim(),
    title,
  }
}
