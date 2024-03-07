# Contributing

Thanks for your interest in contributing to frog! Please take a moment to review this document **before submitting a pull request.**

If you want to contribute, but aren't sure where to start, you can create a [new discussion](https://github.com/wevm/frog/discussions).

> **Note**
>
> **Please ask first before starting work on any significant new features.**
>
> It's never a fun experience to have your pull request declined after investing time and effort into a new feature. To avoid this from happening, we request that contributors create a [feature request](https://github.com/wevm/frog/discussions/new?category=ideas) to first discuss any API changes or significant new ideas.

<br>

## Basic guide

This guide is intended to help you get started with contributing. By following these steps, you will understand the development process and workflow.

1. [Cloning the repository](#cloning-the-repository)
2. [Installing Node.js and Bun](#installing-nodejs-and-bun)
3. [Installing dependencies](#installing-dependencies)
4. [Running the test suite](#running-the-test-suite)
5. [Writing documentation](#writing-documentation)
6. [Submitting a pull request](#submitting-a-pull-request)
7. [Versioning](#versioning)

---

### Cloning the repository

To start contributing to the project, clone it to your local machine using git:

```bash
git clone https://github.com/wevm/frog.git --recurse-submodules
```

Or the [GitHub CLI](https://cli.github.com):

```bash
gh repo clone wevm/frog -- --recurse-submodules
```

<div align="right">
  <a href="#basic-guide">&uarr; back to top</a></b>
</div>

---

### Installing Node.js and pnpm

wagmi uses [pnpm workspaces](https://pnpm.io/workspaces) to manage multiple projects. You need to install **Node.js v18 or higher** and **pnpm**.

You can run the following commands in your terminal to check your local Node.js and pnpm versions:

```bash
node -v
pnpm -v
```

If the versions are not correct or you don't have Node.js or pnpm installed, download and follow their setup instructions:

- Install Node.js using [fnm](https://github.com/Schniz/fnm) or from the [official website](https://nodejs.org)
- Install [pnpm](https://pnpm.io/installation)

<div align="right">
  <a href="#basic-guide">&uarr; back to top</a></b>
</div>

---

### Installing dependencies

Once in the project's root directory, run the following command to install the project's dependencies:

```bash
pnpm install
```

After the install completes, pnpm links packages across the project for development and [git hooks](https://github.com/toplenboren/simple-git-hooks) are set up.

<div align="right">
  <a href="#basic-guide">&uarr; back to top</a></b>
</div>

---

### Running the test suite

- `pnpm run test` — runs tests in watch mode

Sometimes there may be some tests which fail unexpectedly – you can press `f` to rerun them and they should pass.

When adding new features or fixing bugs, it's important to add test cases to cover the new/updated behavior.

<div align="right">
  <a href="#basic-guide">&uarr; back to top</a></b>
</div>

---

### Writing documentation

Documentation is crucial to helping developers of all experience levels use frog. frog uses [Vocs](https://vocs.dev) and Markdown for the documentation site (located at [`site`](../site)). To start the site in dev mode, run:

```bash
pnpm run docs:dev 
```

Try to keep documentation brief and use plain language so folks of all experience levels can understand. If you think something is unclear or could be explained better, you are welcome to open a pull request.

<div align="right">
  <a href="#basic-guide">&uarr; back to top</a></b>
</div>

---

### Submitting a pull request

When you're ready to submit a pull request, you can follow these naming conventions:

- Pull request titles use the [Imperative Mood](https://en.wikipedia.org/wiki/Imperative_mood) (e.g., `Add something`, `Fix something`).
- [Changesets](#versioning) use past tense verbs (e.g., `Added something`, `Fixed something`).

When you submit a pull request, GitHub will automatically lint, build, and test your changes. If you see an ❌, it's most likely a bug in your code. Please, inspect the logs through the GitHub UI to find the cause.

<div align="right">
  <a href="#basic-guide">&uarr; back to top</a></b>
</div>

---

### Versioning

When adding new features or fixing bugs, we'll need to bump the package versions. We use [Changesets](https://github.com/changesets/changesets) to do this.

> **Note**
>
> Only changes to the codebase that affect the public API or existing behavior (e.g. bugs) need changesets.

Each changeset defines which package(s) should be published and whether the change should be a major/minor/patch release, as well as providing release notes that will be added to the changelog upon release.

To create a new changeset, run `pnpm run changeset`. This will run the Changesets CLI, prompting you for details about the change. You’ll be able to edit the file after it’s created — don’t worry about getting everything perfect up front.

Even though you can technically use any markdown formatting you like, headings should be avoided since each changeset will ultimately be nested within a bullet list. Instead, bold text should be used as section headings.

If your PR is making changes to an area that already has a changeset (e.g. there’s an existing changeset covering theme API changes but you’re making further changes to the same API), you should update the existing changeset in your PR rather than creating a new one.

---

<br>

<div>
  ✅ Now you're ready to contribute to frog!
</div>

<div align="right">
  <a href="#advanced-guide">&uarr; back to top</a></b>
</div>

