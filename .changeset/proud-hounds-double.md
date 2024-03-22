---
"frog": patch
---

Fixed incorrect `origin` propagation in `getFrameContext` that made NGINX reverse-proxy frog setups to have origin set to `127.0.0.1`.
