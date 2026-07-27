import fs from 'node:fs/promises'
import path from 'node:path'
import * as IssueForm from './IssueForm.js'

/** viem's real bug report form, saved verbatim rather than invented. */
const viem = await fs.readFile(
  path.join(import.meta.dirname, '../test/fixtures/viem-bug-report.yml'),
  'utf8',
)

describe('parse', () => {
  test('behavior: keeps the answerable fields in order', () => {
    const form = IssueForm.parse(viem)

    expect(form?.name).toBe('Bug Report')
    expect(form?.fields.map((field) => [field.kind, field.label, field.required]))
      .toMatchInlineSnapshot(`
        [
          [
            "checkboxes",
            "Check existing issues",
            true,
          ],
          [
            "input",
            "Viem Version",
            true,
          ],
          [
            "textarea",
            "Current Behavior",
            false,
          ],
          [
            "textarea",
            "Expected Behavior",
            false,
          ],
          [
            "textarea",
            "Steps To Reproduce",
            false,
          ],
          [
            "input",
            "Link to Minimal Reproducible Example",
            false,
          ],
          [
            "textarea",
            "Anything else?",
            false,
          ],
        ]
      `)
  })

  // The leading `markdown` block is the project's preamble to whoever fills the form in. Carrying it
  // through would put viem's sponsor pitch into the issue body Frog files.
  test('behavior: drops instruction blocks', () => {
    const form = IssueForm.parse(viem)
    expect(form?.fields.some((field) => field.label.includes('Thanks for taking'))).toBe(false)
  })

  test('behavior: a required checkbox carries its option', () => {
    const [checkbox] = IssueForm.parse(viem)?.fields ?? []
    expect(checkbox?.options).toMatchInlineSnapshot(`
      [
        "I checked there isn't [already an issue](https://github.com/wevm/viem/issues) for the bug I encountered.",
      ]
    `)
  })

  test('behavior: reads the labels a project applies', () => {
    const form = IssueForm.parse(
      'name: Bug\nlabels: [bug, triage]\nbody:\n  - type: input\n    attributes:\n      label: Version\n',
    )
    expect(form?.labels).toEqual(['bug', 'triage'])
  })

  test.for([
    ['not: yaml: at: all', 'unparseable'],
    ['name: Bug\n', 'no body'],
    ['name: Bug\nbody: []\n', 'an empty body'],
    [
      'name: Bug\nbody:\n  - type: markdown\n    attributes:\n      value: Hello\n',
      'only instructions',
    ],
    ['name: Bug\nbody:\n  - type: input\n    attributes: {}\n', 'a field with no label'],
  ] as const)('behavior: %s yields nothing (%s)', ([contents]) => {
    expect(IssueForm.parse(contents)).toBeUndefined()
  })
})

describe('scaffold', () => {
  test('behavior: renders the headings a submitted form would', () => {
    const form = IssueForm.parse(viem)
    expect(form && IssueForm.scaffold(form)).toMatchInlineSnapshot(`
      "### Check existing issues

      <!-- By submitting this issue, you checked there isn't [already an issue](https://github.com/wevm/viem/issues) for this bug. Required. -->

      - [ ] I checked there isn't [already an issue](https://github.com/wevm/viem/issues) for the bug I encountered.

      ### Viem Version

      <!-- What version of Viem are you using? Required. -->

      ### Current Behavior

      <!-- A concise description of what you're experiencing. -->

      ### Expected Behavior

      <!-- A concise description of what you expected to happen. -->

      ### Steps To Reproduce

      <!-- Steps or code snippets to reproduce the behavior. -->

      ### Link to Minimal Reproducible Example

      <!-- Please provide a link that can reproduce the problem: [new.viem.sh](https://new.viem.sh) for runtime issues or [TypeScript Playground](https://www.typescriptlang.org/play) for type issues. For most issues, you will likely get asked to provide a minimal reproducible example so why not add one now :) If a report is vague (e.g. just snippets, generic error message, screenshot, etc.) and has no reproduction, it will receive a "Needs Reproduction" label and be auto-closed. -->

      ### Anything else?

      <!-- Browser info? Screenshots? Anything that will give us more context about the issue you are encountering! Tip: You can attach images or log files by clicking this area to highlight it and then dragging files in. -->
      "
    `)
  })
})

