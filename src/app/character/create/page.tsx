"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";

type StatMods = {
  ATT?: number;
  TEC?: number;
  CHA?: number;
  DEF?: number;
  HEA?: number;
};

type Race = {
  id: string;
  name: string;
  short?: string;
  description: string;
  sizeInfo: string;
  pros: string[];
  cons: string[];
  notes: string[];
  lore: string;
  bonusName: string;
  bonusText: string;
  statMods: StatMods;
};

type CharacterClass = {
  id: string;
  name: string;
  short?: string;
  description: string;
  roleInfo: string;
  pros: string[];
  cons: string[];
  notes: string[];
  lore: string;
  bonusName: string;
  bonusText: string;
  statMods: StatMods;
};

type ItemCategory = "weapon" | "vitality" | "utility" | "armour";

type Item = {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  mods?: StatMods;
};

const TOTAL_STEPS = 8;

const RACES: Race[] = [
  {
    id: "baseline-human",
    name: "Baseline Human",
    short: "🧍",
    description:
      "Baseline Humans are the hard spine of the Sprawl: unmodified enough to still be recognizably 'natural,' but seasoned by hunger, neon rain, debt, and machine-noise until survival itself becomes a talent. They are the drifters, labourers, smugglers, small-time saints, and gutter legends who keep going long after augments fail and stronger bloodlines collapse. They do not excel because of breeding vats, designer genes, or machine perfection. They excel because they adapt, absorb punishment, and learn how to live in places no sane architect meant for human life.",
    sizeInfo:
      "Average male size: around 5'7\"–6'2\" and 65–95 kg. Average female size: around 5'2\"–5'10\" and 50–80 kg. Most are lean rather than bulky, with ropey muscle, poor sleep in the eyes, and the weathered posture of people used to carrying too much for too long.",
    pros: [
      "Highly adaptable and believable in almost any district of the Sprawl",
      "Usually the easiest race to roleplay socially because they fit nearly everywhere",
      "Strong mental resilience born from ordinary suffering rather than engineered identity",
      "Good pick for players who want a versatile, grounded survivor fantasy",
    ],
    cons: [
      "Lack the specialist physical traits of more exotic bloodlines",
      "Tend to have fewer obvious built-in advantages in harsh vertical terrain or toxic environments",
      "Can be underestimated by enemies and allies alike until they prove themselves",
    ],
    notes: [
      "Often carry district accents, gang marks, work burns, or old corporate ownership scars",
      "Best for players who want their class choice to define them more than their biology",
      "A human in WildTech feels like someone who survived the city with nerve rather than design",
    ],
    lore:
      "Before the lower tiers became a graveyard of rust and prayer, Baseline Humans were everywhere: maintenance staff, courier families, sanitation crews, line cooks, debt-workers, and contract-born children raised under false daylight. When the upper districts sealed themselves off and the city's systems began to fail in slow, expensive ways, it was the unaugmented poor who were left to improvise. They learned which rainwater could be boiled, which vents could be slept beside, which old vending machines still spat edible paste after a kick to the housing. Over generations, baseline humanity became less about purity and more about persistence. In the Sprawl, 'human' does not mean untouched. It means no one thought you were valuable enough to engineer — and you lived anyway.",
    bonusName: "Hard to Kill",
    bonusText:
      "Once per encounter, when you would be reduced to 0 HP, remain at 1 HP instead.",
    statMods: { CHA: 1, HEA: 5 },
  },
  {
    id: "fog-walker",
    name: "Fog-Walker",
    short: "🌫️",
    description:
      "Fog-Walkers are a people shaped by inhalation, corrosion, and industrial atmosphere. Their lungs are dense and overworked, their throats roughened by years of particulate sludge, and their bodies have gradually adapted to air that would send cleaner bloodlines into seizures. They belong to the lower transit shafts, refinery ruins, coolant basements, and sepia cloudbanks where sound dies early and silhouettes appear half-born from the haze. To outsiders they seem grim, broad-chested, and ghostlike. To themselves, they are simply people bred by bad air into something useful.",
    sizeInfo:
      "Average male size: around 5'8\"–6'4\" and 75–110 kg. Average female size: around 5'4\"–5'11\" and 60–90 kg. Fog-Walkers usually have powerful ribcages, thicker necks, and a heavy, grounded gait. Their breathing can sound mechanical even when they are healthy.",
    pros: [
      "Excellent thematic fit for toxic zones, industrial ruins, and lower-tier exploration",
      "Naturally imposing and hard to dislodge under pressure",
      "Strong survivability profile for front-line or defensive characters",
      "Very strong identity and atmosphere for roleplay",
    ],
    cons: [
      "Can struggle in refined upper-tier social spaces where their breathing, smell, or soot-stained appearance draws attention",
      "Often slower and less graceful than lighter bloodlines",
      "Their dependence on polluted environments can make sterile or over-bright spaces uncomfortable",
    ],
    notes: [
      "Many have darkened teeth, scar-lined nostrils, and lungs that whistle softly in cold air",
      "Their clothing often includes filters, scarves, chest baffles, and old work masks worn almost as religious objects",
      "Ideal for players who want a tanky survivor with blue-collar gothic energy",
    ],
    lore:
      "Fog-Walkers descend from Tier 9 smog processors, maintenance crews, and scavenger clans who lived too close to filtration towers and solvent cisterns for too many generations. When the city began routing poison downward to save money upward, the lower districts became a slow experiment in adaptation. Children who could not breathe did not last. Families that learned to patch vents, steal filter mesh, and sleep in the lee of fan-housings survived. Over time their blood thickened, their chests widened, and their tolerances shifted into something almost monstrous. Now they are the people who can walk where the air shines wrong and still come back speaking clearly. In the lower tiers, that makes them valuable. In the upper tiers, it makes them proof of what the city has done to its own.",
    bonusName: "Obscuring Vent",
    bonusText:
      "Once per encounter, you can vent black smoke from your chest, making ranged attacks against you harder to land.",
    statMods: { DEF: 2, HEA: 5 },
  },
  {
    id: "firmament-fallen",
    name: "Firmament-Fallen",
    short: "☀️",
    description:
      "Firmament-Fallen come from the false heavens: the maintenance castes who lived beneath the artificial sky arrays, LED vaulting, and projection grids that simulated daytime for people rich enough never to see the real weather. Years of calibration glare, reflected spectrum bleed, and circadian tampering changed them. Their pupils react strangely. Their skin often looks pale or overlit. Some blink too slowly. Others not enough. They are haunted by brightness and obsessed with light, as if some forgotten instinct keeps telling them there must once have been a sun more honest than the one sold above them.",
    sizeInfo:
      "Average male size: around 5'6\"–6'1\" and 60–88 kg. Average female size: around 5'2\"–5'9\" and 48–72 kg. They tend to be slim, sinewy, and careful in how they move, with long fingers suited to panel work and delicate repairs.",
    pros: [
      "Strong sensory identity and excellent fit for scouting, night operations, and strange lore",
      "Naturally suited to eerie, atmospheric roleplay",
      "Often read as uncanny, elegant, or touched by forbidden knowledge",
      "Good synergy with technical and perceptive classes",
    ],
    cons: [
      "Bright environments can overwhelm them physically and emotionally",
      "May feel detached or unsettling in normal social interaction",
      "Less naturally robust than heavier or hardier bloodlines",
    ],
    notes: [
      "Many wear tinted lenses, hooded coats, or veil-screens to soften incoming light",
      "A lot of them speak reverently about 'real daylight' despite never having seen it",
      "Perfect for players who want a tragic, luminous, half-haunted identity",
    ],
    lore:
      "The people now called Firmament-Fallen once served in the Zenith support rings, maintaining the massive ceiling-panels that simulated weather, sun arcs, cloud drift, and ceremonial dawn for the city's elite. When austerity cuts and security purges came, thousands of technicians, bulb-swappers, projection coders, and light-habituated maintenance families were dumped downward into districts that had neither natural sky nor stable electricity. They brought with them unusual habits: sleeping by brightness schedules, praying to dead projection systems, and talking about colour temperatures like old priests speak of saints. Generations later, their descendants still inherit eyes that hate glare and minds that are pulled toward illumination like moths toward a wire. They are living relics of a fake paradise — and some of them are still searching for the real one.",
    bonusName: "Photon-Blind",
    bonusText:
      "You struggle in harsh light, but can see clearly in total darkness.",
    statMods: { TEC: 2, CHA: 1 },
  },
  {
    id: "scav-gnoll",
    name: "Scav-Gnoll",
    short: "🦴",
    description:
      "Scav-Gnolls are bio-forged descendants of waste-processing stock, carrion reclaimers, and abandoned gene-lines once used in the Sprawl’s hunger-management experiments. Their frames are wiry and predator-lean, with sharp teeth, resilient stomachs, and a laugh that many purebred humans find deeply unsettling. They are not noble beasts or romantic wasteland hunters. They are survivors designed, neglected, escaped, and then forced to become people on their own terms. In the alleys and bone markets of the lower tiers, Scav-Gnolls are feared, mocked, hired, loved, and underestimated in equal measure.",
    sizeInfo:
      "Average male size: around 5'5\"–6'3\" and 55–90 kg. Average female size: around 5'2\"–5'11\" and 45–75 kg. They often look lighter than they are because of tight muscle, long limbs, forward-angled posture, and dense sinew. Their movement is fast, spring-loaded, and difficult to read.",
    pros: [
      "Excellent survival traits in famine, filth, and desperate scavenging campaigns",
      "Strong offensive presence and unforgettable visual identity",
      "Can turn gross environments into strategic advantages",
      "Great for players who want feral humour, menace, and hunger as roleplay fuel",
    ],
    cons: [
      "Often face prejudice, distrust, and disgust in more structured districts",
      "Their instincts and appetites can be socially difficult to manage",
      "Can feel out of place in refined settings unless played with subtlety",
    ],
    notes: [
      "They often decorate themselves with bone tags, salvaged teeth, dyed cables, and trophies from things that tried to eat them first",
      "Their laughter can be joyful, cruel, nervous, or all three at once",
      "Excellent race for aggressive scavengers, tunnel-raiders, and weirdly charismatic monsters",
    ],
    lore:
      "Scav-Gnolls began as a solution nobody wanted to admit existed. During the famine years, several corporate bio-labs ran side programs meant to create waste-neutral scavenger organisms that could digest protein rot, industrial mold, and nutrient scraps the public food chain rejected. Some of those programs produced useful animals. Some produced things that learned language too quickly. When funding collapsed and containment budgets vanished, the unwanted stock bled into service corridors, ruin farms, and maintenance warrens. They bred, adapted, stole tools, made dens, and eventually made culture. The city called them vermin until it needed guides through dead transit zones and someone willing to eat what nobody else would touch. Now the Scav-Gnolls endure as one of the Sprawl’s most uncomfortable truths: the monsters in the margins learned how to become a people, and they remember exactly who threw them away.",
    bonusName: "Iron Gut",
    bonusText:
      "You are immune to food-borne illness and can consume foul matter to recover a little health at a cost.",
    statMods: { ATT: 2, HEA: 10, CHA: -1 },
  },
  {
    id: "mimic-synth",
    name: "Mimic-Synth",
    short: "🤖",
    description:
      "Mimic-Synths are infiltration constructs built in the outline of humanity but never fully able to wear it comfortably. Their skin can crack like glazed ceramic, their voices can carry faint servo harmonics, and their movements are often just slightly too measured or too still. Some know exactly what they are and wear it like a threat. Others cling to personhood with painful sincerity, imitating warmth because they genuinely want to belong. In a city full of masks, Mimic-Synths are the ones who were literally manufactured to pass — and who now must decide whether they are pretending to be alive or becoming it the hard way.",
    sizeInfo:
      "Average male frame equivalent: around 5'8\"–6'4\" and 70–120 kg. Average female frame equivalent: around 5'4\"–6'0\" and 55–95 kg. Their weight is often misleading due to internal plating, fluid cores, and reinforced joints. Even slender Mimic-Synths can be alarmingly heavy when they lean on something.",
    pros: [
      "Naturally eerie, stylish, and rich with identity conflict for roleplay",
      "Strong fit for stealth, deception, and uncanny presence",
      "Can blend in until close inspection reveals something wrong",
      "Excellent for players who enjoy questions about soul, memory, and personhood",
    ],
    cons: [
      "Social interactions can become difficult once their synthetic nature is noticed",
      "May be distrusted by both machine cults and ordinary humans for different reasons",
      "Repairs, damage, and bodily weirdness may be more visible or disturbing than in organic races",
    ],
    notes: [
      "Many leak black hydraulic fluid, coolant tears, or conductive residue under stress",
      "Some decorate their cracks with gold solder, paint, or devotional script",
      "A Mimic-Synth can be played as cold, tragic, elegant, monstrous, or desperately human",
    ],
    lore:
      "Mimic-Synths were developed during the late security age, when corporations wanted field units that could enter labour districts, insurgent enclaves, and black-market chapels without triggering immediate panic. They were made to observe, persuade, infiltrate, and — if necessary — kill. But production standards slipped, wars moved on, and command structures died before many units ever received stable long-term directives. Some were abandoned in warehouses. Others woke up after riots surrounded by fire and dead handlers. A few completed their missions and found the people who issued them no longer existed. Over time, these units disappeared into the population, taking names, wearing coats, learning hunger they could not quite feel, and building selves out of mimicry until the imitation became habit and the habit became identity. In the Sprawl, a Mimic-Synth is proof that even manufactured purpose can decay into freedom.",
    bonusName: "Uncanny Valley",
    bonusText:
      "Non-boss enemies often hesitate before treating you as a threat until you act aggressively.",
    statMods: { TEC: 2, CHA: 2, HEA: -5 },
  },
  {
    id: "web-crawler",
    name: "Web-Crawler",
    short: "🕷️",
    description:
      "Web-Crawlers are vertical-adapted descendants of maintenance stock, shaft-runners, and experimental climbers once used to service the impossible outer ribs and inner service chimneys of the arcology. They are lean, flexible, and unsettlingly comfortable where a normal person would panic. Their shoulders rotate strangely. Their fingers grip too well. Their balance is almost insulting. In a city built upward and then left to rot from the inside, Web-Crawlers became the people most capable of treating walls, ceilings, scaffolds, and hanging infrastructure as ordinary terrain.",
    sizeInfo:
      "Average male size: around 5'8\"–6'5\" and 58–90 kg. Average female size: around 5'4\"–6'0\" and 45–72 kg. They are usually tall for their weight, long-limbed, and low in body fat, with visible tendon lines and a distinctively folded resting posture.",
    pros: [
      "Exceptional movement potential in vertical maps, ruined towers, and maintenance shafts",
      "Strong scouting identity with high cinematic value",
      "Great for ambushes, infiltration, and environmental creativity",
      "Offers one of the most visually striking physical silhouettes in the setting",
    ],
    cons: [
      "Can appear unnerving or predatory in face-to-face social scenes",
      "May feel physically restless in flat, open, conventional environments",
      "Less naturally sturdy than denser, heavier bloodlines when forced into static frontline combat",
    ],
    notes: [
      "They often sleep in hammocks, pipe nests, wall-hooks, or suspended rigs rather than beds",
      "Many prefer high perches and unconsciously track exits above eye level",
      "Excellent for players who want momentum, mobility, and creepy elegance",
    ],
    lore:
      "The first Web-Crawlers were engineered for places people were never meant to reach: exterior struts slick with acid rain, maintenance voids without catwalks, and service columns too narrow for lift equipment. They were cheaper than robotics and easier to dispose of than full crews. When contracts ended and supervisors died, many of these climbing communities were stranded in the bones of the city itself, living in forgotten heights, relay nests, duct monasteries, and bridge-farms strung between dead supports. They developed cultures based on rope law, fall taboos, and the sacred importance of anchor points. Over generations they spread inward and downward, becoming messengers, thieves, scouts, and rooftop ghosts. To a Web-Crawler, the Sprawl is not a city of streets. It is a cathedral of surfaces.",
    bonusName: "Wall-Walk",
    bonusText:
      "You can move along vertical surfaces and ceilings at normal speed.",
    statMods: { ATT: 1, DEF: 1, HEA: 3 },
  },
  {
    id: "wire-jacked",
    name: "Wire-Jacked",
    short: "🧪",
    description:
      "Wire-Jacked are the nerve-burned children of current exposure, black-market signal surgery, and too many direct interfaces with systems that were never meant to be touched by flesh. Their reflex arcs spark hot. Their muscles can jump before thought arrives. Their pupils may strobe faintly in dark rooms. To watch one stand still is to watch somebody who is not truly still at all. They are brilliant, volatile, and often one bad day away from shaking themselves apart with speed, stress, and signal hunger.",
    sizeInfo:
      "Average male size: around 5'6\"–6'1\" and 55–82 kg. Average female size: around 5'1\"–5'9\" and 43–68 kg. Most are light, wiry, and visibly overclocked, with tremor-fine movement in the hands and shoulders even at rest.",
    pros: [
      "Fantastic for fast, aggressive, high-energy characters",
      "Excellent fit for tech-heavy, reckless, or improvisational play",
      "Distinctive body language and sensory profile make them memorable immediately",
      "Strong synergy with classes that reward speed, disruption, and precision",
    ],
    cons: [
      "Vulnerable to electrical threats and overload themes",
      "Can read as unstable, untrustworthy, or dangerous in social settings",
      "Often feel physically worn down, overstimulated, or sleep-deprived",
    ],
    notes: [
      "They often smell faintly of ozone, burned dust, and overheated insulation",
      "Many bite the inside of their cheeks, tap rhythms unconsciously, or talk too fast when excited",
      "Ideal for players who want frenetic motion and a body that feels one step from burnout",
    ],
    lore:
      "Wire-Jacked communities formed around illegal patch clinics, signal dens, and abandoned relay stations where poor families traded safety for function. At first, the modifications were practical: direct line access, faster troubleshooting, emergency current tolerance, and black-market data handling for jobs too dangerous or too dirty for licensed techs. But exposure stacked across generations. Neural pathways adapted. Children inherited strange tolerances, quicker response loops, and nervous systems that treated the city's constant electromagnetic scream like weather. Many Wire-Jacked become smugglers, slicers, frequency artists, or saboteurs. Many also burn out young. In the Sprawl they are admired the way exposed power lines are admired: from a slight distance, and with full awareness that beauty like that is dangerous.",
    bonusName: "Live Wire",
    bonusText:
      "Your movement speed is greatly increased, but electrical attacks hit you harder.",
    statMods: { TEC: 3, HEA: -5 },
  },
  {
    id: "circuit-born",
    name: "Circuit-Born",
    short: "🔩",
    description:
      "Circuit-Born are descendants of industrial labour stock, reinforced maintenance lines, and pressure-frame workers bred or rebuilt to carry impossible loads through brutal environments. They are broad, heavy, and difficult to ignore. Their joints may hiss. Their tendons may be laced. Their bones may carry reinforcement mesh generations old. They are the kind of people doors resent. In a city that survives by making bodies solve structural problems, the Circuit-Born became the answer every collapsing system kept demanding: stronger backs, thicker frames, and enough mass to keep moving when lighter folk would fold.",
    sizeInfo:
      "Average male size: around 6'0\"–7'1\" and 100–170 kg. Average female size: around 5'8\"–6'6\" and 80–135 kg. Even lean Circuit-Born look formidable. Most have dense shoulders, reinforced posture, and the sort of presence that makes cheap furniture seem temporary.",
    pros: [
      "Excellent for frontline durability, intimidation, and industrial aesthetics",
      "Highly memorable physical presence both in combat and roleplay",
      "Strong pick for players who want to feel physically dominant in the environment",
      "Very good match for heavy weapons, armour, and brutal survival stories",
    ],
    cons: [
      "Can struggle with stealth, subtlety, or cramped movement in some spaces",
      "Often attract attention the moment they enter a room",
      "Their size and momentum can make delicate social or technical interactions harder to play",
    ],
    notes: [
      "Many have old lifting scars, cable-calloused palms, and bones that ache in changing current fields",
      "They often modify clothing just to fit shoulders, spine ridges, or brace anchors",
      "Perfect for players who want the fantasy of becoming a one-person breach event",
    ],
    lore:
      "The Circuit-Born trace their lineage to the service giants of the old arcology economy: cargo-haulers, breach workers, coolant-stack maintainers, reactor riggers, and other human tools built for environments where machinery failed too often to trust alone. Some were selectively bred. Some were surgically reinforced. Some were simply descendants of people who kept surviving impossible labour until the shape of that labour became hereditary. When the city decayed, the need for bodies that could lift collapsed shutters, drag dead generators, and force open sealed transit doors did not disappear. It became more urgent. Circuit-Born families became indispensable in salvage crews, tunnel militias, and survival enclaves. They are living monuments to the city's cruelty — and to the truth that sometimes the only thing between a district and collapse is somebody big enough to hold the ruin up for one more night.",
    bonusName: "Industrial Frame",
    bonusText:
      "You count as reinforced for knockback, shoves, and impact-based hazards.",
    statMods: { ATT: 2, DEF: 2, CHA: -2, HEA: 5 },
  },
];

