# Releasing Vimium Taiko

Each release on GitHub carries a Chrome zip and a signed Firefox `.xpi`, so that users don't need to
build anything.

1. Raise `version` in `manifest.json`. Firefox won't sign the same version twice.
1. Build the packages. This needs [Deno](https://deno.com).

   ```sh
   ./make.js package
   ```

   This writes `dist/chrome-store/vimium-taiko-chrome-store-<version>.zip` and
   `dist/firefox/vimium-taiko-firefox-<version>.zip`.

1. Get the Firefox package signed by Mozilla, without listing it on addons.mozilla.org. Create API
   credentials at <https://addons.mozilla.org/developers/addon/api/key/>, then:

   ```sh
   cd dist/firefox && unzip -q vimium-taiko-firefox-*.zip -d build
   npx web-ext sign --source-dir build --channel unlisted --api-key <key> --api-secret <secret>
   ```

   The signed `.xpi` is written to `web-ext-artifacts/`. Rename it to `vimium-taiko-<version>.xpi`.

1. Create a GitHub release for the tag `v<version>`, and attach the Chrome zip and the signed
   `.xpi`.
