// Taiko hints: link hints that are typed as a drum pattern, in the style of Taiko no Tatsujin.
//
// Each hint is a sequence of two notes, "don" (d, drawn red) and "ka" (k, drawn blue). A hint is
// made of one or more phrases separated by rests. A rest is a short pause in typing.
//
//   - A phrase is 1 to 5 notes.
//   - Only a phrase of odd length (1, 3 or 5 notes) can be followed by a rest. A phrase of even
//     length can only end the hint. When you alternate hands, stopping after an even number of
//     notes and then continuing feels wrong, so the pattern never asks for it.
//
// Hints are handed out shortest first: all 62 single phrases, then "d rest <phrase>",
// "k rest <phrase>", then 3- and 5-note phrases followed by a rest, and so on.
//
// Typing:
//   - A pause of about 1.6x the current typing tempo inserts a rest.
//   - A rest on its own never selects a hint. A hint is selected when only one hint matches, or
//     when the pause continues for `taikoEndTimeout` after the rest.
//   - If a note typed after a rest doesn't fit any hint that has a rest there, the rest is treated
//     as a hesitation and dropped.
//
// Internally a hint string uses "d" and "k" for notes and "|" for rests, and always ends with "|".
// A hint can be the start of a longer one ("d|" and "d|d|"); the end marker "$", added after a
// long pause, selects the shorter one. This only happens after an odd-length phrase, since a
// rest can only follow one.

const TaikoPattern = {
  REST: "|",
  END: "$",
  MAX_PHRASE: 5,

  // All phrases of 1 to MAX_PHRASE notes, shortest first.
  phrases: (() => {
    const phrases = [];
    let level = [""];
    for (let length = 1; length <= 5; length++) {
      level = level.flatMap((p) => [p + "d", p + "k"]);
      phrases.push(...level);
    }
    return phrases;
  })(),

  // Returns `count` hint strings in the order they are handed out.
  hintStrings(count) {
    const { REST, phrases } = this;
    const oddPhrases = phrases.filter((p) => p.length % 2 === 1);
    const hints = phrases.map((p) => p + REST);
    let heads = [""];
    while (hints.length < count) {
      heads = heads.flatMap((head) => oddPhrases.map((p) => head ? head + REST + p : p));
      for (const head of heads) {
        if (hints.length >= count) break;
        for (const p of phrases) hints.push(head + REST + p + REST);
      }
    }
    return hints.slice(0, count);
  },
};

// The marker matcher for LinkHintsMode, used in place of AlphabetHints.
class TaikoHints {
  // `onChange` is called when a timer adds a rest or an end to the keystroke queue, so that the
  // caller can update the visible markers.
  constructor(onChange) {
    const keys = (name) => new Set(Settings.get(name).toLowerCase().replace(/\s/g, ""));
    this.donKeys = keys("taikoDonKeys");
    this.kaKeys = keys("taikoKaKeys");
    this.restTimeout = Math.max(40, Number(Settings.get("taikoRestTimeout")));
    this.endTimeout = Math.max(50, Number(Settings.get("taikoEndTimeout")));
    this.onChange = onChange;
    this.hintKeystrokeQueue = [];
    this.hints = [];
    this.timer = null;
    this.lastHitTime = null;
    this.intervals = [];
  }

  fillInMarkers(hintMarkers) {
    this.hints = TaikoPattern.hintStrings(hintMarkers.length);
    hintMarkers.forEach((marker, i) => {
      marker.hintString = this.hints[i];
      if (marker.isLocalMarker()) {
        marker.element.classList.add("vimium-taiko-hint");
        marker.element.innerHTML = taikoNotesHtml(marker.hintString);
      }
    });
  }

  getMatchingHints(hintMarkers) {
    const q = this.hintKeystrokeQueue;
    const last = q[q.length - 1];
    if (last === TaikoPattern.END) {
      const typed = q.slice(0, -1).join("");
      return { linksMatched: hintMarkers.filter((m) => m.hintString === typed) };
    }
    // A trailing rest is tentative, so it doesn't narrow the matches.
    const typed = (last === TaikoPattern.REST ? q.slice(0, -1) : q).join("");
    return { linksMatched: hintMarkers.filter((m) => m.hintString.startsWith(typed)) };
  }

  // Handles a key typed in hint mode. Returns true if the key is a note.
  handleKey(keyChar) {
    const key = keyChar.toLowerCase();
    const note = this.donKeys.has(key) ? "d" : (this.kaKeys.has(key) ? "k" : null);
    if (!note) return false;
    this.recordTempo(performance.now());
    this.pushKeyChar(note);
    this.schedule(TaikoPattern.REST);
    return true;
  }

  pushKeyChar(keyChar) {
    const { REST, END } = TaikoPattern;
    const q = this.hintKeystrokeQueue;
    if (keyChar !== END && q[q.length - 1] === REST) {
      const withRest = q.join("") + keyChar;
      if (!this.hints.some((h) => h.startsWith(withRest))) q.pop();
    }
    q.push(keyChar);
  }

  // Removes the last note, along with any rest or end after it.
  popKeyChar() {
    this.stop();
    const q = this.hintKeystrokeQueue;
    while ([TaikoPattern.REST, TaikoPattern.END].includes(q[q.length - 1])) q.pop();
    return q.pop();
  }

