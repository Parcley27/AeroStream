let publicHost = true; // Change this line to "false" if hosting your own proxy server

let map;
let userLatitude, userLongitude;
let defaultZoom = 9;

let isProgrammedMove = false;

let openStreetMapTileLayer;
let noLabelTileLayer;
let currentTileLayer;
let usingNoLabels = false;

let apperance = 'light'; // 'dark or 'light' or 'colour'

let selectedAircraft;
let aircraftMarkers = new Map(); // Store markers by aircraft hex

let viewState = 0;
let cursorVisible = true;

let seconds = 1000;

let updateFrequency = 5 * seconds; // 5 seconds (ms)
let updateInterval;

let minimumUpdateFrequency = 250; // 0.25 seconds
let lastUpdateTime; 

let timeoutLength = 60 * 60 * seconds; // 1 hour
// let timeoutLength = 5 * seconds; // debug

const keybinds = {
    zoomIn: "+",
    zoomInSecondary: "=",
    zoomOut: "-",
    zoomOutSecondary: "_",

    centerMap: "c",
    resetMap: "r",

    toggleLabels: "l",
    cycleApperance: "a",

    toggleCursor: "m",
    changeView: "v",

    disableTimeout: "t",

    exitAircraft: "x",

    exit: "Escape",

    debug: "d"

}

class SessionTimeout {
    constructor(length = 60 * 60 * seconds) {
        this.timeoutDuration = length;
        this.timeoutId = null;
        this.isTimedOut = false;

    }

    resetTimer() {
        if (this.isTimedOut) return;
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);

        }
        
        this.timeoutId = setTimeout(() => {
            this.timeoutSession();
        }, this.timeoutDuration);
        
        console.log('Session timer reset');

    }

    timeoutSession() {
        this.isTimedOut = true;

        if (updateInterval) {
            clearInterval(updateInterval);

        }

        const timeoutDialog = document.getElementById('timeout-dialog');
        const fullscreenCover = document.getElementById('fullscreen-cover');

        timeoutDialog.style.display = 'block';
        fullscreenCover.style.display = 'block';

        console.log("Session timed out due to inactivity")

    }

    stopTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;

        }

        console.log('Session timeout stopped');

    }
}

const sessionTimeout = new SessionTimeout(timeoutLength);

document.addEventListener('click', function(event) {
    if (!selectedAircraft) {
        sessionTimeout.resetTimer();

    }

});

document.addEventListener('keypress', function(event) {
    if (event.key === keybinds.disableTimeout || event.key === keybinds.disableTimeout.toUpperCase()) {
        return;

    }
    
    if (!selectedAircraft) {
        sessionTimeout.resetTimer();

    }

});

// Start getting location on page load
window.onload = function() {
    requestLocation();

    sessionTimeout.resetTimer();

};

// Startup
function requestLocation() {
    console.log('Requesting location...');

    // Show loading screen
    document.getElementById('loading-screen').style.display = 'block';
    document.getElementById('coordinate-prompt').style.display = 'none';

    // Check if location is supported by browser
    if (!navigator.geolocation) {
        console.log('Location not supported');
        showCoordinatePrompt('Auto location is not supported by your browser');

        return;

    }

    // Request user location
    navigator.geolocation.getCurrentPosition(
        // Success
        function(position) {
            console.log('Location found:', position.coords.latitude, position.coords.longitude);
            
            userLatitude = position.coords.latitude;
            userLongitude = position.coords.longitude;

            document.getElementById('loading-screen').style.display = 'none';

            initializeMap();

        },

        // Error
        function(error) {
            let errorMessage;

            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location permission denied';

                    break;

                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable';

                    break;

                case error.TIMEOUT:
                    errorMessage = 'Location request timed out';

                    break;

                case error.UNKNOWN_ERROR:
                default:
                    errorMessage = 'Unknown error';

                    break;

            }

            console.log('Error getting location:', errorMessage);
            showCoordinatePrompt(errorMessage);

        },

        // Location options
        {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds
            maximumAge: 300000 // Refresh every 5 minutes

        }
    );
}

function showCoordinatePrompt(reason) {
    // Hide other screens
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('coordinate-prompt').style.display = 'block';

    const reasonElement = document.querySelector('#coordinate-prompt p');
    
    if (reasonElement) {
        reasonElement.textContent = reason;

    }
}

function setCoordinates() {
    console.log('Setting coordinates...');

    const latitude = parseFloat(document.getElementById('latitude-input').value);
    const longitude = parseFloat(document.getElementById('longitude-input').value);

    // Check for valid coordinates
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        alert('Invalid coordinates. Please enter valid latitude and longitude values (Between -90 and 90).');
        
        return;

    }

    userLatitude = latitude;
    userLongitude = longitude;

    // Hide prompt and show map
    document.getElementById('coordinate-prompt').style.display = 'none';
    initializeMap();

    console.log('Coordinates set');

}

