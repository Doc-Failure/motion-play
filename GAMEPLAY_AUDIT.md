# Gameplay audit

This baseline covers the eleven games routed through visibleGameSlugs before Marble Mountain was added. The other catalog records are development or historical implementations. Baseline review used the production routes, synthetic camera, model code and existing game-specific tests. Physical latency and family play comfort require observation with a webcam.

The subsequent audit covered 45 implementations. Shadow Snap's highest-priority issue was a mismatch between the movement it demonstrated and the wrist angles it scored. It now grades the full-body opening shown onscreen. The title-by-title findings for all thirty development games and the historical implementations include delayed inputs being rejected, unfair spawn patterns, repeated scoring and unreachable progression. [Issue register](GAMEPLAY_ISSUES.md) · [Coverage by game](GAME_IMPROVEMENT_TRACKER.md)

| Priority / game | Core loop and three issues | Design target |
|---|---|---|
| P0 Six Hoops | Redirect falling balls into side baskets. Four-player outside lanes receive zero starting balls, the five drops repeat, and a scoreless timeout gives little direction. | Rotate opportunities within one serve of parity, vary the release within reachable lanes, give the next basket a purpose. |
| P1 UFO Juggler | Spin, coast, rescue. A quick launch leaves an empty screen until the fixed timer, the second wave doubles the batch, and slots refill in fixed order. | Refill empty lanes promptly, cap concurrent work and stagger launches. |
| P1 Ghost Catcher | Rub ghosts, swat bats. Repeating five columns, parallel straight flights, and unlimited live backlog make later waves crowded. | Bound occupancy and introduce gentle readable lateral movement. |
| P1 Kangaroo Race | Rise, land, approach another hurdle. First obstacle is over two seconds away, different hurdles share one warning, and course speed alone rises with time. | Earlier first decision, obstacle-specific cues and capped course progression. |
| P1 Window Wipe | Clear foam and scrub spots. Full grid scan per brush sample, identical coverage objective, and a long transition after each clear. | Limit work to affected cells, vary completion threshold and shorten window change. |
| P2 Paper Dojo | Swat leaping ninjas around hazards. Opening edge reaches are long, alternating sides repeat, and the 60-second round starts over at the same wave. | Center opening reaches, vary paired approaches and keep readable windups. |
| P2 Paper Jam | Strike speakers on a chart. First beat lands at 2.4 seconds, repeated opening chart, and accents arrive very late. | Introduce an early pickup and unlock syncopation by level without moving the beat grid. |
| P2 Cardboard Champ | Jab and evade. Waiting through knockout recovery, fixed defensive rhythm and no next opponent objective. | Shorten recovery and reward a timed counter after dodging. |
| P2 Keep Ups | Rally a ball and enter hoops. Three early drops end practice, wind arrives on a fixed schedule, and a replay has no streak target. | Preserve physical contact, scale wind challenge and give each round a touch objective. |
| P2 Goalkeeper | Read kicker, intercept shot. Identical opening windup, escalating speed alone, and late aims can land at difficult extremes. | Start with narrower angles, expand spread before shortening flight. |
| P2 Net Rally | Return over a solid net. Same serve each point, identical release delay, and an inert opening before the drop. | Alternate playable serve depth, stage serve pace and retain a first-to-five match. |

All models already isolate inputs by player or team, expose normalized simulation entry points and use a shared clock. Preserve those boundaries. Use sport-specific units for progress so a metre, a basket and a beat remain meaningful. Bench tests should distinguish model time from browser frame time and physical motion latency.

## Multiplayer formats across the twelve public games

Camera zones identify the person who produced an input. The game chooses where the action takes place and who shares the objective.

| Game | Solo and multiplayer decision | Reason |
|---|---|---|
| Net Rally | Solo against the robot, two-player singles, three-player cooperative returns, four-player doubles. Assign net and back positions before the round. | The old midfield position straddled the net in a three-person game. Moving the net to the first seat boundary gives each person a playable side. Doubles partners can reach into each other’s coverage. |
| Window Wipe | One person or a crew cleans one full-width pane. | Four separate windows made a family activity into four races. One coverage mask lets people finish each other’s work, with individual credit for new cleaning. |
| Paper Jam (retired) | Solo follows a left/right call. A band divides one chart among numbered instruments on a shared stage. | Four identical sets of speakers produced sixteen targets for four people. The opening band now has one speaker per musician. |
| Six Hoops | Keep the shared six-basket court. | A ball can already travel the width of the court and the last touch determines the scorer. Rotating serves involve the outside seats. |
| Kangaroo Race | Keep one side-view race with parallel running tracks. | Distance and relative position let everyone see the leader. Each runner needs an independently timed obstacle and jump. |
| Marble Bowling | One lane per player with identical racks, independent release timing and three rolls each. | Marble Mountain required shoulder steering and braking before a fork made sense. Bowling puts the ball and pins in view from the first frame, with one upward sweep to play. |
| Goalkeeper | One full-width goal. Two players cover the posts, three add a middle defender, and four split the middle into left and right centre. | Four miniature goals prevented cover saves. Staggered attackers keep everyone involved, and a measured reach can stop any threatening ball. The team shares its concession limit and the saver earns the points. |
| Keep Ups | Keep the individual freestyle juggling challenge. | Each player has a ball, streak, hoops and three lives. Constant personal touches are the objective here. Group passing is available in Net Rally. |
| Cardboard Champ | Keep one robot sparring partner per player. | A dodge opens a personal counterattack window. A shared opponent could be knocked out by someone else during that opening. |
| Paper Dojo | Keep adjacent training stations. | Everyone faces comparable windups. A neighbour’s swat cannot remove a target or trigger someone else’s obstacle penalty. |
| Ghost Catcher | Keep separate hunting areas. | Rubbing charges one ghost over several observations. Each player retains progress on their target and owns the consequence of an escape. |
| UFO Juggler | Keep individual juggling stations. | Heating, coasting and rescue depend on each pilot's stop/start motion. A teammate waving at the same saucer could cancel a deliberate coast. |
| Shadow Snap | All players share one cardboard wall, with one full-body opening per person. | Wrist directions alone allowed players to score from the wrong position. A thumbnail was hard to compare with the camera, and latched poses let teammates finish at different times. Measure individual spill and empty area against the visible openings and require a simultaneous group hold. |
