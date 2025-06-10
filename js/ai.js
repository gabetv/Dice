// --- START OF FILE ai.txt ---

import gameState from './state.js';
import { MONSTER_DATABASE, BOARD_WIDTH, BOARD_HEIGHT } from './constants.js';
import * as logic from './gameLogic.js';
import * as ui from './ui.js'; 

const AI_ACTION_DELAY = 500;

async function performDelayedAction(action, updateUICallback, logMessageText = null) {
    if (logMessageText) {
        const aiPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
        ui.logMessage(`IA (J${aiPlayer.id}): ${logMessageText}`, 'ai-action');
    }
    action();
    updateUICallback();
    await new Promise(resolve => setTimeout(resolve, AI_ACTION_DELAY));
}

function findShortestPath(startPos, endPos) {
    const queue = [{ pos: startPos, cost: 0, path: [startPos] }];
    const visited = new Set([`${startPos.x},${startPos.y}`]);
    
    while (queue.length > 0) {
        queue.sort((a, b) => a.cost - b.cost);
        const { pos, cost, path } = queue.shift();

        if (pos.x === endPos.x && pos.y === endPos.y) {
            return path;
        }

        const deltas = [{dx:0, dy:1}, {dx:0, dy:-1}, {dx:1, dy:0}, {dx:-1, dy:0}];
        for (const delta of deltas) {
            const newX = pos.x + delta.dx;
            const newY = pos.y + delta.dy;
            const newKey = `${newX},${newY}`;

            if (newX >= 0 && newX < BOARD_WIDTH && newY >= 0 && newY < BOARD_HEIGHT && !visited.has(newKey)) {
                visited.add(newKey);
                const terrain = gameState.board[newY][newX].terrain;
                
                if (terrain !== 'MOUNTAIN') {
                    const newCost = cost + 1;
                    const newPath = [...path, { x: newX, y: newY }];
                    queue.push({ pos: { x: newX, y: newY }, cost: newCost, path: newPath });
                }
            }
        }
    }
    return null;
}

export async function playAITurn(updateUICallback) {
    const aiPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    const opponent = gameState.players.find(p => p.id !== gameState.currentPlayerId);
    
    // Phase 1: Roll & Build
    await performDelayedAction(logic.rollDice, updateUICallback, "lance les dés.");
    
    // Déployer & Invoquer
    while (gameState.turn.movePoints > 0) {
        // Priorité 1: Invoquer un monstre si possible
        const summonableMonsters = aiPlayer.monsters.filter(m => logic.canSummonMonster(m.id));
        if (summonableMonsters.length > 0) {
            const summonLocations = logic.getValidSummonLocations();
            if (summonLocations.length > 0) {
                // Invoque le monstre le plus "fort" (basé sur basePower) sur la case la plus proche du château adverse
                // MODIFICATION: Trier par basePower au lieu de atk+def
                summonableMonsters.sort((a, b) => b.basePower - a.basePower);
                const monsterToSummon = summonableMonsters[0];
                summonLocations.sort((a, b) => (Math.abs(a.x - opponent.castlePos.x) + Math.abs(a.y - opponent.castlePos.y)) - (Math.abs(b.x - opponent.castlePos.x) + Math.abs(b.y - opponent.castlePos.y)));
                const bestSpot = summonLocations[0];

                await performDelayedAction(() => {
                    logic.placeMonster(monsterToSummon.id, bestSpot);
                }, updateUICallback, `invoque ${monsterToSummon.name}.`);
                continue; 
            }
        }
        break; 
    }

    // Phase 2: Action
    await performDelayedAction(logic.startActionPhase, updateUICallback, "commence sa phase d'action.");
    
    let monstersToAct = [];
    for (let y = 0; y < gameState.board.length; y++) {
        for (let x = 0; x < gameState.board[y].length; x++) {
            const tile = gameState.board[y][x];
            if (tile.content?.type === 'MONSTER' && tile.ownerId === aiPlayer.id) {
                monstersToAct.push({ x, y });
            }
        }
    }
    // Fait agir les monstres les plus proches du château adverse en premier
    monstersToAct.sort((a, b) => (Math.abs(a.x - opponent.castlePos.x) + Math.abs(a.y - opponent.castlePos.y)) - (Math.abs(b.x - opponent.castlePos.x) + Math.abs(b.y - opponent.castlePos.y)));

    for (const startPos of monstersToAct) {
        if (!gameState.turn.monsterActions.has(`${startPos.x},${startPos.y}`)) {
            logic.selectMonsterOnBoard(startPos);
            await decideAndAct(startPos, opponent, updateUICallback);
        }
    }
    
    logic.selectMonsterOnBoard(null);
    await performDelayedAction(logic.endTurn, updateUICallback, "termine son tour.");
}

async function decideAndAct(pos, opponent, updateUICallback) {
    const tile = gameState.board[pos.y][pos.x];
    if (!tile?.content) return;
    const monster = tile.content.data;
    const monsterKey = `${pos.x},${pos.y}`; 

    while ((gameState.turn.remainingPA.get(monsterKey) || 0) > 0) {
        let actionTaken = false;

        // Priorité 1: Attaquer
        const attackLocations = logic.getValidAttackLocations(pos.x, pos.y);
        if (attackLocations.length > 0) {
            // Cible le monstre avec le moins de POWER (ex-HP)
            // MODIFICATION: Trier par power au lieu de hp
            attackLocations.sort((a, b) => gameState.board[a.y][a.x].content.data.power - gameState.board[b.y][b.x].content.data.power);
            const targetPos = attackLocations[0];
            const defender = gameState.board[targetPos.y][targetPos.x].content.data;
            await performDelayedAction(() => logic.attackMonster(pos, targetPos), updateUICallback, `${monster.name} attaque ${defender.name}.`);
            actionTaken = true;
        }

        if (actionTaken) continue; 

        // Priorité 2: Se déplacer
        const moveLocations = logic.getValidMovementLocations(pos.x, pos.y);
        if (moveLocations.length > 0) {
            // Se déplace vers la case la plus proche du château adverse
            moveLocations.sort((a, b) => (Math.abs(a.x - opponent.castlePos.x) + Math.abs(a.y - opponent.castlePos.y)) - (Math.abs(b.x - opponent.castlePos.x) + Math.abs(b.y - opponent.castlePos.y)));
            const bestMove = moveLocations[0];
            await performDelayedAction(() => logic.moveMonster(pos, bestMove), updateUICallback, `${monster.name} se déplace.`);
            
            // Mettre à jour la position pour la boucle suivante
            pos = bestMove;
            actionTaken = true;
        }

        if (!actionTaken) {
            break;
        }
    }
    gameState.turn.monsterActions.set(`${pos.x},${pos.y}`, true);
}
// --- END OF FILE ai.txt ---