const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const port = 4027

const app = express();
app.use(cors());

// Call tracking
const callHistory = [];
const locationCalls = new Map(); // Key: "lat,lon" -> count
let totalCalls = 0;
const startTime = Date.now();

function getTime() {
    const now = new Date();
    const currentTime = now.toLocaleDateString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return currentTime
    
}

// ASCII Map dimensions
const MAP_WIDTH = 72;
const MAP_HEIGHT = 25;

function latLonToMapCoords(lat, lon) {
    // Convert lat/lon to map coordinates
    // Longitude: -180 to 180 -> 0 to MAP_WIDTH
    // Latitude: 90 to -90 -> 0 to MAP_HEIGHT
    const x = Math.floor((lon + 180) * (MAP_WIDTH / 360));
    const y = Math.floor((90 - lat) * (MAP_HEIGHT / 180));
    return { x: Math.max(0, Math.min(MAP_WIDTH - 1, x)), y: Math.max(0, Math.min(MAP_HEIGHT - 1, y)) };

}

function generateASCIIMap() {
    // Create empty map
    const map = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(' '));
    const cellCounts = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(0));

    // Add basic continents outline
    drawContinents(map);

    // Aggregate all calls per map cell (multiple locations can map to same cell)
    for (const [location, count] of locationCalls) {
        const [lat, lon] = location.split(',').map(Number);
        const { x, y } = latLonToMapCoords(lat, lon);

        if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
            cellCounts[y][x] += count;

        }
    }

    // Build the colored map
    let result = '';

    for (let y = 0; y < MAP_HEIGHT; y++) {
        let line = '';

        for (let x = 0; x < MAP_WIDTH; x++) {
            const count = cellCounts[y][x];

            if (count > 0) {
                // Color the call markers in blue based on aggregated count
                let dot = '.';
                if (count > 10) dot = 'o';
                if (count > 25) dot = 'O';
                if (count > 50) dot = '@';
                if (count > 100) dot = '#';

                if (dot === '.') line += '\x1b[94m.\x1b[37m'; // Bright blue
                else if (dot === 'o') line += '\x1b[94mo\x1b[37m'; // Bright blue
                else if (dot === 'O') line += '\x1b[96mO\x1b[37m'; // Bright cyan
                else if (dot === '@') line += '\x1b[96m@\x1b[37m'; // Bright cyan
                else if (dot === '#') line += '\x1b[34m#\x1b[37m'; // Bold blue
            
            } else {
                line += map[y][x];

            }
        }

        result += line + '\n';

    }

    return result;

}

// ASCII World Map - Map (C) 1998 Matthew Thomas
const ASCII_WORLD_MAP = `-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----
           . _..::__:  ,-"-"._        |7       ,     _,.__
   _.___ _ _<_>\`!(._\`.\`-.    /         _._     \`_ ,_/  '  '-._.---.-.__
>.{     " " \`-==,',._\\{  \\  / {)      / _ ">_,-' \`                mt-2_
  \\_.:--.       \`._ )\`^-. "'       , [_/(                       __,/-'
 '"'     \\         "    _L        oD_,--'                )     /. (|
          |           ,'          _)_.\\\\._<> 6              _,' /  '
          \`.         /           [_/_'\` \`"(                <'}  )
           \\\\    .-. )           /   \`-'"..' \`:.#          _)  '
    \`        \\  (  \`(           /         \`:\\  > \\  ,-^.  /' '
              \`._,   ""         |           \\\`'   \\|   ?_)  {\\
                 \`=.---.        \`._._       ,'     "\`  |' ,- '.
                   |    \`-._         |     /          \`:\`<_|h--._
                   (        >        .     | ,          \`=.__.\`-'\\
                    \`.     /         |     |{|              ,-.,\\     .
                     |   ,'           \\   / \`'            ,"     \\
                     |  /              |_'                |  __  /
                     | |                                  '-'  \`-'   \\.
                     |/                                         "    /
                     \\.                                             '
                      ,/            ______._.--._ _..---.---------._
     ,-----"-..?----_/ )      __,-'"             "                  (
-.._(                  \`-----'                                       \`-
-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----`;

function drawContinents(map) {
    const lines = ASCII_WORLD_MAP.split('\n');
    for (let y = 0; y < lines.length && y < MAP_HEIGHT; y++) {
        const line = lines[y];
        for (let x = 0; x < line.length && x < MAP_WIDTH; x++) {
            map[y][x] = line[x];

        }
    }
}

