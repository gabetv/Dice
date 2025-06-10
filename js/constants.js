// --- START OF FILE constants.txt ---

export const BOARD_WIDTH = 13;
export const BOARD_HEIGHT = 13;
export const DICE_COUNT = 3;
export const MAX_MONSTERS_PER_PLAYER = 5;

export const CREST_TYPES = {
    MOVE: 'MOVE',
    ATTACK: 'ATTACK',
    DEFENSE: 'DEFENSE',
    MAGIC: 'MAGIC',
    TRAP: 'TRAP',
};

export const EVENT_TYPES = {
    POWER_RUNE: { name: 'Rune de Puissance' },
    VORTEX: { name: 'Vortex Instable' },
    TREASURE: { name: 'Trésor Caché' },
};

export const TERRAIN_TYPES = {
    NORMAL: {
        name: 'Chemin',
        class: 'terrain-normal'
    },
    FOREST: {
        name: 'Plaine',
        class: 'terrain-forest'
    },
    MOUNTAIN: {
        name: 'Montagne',
        class: 'terrain-mountain' // Gardons-le comme obstacle
    },
    WASTELAND: {
        name: 'Terre Aride',
        class: 'terrain-wasteland'
    }
};

// NOUVELLE BASE DE DONNÉES DE MONSTRES AVEC DE NOUVEAUX NOMS ET IMAGES
export const MONSTER_DATABASE = {
    // Joueur 1 (Rouge)
    1: {
        id: 1,
        name: "Guerrier Bestial",
        basePower: 3,
        pa: 3,
        img: "beast_warrior.png",
        type: "MONSTER" // AJOUT : Type pour identifier l'unité
    },
    2: {
        id: 2,
        name: "Dragon Rouge",
        basePower: 4,
        pa: 2,
        img: "red_dragon.png",
        type: "MONSTER" // AJOUT : Type pour identifier l'unité
    },
    3: {
        id: 3,
        name: "Assassin Sombre",
        basePower: 2,
        pa: 4,
        img: "dark_assassin.png",
        type: "MONSTER" // AJOUT : Type pour identifier l'unité
    },

    // Joueur 2 (Bleu)
    4: {
        id: 4,
        name: "Chevalier en Armure",
        basePower: 4,
        pa: 3,
        img: "armored_knight.png",
        type: "MONSTER" // AJOUT : Type pour identifier l'unité
    },
    5: {
        id: 5,
        name: "Serpent des Mers",
        basePower: 3,
        pa: 3,
        img: "sea_serpent.png",
        type: "MONSTER" // AJOUT : Type pour identifier l'unité
    },
    6: {
        id: 6,
        name: "Kappa Espiègle",
        basePower: 2,
        pa: 4,
        img: "kappa_trickster.png",
        type: "MONSTER" // AJOUT : Type pour identifier l'unité
    }
};

// Structures (Châteaux, Tours)
export const STRUCTURE_DATABASE = {
    P1_CASTLE: { name: 'Château Rouge', img: 'castle_p1.png', type: "CASTLE" }, // AJOUT : Type pour identifier la structure
    P2_CASTLE: { name: 'Château Bleu', img: 'castle_p2.png', type: "CASTLE" },  // AJOUT : Type pour identifier la structure
    TOWER: { name: 'Tour de Guet', img: 'tower.png', type: "STRUCTURE" } // Exemple si vous ajoutez des tours
};

// Icônes de l'UI
export const UI_ICONS = {
    MOVE: 'icon_move.png',
    DICE: 'icon_dice.png'
};
// --- END OF FILE constants.txt ---