describe('choose', () => {
  const dir = IssueForm.dir

  test('behavior: friction.yml wins, whatever else is there', () => {
    expect(
      IssueForm.choose([`${dir}/bug_report.yml`, `${dir}/friction.yml`, `${dir}/config.yml`]),
    ).toBe(`${dir}/friction.yml`)
  })

  test('behavior: a single form is the choice already made', () => {
    expect(IssueForm.choose([`${dir}/anything.yml`, `${dir}/config.yml`])).toBe(
      `${dir}/anything.yml`,
    )
  })

  test('behavior: several forms resolve to the one named for bugs', () => {
    expect(IssueForm.choose([`${dir}/docs_issue.yml`, `${dir}/bug_report.yml`])).toBe(
      `${dir}/bug_report.yml`,
    )
  })

  // Guessing here would file a bug report into a feature request form.
  test('behavior: several forms and no bug leaves the choice unmade', () => {
    expect(IssueForm.choose([`${dir}/docs.yml`, `${dir}/feature.yml`])).toBeUndefined()
  })

  test('behavior: config.yml is not a form', () => {
    expect(IssueForm.choose([`${dir}/config.yml`])).toBeUndefined()
  })

  test('behavior: markdown templates are not forms', () => {
    expect(IssueForm.choose([`${dir}/bug_report.md`])).toBeUndefined()
  })

  test('behavior: nothing there', () => {
    expect(IssueForm.choose([])).toBeUndefined()
  })
})

describe('find', () => {
  const bug = 'name: Bug\nbody:\n  - type: input\n    attributes:\n      label: Version\n'
  const friction =
    'name: Friction\nbody:\n  - type: textarea\n    attributes:\n      label: Description\n'

  /** A repository serving the given files, recording every path it was asked for. */
  function repo(files: Record<string, string>) {
    const asked: string[] = []
    return {
      asked,
      list: async (path: string) =>
        Object.keys(files).filter(
          (file) => file.startsWith(`${path}/`) && !file.slice(path.length + 1).includes('/'),
        ),
      read: async (path: string) => {
        asked.push(path)
        return files[path]
      },
    }
  }

  test('behavior: a named template wins, and costs one read', async () => {
    const { asked, list, read } = repo({
      [`${IssueForm.dir}/bug_report.yml`]: bug,
      [`${IssueForm.dir}/friction.yml`]: friction,
    })

    const form = await IssueForm.find({ list, named: 'bug_report.yml', read })

    expect(form?.name).toBe('Bug')
    expect(asked).toEqual([`${IssueForm.dir}/bug_report.yml`])
  })

  test('behavior: a named template may be a full path', async () => {
    const { list, read } = repo({ 'docs/forms/friction.yml': friction })
    const form = await IssueForm.find({ list, named: 'docs/forms/friction.yml', read })
    expect(form?.name).toBe('Friction')
  })

  test('behavior: falls through a named template that is not there', async () => {
    const { list, read } = repo({ [`${IssueForm.dir}/friction.yml`]: friction })
    const form = await IssueForm.find({ list, named: 'missing.yml', read })
    expect(form?.name).toBe('Friction')
  })

  test('behavior: friction.yml is found without being named', async () => {
    const { list, read } = repo({ [`${IssueForm.dir}/friction.yml`]: friction })
    expect((await IssueForm.find({ list, read }))?.name).toBe('Friction')
  })

  test('behavior: falls back to listing the directory', async () => {
    const { list, read } = repo({ [`${IssueForm.dir}/bug_report.yml`]: bug })
    expect((await IssueForm.find({ list, read }))?.name).toBe('Bug')
  })

  test('behavior: a project with no form resolves to nothing', async () => {
    const { list, read } = repo({ 'README.md': '# hi' })
    expect(await IssueForm.find({ list, read })).toBeUndefined()
  })
})
