import "./test_helper.js";
import "../../lib/settings.js";
import "../../content_scripts/taiko_hints.js";

const REST = TaikoPattern.REST;
const END = TaikoPattern.END;

// "d|kd|" -> ["d", "kd"]
const phrasesOf = (hint) => hint.slice(0, -1).split(REST);

context("TaikoPattern.hintStrings", () => {
  const hints = TaikoPattern.hintStrings(3000);

  const notesOf = (hint) => hint.replaceAll(REST, "").length;
  const restsOf = (hint) => phrasesOf(hint).length - 1;

  should("hand out the fewest notes first, then the fewest rests", () => {
    assert.equal(["d|", "k|", "dd|", "dk|", "kd|", "kk|", "d|d|", "d|k|", "k|d|", "k|k|"], [
      ...hints.slice(0, 10),
    ]);
    assert.equal("ddd|", hints[10]);
    assert.equal("d|dd|", hints[18]);
    assert.equal("d|d|d|", hints[26]);
    assert.equal("dddd|", hints[34]);
    for (let i = 1; i < hints.length; i++) {
      const [a, b] = [hints[i - 1], hints[i]];
      assert.isTrue(
        notesOf(a) < notesOf(b) || (notesOf(a) === notesOf(b) && restsOf(a) <= restsOf(b)),
      );
    }
  });

  should("give every hint of up to 5 notes before any longer one", () => {
    assert.equal(370, hints.filter((h) => notesOf(h) <= 5).length);
    assert.isTrue(hints.slice(0, 370).every((h) => notesOf(h) <= 5));
  });

  should("only put a rest after a phrase of odd length", () => {
    for (const hint of hints) {
      const phrases = phrasesOf(hint);
      assert.isTrue(phrases.every((p) => 1 <= p.length && p.length <= 5));
      assert.isTrue(phrases.slice(0, -1).every((p) => p.length % 2 === 1));
    }
  });

  should("give distinct hints", () => {
    assert.equal(hints.length, new Set(hints).size);
  });

  should("only let a hint start a longer one where a rest follows an odd phrase", () => {
    const all = new Set(hints);
    for (const hint of hints) {
      for (let i = 0; i < hint.length - 1; i++) {
        if (hint[i] !== REST) continue;
        const start = hint.slice(0, i + 1);
        if (all.has(start)) assert.isTrue(phrasesOf(start).at(-1).length % 2 === 1);
      }
    }
  });

  should("return exactly the requested number of hints", () => {
    for (const count of [0, 1, 2, 61, 62, 63, 200]) {
      assert.equal(count, TaikoPattern.hintStrings(count).length);
    }
  });
});

context("TaikoHints", () => {
  let matcher, markers;

  setup(async () => {
    await Settings.onLoaded();
    markers = TaikoPattern.hintStrings(100).map((hintString) => ({
      hintString,
      isLocalMarker: () => false,
    }));
    matcher = new TaikoHints(() => {});
    matcher.fillInMarkers(markers);
  });

  teardown(async () => {
    matcher.stop();
    await Settings.clear();
  });

  const type = (...tokens) => tokens.forEach((t) => matcher.pushKeyChar(t));
  const matches = () => matcher.getMatchingHints(markers).linksMatched.map((m) => m.hintString);

  should("map the default keys to don and ka", () => {
    assert.isTrue(matcher.handleKey("f"));
    assert.isTrue(matcher.handleKey("J"));
    assert.isTrue(matcher.handleKey("d"));
    assert.isTrue(matcher.handleKey("k"));
    assert.isFalse(matcher.handleKey("a"));
    assert.equal(["d", "d", "k", "k"], matcher.hintKeystrokeQueue);
  });

  should("not narrow the matches on a rest alone", () => {
    type("d", "d");
    const before = matches();
    type(REST);
    assert.equal(before, matches());
  });

  should("select the exact hint after a rest and an end", () => {
    type("d", "d", REST, END);
    assert.equal(["dd|"], matches());
  });

  should("keep a rest that fits a hint", () => {
    type("d", REST, "k");
    assert.equal(["d", REST, "k"], matcher.hintKeystrokeQueue);
  });

  should("drop a rest that doesn't fit any hint", () => {
    type("d", "d", REST, "k");
    assert.equal(["d", "d", "k"], matcher.hintKeystrokeQueue);
  });

  should("only allow a rest where some hint has one", () => {
    type("d", "d");
    assert.isTrue(matcher.canPush(REST)); // "dd|" is a hint.
    type(REST);
    assert.isFalse(matcher.canPush(REST)); // Never two rests in a row.
    assert.isTrue(matcher.canPush(END));
  });

  should("remove the last note along with any rest or end after it", () => {
    type("d", "k", REST, END);
    assert.equal("k", matcher.popKeyChar());
    assert.equal(["d"], matcher.hintKeystrokeQueue);
  });
});
