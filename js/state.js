// --- START OF FILE state.txt ---

import { MONSTER_DATABASE } from './constants.js';

const gameState = {
    gameMode: null,
    players: [
        { 
            id: 1, 
            hp: 3, 
            // MODIFICATION: Ajuster la position du château pour le plateau 9x9
            castlePos: { x: 4, y: 8 }, // Centre en bas (colonne 4, ligne 8)
            // Joueur 1 (Rouge) commence avec ces monstres
            monsters: [MONSTER_DATABASE[1], MONSTER_DATABASE[2], MONSTER_DATABASE[3]],
            isAI: false,
        },
        { 
            id: 2, 
            hp: 3, 
            // MODIFICATION: Ajuster la position du château pour le plateau 9x9
            castlePos: { x: 4, y: 0 }, // Centre en haut (colonne 4, ligne 0)
            // Joueur 2 (Bleu) commence avec ces monstres
            monsters: [MONSTER_DATABASE[4], MONSTER_DATABASE[5], MONSTER_DATABASE[6]],
            isAI: false,
        }
    ],
    board: [],
    currentPlayerId: 1,
    gamePhase: "ROLL_PHASE", // ROLL_PHASE, BUILD_PHASE, ACTION_PHASE, GAME_OVER
    diceResult: [],
    turn: {
        movePoints: 0, 
        selectedMonsterToSummon: null,
        selectedMonsterOnBoard: null,
        monsterActions: new Map(), // Stocke les monstres qui ont agi
        remainingPA: new Map(), // Stocke les PA restants pour chaque monstre
    }
};

export default gameState;
// --- END OF FILE state.txt ---