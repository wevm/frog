import fs from 'node:fs'
import type { Readable } from 'node:stream'

/** How long to wait for the first byte when it is unclear whether anything is coming. */
export const grace = 100

/**
 * Reads piped input, or nothing when there is none.
 *
 * `isTTY` is not enough on its own, and neither is `fstat`. A terminal and `/dev/null` are character
 * devices and never have input. A redirected file certainly does, and reading one cannot block.
 *
 * Everything else has to prove itself within {@link grace}, because an open channel is not the same as an
 * arriving one. A parent that spawns this and holds the write end open without writing, which is what an
 * agent does, leaves standard input readable forever and never ended.
 *
 * The cost is that a producer slower than the deadline is treated as silent. That is the better failure:
 * a refusal naming `--title`, rather than a process that never returns.
 *
 * @returns The input, or `undefined` when nothing was piped in.
 */
export async function read(options: read.Options = {}): Promise<string | undefined> {
  if (options.stream) return consume(options.stream)

  const source = kind()
  if (source === 'none') return undefined

  if (source === 'ambiguous' && !(await arriving(process.stdin, options.grace ?? grace))) {
    release()
    return undefined
  }

  const contents = await consume(process.stdin)
  if (source === 'ambiguous') release()
  return contents
}

export declare namespace read {
  /** Options for {@link read}. */
  type Options = {
    /** Milliseconds an open channel has to produce its first byte. */
    grace?: number | undefined
    /** Stream to read instead of standard input. Read to the end with no deadline. */
    stream?: Readable | undefined
  }
}

/**
 * Lets the process exit even though standard input is still open.
 *
 * Touching standard input references its handle, and the reference outlives the listeners: a parent that
 * spawns this and keeps the write end open would otherwise hold the process alive indefinitely after its
 * work is done, with the entry already written and nothing left to wait for.
 *
 * Only for a pipe or a socket. A file-backed standard input is an `fs.ReadStream`, which has no `unref`
 * at all, and needs none: a file always reaches its end.
 */
function release(): void {
  process.stdin.pause()
  process.stdin.unref()
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
    // A regular file is the only one that cannot leave a read outstanding. A pipe or a socket may be
    // held open by a parent that never writes and never closes.
    if (stats.isFile()) return 'certain'
    if (stats.isFIFO() || stats.isSocket()) return 'ambiguous'
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
