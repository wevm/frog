import * as body from './body.js'

describe('empty', () => {
  test('behavior: a missing body is empty', async () => {
    await expect(body.empty(null)).resolves.toBe(true)
  })

  test.each(['', new Uint8Array()])(
    'behavior: a zero-byte request body is empty',
    async (value) => {
      const request = new Request('https://frog.wevm.dev/github/reconcile', {
        body: value,
        method: 'POST',
      })

      expect(request.body).not.toBeNull()
      await expect(body.empty(request.body)).resolves.toBe(true)
    },
  )

  test('behavior: one byte is not empty', async () => {
    const request = new Request('https://frog.wevm.dev/github/reconcile', {
      body: new Uint8Array([0]),
      method: 'POST',
    })

    await expect(body.empty(request.body)).resolves.toBe(false)
  })

  test('security: probing a body reads one byte and cancels the remainder', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      cancel,
      pull(controller) {
        controller.enqueue(new Uint8Array([1]))
      },
      type: 'bytes',
    })

    await expect(body.empty(stream)).resolves.toBe(false)
    expect(cancel).toHaveBeenCalledOnce()
  })

  test('security: an unreadable body fails closed', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('unreadable'))
      },
      type: 'bytes',
    })

    await expect(body.empty(stream)).resolves.toBe(false)
  })

  test('security: a non-byte stream fails closed', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close()
      },
    })

    await expect(body.empty(stream)).resolves.toBe(false)
  })
})