// Initialize map
function initializeMap() {
    console.log('Loading map at:', userLatitude, userLongitude);

    // Create a map centered on user location
    map = L.map('map', {
        center: [userLatitude, userLongitude],
        zoom: defaultZoom,
        attributionControl: false,
        zoomControl: false

    });
    
    // OpenStreetMap layer
    openStreetMapTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 15,
        minZoom: 3

    });

    // No label map layer
    noLabelTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        minZoom: 3

    });

    currentTileLayer = openStreetMapTileLayer;
    currentTileLayer.addTo(map);

    // Location marker
    L.circleMarker([userLatitude, userLongitude], {
        radius: 6,
        weight: 2,
        color: 'var(--general-accent)',
        fillColor: 'rgba(0, 0, 0, 0)'

    })
    .addTo(map);
    
    // Refresh data on map move
    map.on('moveend', function() {
        console.log('Map moved');
        // console.log(`Zoom: ${map.getZoom()}, Center: ${map.getCenter().lat.toFixed(4)}, ${map.getCenter().lng.toFixed(4)}`);

        if (isProgrammedMove) {
            console.log('Data refresh locked, skipping update');

            return;

        }

        console.log('Updating aircraft data for new map zone')

        const center = map.getCenter();

        if (isUpdateAllowed()) {
            fetchAircraftData(center.lat, center.lng)

        }

    });

    map.on('zoomend', function() {
        console.log('Map zoomed');

        if (isProgrammedMove) {
            console.log('Data refresh locked, skipping update');

            return;

        }

        console.log('Map zoomed, updating aircraft data and refresh frequency');

        const center = map.getCenter();

        if (isUpdateAllowed()) {
            fetchAircraftData(center.lat, center.lng)

        }
        
        restartUpdateTimer();
        
    });

    map.on('click', handleMapClick);

    // Create layer for aircraft markers
    aircraftLayer = L.layerGroup().addTo(map);

    // Fetch initial set of data
    fetchAircraftData(userLatitude, userLongitude);

    // Start update loop (10s)
    updateInterval = setInterval(fetchAircraftData, updateFrequency);

    console.log('Map created successfully');

    // Show map controls
    cycleView()

}

function mapRadius() { // Nautical Miles
    if (!map) return 75;

    const bounds = map.getBounds();
    const center = map.getCenter();
    
    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();
    
    const distanceToNE = center.distanceTo(northEast);
    const distanceToSW = center.distanceTo(southWest);
    const distanceToNW = center.distanceTo(L.latLng(northEast.lat, southWest.lng));
    const distanceToSE = center.distanceTo(L.latLng(southWest.lat, northEast.lng));
    
    const maxDistanceMeters = Math.max(distanceToNE, distanceToSW, distanceToNW, distanceToSE);
    
    const radiusNM = maxDistanceMeters / 1852;
    
    // Add buffer to help with warping at higher lattitudes
    const bufferedRadius = Math.min(radiusNM * 1.1, 250);
    
    // ADSB.lol prefers int radius values
    return Math.round(bufferedRadius);

}

