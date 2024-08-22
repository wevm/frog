---
"frog": minor
---

**Breaking Change**: `parent` and `channelKey` are deprecated in `ComposerActionMessage`

```diff
import { postComposerActionMessage } from 'frog/next'

postComposerActionMessage({
  type: "createCast",
  data: {
    cast: {
      embeds: [/*...*/];
      text: 'Hi';
-     parent: '0x...'
-     channelKey: '...'
    };
  };
})
```

```diff
import { postComposerCreateCastActionMessage } from 'frog/next'

postComposerCreateCastActionMessage({
  embeds: [/*...*/];
  text: 'Hi';
- parent: '0x...'
- channelKey: '...'
})
```

[See More](https://warpcast.com/horsefacts.eth/0x98185a2f).