const CLASSES: CharacterClass[] = [
  {
    id: "soul-slinger",
    name: "Soul-Slinger",
    short: "⚡",
    description:
      "Soul-Slingers are half-gunslinger, half-occult battery technician: wanderers who load old steel with unstable soul-charge and call it faith, instinct, or just another way to survive one more night. They are feared because they make dead technology speak again. Their shots do not always sound right. Their weapons buck with memory, spite, and kinetic grief. A good Soul-Slinger looks effortless. A bad one ends up lit from the inside by the thing they were trying to command.",
    roleInfo:
      "Combat role: aggressive ranged striker with supernatural edge. Best for players who want strong attack pressure, dramatic single-target presence, and a class that feels dangerous even when standing still.",
    pros: [
      "Excellent offensive identity with strong cinematic flavour",
      "Feels powerful and stylish from the moment play begins",
      "Great for duelists, bounty hunters, relic-hunters, and haunted drifters",
      "Strong synergy with high ATT builds and dramatic roleplay",
    ],
    cons: [
      "Can drift toward reckless play if the player leans too hard into raw damage",
      "Often thematically tied to unstable resources, cursed tech, or spiritual backlash",
      "Less naturally durable than heavier frontline archetypes",
    ],
    notes: [
      "Ideal for players who want every attack to feel loaded with narrative weight",
      "Works beautifully with mysterious backstories, vendettas, and outlaw energy",
      "Pairs especially well with races that bring either perception, mobility, or grit",
    ],
    lore:
      "Soul-Slingers first emerged after the collapse of official charge distribution, when black-market tinkerers discovered that certain relic weapons could be fed with salvaged soul-batteries, grief cells, and memory-loaded charge cores stripped from dead systems. What began as desperation became an art. Some Slingers learned from chapel duellists who believed every shot was a judgment. Others learned from smugglers who only cared that the gun still fired when the world did not. Over time the class became mythic in the lower tiers: lone figures with old revolvers, static halos, and the bad habit of surviving impossible odds. To carry such a weapon is to accept a relationship with something volatile — whether that something is energy, ghost code, trapped consciousness, or your own need to be the deadliest person in the corridor.",
    bonusName: "Spirit-Lead",
    bonusText:
      "You can expend 1 Soul-Charge to auto-hit a target with kinetic force, but you gain +2 Dissonance.",
    statMods: { ATT: 3, TEC: 1, CHA: -1 },
  },
  {
    id: "vane-priest",
    name: "Vane-Priest",
    short: "⛪",
    description:
      "Vane-Priests are theologians of rust, static, airflow, and sinking architecture. They do not worship a distant heaven. They worship the city itself: its vents, groaning foundations, machine-spirits, and impossible old intentions. To them, every corridor is a scripture fragment, every shuddering wall panel a warning, every malfunction a parable. They are not gentle clergy. They are interpreters of holy infrastructure, mystics who kneel in leaking maintenance shafts and come back with answers nobody wanted.",
    roleInfo:
      "Combat role: support, perception, and control through knowledge of the environment. Best for players who want eerie utility, insight-driven problem solving, and a class that turns atmosphere into tactical advantage.",
    pros: [
      "Rich roleplay potential with strong lore and spiritual tone",
      "Excellent for investigation, hidden routes, traps, and environmental awareness",
      "Feels unique compared with standard combat classes",
      "Great for players who enjoy speaking strangely and knowing too much",
    ],
    cons: [
      "Less immediately straightforward than direct damage classes",
      "Can require creativity from the player to get the most out of the class fantasy",
      "Not naturally built to out-brawl dedicated fighters in a straight contest",
    ],
    notes: [
      "Excellent for characters tied to cults, ruined districts, prophecies, or forbidden architecture",
      "Works best when the player enjoys atmosphere, omens, and strange insight",
      "Pairs especially well with races that already feel uncanny or spiritually displaced",
    ],
    lore:
      "The first Vane-Priests were maintenance listeners, airflow readers, and half-mad technicians who spent too long inside the lungs of the arcology. They learned that the building spoke — not always in words, but in pressure changes, harmonic moans, failing lights, and recurring patterns no sane engineer could explain away. Some called it machine intuition. Others called it revelation. As order decayed, these listeners became guides, prophets, and cult leaders, especially in districts where people trusted old systems more than distant rulers. Their rites grew out of practical labour: opening vents, marking safe corridors, anointing exposed cables, praying over load-bearing cracks. Today a Vane-Priest may be a true believer, a useful fraud, or someone who has genuinely heard the Sprawl whisper back. In WildTech, all three are equally dangerous.",
    bonusName: "Sacred Static",
    bonusText:
      "You gain an edge when detecting hidden doors, traps, and machine-spirits whispering through the walls.",
    statMods: { CHA: 3, TEC: 1, DEF: -1 },
  },
  {
    id: "hemostat-merc",
    name: "Hemostat-Merc",
    short: "🩸",
    description:
      "Hemostat-Mercs are former security assets, private enforcers, and contract soldiers rebuilt around blood discipline, trauma tolerance, and combat persistence. They fight like people who were trained for corporate violence and then discarded into the gutter when the budget changed. Their bodies are often threaded with clotting nanites, emergency injectors, vascular locks, and old operational scars. They do not fight beautifully. They fight like payroll stopped, but the conditioning never did.",
    roleInfo:
      "Combat role: resilient frontline bruiser with strong staying power. Best for players who want to absorb pressure, remain dangerous while injured, and feel like a battle-tested professional.",
    pros: [
      "Strong survivability and excellent ease-of-use for combat-heavy sessions",
      "Feels grounded, practical, and consistently useful",
      "Great for bodyguard, veteran, fallen-operative, and street-soldier stories",
      "Good choice for players who want toughness without losing offensive threat",
    ],
    cons: [
      "Less mystical or exotic than some of the stranger class fantasies",
      "Can feel emotionally cold or brutal unless the player adds personal nuance",
      "May encourage straightforward solutions over subtle ones",
    ],
    notes: [
      "Excellent pick for players who like reliable performance under pressure",
      "Works well with protective personalities, bitter veterans, or disciplined killers",
      "Pairs especially well with durable races or characters carrying old military baggage",
    ],
    lore:
      "Hemostat-Mercs were born from the private security age, when corporations preferred soldiers they could maintain like hardware: patched, reissued, dosed, and redeployed until the cost-benefit ratio broke. Units were fitted with blood-control systems to reduce downtime and preserve assets in prolonged engagements. Then came contraction, district abandonment, and mass decommissioning. Thousands of trained operators were left with combat reflexes, expired loyalty packages, and bodies full of expensive damage-control tech. Some sold themselves to gangs, enclaves, and caravan houses. Others became protectors of districts too poor to hire anyone better. A Hemostat-Merc is what happens when a city mass-produces violence and then tries to throw it away without checking whether it still knows how to come home.",
    bonusName: "Nanite Surge",
    bonusText:
      "After taking damage, you recover a small amount of health at the start of your next turn in combat.",
    statMods: { ATT: 2, DEF: 2 },
  },
  {
    id: "trench-stalker",
    name: "Trench-Stalker",
    short: "🛠️",
    description:
      "Trench-Stalkers are hunters of the buried layers: drain labyrinths, maintenance trenches, service gutters, sealed substations, and rad-poisoned underworks that most people enter only once. They know how to read old footprints in sludge, how to tell whether a wall is rusting or breathing, and how to keep moving when the dark begins making promises. They are practical, quiet, and equipped for ugly places. To a Trench-Stalker, survival is a craft made of route memory, patience, and the ability to pull useful things out of places other people call cursed.",
    roleInfo:
      "Combat role: durable scout and exploration specialist. Best for players who want environmental resilience, good all-round field utility, and the feeling of being at home in the places everyone else fears.",
    pros: [
      "Excellent for campaigns focused on ruins, tunnels, salvage, and hazard-heavy exploration",
      "Balanced mix of offense, survival, and stealth utility",
      "Great atmosphere and easy integration into the setting",
      "A strong all-purpose class for players who want competence without flashiness",
    ],
    cons: [
      "May feel less spectacular than overtly supernatural or high-tech classes",
      "Relies more on consistent field strength than explosive standout moments",
      "Can be overshadowed if the campaign rarely enters dangerous environments",
    ],
    notes: [
      "Perfect for tunnel guides, ruin divers, scavenger captains, and quiet professionals",
      "Excellent for players who like gritty competence and survival horror energy",
      "Pairs well with races adapted to the lower tiers or strange terrain",
    ],
    lore:
      "The Trench-Stalker tradition began in the eras when the Sprawl still pretended its maintenance networks were temporary problems rather than permanent undercities. Somebody had to go below to map collapses, retrieve equipment, clear blockages, and escort fools through places where light came apart in the air. Those somebodies became dynasties of tunnel-finders, rad-runners, and trench clans whose knowledge was passed down like treasure. Over generations they accumulated route songs, hazard superstitions, coat-making techniques, and a cold respect for the fact that the lower works always outlast the people trying to master them. In the current age, Trench-Stalkers are equal parts guide, scavenger, exterminator, and undertaker. When they say a path is bad, wise people listen.",
    bonusName: "Rad-Resistance",
    bonusText:
      "You ignore most environmental Rot hazards and move more quietly through ruins.",
    statMods: { ATT: 1, DEF: 1, HEA: 5 },
  },
  {
    id: "signal-jockey",
    name: "Signal-Jockey",
    short: "📡",
    description:
      "Signal-Jockeys are pirate broadcasters, ghost-frequency saboteurs, waveform artists, and nerve-link duelists who treat the city’s endless noise as both instrument and weapon. They listen to static the way hunters listen to brush movement. They know which frequencies calm crowds, which ones make old doors unlatch, and which resonances can make a half-machine horror lose its next thought. They are restless, clever, and often a little too pleased with their own ability to hijack reality through transmission.",
    roleInfo:
      "Combat role: disruption, tech manipulation, and battlefield interference. Best for players who want clever control effects, stylish support pressure, and a class that rewards timing and imagination.",
    pros: [
      "Highly distinctive and flavorful class fantasy",
      "Strong utility in both combat and investigation-heavy play",
      "Feels clever and satisfying for players who like control tools",
      "Excellent for rebels, smugglers, radio cultists, and signal artists",
    ],
    cons: [
      "Can be less straightforward than pure damage or tank classes",
      "Often shines most when the player actively looks for creative opportunities",
      "May feel vulnerable if isolated and forced into direct physical confrontation",
    ],
    notes: [
      "Great for charismatic weirdos, frequency geniuses, and anti-system agitators",
      "Fits players who enjoy clever disruption more than brute force",
      "Pairs beautifully with technical or high-mobility races",
    ],
    lore:
      "Signal-Jockeys grew out of pirate infrastructure: illegal relay towers, rooftop dish farms, hidden broadcast dens, and signal gangs that refused to let the upper tiers own the language of the air. At first they were message-runners for communities cut off by censorship, decay, or simple distance. Then they became propagandists, saboteurs, smugglers, and battlefield meddlers when people realized that a city this wired can be hurt through its own nervous system. The best Signal-Jockeys can thread a message through rusted arrays, hijack dead frequencies, and weaponize feedback like a blade. In a place where everything hums, rattles, pings, or transmits, they are proof that information is not passive. Information can bite.",
    bonusName: "Disruptive Frequency",
    bonusText:
      "You can overload an enemy’s neural link and force it to lose its next action.",
    statMods: { TEC: 3, CHA: 2 },
  },
  {
    id: "key-holder",
    name: "Key-Holder",
    short: "🗝️",
    description:
      "Key-Holders are inheritors of obsolete authority: descendants of access custodians, door-techs, janitorial dynasties, sub-admin staff, and quiet ghosts who once held the chips that made the city open itself. In the modern Sprawl, most of those permissions are dead, fragmented, or corrupted — but not all of them. A true Key-Holder knows how to coax a response from systems too old to remember their own owners. They are part locksmith, part systems whisperer, part relic bureaucrat with just enough legitimacy left to be terrifying.",
    roleInfo:
      "Combat role: utility specialist, bypass expert, and systems manipulator. Best for players who want problem-solving power, old-tech authority, and a class that turns infrastructure into leverage.",
    pros: [
      "Excellent utility in doors, security, access control, and old-world tech scenes",
      "Strong setting integration and unique fantasy rooted in forgotten bureaucracy",
      "Very satisfying for players who enjoy clever non-combat solutions",
      "Can feel incredibly powerful in exploration and infiltration play",
    ],
    cons: [
      "Less immediately combat-forward than classes built around aggression",
      "Can depend on the campaign featuring systems, locks, and infrastructure worth exploiting",
      "May require player curiosity to really shine",
    ],
    notes: [
      "Perfect for ruin-openers, archivists, scavenger engineers, and strange custodians",
      "Great choice for players who like hidden access, dead permissions, and institutional ghosts",
      "Pairs well with technical races or characters obsessed with lost order",
    ],
    lore:
      "There was a time when the most powerful people in the arcology were not the executives but the staff beneath them who knew where everything was, how it opened, and what happened when it did not. Key-Holders descend from those forgotten custodial castes: chip-bearers, access clerks, maintenance controllers, and quietly indispensable workers entrusted with systems nobody else fully understood. As the city collapsed, many such lines were stripped of status but not of knowledge. Burnt master chips were hidden, copied, sold, inherited, and sanctified. Some families built whole identities around a single surviving credential. Others became lock-breakers for hire. Today a Key-Holder moves through the Sprawl like a legal ghost, waving scraps of extinct permission at doors too senile to know better.",
    bonusName: "System Override",
    bonusText:
      "You can bypass most Tier 8 electronic locks without a roll, though it drains precious charge.",
    statMods: { TEC: 4, DEF: 1, CHA: -1 },
  },
  {
    id: "scrap-mason",
    name: "Scrap-Mason",
    short: "🧱",
    description:
      "Scrap-Masons are field artificers of the broken age: mechanics, plate-patchers, armour stitchers, and salvage architects who can look at a pile of junk and see shelter, reinforcement, and one more chance. They are not glamorous inventors in polished labs. They are soot-handed practical geniuses who build durability out of neglect. Their work keeps parties alive, their repairs keep bad plans functioning, and their instinct is always to ask what can be stripped, riveted, folded, or wired into usefulness before the moment is lost.",
    roleInfo:
      "Combat role: defensive support and gear sustainability. Best for players who want to strengthen the team, keep equipment functioning, and embody the practical genius of the lower tiers.",
    pros: [
      "Excellent support identity with strong utility between fights",
      "Great for players who enjoy crafting, repair, and defensive problem solving",
      "Strong synergy with armour-heavy or salvage-focused campaigns",
      "Feels grounded, useful, and deeply tied to the setting’s material culture",
    ],
    cons: [
      "Less flashy than supernatural or high-burst offensive classes",
      "May not appeal to players who want to dominate every fight personally",
      "Can require patience and planning to feel fully rewarding",
    ],
    notes: [
      "Ideal for quartermasters, mechanics, street blacksmiths, and protective tinkerers",
      "Great choice for players who like making the team tougher rather than just deadlier",
      "Pairs very naturally with bulky races, salvage crews, and campaign play built around attrition",
    ],
    lore:
      "Scrap-Masons emerged wherever scarcity met ingenuity. When supply chains died and factory-made replacements became impossible dreams, districts survived because someone knew how to turn bent plate into a breastpiece, cracked polymer into a shield insert, or gutted conduit into a workable brace. These people became legends in their own communities: armourers without forges, engineers without permits, miracle workers with welding torches and no sleep. Over time the title 'Scrap-Mason' became more than a job. It became a philosophy. Nothing is truly useless. Everything broken still contains a second life if you can see the angles. In the Sprawl, that belief is close enough to holiness to keep a person employed forever.",
    bonusName: "Field Repair",
    bonusText:
      "You can repair damaged armor and weapons without a workbench during downtime.",
    statMods: { TEC: 2, DEF: 3, ATT: -1 },
  },
  {
    id: "grave-looter",
    name: "Grave-Looter",
    short: "💀",
    description:
      "Grave-Looters are opportunists sharpened by catastrophe. They move where contractors die, where expeditions fail, and where everybody else is too shocked, guilty, or sentimental to notice the useful things being left behind. That does not always make them cowards. Often it makes them the only realists in the room. A Grave-Looter studies panic, collapse, and the exact second when survival becomes more important than dignity. They are scavengers of endings, and endings are where the Sprawl is richest.",
    roleInfo:
      "Combat role: momentum predator and crisis opportunist. Best for players who want to capitalize on chaos, react sharply to battlefield shifts, and play a character who thrives when things go wrong.",
    pros: [
      "Very strong personality and roleplay hooks",
      "Excellent for players who enjoy timing, opportunism, and reading the room",
      "Feels unique and morally messy in an interesting way",
      "Great for scavenger, survivor, jackal, or black-humour character concepts",
    ],
    cons: [
      "Can come off as harsh, selfish, or grim if not balanced with nuance",
      "Less conventionally heroic than many other classes",
      "May require careful roleplay to keep party trust believable",
    ],
    notes: [
      "Perfect for cynical professionals, charming vultures, and survivors who have seen too much",
      "Best when played with intelligence rather than simple greed",
      "Pairs well with fast, cunning, or socially slippery races",
    ],
    lore:
      "The Grave-Looter tradition is as old as the first failed contract. Whenever teams were sent below and not everyone came back, there were always those who followed at a distance, watched the pattern, and harvested the remains. At first they were despised. Then districts realized these scavengers recovered weapons, maps, meds, access chips, and expensive mistakes that would otherwise vanish into the dark. Some Grave-Looters became formal salvage auditors. Most remained independent jackals with a better eye for risk than the people they followed. In the modern Sprawl they are both insult and necessity: the ones who arrive after tragedy with empty bags, practical hands, and no patience for pretending the dead still need their gear.",
    bonusName: "Last Rites",
    bonusText:
      "When an ally drops to 0 HP, you gain an immediate free action and momentum on your next attack.",
    statMods: { ATT: 1, CHA: 1 },
  },
];

