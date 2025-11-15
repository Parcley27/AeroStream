let publicHost = true; // Change this line to "false" if hosting your own proxy server

let aircraftLayer;

let selectedAircraft;
let aircraftMarkers = new Map(); // Store markers by aircraft hex

let seconds = 1000;

let updateFrequency = 5 * seconds;
let updateInterval;

let minimumUpdateFrequency = 0.25 * seconds;
let lastUpdateTime; 

let timeoutLength = 60 * 60 * seconds; // 1 hour
// let timeoutLength = 5 * seconds; // debug

let isProgrammedMove = false;

// Run startup methods
window.onload = function() {
    // Startup aux scripts
    SessionManager.init();
    UIManager.init();
    KeyboardHandler.init();
    MapController.init();

    // Start location request
    MapController.requestLocation();

};

function calculateUpdateFrequency() {
    if (!map) return 5 * seconds;
    
    const radius = MapController.getMapRadius();
    
    if (radius > 200) {
        return 7.5 * seconds;

    } else if (radius > 100) {
        return 5 * seconds;

    } else if (radius > 50) {
        return 3 * seconds;

    } else if (radius > 25) {
        return 2 * seconds;

    } else if (radius > 10) {
        return 1 * seconds;

    } else {
        return 0.5 * seconds;

    }
}

function isUpdateAllowed() {
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - (lastUpdateTime || 0);

    if (timeSinceLastUpdate > minimumUpdateFrequency) {
        return true;

    }

    return false;

}

function restartUpdateTimer(forced = false) {
    const newFrequency = calculateUpdateFrequency();
    
    if (newFrequency !== updateFrequency || forced) {
        updateFrequency = newFrequency;
        
        // Clear old interval
        if (updateInterval) {
            clearInterval(updateInterval);

        }
        
        // Start new interval based on map size
        updateInterval = setInterval(() => {
            fetchAircraftData();
        }, updateFrequency);
        
        console.log(`Updated data refresh frequency to ${updateFrequency / 1000} seconds`);

    }
}

function handleMapClick(e) {
    if (selectedAircraft) {
        deselectAircraft();

        console.log('Map clicked, deselected current aircraft')

    }
}

// ADSB.lol API integration
async function fetchAircraftData(centerLatitude = MapController.getCenter().latitude, centerLongitude = MapController.getCenter().longitude, searchRadius = MapController.getMapRadius()) {
    isProgrammedMove = true;
    
    if (!isUpdateAllowed()) {
        console.log('Update skipped, time since last is under minimum of ' + (calculateUpdateFrequency() / 1000) + 's ago)');
        
        return;

    }

    try {
        // console.log('Fetching aircraft data around center:', {centerLatitude, centerLongitude}, `with ${searchRadius}nm radius`);
        lastUpdateTime = Date.now();
        
        let currentUrl = window.location.href;
        
        let response;

        // API Hosting
        if (publicHost) {
            response = await fetch(
                `https://api.airtraffic.online/aircraft?lat=${centerLatitude}&lon=${centerLongitude}&dist=${searchRadius}&caller=${currentUrl}`

            );

        } else {
            response = await fetch(
                `http://localhost:4027/aircraft?lat=${centerLatitude}&lon=${centerLongitude}&dist=${searchRadius}&caller=localhost`

            );
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        }

        const data = await response.json();
        // console.log('Recieved aircraft data:', data.ac?.length || 0, 'aircraft were found within search radius');
        console.log(`API response for ${data.ac?.length} aircraft:`, data);
        
        // Display aircraft positions
        updateAircraftDisplay(data.ac || []);

        if (selectedAircraft) {
            MapController.panTo(selectedAircraft.lat, selectedAircraft.lon);

        }

    } catch (error) {
        console.error('Error fetching aircraft data:', error);

    }

    isProgrammedMove = false;

}

