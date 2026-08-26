# Time To Die — Production Contract

## One live source

- `main` is the only production branch.
- A commit, PR merge, or CI syntax pass is **not** proof that the online game is updated.
- Production is considered updated only when the Firebase deploy workflow verifies that `/build.json` on `ttd-online-b8c0f.web.app` contains the exact GitHub commit SHA being deployed.
- All production deploys share one concurrency group so an older deployment cannot finish after and overwrite a newer one.
- Ordinary/intermediate commits to `main` do **not** auto-deploy. Automatic production deployment requires one deliberate commit whose message begins with `[release]`.
- Multi-file work must be assembled and validated before the `[release]` commit is created.
- The production workflow has read-only repository contents permission. It must never commit, push, rewrite, materialize, reconstruct, or repair game source or assets.
- The commit selected for deployment is the commit that must reach Hosting. Validation may reject that commit, but it may not create a replacement commit.

## Game art and audio

- `assets/game-assets.json` is the registration and usage authority for game assets.
- `assets/immutable-assets.lock.json` locks every registered PNG, MP3, and SVG master byte-for-byte.
- Runtime rendering and playback must use the exact registered file. Do not redraw, trace, approximate, rasterize, transcode, trim, pad, repair, or substitute an approved asset unless explicitly replaced as a deliberate source change.
- Registered SVG game assets must remain pure vector. `<image>` elements and embedded `data:image` raster content are forbidden.
- Runtime code must not silently unwrap, repair, or substitute an invalid registered asset. Invalid art must fail release checks instead of degrading into another representation.
- ViewBox, render box, anchor, and rotation come from the asset contract rather than being guessed independently in rendering code.
- Runtime asset URLs use the build-token helper and Firebase serves active-development game assets with `no-store`, so successful releases cannot keep an older cached SVG/image.
- New approved art/audio enters the repository explicitly, is registered in the manifest, and is locked in the same reviewed source change. Deployment never imports it from an external staging authority.

## Release rule

The deployable client checks must pass before Hosting deploys, and validation must leave tracked source completely unchanged. Release-integrity checks fail closed if production branch rules, deliberate `[release]` gating, exact-SHA deployment, read-only repository permissions, clean-source enforcement, caching protections, pure-vector SVG requirements, registered-asset rules, or immutable master hashes are removed.
