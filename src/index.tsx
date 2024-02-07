import { type Context, Hono } from "hono";
import { ImageResponse } from "hono-og";
import { type JSXNode } from "hono/jsx";

type FrameContext = Context & {
  trustedData?: { messageBytes: string };
  untrustedData?: {
    fid: number;
    url: string;
    messageHash: string;
    timestamp: number;
    network: number;
    buttonIndex?: 1 | 2 | 3 | 4;
    castId: { fid: number; hash: string };
    inputText?: string;
  };
};

type FrameReturnType = {
  image: JSX.Element;
  intents: JSX.Element;
};

export class Framework extends Hono {
  frame(
    path: string,
    handler: (c: FrameContext) => FrameReturnType | Promise<FrameReturnType>,
  ) {
    this.get(path, async (c) => {
      const { intents } = await handler(c);
      return c.render(
        <html lang="en">
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content={`${c.req.url}_og`} />
            <meta property="og:image" content={`${c.req.url}_og`} />
            <meta property="fc:frame:post_url" content={c.req.url} />
            {parseIntents(intents)}
          </head>
        </html>,
      );
    });

    // TODO: don't slice
    this.get(`${path.slice(1)}_og`, async (c) => {
      const { image } = await handler(c);
      return new ImageResponse(image);
    });

    this.post(path, async (c) => {
      const context = await parsePostContext(c);
      const { intents } = await handler(context);
      return c.render(
        <html lang="en">
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content={`${c.req.url}_og`} />
            <meta property="og:image" content={`${c.req.url}_og`} />
            <meta property="fc:frame:post_url" content={c.req.url} />
            {parseIntents(intents)}
          </head>
        </html>,
      );
    });
  }
}

////////////////////////////////////////////////////////////////////////
// Components

export type ButtonProps = {
  children: string;
};

export function Button({ children }: ButtonProps) {
  return <meta property="fc:frame:button" content={children} />;
}

////////////////////////////////////////////////////////////////////////
// Utilities

type Counter = { button: number };

async function parsePostContext(ctx: Context): Promise<FrameContext> {
  const { trustedData, untrustedData } =
    (await ctx.req.json().catch(() => {})) || {};
  return Object.assign(ctx, { trustedData, untrustedData });
}

function parseIntents(intents_: JSX.Element) {
  const intents = intents_ as unknown as JSXNode;
  const counter: Counter = {
    button: 0,
  };

  if (typeof intents.children[0] === "object")
    return Object.assign(intents, {
      children: intents.children.map((e) => parseIntent(e as JSXNode, counter)),
    });
  return parseIntent(intents, counter);
}

function parseIntent(node: JSXNode, counter: Counter) {
  const intent = (
    typeof node.tag === "function" ? node.tag({}) : node
  ) as JSXNode;

  const props = intent.props || {};

  if (props.property === "fc:frame:button") {
    props.property = `fc:frame:button:${counter.button++}`;
    props.content = node.children;
  }

  return Object.assign(intent, { props });
}
