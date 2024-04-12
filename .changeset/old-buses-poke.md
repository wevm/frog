---
"frog": minor
---

Deprecated the Cast Actions Deeplink V1 format in favor of V2. [See more](https://warpcast.notion.site/Spec-Farcaster-Actions-84d5a85d479a43139ea883f6823d8caa).

Breaking changes have affected `Button.AddCastAction` and `.castAction` handler:
- `Button.AddCastAction` now only accepts `action` property;
- `.castAction` handler now requries a third parameter (`options`) to be set. Properties that were removed from `Button.AddCastAction` have migrated here, and `aboutUrl` and `description` were added along.
