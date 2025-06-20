// --- START OF FILE ui.txt ---

import gameState from './state.js';
import { MONSTER_DATABASE, STRUCTURE_DATABASE, UI_ICONS, TERRAIN_TYPES, BOARD_WIDTH, BOARD_HEIGHT } from './constants.js'; 
import * as logic from './gameLogic.js'; // Assurez-vous que logic est importé

// --- Récupération des éléments du DOM ---
const p1HpElement = document.getElementById('p1-hp');
const p2HpElement = document.getElementById('p2-hp');
const mainActionButton = document.getElementById('main-action-button');
const gamePhaseIndicator = document.getElementById('game-phase-indicator');
const boardElement = document.getElementById('game-board');
const playerControlsElement = document.getElementById('player-controls');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseButton = document.getElementById('modal-close-button');

const monsterDetailsPanel = document.getElementById('monster-details-panel');
const monsterNameElement = document.getElementById('monster-name');
const monsterPowerElement = document.getElementById('monster-power'); 
const monsterPaElement = document.getElementById('monster-pa');
const monsterPanelImg = document.getElementById('monster-panel-img');
const monsterPanelCloseBtn = document.getElementById('monster-panel-close-btn'); // NOUVEAU: Bouton de fermeture du panneau

// NOUVEAU: Ajouter un écouteur pour le bouton de fermeture du panneau
monsterPanelCloseBtn.addEventListener('click', () => {
    logic.selectMonsterOnBoard(null); // Désélectionne le monstre, ce qui cachera le panneau
    render(); // Forcer un rafraîchissement UI pour cacher le panneau
});


// --- Fonctions Utilitaires d'UI ---
export function showModal(title, message, onClose = null) {
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;
    modalBackdrop.classList.remove('hidden');
    const closeHandler = () => {
        modalBackdrop.classList.add('hidden');
        if (onClose) onClose();
        modalCloseButton.removeEventListener('click', closeHandler);
    };
    modalCloseButton.removeEventListener('click', closeHandler); 
    modalCloseButton.addEventListener('click', closeHandler);
}

export function showFloatingText(pos, text, type = 'damage') {
    const tile = boardElement.querySelector(`.tile[data-x='${pos.x}'][data-y='${pos.y}']`);
    if (tile) {
        const textElement = document.createElement('div');
        textElement.classList.add('floating-text', type);
        textElement.textContent = text;
        // Positionnement relatif à la tuile
        textElement.style.left = `${tile.offsetLeft + tile.offsetWidth / 2}px`;
        textElement.style.top = `${tile.offsetTop + tile.offsetHeight / 2}px`; 
        boardElement.appendChild(textElement);
        setTimeout(() => textElement.remove(), 1500);
    }
}

export function logMessage(message, type = 'info') {
    console.log(`[LOG - ${type.toUpperCase()}] ${message}`);
}

// NOUVEAU: Fonction pour afficher le panneau de détails d'un monstre
export function showMonsterDetails(monsterData, tilePos) {
    monsterNameElement.textContent = monsterData.name;
    monsterPowerElement.textContent = `${monsterData.currentPower} / ${monsterData.basePower}`;
    monsterPaElement.textContent = monsterData.remainingPa;
    monsterPanelImg.src = `./img/${monsterData.img}`; 
    monsterDetailsPanel.classList.remove('hidden-panel'); // Rendre le panneau visible
    
    // Optionnel: Si tu veux que le panneau apparaisse près du monstre cliqué,
    // tu devrais calculer sa position ici. Pour un popup central, ce n'est pas nécessaire.
    // Pour l'instant, on le laisse centré via CSS.
}

// NOUVEAU: Fonction pour cacher le panneau de détails d'un monstre
export function hideMonsterDetails() {
    monsterDetailsPanel.classList.add('hidden-panel'); // Cacher le panneau
}


// --- Fonctions de Rendu Principales ---

