export function Scripts() {
  return (
    <>
      {/* TODO: Vendor into project */}
      {/* Do not change order script are loaded in */}
      <script
        defer
        src="https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js"
      />
      {/* Alpine Plugins */}
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
    </>
  )
}
