# Paper Jam comparison — 2026-11-17

Paper Jam reproduces the broad center-to-speaker rhythm interaction from EyeToy:
Play’s Beat Freak with original visuals, chart, music and scoring. It is not yet
an exact behavioral match. This audit used implementation inspection and written
sources; available YouTube pages were throttled, so no gameplay footage was
watched. No real webcam, physical reach or speaker synchronization was verified.

| Behavior | Original evidence | Current Paper Jam |
| --- | --- | --- |
| Camera and targets | Mirrored player image, CDs leave center toward four corner speakers; strike when a CD reaches the cone | Same broad interaction, four instrument pads in each player lane |
| Travel lead | Published analysis reports 1.3–1.4 seconds | 1.4 seconds |
| Round and failure | Published analysis reports three minutes and termination after three missed CDs | Intentional 60-second party round; misses break combo, never terminate the round |
| Progression | Analysis reports increasing speed/randomness and 1–4 simultaneous objects | Fixed 100 BPM original chart; later offbeats and paired accents |
| Scoring | Firsthand guide describes position accuracy, near-perfect chains, style meter and end bonuses | Explicit ±85 ms Perfect (15), ±210 ms Good (10), up to ×3 combo multiplier; no style meter |
| Record animation | Guide describes a brief visible stop on a successful hit | Record progress clamps at its arrival position while late; a successful hit removes it immediately and emits feedback |
| Hit geometry | Thesis identifies speaker cone as active circle | Model uses the whole circular speaker button; cone illustration is slightly offset from its button center |
| Audio | Hits play speaker sounds in time with music | Original locally generated track and instrument feedback; automated scheduling tests only |

The published sources do not establish exact timing windows or all internal
scoring rules. Current windows/scoring must not be described as original parity.
The smaller cone target, travel-through/brief success stop, style scoring and
original-length solo mode remain differences, not silently completed work.

## Defect corrected during the audit

The shared frame-difference processor debounces generic hits for 280 ms. Valid
Paper Jam strikes can arrive closer together than that, so the camera pipeline
could drop a second note even though direct model tests accepted it. Paper Jam
now consumes continuous normalized occupied-motion samples instead. The rhythm
model still resolves each note once and rejects invalid, stale, wrong-pad or
out-of-window samples. Other games keep their existing input policies. A camera
adapter regression verifies that samples reach Paper Jam even when generic hit
events are empty. This preserves camera → normalized input → game isolation.

## Sources

- [Lian Loke, PhD thesis, chapter 5, pp. 2–3 and Figure 5.1](https://www.lianloke.com/uploads/2/8/3/0/28300501/lianloke-phdthesis-chapter5_1.pdf): camera image, center-out travel, timing and speaker-cone active region.
- [Published EyeToy game analysis, Table 2 (2014)](https://onlinelibrary.wiley.com/doi/10.1155/2014/279609): duration, miss limit, travel time and progression.
- [Firsthand EyeToy: Play guide, Beat Freak section](https://www.supercheats.com/playstation2/walkthroughs/eyetoyplay-walkthrough01.txt): secondary evidence for hit stops, positional scoring, combos and style bonuses; not authoritative engine documentation.