function drawUnit(unitData, pos, isSelected = false, hasActed = false, currentPower = null, basePower = null) { 
    const tile = boardElement.querySelector(`.tile[data-x='${pos.x}'][data-y='${pos.y}']`);
    if (!tile) return;

    const unit = document.createElement('img');
    unit.src = `./img/${unitData.img}`;
    unit.classList.add('unit-sprite');

    if (isSelected) unit.classList.add('selected');
    if (hasActed) unit.classList.add('has-acted');
    
    tile.appendChild(unit); // Appendre le sprite à la tuile

    // Afficher la 'power' si c'est un monstre
    if (currentPower !== null && unitData.type === 'MONSTER') {
        // --- Affichage du chiffre de Power ---
        const powerDisplay = document.createElement('div');
        powerDisplay.classList.add('monster-power-display');
        powerDisplay.textContent = currentPower;
        
        powerDisplay.style.bottom = `${tile.offsetHeight * 1.4}px`; 
        
        tile.appendChild(powerDisplay); 

        // --- Barre de Power ---
        if (basePower !== null) { 
            const powerBarContainer = document.createElement('div');
            powerBarContainer.classList.add('monster-power-bar-container');
            
            powerBarContainer.style.bottom = `${tile.offsetHeight * 1.15}px`; 

            const powerBarFill = document.createElement('div');
            powerBarFill.classList.add('monster-power-bar-fill');
            const powerPercentage = (currentPower / basePower) * 100;
            powerBarFill.style.width = `${powerPercentage}%`;

            if (powerPercentage > 60) {
                powerBarFill.style.backgroundColor = '#2ecc71'; // Vert
            } else if (powerPercentage > 30) {
                powerBarFill.style.backgroundColor = '#f39c12'; // Jaune
            } else {
                powerBarFill.style.backgroundColor = '#e74c3c'; // Rouge
            }

            powerBarContainer.appendChild(powerBarFill);
            tile.appendChild(powerBarContainer);
        }
    }
}

