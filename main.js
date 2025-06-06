import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import TWEEN from '@tweenjs/tween.js';
import { FORGE_COST, RARETES, forgeItemFromResults, calculateChampionPower, generateNewMonster } from './game-logic.js';

// =============================================================================
// --- SETUP DE LA SCÈNE 3D ET DE LA PHYSIQUE ---
// =============================================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('scene-container').appendChild(renderer.domElement);
const physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);
const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
physicsWorld.addBody(groundBody);
const wallSize = 5;
const wallBackBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
wallBackBody.position.set(0, 0, -wallSize);
physicsWorld.addBody(wallBackBody);
const wallFrontBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
wallFrontBody.quaternion.setFromEuler(0, Math.PI, 0);
wallFrontBody.position.set(0, 0, wallSize);
physicsWorld.addBody(wallFrontBody);
const wallLeftBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
wallLeftBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
wallLeftBody.position.set(-wallSize, 0, 0);
physicsWorld.addBody(wallLeftBody);
const wallRightBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
wallRightBody.quaternion.setFromEuler(0, -Math.PI / 2, 0);
wallRightBody.position.set(wallSize, 0, 0);
physicsWorld.addBody(wallRightBody);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

// =============================================================================
// --- GESTIONNAIRE AUDIO ---
// =============================================================================
const sounds = { click: new Audio('./audio/click.mp3'), dice: new Audio('./audio/dice.mp3'), reveal: new Audio('./audio/reveal.mp3'), };
function playSound(sound) { if (!sound) return; sound.currentTime = 0; sound.play().catch(error => console.log(`Erreur de lecture audio: ${error}`)); }

// =============================================================================
// --- ÉTAT DU JEU ET GESTION DE LA SAUVEGARDE ---
// =============================================================================
let soulFragments = 1000;
let inventory = [];
let lastForgedItem = null;
let selectedItemForUpgrade = null;
let championPower = 0;
let currentMonster = null;
let battleViewInterval = null;

function saveData() { const gameState = { soulFragments: soulFragments, inventory: inventory }; localStorage.setItem('gachaGameState', JSON.stringify(gameState)); }
function loadData() { const savedState = localStorage.getItem('gachaGameState'); if (savedState) { const gameState = JSON.parse(savedState); soulFragments = gameState.soulFragments || 1000; inventory = gameState.inventory || []; } }

// =============================================================================
// --- GESTION DES OBJETS 3D ---
// =============================================================================
let diceObjects = []; 
let isThrowing = false;
let forgedItemMesh = null;
let settleTimer = -1;
const diceMaterials = [ new THREE.MeshStandardMaterial({ color: 0xff0000 }), new THREE.MeshStandardMaterial({ color: 0x00ff00 }), new THREE.MeshStandardMaterial({ color: 0x0000ff }), new THREE.MeshStandardMaterial({ color: 0xffff00 }), new THREE.MeshStandardMaterial({ color: 0xff00ff }), new THREE.MeshStandardMaterial({ color: 0x00ffff }), ];
const diceGeometry = new THREE.BoxGeometry(1, 1, 1);

function createDice() { const mesh = new THREE.Mesh(diceGeometry, diceMaterials); mesh.castShadow = true; scene.add(mesh); const body = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)) }); physicsWorld.addBody(body); return { mesh, body }; }
function getDiceFace(dice) { const upVector = new THREE.Vector3(0, 1, 0); let closestFaceIndex = -1, maxDot = -Infinity; const faceNormals = [ new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1) ]; for (let i = 0; i < faceNormals.length; i++) { const worldNormal = faceNormals[i].clone().applyQuaternion(dice.mesh.quaternion); const dot = worldNormal.dot(upVector); if (dot > maxDot) { maxDot = dot; closestFaceIndex = i; } } const faceValues = [1, 6, 2, 5, 3, 4]; return faceValues[closestFaceIndex]; }
function displayForgedItem(itemData) { if (!forgedItemMesh) { const geometry = new THREE.IcosahedronGeometry(1.5, 0); const material = new THREE.MeshStandardMaterial({ metalness: 0.7, roughness: 0.3 }); forgedItemMesh = new THREE.Mesh(geometry, material); forgedItemMesh.castShadow = true; scene.add(forgedItemMesh); } forgedItemMesh.material.color.set(itemData.couleur); forgedItemMesh.position.set(0, 2, 0); forgedItemMesh.visible = true; forgedItemMesh.scale.set(0, 0, 0); new TWEEN.Tween(forgedItemMesh.scale).to({ x: 1, y: 1, z: 1 }, 500).easing(TWEEN.Easing.Elastic.Out).start(); }

