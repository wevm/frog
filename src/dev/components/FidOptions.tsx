export function FidOptions() {
  return (
    <div class="border bg-background-100 rounded-md px-4 pb-4 pt-3 flex flex-col gap-3">
      <div class="flex flex-col gap-0.5">
        <div
          class="text-xs text-gray-700"
          style={{ fontSize: '0.65rem', paddingLeft: '0.25rem' }}
        >
          User
        </div>

        <input
          autocomplete="off"
          class="bg-background-200 rounded-md border px-3 py-2 text-sm leading-snug w-full text-xs"
          name="inputText"
          type="text"
          placeholder="FID"
          x-model="inputText"
        />
      </div>

      <div class="flex flex-col gap-0.5">
        <div
          class="text-xs text-gray-700"
          style={{ fontSize: '0.65rem', paddingLeft: '0.25rem' }}
        >
          Cast
        </div>

        <div class="bg-background-200 border rounded-md divide-y">
          <input
            autocomplete="off"
            class="bg-transparent px-3 py-2 text-sm leading-snug w-full text-xs rounded-t-md"
            name="inputText"
            type="text"
            placeholder="FID"
            x-model="inputText"
          />

          <input
            autocomplete="off"
            class="bg-transparent px-3 py-2 text-sm leading-snug w-full text-xs rounded-b-md"
            name="inputText"
            type="text"
            placeholder="Hash"
            x-model="inputText"
          />
        </div>
      </div>
    </div>
  )
}
