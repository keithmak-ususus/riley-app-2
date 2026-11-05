# Riley's training guidelines

This file is the source of truth for how the app behaves. It summarises Riley's puppy plan from his trainer. The original PDF is kept privately, not in this repo. When a feature touches toilet training, crate training or behaviour, follow these rules. If a requested change conflicts with them, flag it rather than silently changing the behaviour.

Riley: male, 8 weeks old on arrival (22 Dec 2026).

## 1. Toilet training (implemented)

**When to take him out**. These rules are in the app's trip planner, `nextTrip()` in `index.html`.
| Trigger | App rule |
|---|---|
| Every hour while awake (household rule) | `weeIntervalMin` = 60 |
| First thing in the morning / after waking | Due immediately on "Woke up" |
| After eating | Due 15 min after "Meal" |
| After playing or training | Due 10 min after "Play" |
| After visitors arrive / any excitement indoors | Due 10 min after "Excited" |
| Last thing at night | Reminder from 30 min before bedtime (Settings) |
| Went out and nothing happened | Retry due 15 min later (plan says 10–15 min) |
| Caught having an accident | Due immediately – take him out to finish |

**Routine to show when a trip is due**
1. Say the cue **"Outside"**, then go to the designated toilet spot. Keep it calm and boring.
2. At the spot, say **"Busy busy"**, then ignore him until he has toileted.
3. As he finishes, say **"Good"** and give a food treat. Play and garden fun only come *after* he has toileted.
4. If nothing happens within **5 minutes**, go back inside, supervise closely and try again after **10–15 minutes**. Go sooner if he shows signs.

**Signs he needs to go:** panting, intense sniffing at the floor, circling, or looking at you and then at the door.

**Accidents**
- An accident is just an accident. **Never** tell him off or raise your voice, otherwise he learns to toilet in hidden places. App copy must stay neutral, with no "bad" or "naughty" language.
- If caught in the act, interrupt calmly with "Outside", take him to his spot and reward him if he finishes there.
- Clean up while he's busy with something else. Use an **enzymatic cleaner** or biological laundry liquid and water. **No bleach or ammonia**, because they leave a toilet smell.

**Keep a house-training log** to spot his pattern. That's the purpose of this app.

## 2. Crate / playpen training (implemented: Train tab + coach)
- The playpen and crate must always mean good things: meals, new toys, chews, enrichment.
- Feed meals in the playpen. Once he's comfortable, close the door while he eats and open it just before he finishes.
- Build up the time the door is closed a few minutes at a time, and move the bowl further in step by step.
- Only crate him when he's tired and satisfied, after play. Always load a Lickimat, Kong or snuffle mat first.
- Move a sleeping puppy to his bed.
- Sit nearby (reading, laptop), dropping the odd treat, and gradually move further away. Crate him during boring chores, with occasional rewards.
- If he whines, the duration was probably increased too fast. Otherwise ignore the whining and let him out when he's quiet.

*In the app:* crate sessions log the door-closed minutes and whether he whined. The coach says "back off 2 min" after whining, and "try +3 min" after 3 calm sessions in a row.

## 3. Enrichment (backlog)
Long-lasting chews, puzzle feeders (15–20 min), Lickimat (soaked kibble, banana, yoghurt), snuffle mat, and two Kongs on rotation or a honey-pot dispenser.

**Safe swap:** to take an item from him, toss a high-value treat away from it, and only remove the item once he has moved away. This prevents resource guarding until "Drop" is taught.

*Feature idea:* an enrichment rotation (which toy or feeder today, whether the Kong is washed) and a "load enrichment before crating" checklist.

## 4. Reflex to name (implemented: Train tab + coach)
- Purpose: his name means "look at me". **His name is NOT a recall word.**
- Keep 5 treats in a pocket, not in your hand. Say "Riley" in an upbeat voice. When he looks, say "Good" and give a treat. Vary the gap between 5 and 30 seconds.
- Keep the pitch, tone and volume consistent.
- At 5 out of 5 successes, add distraction (toys on the floor), then move to the garden. If he doesn't look, go back a step.

*In the app:* sessions are scored x/5 at levels Quiet room → Toys on the floor → Garden → Out and about. The coach offers "level up" at 5/5 and "go back a step" at 2/5 or lower.

## 5. Fear and anxiety signs (partly implemented)
- **Face:** ears held back, lip licking, yawning, panting when not hot, wide eyes or dilated pupils, avoiding eye contact, furrowed brow, tight mouth, curled lips, snapping
- **Sounds:** whining, howling, barking, growling
- **Out of context:** scratching, spinning, tail chasing, sniffing the ground, shaking off
- **Posture:** cowering, shivering when not cold, raised hackles, tucked tail, weight held back, stiff forward posture, appeasement roll
- **Other:** refusing food, accidents, destructiveness, restlessness, avoiding or escaping, attention seeking

*In the app:* the socialisation checklist logs happy/unsure reactions, and an "unsure" one triggers a go-slower suggestion. *Still to build:* a reference page of these signs, plus noting which signs he showed. Accidents logged straight after a stressful event may be fear-related, not just a toilet-schedule issue.

## 6. Other sources the coach uses
These are general guidance. A vet's advice always wins.
- **Meals per day** ([Blue Cross](https://www.bluecross.org.uk/advice/dog/what-should-i-feed-my-puppy), [Royal Kennel Club](https://www.royalkennelclub.com/your-dog/getting-a-dog/caring-for-a-new-pup/feeding-your-puppy-or-dog/)): 4 meals from 8 weeks to about 4 months, 3 until about 6 months, then 2. Toy breeds often keep 3 a little longer. Puppy food until about 1 year, and longer for large or giant breeds if the vet advises. Some puppies are ready for 3 meals from 12–14 weeks ([Whole Dog Journal](https://www.whole-dog-journal.com/puppies/how-often-to-feed-a-puppy/)).
- **Food amount:** follow the bag's guide, and check whether it goes by current or estimated adult weight (RKC). Large breeds: use a slow feeder and don't overfeed (Blue Cross, RKC).
- **Socialisation** ([Purdue Canine Welfare](https://caninewelfare.centers.purdue.edu/wp-content/uploads/2021/11/Puppy-Socialization.pdf)): the sensitive period runs to about 14 weeks, with a fear period around 8–10 weeks. Exposures should be short, positive, gradual and paired with food, with healthy, vaccinated dogs only.
- **Worming** ([Vetscriptions guide](https://www.vetscriptions.co.uk/blogs/puppy-kitten-care/how-often-should-puppies-be-wormed)): typically every 2 weeks until 12 weeks, monthly until 6 months, then every 1–3 months as the vet advises. Flea and tick timing depends on the product.
- **Toilet interval stretching:** only after 3 accident-free days, in 15-minute steps, capped by the rule of thumb of "age in months + 1 hours". Check with Kate.
