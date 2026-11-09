# Writing a code widget

A code widget is a widget package with your own JavaScript in it. InfoPanel Studio runs it in the studio and on every kiosk that
shows it, with the same access as a built-in widget, so it only ever runs when it is signed by a key the user trusts. This page is
for authors: how to build one, sign it, and get it onto a screen.

If you can build what you want from Studio's own blocks, make a recipe instead (the Widgets page's **New widget**). A recipe needs
no code, no key and no trust.

## What a package is

A folder (or a `.zip` of it) with:

- `manifest.json`: `format`, `kind: "code"`, `id`, `version`, `author`, `name`, `publisher`, `entry: "widget.js"`, `files` (every
  other file with its size and SHA-256) and `signature`;
- `widget.js`: one ES module, your bundle;
- `images/<name>.png|jpg|webp`, if you need any.

The id is `ext:<publisher>.<name>`: lowercase letters, digits and hyphens, a publisher of up to 32 characters and a name of up
to 48. A package is at most 512 KB, a file at most 256 KB.

## The bundle's contract

`widget.js`'s default export is a function. Studio calls it with its SDK and expects a widget definition back:

```js
export default function widget(sdk) {
  const h = sdk.React.createElement;
  return sdk.defineWidget({
    name: "CPU ring",
    reads: ["libre."],
    defaultSize: [2, 2],
    settings: [{ type: "text", key: "label", label: "Label", default: "CPU" }],
    render: ({ sensors, settings }) => h(sdk.Ring, { value: sensors["libre.cpu_total"]?.value ?? 0 }, String(settings.label)),
  });
}
```

- Your bundle carries no React of its own. Use `sdk.React` (`createElement`, `Fragment`, `useState`, `useEffect`, `useMemo`,
  `useRef`), so hooks and the theme work. With JSX, compile it to `h` (see below).
- `reads` lists the sensor key prefixes you need (at most 16); `render` gets the readings under them and the option values.
- `settings` are the options people change in the studio's Content tab: `boolean`, `number`, `text` or `select`, at most 16.
- Studio draws the card around `render` (title, theme, pack), as for a built-in widget. The SDK's `Ring`, `Num`, `Bar`, `Icon`
  and `Empty` draw in the theme's look; `sdk.format(reading)` writes a reading with its unit.

Studio checks what your function returns before it registers anything: a wrong shape, or a function that throws, draws "Widget
not available" with the reason. If `render` throws while it draws, only your widget's zone shows the error.

The types are a download: the Widgets page's **Widget SDK types (.d.ts)** link, `infopanel-widget-sdk.d.ts`. Import from
`infopanel-studio/widget-sdk`; your editor needs `@types/react` for the React types it names.

## Building

Any bundler that writes one ES module will do. With esbuild:

```
npx esbuild src/widget.jsx --bundle --format=esm --jsx=transform --jsx-factory=h --outfile=my-widget/widget.js
```

Keep React out of the bundle: with the classic JSX transform and `h` taken from `sdk.React.createElement`, nothing imports it.
The repo's example, `tests/fixtures/widgets/example/` (`widget.jsx` and `build.mjs`), is built this way.

## Signing

A code widget must be signed with a minisign key (Ed25519). The signature covers the manifest, and so every file's hash.

1. Make your key once, and keep the secret half to yourself:
   ```
   minisign -G -p my-widgets.pub -s my-widgets.key
   ```
2. Write `manifest.json` without `files` and `signature`, then sign the folder:
   ```
   node tools/widgets/sign.mjs my-widget --key my-widgets.key --password-env MINISIGN_PASSWORD
   ```
   It lists the files with their hashes and adds the signature. Sign again after any change: one changed byte refuses the package.

## The publisher rule

A key signs only for the publisher names it holds. When a user trusts your key they give it your publisher names (Settings ›
Widget publishers), and from then on that key signs `ext:<those names>.*` and nothing else. So pick your publisher name once and
keep it. The names `infopanel` and `infopanel-studio` are the owner's and `themely` is Themely's: no other key can hold them.

An installed signed package is replaced only by a package signed with the same key; anything else is refused until the old one
is removed.

## How it reaches a screen

1. The user adds your public key in **Settings › Widget publishers** (the desktop app's Settings window), with your publisher
   names. This is the only place a key is trusted: never an import, never a prompt, never the Widgets page.
2. They import your `.zip` on the Widgets page. The server checks the signature on import and again on every read.
3. It shows under Imported with "Signed by <name> · not reviewed" in amber, and can be added to a screen. Kiosks on other devices
   that show that screen run it too.

The user can turn one widget off (**Turn this widget off**) or every code widget (**Third-party code widgets**); both are kept by
the server, so every screen obeys them. The server's own `USER_CODE_WIDGETS=off` does the same and cannot be undone from the page.

## The owner's key

Widgets signed with the owner's key show "Signed by InfoPanel Studio · reviewed". That key is the owner's alone and is not the
updater's key; setting it up is a one-time owner step, described in [security.md](security.md) under "Widget publisher keys".