// =============================================================================
// --- SÉQUENCE D'ANIMATION ET CONTRÔLE DU JEU ---
// =============================================================================
function throwDice() { if (isThrowing) return; if (soulFragments < FORGE_COST) { itemNameLabel.textContent = "Pas assez de fragments !"; itemStatsLabel.textContent = `Il vous manque ${FORGE_COST - soulFragments} fragments.`; return; } playSound(sounds.dice); soulFragments -= FORGE_COST; isThrowing = true; settleTimer = -1; forgeButton.disabled = true; dismantleButton.classList.add('hidden'); if (forgedItemMesh) forgedItemMesh.visible = false; diceObjects.forEach(d => { scene.remove(d.mesh); physicsWorld.removeBody(d.body); }); diceObjects = []; for (let i = 0; i < 4; i++) { const dice = createDice(); diceObjects.push(dice); dice.body.position.set((Math.random() - 0.5) * 2, 5 + i * 2, (Math.random() - 0.5) * 2); const force = new CANNON.Vec3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30); const torque = new CANNON.Vec3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20); dice.body.applyImpulse(force); dice.body.applyTorque(torque); } }
function startRevealAnimation(results) { const finalItem = forgeItemFromResults(results); inventory.push(finalItem); lastForgedItem = finalItem; updateChampion(); saveData(); const targetPosition = new THREE.Vector3(0, 2, 0); diceObjects.forEach((dice, index) => { new TWEEN.Tween(dice.mesh.position).to(targetPosition, 700).easing(TWEEN.Easing.Quadratic.In).delay(index * 100).start(); new TWEEN.Tween(dice.mesh.scale).to({ x: 0, y: 0, z: 0 }, 800).easing(TWEEN.Easing.Quadratic.In).delay(index * 100).onComplete(() => { if (index === diceObjects.length - 1) { playSound(sounds.reveal); diceObjects.forEach(d => d.mesh.visible = false); displayForgedItem(finalItem); itemNameLabel.textContent = finalItem.nom; itemStatsLabel.textContent = `Puissance: ${finalItem.puissance}`; forgeButton.disabled = false; dismantleButton.classList.remove('hidden'); } }).start(); }); }
function triggerReveal() { isThrowing = false; diceObjects.forEach(d => d.body.type = CANNON.Body.STATIC); const results = diceObjects.map(d => getDiceFace(d)); itemNameLabel.textContent = "Assemblage de l'artefact..."; itemStatsLabel.textContent = `[${results.join(', ')}]`; startRevealAnimation(results); }

// =============================================================================
// --- GESTION DE L'INTERFACE UTILISATEUR (UI) ---
// =============================================================================
const itemNameLabel = document.getElementById('item-name-label');
const itemStatsLabel = document.getElementById('item-stats-label');
const forgeButton = document.getElementById('forge-button');
const currencyDisplay = document.getElementById('currency-display');
const dismantleButton = document.getElementById('dismantle-button');
const inventoryButton = document.getElementById('inventory-button');
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryList = document.getElementById('inventory-list');
const inventoryCloseButton = document.getElementById('inventory-close-button');
const battleViewButton = document.getElementById('battle-view-button');
const battleModal = document.getElementById('battle-modal');
const battleModalCloseButton = document.getElementById('battle-modal-close-button');
const modalChampionPower = document.getElementById('modal-champion-power');
const modalFragmentsPerSecond = document.getElementById('modal-fragments-per-second');
const modalMonsterName = document.getElementById('modal-monster-name');
const modalMonsterProgressFill = document.getElementById('modal-monster-progress-fill');
const damageFlash = document.getElementById('damage-flash');

