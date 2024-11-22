const fs = require('fs');
const path = require('path');

const CACHE_FILE = 'sticker_cache.json';

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('Error loading sticker cache:', error);
        return {};
    }
}

function saveCache(cache) {
    try {
        const safeCache = JSON.stringify(cache, null, 2);
        fs.writeFileSync(CACHE_FILE, safeCache, { encoding: 'utf8' });
    } catch (error) {
        console.error('Error saving sticker cache:', error);
    }
}

function updateStickerEmoji(serverId, stickerId, emoji) {
    // console.log('Updating emoji:', emoji); 
    const cache = loadCache();
    if (!cache[serverId]) {
        cache[serverId] = {};
    }
    if (!cache[serverId][stickerId]) {
        cache[serverId][stickerId] = {};
    }
    
    cache[serverId][stickerId].related_emoji = emoji;
    saveCache(cache);
}

function getStickerEmoji(serverId, stickerId) {
    const cache = loadCache();
    return cache[serverId]?.[stickerId]?.related_emoji || null;
}

function removeSticker(serverId, stickerId) {
    // console.log(`Attempting to remove sticker from cache - Server: ${serverId}, Sticker: ${stickerId}`);
    const cache = loadCache();
    if (cache[serverId] && cache[serverId][stickerId]) {
        // console.log('Found sticker in cache, removing...');
        delete cache[serverId][stickerId];
        
        if (Object.keys(cache[serverId]).length === 0) {
            // console.log('Server has no more stickers, removing server entry...');
            delete cache[serverId];
        }
        
        saveCache(cache);
        // console.log('Cache updated successfully');
    } else {
        console.log('Sticker not found in cache');
    }
}

module.exports = {
    updateStickerEmoji,
    getStickerEmoji,
    removeSticker
};