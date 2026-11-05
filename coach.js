// Riley's coach: turns age, settings and the log into suggestions.
// Pure functions only – no DOM, no storage – so the rules are easy to read, test and change.
// Every suggestion carries a source. Health and feeding advice is general guidance, not a vet's.

const DAY = 864e5, WEEK = 7 * DAY;

export const SOURCES = {
  bluecross: { name: "Blue Cross", url: "https://www.bluecross.org.uk/advice/dog/what-should-i-feed-my-puppy" },
  rkc: { name: "Royal Kennel Club", url: "https://www.royalkennelclub.com/your-dog/getting-a-dog/caring-for-a-new-pup/feeding-your-puppy-or-dog/" },
  wdj: { name: "Whole Dog Journal", url: "https://www.whole-dog-journal.com/puppies/how-often-to-feed-a-puppy/" },
  kate: { name: "Riley's puppy plan", url: null },
  log: { name: "Based on your log", url: null },
  purdue: { name: "Purdue Canine Welfare", url: "https://caninewelfare.centers.purdue.edu/wp-content/uploads/2021/11/Puppy-Socialization.pdf" },
  worm: { name: "Vetscriptions guide – always follow your vet", url: "https://www.vetscriptions.co.uk/blogs/puppy-kitten-care/how-often-should-puppies-be-wormed" },
};

export const NAME_LEVELS = ["Quiet room", "Toys on the floor", "Garden", "Out and about"];
export const SOCIAL_ITEMS = [
  "New people", "Children", "Healthy, vaccinated dog", "Traffic & sirens", "Hoover & household noise",
  "New surfaces", "Car / bus / train", "Handling paws, ears, mouth", "Grooming & brushing", "Vet or vet nurse",
];

// Meals a day by age (Blue Cross: 4 until 4 months, 3 until 6 months, then 2; toy breeds often keep 3 longer).
export function recommendedMeals(weeks, size) {
  if (weeks < 16) return 4;
  if (weeks < 26) return 3;
  if (size === "toy" && weeks < 39) return 3;
  return 2;
}

const fmt = (ms) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const dayKey = (ms) => new Date(ms).toLocaleDateString("en-CA");

