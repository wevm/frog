/** @jsx jsx */
/** @jsxImportSource hono/jsx */
/** @jsxFrag */

import { Button, Framework } from "@wevm/framework";

const app = new Framework();

app.frame("/", () => {
  return {
    image: <div>hello</div>,
    intents: (
      <>
        <Button>Apples</Button>
        <Button>Oranges</Button>
      </>
    ),
  };
});

export default {
  port: 3001,
  fetch: app.fetch,
};
