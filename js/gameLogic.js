// --- START OF FILE gameLogic.txt ---

import gameState from './state.js';
import { BOARD_WIDTH, BOARD_HEIGHT, TERRAIN_TYPES, DICE_COUNT, MAX_MONSTERS_PER_PLAYER, MONSTER_DATABASE } from './constants.js';
import * as ui from './ui.js';

// --- Fonctions de Création & Initialisation ---
export function createBoardData() {
    gameState.board = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            let terrainType = 'FOREST';
            if (y > 4 && y < 8) terrainType = 'WASTELAND';
            if ((y > 0 && y < 12) && (x > 0 && x < 12) && !(y > 4 && y < 8)) terrainType = 'FOREST';
            if (y === 0 || y === 12 || x === 0 || x === 12 || (y > 4 && y < 8 && x > 4 && x < 8)) {
                terrainType = 'NORMAL';
            }
            if ((x === 6 && (y === 3 || y === 9))) terrainType = 'MOUNTAIN';

            row.push({
                x, y,
                isUnfolded: false,
                ownerId: null,
                content: null,
                terrain: terrainType,
            });
        }
        gameState.board.push(row);
    }
    
    gameState.players.forEach(p => {
        const castleTile = gameState.board[p.castlePos.y][p.castlePos.x];
        castleTile.isUnfolded = true;
        castleTile.ownerId = p.id;
    });
}

// --- Fonctions "Getters" (lecture de l'état) ---

export function getValidDeployLocations() {
    if (gameState.turn.movePoints <= 0) return [];
    
    const validMoves = new Set();
    const player = gameState.players.find(p => p.id === gameState.currentPlayerId);
    if (!player) return [];
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (gameState.board[y][x].ownerId === gameState.currentPlayerId) {
                const deltas = [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}];
                for (const delta of deltas) {
                    const newX = x + delta.dx;
                    const newY = y + delta.dy;
                    if (newX >= 0 && newX < BOARD_WIDTH && newY >= 0 && newY < BOARD_HEIGHT) {
                        if (!gameState.board[newY][newX].isUnfolded) {
                            validMoves.add(JSON.stringify({ x: newX, y: newY }));
                        }
                    }
                }
            }
        }
    }
    return Array.from(validMoves).map(str => JSON.parse(str));
}

export function getValidSummonLocations() {
    return gameState.board.flat().filter(tile => 
        tile.ownerId === gameState.currentPlayerId && !tile.content
    );
}

export function getValidMovementLocations(startX, startY) {
    const tile = gameState.board[startY]?.[startX];
    const monster = tile?.content?.data;
    if (!monster) return [];

    const remainingPA = gameState.turn.remainingPA.get(`${startX},${startY}`) || 0;
    if (remainingPA <= 0) return [];
    
    const locations = [];
    const deltas = [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}];
    deltas.forEach(d => {
        const newX = startX + d.dx;
        const newY = startY + d.dy;
        if (newX >= 0 && newX < BOARD_WIDTH && newY >= 0 && newY < BOARD_HEIGHT) {
            const destTile = gameState.board[newY][newX];
            if (!destTile.content && destTile.terrain !== 'MOUNTAIN') {
                locations.push({ x: newX, y: newY });
            }
        }
    });
    return locations;
}

export function getValidAttackLocations(startX, startY) {
    const remainingPA = gameState.turn.remainingPA.get(`${startX},${startY}`) || 0;
    if (remainingPA <= 0) return [];

    const locations = [];
    const deltas = [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}];
    deltas.forEach(d => {
        const newX = startX + d.dx;
        const newY = startY + d.dy;
        if (newX >= 0 && newX < BOARD_WIDTH && newY >= 0 && newY < BOARD_HEIGHT) {
            const destTile = gameState.board[newY][newX];
            if (destTile.content?.type === 'MONSTER' && destTile.ownerId !== gameState.currentPlayerId) {
                locations.push({ x: newX, y: newY });
            }
        }
    });
    return locations;
}

export function canSummonMonster(monsterId) {
    const monsterCount = gameState.board.flat().filter(t => t.content?.type === 'MONSTER' && t.ownerId === gameState.currentPlayerId).length;
    if (monsterCount >= MAX_MONSTERS_PER_PLAYER) return false;
    if (gameState.turn.movePoints <= 0) return false;
    return true;
}


// --- Fonctions "Setters" (modification de l'état) ---

export function deployTile(pos) {
    const validLocations = getValidDeployLocations();
    if (validLocations.some(l => l.x === pos.x && l.y === pos.y)) {
        const tile = gameState.board[pos.y][pos.x];
        tile.isUnfolded = true;
        tile.ownerId = gameState.currentPlayerId;
        gameState.turn.movePoints--;
        return true;
    }
    return false;
}


export function selectMonsterOnBoard(pos) {
    if (pos && gameState.turn.monsterActions.has(`${pos.x},${pos.y}`)) return;
    gameState.turn.selectedMonsterOnBoard = pos;
}

