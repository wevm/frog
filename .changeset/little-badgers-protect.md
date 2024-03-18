---
"frog": minor
---

Added offline support to Frog Devtools.

Previously, the devtools loaded client-side JS via the JSDelivr secure CDN. Now the devtools have all the require client-side assets bundled into Frog's package distribution.

As a result, to use the devtools, you need to explicitly configure them for your app. This isn't as convenient as them being automatically injected before, but it enables offline support and a future standalone devtools for use with non-Frog frames.

In most cases, configuring the devtools should only take a few minutes. All you need to do is import the `devtools` helper, import a `serveStatic` adapter, and call the `devtools` helper after your frames are set up. For example:

```diff
// Node.js Frog App
import { Frog } from 'frog'
+ import { devtools } from 'frog/dev'
+ import { serveStatic } from 'frog/node'

export const app = new Frog({
+  dev: {
+    enabled: true,
+  },
}) 

app.frame('/', (c) => { ... })

+ devtools(app, { serveStatic }) 
```

#### Node.js/Next.js

```diff
import { Frog } from 'frog'
+ import { devtools } from 'frog/dev'
+ import { serveStatic } from 'frog/node'

export const app = new Frog() 

app.frame('/', (c) => { ... })

+ devtools(app, { serveStatic }) 
```

#### Bun

```diff
import { Frog } from 'frog'
+ import { devtools } from 'frog/dev'
+ import { serveStatic } from 'hono/bun'

const app = new Frog() 

app.frame('/', (c) => { ... })

+ devtools(app, { serveStatic }) 
```

#### Cloudflare Workers

Add `serveStatic` and attach `manifest` and `root`.

```diff
import { Frog } from 'frog'
+ import { devtools } from 'frog/dev'
+ import { serveStatic } from 'hono/cloudflare-workers'

const app = new Frog() 

app.frame('/', (c) => { ... })

+ devtools(app, {
+  serveStatic,
+  serveStaticOptions: {
+    manifest: await import('__STATIC_CONTENT_MANIFEST'),
+    root: './',
+  },
+ }) 
```

You also will want to add the following script to your `package.json` to copy over Frog Devtools' static assets to your Cloudflare Workers' bucket. For example, if your bucket uses the `'./public'` directory.

```diff
{
  "scripts": {
+    "wrangler:static": "cp -r ./node_modules/frog/_lib/ui/ ./public"
  }
}
```

This script is best run before running `wrangler dev` and `wrangler deploy` to make sure you app has the static files for the devtools.

#### Vercel Edge/Serverless Functions

Running `frog vercel-build` will automatically copy Frog Devtools' static assets over to your functions' public directory so no need for `serveStatic` this time. Instead, you can use `assetsPath` or simply omit `devtools` second parameters

```diff
import { Frog } from 'frog'
+ import { devtools } from 'frog/dev'

export const app = new Frog() 

app.frame('/', (c) => { ... })

+ devtools(app, { assetsPath: '/' }) 
```
