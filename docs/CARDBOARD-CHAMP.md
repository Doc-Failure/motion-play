# Cardboard Champ

An original Boxing Chump inspired game, exposed at `#/camera/punch-arena`.
The original's robot opponent, body/head hit reactions and dodgeable punches
informed this version. Sources: [Sony manual](https://db.hfsplay.fr/files/2019/12/02/EyeToy_-_Play_USA_XomAEr4.pdf),
[firsthand gameplay guide](https://gamefaqs.gamespot.com/ps2/914470-eyetoy-play/faqs/26588),
[contemporary player account](https://gamefaqs.gamespot.com/ps2/914470-eyetoy-play/reviews/62808).
Written references were reviewed; no claim of frame-by-frame footage matching.
All artwork, animation, tutorial and synthesized audio are original.

## Rules and input

- One cardboard opponent per player in the same uncropped mirrored camera lane.
- Move a wrist into the opponent's head or chest: base 10/8 points, with a
  consecutive-hit bonus capped at +10. A moving hand is required; simply holding
  it over the opponent cannot repeatedly score. Each player has a 260 ms cooldown.
- Hands have independent histories, a 16–250 ms sample gap, minimum normalized
  displacement .035 and minimum velocity .65 lane units/second. No finger pose
  or clenched-fist classifier is required. Fresh measured wrists are converted
  to HAND_POSITION; head position to BODY_MOVE by a separate input adapter.
- The robot pulls back for 550 ms, then punches forward in 140 ms. Its raised guard blocks high
  shots during the first 550 ms; chest punches still work. The yellow region
  marks where its strike will land. Duck below it or lean out of it for +15.
- A head observation older than 350 ms cannot earn a dodge or incur damage.
  Missing/ambiguous bodies cannot create punches. Camera drops, stale samples,
  countdown, pauses and replay cannot join two unrelated arm movements.
- Five head punches knock the robot down, earning +50. It returns after 1.8 s.
  Robot attack intervals shorten with knockouts, from 3.5 s toward a 2.4 s minimum.
- Player stamina drops 25 per received punch; at zero, lose 20 points and recover.
  This version is a friendly 60-second score chase, not the original's exact
  match/round/elimination system. Tournament ranking uses total points.
- Pointer movement provides simulation. Space/Enter punches; Down samples a duck.
  Reduced motion removes idle bob, recoil rotation and travelling confetti.
  Mute, pause and route exit stop shared synthesized audio voices.

## Validation boundary

Unit checks cover scoring, actual motion vs stationary hands, timestamps,
confidence, guard/body distinction, knockout/recovery, pose freshness, pause,
replay and player isolation. Browser checks inject pose observations through the
actual local tracker adapter, test readiness and camera lifecycle, and capture
one-/four-player rendering. These are synthetic checks. Real hand speed,
reachability, head occlusion, four-person spacing and physical speaker output
remain to be tested on the user's camera. Existing local MediaPipe is retained;
there are no new runtime dependencies, downloaded models or camera uploads.


Attack animation revision: contact is judged at 690 ms on the shared animation
clock. A 90 ms contact hold makes the enlarged glove readable, followed by a
continuous 220 ms retract. Alternating gloves, forearm extension, speed strokes,
a contact ring and a synchronized strike whoosh clarify the incoming attack.
The glove now travels in the camera plane toward the marked region; it no longer
jumps vertically on the frame that the hit is judged. No generated assets needed.

Visual cleanup: the floating robot health/name panel is hidden. Foreground ropes
and posts draw after the robot and its gloves, crossing the lower torso and legs
so the opponent reads as standing inside the ring. Warnings and feedback draw
above the ropes. Hit coordinates and health/scoring rules are unchanged.