export function selectMonsterForSummon(monsterId) {
    if (gameState.turn.selectedMonsterToSummon === monsterId) {
        gameState.turn.selectedMonsterToSummon = null;
    } else {
        gameState.turn.selectedMonsterToSummon = monsterId;
    }
}

export function placeMonster(monsterId, position) {
    if (!canSummonMonster(monsterId)) return false;
    const tile = gameState.board[position.y][position.x];
    const validLocations = getValidSummonLocations();
    if (!validLocations.some(l => l.x === position.x && l.y === position.y)) return false;

    // MODIFICATION: Initialise la 'power' du monstre à sa 'basePower'
    const monsterData = { ...MONSTER_DATABASE[monsterId], power: MONSTER_DATABASE[monsterId].basePower };
    tile.content = { type: 'MONSTER', data: monsterData };
    gameState.turn.selectedMonsterToSummon = null;
    gameState.turn.movePoints--;
    return true;
}

export function moveMonster(from, to) {
    const fromTile = gameState.board[from.y][from.x];
    const toTile = gameState.board[to.y][to.x];
    const monsterKey = `${from.x},${from.y}`;

    toTile.content = fromTile.content;
    fromTile.content = null;
    toTile.isUnfolded = true;
    toTile.ownerId = gameState.currentPlayerId;

    const pa = gameState.turn.remainingPA.get(monsterKey) || 0;
    gameState.turn.remainingPA.delete(monsterKey);
    const newMonsterKey = `${to.x},${to.y}`;
    gameState.turn.remainingPA.set(newMonsterKey, pa - 1);
    if(pa - 1 <= 0) {
        gameState.turn.monsterActions.set(newMonsterKey, true);
    }
    
    selectMonsterOnBoard(to);
    checkForCastleAttack(to);
}

export function attackMonster(attackerPos, defenderPos) {
    const attackerTile = gameState.board[attackerPos.y][attackerPos.x];
    const defenderTile = gameState.board[defenderPos.y][defenderPos.x];
    const attacker = attackerTile.content.data;
    const defender = defenderTile.content.data;
    const attackerKey = `${attackerPos.x},${attackerPos.y}`;

    // MODIFICATION: Nouvelle logique de combat
    const damageDealt = attacker.power; // Les dégâts infligés sont la 'power' de l'attaquant
    defender.power -= damageDealt; // La 'power' du défenseur est réduite par la 'power' de l'attaquant

    if (defender.power > 0) {
        // Affiche la valeur de la 'power' retirée
        ui.showFloatingText(defenderPos, `-${damageDealt} POW`, 'damage');
    } else {
        ui.showFloatingText(defenderPos, `KO!`, 'event'); // Monstre vaincu
    }

    if (defender.power <= 0) {
        defenderTile.content = null; // Le monstre est détruit
        // Si le monstre est détruit, s'assurer de le retirer aussi des PA restants
        gameState.turn.remainingPA.delete(`${defenderPos.x},${defenderPos.y}`);
    }

    const pa = gameState.turn.remainingPA.get(attackerKey) || 0;
    gameState.turn.remainingPA.set(attackerKey, pa - 1);
    if(pa - 1 <= 0) {
        gameState.turn.monsterActions.set(attackerKey, true);
        selectMonsterOnBoard(null);
    }
}

function checkForCastleAttack(pos) {
    const opponent = gameState.players.find(p => p.id !== gameState.currentPlayerId);
    const dx = Math.abs(pos.x - opponent.castlePos.x);
    const dy = Math.abs(pos.y - opponent.castlePos.y);
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        opponent.hp -= 1;
        ui.showFloatingText(opponent.castlePos, `-1`, 'damage');
        if (opponent.hp <= 0) {
            gameState.gamePhase = 'GAME_OVER';
        }
    }
}

// --- Fonctions de Cycle de Jeu ---
export function rollDice() {
    gameState.turn.movePoints = 3;
    gameState.gamePhase = 'BUILD_PHASE';
    ui.logMessage(`Début de la phase de construction. ${gameState.turn.movePoints} points de mouvement.`, 'info');
}

export function startActionPhase() {
    gameState.gamePhase = 'ACTION_PHASE';
    gameState.turn.selectedMonsterOnBoard = null;
    gameState.turn.monsterActions.clear();
    gameState.turn.remainingPA.clear();

    gameState.board.forEach(row => row.forEach(tile => {
        if (tile.content?.type === 'MONSTER' && tile.ownerId === gameState.currentPlayerId) {
            // S'assurer que le monstre a une propriété 'power' pour les PA
            gameState.turn.remainingPA.set(`${tile.x},${tile.y}`, tile.content.data.pa);
        }
    }));
    ui.logMessage("Début de la phase d'action.", 'info');
}

export function endTurn() {
    ui.logMessage(`Fin du tour du Joueur ${gameState.currentPlayerId}.`, 'info');
    gameState.currentPlayerId = gameState.currentPlayerId === 1 ? 2 : 1;
    gameState.gamePhase = 'ROLL_PHASE';
    gameState.turn.selectedMonsterOnBoard = null;
}
// --- END OF FILE gameLogic.txt ---