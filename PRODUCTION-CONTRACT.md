# Time To Die — Production Contract

## One live source

- `main` is the only production branch.
- A commit, PR merge, or CI syntax pass is **not** proof that the online game is updated.
- Production is considered updated only when the Firebase deploy workflow verifies that `/build.json` on `ttd-online-b8c0f.web.app` contains the exact GitHub commit SHA being deployed.
- All production deploys share one concurrency group so an older deployment cannot finish after and overwrite a newer one.
- Ordinary/intermediate commits to `main` do **not** auto-deploy. Automatic production deployment requires one deliberate commit whose message begins with `[release]`.
- Multi-file work must be assembled and validated before the `[release]` commit is created.

## Game art

- `assets/game-assets.json` is the source of truth for registered game art.
- Runtime rendering must use the exact registered file. Do not redraw, trace, approximate, rasterize, or substitute an asset unless explicitly requested.
- ViewBox, render box, anchor, and rotation come from the asset contract rather than being guessed independently in rendering code.
- Runtime asset URLs use the build-token helper and Firebase serves active-development game assets with `no-store`, so successful releases cannot keep an older cached SVG/image.
- New user-provided art must be registered in the asset manifest before it is wired into gameplay.

## Release rule

`npm run check` must pass before Hosting deploys. The release-integrity checks fail closed if production branch rules, live-build verification, caching protections, or registered-asset rules are removed.
