# Paper Jam

An original camera rhythm game inspired by Beat Freak from EyeToy: Play. The
[published gameplay analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC4290029/)
describes discs traveling toward four speakers, with timed arm strikes. Paper
Jam uses original crayon speakers, record/deck drawings, choreography, music and
scoring. No source-game artwork, soundtrack, recordings or code are imported.

## Interaction

A 42-second round opens with two large speakers in solo play. The cue on the speaker changes from **Get ready** to **HIT!** during the scoring window. In a band, two to four musicians each start with one numbered instrument. Three and four musicians answer in alternating groups. Every note has one owner. Team progression adds the individual contributions.

The first call lands at 1.2 seconds. Levels 1–2 allow one call every two beats. Level 3 introduces more instruments, level 4 adds offbeats, and level 6 introduces paired accents. At opening difficulty, a swat from 300 ms early to 420 ms late earns 10 points. A hit within 130 ms of the beat earns 15. The level-one goal is 40 points. Each eight consecutive hits increases the multiplier, up to 3×.

Only normalized MOTION_HIT samples enter BeatModel. Collision circles use the
same cqmin radii as the rendered speakers. Player ownership, coordinate/range/
confidence validation, capture timestamps and per-frame spatial deduplication
prevent stale samples and duplicate scores. Distinct strikes from the same
capture can hit paired speakers. A bounded capture-delivery allowance preserves
on-time captured input after a newer render tick. Camera frames, pose and media
libraries stay outside the game.

Native speaker buttons support pointer/touch and Tab + Enter/Space. The play area
also supports its shared arrow/aim fallback and the displayed number keys on press. Holding a
number key cannot repeatedly score. Pointer and touch strikes register on contact. Browser modifier shortcuts are preserved.

## Sound and animation

The background track uses a 25 ms scheduler with 120 ms lookahead, anchored to
the round's absolute 150 ms subdivision grid. Notes are scheduled on the Web
Audio clock; visual frames do not independently advance the song. Stalls skip
past background steps rather than emitting a late burst. Pause/ready/recovery
freeze the same model clock; scheduler cleanup and shared voice tracking cancel
future audio. Muting leaves the rhythm timeline running, so re-enabling sound
joins the current beat. Replay starts a fresh timeline.

Original kick/snare/hi-hat/bass/plucked accompaniment plays quietly underneath.
Successful strikes add their instrument voice, with a subtle perfect accent and
streak chime. Speakers thump, records spin, timing rings fill, judgments sparkle,
the advanced chart adds a pulsing turntable. Reduced motion removes
spins, thumps, pulsing; essential record travel stays
visible. Score text, labels and timing rings work without sound or color alone.

## Integration and verification

Paper Jam is the third round of the five-game tournament. Initial/replay starts use the existing
simultaneous three-second ready check. Camera retention, navigation, sound mute,
external recovery, visibility pause and completion-once behavior remain shared.
Body diagnostics start hidden and can be enabled through the existing test control.

Unit tests cover scoring edges, stale/malformed/duplicate samples, capture-time
judgment, simultaneous strikes, player isolation, chart determinism, geometry,
combo/miss behavior, pause/resume, replay, completion and audio lookahead/cleanup.
Browser tests exercise actual audio scheduling, keyboard timing, simulated camera
motion, recovery, narrow/four-player layouts, reduced motion and tournaments.
Physical camera latency, reach and perceived audio synchronization require real
hardware testing; synthetic frame tests are not physical validation.
