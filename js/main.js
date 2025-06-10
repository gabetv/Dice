// --- START OF FILE main.txt ---

import gameState from './state.js';
import * as ui from './ui.js';
import * as logic from './gameLogic.js';
import * as ai from './ai.js';

// --- Éléments du DOM ---
const mainMenuElement = document.getElementById('main-menu');
const gameContainerElement = document.getElementById('game-container');
const boardElement = document.getElementById('game-board');
const mainActionButton = document.getElementById('main-action-button');
const playerControlsElement = document.getElementById('player-controls');

let isGameOverHandled = false; 

// --- Initialisation du Jeu ---
function setupMenu() {
    document.getElementById('start-p-vs-ai').addEventListener('click', () => startGame('P_VS_AI'));
    document.getElementById('start-p-vs-p').addEventListener('click', () => startGame('P_VS_P'));
    document.getElementById('start-ai-vs-ai').addEventListener('click', () => startGame('AI_VS_AI'));
}

async function startGame(mode) {
    gameState.gameMode = mode;
    isGameOverHandled = false; 
    switch (mode) {
        case 'P_VS_AI': gameState.players[0].isAI = false; gameState.players[1].isAI = true; break;
        case 'P_VS_P': gameState.players[0].isAI = false; gameState.players[1].isAI = false; break;
        case 'AI_VS_AI': gameState.players[0].isAI = true; gameState.players[1].isAI = true; break;
    }
    mainMenuElement.classList.add('hidden');
    gameContainerElement.classList.remove('hidden');
    await initGame();
}

async function initGame() {
    logic.createBoardData();
    ui.createBoardElements();
    setupGameEventListeners();
    await updateAllUI(); 
}

// --- Boucle de Mise à Jour de l'UI ---
async function updateAllUI() {
    ui.render(); 

    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    
    if (!currentPlayer.isAI) {
        ui.clearHighlights(); 
        if (gameState.gamePhase === 'BUILD_PHASE') {
            ui.highlightTiles(logic.getValidDeployLocations(), 'deploy');
            if (gameState.turn.selectedMonsterToSummon) {
                ui.highlightTiles(logic.getValidSummonLocations(), 'summon');
            }
        } else if (gameState.gamePhase === 'ACTION_PHASE' && gameState.turn.selectedMonsterOnBoard) {
            const { x, y } = gameState.turn.selectedMonsterOnBoard;
            ui.highlightTiles(logic.getValidMovementLocations(x, y), 'move');
            ui.highlightTiles(logic.getValidAttackLocations(x, y), 'attack');
        }
    }

    if (gameState.gamePhase === 'ROLL_PHASE' && currentPlayer.isAI && !isGameOverHandled) {
        await new Promise(resolve => setTimeout(resolve, 500)); 
        await ai.playAITurn(updateAllUI); 
    }

    if (gameState.gamePhase === 'GAME_OVER' && !isGameOverHandled) {
        isGameOverHandled = true; 
        const winner = gameState.players.find(p => p.hp > 0);
        setTimeout(() => {
            const message = winner ? `Le Joueur ${winner.id} a gagné !` : "C'est une égalité !";
            ui.showModal("Partie Terminée !", message, () => window.location.reload());
        }, 1000);
    }
}

// --- Gestion des Événements ---
function setupGameEventListeners() {
    // Clic sur le bouton d'action principal
    mainActionButton.addEventListener('click', async () => {
        const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
        if (currentPlayer.isAI || isGameOverHandled) return; 
        
        const phase = gameState.gamePhase;
        if (phase === 'ROLL_PHASE') {
            logic.rollDice();
        } else if (phase === 'BUILD_PHASE') {
            logic.startActionPhase();
        } else if (phase === 'ACTION_PHASE') {
            logic.endTurn();
        }
        await updateAllUI(); 
    });

    // Clics sur le plateau de jeu
    boardElement.addEventListener('click', async (event) => { 
        const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
        if (currentPlayer.isAI || isGameOverHandled) return;

        const tileElement = event.target.closest('.tile');
        if (!tileElement) return;

        const x = parseInt(tileElement.dataset.x);
        const y = parseInt(tileElement.dataset.y);

        if (gameState.gamePhase === 'BUILD_PHASE') {
            if (gameState.turn.selectedMonsterToSummon) {
                logic.placeMonster(gameState.turn.selectedMonsterToSummon, { x, y });
            } else {
                logic.deployTile({ x, y });
            }
        } else if (gameState.gamePhase === 'ACTION_PHASE') {
            // MODIFICATION: Simplifier l'appel, handleActionPhaseClick gère la sélection
            handleActionPhaseClick(x, y); 
        }
        await updateAllUI(); 
    });

    // Clics sur les contrôles du joueur (cartes d'invocation)
    playerControlsElement.addEventListener('click', async (event) => { 
        const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
        if (currentPlayer.isAI || isGameOverHandled) return;
        
        const card = event.target.closest('.control-card');
        if (!card || card.classList.contains('disabled')) return;

        if (card.dataset.monsterId) {
            const monsterId = parseInt(card.dataset.monsterId);
            logic.selectMonsterForSummon(monsterId);
        }
        await updateAllUI(); 
    });
}

// MODIFICATION: handleActionPhaseClick utilise directement logic.selectMonsterOnBoard
function handleActionPhaseClick(x, y) {
    const selected = gameState.turn.selectedMonsterOnBoard;
    const clickedTile = gameState.board[y][x];

    if (selected) {
        // Le joueur a déjà un monstre sélectionné, il veut attaquer ou se déplacer
        const canMoveTo = logic.getValidMovementLocations(selected.x, selected.y).some(l => l.x === x && l.y === y);
        const canAttack = logic.getValidAttackLocations(selected.x, selected.y).some(l => l.x === x && l.y === y);

        if (canAttack) {
            logic.attackMonster(selected, { x, y });
        } else if (canMoveTo) {
            logic.moveMonster(selected, { x, y });
        } else {
            // Clic ailleurs, on désélectionne ou sélectionne un autre monstre
            // Si on clique sur un autre monstre du joueur, logic.selectMonsterOnBoard le gérera
            // Si on clique sur un monstre ennemi ou une case vide, logic.selectMonsterOnBoard(null) le gérera
            logic.selectMonsterOnBoard({ x, y }); // Tente de sélectionner la nouvelle case
        }
    } else { 
        // Le joueur n'a pas de monstre sélectionné et clique sur une case
        // logic.selectMonsterOnBoard gérera si c'est un monstre valide ou non
        logic.selectMonsterOnBoard({ x, y });
    }
}

// Démarrage de l'application
setupMenu();
// --- END OF FILE main.txt ---