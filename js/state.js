import { MONSTER_DATABASE } from './constants.js';

const gameState = {
    gameMode: null,
    players: [
        { 
            id: 1, 
            hp: 3, 
            castlePos: { x: 6, y: 12 },
            // Joueur 1 (Rouge) commence avec ces monstres
            monsters: [MONSTER_DATABASE[1], MONSTER_DATABASE[2], MONSTER_DATABASE[3]],
            isAI: false,
        },
        { 
            id: 2, 
            hp: 3, 
            castlePos: { x: 6, y: 0 },
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