import { expect, test } from 'vitest'
import { htmlToMetadata } from './htmlToMetadata.js'

const html = `
<!DOCTYPE html>
<html lang="en"><head><meta property="fc:frame" content="vNext"><meta property="fc:frame:image:aspect_ratio" content="1.91:1"><meta property="fc:frame:image" content="https://v-frame-dcjhinvvg-zoo.vercel.app/api/image?image=N4IglgzgohDGCGAHApgExALgC4CcCuyANCFvAOaYipgBuIxiOA9ohJqBFgJ4A2y7IeDzBkAdgEksyALZsMIWMlFSc9EACN4sANZlmeUennqeW7Ws069TA6gDKYAF795ARgAM7gKQACD97VqCERTLkoAMz4ADzVI5CiAETAcZFgsMCZRSlgmHjxpLOI4qIB1HCRKUSYAd3LENQALZBEGrEp-LzUAKzxOMHCuAGFMqWVspRU1KSisAEFhMXHlZFViarBULAb2z06AXz3iWAawHlQUrIwAbVBIGAQUI1wCYlIKeWo6BmZWAU5eFygHI8JiqeTVE5SWIjBzOTAANncRRh3D4lVB0iEaj4WBUdkQWjAoneIAAtO4AHTuABMAFYZNiicgABLNMitTCuCkAFmImJwZCJABUWJgAMxIkAE1DUYmUdx%252BanuRAxNaQ5D4rQuKUpUm1CoHI4nM4XTBXEAlZA8HLSZAAQhAAF09s6gA"><meta property="og:image" content="https://v-frame-dcjhinvvg-zoo.vercel.app/api/image?image=N4IglgzgohDGCGAHApgExALgC4CcCuyANCFvAOaYipgBuIxiOA9ohJqBFgJ4A2y7IeDzBkAdgEksyALZsMIWMlFSc9EACN4sANZlmeUennqeW7Ws069TA6gDKYAF795ARgAM7gKQACD97VqCERTLkoAMz4ADzVI5CiAETAcZFgsMCZRSlgmHjxpLOI4qIB1HCRKUSYAd3LENQALZBEGrEp-LzUAKzxOMHCuAGFMqWVspRU1KSisAEFhMXHlZFViarBULAb2z06AXz3iWAawHlQUrIwAbVBIGAQUI1wCYlIKeWo6BmZWAU5eFygHI8JiqeTVE5SWIjBzOTAANncRRh3D4lVB0iEaj4WBUdkQWjAoneIAAtO4AHTuABMAFYZNiicgABLNMitTCuCkAFmImJwZCJABUWJgAMxIkAE1DUYmUdx%252BanuRAxNaQ5D4rQuKUpUm1CoHI4nM4XTBXEAlZA8HLSZAAQhAAF09s6gA"><meta property="og:title" content="Frog Frame"><meta property="fc:frame:post_url" content="https://v-frame-dcjhinvvg-zoo.vercel.app/api?initialPath=%252Fapi&previousButtonValues=%2523A_apples%252Coranges%252Cbananas"><meta property="fc:frame:input:text" content="Enter custom fruit..."><meta property="fc:frame:button:1" content="Apples" data-value="apples"><meta property="fc:frame:button:1:action" content="post"><meta property="fc:frame:button:2" content="Oranges" data-value="oranges"><meta property="fc:frame:button:2:action" content="post"><meta property="fc:frame:button:3" content="Bananas" data-value="bananas"><meta property="fc:frame:button:3:action" content="post"><meta property="frog:context" content="%7B%22cycle%22%3A%22main%22%2C%22env%22%3A%7B%7D%2C%22initialPath%22%3A%22%2Fapi%22%2C%22status%22%3A%22initial%22%2C%22url%22%3A%22https%3A%2F%2Fv-frame-dcjhinvvg-zoo.vercel.app%2Fapi%22%2C%22var%22%3A%7B%7D%2C%22verified%22%3Afalse%7D"><meta property="frog:version" content="0.5.5-tmm-hono-jsx.20240309T190523"></head><body style="align-items:center;display:flex;justify-content:center;min-height:100vh;overflow:hidden"><a style="text-decoration:none" href="https://v-frame-dcjhinvvg-zoo.vercel.app/api/dev">open 𝒇𝒓𝒂𝒎𝒆 devtools</a></body></html>
`