function calculateUpdateFrequency() {
    if (!map) return 5 * seconds;
    
    const radius = mapRadius();
    
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
async function fetchAircraftData(centerLatitude = map.getCenter().lat, centerLongitude = map.getCenter().lng, searchRadius = mapRadius()) {
    isProgrammedMove = true;

    try {
        // console.log('Fetching aircraft data around center:', {centerLatitude, centerLongitude}, `with ${searchRadius}nm radius`);
        
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
            map.panTo([selectedAircraft.lat, selectedAircraft.lon]);

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

    const iconColour = isSelected ? `var(--${apperance}-aircraft)` : `var(--${apperance}-primary)`;

    const heading = aircraft.track || aircraft.true_heading || aircraft.nav_heading || aircraft.mag_heading || 0;
    const callsign = aircraft.flight?.trim() || aircraft.r || 'N/A';
    const speed = aircraft.gs || aircraft.speed || 0;

    // Scale vector length based on speed
    const minLength = 8;
    const maxLength = 30;
    const vectorLength = minLength + (maxLength - minLength) * Math.min(speed / 550, 1);
    const vectorEnd = -4 - vectorLength;

    const iconHtml = `
        <svg width="30" height="30" viewBox="-15 -15 30 30" style="overflow: visible;">
            <g transform="rotate(${heading})">
                <rect x="-4" y="-4" width="8" height="8" fill="none" stroke="${iconColour}" stroke-width="2"/>
                <line x1="0" y1="-4" x2="0" y2="${vectorEnd}" stroke="${iconColour}" stroke-width="2"/>
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
    sessionTimeout.stopTimeout();

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

    map.panTo([aircraft.lat, aircraft.lon])

    console.log('Selected aircraft:', aircraft.flight?.trim() || aircraft.r || 'N/A');

}

function deselectAircraft() {
    sessionTimeout.resetTimer();

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

// Map controls
function zoomIn() {
    if (map) {
        map.zoomIn()

        console.log('Zoomed in');

    } else { console.log('Zoom in error'); }

}

function zoomOut() {
    if (map) {
        map.zoomOut()

        console.log('Zoomed out');

    } else { console.log('Zoom out error'); }

}

function centerMap() {
    if (map && userLatitude && userLongitude) {
        map.setView([userLatitude, userLongitude], map.getZoom())

        console.log('Map centered');

    } else { console.log('Map centering error'); }

}

function resetMap() {
    if (map && userLatitude && userLongitude) {
        map.setView([userLatitude, userLongitude], defaultZoom)

        console.log('Map reset');

    } else { console.log('Map reset error'); }

}

function exitState() {
    if (selectedAircraft) {
        deselectAircraft();

        console.log('Exited state: Selected aircraft')

    }
}

// Extra settings
function cycleView() {
    const controls = document.getElementById('controls-display');
    const attributions = document.getElementById('attribution-panel');
    
    switch(viewState % 3) {
        case 0: // Show controls
            controls.style.display = 'flex';

            console.log('Controls shown');

            break;
            
        case 1: // Show attributions
            attributions.style.display = 'block';

            console.log('Attributions shown');

            break;
            
        case 2: // Hide both
            controls.style.display = 'none';
            attributions.style.display = 'none';

            console.log('All panels hidden');

            break;

    }

    viewState += 1;
    
}

function toggleCursor() {
    if (!cursorVisible) {
        document.body.classList.remove('hide-cursor');

        console.log('Cursor shown');

    } else {
        document.body.classList.add('hide-cursor');

        console.log('Cursor hidden');

    }

    cursorVisible = !cursorVisible;

}

function cycleApperance() {
    document.body.classList.remove(`${apperance}-mode`);

    if (apperance === 'dark') {
        apperance = 'light';

    } else if (apperance === 'light') {
        apperance = 'colour';   
    
    } else if (apperance === 'colour') {
        apperance = 'dark';

    }

    document.body.classList.add(`${apperance}-mode`);

    fetchAircraftData();

    console.log(`Switched to ${apperance}-mode`);

}

function toggleMapLabels() {
    if (!map) return;

    map.removeLayer(currentTileLayer);

    if (usingNoLabels) {
        currentTileLayer = openStreetMapTileLayer;
        console.log('Switched to OpenStreetMap (with labels)');

    } else {
        currentTileLayer = noLabelTileLayer;
        console.log('Switched to no label map');

    }

    currentTileLayer.addTo(map);
    usingNoLabels = !usingNoLabels;

}

// Keyboard shorcuts
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case keybinds.zoomIn:
        case keybinds.zoomInSecondary:
            console.log('Zooming in...');
            zoomIn();

            break
        
        case keybinds.zoomOut:
        case keybinds.zoomOutSecondary:
            console.log('Zooming out...');
            zoomOut();

            break;

        case keybinds.centerMap:
        case keybinds.centerMap.toUpperCase():
            console.log('Centering map...');
            centerMap();

            break;
        
        case keybinds.resetMap:
        case keybinds.resetMap.toUpperCase():
            console.log('Resetting map...');
            resetMap();
            
            break;
        
        case keybinds.toggleLabels:
        case keybinds.toggleLabels.toUpperCase():
            console.log('Toggling map labels...');
            toggleMapLabels();

            break;

        case keybinds.toggleCursor:
        case keybinds.toggleCursor.toUpperCase():
            console.log('Toggling cursor...');
            toggleCursor();

            break;
        
        case keybinds.cycleApperance:
        case keybinds.cycleApperance.toUpperCase():
            console.log('Cycling apperance...');
            cycleApperance();

            break;
        
        case keybinds.changeView:
        case keybinds.changeView.toUpperCase():
            console.log('Cycling controls...')
            cycleView();
            
            break;
        
        case keybinds.disableTimeout:
        case keybinds.disableTimeout.toUpperCase():
            console.log('Stopping session timeout...')
            sessionTimeout.stopTimeout();

            break;

        case keybinds.exitAircraft:
        case keybinds.exitAircraft.toUpperCase():
            console.log('Deselecting aircraft...')
            deselectAircraft();

            break;
        
        case keybinds.exit:
            console.log('Escaping current state...');
            exitState();

            break;
        
        case keybinds.debug:
        case keybinds.debug.toUpperCase():
            console.log('Running debug');

            if (updateInterval) {
                clearInterval(updateInterval);
                console.log('Refresh timer stopped');
                
            } else {
                restartUpdateTimer(true);
                console.log('Refresh timer started');

            }

            break;

    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);

    }
});
