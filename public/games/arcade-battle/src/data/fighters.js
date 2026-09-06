window.GameFighterData = [
  {
    id: "knight",
    name: "Knight",
    maxHp: 130,
    attack: 25,
    defense: 13,
    speed: 9,
    skillName: "Shield Break",

    idleFrames: [
      "assets/characters/Knight/Anim_char1_idle_01.png",
      "assets/characters/Knight/Anim_char1_idle_02.png",
      "assets/characters/Knight/Anim_char1_idle_03.png",
      "assets/characters/Knight/Anim_char1_idle_04.png",
      "assets/characters/Knight/Anim_char1_idle_05.png",
      "assets/characters/Knight/Anim_char1_idle_06.png"
    ],

    attackFrame:
      "assets/characters/Knight/Anim_char1_attack_01.png",

    hitFrame:
      "assets/characters/Knight/Anim_char1_gethit_01.png",

    effect: {
      folder: "assets/effects/Knight_SwordSlash",
      prefix: "Fx_effect1_",
      frames: 5
    }
  },

  {
    id: "archer",
    name: "Archer",
    maxHp: 95,
    attack: 21,
    defense: 7,
    speed: 15,
    skillName: "Twin Arrow",

    idleFrames: [
      "assets/characters/Archer/Anim_char2_idle_01.png",
      "assets/characters/Archer/Anim_char2_idle_02.png",
      "assets/characters/Archer/Anim_char2_idle_03.png",
      "assets/characters/Archer/Anim_char2_idle_04.png",
      "assets/characters/Archer/Anim_char2_idle_05.png",
      "assets/characters/Archer/Anim_char2_idle_06.png"
    ],

    attackFrame:
      "assets/characters/Archer/Anim_char2_attack_01.png",

    hitFrame:
      "assets/characters/Archer/Anim_char2_gethit_01.png",

    effect: {
      folder: "assets/effects/Archer_Arrows",
      prefix: "Fx_effect3_",
      frames: 6
    }
  },

  {
    id: "mage",
    name: "Mage",
    maxHp: 80,
    attack: 30,
    defense: 5,
    speed: 12,
    skillName: "Flame Burst",

    idleFrames: [
      "assets/characters/Mage/Anim_char3_idle_01.png",
      "assets/characters/Mage/Anim_char3_idle_02.png",
      "assets/characters/Mage/Anim_char3_idle_03.png",
      "assets/characters/Mage/Anim_char3_idle_04.png",
      "assets/characters/Mage/Anim_char3_idle_05.png",
      "assets/characters/Mage/Anim_char3_idle_06.png"
    ],

    attackFrame:
      "assets/characters/Mage/Anim_char3_attack_01.png",

    hitFrame:
      "assets/characters/Mage/Anim_char3_gethit_01.png",

    effect: {
      folder: "assets/effects/Flame",
      prefix: "Fx_effect12_",
      frames: 6
    }
  }
];
