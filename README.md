# Vimium Taiko

A fork of [Vimium](https://github.com/philc/vimium) that adds **taiko hints**: follow links by
typing a drum pattern of "don" and "ka", in the style of Taiko no Tatsujin. Everything else is
Vimium. Taiko hints take Vimium's link hint keys.

## Installation

Vimium Taiko replaces Vimium. If you have Vimium installed, turn it off first, or both will react to
every key.

Download the files from the [latest release](../../releases/latest).

**Chrome, Edge and Brave**

1. Download `vimium-taiko-chrome-store-<version>.zip` and unzip it.
1. Open `chrome://extensions` (`edge://extensions` on Edge, `brave://extensions` on Brave).
1. Turn on "Developer mode".
1. Click "Load unpacked" and choose the unzipped folder.

The browser loads the extension from that folder, so keep it where it is. To update, unzip the new
version into the same folder and click the reload button on the extension's card.

**Firefox**

1. Download `vimium-taiko-<version>.xpi`.
1. Open `about:addons`, click the gear button, choose "Install Add-on From File…" and pick the file.

To update, install the new file the same way.

**From source**

Clone this repository. On Chrome, load the cloned folder as above. On Firefox, see
[Installing From Source](CONTRIBUTING.md#installing-from-source); this needs
[Deno](https://deno.com).

## Taiko hints

Each hint is drawn as a row of squares: red for don, blue for ka.

| Key     | Action                          |
| ------- | ------------------------------- |
| `f`     | Open a link in the current tab  |
| `F`     | Open a link in a new tab        |
| `<a-f>` | Open multiple links in new tabs |
| `yf`    | Copy a link URL                 |

Don is `f` and `j`, ka is `d` and `k`, as on a Taiko no Tatsujin keyboard layout. Both can be
changed on the options page, under "Keys used for taiko hints".

Every link hints command accepts the `taiko` option, so any of them can use taiko hints:

```
map <a-S> LinkHints.activateModeToOpenInNewForegroundTab taiko
map gh LinkHints.activateMode action=hover taiko
```

### How hints are formed

- A hint is one or more phrases of 1 to 5 notes, separated by rests (short pauses).
- Only a phrase of 1, 3 or 5 notes can be followed by a rest. A phrase of 2 or 4 notes only ends a
  hint: when you alternate hands, stopping after an even number of notes and going on feels wrong.
- Hints are handed out by number of notes, fewest first; rests aren't counted. Among hints with the
  same number of notes, those with fewer rests come first: don, ka, the four 2-note phrases, then
  the four 2-note hints with a rest in the middle, then 3 notes, and so on. Up to 5 notes, there are
  370 hints.

### Typing

- A pause of about 1.6 times your tempo counts as a rest.
- A hint is selected as soon as it is the only one that matches, or when the pause after a rest goes
  on (700ms by default).
- If a note after a rest doesn't fit any hint with a rest there, the rest is taken as a hesitation
  and ignored.

`Backspace`, `Space` (rotate overlapping hints), `Shift` and `Ctrl` work as in Vimium's link hints.

Vimium's letter hints are still there, without keys. To use them, map the link hints commands
without the `taiko` option, for example `map s LinkHints.activateMode`.

## License

Vimium Taiko is released under the MIT license, like Vimium. See [MIT-LICENSE.txt](MIT-LICENSE.txt).

The rest of this README is Vimium's own. Its installation links are for Vimium, not Vimium Taiko.

---

# Vimium - The Hacker's Browser

Vimium is a browser extension that provides keyboard-based navigation and control of the web in the
spirit of the Vim editor.

[Watch the demo video](https://www.youtube.com/watch?v=t67Sn0RGK54).

**Installation instructions:**

- Chrome:
  [Chrome web store](https://chromewebstore.google.com/detail/vimium/dbepggeogbaibhgnhhndojpepiihcmeb)
- Edge:
  [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/vimium/djmieaghokpkpjfbpelnlkfgfjapaopa)
- Firefox: [Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/vimium-ff/)

To install from source, see [here](CONTRIBUTING.md#installing-from-source).

Vimium's Options page can be reached via a link on the help dialog (type `?`) or via the button next
to Vimium on the extension pages of Chrome and Edge (`chrome://extensions`), or Firefox
(`about:addons`).

## Keyboard Bindings

Modifier keys are specified as `<c-x>`, `<m-x>`, and `<a-x>` for ctrl+x, meta+x, and alt+x
respectively. For shift+x and ctrl-shift-x, just type `X` and `<c-X>`. See the next section for how
to customize these bindings.

Once you have Vimium installed, you can see this list of key bindings at any time by typing `?`.

Navigating the current page:

    ?       show the help dialog for a list of all available keys
    h       scroll left
    j       scroll down
    k       scroll up
    l       scroll right
    gg      scroll to top of the page
    G       scroll to bottom of the page
    d       scroll down half a page
    u       scroll up half a page
    f       open a link in the current tab
    F       open a link in a new tab
    r       reload
    gs      view source
    i       enter insert mode -- all commands will be ignored until you hit Esc to exit
    yy      copy the current url to the clipboard
    yf      copy a link url to the clipboard
    gf      cycle forward to the next frame
    gF      focus the main/top frame

Navigating to new pages:

    o       Open URL, bookmark, or history entry
    O       Open URL, bookmark, history entry in a new tab
    b       Open bookmark
    B       Open bookmark in a new tab

Using find:

    /       enter find mode
              -- type your search query and hit enter to search, or Esc to cancel
    n       cycle forward to the next find match
    N       cycle backward to the previous find match

For advanced usage, see [regular expressions](https://github.com/philc/vimium/wiki/Find-Mode) on the
wiki.

Navigating your history:

    H       go back in history
    L       go forward in history

Manipulating tabs:

    J, gT   go one tab left
    K, gt   go one tab right
    g0      go to the first tab. Use ng0 to go to n-th tab
    g$      go to the last tab
    ^       visit the previously-visited tab
    t       create tab
    yt      duplicate current tab
    x       close current tab
    X       restore closed tab (i.e. unwind the 'x' command)
    T       search through your open tabs
    W       move current tab to new window
    <a-p>   pin/unpin current tab

Using marks:

    ma, mA  set local mark "a" (global mark "A")
    `a, `A  jump to local mark "a" (global mark "A")
    ``      jump back to the position before the previous jump
              -- that is, before the previous gg, G, n, N, / or `a

Additional advanced browsing commands:

    ]], [[  Follow the link labeled 'next' or '>' ('previous' or '<')
              - helpful for browsing paginated sites
    <a-f>   open multiple links in a new tab
    gi      focus the first (or n-th) text input box on the page. Use <tab> to cycle through options.
    gu      go up one level in the URL hierarchy
    gU      go up to root of the URL hierarchy
    ge      edit the current URL
    gE      edit the current URL and open in a new tab
    zH      scroll all the way left
    zL      scroll all the way right
    v       enter visual mode; use p/P to paste-and-go, use y to yank
    V       enter visual line mode
    R       Hard reload the page (skip the cache)

Vimium supports command repetition so, for example, hitting `5t` will open 5 tabs in rapid
succession. `<Esc>` (or `<c-[>`) will clear any partial commands in the queue and will also exit
insert and find modes.

There are additional commands which aren't included in this README; refer to the help dialog (type
`?`) for a full list.

## Custom Key Mappings

You may remap or unmap any of the default key bindings in the "Custom key mappings" on the options
page.

Enter one of the following key mapping statements per line:

- `map key command`: Maps a key to a Vimium command. Overrides Chrome's default behavior for that
  key, if any.
- `unmap key`: Unmaps a key and restores Chrome's default behavior (if any).
- `unmapAll`: Unmaps all bindings. This is useful if you want to completely wipe Vimium's defaults
  and start from scratch with your own setup.

Examples:

- `map <c-d> scrollPageDown` maps ctrl+d to scrolling the page down. Chrome's default behavior of
  showing a bookmark dialog is suppressed.
- `map r reload hard` maps the r key to reloading the page, and also includes the "hard" option to
  hard-reload the page.
- `unmap <c-d>` removes any mapping for ctrl+d and restores Chrome's default behavior.
- `unmap r` removes any mapping for the r key.

See the [docs](https://vimium.github.io/commands/) for every Vimium command and its options.

You can add comments to key mappings by starting a line with `"` or `#`.

The following special keys are available for mapping:

- `<c-*>`, `<a-*>`, `<s-*>`, `<m-*>` for ctrl, alt, shift, and meta (command on Mac) respectively
  with any key. Replace `*` with the key of choice.
- `<left>`, `<right>`, `<up>`, `<down>` for the arrow keys.
- `<f1>` through `<f12>` for the function keys.
- `<space>` for the space key.
- `<tab>`, `<enter>`, `<delete>`, `<backspace>`, `<insert>`, `<home>` and `<end>` for the
  corresponding non-printable keys.

Shifts are automatically detected so, for example, `<c-&>` corresponds to ctrl+shift+7 on an English
keyboard.

## How to allow Vimium to work on new tab pages

- Vimium will work on new tab pages which are opened with Vimium's `createTab` command (mapped to
  `t` by default).
- To have Vimium work on <em>all</em> new tab pages opened by the browser (e.g. via `cmd-t` or
  `ctrl-t` shortcuts), a companion
  [Vimium New Tab Page extension](https://github.com/philc/vimium-new-tab/) is required.
- Once that is installed, all new tabs will open a blank Vimium new tab page.

## More documentation

- [FAQ](https://github.com/philc/vimium/wiki/FAQ)
- [Command listing](https://vimium.github.io/commands/)
- [Vimium's GitHub wiki](https://github.com/philc/vimium/wiki): documentation for the more advanced
  features.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Release Notes

See [CHANGELOG](CHANGELOG.md) for the major changes in each release.

## License

Copyright (c) Phil Crosby, Ilya Sukhar. See [MIT-LICENSE.txt](MIT-LICENSE.txt) for details.
