import { useEffect, useState } from 'hono/jsx/dom'
import { createCssVariablesTheme, getHighlighter } from 'shiki'

type CodeToHtmlProps = {
  code: string
  lang: 'json' | 'html'
}

const cache: Record<string, string> = {}
const highlighter = await getHighlighter({
  langs: ['html', 'json'],
  themes: [
    createCssVariablesTheme({
      name: 'css-variables',
      variablePrefix: '--shiki-',
      variableDefaults: {},
      fontStyle: true,
    }),
  ],
})

export function CodeToHtml(props: CodeToHtmlProps) {
  const { code, lang } = props

  const [codeHtml, setCodeHtml] = useState(
    `<pre class="text-gray-500">${code}</pre>`,
  )

  useEffect(() => {
    const key = `${lang}_${code}`
    if (cache[key]) setCodeHtml(cache[key])
    else {
      const html = highlighter.codeToHtml(code, {
        lang,
        theme: 'css-variables',
      })
      cache[key] = html
      setCodeHtml(html)
    }
  }, [code, lang])

  // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
  return <div dangerouslySetInnerHTML={{ __html: codeHtml }} />
}