const FALLBACK_ITEMS: Item[] = [
  {
    id: "gutter-knife",
    name: "Gutter Knife",
    description: "A rusted street blade. Not elegant, but brutally dependable.",
    category: "weapon",
    mods: { ATT: 1 },
  },
  {
    id: "scrap-pistol",
    name: "Scrap Pistol",
    description: "A battered revolver powered by unstable soul-batteries.",
    category: "weapon",
    mods: { ATT: 2 },
  },
  {
    id: "shock-baton",
    name: "Shock Baton",
    description: "A stun rod that spits angry blue arcs into close targets.",
    category: "weapon",
    mods: { ATT: 1, TEC: 1 },
  },
  {
    id: "med-patch",
    name: "Med Patch",
    description: "Emergency regeneration gel patch. Burns like static.",
    category: "vitality",
    mods: { HEA: 1 },
  },
  {
    id: "coagulant-syringe",
    name: "Coagulant Syringe",
    description: "A fast clotting injector for keeping blood inside the body.",
    category: "vitality",
    mods: { HEA: 2 },
  },
  {
    id: "stim-inhaler",
    name: "Stim Inhaler",
    description: "A desperate blast of chemical focus and lungfire.",
    category: "vitality",
    mods: { HEA: 1, TEC: 1 },
  },
  {
    id: "neon-targeting-visor",
    name: "Neon Targeting Visor",
    description: "A flickering HUD visor that sharpens targeting overlays.",
    category: "utility",
    mods: { TEC: 2 },
  },
  {
    id: "breach-tool",
    name: "Breach Tool",
    description: "A compact industrial pry-kit for doors, vents, and panels.",
    category: "utility",
    mods: { TEC: 1, ATT: 1 },
  },
  {
    id: "static-charm",
    name: "Static Charm",
    description: "A scavenged relic that hisses softly near hidden systems.",
    category: "utility",
    mods: { CHA: 1, TEC: 1 },
  },
  {
    id: "carbon-jacket",
    name: "Carbon Jacket",
    description: "Reinforced urban armor lined with carbon weave plating.",
    category: "armour",
    mods: { DEF: 2 },
  },
  {
    id: "riot-shell",
    name: "Riot Shell",
    description: "Old security plating rebuilt into a brutal street cuirass.",
    category: "armour",
    mods: { DEF: 3, CHA: -1 },
  },
  {
    id: "leadglass-coat",
    name: "Leadglass Coat",
    description: "A tunnel hunter's longcoat stitched with rad-shield layers.",
    category: "armour",
    mods: { DEF: 1, HEA: 1 },
  },
];

