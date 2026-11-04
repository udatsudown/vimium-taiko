import "./test_helper.js";
import "../../lib/settings.js";
import "../../content_scripts/taiko_hints.js";

const REST = TaikoPattern.REST;
const END = TaikoPattern.END;

// "d|kd|" -> ["d", "kd"]
const phrasesOf = (hint) => hint.slice(0, -1).split(REST);

context("TaikoPattern.hintStrings", () => {
  const hints = TaikoPattern.hintStrings(3000);

  should("start with all 62 single phrases of 1 to 5 notes, shortest first", () => {
    const singles = hints.slice(0, 62);
    assert.equal(["d|", "k|", "dd|", "dk|", "kd|", "kk|"], singles.slice(0, 6));
    assert.equal("kkkkk|", singles[61]);
    assert.isTrue(singles.every((h) => phrasesOf(h).length === 1));
  });

  should("continue with a 1-note phrase, a rest and any phrase", () => {
    assert.equal("d|d|", hints[62]);
    assert.equal("d|kkkkk|", hints[123]);
    assert.equal("k|d|", hints[124]);
    assert.equal("ddd|d|", hints[186]);
    assert.equal("kkkkk|kkkkk|", hints[2665]);
    assert.equal("d|d|d|", hints[2666]);
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
