const MapController = {
    // Map state vars
    map: null,

    defaultZoom: 8,

    userLatitude: null,
    userLongitude: null,

    isProgrammedMove: false,

    labeledMapTileLayer: null,
    unlabeledMapTileLayer: null,
    currentTileLayer: null,

    maxRadius: 250, // Nautical miles
    metersInNauticalMile: 1852,

    init() {
        console.log("Map Controller initialized"),
        this.requestLocation();

    },

    //Location services
    requestLocation() {
        console.log("Requesting Location...");

        document.getElementById('loading-screen').style.display = 'block';
        document.getElementById('coordinate-prompt').style.display = 'none';

        if (!navigator.geolocation) {
            console.log('Location not supported');
            this.showCoordinatePrompts('Location services are not supported by your browser');

            return;

        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Location found: ', position.coords.latitude, position.coords.longitude);

                this.userLatitude = position.coords.latitude;
                this.userLongitude = position.coords.longitude;

                document.getElementById('loading-screen').style.display = 'none';

                this.initializeMap();

            },

            (error) => {
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
                        errorMessage = 'Unknown location error';

                        break;

                }

                console.log('Error getting location:', errorMessage);
                this.showCoordinatePrompt(errorMessage);

            },

            // Location options
            {
                enableHighAccuracy: true,
                timeout: 10000, // 10 seconds
                maximumAge: 300000 // Refresh every 5 minutes

            }
        );
    },

    showCoordinatePrompt(reason) {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('coordinate-prompt').style.display = 'block';

        const reasonElement = document.querySelector('#coordinate-prompt p');

        if (reasonElement) {
            reasonElement.textContent = reason;

        }

        console.log('Coordinate prompt shown:', reason);

    },

    setCoordinates() {
        console.log('Setting manual coordinates...');

        const manualLatitude = document.getElementById('latitude-input').value;
        const manualLongitude = document.getElementById('longitude-input').value;

        latitude = parseFloat(manualLatitude);
        longitude = parseFloat(manualLongitude);

        if (isNaN(latitude) || isNaN(longitude)) {
            alert('Invalid coordinates; Please enter valid latitude (+- 90) and longitude (+- 180) values.');

            return ;

        }

        if (isNaN(latitude) || isNaN(longitude)) {
            alert("Please enter valid numbers for latitude and longitude.");

            return;

        }

        if (latitude < -90 || latitude > 90) {
            alert("Latitude must be between -90 and 90.");

            return;

        }

        if (longitude < -180 || longitude > 180) {
            alert("Longitude must be between -180 and 180.");

            return;

        }

        this.userLatitude = latitude;
        this.userLongitude = longitude;

        // Hide prompt and show map
        document.getElementById('coordinate-prompt').style.display = 'none';
        this.initializeMap();

        console.log('Coordinates set: ', this.userLatitude, this.userLongitude)

    },

    initializeMap() {
        console.log('Loading map at: ', this.userLatitude, this.userLongitude);

        // Check if map already exists
        if (this.map) {
            console.log('Map already initialized, updating view and settings...');
            this.map.setView([this.userLatitude, this.userLongitude], this.defaultZoom);

            // Update map settings
            if (this.map.attributionControl) {
                this.map.removeControl(this.map.attributionControl);

            }

            if (this.map.zoomControl) {
                this.map.removeControl(this.map.zoomControl);

            }
            
        } else {
            // Create map
            this.map = L.map('map', {
                center: [this.userLatitude, this.userLongitude],
                zoom: this.defaultZoom,
                attributionControl: false,
                zoomControl: false

            });
        }

        // Labeled Map Layer - OpenStreetMap
        this.labeledMapTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 15,
            minZoom: 3

        });

        this.unlabeledMapTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            minZoom: 3

        });

        this.currentTileLayer = this.labeledMapTileLayer;
        this.currentTileLayer.addTo(this.map);

        // Initialize aircraft layer
        aircraftLayer = L.layerGroup().addTo(this.map);

        this.setupMapEvents();

        fetchAircraftData();

        console.log("Map initialzed successfully!");

        UIManager.cycleView();

    },

    setupMapEvents() {
        this.map.on('moveend', () => {
            console.log("Map moved");

            if (this.isProgrammedMove) {
                console.log("Data refresh locked, skipping update");
                this.isProgrammedMove = false;

                return;

            }

            const center = this.map.getCenter();
            console.log("Fetching aircraft for new location: ", center.lat, center.long);

            fetchAircraftData();

        });

        this.map.on('zoomend', () => {
            console.log("Map zoomed");

            if (this.isProgrammedMove) {
                console.log("Data refresh locked, skipping update");
                this.isProgrammedMove = false;

                return;

            }

            fetchAircraftData();

            restartUpdateTimer();

        });

        this.map.on('click', () => {
            console.log("Map clicked");

            deselectAircraft();

        });
    },

    // Map control functions
    zoomIn() {
        if (this.map) {
            this.map.zoomIn();

            console.log("Zoomed in");

        } else {
            console.log("Zoom in error");

        }
    },

    zoomOut() {
        if (this.map) {
            this.map.zoomOut();

            console.log("Zoomed out");

        } else {
            console.log("Zoom out error");

        }
    },

    centerMap() {
        if (this.map && this.userLatitude && this.userLongitude) {
            deselectAircraft();

            this.map.setView([this.userLatitude, this.userLongitude], this.map.getZoom())

            console.log("Map centered");

        } else {
            console.log("Map centering error");

        }
    },

    resetMap() {
        if (this.map && this.userLatitude && this.userLongitude) {
            deselectAircraft();

            this.map.setView([this.userLatitude, this.userLongitude], this.defaultZoom);

            console.log("Map view reset");

        } else {
            console.log("Map view reset error");

        }
    },

    // Map utilities
    getMapRadius() { // Nautical miles
        if (!this.map) return 75;

        const bounds = this.map.getBounds();
        const center = this.map.getCenter();

        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        
        const distanceToNE = center.distanceTo(northEast);
        const distanceToSW = center.distanceTo(southWest);
        const distanceToNW = center.distanceTo(L.latLng(northEast.lat, southWest.lng));
        const distanceToSE = center.distanceTo(L.latLng(southWest.lat, northEast.lng));
        
        const maxDistanceMeters = Math.max(distanceToNE, distanceToSW, distanceToNW, distanceToSE);
        
        const radiusNM = maxDistanceMeters / this.metersInNauticalMile;

        // Add buffer to help with warping at high latitudes
        const bufferedRadius = Math.min(radiusNM * 1.1, this.maxRadius);

        // ADSB.lol prefers int values
        return Math.round(bufferedRadius);

    },

    getCenter() {
        if (this.map) {
            const center = this.map.getCenter();
            
            return { latitude: center.lat, longitude: center.lng };

        }

        return null;
        
    },

    getUserLocation() {
        return {
            latitude: this.userLatitude,
            longitude: this.userLongitude

        }
    },

    getCurrentTileLayer() {
        return this.currentTileLayer;

    },

    getLabeledTileLayer() {
        return this.labeledMapTileLayer;
    
    },

    getUnlabeledTileLayer() {
        return this.unlabeledMapTileLayer;

    },

    setCurrentTileLayer(layer) {
        this.currentTileLayer = layer;
    
    }    
}