let map;
let userLatitude, userLongitude;

let openStreetMapTileLayer;
let noLabelTileLayer;
let currentTileLayer;
let usingNoLabels = false;

let selectedAircraft;
let aircraftMarkers = new Map(); // Store markers by aircraft hex

let controlsVisible = false;

let cursorVisible = true;

const keybinds = {
    zoomIn: "+",
    zoomInSecondary: "=",
    zoomOut: "-",
    zoomOutSecondary: "_",

    centerMap: "c",
    resetMap: "r",

    toggleLabels: "l",
    toggleApperance: "a",

    toggleCursor: "h",
    changeView: "v",

    debug: "d"

}

// Start getting location on page load
window.onload = function() {
    requestLocation();

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
        zoom: 10,
        attributionControl: false,
        zoomControl: false

    });
    
    // OpenStreetMap layer
    openStreetMapTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 15

    });

    // No label map layer
    noLabelTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        maxZoom: 20

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
    map.on('moveend zoomend', function() {
        console.log('Map moved or zoomed, updating aircraft data for new map zone');

        const center = map.getCenter();
        fetchAircraftData(center.lat, center.lng)

    });

    // Create layer for aircraft markers
    aircraftLayer = L.layerGroup().addTo(map);

    // Fetch initial set of data
    fetchAircraftData(userLatitude, userLongitude);

    // Start update loop (10s)
    updateInterval = setInterval(fetchAircraftData, 5000);

    console.log('Map created successfully');

    // Show map controls
    toggleControls()

}

function mapRadius() {
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

// ADSB.lol API integration
async function fetchAircraftData(centerLatitude = map.getCenter().lat, centerLongitude = map.getCenter().lng, searchRadius = mapRadius()) {
    try {
        //console.log('Fetching aircraft data around center:', {centerLatitude, centerLongitude}, `with ${searchRadius}nm radius`);
        
        // Public Hosting
        // const response = await fetch(
        //     `http://24.85.222.126:4027/aircraft?lat=${centerLatitude}&lon=${centerLongitude}&dist=${searchRadius}`
        
        // );

        // Local hosting
        const response = await fetch(
            `http://localhost:4027/aircraft?lat=${centerLatitude}&lon=${centerLongitude}&dist=${searchRadius}`
        
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        }

        const data = await response.json();
        console.log('Recieved aircraft data:', data.ac?.length || 0, 'aircraft were found within search radius');
        //console.log('Raw API response:', data);
        
        // Display aircraft positions
        updateAircraftDisplay(data.ac || []);

    } catch (error) {
        console.error('Error fetching aircraft data:', error);

    }
}

function updateAircraftDisplay(aircraftList) {
    // Clear existing markers
    aircraftLayer.clearLayers();
    aircraftMarkers.clear();

    const selectedHex = selectedAircraft ? selectedAircraft.hex : null;

    // Add marker for each aircraft
    aircraftList.forEach(aircraft => {
        // Check for valid position data
        if (aircraft.lat && aircraft.lon) {
            const latitude = aircraft.lat;
            const longitude = aircraft.lon;
            const callsign = aircraft.flight?.trim() || aircraft.r || 'Unknown';
            const icao = aircraft.hex || 'Unknown';
            // Feet
            const altitude = aircraft.alt_baro || aircraft.altitude || 'N/A';
            // Kts
            const groundSpeed = aircraft.gs || 'Unknown';

            const heading = aircraft.track || aircraft.true_heading || aircraft.nav_heading || aircraft.mag_heading || 0;

            const isSelected = selectedHex && selectedHex === aircraft.hex
            const marker = L.marker([latitude, longitude], {
                icon: createAircraftIcon(aircraft, isSelected)

            });
            
            // Popup with basic info
            // marker.bindPopup(`
            //     <strong>${callsign}</strong><br>
            //     ICAO: ${icao}<br>
            //     Alt: ${altitude}<br>
            //     Lat: ${latitude.toFixed(4)}<br>
            //     Lng: ${longitude.toFixed(4)}<br>
            //     Spd: ${groundSpeed}<br>
            //     Hdg: ${heading}

            // `);

            marker.aircraftData = aircraft

            marker.on('click', () => selectAircraft(marker.aircraftData))

            // Restore selection if selected in previous data
            if (isSelected) {
                selectedAircraft = aircraft;
                updateAircraftPanel(aircraft);

                console.log('Reselected aircraft and refreshed panel')

            }
            
            // Add to aircraft layer
            marker.addTo(aircraftLayer);
            aircraftMarkers.set(aircraft.hex, marker);
            
        }
    });

    // Clear selection if selected aircraft is no longer visable in data
    if (selectedHex && !aircraftMarkers.has(selectedHex)) {
        selectedAircraft = null;
        closeAircraftPanel();

        console.log('Selected aircraft is no longer visable, selection has been cleared');
    
    }

    //console.log('Displayed', aircraftLayer.getLayers().length, 'aircraft on the map');

}

function createAircraftIcon(aircraft, isSelected = false) {
    //if (selectedAircraft.hex == aircraft.hex) { isSelected = true };

    const isDarkMode = document.body.classList.contains('dark-mode');
    const iconColour = isSelected ? 'var(--general-accent)' : isDarkMode ? 'var(--dark-primary)' : 'var(--light-primary)';

    const heading = aircraft.track || aircraft.true_heading || aircraft.nav_heading || aircraft.mag_heading || 0;
    const callsign = aircraft.flight?.trim() || aircraft.r || 'N/A';
    const speed = aircraft.gs || 0;

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
    // Guard clause to handle undefined aircraft
    if (!aircraft) {
        console.warn('selectAircraft called with undefined aircraft');
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

    showAircraftPanel(aircraft);

    console.log('Selected aircraft:', aircraft.flight?.trim() || aircraft.r || 'N/A');

}

function showAircraftPanel(aircraft) {
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

    selectedAircraft = null;

}

function updateAircraftPanel(aircraft) {
    const callsign = aircraft.flight?.trim() || aircraft.r || 'N/A';

    document.getElementById('info-callsign').textContent = callsign;

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
        map.setView([userLatitude, userLongitude], 10)

        console.log('Map reset');

    } else { console.log('Map reset error'); }

}

// Extra controls
function toggleControls() {
    const controls = document.getElementById('controls-display');
    
    if (!controlsVisible) {
        controls.style.display = 'flex';

        console.log('Controls shown');

    } else {
        controls.style.display = 'none';
        
        console.log('Controls hidden');

    }

    controlsVisible = !controlsVisible;

    
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

function toggleApperance() {
    const isDarkMode = document.body.classList.contains('dark-mode');

    if (isDarkMode) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');

        fetchAircraftData();

        console.log('Switched to light mode');

    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');

        fetchAircraftData();

        console.log('Switched to dark mode');

    }
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
        
        case keybinds.toggleApperance:
        case keybinds.toggleApperance.toUpperCase():
            console.log('Toggling apperance...');
            toggleApperance();

            break;
        
        case keybinds.changeView:
        case keybinds.changeView.toUpperCase():
            console.log('Toggling controls...')
            toggleControls();
            
            break;
        
        case keybinds.debug:
        case keybinds.debug.toUpperCase():
            console.log('Running debug');

            if (updateInterval) {
                clearInterval(updateInterval);
                console.log('Refresh timer stopped');
                
            } else {
                updateInterval = setInterval(fetchAircraftData, 5000);
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

