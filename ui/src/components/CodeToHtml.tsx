import { useEffect, useState } from 'react'
import { createCssVariablesTheme, getHighlighterCore } from 'shiki'
import getWasm from 'shiki/wasm'

type CodeToHtmlProps = {
  code: string
  lang: 'json' | 'html' | 'txt'
}

const cache: Record<string, string> = {}
const highlighter = await getHighlighterCore({
  langs: [import('shiki/langs/html.mjs'), import('shiki/langs/json.mjs')],
  themes: [
    createCssVariablesTheme({
      name: 'css-variables',
      variablePrefix: '--shiki-',
      variableDefaults: {},
      fontStyle: true,
    }),
  ],
  loadWasm: getWasm,
})

export function CodeToHtml(props: CodeToHtmlProps) {
  const { code, lang } = props

  const [codeHtml, setCodeHtml] = useState(
    `<pre class="text-gray-500">${code}</pre>`,
  )

  useEffect(() => {
    if (lang === 'txt')
      return setCodeHtml(`<pre class="text-gray-700">${code}</pre>`)

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