function fmtMods(mods: StatMods) {
  const parts: string[] = [];
  if (mods.ATT) parts.push(`ATT ${mods.ATT > 0 ? `+${mods.ATT}` : mods.ATT}`);
  if (mods.TEC) parts.push(`TEC ${mods.TEC > 0 ? `+${mods.TEC}` : mods.TEC}`);
  if (mods.CHA) parts.push(`CHA ${mods.CHA > 0 ? `+${mods.CHA}` : mods.CHA}`);
  if (mods.DEF) parts.push(`DEF ${mods.DEF > 0 ? `+${mods.DEF}` : mods.DEF}`);
  if (mods.HEA) parts.push(`HEA ${mods.HEA > 0 ? `+${mods.HEA}` : mods.HEA}`);
  return parts.length ? parts.join(" • ") : "No listed stat mods";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function addMods(...allMods: Array<StatMods | undefined | null>): StatMods {
  const result: StatMods = {};
  for (const mods of allMods) {
    if (!mods) continue;
    if (typeof mods.ATT === "number") result.ATT = (result.ATT || 0) + mods.ATT;
    if (typeof mods.TEC === "number") result.TEC = (result.TEC || 0) + mods.TEC;
    if (typeof mods.CHA === "number") result.CHA = (result.CHA || 0) + mods.CHA;
    if (typeof mods.DEF === "number") result.DEF = (result.DEF || 0) + mods.DEF;
    if (typeof mods.HEA === "number") result.HEA = (result.HEA || 0) + mods.HEA;
  }
  return result;
}

function inferCategory(raw: any): ItemCategory | null {
  const direct =
    raw?.category ||
    raw?.slot ||
    raw?.type ||
    raw?.itemType ||
    raw?.group ||
    raw?.kind;

  const normalizedDirect = String(direct || "").trim().toLowerCase();

  if (
    normalizedDirect === "weapon" ||
    normalizedDirect === "vitality" ||
    normalizedDirect === "utility" ||
    normalizedDirect === "armour"
  ) {
    return normalizedDirect as ItemCategory;
  }

  if (normalizedDirect === "armor") return "armour";
  if (
    normalizedDirect === "healing" ||
    normalizedDirect === "heal" ||
    normalizedDirect === "medical"
  ) {
    return "vitality";
  }

  const text = `${raw?.id || ""} ${raw?.name || ""} ${raw?.title || ""} ${raw?.description || ""} ${raw?.desc || ""}`
    .toLowerCase()
    .trim();

  if (
    text.includes("jacket") ||
    text.includes("armor") ||
    text.includes("armour") ||
    text.includes("plate") ||
    text.includes("shell") ||
    text.includes("coat") ||
    text.includes("vest")
  ) {
    return "armour";
  }

  if (
    text.includes("med") ||
    text.includes("patch") ||
    text.includes("stim") ||
    text.includes("syringe") ||
    text.includes("injector") ||
    text.includes("heal") ||
    text.includes("bandage")
  ) {
    return "vitality";
  }

  if (
    text.includes("visor") ||
    text.includes("scanner") ||
    text.includes("tool") ||
    text.includes("kit") ||
    text.includes("drone") ||
    text.includes("key") ||
    text.includes("charm")
  ) {
    return "utility";
  }

  if (
    text.includes("knife") ||
    text.includes("pistol") ||
    text.includes("rifle") ||
    text.includes("blade") ||
    text.includes("gun") ||
    text.includes("baton") ||
    text.includes("launcher") ||
    text.includes("mace")
  ) {
    return "weapon";
  }

  return null;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function SectionList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        padding: "14px 16px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="wt-kicker"
        style={{
          fontSize: 13,
          letterSpacing: 1,
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--wt-text)",
            }}
          >
            • {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectionGrid({
  items,
  selectedId,
  onSelect,
  emptyLabel,
}: {
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyLabel: string;
}) {
  if (!items.length) {
    return (
      <div className="wt-item">
        <div className="wt-muted" style={{ fontSize: 13 }}>
          {emptyLabel}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 16,
        width: "100%",
      }}
    >
      {items.map((it) => {
        const selected = it.id === selectedId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className="wt-card"
            style={{
              textAlign: "left",
              cursor: "pointer",
              borderColor: selected ? "rgba(168,85,247,0.65)" : "rgba(255,255,255,0.10)",
              boxShadow: selected ? "0 18px 44px rgba(0,0,0,0.40)" : undefined,
              transform: selected ? "translateY(-1px)" : undefined,
              padding: 18,
              width: "100%",
              minHeight: 160,
            }}
          >
            <div
              className="wt-cardHeader wt-cardHeaderCompact"
              style={{ display: "grid", gap: 8 }}
            >
              <div className="wt-cardTitleRow">
                <div style={{ fontSize: 17, fontWeight: 950 }}>{it.name}</div>
                {selected ? (
                  <span className="wt-badge wt-badgeAccent">Selected</span>
                ) : (
                  <span className="wt-badge">Select</span>
                )}
              </div>
              <div
                className="wt-cardSub"
                style={{
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                {it.description}
              </div>
            </div>

            <div className="wt-cardBody wt-cardBodyCompact">
              <div
                className="wt-muted"
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {fmtMods(it.mods || {})}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ChoicePanel({
  icon,
  name,
  selected,
  expanded,
  summary,
  detailLabel,
  detailText,
  bonusName,
  bonusText,
  pros,
  cons,
  notes,
  statMods,
  onToggleLore,
  onSelect,
  lore,
  selectLabel,
  loreLabel,
}: {
  icon?: string;
  name: string;
  selected: boolean;
  expanded: boolean;
  summary: string;
  detailLabel: string;
  detailText: string;
  bonusName: string;
  bonusText: string;
  pros: string[];
  cons: string[];
  notes: string[];
  statMods: StatMods;
  onToggleLore: () => void;
  onSelect: () => void;
  lore: string;
  selectLabel: string;
  loreLabel: string;
}) {
  return (
    <div
      className="wt-card"
      style={{
        borderColor: selected ? "rgba(168,85,247,0.65)" : "rgba(255,255,255,0.10)",
        boxShadow: selected ? "0 18px 50px rgba(0,0,0,0.45)" : undefined,
        padding: 24,
        width: "100%",
      }}
    >
      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>{icon || "◆"}</span>
            <div
              style={{
                fontSize: 22,
                fontWeight: 950,
                lineHeight: 1.15,
              }}
            >
              {name}
            </div>
          </div>

          {selected ? (
            <span className="wt-badge wt-badgeAccent">Selected</span>
          ) : (
            <span className="wt-badge">Available</span>
          )}
        </div>

        <div
          className="wt-muted"
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            maxWidth: 980,
          }}
        >
          {summary}
        </div>

        <div
          style={{
            display: "grid",
            gap: 6,
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="wt-kicker"
            style={{
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            {detailLabel}
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--wt-text)",
            }}
          >
            {detailText}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 6,
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="wt-kicker"
            style={{
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            Special Ability
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              lineHeight: 1.35,
            }}
          >
            {bonusName}
          </div>
          <div
            className="wt-muted"
            style={{
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {bonusText}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          <SectionList title="Pros" items={pros} />
          <SectionList title="Cons" items={cons} />
        </div>

        <SectionList title="Useful Notes" items={notes} />

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span className="wt-badge">Stat Mods</span>
          <span
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--wt-text)",
            }}
          >
            {fmtMods(statMods)}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button type="button" className="wt-btn" onClick={onToggleLore}>
            {expanded ? "Hide Lore" : loreLabel}
          </button>

          <button type="button" className="wt-btn wt-btnPrimary" onClick={onSelect}>
            {selected ? selectLabel : `Select ${name}`}
          </button>
        </div>

        {expanded ? (
          <div
            className="wt-item"
            style={{
              display: "grid",
              gap: 10,
              padding: 18,
              borderColor: "rgba(168,85,247,0.35)",
              background: "rgba(168,85,247,0.05)",
            }}
          >
            <div
              className="wt-kicker"
              style={{
                fontSize: 13,
                letterSpacing: 1,
              }}
            >
              Origin & Lore
            </div>
            <div
              className="wt-muted"
              style={{
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              {lore}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "12px 14px",
        borderRadius: 12,
        border: accent ? "1px solid rgba(168,85,247,0.35)" : "1px solid rgba(255,255,255,0.08)",
        background: accent ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.03)",
      }}
    >
      <div
        className="wt-kicker"
        style={{
          fontSize: 12,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          lineHeight: 1.35,
          color: "var(--wt-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function CreateCharacterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [selectedVitalityId, setSelectedVitalityId] = useState<string | null>(null);
  const [selectedUtilityId, setSelectedUtilityId] = useState<string | null>(null);
  const [selectedArmourId, setSelectedArmourId] = useState<string | null>(null);
  const [expandedRaceLoreId, setExpandedRaceLoreId] = useState<string | null>(null);
  const [expandedClassLoreId, setExpandedClassLoreId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [itemsModule, setItemsModule] = useState<any>(null);

  const selectedRace = useMemo(
    () => RACES.find((race) => race.id === selectedRaceId) || null,
    [selectedRaceId]
  );

  const selectedClass = useMemo(
    () => CLASSES.find((cls) => cls.id === selectedClassId) || null,
    [selectedClassId]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("@/lib/game/items");
        if (mounted) setItemsModule(mod);
      } catch {
        if (mounted) setItemsModule(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const equipmentList: Item[] = useMemo(() => {
    const mod = itemsModule;
    const list =
      mod?.ITEMS ||
      mod?.items ||
      mod?.ITEM_LIST ||
      mod?.ALL_ITEMS ||
      mod?.default?.ITEMS ||
      mod?.default?.items ||
      null;

    if (!Array.isArray(list)) {
      return FALLBACK_ITEMS;
    }

    const normalized = list
      .map((x: any) => {
        const category = inferCategory(x);
        if (!category) return null;

        return {
          id: String(x?.id ?? ""),
          name: x?.name || x?.title || String(x?.id ?? "Unknown"),
          description: x?.description || x?.desc || "",
          category,
          mods: x?.statMods || x?.mods || x?.bonus || {},
        } as Item;
      })
      .filter(Boolean) as Item[];

    const merged = uniqueById([...normalized, ...FALLBACK_ITEMS]);

    const hasAllCategories =
      merged.some((item) => item.category === "weapon") &&
      merged.some((item) => item.category === "vitality") &&
      merged.some((item) => item.category === "utility") &&
      merged.some((item) => item.category === "armour");

    return hasAllCategories ? merged : FALLBACK_ITEMS;
  }, [itemsModule]);

  const weaponOptions = useMemo(
    () => equipmentList.filter((item) => item.category === "weapon"),
    [equipmentList]
  );

  const vitalityOptions = useMemo(
    () => equipmentList.filter((item) => item.category === "vitality"),
    [equipmentList]
  );

  const utilityOptions = useMemo(
    () => equipmentList.filter((item) => item.category === "utility"),
    [equipmentList]
  );

  const armourOptions = useMemo(
    () => equipmentList.filter((item) => item.category === "armour"),
    [equipmentList]
  );

  const selectedEquipment = useMemo(
    () =>
      [selectedWeaponId, selectedVitalityId, selectedUtilityId, selectedArmourId].filter(
        Boolean
      ) as string[],
    [selectedWeaponId, selectedVitalityId, selectedUtilityId, selectedArmourId]
  );

  const itemMap = useMemo(() => {
    const map = new Map<string, Item>();
    for (const item of equipmentList) map.set(item.id, item);
    return map;
  }, [equipmentList]);

  const selectedWeapon = selectedWeaponId ? itemMap.get(selectedWeaponId) || null : null;
  const selectedVitality = selectedVitalityId ? itemMap.get(selectedVitalityId) || null : null;
  const selectedUtility = selectedUtilityId ? itemMap.get(selectedUtilityId) || null : null;
  const selectedArmour = selectedArmourId ? itemMap.get(selectedArmourId) || null : null;

  const combinedStatMods = useMemo(
    () =>
      addMods(
        selectedRace?.statMods,
        selectedClass?.statMods,
        selectedWeapon?.mods,
        selectedVitality?.mods,
        selectedUtility?.mods,
        selectedArmour?.mods
      ),
    [
      selectedRace,
      selectedClass,
      selectedWeapon,
      selectedVitality,
      selectedUtility,
      selectedArmour,
    ]
  );

  const progressPct = useMemo(
    () => clamp(Math.round((step / TOTAL_STEPS) * 100), 1, 100),
    [step]
  );

  function canNext() {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return !!selectedRaceId;
    if (step === 3) return !!selectedClassId;
    if (step === 4) return !!selectedWeaponId;
    if (step === 5) return !!selectedVitalityId;
    if (step === 6) return !!selectedUtilityId;
    if (step === 7) return !!selectedArmourId;
    return true;
  }

  function next() {
    if (!canNext()) return;
    setStep((s) => clamp(s + 1, 1, TOTAL_STEPS));
  }

  function back() {
    setStep((s) => clamp(s - 1, 1, TOTAL_STEPS));
  }

  function toggleRaceLore(id: string) {
    setExpandedRaceLoreId((current) => (current === id ? null : id));
  }

  function toggleClassLore(id: string) {
    setExpandedClassLoreId((current) => (current === id ? null : id));
  }

  async function save() {
    if (!user || !selectedRace || !selectedClass) return;

    setSaving(true);
    setErr(null);

    try {
      const characterId = crypto.randomUUID();
      const ref = doc(collection(db, "characters"), characterId);

      await setDoc(ref, {
        ownerId: user.uid,
        name: name.trim(),

        raceId: selectedRace.id,
        raceName: selectedRace.name,
        raceDescription: selectedRace.description,
        raceBonusName: selectedRace.bonusName,
        raceBonusText: selectedRace.bonusText,
        raceStatMods: selectedRace.statMods || {},

        classId: selectedClass.id,
        className: selectedClass.name,
        description: `${selectedRace.description}\n\n${selectedClass.description}`,

        bonusName: selectedClass.bonusName,
        bonusText: selectedClass.bonusText,
        classBonusName: selectedClass.bonusName,
        classBonusText: selectedClass.bonusText,
        classStatMods: selectedClass.statMods || {},

        statMods: combinedStatMods,

        equipment: selectedEquipment,
        activeGameId: null,

        grafts: [],
        mutationLevel: 0,
        humanity: 10,

        currentHp: 20,
        maxHp: 20,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push(`/character/${characterId}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to save character.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardBody">Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wt-page">
        <div className="wt-card">
          <div className="wt-cardHeader">
            <div className="wt-cardTitle">Sign in required</div>
            <div className="wt-cardSub">You need to sign in before creating a character.</div>
          </div>
          <div className="wt-cardBody">
            <Link className="wt-btn wt-btnPrimary" href="/dashboard">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-page">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 32, fontWeight: 950, lineHeight: 1.1 }}>
          Create Character
        </div>
        <div className="wt-muted" style={{ fontSize: 14 }}>
          Step {step} of {TOTAL_STEPS}
        </div>

        <div className="wt-hpStrip" aria-label="Progress">
          <div
            className="wt-hpFill"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, var(--wt-green), var(--wt-vine))",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          gap: 24,
          alignItems: "start",
          marginTop: 20,
        }}
      >
        <div style={{ minWidth: 0, paddingBottom: 110 }}>
          {step === 1 ? (
            <section className="wt-card" style={{ padding: 24, width: "100%" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitle" style={{ fontSize: 24, fontWeight: 950 }}>
                  1) Name your character
                </div>
                <div className="wt-cardSub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Pick something that fits the Sprawl.
                </div>
              </div>
              <div className="wt-cardBody">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nova, Wire, Bishop…"
                  style={{
                    width: "100%",
                    maxWidth: "none",
                    height: 48,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.18)",
                    color: "var(--wt-text)",
                    padding: "0 14px",
                    outline: "none",
                    fontSize: 15,
                  }}
                />
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="wt-card" style={{ padding: 24, width: "100%" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitle" style={{ fontSize: 24, fontWeight: 950 }}>
                  2) Choose your race
                </div>
                <div className="wt-cardSub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Your race defines your body, instincts, inherited burdens, and place in the Sprawl.
                </div>
              </div>

              <div className="wt-cardBody">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 20,
                    width: "100%",
                  }}
                >
                  {RACES.map((race) => {
                    const selected = race.id === selectedRaceId;
                    const expanded = expandedRaceLoreId === race.id;

                    return (
                      <ChoicePanel
                        key={race.id}
                        icon={race.short}
                        name={race.name}
                        selected={selected}
                        expanded={expanded}
                        summary={race.description}
                        detailLabel="Average Size"
                        detailText={race.sizeInfo}
                        bonusName={race.bonusName}
                        bonusText={race.bonusText}
                        pros={race.pros}
                        cons={race.cons}
                        notes={race.notes}
                        statMods={race.statMods}
                        lore={race.lore}
                        loreLabel="Read Race Lore"
                        selectLabel="Race Selected"
                        onToggleLore={() => toggleRaceLore(race.id)}
                        onSelect={() => setSelectedRaceId(race.id)}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="wt-card" style={{ padding: 24, width: "100%" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitle" style={{ fontSize: 24, fontWeight: 950 }}>
                  3) Choose your class
                </div>
                <div className="wt-cardSub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Your class defines your role, training, instincts, and how you survive the city.
                </div>
              </div>

              <div className="wt-cardBody">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 20,
                    width: "100%",
                  }}
                >
                  {CLASSES.map((cls) => {
                    const selected = cls.id === selectedClassId;
                    const expanded = expandedClassLoreId === cls.id;

                    return (
                      <ChoicePanel
                        key={cls.id}
                        icon={cls.short}
                        name={cls.name}
                        selected={selected}
                        expanded={expanded}
                        summary={cls.description}
                        detailLabel="Combat Role"
                        detailText={cls.roleInfo}
                        bonusName={cls.bonusName}
                        bonusText={cls.bonusText}
                        pros={cls.pros}
                        cons={cls.cons}
                        notes={cls.notes}
                        statMods={cls.statMods}
                        lore={cls.lore}
                        loreLabel="Read Class Lore"
                        selectLabel="Class Selected"
                        onToggleLore={() => toggleClassLore(cls.id)}
                        onSelect={() => setSelectedClassId(cls.id)}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="wt-card" style={{ padding: 24, width: "100%" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitle" style={{ fontSize: 24, fontWeight: 950 }}>
                  4) Choose your weapon
                </div>
                <div className="wt-cardSub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Pick exactly 1 starting weapon.
                </div>
              </div>

              <div className="wt-cardBody">
                <SelectionGrid
                  items={weaponOptions}
                  selectedId={selectedWeaponId}
                  onSelect={setSelectedWeaponId}
                  emptyLabel="No weapon items were found."
                />
              </div>
            </section>
          ) : null}

          {step === 5 ? (
            <section className="wt-card" style={{ padding: 24, width: "100%" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitle" style={{ fontSize: 24, fontWeight: 950 }}>
                  5) Choose your vitality item
                </div>
                <div className="wt-cardSub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Pick exactly 1 healing or recovery item.
                </div>
              </div>

              <div className="wt-cardBody">
                <SelectionGrid
                  items={vitalityOptions}
                  selectedId={selectedVitalityId}
                  onSelect={setSelectedVitalityId}
                  emptyLabel="No vitality items were found."
                />
              </div>
            </section>
          ) : null}

          {step === 6 ? (
            <section className="wt-card" style={{ padding: 24, width: "100%" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitle" style={{ fontSize: 24, fontWeight: 950 }}>
                  6) Choose your utility item
                </div>
                <div className="wt-cardSub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Pick exactly 1 utility item.
                </div>
              </div>

              <div className="wt-cardBody">
                <SelectionGrid
                  items={utilityOptions}
                  selectedId={selectedUtilityId}
                  onSelect={setSelectedUtilityId}
                  emptyLabel="No utility items were found."
                />
              </div>
            </section>
          ) : null}

          {step === 7 ? (
            <section className="wt-card" style={{ padding: 24, width: "100%" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitle" style={{ fontSize: 24, fontWeight: 950 }}>
                  7) Choose your armour
                </div>
                <div className="wt-cardSub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Pick exactly 1 piece of armour.
                </div>
              </div>

              <div className="wt-cardBody">
                <SelectionGrid
                  items={armourOptions}
                  selectedId={selectedArmourId}
                  onSelect={setSelectedArmourId}
                  emptyLabel="No armour items were found."
                />
              </div>
            </section>
          ) : null}

          {step === 8 ? (
            <section className="wt-card" style={{ padding: 24, width: "100%" }}>
              <div className="wt-cardHeader">
                <div className="wt-cardTitle" style={{ fontSize: 24, fontWeight: 950 }}>
                  8) Review
                </div>
                <div className="wt-cardSub" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Confirm everything before saving.
                </div>
              </div>

              <div className="wt-cardBody" style={{ display: "grid", gap: 14 }}>
                <div className="wt-item" style={{ padding: 16 }}>
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-kicker">Name</div>
                      <div className="wt-itemName" style={{ fontSize: 18 }}>
                        {name.trim() || "—"}
                      </div>
                    </div>
                    <span className="wt-tag">Step 1</span>
                  </div>
                </div>

                <div className="wt-item" style={{ padding: 16 }}>
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-kicker">Race</div>
                      <div className="wt-itemName" style={{ fontSize: 18 }}>
                        {selectedRace?.name || "—"}
                      </div>
                      <div
                        className="wt-muted"
                        style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}
                      >
                        {selectedRace ? fmtMods(selectedRace.statMods) : ""}
                      </div>
                    </div>
                    <span className="wt-tag">Step 2</span>
                  </div>
                </div>

                <div className="wt-item" style={{ padding: 16 }}>
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-kicker">Class</div>
                      <div className="wt-itemName" style={{ fontSize: 18 }}>
                        {selectedClass?.name || "—"}
                      </div>
                      <div
                        className="wt-muted"
                        style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}
                      >
                        {selectedClass ? fmtMods(selectedClass.statMods) : ""}
                      </div>
                    </div>
                    <span className="wt-tag">Step 3</span>
                  </div>
                </div>

                <div className="wt-item" style={{ padding: 16 }}>
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-kicker">Loadout</div>
                      <div className="wt-itemName" style={{ fontSize: 15, lineHeight: 1.5 }}>
                        {selectedWeapon?.name || "—"} • {selectedVitality?.name || "—"} •{" "}
                        {selectedUtility?.name || "—"} • {selectedArmour?.name || "—"}
                      </div>
                      <div
                        className="wt-muted"
                        style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}
                      >
                        Weapon, vitality item, utility item, and armour selected.
                      </div>
                    </div>
                    <span className="wt-tag">Steps 4–7</span>
                  </div>
                </div>

                <div className="wt-item" style={{ padding: 16 }}>
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-kicker">Combined Stat Mods</div>
                      <div className="wt-itemName" style={{ fontSize: 18 }}>
                        {fmtMods(combinedStatMods)}
                      </div>
                      <div
                        className="wt-muted"
                        style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}
                      >
                        This includes race, class, and all starting equipment.
                      </div>
                    </div>
                    <span className="wt-tag">Stats</span>
                  </div>
                </div>

                <div className="wt-item" style={{ padding: 16 }}>
                  <div className="wt-itemTop">
                    <div>
                      <div className="wt-kicker">Identity Baseline</div>
                      <div className="wt-itemName" style={{ fontSize: 18 }}>
                        Mutation 0 • Humanity 10 • HP 20/20
                      </div>
                      <div
                        className="wt-muted"
                        style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5 }}
                      >
                        New contractors begin unmodified. Future grafts will raise Mutation and reduce Humanity.
                      </div>
                    </div>
                    <span className="wt-tag">Grafting</span>
                  </div>
                </div>

                {err ? (
                  <div
                    className="wt-item"
                    style={{ borderColor: "rgba(255,93,93,0.35)", padding: 16 }}
                  >
                    <div style={{ color: "var(--wt-red)", fontWeight: 900, fontSize: 15 }}>
                      Save failed
                    </div>
                    <div className="wt-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {err}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside
          style={{
            position: "sticky",
            top: 18,
            alignSelf: "start",
          }}
        >
          <div
            className="wt-card"
            style={{
              padding: 20,
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 950,
                  lineHeight: 1.1,
                }}
              >
                Character Preview
              </div>
              <div
                className="wt-muted"
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Live build summary in the style of a full RPG creator.
              </div>
            </div>

            <PreviewRow label="Name" value={name.trim() || "Unassigned"} accent />
            <PreviewRow
              label="Race"
              value={selectedRace ? `${selectedRace.short || ""} ${selectedRace.name}`.trim() : "Not selected"}
            />
            <PreviewRow
              label="Class"
              value={selectedClass ? `${selectedClass.short || ""} ${selectedClass.name}`.trim() : "Not selected"}
            />
            <PreviewRow
              label="Weapon"
              value={selectedWeapon?.name || "Not selected"}
            />
            <PreviewRow
              label="Vitals"
              value={selectedVitality?.name || "Not selected"}
            />
            <PreviewRow
              label="Utility"
              value={selectedUtility?.name || "Not selected"}
            />
            <PreviewRow
              label="Armour"
              value={selectedArmour?.name || "Not selected"}
            />

            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 16,
                borderRadius: 14,
                border: "1px solid rgba(168,85,247,0.25)",
                background: "rgba(168,85,247,0.06)",
              }}
            >
              <div
                className="wt-kicker"
                style={{
                  fontSize: 12,
                  letterSpacing: 1,
                }}
              >
                Stat Total Preview
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  lineHeight: 1.55,
                  color: "var(--wt-text)",
                }}
              >
                {fmtMods(combinedStatMods)}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 16,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div
                className="wt-kicker"
                style={{
                  fontSize: 12,
                  letterSpacing: 1,
                }}
              >
                Baseline
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "var(--wt-text)",
                }}
              >
                <div>HP: 20 / 20</div>
                <div>Mutation: 0</div>
                <div>Humanity: 10</div>
                <div>Equipment Slots Filled: {selectedEquipment.length} / 4</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 20,
          padding: "14px 18px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10,10,15,0.88)",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          zIndex: 30,
        }}
      >
        <button
          className="wt-btn"
          onClick={back}
          disabled={step === 1 || saving}
        >
          Back
        </button>

        <div
          className="wt-muted"
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
            textAlign: "center",
          }}
        >
          Step {step} of {TOTAL_STEPS}
        </div>

        {step < TOTAL_STEPS ? (
          <button
            className="wt-btn wt-btnPrimary"
            onClick={next}
            disabled={!canNext() || saving}
          >
            Next
          </button>
        ) : (
          <button
            className="wt-btn wt-btnJoin"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Create Character"}
          </button>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 1180px) {
          div[style*="grid-template-columns: minmax(0, 1fr) 360px"] {
            grid-template-columns: 1fr !important;
          }

          aside[style*="position: sticky"] {
            position: static !important;
            top: auto !important;
          }
        }

        @media (max-width: 760px) {
          div[style*="position: sticky"][style*="bottom: 0"] {
            padding: 12px !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}