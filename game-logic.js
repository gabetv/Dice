// =============================================================================
// --- DONNÉES DE JEU (Les "Règles du Monde") ---
// =============================================================================

export const FORGE_COST = 100;

export const TYPES = ["Épée", "Arc", "Bâton", "Casque", "Plastron", "Anneau"];

export const RARETES = {
    1: { nom: "Détruit", couleur: "#333333", multiplicateur: 0.5 },
    2: { nom: "Commun", couleur: "#9e9e9e", multiplicateur: 1.0 },
    3: { nom: "Insolite", couleur: "#4caf50", multiplicateur: 1.5 },
    4: { nom: "Rare", couleur: "#2196f3", multiplicateur: 2.5 },
    5: { nom: "Épique", couleur: "#9c27b0", multiplicateur: 4.0 },
    6: { nom: "Légendaire", couleur: "#ff9800", multiplicateur: 7.0 }
};

export const MATERIAUX = ["Bois", "Fer", "Acier", "Argent", "Mithril", "Obsidienne"];
export const AFFIXES = ["de Feu", "de Glace", "de la Hâte", "du Vampire", "du Titan", "de la Fortune"];

const MONSTER_ADJECTIVES = ["Faible", "Robuste", "Ancien", "Corrompu", "Enragé"];
const MONSTER_NOUNS = ["Gobelin", "Loup", "Golem", "Spectre", "Démon"];


// =============================================================================
// --- FONCTIONS DE LOGIQUE PURE (Calculs et Transformations de Données) ---
// =============================================================================

/**
 * Crée un nouvel objet basé sur les résultats des dés.
 * @param {number[]} results - Un tableau de 4 chiffres (de 1 à 6).
 * @returns {object} L'objet forgé avec toutes ses propriétés.
 */
export function forgeItemFromResults(results) {
    const typeResult = results[0] - 1;
    const rarityResult = results[1];
    const materialResult = results[2] - 1;
    const affixResult = results[3] - 1;

    const uniqueId = self.crypto.randomUUID();
    const itemType = TYPES[typeResult];
    const itemRarityData = RARETES[rarityResult];
    const itemMaterial = MATERIAUX[materialResult];
    const itemAffix = AFFIXES[affixResult];
    
    const finalName = `${itemType} ${itemRarityData.nom} en ${itemMaterial} ${itemAffix}`;
    const basePower = (materialResult + 1) * 10;
    const finalPower = Math.round(basePower * itemRarityData.multiplicateur);

    return { id: uniqueId, nom: finalName, puissance: finalPower, rareté: itemRarityData.nom, couleur: itemRarityData.couleur };
}

/**
 * Calcule la puissance totale du champion en équipant les meilleurs objets.
 * @param {object[]} inventory - Le tableau de l'inventaire complet.
 * @returns {number} La puissance totale du champion.
 */
export function calculateChampionPower(inventory) {
    const equippedItems = {};
    let totalPower = 0;

    for (const item of inventory) {
        const itemType = item.nom.split(' ')[0];
        if (!equippedItems[itemType] || item.puissance > equippedItems[itemType].puissance) {
            equippedItems[itemType] = item;
        }
    }

    for (const itemType in equippedItems) {
        totalPower += equippedItems[itemType].puissance;
    }
    
    return totalPower;
}

/**
 * Génère un nouveau monstre avec une robustesse basée sur la puissance du champion.
 * @param {number} championPower - La puissance actuelle du champion.
 * @returns {object} Le nouveau monstre.
 */
export function generateNewMonster(championPower) {
    const adj = MONSTER_ADJECTIVES[Math.floor(Math.random() * MONSTER_ADJECTIVES.length)];
    const noun = MONSTER_NOUNS[Math.floor(Math.random() * MONSTER_NOUNS.length)];
    return {
        name: `${adj} ${noun}`,
        toughness: Math.round(championPower * (1.5 + Math.random()) + 50),
        progress: 0
    };
}