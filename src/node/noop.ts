// Export noop for other environments, like Cloudflare Workers

export function serveStatic() {
  return () => {}
}
