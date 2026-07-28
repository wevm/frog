import * as failure from './failure.js'

describe('from', () => {
  test('behavior: preserves safe error details', () => {
    const error = Object.assign(new Error('Resource not accessible by integration'), {
      name: 'RequestError',
      status: 403,
    })

    expect(failure.from(error)).toEqual({
      message: 'Resource not accessible by integration',
      name: 'RequestError',
      status: 403,
    })
  })

  test('behavior: exposes nested webhook failures', () => {
    const error = Object.assign(new Error('Validation failed'), {
      name: 'RequestError',
      status: 422,
    })

    expect(failure.from(new AggregateError([error], error.message))).toEqual({
      errors: [
        {
          message: 'Validation failed',
          name: 'RequestError',
          status: 422,
        },
      ],
      name: 'AggregateError',
    })
  })

  test('security: ignores arbitrary properties and messages on unknown failures', () => {
    expect(
      failure.from({
        headers: { authorization: 'Bearer secret' },
        message: 'Bearer secret',
        name: 'RequestError',
        request: { token: 'secret' },
        status: 500,
      }),
    ).toEqual({
      name: 'RequestError',
      status: 500,
    })
  })

  test('security: bounds and redacts request failures', () => {
    const errors = Array.from({ length: 10 }, () =>
      Object.assign(new Error('Bearer secret ghs_stateless.token'), {
        name: 'RequestError',
        status: 403,
      }),
    )

    const summarized = failure.from(new AggregateError(errors))

    expect(summarized.errors).toHaveLength(5)
    expect(summarized.errors?.[0]).toEqual({
      message: 'Bearer [REDACTED] [REDACTED]',
      name: 'RequestError',
      status: 403,
    })
  })

  test('security: handles circular aggregate errors', () => {
    const error = new AggregateError([])
    error.errors.push(error)

    expect(failure.from(error)).toEqual({
      errors: [{ name: 'AggregateError' }],
      name: 'AggregateError',
    })
  })

  test.each([null, undefined, 'failed', 42])('behavior: summarizes primitive failures', (error) => {
    expect(failure.from(error)).toEqual({ name: 'UnknownError' })
  })
})