export function coach(c) {
  const out = [], now = c.now, name = c.name || "Riley";
  const weeks = (now - c.dob) / WEEK, wk = Math.floor(weeks);
  const arrived = !c.arrival || now >= c.arrival;
  const add = (s) => out.push(s);
  const train = c.train || {};

  // ---------- before arrival ----------
  if (!arrived) {
    const days = Math.ceil((c.arrival - now) / DAY);
    add({ id: "prep-countdown", area: "prep", level: "info", title: `${name} arrives in ${days} day${days === 1 ? "" : "s"}`,
      body: `Set up the playpen with the crate inside, so meals, chews and toys all happen there from day one.`, source: SOURCES.kate });
  }

  // ---------- food ----------
  const rec = recommendedMeals(weeks, c.size);
  const portion = (n) => (c.dailyGrams ? ` – about ${Math.round(c.dailyGrams / n)} g each` : "");
  if (arrived && c.mealsPerDay > rec) {
    add({ id: `food-meals-${rec}`, area: "food", level: "do", title: `${name} can move to ${rec} meals a day`,
      body: `At ${wk} weeks the usual guidance is ${rec} meals. Keep the same daily total${c.dailyGrams ? ` (${c.dailyGrams} g)` : ""}, split into ${rec}${portion(rec)}. Watch his weight and appetite.`,
      source: SOURCES.bluecross, action: { label: `Switch to ${rec} meals`, patch: { mealsPerDay: rec } } });
  } else {
    const thresholds = [16, 26, 39].map((w) => ({ w, n: recommendedMeals(w, c.size) })).filter((t) => t.n < c.mealsPerDay && t.w > weeks);
    const next = thresholds[0];
    if (next) {
      const at = c.dob + next.w * WEEK;
      if (at - now <= 14 * DAY) add({ id: `food-soon-${next.n}`, area: "food", level: "soon",
        title: `From ${fmt(at)}, ${name} can usually drop to ${next.n} meals`,
        body: next.n === 3 ? `That's around 4 months. Some puppies are ready from 12–14 weeks. Go by his weight and appetite.` : `That's around ${Math.round(next.w / 4.35)} months. Keep the daily total the same.`,
        source: next.n === 3 ? SOURCES.wdj : SOURCES.bluecross });
    }
  }
  if (weeks >= 48) add({ id: "food-adult", area: "food", level: "soon", title: `Time to plan the switch to adult food`,
    body: `Puppy food is usually fed until about a year old${["large", "giant"].includes(c.size) ? ". Large and giant breeds may stay on puppy food longer – ask your vet" : ""}. Change over gradually.`,
    source: SOURCES.bluecross });
  if (["large", "giant"].includes(c.size)) add({ id: "food-large-breed", area: "food", level: "info", title: "Large-breed feeding tips",
    body: "Use a slow-feeder bowl (gulping raises bloat risk), and don't overfeed – too much food can affect bone development in bigger breeds.",
    source: SOURCES.bluecross });

  const latestW = c.weights.length ? c.weights[c.weights.length - 1] : null;
  if (!c.dailyGrams) add({ id: "food-set-grams", area: "food", level: arrived ? "do" : "soon", title: `Set ${name}'s daily food in grams`,
    body: "Use the feeding guide on the food bag. Check whether it goes by current weight or estimated adult weight.",
    source: SOURCES.rkc, action: { label: "Open settings", tab: "settings" } });
  else if (latestW && c.gramsSetWeight && Math.abs(latestW.kg - c.gramsSetWeight) >= Math.max(0.3, c.gramsSetWeight * 0.1))
    add({ id: `food-reweigh-${latestW.kg}`, area: "food", level: "do", title: `${name}'s now ${latestW.kg} kg – check his food`,
      body: `Daily food (${c.dailyGrams} g) was set when he weighed ${c.gramsSetWeight} kg. Look up the bag's guide for ${latestW.kg} kg and update it.`,
      source: SOURCES.rkc, action: { label: "Update grams", tab: "settings" } });
  if (arrived && (!latestW || now - latestW.at > 8 * DAY)) add({ id: `food-weigh-${dayKey(now)}`, area: "food", level: "soon",
    title: `Weigh ${name} this week`, body: "A weekly weight keeps his food portions and growth chart on track.", source: SOURCES.log,
    action: { label: "Log weight", tab: "health" } });
  const todayG = c.events.filter((e) => e.type === "meal" && dayKey(e.at) === dayKey(now)).reduce((s, e) => s + (e.grams || 0), 0);
  if (c.dailyGrams && todayG > c.dailyGrams + 5) add({ id: `food-over-${dayKey(now)}`, area: "food", level: "do",
    title: `Over today's food (${todayG} of ${c.dailyGrams} g)`, body: "Check nobody's double-fed. Training treats count towards the day too.", source: SOURCES.log });

  // ---------- toilet ----------
  if (arrived) {
    const dayStats = (offset) => {
      const k = dayKey(now - offset * DAY), d = c.events.filter((e) => dayKey(e.at) === k);
      return { out: d.filter((e) => e.type === "wee" || e.type === "poo").length, acc: d.filter((e) => e.type.startsWith("acc_")).length };
    };
    const last3 = [1, 2, 3].map(dayStats), today = dayStats(0);
    const cap = (Math.floor(weeks / 4.35) + 1) * 60;  // rule of thumb: age in months + 1 hours
    if (last3.every((d) => d.out >= 4 && d.acc === 0) && c.weeIntervalMin + 15 <= cap)
      add({ id: `toilet-stretch-${c.weeIntervalMin}`, area: "toilet", level: "do", title: `3 accident-free days – try every ${c.weeIntervalMin + 15} min?`,
        body: "He's going outside reliably. Stretch the gap gradually, and go back if accidents return. Check with Kate first.",
        source: SOURCES.log, action: { label: `Every ${c.weeIntervalMin + 15} min`, patch: { weeIntervalMin: c.weeIntervalMin + 15 } } });
    if ((today.acc >= 2 || last3[0].acc >= 3) && c.weeIntervalMin > 30)
      add({ id: `toilet-shorten-${dayKey(now)}`, area: "toilet", level: "do", title: `${Math.max(today.acc, last3[0].acc)} accidents – shorten the gap for a few days`,
        body: "Watch for signs: sniffing the floor, circling, panting, looking at you then the door. Never tell him off.",
        source: SOURCES.kate, action: { label: `Every ${c.weeIntervalMin - 15} min`, patch: { weeIntervalMin: c.weeIntervalMin - 15 } } });
  }

  // ---------- ticks & worms ----------
  const KIND = { worming: "worming", flea: "flea & tick" };
  for (const k of ["worming", "flea"]) {
    const last = c.treatments.filter((t) => t.kind === k).sort((a, b) => b.at - a.at)[0];
    const gap = (c.intervals?.[k] || (k === "worming" ? 14 : 30)) * DAY;
    if (!last) add({ id: `health-first-${k}`, area: "health", level: arrived ? "do" : "soon", title: `Log ${name}'s last ${KIND[k]} treatment`,
      body: "Ask the breeder when he was last treated and with what. The app then tracks the next dose.", source: k === "worming" ? SOURCES.worm : SOURCES.log,
      action: { label: "Open health", tab: "health" } });
    else {
      const due = last.at + gap, days = Math.round((due - now) / DAY);
      if (days <= 0) add({ id: `health-due-${k}-${dayKey(due)}`, area: "health", level: "do",
        title: `${k === "worming" ? "Worming" : "Flea & tick"} ${days < 0 ? `overdue by ${-days} day${days === -1 ? "" : "s"}` : "due today"}`,
        body: `Last given ${fmt(last.at)}${last.product ? ` (${last.product})` : ""}.`, source: SOURCES.log, action: { label: "Open health", tab: "health" } });
      else if (days <= 3) add({ id: `health-soon-${k}-${dayKey(due)}`, area: "health", level: "soon",
        title: `${k === "worming" ? "Worming" : "Flea & tick"} due ${fmt(due)}`, body: `Last given ${fmt(last.at)}.`, source: SOURCES.log });
    }
  }
  const wormRec = weeks < 12 ? 14 : weeks < 26 ? 30 : null;
  if (wormRec && (c.intervals?.worming || 14) !== wormRec)
    add({ id: `health-worm-gap-${wormRec}`, area: "health", level: "soon", title: `Worming: ${wormRec === 14 ? "every 2 weeks" : "now monthly"}`,
      body: "Typical puppy schedule: every 2 weeks until 12 weeks, then monthly until 6 months. Follow your vet and the product label.",
      source: SOURCES.worm, action: { label: `Every ${wormRec} days`, patch: { intervals: { ...c.intervals, worming: wormRec } } } });
  if (weeks >= 26) add({ id: "health-worm-adult", area: "health", level: "info", title: "Worming after 6 months",
    body: "Adult dogs are often wormed every 1–3 months, depending on lifestyle. Ask your vet what suits him.", source: SOURCES.worm });

  // ---------- training ----------
  if (arrived) {
    const sess = (skill) => c.training.filter((t) => t.skill === skill).sort((a, b) => a.at - b.at);
    const social = sess("social"), nameS = sess("name"), crate = sess("crate");

    if (weeks <= 14) {
      const closes = c.dob + 14 * WEEK, days = Math.max(0, Math.ceil((closes - now) / DAY));
      const thisWeek = social.filter((s) => now - s.at < WEEK).length;
      add({ id: `train-social-${dayKey(now)}`, area: "training", level: "do", title: `Socialisation window: ${days} days left`,
        body: `Until about 14 weeks (${fmt(closes)}), give short, positive, gradual introductions to new people, places, sounds and healthy, vaccinated dogs. Pair each with food, and stop if he seems fearful. ${thisWeek} logged this week.`,
        source: SOURCES.purdue, action: { label: "Log an experience", tab: "train" } });
    }
    if (weeks >= 8 && weeks < 11) add({ id: "train-fear-period", area: "training", level: "info", title: "Fear period (around 8–10 weeks)",
      body: "Keep new experiences gentle and positive. One bad experience can stick, so let him watch from a distance first.", source: SOURCES.purdue });
    const unsure = social.filter((s) => s.reaction === "unsure" && now - s.at < 3 * DAY).pop();
    if (unsure) add({ id: `train-unsure-${unsure.id}`, area: "training", level: "do", title: `He was unsure with "${unsure.item}" – go slower`,
      body: "Next time, add more distance, keep it shorter and pair it with food. Watch for lip licking, yawning, a tucked tail or a lowered body.", source: SOURCES.purdue });

    const lvl = train.nameLevel || 0, lastN = nameS[nameS.length - 1];
    if (!lastN) add({ id: "train-name-start", area: "training", level: "do", title: "Start “reflex to name”",
      body: `Keep 5 treats in your pocket, not your hand. Say “${name}” brightly, and when he looks, say “Good” and treat. His name is not a recall word.`,
      source: SOURCES.kate, action: { label: "Open training", tab: "train" } });
    else if (lastN.score === 5 && lvl < NAME_LEVELS.length - 1)
      add({ id: `train-name-up-${lastN.id}`, area: "training", level: "do", title: `5/5! Move name reflex to “${NAME_LEVELS[lvl + 1]}”`,
        body: "Add a bit more distraction. If he stops looking, go back a step.", source: SOURCES.kate,
        action: { label: "Level up", patch: { train: { ...train, nameLevel: lvl + 1 } } } });
    else if (lastN.score <= 2 && lvl > 0)
      add({ id: `train-name-down-${lastN.id}`, area: "training", level: "do", title: `Go back to “${NAME_LEVELS[lvl - 1]}”`,
        body: "He found that too distracting. A less busy place first, then build up again.", source: SOURCES.kate,
        action: { label: "Go back a step", patch: { train: { ...train, nameLevel: lvl - 1 } } } });
    else if (now - lastN.at > 2 * DAY) add({ id: `train-name-practise-${dayKey(now)}`, area: "training", level: "soon",
      title: "Practise name reflex today", body: `Current level: ${NAME_LEVELS[lvl]}. A session of 5 takes about two minutes.`, source: SOURCES.kate });

    const lastC = crate[crate.length - 1];
    if (!lastC) add({ id: "train-crate-start", area: "training", level: "do", title: "Start crate and playpen training",
      body: "Feed meals in the playpen. Once he's relaxed, close the door while he eats and open it just before he finishes.", source: SOURCES.kate });
    else if (lastC.whined) add({ id: `train-crate-back-${lastC.id}`, area: "training", level: "do", title: `Crate: back off to ${Math.max(1, lastC.minutes - 2)} min`,
      body: "Whining usually means the time went up too fast. Let him out when he's quiet.", source: SOURCES.kate });
    else if (crate.slice(-3).length === 3 && crate.slice(-3).every((s) => !s.whined))
      add({ id: `train-crate-up-${lastC.id}`, area: "training", level: "do", title: `Crate: try ${lastC.minutes + 3} min next`,
        body: "Three calm sessions in a row. Only crate him tired and satisfied, with a loaded Kong or Lickimat.", source: SOURCES.kate });

    if (weeks >= 14) add({ id: "train-foundation", area: "training", level: "info", title: "Ready for foundation skills",
      body: "Start sit, settle and a recall word – not his name. Teaching “Drop” means you won't need the safe swap.", source: SOURCES.kate });
  }

  const rank = { do: 0, soon: 1, info: 2 };
  return out.filter((s) => !(c.dismissed?.[s.id] > now)).sort((a, b) => rank[a.level] - rank[b.level]);
}
