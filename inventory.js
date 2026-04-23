const ITEM_DATABASE = {
  enemy_staff: {
    id: "enemy_staff",
    name: "Ash-Cut Staff",
    type: "staff",
    slot: "Weapon",
    rarity: "Common",
    value: 18,
    stats: {
      power: 3,
      focus: 1
    },
    description: "A plain battle staff carried by a field wizard. Burn marks run along the grain."
  },

  enemy_robe: {
    id: "enemy_robe",
    name: "Field Robe",
    type: "robe",
    slot: "Chest",
    rarity: "Common",
    value: 12,
    stats: {
      defense: 2,
      mana: 5
    },
    description: "A worn traveling robe. Thin, dusty, and stitched for long marches."
  },

  enemy_boots: {
    id: "enemy_boots",
    name: "Mud-Tread Boots",
    type: "boots",
    slot: "Feet",
    rarity: "Common",
    value: 9,
    stats: {
      speed: 1
    },
    description: "Heavy boots marked by road dirt and battlefield ash."
  },

  enemy_gloves: {
    id: "enemy_gloves",
    name: "Caster Gloves",
    type: "gloves",
    slot: "Hands",
    rarity: "Common",
    value: 10,
    stats: {
      control: 2
    },
    description: "Fingerless gloves used for handling unstable spell pressure."
  },

  enemy_pouch: {
    id: "enemy_pouch",
    name: "Worn Spell Pouch",
    type: "pouch",
    slot: "Pouch",
    rarity: "Uncommon",
    value: 25,
    stats: {
      pouchSlots: 1,
      stability: 2
    },
    description: "A small ritual pouch. The inner cloth smells faintly of copper and smoke."
  },

  enemy_belt: {
    id: "enemy_belt",
    name: "Utility Belt",
    type: "belt",
    slot: "Waist",
    rarity: "Common",
    value: 8,
    stats: {
      carry: 1
    },
    description: "A cracked belt with loops for vials, charms, and field tools."
  },

  enemy_amulet: {
    id: "enemy_amulet",
    name: "Dull Ward Amulet",
    type: "amulet",
    slot: "Neck",
    rarity: "Uncommon",
    value: 30,
    stats: {
      arcaneResist: 3,
      focus: 1
    },
    description: "A low-grade ward charm. Its protective mark is nearly faded."
  },

  enemy_ring_1: {
    id: "enemy_ring_1",
    name: "Copper Ring",
    type: "ring",
    slot: "Ring",
    rarity: "Common",
    value: 7,
    stats: {
      mana: 2
    },
    description: "A simple copper ring with a weak mana trace."
  },

  enemy_ring_2: {
    id: "enemy_ring_2",
    name: "Smoke Ring",
    type: "ring",
    slot: "Ring",
    rarity: "Common",
    value: 11,
    stats: {
      fireResist: 2
    },
    description: "A dark ring warmed by old fire magic."
  }
};

function createItemInstance(templateId) {
  const template = ITEM_DATABASE[templateId];

  return {
    instanceId: crypto.randomUUID(),
    templateId,
    ...structuredClone(template)
  };
}

function createEnemyLootItems(goldAmount) {
  return [
    createItemInstance("enemy_staff"),
    createItemInstance("enemy_robe"),
    createItemInstance("enemy_boots"),
    createItemInstance("enemy_gloves"),
    createItemInstance("enemy_pouch"),
    createItemInstance("enemy_belt"),
    createItemInstance("enemy_amulet"),
    createItemInstance("enemy_ring_1"),
    createItemInstance("enemy_ring_2"),
    {
      instanceId: crypto.randomUUID(),
      name: `${goldAmount} Gold`,
      type: "gold",
      slot: "Currency",
      rarity: "Currency",
      value: goldAmount,
      amount: goldAmount,
      stats: {},
      description: "Loose gold taken from the fallen wizard."
    }
  ];
}

function formatItemStats(item) {
  const entries = Object.entries(item.stats || {});

  if (entries.length === 0) {
    return "No stat modifiers.";
  }

  return entries
    .map(([key, value]) => `${key}: +${value}`)
    .join(" / ");
}

window.InventoryDB = {
  ITEM_DATABASE,
  createEnemyLootItems,
  formatItemStats
};