function getStats() {
    const now = Date.now();
    const uptime = Math.floor((now - startTime) / 1000);

    // Calls in last 1, 5, 15 minutes
    const oneMinuteAgo = now - 60 * 1000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const fifteenMinutesAgo = now - 15 * 60 * 1000;

    const callsLast1Min = callHistory.filter(c => c.timestamp > oneMinuteAgo).length;
    const callsLast5Min = callHistory.filter(c => c.timestamp > fiveMinutesAgo).length;
    const callsLast15Min = callHistory.filter(c => c.timestamp > fifteenMinutesAgo).length;

    const callsPerMinute = totalCalls / Math.max(1, uptime / 60);

    // Get unique callers
    const uniqueCallers = new Set(callHistory.map(c => c.caller)).size;

    // Top locations
    const topLocations = Array.from(locationCalls.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return {
        totalCalls,
        callsLast1Min,
        callsLast5Min,
        callsLast15Min,
        callsPerMinute: callsPerMinute.toFixed(2),
        uptime,
        uniqueCallers,
        topLocations

    };
}

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;

}

function renderDashboard() {
    // Clear screen and move cursor to top
    console.clear();

    const stats = getStats();

    // Header
    console.log('\x1b[36m' + '='.repeat(MAP_WIDTH) + '\x1b[0m');
    console.log('\x1b[1;36m         AeroStream Proxy Server Dashboard\x1b[0m');
    console.log('\x1b[36m' + '='.repeat(MAP_WIDTH) + '\x1b[0m\n');

    // ASCII Map
    console.log('\x1b[37m' + generateASCIIMap() + '\x1b[0m');

    // Legend
    console.log('\x1b[33mLegend: . o (1-25 calls)  O @ (26-100)  # (100+) <- Blue shades\x1b[0m');

    // Stats
    console.log('\x1b[36m' + '='.repeat(MAP_WIDTH) + '\x1b[0m');
    console.log('\x1b[1;37mSTATISTICS\x1b[0m\n');

    console.log(`\x1b[1mTotal Calls:\x1b[0m ${stats.totalCalls}  |  \x1b[1mUptime:\x1b[0m ${formatUptime(stats.uptime)}  |  \x1b[1mAvg Rate:\x1b[0m ${stats.callsPerMinute} calls/min`);
    console.log(`\x1b[1mUnique Callers:\x1b[0m ${stats.uniqueCallers}`);
    console.log(`\x1b[1mCalls Last 1min:\x1b[0m ${stats.callsLast1Min}  |  \x1b[1m5min:\x1b[0m ${stats.callsLast5Min}  |  \x1b[1m15min:\x1b[0m ${stats.callsLast15Min}`);

    if (stats.topLocations.length > 0) {
        console.log(`\n\x1b[1mTop Locations:\x1b[0m`);
        stats.topLocations.forEach(([loc, count], i) => {
            const [lat, lon] = loc.split(',');
            // Round to 1 decimal place for cleaner display
            console.log(`  ${i + 1}. ${Number(lat).toFixed(1)}, ${Number(lon).toFixed(1)} - ${count} calls`);
        
        });
    }

    console.log('\x1b[36m' + '='.repeat(MAP_WIDTH) + '\x1b[0m');
    console.log('\x1b[90mLast updated: ' + new Date().toLocaleString() + '\x1b[0m');

}

app.get('/aircraft', async (req, res) => {
    const { lat, lon, dist, caller } = req.query;

    if (!lat || !lon || !dist || !caller) {
        return res.status(400).json({ error: 'Missing required query parameters, check that call matches format: lat=${lat}&lon=${lon}&dist=${dist}&caller="callerID' });
    
    }

    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({ error: response.statusText });
        
        }

        const data = await response.json();

        // Track the call
        const callData = {
            timestamp: Date.now(),
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            caller: caller,
            aircraftCount: data.ac?.length || 0

        };

        callHistory.push(callData);
        totalCalls++;

        // Track location (rounded to 1 decimal)
        const locationKey = `${Math.round(lat * 10) / 10},${Math.round(lon * 10) / 10}`;
        locationCalls.set(locationKey, (locationCalls.get(locationKey) || 0) + 1);

        // Refresh dashboard
        renderDashboard();

        res.json(data);

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch from ADSB.lol', detail: err.message });
    
    }
});

// Auto-refresh dashboard every 5 seconds
setInterval(() => {
    renderDashboard();

}, 5000);

app.listen(port, () => {
    console.log(`Proxy server starting on port ${port}...`);
    setTimeout(() => {
        renderDashboard();

    }, 500);
});
