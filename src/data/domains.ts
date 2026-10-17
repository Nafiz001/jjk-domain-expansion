import type { DomainData, DomainId } from '../types';

export const DOMAIN_ORDER: DomainId[] = [
  'infinite-void',
  'malevolent-shrine',
  'chimera-shadow',
  'authentic-mutual-love',
  'idle-death-gamble',
  'self-embodiment-of-perfection'
];

export const DOMAINS: Record<DomainId, DomainData> = {
  'infinite-void': {
    id: 'infinite-void',
    nameJa: '無量空処',
    nameRomaji: 'Muryōkūsho',
    nameEn: 'Infinite Void',
    sorcererJa: '五条 悟',
    sorcererEn: 'Satoru Gojo',
    image: '/assets/gojo_void.jpg',
    frames: [
      { index: 0, src: '/assets/frames/infinite-void/frame_0.jpg', focalX: 0.56, focalY: 0.42, labelJa: '六眼開眼', labelEn: 'Six Eyes Unveil', cameraZ: 'Z: 0.0m [MACRO IRIS]' },
      { index: 1, src: '/assets/frames/infinite-void/frame_1.jpg', focalX: 0.50, focalY: 0.47, labelJa: '蒼赫収束', labelEn: 'Limitless Convergence', cameraZ: 'Z: 4.5m [AURA VORTEX]' },
      { index: 2, src: '/assets/frames/infinite-void/frame_2.jpg', focalX: 0.46, focalY: 0.48, labelJa: '帝釈天印', labelEn: 'Taishakuten Mudra', cameraZ: 'Z: 12.0m [HAND SEAL]' },
      { index: 3, src: '/assets/frames/infinite-void/frame_3.jpg', focalX: 0.46, focalY: 0.48, labelJa: '結界破断', labelEn: 'Euclidean Shatter', cameraZ: 'Z: 38.0m [RIFT PORTAL]' },
      { index: 4, src: '/assets/frames/infinite-void/frame_4.jpg', focalX: 0.50, focalY: 0.50, labelJa: '無量宇宙', labelEn: 'Boundless Nebula', cameraZ: 'Z: 420m [DEEP COSMOS]' },
      { index: 5, src: '/assets/frames/infinite-void/frame_5.jpg', focalX: 0.50, focalY: 0.50, labelJa: '事象の地平', labelEn: 'Omniscient Singularity', cameraZ: 'Z: ∞ [EVENT HORIZON]' }
    ],
    primaryColor: '#00f0ff',
    secondaryColor: '#9945ff',
    accentColor: '#ffffff',
    bgGlow: 'rgba(0, 240, 255, 0.28)',
    mudraNameJa: '帝釈天印',
    mudraNameEn: 'Taishakuten Mudra',
    mudraDeity: 'Indra (King of the Gods & Lord of the Heavens)',
    mudraDescription:
      'Formed by crossing the index and middle fingers of the right hand while keeping the ring and little fingers folded. Represents the central ruler of Mount Sumeru grasping absolute spatial dominion.',
    barrierType: 'Closed Spherical Barrier (Invertible / Basketball-Compressible)',
    isOpenBarrier: false,
    barrierRadius: 'Variable (0.4m Compressed Sphere up to 120m District)',
    sureHitRule:
      'Immeasurable, infinite sensory and cognitive information is forcefully pumped directly into the target’s consciousness (0.2s = 6 months of raw data). All brain and motor functions halt in perpetual neurological paralysis.',
    cursedEnergyOutput: '120,000 CE [SIX EYES ZERO-LOSS]',
    baseCeNumeric: 120000,
    grade: 'SPECIAL GRADE // APEX (特級術師)',
    bindingVows: [
      'Six Eyes (六眼) atomic-level cursed energy optimization reduces activation loss to near zero.',
      '0.2-Second Shibuya Vow compresses expansion and deactivation into one heartbeat to spare civilians from permanent cerebral death.',
      'Shinjuku Barrier Inversion swaps internal and external shell durability to withstand Malevolent Shrine’s outside slashes.'
    ],
    metrics: {
      refinement: 100,
      lethality: 100,
      efficiency: 100,
      activationSpeed: 100,
      rangeScore: 84,
      clashResilience: 97
    },
    chants: [
      { ja: '九綱', romaji: 'Kukō', en: 'Nine Ropes' },
      { ja: '偏光', romaji: 'Henkō', en: 'Polarized Light' },
      { ja: '烏と声明', romaji: 'Karasu to Shōmyō', en: 'Crow and Shōmyō Chant' },
      { ja: '表裏の間', romaji: 'Hyōri no Hazama', en: 'The Gap Between Within and Without' }
    ],
    phases: [
      {
        id: 'incantation',
        nameJa: '詠唱',
        nameRomaji: 'Eishō',
        nameEn: 'The Six Eyes Unveil',
        frameStart: 0,
        frameEnd: 48,
        subtitle: 'Atomic Manipulation of Limitless Cursed Energy',
        incantation: '「位相、黄昏、智慧の瞳...」',
        description:
          'Gojo slides down his black blindfold, unveiling the radiant cyan Six Eyes. Space-time warps at the Planck scale as Blue attraction and Red repulsion converge.',
        telemetryLabel: 'CURSED ENERGY STATUS:',
        telemetryValue: 'SIX EYES IGNITION (30% OUTPUT)'
      },
      {
        id: 'mudra',
        nameJa: '印契',
        nameRomaji: 'Inkei',
        nameEn: 'The Taishakuten Seal',
        frameStart: 49,
        frameEnd: 96,
        subtitle: 'Mudra of Indra • Spatial Alignment',
        incantation: '「領域展開...」 (Ryōiki Tenkai)',
        description:
          'Fingers intercross in the sacred one-handed mudra of Indra. High-frequency cyan plasma arcs and gravitational rings erupt outward from his hand.',
        telemetryLabel: 'BARRIER GEOMETRY:',
        telemetryValue: 'SPATIAL HARMONIC LOCKED'
      },
      {
        id: 'fracture',
        nameJa: '結界破断',
        nameRomaji: 'Kekkai Hadan',
        nameEn: 'Reality Fracture',
        frameStart: 97,
        frameEnd: 144,
        subtitle: 'The Veil Drops • Euclidean Space Collapses',
        incantation: '「無量空処」 (Muryōkūsho)',
        description:
          'Physical space splinters like obsidian glass. Chromatic aberration tears across the horizon as the boundless interior cosmos breaches real-world physics.',
        telemetryLabel: 'BARRIER BOUNDARY:',
        telemetryValue: 'SEVERING REALITY FROM ENVIRONMENT'
      },
      {
        id: 'manifest',
        nameJa: '生得領域展開',
        nameRomaji: 'Shōtoku Ryōiki',
        nameEn: 'Cosmic Manifestation',
        frameStart: 145,
        frameEnd: 192,
        subtitle: 'The Boundless Eye of the Universe',
        incantation: '「何も見えず、全てが見える...」',
        description:
          'A vast celestial void unfurls with revolving accretion rings, nebulae, and the colossal singularity pupil of omniscient infinity.',
        telemetryLabel: 'EXPANSION RADIUS:',
        telemetryValue: 'CLOSED SPHERICAL BARRIER'
      },
      {
        id: 'sure-hit',
        nameJa: '必中必殺',
        nameRomaji: 'Hitchū Hissatsu',
        nameEn: 'Immeasurable Information',
        frameStart: 193,
        frameEnd: 240,
        subtitle: 'Cognitive Synaptic Overload Active',
        incantation: '「生きているというプロセスを無限回強制される」',
        description:
          'Guaranteed-hit protocol active. Raw infinite stimuli flood the target’s cerebral cortex, freezing every muscle while they stare into eternity.',
        telemetryLabel: 'SURE-KILL RULE:',
        telemetryValue: 'COGNITIVE OVERLOAD ACTIVE (∞ BIT/S)'
      }
    ]
  },

  'malevolent-shrine': {
    id: 'malevolent-shrine',
    nameJa: '伏魔御廚子',
    nameRomaji: 'Fukuma Mizushi',
    nameEn: 'Malevolent Shrine',
    sorcererJa: '両面 宿儺',
    sorcererEn: 'Ryomen Sukuna',
    image: '/assets/sukuna_shrine.jpg',
    frames: [
      { index: 0, src: '/assets/frames/malevolent-shrine/frame_0.jpg', focalX: 0.54, focalY: 0.44, labelJa: '呪王胎動', labelEn: 'King of Curses Awakens', cameraZ: 'Z: 0.0m [HEIAN TATTOOS]' },
      { index: 1, src: '/assets/frames/malevolent-shrine/frame_1.jpg', focalX: 0.52, focalY: 0.50, labelJa: '黒焔湧出', labelEn: 'Crimson Malice Surge', cameraZ: 'Z: 5.0m [BLOOD ECLIPSE]' },
      { index: 2, src: '/assets/frames/malevolent-shrine/frame_2.jpg', focalX: 0.48, focalY: 0.52, labelJa: '閻魔天印', labelEn: 'Enma-ten Mudra', cameraZ: 'Z: 14.0m [YAMA SEAL]' },
      { index: 3, src: '/assets/frames/malevolent-shrine/frame_3.jpg', focalX: 0.44, focalY: 0.48, labelJa: '空間切断', labelEn: 'Open Barrier Rift', cameraZ: 'Z: 45.0m [CLEAVE GRID]' },
      { index: 4, src: '/assets/frames/malevolent-shrine/frame_4.jpg', focalX: 0.49, focalY: 0.48, labelJa: '骸の御廚子', labelEn: 'Pagoda of Skulls', cameraZ: 'Z: 140m [BLOOD LAKE]' },
      { index: 5, src: '/assets/frames/malevolent-shrine/frame_5.jpg', focalX: 0.50, focalY: 0.54, labelJa: '解・八咫嵐', labelEn: '200m Slash Annihilation', cameraZ: 'Z: 200m [SANCTUM MAW]' }
    ],
    primaryColor: '#ff1744',
    secondaryColor: '#ff9100',
    accentColor: '#f5f5f5',
    bgGlow: 'rgba(255, 23, 68, 0.30)',
    mudraNameJa: '閻魔天印',
    mudraNameEn: 'Enma-ten Mudra',
    mudraDeity: 'Yama (The King of Hell & Judge of the Dead)',
    mudraDescription:
      'Formed with interlocked palms, thumbs aligned, and bent index knuckles forming a demonic crown. Channels the absolute judicial authority of the Lord of the Underworld.',
    barrierType: 'Open Barrier (Divine Painting on Thin Air • No Outer Shell)',
    isOpenBarrier: true,
    barrierRadius: 'Max 200 Meters (Adjustable to 140m High-Density Zone)',
    sureHitRule:
      'Relentless, automatic dual-slashing protocol: Cleave (八咫) dynamically scales to slice targets with cursed energy, while Dismantle (解) pulverizes inanimate matter until nothing remains within 200m.',
    cursedEnergyOutput: '250,000+ CE [CALAMITY OUTPUT]',
    baseCeNumeric: 250000,
    grade: 'KING OF CURSES (呪いの王)',
    bindingVows: [
      'Open-Barrier Binding Vow: Leaving an escape route without a physical shell expands the guaranteed-hit radius to a catastrophic 200 meters.',
      'External Shell Crusher: Because the domain manifests directly in physical space, its slashes strike the fragile exterior of opposing closed barriers.',
      'World-Cutting Slash Incantation Vow: Expands the target of Dismantle to space and existence itself.'
    ],
    metrics: {
      refinement: 100,
      lethality: 100,
      efficiency: 96,
      activationSpeed: 98,
      rangeScore: 100,
      clashResilience: 100
    },
    chants: [
      { ja: '龍鱗', romaji: 'Ryūrin', en: 'Scale of the Dragon' },
      { ja: '反発', romaji: 'Hanpatsu', en: 'Recoil' },
      { ja: '番いの流星', romaji: 'Tsugai no Ryūsei', en: 'Twin Meteors' },
      { ja: '伏魔御廚子', romaji: 'Fukuma Mizushi', en: 'Malevolent Shrine' }
    ],
    phases: [
      {
        id: 'incantation',
        nameJa: '邪気胎動',
        nameRomaji: 'Jaki Taidō',
        nameEn: 'The Calamity Awakens',
        frameStart: 0,
        frameEnd: 48,
        subtitle: 'Cursed Aura Surge • Blood Eclipse',
        incantation: '「餓鬼共、分を弁えろ...」',
        description:
          'Black and crimson cursed energy boils from Sukuna’s Heian markings. The sky darkens into a blood-red solar eclipse as a millennium of malice descends.',
        telemetryLabel: 'CURSED ENERGY STATUS:',
        telemetryValue: 'CALAMITY SURGE (250,000 CE)'
      },
      {
        id: 'mudra',
        nameJa: '印契',
        nameRomaji: 'Inkei',
        nameEn: 'The Enma-ten Seal',
        frameStart: 49,
        frameEnd: 96,
        subtitle: 'Mudra of the Underworld Judge',
        incantation: '「領域展開...」 (Ryōiki Tenkai)',
        description:
          'Hands clasp in the Enma-ten mudra. Spikes of black-crimson lightning fracture the ground as a subterranean lake of blood ripples outward.',
        telemetryLabel: 'BARRIER GEOMETRY:',
        telemetryValue: 'OPEN-AIR DIVINE CANVAS'
      },
      {
        id: 'fracture',
        nameJa: '空間切断',
        nameRomaji: 'Kūkan Setsudan',
        nameEn: 'Spatial Severance',
        frameStart: 97,
        frameEnd: 144,
        subtitle: 'Cleave & Dismantle Reality Grid',
        incantation: '「伏魔御廚子」 (Fukuma Mizushi)',
        description:
          'Invisible razor planes slice through the atmosphere. Like painting a masterpiece directly on air without a canvas, the shrine manifests in physical reality.',
        telemetryLabel: 'BARRIER BOUNDARY:',
        telemetryValue: 'OPEN BARRIER (NO SHELL WALL)'
      },
      {
        id: 'manifest',
        nameJa: '生得領域展開',
        nameRomaji: 'Shōtoku Ryōiki',
        nameEn: 'The Demonic Shrine',
        frameStart: 145,
        frameEnd: 192,
        subtitle: 'Pagoda of Horns upon Bone Mount',
        incantation: '「全てを微塵に刻み尽くせ」',
        description:
          'A grotesque Buddhist shrine adorned with giant horned skulls rises from a mountain of bones under a crimson eclipse.',
        telemetryLabel: 'EXPANSION RADIUS:',
        telemetryValue: '200 METERS (MAX PERIMETER)'
      },
      {
        id: 'sure-hit',
        nameJa: '必中必殺',
        nameRomaji: 'Hitchū Hissatsu',
        nameEn: 'Infinite Slash Execution',
        frameStart: 193,
        frameEnd: 240,
        subtitle: 'Cleave & Dismantle: Complete Annihilation',
        incantation: '「塵芥の如く消え去れ」',
        description:
          'Thousands of intersecting blade cuts strike every millisecond. Reinforced concrete and special-grade sorcerers alike are atomized into crimson dust.',
        telemetryLabel: 'SURE-KILL RULE:',
        telemetryValue: 'CLEAVE & DISMANTLE STORM'
      }
    ]
  },

  'chimera-shadow': {
    id: 'chimera-shadow',
    nameJa: '嵌合暗翳庭',
    nameRomaji: "Kangō An'eitei",
    nameEn: 'Chimera Shadow Garden',
    sorcererJa: '伏黒 恵',
    sorcererEn: 'Megumi Fushiguro',
    image: '/assets/megumi_shadow.jpg',
    frames: [
      { index: 0, src: '/assets/frames/chimera-shadow/frame_0.jpg', focalX: 0.52, focalY: 0.42, labelJa: '影の覚醒', labelEn: 'Shadow Awakening', cameraZ: 'Z: 0.0m [ABYSSAL GAZE]' },
      { index: 1, src: '/assets/frames/chimera-shadow/frame_1.jpg', focalX: 0.52, focalY: 0.48, labelJa: '黒墨氾濫', labelEn: 'Liquid Ink Surge', cameraZ: 'Z: 4.8m [SHADOW POOL]' },
      { index: 2, src: '/assets/frames/chimera-shadow/frame_2.jpg', focalX: 0.48, focalY: 0.50, labelJa: '十種影法術印', labelEn: 'Puppet Mudra Lock', cameraZ: 'Z: 12.5m [HAND SILHOUETTE]' },
      { index: 3, src: '/assets/frames/chimera-shadow/frame_3.jpg', focalX: 0.48, focalY: 0.50, labelJa: '領域侵食', labelEn: 'Abyssal Inundation', cameraZ: 'Z: 34.0m [FLOOR LIQUEFACTION]' },
      { index: 4, src: '/assets/frames/chimera-shadow/frame_4.jpg', focalX: 0.50, focalY: 0.48, labelJa: '鵺と玉犬の庭', labelEn: 'Cavern of Shikigami', cameraZ: 'Z: 95.0m [CHIMERA FLOOD]' },
      { index: 5, src: '/assets/frames/chimera-shadow/frame_5.jpg', focalX: 0.50, focalY: 0.44, labelJa: '深淵多重召喚', labelEn: 'Infinite Clone Swarm', cameraZ: 'Z: 160m [ABYSS VORTEX]' }
    ],
    primaryColor: '#00e5ff',
    secondaryColor: '#38bdf8',
    accentColor: '#fbbf24',
    bgGlow: 'rgba(0, 229, 255, 0.25)',
    mudraNameJa: '十種影法術印',
    mudraNameEn: 'Ten Shadows Puppet Mudra',
    mudraDeity: 'Ksitigarbha / Sacred Ten Treasures Shadow Theater',
    mudraDescription:
      'Hands interlocked into shadow-puppet postures forming avian wings and lupine jaws. Channels liquid abyssal darkness directly through physical hand silhouettes.',
    barrierType: 'Incomplete Barrier (Uses Surrounding Physical Architecture as Shell)',
    isOpenBarrier: false,
    barrierRadius: 'Bounded by Enclosing Cavern / Building Interior (~60m)',
    sureHitRule:
      'Turns the entire floor into a bottomless ocean of viscous liquid shadow with zero buoyancy. Grants limitless shikigami duplication, shadow clone swapping, and abyssal drowning.',
    cursedEnergyOutput: '68,000 CE [POTENTIAL UNLOCKED]',
    baseCeNumeric: 68000,
    grade: 'GRADE 1 // SPECIAL GRADE POTENTIAL',
    bindingVows: [
      'Architectural Shell Substitution: Forgoes an independent barrier boundary by flooding an existing physical room to stabilize the innate domain.',
      'Abyssal Submersion Rule: Eliminates oxygen and buoyancy inside the shadow floor so enemies dragged below cannot swim out.'
    ],
    metrics: {
      refinement: 74,
      lethality: 82,
      efficiency: 85,
      activationSpeed: 86,
      rangeScore: 72,
      clashResilience: 78
    },
    chants: [
      { ja: '布瑠部', romaji: 'Furube', en: 'Shake and Resound' },
      { ja: '由良由良', romaji: 'Yurayura', en: 'Swaying in the Abyss' },
      { ja: '八握剣', romaji: 'Yatsuka no Tsurugi', en: 'Eight-Handled Sword' },
      { ja: '異戒神将', romaji: 'Ikai Shinshō', en: 'Divergent Divine General' }
    ],
    phases: [
      {
        id: 'incantation',
        nameJa: '影の胎動',
        nameRomaji: 'Kage no Taidō',
        nameEn: 'Shadow Awakening',
        frameStart: 0,
        frameEnd: 48,
        subtitle: 'Dark Viscous Cursed Energy Pool',
        incantation: '「もっと自由に、イメージを広げろ...」',
        description:
          'Megumi shatters his mental restraints. Viscous jet-black shadow ink boils outward from beneath his boots, swallowing the surrounding floor.',
        telemetryLabel: 'CURSED ENERGY STATUS:',
        telemetryValue: 'TEN SHADOWS AWAKENING'
      },
      {
        id: 'mudra',
        nameJa: '印契',
        nameRomaji: 'Inkei',
        nameEn: 'Ten Shadows Mudra',
        frameStart: 49,
        frameEnd: 96,
        subtitle: 'Shadow Puppet Formation',
        incantation: '「領域展開...」 (Ryōiki Tenkai)',
        description:
          'Intertwined fingers cast dark silhouettes that immediately take three-dimensional form as living black flames surge skyward.',
        telemetryLabel: 'BARRIER GEOMETRY:',
        telemetryValue: 'ARCHITECTURAL SHELL COUPLED'
      },
      {
        id: 'fracture',
        nameJa: '領域侵食',
        nameRomaji: 'Ryōiki Shinshoku',
        nameEn: 'Abyssal Inundation',
        frameStart: 97,
        frameEnd: 144,
        subtitle: 'Physical Space Submerged in Shadows',
        incantation: "「嵌合暗翳庭！」 (Kangō An'eitei!)",
        description:
          'The solid ground liquefies into a bottomless black sea. Gravitational footholds vanish as targets sink into crushing darkness.',
        telemetryLabel: 'BARRIER BOUNDARY:',
        telemetryValue: 'LIQUID SHADOW INUNDATION'
      },
      {
        id: 'manifest',
        nameJa: '生得領域展開',
        nameRomaji: 'Shōtoku Ryōiki',
        nameEn: 'The Chimera Garden',
        frameStart: 145,
        frameEnd: 192,
        subtitle: 'Flock of Nue & Twin Divine Dogs',
        incantation: '「影の深淵より現れよ」',
        description:
          'Giant winged Nue beasts crackling with violet-cyan lightning soar overhead while red-eyed Divine Dogs stalk across the reflective flood.',
        telemetryLabel: 'EXPANSION RADIUS:',
        telemetryValue: 'ENCLOSED CAVERN PERIMETER'
      },
      {
        id: 'sure-hit',
        nameJa: '多重召喚',
        nameRomaji: 'Tajū Shōkan',
        nameEn: 'Infinite Clone Swarm',
        frameStart: 193,
        frameEnd: 240,
        subtitle: 'Limitless Shikigami Duplication Assault',
        incantation: '「不完全でもいい、殺し切る！」',
        description:
          'Dozens of clone shikigami and shadow doubles materialize simultaneously from every angle, dragging enemies into the bottomless abyss.',
        telemetryLabel: 'SURE-KILL RULE:',
        telemetryValue: 'INFINITE SHIKIGAMI SWARM'
      }
    ]
  },

  'authentic-mutual-love': {
    id: 'authentic-mutual-love',
    nameJa: '真贋相愛',
    nameRomaji: 'Shingan Sōai',
    nameEn: 'Authentic Mutual Love',
    sorcererJa: '乙骨 憂太',
    sorcererEn: 'Yuta Okkotsu',
    image: '/assets/frames/authentic-mutual-love/frame_4.jpg',
    frames: [
      { index: 0, src: '/assets/frames/authentic-mutual-love/frame_0.jpg', focalX: 0.52, focalY: 0.42, labelJa: '指輪の誓約', labelEn: 'Vow of the Silver Ring', cameraZ: 'Z: 0.0m [RIKA CONNECTION]' },
      { index: 1, src: '/assets/frames/authentic-mutual-love/frame_1.jpg', focalX: 0.50, focalY: 0.48, labelJa: '模倣術式展開', labelEn: 'Copy Arsenal Unfurls', cameraZ: 'Z: 5.5m [COPY SIGILS]' },
      { index: 2, src: '/assets/frames/authentic-mutual-love/frame_2.jpg', focalX: 0.48, focalY: 0.48, labelJa: '荼吉尼天印', labelEn: 'Dakiniten Mudra', cameraZ: 'Z: 14.0m [SACRED KNOT]' },
      { index: 3, src: '/assets/frames/authentic-mutual-love/frame_3.jpg', focalX: 0.48, focalY: 0.48, labelJa: '愛執結界破断', labelEn: 'Twilight Rift Opens', cameraZ: 'Z: 42.0m [SWORD PORTAL]' },
      { index: 4, src: '/assets/frames/authentic-mutual-love/frame_4.jpg', focalX: 0.49, focalY: 0.48, labelJa: '無数の刀塚', labelEn: 'Hill of Infinite Katanas', cameraZ: 'Z: 130m [SWORD SANCTUARY]' },
      { index: 5, src: '/assets/frames/authentic-mutual-love/frame_5.jpg', focalX: 0.50, focalY: 0.42, labelJa: '邪去侮の梯子', labelEn: "Jacob's Ladder Sure-Hit", cameraZ: 'Z: 220m [ANGEL LIGHT]' }
    ],
    primaryColor: '#ff2a85',
    secondaryColor: '#ffd166',
    accentColor: '#f8fafc',
    bgGlow: 'rgba(255, 42, 133, 0.28)',
    mudraNameJa: '荼吉尼天印',
    mudraNameEn: 'Dakiniten Mudra',
    mudraDeity: 'Dakiniten (Buddhist Deity of Astral Swiftness & Sacred Bonds)',
    mudraDescription:
      'Interlocked middle and ring fingers with extended index knuckles, channeling the unbreakable bond between Yuta Okkotsu and the Queen of Curses, Rika.',
    barrierType: 'Closed High-Refinement Spherical Barrier (Selective Target Coordinate Lock)',
    isOpenBarrier: false,
    barrierRadius: '90 Meters (Coordinate-Targeted Interior)',
    sureHitRule:
      'One copied Cursed Technique (such as Angel’s Technique Extinguishment: Jacob’s Ladder) is imbued into the barrier as the guaranteed sure-hit, while every other copied technique manifests as limitless katanas scattered across the ground.',
    cursedEnergyOutput: '185,000 CE [BOUNDLESS RIKA RESERVOIR]',
    baseCeNumeric: 185000,
    grade: 'SPECIAL GRADE // MODERN PRODIGY (特級術師)',
    bindingVows: [
      'Randomized Katana Draw Vow: Yuta cannot know which copied technique resides in a katana until he grasps its hilt, multiplying total weapon density.',
      'Selective Sure-Hit Targeting: Barrier refinement is high enough to target solely Ryomen Sukuna with Jacob’s Ladder while sparing allies inside the same domain.'
    ],
    metrics: {
      refinement: 94,
      lethality: 95,
      efficiency: 91,
      activationSpeed: 92,
      rangeScore: 86,
      clashResilience: 93
    },
    chants: [
      { ja: '純愛', romaji: 'Jun’ai', en: 'Pure Unyielding Love' },
      { ja: '模倣', romaji: 'Mohō', en: 'Infinite Mirror of Copy' },
      { ja: '顕現せよリカ', romaji: 'Kengen seyo Rika', en: 'Manifest Fully, Rika' },
      { ja: '真贋相愛', romaji: 'Shingan Sōai', en: 'Authentic Mutual Love' }
    ],
    phases: [
      {
        id: 'incantation',
        nameJa: '誓約の指輪',
        nameRomaji: 'Seiyaku no Yubiwa',
        nameEn: 'The Silver Ring Ignites',
        frameStart: 0,
        frameEnd: 48,
        subtitle: 'Full Manifestation of the Queen of Curses',
        incantation: '「来て、リカ... 全部出し切るよ」',
        description:
          'Yuta kisses the silver ring on his left hand. Bottomless rose-crimson and celestial gold cursed energy floods the battlefield as Rika fully manifests.',
        telemetryLabel: 'CURSED ENERGY STATUS:',
        telemetryValue: 'RIKA FULL LINK (185,000 CE)'
      },
      {
        id: 'mudra',
        nameJa: '印契',
        nameRomaji: 'Inkei',
        nameEn: 'The Dakiniten Seal',
        frameStart: 49,
        frameEnd: 96,
        subtitle: 'Sacred Knot of Eternal Devotion',
        incantation: '「領域展開...」 (Ryōiki Tenkai)',
        description:
          'Hands lock into the Dakiniten mudra. Dozens of copied technique sigils—Cursed Speech, Sky Manipulation, Dhruv’s Orbit, and Angel’s Trumpet—orbit his wrists.',
        telemetryLabel: 'BARRIER GEOMETRY:',
        telemetryValue: 'SELECTIVE TARGET COORDINATES'
      },
      {
        id: 'fracture',
        nameJa: '結界破断',
        nameRomaji: 'Kekkai Hadan',
        nameEn: 'Sanctuary Rift',
        frameStart: 97,
        frameEnd: 144,
        subtitle: 'Sacred Shimenawa Knots Unravel Reality',
        incantation: '「真贋相愛」 (Shingan Sōai)',
        description:
          'Space parts like stained glass tied by giant sacred shimenawa wedding knots, revealing an endless twilight battlefield of steel.',
        telemetryLabel: 'BARRIER BOUNDARY:',
        telemetryValue: 'COORDINATE-LOCKED SPHERE'
      },
      {
        id: 'manifest',
        nameJa: '生得領域展開',
        nameRomaji: 'Shōtoku Ryōiki',
        nameEn: 'Hill of Infinite Katanas',
        frameStart: 145,
        frameEnd: 192,
        subtitle: 'Every Blade Holds a Copied Technique',
        incantation: '「どの刀に何が宿るかは、掴むまで分からない」',
        description:
          'Thousands of katanas stand planted across pale ruined hills under towering cross structures. Each blade unleashes a lethal copied technique on contact.',
        telemetryLabel: 'EXPANSION RADIUS:',
        telemetryValue: '90M SWORD GRAVEYARD'
      },
      {
        id: 'sure-hit',
        nameJa: '必中必殺',
        nameRomaji: 'Hitchū Hissatsu',
        nameEn: "Jacob's Ladder Extinguishment",
        frameStart: 193,
        frameEnd: 240,
        subtitle: 'Maximum Output: Technique Extinguishment',
        incantation: '「邪去侮の梯子 (Jacob’s Ladder) 出力最大！」',
        description:
          'A blinding golden pillar of celestial light descends directly upon the target, incinerating cursed objects and extinguishing innate techniques on impact.',
        telemetryLabel: 'SURE-KILL RULE:',
        telemetryValue: "JACOB'S LADDER + COPY BLADES"
      }
    ]
  },

  'idle-death-gamble': {
    id: 'idle-death-gamble',
    nameJa: '坐殺博徒',
    nameRomaji: 'Zasatsu Bakuto',
    nameEn: 'Idle Death Gamble',
    sorcererJa: '秤 金次',
    sorcererEn: 'Kinji Hakari',
    image: '/assets/frames/idle-death-gamble/frame_4.jpg',
    frames: [
      { index: 0, src: '/assets/frames/idle-death-gamble/frame_0.jpg', focalX: 0.54, focalY: 0.42, labelJa: '熱を帯びろ', labelEn: 'Fever Ignition', cameraZ: 'Z: 0.0m [ROULETTE IRIS]' },
      { index: 1, src: '/assets/frames/idle-death-gamble/frame_1.jpg', focalX: 0.50, focalY: 0.48, labelJa: '純愛列車予告', labelEn: 'Pachinko Probability Matrix', cameraZ: 'Z: 6.0m [1/239.2 ODDS]' },
      { index: 2, src: '/assets/frames/idle-death-gamble/frame_2.jpg', focalX: 0.46, focalY: 0.48, labelJa: '弁財天印', labelEn: 'Benzaiten Mudra', cameraZ: 'Z: 15.0m [FORTUNE SEAL]' },
      { index: 3, src: '/assets/frames/idle-death-gamble/frame_3.jpg', focalX: 0.48, focalY: 0.48, labelJa: '改札突破', labelEn: 'Transit Doors Slam', cameraZ: 'Z: 48.0m [RIICHI STAGE]' },
      { index: 4, src: '/assets/frames/idle-death-gamble/frame_4.jpg', focalX: 0.49, focalY: 0.48, labelJa: '終電パチンコ舞台', labelEn: 'Neon Station Parlor', cameraZ: 'Z: 140m [FEVER ARENA]' },
      { index: 5, src: '/assets/frames/idle-death-gamble/frame_5.jpg', focalX: 0.50, focalY: 0.50, labelJa: '大当たり 777', labelEn: '4m 11s Jackpot Immortality', cameraZ: 'Z: 777m [INFINITE CE]' }
    ],
    primaryColor: '#00ff88',
    secondaryColor: '#ffbe0b',
    accentColor: '#ff007f',
    bgGlow: 'rgba(0, 255, 136, 0.28)',
    mudraNameJa: '弁財天印',
    mudraNameEn: 'Benzaiten Mudra',
    mudraDeity: 'Benzaiten (Goddess of Fortune, Music & High-Stakes Luck)',
    mudraDescription:
      'Formed by extending index and middle fingers horizontally while interlocking the remaining digits, invoking the house edge and unyielding fever of fortune.',
    barrierType: 'Non-Lethal Rule-Based Closed Barrier (Ultra-Fast Activation < 0.1s)',
    isOpenBarrier: false,
    barrierRadius: '75 Meters (Subway Station Stage)',
    sureHitRule:
      'Harmlessly transmits the complete rules of the "Private Pure Love Train" pachinko game into the opponent’s brain at speed faster than 0.2s. Upon hitting a 777 Jackpot, Hakari gains limitless Cursed Energy and automatic Reverse Cursed Technique for 4 minutes and 11 seconds.',
    cursedEnergyOutput: '∞ CE [4m 11s JACKPOT IMMORTALITY]',
    baseCeNumeric: 299999,
    grade: 'SPECIAL GRADE EQUIVALENT // UNKILLABLE GAMBLER',
    bindingVows: [
      'Non-Lethal Sure-Hit Trade-off: Because the guaranteed hit only transfers game rules rather than damage, the domain’s activation speed and tug-of-war refinement surpass even lethal special-grade domains.',
      'Reflexive Auto-RCT: Overflowing infinite cursed energy automatically performs Reverse Cursed Technique throughout Hakari’s body without conscious thought.'
    ],
    metrics: {
      refinement: 96,
      lethality: 78,
      efficiency: 100,
      activationSpeed: 100,
      rangeScore: 80,
      clashResilience: 98
    },
    chants: [
      { ja: '熱', romaji: 'Netsu', en: 'Ride the Fever' },
      { ja: '確率変動', romaji: 'Kakuritsu Hendō', en: 'Probability Shift' },
      { ja: '純愛列車', romaji: 'Jun’ai Ressha', en: 'Private Pure Love Train' },
      { ja: '大当たり 777', romaji: 'Ōatari 777', en: '4m 11s Jackpot!' }
    ],
    phases: [
      {
        id: 'incantation',
        nameJa: '熱の胎動',
        nameRomaji: 'Netsu no Taidō',
        nameEn: 'Igniting the Fever',
        frameStart: 0,
        frameEnd: 48,
        subtitle: 'Rough-Textured Emerald Cursed Energy',
        incantation: '「賭けようぜ... 俺の『熱（フィーバー）』に！」',
        description:
          'Sparks of sandpaper-rough emerald and gold cursed energy erupt around Hakari as neon probability indicators begin spinning in the air.',
        telemetryLabel: 'CURSED ENERGY STATUS:',
        telemetryValue: 'FEVER GAUGE RISING (1/239.2)'
      },
      {
        id: 'mudra',
        nameJa: '印契',
        nameRomaji: 'Inkei',
        nameEn: 'The Benzaiten Seal',
        frameStart: 49,
        frameEnd: 96,
        subtitle: 'Mudra of the Goddess of Fortune',
        incantation: '「領域展開...」 (Ryōiki Tenkai)',
        description:
          'Hands snap into the Benzaiten seal. Faster than Mahito’s 0.2-second expansion in Shibuya, the pachinko rules flood the target’s mind.',
        telemetryLabel: 'BARRIER GEOMETRY:',
        telemetryValue: 'ULTRA-FAST NON-LETHAL RULE LOCK'
      },
      {
        id: 'fracture',
        nameJa: '改札閉鎖',
        nameRomaji: 'Kaisatsu Heisa',
        nameEn: 'Transit Gates Slam Shut',
        frameStart: 97,
        frameEnd: 144,
        subtitle: 'Riichi Reach Sequence Engaged',
        incantation: '「坐殺博徒！」 (Zasatsu Bakuto!)',
        description:
          'Subway station shutter doors and neon pachinko balls crash across Euclidean space, locking both fighters inside the final train scenario.',
        telemetryLabel: 'BARRIER BOUNDARY:',
        telemetryValue: 'RIICHI CUTSCENE ACTIVE'
      },
      {
        id: 'manifest',
        nameJa: '生得領域展開',
        nameRomaji: 'Shōtoku Ryōiki',
        nameEn: 'Private Pure Love Train Stage',
        frameStart: 145,
        frameEnd: 192,
        subtitle: 'Green, Red & Gold Indicator Previews',
        incantation: '「リーチ！終電に間に合うか！？」',
        description:
          'A dazzling neon train station platform materializes as giant slot reels spin overhead. Rainbow indicators flash to signal a guaranteed jackpot.',
        telemetryLabel: 'EXPANSION RADIUS:',
        telemetryValue: 'STATION PLATFORM ARENA'
      },
      {
        id: 'sure-hit',
        nameJa: '大当たり',
        nameRomaji: 'Ōatari',
        nameEn: '777 Jackpot Immortality',
        frameStart: 193,
        frameEnd: 240,
        subtitle: '4 Minutes & 11 Seconds of Infinite Cursed Energy',
        incantation: '「音楽が鳴り続く4分11秒間、秤金次は無敵となる！」',
        description:
          'Triple sevens lock in! Theme music blasts across the battlefield as infinite emerald cursed energy overflows, granting automatic instantaneous regeneration.',
        telemetryLabel: 'SURE-KILL RULE:',
        telemetryValue: '4M 11S IMMORTALITY ACTIVE (∞ CE)'
      }
    ]
  },

  'self-embodiment-of-perfection': {
    id: 'self-embodiment-of-perfection',
    nameJa: '自閉円頓裹',
    nameRomaji: 'Jihei Endonka',
    nameEn: 'Self-Embodiment of Perfection',
    sorcererJa: '真人',
    sorcererEn: 'Mahito',
    image: '/assets/frames/self-embodiment-of-perfection/frame_4.jpg',
    frames: [
      { index: 0, src: '/assets/frames/self-embodiment-of-perfection/frame_0.jpg', focalX: 0.52, focalY: 0.42, labelJa: '魂の輪郭', labelEn: 'Shape of the Soul', cameraZ: 'Z: 0.0m [STITCHED GAZE]' },
      { index: 1, src: '/assets/frames/self-embodiment-of-perfection/frame_1.jpg', focalX: 0.50, focalY: 0.50, labelJa: '無為転変', labelEn: 'Soul Suture Vortex', cameraZ: 'Z: 5.2m [SOUL THREADS]' },
      { index: 2, src: '/assets/frames/self-embodiment-of-perfection/frame_2.jpg', focalX: 0.50, focalY: 0.52, labelJa: '口内四手印', labelEn: 'Four-Handed Oral Mudra', cameraZ: 'Z: 13.0m [ORAL MANDALA]' },
      { index: 3, src: '/assets/frames/self-embodiment-of-perfection/frame_3.jpg', focalX: 0.50, focalY: 0.50, labelJa: '縫合線破断', labelEn: 'Suture Reality Tear', cameraZ: 'Z: 40.0m [PALM RIFT]' },
      { index: 4, src: '/assets/frames/self-embodiment-of-perfection/frame_4.jpg', focalX: 0.50, focalY: 0.48, labelJa: '掌の大聖堂', labelEn: 'Cathedral of Giant Hands', cameraZ: 'Z: 115m [HAND LABYRINTH]' },
      { index: 5, src: '/assets/frames/self-embodiment-of-perfection/frame_5.jpg', focalX: 0.50, focalY: 0.50, labelJa: '必中掌底', labelEn: 'Direct Soul Transfiguration', cameraZ: 'Z: 0.0mm [SOUL CORE]' }
    ],
    primaryColor: '#a855f7',
    secondaryColor: '#38bdf8',
    accentColor: '#e2e8f0',
    bgGlow: 'rgba(168, 85, 247, 0.28)',
    mudraNameJa: '四手合掌印 (口内)',
    mudraNameEn: 'Four-Handed Oral Mudra',
    mudraDeity: 'Avīci / Corrupted Lotus Sutra Perfection',
    mudraDescription:
      'Four miniature transfigured hands emerge directly from inside Mahito’s mouth and interlock their fingers into a geometric cage, bypassing external hand locks.',
    barrierType: 'Closed Spherical Barrier (0.2s High-Speed Soul Contact)',
    isOpenBarrier: false,
    barrierRadius: '65 Meters (Enclosed Palm Cathedral)',
    sureHitRule:
      'Inside the domain, every target is automatically resting in the palm of Mahito’s hand. Idle Transfiguration (無為転変) bypasses physical durability to reshape the victim’s soul blueprint instantaneously.',
    cursedEnergyOutput: '110,000 CE [BLACK FLASH AWAKENED]',
    baseCeNumeric: 110000,
    grade: 'SPECIAL GRADE CURSE (特級呪霊)',
    bindingVows: [
      '0.2-Second Black Flash Awakening: Merges barrier construction and Idle Transfiguration activation into a single step taking 0.2 seconds.',
      'Instant Spirit Body of Distorted Killing Vow: Sacrifices full-body metamorphic freedom to harden armour by 200%.'
    ],
    metrics: {
      refinement: 88,
      lethality: 99,
      efficiency: 89,
      activationSpeed: 96,
      rangeScore: 76,
      clashResilience: 86
    },
    chants: [
      { ja: '魂', romaji: 'Tamashii', en: 'Blueprint of the Soul' },
      { ja: '肉体', romaji: 'Nikutai', en: 'Flesh Follows Form' },
      { ja: '黒閃覚醒', romaji: 'Kokusen Kakusei', en: 'Sparks of Black Awakening' },
      { ja: '自閉円頓裹', romaji: 'Jihei Endonka', en: 'Self-Embodiment of Perfection' }
    ],
    phases: [
      {
        id: 'incantation',
        nameJa: '魂の鼓動',
        nameRomaji: 'Tamashii no Kodō',
        nameEn: 'Perceiving the Soul',
        frameStart: 0,
        frameEnd: 48,
        subtitle: 'Black Flash 120% Awakening',
        incantation: '「魂の形が見える... 感謝するよ！」',
        description:
          'Having landed Black Flash, Mahito perceives the true contour of his soul. Violet and ice-blue cursed energy sutures stitch across the dark.',
        telemetryLabel: 'CURSED ENERGY STATUS:',
        telemetryValue: 'SOUL RESONANCE (120% POTENTIAL)'
      },
      {
        id: 'mudra',
        nameJa: '口内印契',
        nameRomaji: 'Kōnai Inkei',
        nameEn: 'Four Hands Within the Mouth',
        frameStart: 49,
        frameEnd: 96,
        subtitle: 'Grotesque Oral Mudra Formation',
        incantation: '「領域展開...」 (Ryōiki Tenkai)',
        description:
          'Four extra hands sprout inside Mahito’s mouth and weave the sacred mudra in unison, completing the seal without needing his primary arms.',
        telemetryLabel: 'BARRIER GEOMETRY:',
        telemetryValue: 'ORAL FOUR-HAND SEAL LOCKED'
      },
      {
        id: 'fracture',
        nameJa: '縫合破断',
        nameRomaji: 'Hōgō Hadan',
        nameEn: 'Stitched Reality Rips Open',
        frameStart: 97,
        frameEnd: 144,
        subtitle: '0.2-Second Combined Step',
        incantation: '「自閉円頓裹！」 (Jihei Endonka!)',
        description:
          'Space tears apart along glowing suture lines as thousands of pale transfigured fingers reach outward from the rift.',
        telemetryLabel: 'BARRIER BOUNDARY:',
        telemetryValue: 'TWO-IN-ONE 0.2S ACTIVATION'
      },
      {
        id: 'manifest',
        nameJa: '生得領域展開',
        nameRomaji: 'Shōtoku Ryōiki',
        nameEn: 'Cathedral of Interlocked Hands',
        frameStart: 145,
        frameEnd: 192,
        subtitle: 'Every Inch is Within His Palm',
        incantation: '「もう触れられているんだよ、君の魂に」',
        description:
          'Colossal, Escher-like structures of giant intertwined hands and fingers form an endless dark cathedral around the victim.',
        telemetryLabel: 'EXPANSION RADIUS:',
        telemetryValue: 'CLOSED PALM CATHEDRAL'
      },
      {
        id: 'sure-hit',
        nameJa: '必中必殺',
        nameRomaji: 'Hitchū Hissatsu',
        nameEn: 'Idle Transfiguration Contact',
        frameStart: 193,
        frameEnd: 240,
        subtitle: 'Unavoidable Soul Blueprint Alteration',
        incantation: '「無為転変 (Idle Transfiguration)！」',
        description:
          'Distance ceases to exist. Being inside the domain equals direct skin-to-soul contact with Mahito’s palm, triggering instant transfiguration.',
        telemetryLabel: 'SURE-KILL RULE:',
        telemetryValue: 'DIRECT SOUL TOUCH ACTIVE'
      }
    ]
  }
};
