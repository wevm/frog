import { createCssVariablesTheme, getHighlighter } from 'shiki'

export async function getCodeHtml(code: string, lang: 'html' | 'json') {
  const theme = createCssVariablesTheme({
    name: 'css-variables',
    variablePrefix: '--shiki-',
    variableDefaults: {},
    fontStyle: true,
  })

  const highlighter = await getHighlighter({
    langs: ['html', 'json'],
    themes: [theme],
  })

  return highlighter.codeToHtml(code, {
    lang,
    theme: 'css-variables',
  })
}
