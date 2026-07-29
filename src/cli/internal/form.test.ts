import type * as IssueForm from '../../IssueForm.js'
import * as form from './form.js'

test('behavior: validates each individually required checkbox option', () => {
  const issueForm: IssueForm.Form = {
    fields: [
      {
        kind: 'checkboxes',
        label: 'Agreements',
        options: ['Optional', 'Required One', 'Required Two'],
        required: true,
        requiredOptions: ['Required One', 'Required Two'],
      },
    ],
  }

  expect(form.validate(issueForm, '### Agreements\n\n- [x] Optional')).toEqual({
    missing: [],
    unanswered: ['Agreements'],
  })
  expect(
    form.validate(issueForm, '### Agreements\n\n- [x] Required One\n- [x] Required Two'),
  ).toEqual({ missing: [], unanswered: [] })
})

test.each(['```ts', '~~~~ markdown'])(
  'behavior: ignores headings inside a %s fenced code block',
  (opening) => {
    const issueForm: IssueForm.Form = {
      fields: [{ kind: 'textarea', label: 'Current Behavior', required: true }],
    }
    const marker = opening.startsWith('`') ? '```' : '~~~~'
    const body = [opening, '### Current Behavior', '', 'Not a form answer.', marker].join('\n')

    expect(form.validate(issueForm, body)).toEqual({
      missing: ['Current Behavior'],
      unanswered: [],
    })
  },
)