function updateAircraftDisplay(aircraftList) {
    // Clear existing markers
    aircraftLayer.clearLayers();
    aircraftMarkers.clear();

    const selectedHex = selectedAircraft ? selectedAircraft.hex : null;
    let foundSelectedAircraft = false; // Track if we found the selected aircraft

    // Add marker for each aircraft
    aircraftList.forEach(aircraft => {
        // Check for valid position data
        if (aircraft.lat && aircraft.lon) {
            const latitude = aircraft.lat;
            const longitude = aircraft.lon;
            const callsign = aircraft.flight?.trim() || aircraft.r || 'Unknown';
            const icao = aircraft.hex || 'Unknown';
            const altitude = aircraft.alt_baro || aircraft.altitude || 'N/A';
            const groundSpeed = aircraft.gs || 'Unknown';
            const heading = aircraft.track || aircraft.true_heading || aircraft.nav_heading || aircraft.mag_heading || 0;

            const isSelected = selectedHex && selectedHex === aircraft.hex;
            
            if (isSelected) {
                foundSelectedAircraft = true;
                // Update the stored aircraft data but don't retrigger selection
                selectedAircraft = aircraft;
                updateAircraftPanel(aircraft); // Just update the panel data
                //console.log('Updated selected aircraft data without retriggering selection');

            }

            const marker = L.marker([latitude, longitude], {
                icon: createAircraftIcon(aircraft, isSelected)

            });

            marker.aircraftData = aircraft;
            marker.on('click', () => selectAircraft(marker.aircraftData));
            
            // Add to aircraft layer
            marker.addTo(aircraftLayer);
            aircraftMarkers.set(aircraft.hex, marker);

        }
    });

    // Clear selection if selected aircraft is no longer visible in data
    if (selectedHex && !foundSelectedAircraft) {
        selectedAircraft = null;
        closeAircraftPanel();
        console.log('Selected aircraft is no longer visible, selection has been cleared');

    }
}

function createAircraftIcon(aircraft, isSelected = false) {
    //if (selectedAircraft.hex == aircraft.hex) { isSelected = true };

    const iconColour = isSelected ? `var(--${UIManager.getCurrentAppearance()}-selected-aircraft)` : `var(--${UIManager.getCurrentAppearance()}-aircraft)`;
    const borderColour = isSelected ? `var(--${UIManager.getCurrentAppearance()}-aircraft)` : `var(--${UIManager.getCurrentAppearance()}-selected-aircraft)`;; 

    const heading = aircraft.track || aircraft.true_heading || aircraft.nav_heading || aircraft.mag_heading || 0;
    const callsign = aircraft.flight?.trim() || aircraft.r || 'N/A';
    const speed = aircraft.gs || aircraft.speed || 0;
    let altitude = aircraft.alt_baro || aircraft.altitude || 0;

    // Handle "ground" or non-numeric values
    if (typeof altitude === 'string' || altitude === null || altitude === undefined) {
        altitude = 0;
        
    }

    altitude = Number(altitude);
    if (isNaN(altitude)) {
        altitude = 0;

    }

    // Scale vector length based on speed
    const minLength = 8;
    const maxLength = 30;
    const vectorLength = minLength + (maxLength - minLength) * Math.min(speed / 550, 1);
    const vectorEnd = -4 - vectorLength;

    // Move shadow based on altitude
    const maxAltitude = 60000;
    const maxShadowOffset = 16;
    const minShadowOffset = 2;
    
    const normalizedAltitude = Math.min(Math.max(altitude, 0), maxAltitude) / maxAltitude;
    const shadowOffset = minShadowOffset + (maxShadowOffset - minShadowOffset) * normalizedAltitude;

    const shadowColour = 'rgba(0, 0, 0, 0.15)'

    const iconHtml = `
        <svg width="40" height="40" viewBox="-20 -20 40 40" style="overflow: visible;">
            <!-- Shadow icon -->
            <g transform="translate(0, ${shadowOffset}) rotate(${heading})">
                <line x1="0" y1="-4" x2="0" y2="${vectorEnd - 0.5}" stroke="${shadowColour}" stroke-width="3"/>
                <rect x="-4" y="-4" width="8" height="8" fill="none" stroke="${shadowColour}" stroke-width="3"/>
                
                <line x1="0" y1="-4" x2="0" y2="${vectorEnd}" stroke="${shadowColour}" stroke-width="2"/>
                <rect x="-4" y="-4" width="8" height="8" fill="none" stroke="${shadowColour}" stroke-width="2"/>
            </g>
            
            <!-- Main aircraft icon -->
            <g transform="rotate(${heading})">
                <line x1="0" y1="-4" x2="0" y2="${vectorEnd - 0.5}" stroke="${borderColour}" stroke-width="3"/>
                <rect x="-4" y="-4" width="8" height="8" fill="none" stroke="${borderColour}" stroke-width="3"/>

                <line x1="0" y1="-4" x2="0" y2="${vectorEnd}" stroke="${iconColour}" stroke-width="2"/>
                <rect x="-4" y="-4" width="8" height="8" fill="none" stroke="${iconColour}" stroke-width="2"/>
            </g>
        </svg>
        <!--<div class="callsign-label">${callsign}</div>-->
    `;

    return L.divIcon({
        html: iconHtml,
        className: 'aircraft-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]

    });

}

