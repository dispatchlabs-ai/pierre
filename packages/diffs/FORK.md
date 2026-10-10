# Dispatch Pierre Diffs fork

Maintainer: Dispatch Labs AI. Source: https://github.com/dispatchlabs-ai/pierre
Branch: `dispatch-editor`. Upstream history is retained.

## Baseline and changes

Upstream `diffs-v1.5.1`, commit `8f360ae1b39fcbbdaccacbcd8dbbf94fb10a3c38`. This
fork builds only `packages/diffs`; unchanged `@pierre/theme` 2.0.0 and
`@pierre/theming` 1.0.1 remain upstream dependencies. Apache-2.0 `LICENSE.md` is
retained and `NOTICE` records modifications. No upstream PR has been filed.

- Package name `@dispatchlabs/pierre-diffs`, first version `1.5.1-dispatch.1`.
  Dispatch installs this as `@pierre/diffs` to retain all React/worker paths.
- Marker messages accept literal strings or host-owned HTMLElements, not
  `{html}`. Strings use textContent; neither marker path assigns innerHTML.
  Host-provided elements remain the caller's trust boundary.
- `EditorOptions.ariaLabel` controls the textbox name; filename is the fallback.
- `EditorOptions.spellcheck` defaults false. Automatic correction,
  capitalization and writing suggestions stay disabled. Dispatch enables
  spelling for prose.
- `EditorOptions.tabBehavior` defaults `focus`; `indent` restores upstream Tab
  commands. Both Tab and Shift+Tab otherwise follow native focus navigation.
- `insertReplacementText` uses the event's in-editor target range and the normal
  document transaction with an explicit undo boundary. Plain replacement text is
  read from `data` or the contenteditable `dataTransfer` payload.
  Missing/foreign ranges or missing replacement data are ignored rather than
  replacing the caret.

No repository access, saving, project semantics or Markdown serialization lives
in this package. `editStateKey` retains dormant sessions in memory only, not
persisted drafts; never treat it as durable recovery or share keys across
mounts.

## Build and release

Normal upstream tooling: `proto use`, `pnpm install --frozen-lockfile`,
`RAYON_NUM_THREADS=1 moon run diffs:build`. Use the pins in `.prototools`,
without global installs. Pack with pinned pnpm; it rewrites `catalog:`
dependencies. Upstream theme dependencies are intentionally fixed registry
versions, not fork builds. Set `RAYON_NUM_THREADS=1` for builds: parallel
Rolldown traversal can emit React external imports in nondeterministic order.
Inspect the packed manifest, React and both worker exports and Apache notices.

For the October 10 environment only, both pnpm 10.30.3 and pinned 11.9.0 fail
inside their tarball downloader (`Cannot destructure property 'verified'`). A
separate locked build-tools profile under `tools/dispatch-build` permits a fresh
checkout to build the same tsdown config with Node 24.21.0. This is a
materialization workaround, not permission to change the workspace lock:

```
npm ci --ignore-scripts --prefix tools/dispatch-build
ln -s tools/dispatch-build/node_modules node_modules
ln -s ../../tools/dispatch-build/node_modules packages/diffs/node_modules
(cd packages/diffs && RAYON_NUM_THREADS=1 ../../node_modules/.bin/tsdown)
(cd packages/diffs && ../../node_modules/.bin/pnpm pack --out "$PWD/pierre-diffs.tgz")
```

Use a fresh checkout without existing node_modules for these commands. The
profile locks build/runtime dependencies and native platform compiler packages;
no global tooling, tests or package publishing are involved. This fallback has
build-only dependency advisories from upstream-pinned tooling; it is not shipped
as an application dependency.

Commit source/provenance before tagging `dispatch-diffs-v<version>`. Release the
packed tarball as an immutable GitHub release asset; Dispatch consumes its
public HTTPS release URL, pinned by npm lockfile integrity and source tag. Nix
caches the release URL using its npm dependency hash; its fetchNpmDeps does not
support local file: tarballs. Dispatch records provenance in
`packages/web/docs/pierre-fork.md`. Do not publish under the upstream npm name.
Registry publication is deferred. Rebuild twice from the locked profile and
compare the packed artifacts before shipping; record their checksum in
Dispatch's vendor README. Any change requires a new version/tag rather than
replacing an asset already consumed by Dispatch.

Upstream resync: fetch upstream, review changes from this baseline, replay the
small patches, inspect all HTML sinks and input/history paths, repeat type/build
and packing checks, then qualify the behaviors below before a new release. Never
automatically update Dispatch's dependency or its lockfile.

## Evidence and qualification

Security compared three sourcemap-embedded sources (`File.ts`, `marker.ts`,
`FileRenderer.ts`) byte-for-byte with baseline `8f360ae`; scoped static HAST
review found source/header/count/gutter text escaped. This establishes source
correspondence only, not emitted-code or whole-package integrity. No current
Dispatch viewer exploit was demonstrated; marker removal hardens an unused API.
A main-document CSP is Dispatch's responsibility, not supplied by this fork.

Release gates not yet qualified by execution: source/newline/trailing-newline
fidelity through typing/paste/correction, undo/redo, selection, preview/resize
continuity, read-only copy, Tab/Shift+Tab, screen-reader labels, IME and mobile
virtual keyboards, and hostile content/file names/marker strings remaining
literal text without executable nodes, attributes or javascript URLs. Security's
standing adversarial fixtures (`File.escaping.test.ts` and marker popover text)
are retained in the fork, including the correction that waits for highlighter
payload text rather than an initial empty pre element. Security executed the
isolated jsdom marker/escaping checks on its own fork copy and reported them
passing. That is scoped evidence, not an execution check of this packaged
artifact or integrated application. No tests or browser suite were run for this
initial artifact. Build success is not proof these flows work.
