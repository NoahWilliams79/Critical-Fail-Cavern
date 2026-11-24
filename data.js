// All names, products, prices, reviews, and creators in this prototype are fictional.
const STARTUP = {
  name: "Critical Fail Cavern",
  tagline: "One cavern for every tabletop adventure.",
  pitch: "Discover miniatures, organize your collection, run encounters, and find your next tabletop treasure."
};

const MINIATURES = [
  { id: "mini-ashwing", name: "Ashwing Drake", creatureType: "Dragon", size: "Large", gameSystem: "Cavern Quest", creator: "Emberforge Studio", description: "A young cliff-dwelling drake with folded wings and a curious gaze." },
  { id: "mini-mossback", name: "Mossback Sentinel", creatureType: "Construct", size: "Medium", gameSystem: "Cavern Quest", creator: "Moss & Mithril", description: "An ancient stone guardian reclaimed by the forest." },
  { id: "mini-gloam", name: "Gloam Lantern Keeper", creatureType: "Undead", size: "Medium", gameSystem: "Mythic Delve", creator: "Hollow Oak Models", description: "A wandering keeper with a lantern that glows an impossible blue." },
  { id: "mini-rill", name: "Rill River Sprite", creatureType: "Fey", size: "Small", gameSystem: "Mythic Delve", creator: "Moss & Mithril", description: "A nimble water spirit with a shell-and-reed charm." },
  { id: "mini-copper", name: "Coppercap Burrower", creatureType: "Beast", size: "Small", gameSystem: "Cavern Quest", creator: "Emberforge Studio", description: "A sturdy, burrowing beetle with a bright copper shell." },
  { id: "mini-vale", name: "Vale Watcher", creatureType: "Humanoid", size: "Medium", gameSystem: "Open Table", creator: "Lanternlight Workshop", description: "A trail guide carrying a weathered map and walking staff." },
  { id: "mini-crystal", name: "Crystal Spire Elemental", creatureType: "Elemental", size: "Large", gameSystem: "Mythic Delve", creator: "Hollow Oak Models", description: "A slow-moving figure of translucent geode and shale." },
  { id: "mini-thistle", name: "Thistlewing Moth", creatureType: "Beast", size: "Tiny", gameSystem: "Open Table", creator: "Lanternlight Workshop", description: "A tiny night moth with patterned wings and a velvet body." },
  { id: "mini-ironroot", name: "Ironroot Treant", creatureType: "Plant", size: "Huge", gameSystem: "Cavern Quest", creator: "Moss & Mithril", description: "A towering old tree that keeps watch over forgotten paths." },
  { id: "mini-dusk", name: "Duskfen Scout", creatureType: "Humanoid", size: "Medium", gameSystem: "Mythic Delve", creator: "Emberforge Studio", description: "A quiet marshland scout in a hooded travel cloak." },
  { id: "mini-scree", name: "Scree Cave Crawler", creatureType: "Monstrosity", size: "Large", gameSystem: "Open Table", creator: "Hollow Oak Models", description: "A many-legged cavern dweller built for rocky ledges." },
  { id: "mini-pebble", name: "Pebble Pudding", creatureType: "Ooze", size: "Small", gameSystem: "Cavern Quest", creator: "Lanternlight Workshop", description: "A cheerful, translucent ooze with smooth stones inside." }
];

const MARKET_SAMPLE = [
  { id: "market-01", name: "Ashwing Drake (Resin Cast)", type: "Physical", price: 18.5, seller: "Emberforge Studio", description: "Unpainted resin miniature, supplied with a round display base.", rating: "4.8", reviews: 27, review: "Crisp details and a great fit for a cavern encounter." },
  { id: "market-02", name: "Mossback Sentinel STL", type: "Digital STL", price: 6, seller: "Moss & Mithril", description: "A detailed digital sculpt in a pre-supported STL bundle.", rating: "4.9", reviews: 41, review: "The supports were easy to remove and the texture painted beautifully." },
  { id: "market-03", name: "Lantern Keeper (Tabletop Print)", type: "Physical", price: 12, seller: "Hollow Oak Models", description: "Small-batch tabletop print with a separate lantern accessory.", rating: "4.6", reviews: 13, review: "A charming miniature with a fun removable lantern." },
  { id: "market-04", name: "Crystal Spire Elemental STL", type: "Digital STL", price: 8.25, seller: "Hollow Oak Models", description: "A crystalline elemental in three optional base configurations.", rating: "5.0", reviews: 19, review: "Looks striking on the table and printed cleanly." },
  { id: "market-05", name: "River Sprite Pair", type: "Physical", price: 15, seller: "Moss & Mithril", description: "Two hand-finished river sprites, ready for your next session.", rating: "4.7", reviews: 8, review: "Lovely small details and careful packaging." },
  { id: "market-06", name: "Cavern Crawlers STL Pack", type: "Digital STL", price: 4.5, seller: "Lanternlight Workshop", description: "A fictional digital pack of three rocky cave creatures.", rating: "4.5", reviews: 22, review: "A useful trio of creatures for a quick cave encounter." }
];
