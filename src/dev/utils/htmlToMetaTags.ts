import { Window } from 'happy-dom'

export function htmlToMetaTags(html: string, selector: string) {
  const window = new Window()
  window.document.write(html)
  const document = window.document
  return document.querySelectorAll(
    selector,
  ) as unknown as readonly HTMLMetaElement[]
}