// Nettoie et redessine l'ensemble du jeu
export function render() {
    // 1. Mettre à jour les infos simples (PV, phase, bouton principal)
    p1HpElement.textContent = gameState.players[0].hp;
    p2HpElement.textContent = gameState.players[1].hp;
    const phaseTexts = { 'ROLL_PHASE': 'Phase de Lancer', 'BUILD_PHASE': 'Phase Construction', 'ACTION_PHASE': 'Phase d\'Action', 'GAME_OVER': 'Partie Terminée' };
    gamePhaseIndicator.textContent = `${phaseTexts[gameState.gamePhase] || ''} - Tour J${gameState.currentPlayerId}`;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    mainActionButton.disabled = false;
    if (currentPlayer.isAI && gameState.gamePhase !== 'GAME_OVER') {
        mainActionButton.textContent = 'L\'IA réfléchit...';
        mainActionButton.disabled = true;
    } else {
        if (gameState.gamePhase === 'ROLL_PHASE') mainActionButton.textContent = 'Lancer les Dés';
        else if (gameState.gamePhase === 'BUILD_PHASE') mainActionButton.textContent = `Passer à l'Action (${gameState.turn.movePoints} Mvt)`;
        else if (gameState.gamePhase === 'ACTION_PHASE') mainActionButton.textContent = 'Terminer le Tour';
        else if (gameState.gamePhase === 'GAME_OVER') {
            mainActionButton.textContent = 'Partie Terminée';
            mainActionButton.disabled = true;
        }
    }

    // 2. Nettoyer les éléments dynamiques (indicateurs, unités, surlignages, affichages de power et barres de power)
    for (let y = 0; y < BOARD_HEIGHT; y++) { 
        for (let x = 0; x < BOARD_WIDTH; x++) { 
            const tileElement = boardElement.querySelector(`.tile[data-x='${x}'][data-y='${y}']`);
            if (tileElement) {
                tileElement.querySelectorAll('.unit-sprite, .monster-power-display, .monster-power-bar-container').forEach(el => el.remove()); 
            }
        }
    }
    boardElement.querySelectorAll('.path-indicator, .highlight-indicator').forEach(el => el.remove());


    // 3. Redessiner les chemins des joueurs et les tuiles
    for (let y = 0; y < BOARD_HEIGHT; y++) { 
        for (let x = 0; x < BOARD_WIDTH; x++) { 
            const tileData = gameState.board[y][x];
            const tileElement = boardElement.querySelector(`.tile[data-x='${x}'][data-y='${y}']`);
            if (!tileElement) continue;

            tileElement.className = 'tile'; 
            tileElement.classList.add(`terrain-${tileData.terrain.toLowerCase()}`);

            if (tileData.isUnfolded) {
                const pathIndicator = document.createElement('div');
                pathIndicator.className = 'path-indicator';
                tileElement.appendChild(pathIndicator);
                tileElement.classList.add(`p${tileData.ownerId}-path`);
            } else {
                tileElement.classList.remove('p1-path', 'p2-path');
            }
        }
    }
    
    // 4. Redessiner les châteaux et les monstres
    drawUnit(STRUCTURE_DATABASE.P1_CASTLE, gameState.players[0].castlePos, false, false, null, null); 
    drawUnit(STRUCTURE_DATABASE.P2_CASTLE, gameState.players[1].castlePos, false, false, null, null);

    // MODIFICATION: On ne met plus à jour le panneau ici. C'est selectMonsterOnBoard qui le fera.
    // let selectedMonsterData = null; 
    for (let y = 0; y < BOARD_HEIGHT; y++) { 
        for (let x = 0; x < BOARD_WIDTH; x++) { 
            const tileData = gameState.board[y][x];
            if (tileData.content?.type === 'MONSTER') {
                const monster = tileData.content.data;
                const monsterKey = `${x},${y}`;
                const hasActed = gameState.turn.monsterActions.has(monsterKey); 
                // MODIFICATION: La sélection du monstre est gérée par logic.selectMonsterOnBoard
                const isSelected = gameState.turn.selectedMonsterOnBoard?.x === x && gameState.turn.selectedMonsterOnBoard?.y === y;
                
                drawUnit(monster, { x, y }, isSelected, hasActed, monster.power, MONSTER_DATABASE[monster.id].basePower); 
            }
        }
    }
    // Retirer la logique de mise à jour du panneau d'ici
    // if (selectedMonsterData) { ... } else { ... }


    // 5. Mettre à jour les contrôles du joueur
    playerControlsElement.innerHTML = '';
    if (gameState.gamePhase === 'BUILD_PHASE' && !currentPlayer.isAI) {
        const player = gameState.players.find(p => p.id === gameState.currentPlayerId);
        player.monsters.forEach(monster => {
            const card = document.createElement('button');
            card.className = 'control-card';
            card.dataset.monsterId = monster.id;
            card.innerHTML = `<img src="./img/${monster.img}" alt="${monster.name}">`;
            
            if (!logic.canSummonMonster(monster.id)) {
                card.classList.add('disabled');
            }
            if(gameState.turn.selectedMonsterToSummon === monster.id){
                card.style.transform = 'translateY(-5px)';
            }
            playerControlsElement.appendChild(card);
        });
    }
}

export function highlightTiles(locations, type) {
    locations.forEach(loc => {
        const tileElement = boardElement.querySelector(`.tile[data-x='${loc.x}'][data-y='${loc.y}']`);
        if(tileElement) {
            const highlight = document.createElement('div');
            highlight.className = 'highlight-indicator';
            const colors = {
                deploy: 'rgba(255, 255, 255, 0.4)',
                summon: 'rgba(52, 152, 219, 0.5)',
                move: 'rgba(46, 204, 113, 0.5)',
                attack: 'rgba(231, 76, 60, 0.5)'
            };
            highlight.style.setProperty('--highlight-color', colors[type]);
            tileElement.appendChild(highlight);
        }
    });
}

export function clearHighlights() {
    boardElement.querySelectorAll('.highlight-indicator').forEach(el => el.remove());
}

export function createBoardElements() {
    boardElement.innerHTML = '';
    for (let y = 0; y < BOARD_HEIGHT; y++) { 
        for (let x = 0; x < BOARD_WIDTH; x++) { 
            const tileElement = document.createElement('div');
            tileElement.classList.add('tile');
            tileElement.dataset.x = x;
            tileElement.style.position = 'relative'; 
            tileElement.dataset.y = y;
            boardElement.appendChild(tileElement);
        }
    }
}
// --- END OF FILE ui.txt ---