  shouldRotateHints() {
    return true;
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  // After the next pause, adds a rest (and after a further pause, an end), if that can still match
  // a hint.
  schedule(token) {
    const { REST } = TaikoPattern;
    this.stop();
    const delay = token === REST ? this.restDelay() : this.endTimeout;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.canPush(token)) return;
      this.pushKeyChar(token);
      if (token === REST) this.schedule(TaikoPattern.END);
      this.onChange();
    }, delay);
  }

  canPush(token) {
    const typed = this.hintKeystrokeQueue.join("");
    if (token === TaikoPattern.REST) {
      return !typed.endsWith(token) && this.hints.some((h) => h.startsWith(typed + token));
    }
    return typed.endsWith(TaikoPattern.REST) && this.hints.includes(typed);
  }

  // Records the time between notes within a phrase, to follow the typing tempo.
  recordTempo(now) {
    const q = this.hintKeystrokeQueue;
    const afterRest = q.length === 0 || q[q.length - 1] === TaikoPattern.REST;
    if (this.lastHitTime != null && !afterRest) {
      this.intervals.push(now - this.lastHitTime);
      if (this.intervals.length > 6) this.intervals.shift();
    }
    this.lastHitTime = now;
  }

  // How long a pause has to be to count as a rest: 1.6x the median recent interval between notes,
  // or `taikoRestTimeout` before the tempo is known.
  restDelay() {
    if (this.intervals.length === 0) return this.restTimeout;
    const sorted = [...this.intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return Math.min(600, Math.max(60, median * 1.6));
  }

  // Taiko hints are wider than letter hints, so nearby hints often overlap. Place markers from top
  // to bottom, moving each one that overlaps an already placed marker to the nearest free spot.
  layoutMarkers(hintMarkers) {
    const GAP = 1;
    const CELL = 64;
    const items = hintMarkers.filter((m) => m.isLocalMarker()).map((m) => {
      const rect = m.element.getBoundingClientRect();
      return {
        m,
        x: parseFloat(m.element.style.left) || 0,
        y: parseFloat(m.element.style.top) || 0,
        w: rect.width,
        h: rect.height,
      };
    });
    items.sort((a, b) => a.y - b.y || a.x - b.x);

    // Placed markers, bucketed into a grid of CELL-sized squares for fast overlap checks.
    const grid = new Map();
    const cellsOf = ({ x, y, w, h }) => {
      const cells = [];
      for (let cx = Math.floor(x / CELL); cx <= Math.floor((x + w) / CELL); cx++) {
        for (let cy = Math.floor(y / CELL); cy <= Math.floor((y + h) / CELL); cy++) {
          cells.push(cx + "," + cy);
        }
      }
      return cells;
    };
    const overlaps = (r) =>
      cellsOf(r).some((cell) =>
        (grid.get(cell) || []).some((o) =>
          r.x < o.x + o.w + GAP && o.x < r.x + r.w + GAP &&
          r.y < o.y + o.h + GAP && o.y < r.y + r.h + GAP
        )
      );
    const place = (r) => {
      for (const cell of cellsOf(r)) {
        if (!grid.has(cell)) grid.set(cell, []);
        grid.get(cell).push(r);
      }
    };

    // Offsets to try, nearest first. Moving vertically counts as further than moving sideways.
    const offsetsBySize = new Map();
    const offsetsFor = (w, h) => {
      const key = Math.round(w) + "x" + Math.round(h);
      if (!offsetsBySize.has(key)) {
        const offsets = [];
        const maxDx = Math.max(120, w * 3);
        for (let row = -14; row <= 14; row++) {
          const dy = row * (h + GAP);
          for (let dx = -maxDx; dx <= maxDx; dx += 4) {
            offsets.push([dx, dy, dx * dx + 2.5 * dy * dy]);
          }
        }
        offsetsBySize.set(key, offsets.sort((a, b) => a[2] - b[2]));
      }
      return offsetsBySize.get(key);
    };

    for (const item of items) {
      const { w, h } = item;
      let spot = { x: item.x, y: item.y, w, h };
      for (const [dx, dy] of offsetsFor(w, h)) {
        const candidate = { x: item.x + dx, y: item.y + dy, w, h };
        if (candidate.x >= 0 && candidate.y >= 0 && !overlaps(candidate)) {
          spot = candidate;
          break;
        }
      }
      item.m.element.style.left = spot.x + "px";
      item.m.element.style.top = spot.y + "px";
      item.m.markerRect = null;
      place(spot);
    }
  }
}

// One square per note, and an empty square for each rest. The final "|" isn't drawn. There is one
// child element per typed token, so LinkHintsMode.showMarker can dim the typed notes.
const taikoNotesHtml = (hintString) =>
  Array.from(hintString.slice(0, -1)).map((c) => {
    const kind = { d: "don", k: "ka" }[c] ?? "rest";
    return `<span class='vimium-reset vimium-taiko-note vimium-taiko-${kind}'></span>`;
  }).join("");

Object.assign(globalThis, { TaikoPattern, TaikoHints });
