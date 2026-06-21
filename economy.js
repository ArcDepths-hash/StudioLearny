/**
 * ============================================================================
 * @file economy.js
 * @description StudioLearny Shared Economy Ledger Engine
 * [Shared local data layer accessible across all PM2 worker clusters]
 * @version 1.0.0
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Local database JSON path location
const ecoDataPath = path.join(__dirname, 'economy_data.json');

/**
 * Reads the central balance database ledger safely from the file system
 * @returns {Object} JSON balance map collection reference
 */
function readLedger() {
    if (!fs.existsSync(ecoDataPath)) {
        try {
            fs.writeFileSync(ecoDataPath, JSON.stringify({}, null, 4));
            return {};
        } catch (e) {
            console.error("⚠️ Failed to initialize blank economy database record layer:", e);
            return {};
        }
    }
    
    try {
        const rawData = fs.readFileSync(ecoDataPath, 'utf-8');
        return JSON.parse(rawData || '{}');
    } catch (error) {
        console.error("⚠️ Error reading economy database ledger cache file. Data corrupt? returning empty fallback structure.", error);
        return {};
    }
}

/**
 * Saves the current data state ledger map safely back out to the file system
 * @param {Object} ledgerData - Map containing absolute account states
 */
function writeLedger(ledgerData) {
    try {
        fs.writeFileSync(ecoDataPath, JSON.stringify(ledgerData, null, 4));
    } catch (error) {
        console.error("⚠️ CRITICAL: Severe Disk Write Drop. Economy balance transaction fail:", error);
    }
}

module.exports = {
    /**
     * Safely retrieves user balance data points from shared database files
     * @param {string} userId - Target unique Snowflake user id context 
     * @returns {number} Ledger balance representation integer value
     */
    getBalance(userId) {
        const ledger = readLedger();
        return ledger[userId] || 0;
    },

    /**
     * Increments or decrements account balances securely across storage file sectors
     * @param {string} userId - Target unique Snowflake user id context
     * @param {number} amount - Coins modification integer factor (Negative removes, Positive appends)
     * @returns {number} Updated ledger balance configuration state
     */
    updateBalance(userId, amount) {
        const ledger = readLedger();
        const initialBalance = ledger[userId] || 0;
        
        // Prevent balances from dropping below 0 coins
        const finalBalance = Math.max(0, initialBalance + amount);
        
        ledger[userId] = finalBalance;
        writeLedger(ledger);
        
        return finalBalance;
    },

    /**
     * Completely overrides a ledger entry to a specific balance target value
     * @param {string} userId - Target unique Snowflake user id context
     * @param {number} absoluteAmount - Precise target balance assignment allocation
     */
    setBalance(userId, absoluteAmount) {
        const ledger = readLedger();
        ledger[userId] = Math.max(0, absoluteAmount);
        writeLedger(ledger);
        return ledger[userId];
    }
};
