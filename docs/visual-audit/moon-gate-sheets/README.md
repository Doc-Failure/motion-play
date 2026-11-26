# Moon Gate Run artwork

Kimi WebBridge generated six transparent master sheets in the EyeToy Game Assets conversation. Each cell is available as an individual transparent PNG in the [sprite archive](individual-sprites.zip). The game uses compact WebP sheets and standalone player badges and four contact-shadow frames. [Exact prompts](prompts.json) · [Runtime dimensions and frame names](../../../public/assets/minigames/moon-gate-run/manifest.json)

| Master | Grid | Used during play |
|---|---|---|
| [Leaf Scout](leaf.png) | 6 × 4 | Six grounded strides, jump preparation and push-off, landing and rise, stumble and scramble, ground and airborne palm swats, skid, guard, recovery, fall and celebration. Three scowling flight poses and the final downed pose also come from Paper Dojo. |
| [Enemy ninjas](foes.png) | 6 × 4 | Lantern Runner, Frost Guard, Golden Crane Master and Violet Shadow each have four approach strides, wind-up and landing or recovery. Each rank’s three existing airborne drawings play from takeoff to the end of its leap. |
| [Ninja reactions](reactions.png) | 5 × 4 | One recoil, stagger, sideways fall, upside-down tumble and downed drawing for each of the four enemy costumes. |
| [Thunder Oni](oni.png) | 5 × 3 | Entrance and stomp, breathing guard, crouch and coil, charge, raised fists, ground slam, kneeling recovery, hit recoil, heavy stagger, tip, fall and collapse. |
| [Course artwork](world.png) | 4 × 5 | Four frames each of swaying bamboo, waterfall, bridge flex and opening doors. Four ground tiles mark bamboo, river, Moon Gate and victory. |
| [Effects and badges](effects.png) | 4 × 6 | Contact dust, takeoff and swat bursts, the slam shockwave, breaking heart, clean-landing reward and four player badges. Four derived shadow cels narrow and fade as the player rises. |

The attack target and its ring use the simulation’s lane coordinates. A defeated foe retains its last position and finishes its fall independently of further strikes. The last knockout or victory gets a 1.3-second finish before results. Pause freezes the sprite clock. Reduced motion holds the run and scenery frames steady and shows the action cues and outcome poses.

[Watch the recorded run, landing and boss fight](gameplay.webp). The preview comes from the camera-free desktop game. The browser checks also exercised a synthetic torso jump and swat in the mirrored camera view.
