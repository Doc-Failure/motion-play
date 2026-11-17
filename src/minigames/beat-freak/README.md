# Paper Jam

An original camera rhythm game inspired by Beat Freak from EyeToy: Play. The
[published gameplay analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC4290029/)
describes discs traveling toward four speakers, with timed arm strikes. Paper
Jam uses original crayon speakers, record/deck drawings, choreography, music and
scoring. No source-game artwork, soundtrack, recordings or code are imported.

## Interaction

Four instruments surround each player's live camera lane: Kick, Clap, Pluck and
Chime. Records travel from the center toward their matching speaker over 1.4
seconds. Strike the speaker as its record arrives. A growing timing ring and
color, instrument name and number identify the destination. Fresh camera motion
is sufficient; no finger pose or hand-shape recognition is needed.

The 60-second score starts with four count-in beats at 100 BPM, then progresses
from quarter notes to offbeat pickups and paired accents. Every player receives
an identical deterministic chart. There is no early elimination. Perfect timing
(±85 ms) earns 15 points; Good timing (±210 ms) earns 10. Consecutive hits build
multipliers, up to ×3, while a missed note resets only that player's streak.

Only normalized MOTION_HIT samples enter BeatModel. Collision circles use the
same cqmin radii as the rendered speakers. Player ownership, coordinate/range/
confidence validation, capture timestamps and per-frame spatial deduplication
prevent stale samples and duplicate scores. Distinct strikes from the same
capture can hit paired speakers. A bounded capture-delivery allowance preserves
on-time captured input after a newer render tick. Camera frames, pose and media
libraries stay outside the game.

Native speaker buttons support pointer/touch and Tab + Enter/Space. The play area
also supports its shared arrow/aim fallback and keys 1–4 on release; holding a
number key cannot repeatedly score. Browser modifier shortcuts are preserved.

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
the turntable pulses and a small meter follows the beat. Reduced motion removes
spins, thumps, pulsing and decorative meter motion; essential record travel stays
visible. Score text, labels and timing rings work without sound or color alone.

## Integration and verification

Paper Jam occupies the fifth public catalog slot, temporarily replacing
Whack-a-Mole, whose implementation is preserved. It is the fourth competitive
round in the five-game tournament. Initial/replay starts use the existing
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