function updateChampion() { championPower = calculateChampionPower(inventory); }
function dismantleLastItem() { if (!lastForgedItem) return; const fragmentsGained = Math.round(FORGE_COST * 0.2); soulFragments += fragmentsGained; const itemIndex = inventory.findIndex(item => item.id === lastForgedItem.id); if(itemIndex > -1) { inventory.splice(itemIndex, 1); } itemNameLabel.textContent = `Objet démantelé !`; itemStatsLabel.textContent = `+${fragmentsGained} fragments récupérés.`; lastForgedItem = null; if (forgedItemMesh) forgedItemMesh.visible = false; dismantleButton.classList.add('hidden'); updateChampion(); saveData(); }
function openInventory() { populateInventory(); inventoryPanel.classList.remove('hidden'); }
function closeInventory() { inventoryPanel.classList.add('hidden'); selectedItemForUpgrade = null; }
function populateInventory() { inventoryList.innerHTML = ''; if (inventory.length === 0) { inventoryList.innerHTML = '<p>Votre inventaire est vide. Forgez des objets !</p>'; return; } inventory.sort((a, b) => b.puissance - a.puissance); inventory.forEach((item) => { const itemDiv = document.createElement('div'); itemDiv.className = 'inventory-item'; const rarityData = Object.values(RARETES).find(r => r.nom === item.rareté); itemDiv.style.borderLeftColor = rarityData ? rarityData.couleur : 'gray'; itemDiv.innerHTML = `<p class="item-name">${item.nom}</p><p class="item-power">Puissance: ${item.puissance}</p>`; itemDiv.dataset.id = item.id; itemDiv.addEventListener('click', () => handleItemClick(item.id)); inventoryList.appendChild(itemDiv); }); }
function handleItemClick(clickedItemId) { const clickedItemIndex = inventory.findIndex(item => item.id === clickedItemId); if (clickedItemIndex === -1) return; const clickedItem = inventory[clickedItemIndex]; document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected')); document.querySelector(`.inventory-item[data-id="${clickedItemId}"]`).classList.add('selected'); if (!selectedItemForUpgrade) { selectedItemForUpgrade = clickedItem; } else { if (selectedItemForUpgrade.id === clickedItemId) { alert("Vous ne pouvez pas sacrifier un objet pour s'améliorer lui-même ! Annulation de la sélection."); selectedItemForUpgrade = null; document.querySelector(`.inventory-item[data-id="${clickedItemId}"]`).classList.remove('selected'); return; } const baseItem = selectedItemForUpgrade; const powerGain = Math.round(clickedItem.puissance * 0.1) + 1; baseItem.puissance += powerGain; if (!baseItem.nom.includes('+')) { baseItem.nom = `${baseItem.nom} +1`; } else { let [name, levelStr] = baseItem.nom.split('+'); let level = parseInt(levelStr.trim()) + 1; baseItem.nom = `${name.trim()} +${level}`; } inventory.splice(clickedItemIndex, 1); playSound(sounds.upgrade); alert(`Amélioration réussie !`); selectedItemForUpgrade = null; updateChampion(); populateInventory(); saveData(); } }
function openBattleView() { playSound(sounds.click); battleModal.classList.remove('hidden'); if (battleViewInterval) clearInterval(battleViewInterval); battleViewInterval = setInterval(animateBattleHit, 1200); animateBattleHit(); }
function closeBattleView() { playSound(sounds.click); battleModal.classList.add('hidden'); clearInterval(battleViewInterval); battleViewInterval = null; }
function animateBattleHit() { if (!currentMonster || championPower <= 0) return; const hitDamage = Math.round(championPower / 5 + (Math.random() - 0.5) * (championPower / 10)); damageFlash.textContent = `-${hitDamage}`; damageFlash.classList.remove('active'); void damageFlash.offsetWidth; damageFlash.classList.add('active'); }
function updateBattleUI() { modalChampionPower.textContent = championPower; modalFragmentsPerSecond.textContent = (championPower / 10).toFixed(1); if (currentMonster) { modalMonsterName.textContent = currentMonster.name; const progressPercent = Math.min((currentMonster.progress / currentMonster.toughness) * 100, 100); modalMonsterProgressFill.style.width = `${progressPercent}%`; } }

// Listeners
forgeButton.addEventListener('click', () => { playSound(sounds.click); throwDice(); });
dismantleButton.addEventListener('click', () => { playSound(sounds.click); dismantleLastItem(); });
inventoryButton.addEventListener('click', () => { playSound(sounds.click); openInventory(); });
inventoryCloseButton.addEventListener('click', () => { playSound(sounds.click); closeInventory(); });
battleViewButton.addEventListener('click', openBattleView);
battleModalCloseButton.addEventListener('click', closeBattleView);

// =============================================================================
// --- BOUCLE PRINCIPALE DU JEU ---
// =============================================================================
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (championPower > 0) {
        const fragmentsGained = (championPower / 10) * delta;
        soulFragments += fragmentsGained;
        if (currentMonster) {
            currentMonster.progress += championPower * delta;
            if (currentMonster.progress >= currentMonster.toughness) {
                const bonusFragments = Math.round(currentMonster.toughness / 5);
                soulFragments += bonusFragments;
                currentMonster = generateNewMonster(championPower);
            }
        }
    }
    
    currencyDisplay.textContent = `Fragments: ${Math.floor(soulFragments)}`;
    if (battleViewInterval) { updateBattleUI(); }
    
    TWEEN.update(); 
    physicsWorld.step(1 / 60, delta);
    
    for (const dice of diceObjects) { if (dice.body.type !== CANNON.Body.STATIC) { dice.mesh.position.copy(dice.body.position); dice.mesh.quaternion.copy(dice.body.quaternion); } }
    if (forgedItemMesh && forgedItemMesh.visible) { forgedItemMesh.rotation.y += 0.01; }
    
    if (isThrowing) { const velocityThreshold = 0.1; const allSettled = diceObjects.every(d => d.body.velocity.length() < velocityThreshold && d.body.angularVelocity.length() < velocityThreshold); if (allSettled) { if (settleTimer === -1) { settleTimer = 0.5; } else { settleTimer -= delta; } if (settleTimer <= 0) { triggerReveal(); } } else { settleTimer = -1; } }
    
    renderer.render(scene, camera);
}

// Initialisation
loadData();
updateChampion(); 
currentMonster = generateNewMonster(championPower);
animate();