function selectAircraft(aircraft) {
    SessionManager.stopTimeout();

    // Guard clause to handle undefined aircraft
    if (!aircraft) {
        console.warn('selectAircraft called with undefined aircraft');

        return;

    }

    if (selectedAircraft && selectedAircraft.hex === aircraft.hex) {
        deselectAircraft();

        console.log('Reclick; Deselected aircraft')

        return;

    }

    // If there was a previously selected aircraft, update its icon
    if (selectedAircraft && selectedAircraft.hex) {
        const previousMarker = aircraftMarkers.get(selectedAircraft.hex);

        if (previousMarker) {
            previousMarker.setIcon(createAircraftIcon(selectedAircraft, false));

        }

        console.log('Deselected aircraft:', selectedAircraft.flight?.trim() || selectedAircraft.r || 'N/A');

    }

    // Set new selected aircraft
    selectedAircraft = aircraft;

    // Update the new selected aircraft's icon
    const currentMarker = aircraftMarkers.get(aircraft.hex);
    
    if (currentMarker) {
        currentMarker.setIcon(createAircraftIcon(aircraft, true));

    }

    openAircraftPanel(aircraft);

    MapController.panTo(aircraft.lat, aircraft.lon);

    console.log('Selected aircraft:', aircraft.flight?.trim() || aircraft.r || 'N/A');

}

function deselectAircraft() {
    SessionManager.resetTimer();

    if (selectedAircraft) {
        closeAircraftPanel();

        selectedAircraft = null;

    }
}

function openAircraftPanel(aircraft) {
    document.getElementById('aircraft-info-panel').style.display = 'block';

    updateAircraftPanel(aircraft);

}

function closeAircraftPanel() {
    document.getElementById('aircraft-info-panel').style.display = 'none';

    if (selectedAircraft && selectedAircraft.hex) {
        const marker = aircraftMarkers.get(selectedAircraft.hex);

        if (marker) {
            marker.setIcon(createAircraftIcon(selectedAircraft, false));

        }
    }
}

function updateAircraftPanel(aircraft) {
    const callsign = aircraft.flight?.trim() || aircraft.r || 'Unknown';
    const icaoID = aircraft.hex || 'Unknown';
    const altitude = aircraft.alt_baro || aircraft.altitude || 'Unknown';
    const speed = aircraft.gs || aircraft.speed || 'Unknown';
    const track = aircraft.track || aircraft.true_heading || aircraft.nav_heading || aircraft.mag_heading || 'Unknown';
    const squawk = aircraft.squawk || 'Unknown';
    const type = aircraft.t || aircraft.type || 'Unknown';
    const latitude = aircraft.lat ? aircraft.lat.toFixed(4) : 'Unknown';
    const longitude = aircraft.lon ? aircraft.lon.toFixed(4) : 'Unknown';
    //const latestUpdate = aircraft.seen || 'Unknown';

    document.getElementById('info-callsign').textContent = callsign;
    document.getElementById('info-icaoID').textContent = icaoID;

    document.getElementById('info-altitude').textContent = 
        altitude !== 'Unknown' && altitude !== 'ground' 
        ? altitude + ' ft' 
        : altitude.charAt(0).toUpperCase() + altitude.slice(1);
    document.getElementById('info-speed').textContent = 
        speed !== 'Unknown'
        ? speed + ' kts'
        : speed;
    document.getElementById('info-track').textContent = 
    track !== 'Unknown'
        ? track + '°'
        : track;

    document.getElementById('info-squawk').textContent = squawk;
    document.getElementById('info-type').textContent = type;

    document.getElementById('info-position').textContent = `${latitude}, ${longitude}`;
    // document.getElementById('info-latestUpdate').textContent =
    //     latestUpdate === 'Unknown'
    //     ? latestUpdate
    //     : latestUpdate < 5
    //         ? '< 5 seconds ago'
    //         : Math.floor(latestUpdate) + ' seconds ago';

}

function exitState() {
    if (selectedAircraft) {
        deselectAircraft();

        console.log('Exited state: Selected aircraft')

    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);

    }
});
