export function Scripts() {
  return (
    <>
      {/* Alpine Plugins */}
      {/* TODO: Vendor into project */}
      <script
        defer
        src="https://cdn.jsdelivr.net/npm/@alpinejs/focus@3.x.x/dist/cdn.min.js"
      />
      <script
        defer
        src="https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.x.x/dist/cdn.min.js"
      />

      {/* Alpine Core */}
      <script
        defer
        src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
      />

      <script src="https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js" />
    </>
  )
}