test('default', () => {
  const res = htmlToMetadata(html)
  expect(res).toMatchInlineSnapshot(`
    {
      "context": {
        "cycle": "main",
        "env": {},
        "initialPath": "/api",
        "status": "initial",
        "url": "https://v-frame-dcjhinvvg-zoo.vercel.app/api",
        "var": {},
        "verified": false,
      },
      "frame": {
        "buttons": [
          {
            "index": 1,
            "postUrl": undefined,
            "target": undefined,
            "title": "Apples",
            "type": "post",
          },
          {
            "index": 2,
            "postUrl": undefined,
            "target": undefined,
            "title": "Oranges",
            "type": "post",
          },
          {
            "index": 3,
            "postUrl": undefined,
            "target": undefined,
            "title": "Bananas",
            "type": "post",
          },
        ],
        "debug": {
          "htmlTags": [
            "<meta property="fc:frame" content="vNext"/>",
            "<meta property="fc:frame:image:aspect_ratio" content="1.91:1"/>",
            "<meta property="fc:frame:image" content="_frog_fc:frame:image"/>",
            "<meta property="og:image" content="_frog_og:image"/>",
            "<meta property="og:title" content="Frog Frame"/>",
            "<meta property="fc:frame:post_url" content="_frog_fc:frame:post_url"/>",
            "<meta property="fc:frame:input:text" content="Enter custom fruit..."/>",
            "<meta property="fc:frame:button:1" content="Apples" data-value="apples"/>",
            "<meta property="fc:frame:button:1:action" content="post"/>",
            "<meta property="fc:frame:button:2" content="Oranges" data-value="oranges"/>",
            "<meta property="fc:frame:button:2:action" content="post"/>",
            "<meta property="fc:frame:button:3" content="Bananas" data-value="bananas"/>",
            "<meta property="fc:frame:button:3:action" content="post"/>",
            "<meta property="frog:context" content="%7B%22cycle%22%3A%22main%22%2C%22env%22%3A%7B%7D%2C%22initialPath%22%3A%22%2Fapi%22%2C%22status%22%3A%22initial%22%2C%22url%22%3A%22https%3A%2F%2Fv-frame-dcjhinvvg-zoo.vercel.app%2Fapi%22%2C%22var%22%3A%7B%7D%2C%22verified%22%3Afalse%7D"/>",
            "<meta property="frog:version" content="0.5.5-tmm-hono-jsx.20240309T190523"/>",
          ],
        },
        "image": "https://v-frame-dcjhinvvg-zoo.vercel.app/api/image?image=N4IglgzgohDGCGAHApgExALgC4CcCuyANCFvAOaYipgBuIxiOA9ohJqBFgJ4A2y7IeDzBkAdgEksyALZsMIWMlFSc9EACN4sANZlmeUennqeW7Ws069TA6gDKYAF795ARgAM7gKQACD97VqCERTLkoAMz4ADzVI5CiAETAcZFgsMCZRSlgmHjxpLOI4qIB1HCRKUSYAd3LENQALZBEGrEp-LzUAKzxOMHCuAGFMqWVspRU1KSisAEFhMXHlZFViarBULAb2z06AXz3iWAawHlQUrIwAbVBIGAQUI1wCYlIKeWo6BmZWAU5eFygHI8JiqeTVE5SWIjBzOTAANncRRh3D4lVB0iEaj4WBUdkQWjAoneIAAtO4AHTuABMAFYZNiicgABLNMitTCuCkAFmImJwZCJABUWJgAMxIkAE1DUYmUdx%252BanuRAxNaQ5D4rQuKUpUm1CoHI4nM4XTBXEAlZA8HLSZAAQhAAF09s6gA",
        "imageAspectRatio": "1.91:1",
        "imageUrl": "https://v-frame-dcjhinvvg-zoo.vercel.app/api/image?image=N4IglgzgohDGCGAHApgExALgC4CcCuyANCFvAOaYipgBuIxiOA9ohJqBFgJ4A2y7IeDzBkAdgEksyALZsMIWMlFSc9EACN4sANZlmeUennqeW7Ws069TA6gDKYAF795ARgAM7gKQACD97VqCERTLkoAMz4ADzVI5CiAETAcZFgsMCZRSlgmHjxpLOI4qIB1HCRKUSYAd3LENQALZBEGrEp-LzUAKzxOMHCuAGFMqWVspRU1KSisAEFhMXHlZFViarBULAb2z06AXz3iWAawHlQUrIwAbVBIGAQUI1wCYlIKeWo6BmZWAU5eFygHI8JiqeTVE5SWIjBzOTAANncRRh3D4lVB0iEaj4WBUdkQWjAoneIAAtO4AHTuABMAFYZNiicgABLNMitTCuCkAFmImJwZCJABUWJgAMxIkAE1DUYmUdx%252BanuRAxNaQ5D4rQuKUpUm1CoHI4nM4XTBXEAlZA8HLSZAAQhAAF09s6gA",
        "input": {
          "text": "Enter custom fruit...",
        },
        "postUrl": "https://v-frame-dcjhinvvg-zoo.vercel.app/api?initialPath=%252Fapi&previousButtonValues=%2523A_apples%252Coranges%252Cbananas",
        "state": undefined,
        "title": "Frog Frame",
        "version": "vNext",
      },
      "properties": [
        {
          "content": "vNext",
          "property": "fc:frame",
        },
        {
          "content": "1.91:1",
          "property": "fc:frame:image:aspect_ratio",
        },
        {
          "content": "https://v-frame-dcjhinvvg-zoo.vercel.app/api/image?image=N4IglgzgohDGCGAHApgExALgC4CcCuyANCFvAOaYipgBuIxiOA9ohJqBFgJ4A2y7IeDzBkAdgEksyALZsMIWMlFSc9EACN4sANZlmeUennqeW7Ws069TA6gDKYAF795ARgAM7gKQACD97VqCERTLkoAMz4ADzVI5CiAETAcZFgsMCZRSlgmHjxpLOI4qIB1HCRKUSYAd3LENQALZBEGrEp-LzUAKzxOMHCuAGFMqWVspRU1KSisAEFhMXHlZFViarBULAb2z06AXz3iWAawHlQUrIwAbVBIGAQUI1wCYlIKeWo6BmZWAU5eFygHI8JiqeTVE5SWIjBzOTAANncRRh3D4lVB0iEaj4WBUdkQWjAoneIAAtO4AHTuABMAFYZNiicgABLNMitTCuCkAFmImJwZCJABUWJgAMxIkAE1DUYmUdx%252BanuRAxNaQ5D4rQuKUpUm1CoHI4nM4XTBXEAlZA8HLSZAAQhAAF09s6gA",
          "property": "fc:frame:image",
        },
        {
          "content": "https://v-frame-dcjhinvvg-zoo.vercel.app/api/image?image=N4IglgzgohDGCGAHApgExALgC4CcCuyANCFvAOaYipgBuIxiOA9ohJqBFgJ4A2y7IeDzBkAdgEksyALZsMIWMlFSc9EACN4sANZlmeUennqeW7Ws069TA6gDKYAF795ARgAM7gKQACD97VqCERTLkoAMz4ADzVI5CiAETAcZFgsMCZRSlgmHjxpLOI4qIB1HCRKUSYAd3LENQALZBEGrEp-LzUAKzxOMHCuAGFMqWVspRU1KSisAEFhMXHlZFViarBULAb2z06AXz3iWAawHlQUrIwAbVBIGAQUI1wCYlIKeWo6BmZWAU5eFygHI8JiqeTVE5SWIjBzOTAANncRRh3D4lVB0iEaj4WBUdkQWjAoneIAAtO4AHTuABMAFYZNiicgABLNMitTCuCkAFmImJwZCJABUWJgAMxIkAE1DUYmUdx%252BanuRAxNaQ5D4rQuKUpUm1CoHI4nM4XTBXEAlZA8HLSZAAQhAAF09s6gA",
          "property": "og:image",
        },
        {
          "content": "Frog Frame",
          "property": "og:title",
        },
        {
          "content": "https://v-frame-dcjhinvvg-zoo.vercel.app/api?initialPath=%252Fapi&previousButtonValues=%2523A_apples%252Coranges%252Cbananas",
          "property": "fc:frame:post_url",
        },
        {
          "content": "Enter custom fruit...",
          "property": "fc:frame:input:text",
        },
        {
          "content": "Apples",
          "property": "fc:frame:button:1",
        },
        {
          "content": "post",
          "property": "fc:frame:button:1:action",
        },
        {
          "content": "Oranges",
          "property": "fc:frame:button:2",
        },
        {
          "content": "post",
          "property": "fc:frame:button:2:action",
        },
        {
          "content": "Bananas",
          "property": "fc:frame:button:3",
        },
        {
          "content": "post",
          "property": "fc:frame:button:3:action",
        },
        {
          "content": "%7B%22cycle%22%3A%22main%22%2C%22env%22%3A%7B%7D%2C%22initialPath%22%3A%22%2Fapi%22%2C%22status%22%3A%22initial%22%2C%22url%22%3A%22https%3A%2F%2Fv-frame-dcjhinvvg-zoo.vercel.app%2Fapi%22%2C%22var%22%3A%7B%7D%2C%22verified%22%3Afalse%7D",
          "property": "frog:context",
        },
        {
          "content": "0.5.5-tmm-hono-jsx.20240309T190523",
          "property": "frog:version",
        },
      ],
    }
  `)
})
