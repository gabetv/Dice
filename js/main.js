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

let isGameOverHandled = false; // Flag pour s'assurer que le modal de fin de partie n'apparaît qu'une fois

// --- Initialisation du Jeu ---
function setupMenu() {
    document.getElementById('start-p-vs-ai').addEventListener('click', () => startGame('P_VS_AI'));
    document.getElementById('start-p-vs-p').addEventListener('click', () => startGame('P_VS_P'));
    document.getElementById('start-ai-vs-ai').addEventListener('click', () => startGame('AI_VS_AI'));
}

async function startGame(mode) {
    gameState.gameMode = mode;
    isGameOverHandled = false; // Réinitialiser le flag à chaque nouvelle partie
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
    // Le premier appel à updateAllUI va maintenant déclencher le tour de la première IA si nécessaire
    await updateAllUI(); 
    // L'ancienne logique pour lancer le premier tour d'IA est maintenant gérée dans updateAllUI
    // const firstPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    // if (firstPlayer.isAI) {
    //     await ai.playAITurn(updateAllUI);
    // }
}

// --- Boucle de Mise à Jour de l'UI ---
// Cette fonction est maintenant ASYNC pour gérer les tours de l'IA
async function updateAllUI() {
    ui.render(); // La fonction de rendu unique met à jour tous les éléments visuels

    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    
    // N'affiche les surlignages que si c'est un joueur humain
    if (!currentPlayer.isAI) {
        ui.clearHighlights(); // Toujours effacer avant de redessiner
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

    // NOUVEAU : Gérer le déroulement automatique des tours de l'IA
    // Si c'est la phase de lancer, que le joueur actuel est une IA, et que le jeu n'est pas terminé
    if (gameState.gamePhase === 'ROLL_PHASE' && currentPlayer.isAI && !isGameOverHandled) {
        // Ajouter un petit délai pour permettre à l'UI de se rafraîchir et montrer "L'IA réfléchit..."
        await new Promise(resolve => setTimeout(resolve, 500)); 
        await ai.playAITurn(updateAllUI); // L'IA joue son tour, et appellera updateAllUI à la fin
    }

    // Gérer la fin de partie (doit être la dernière vérification pour éviter les boucles infinies)
    if (gameState.gamePhase === 'GAME_OVER' && !isGameOverHandled) {
        isGameOverHandled = true; // Empêche des appels multiples
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
        // Si c'est le tour de l'IA ou que le jeu est terminé, le bouton est désactivé
        if (currentPlayer.isAI || isGameOverHandled) return; 
        
        const phase = gameState.gamePhase;
        if (phase === 'ROLL_PHASE') {
            logic.rollDice();
        } else if (phase === 'BUILD_PHASE') {
            logic.startActionPhase();
        } else if (phase === 'ACTION_PHASE') {
            logic.endTurn();
        }
        await updateAllUI(); // Appel asynchrone pour permettre à l'IA de jouer si nécessaire
    });

    // Clics sur le plateau de jeu
    boardElement.addEventListener('click', async (event) => { // Rendre async pour pouvoir attendre updateAllUI
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
            handleActionPhaseClick(x, y);
        }
        await updateAllUI(); // Appel asynchrone pour rafraîchir l'UI après l'action du joueur
    });

    // Clics sur les contrôles du joueur (cartes d'invocation)
    playerControlsElement.addEventListener('click', async (event) => { // Rendre async
        const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
        if (currentPlayer.isAI || isGameOverHandled) return;
        
        const card = event.target.closest('.control-card');
        if (!card || card.classList.contains('disabled')) return;

        if (card.dataset.monsterId) {
            const monsterId = parseInt(card.dataset.monsterId);
            logic.selectMonsterForSummon(monsterId);
        }
        await updateAllUI(); // Appel asynchrone
    });
}

function handleActionPhaseClick(x, y) {
    const selected = gameState.turn.selectedMonsterOnBoard;
    const clickedTile = gameState.board[y][x];

    if (selected) {
        const canMoveTo = logic.getValidMovementLocations(selected.x, selected.y).some(l => l.x === x && l.y === y);
        const canAttack = logic.getValidAttackLocations(selected.x, selected.y).some(l => l.x === x && l.y === y);

        if (canAttack) {
            logic.attackMonster(selected, { x, y });
        } else if (canMoveTo) {
            logic.moveMonster(selected, { x, y });
        } else {
            logic.selectMonsterOnBoard(null);
            if (clickedTile.content?.type === 'MONSTER' && clickedTile.ownerId === gameState.currentPlayerId) {
                logic.selectMonsterOnBoard({ x, y });
            }
        }
    } else if (clickedTile.content?.type === 'MONSTER' && clickedTile.ownerId === gameState.currentPlayerId) {
        logic.selectMonsterOnBoard({ x, y });
    }
}

// Démarrage de l'application
setupMenu();
// --- END OF FILE main.txt ---