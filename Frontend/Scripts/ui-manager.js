// UI and appearance

const UIManager = {
    appearances: ['colour', 'light', 'dark'], // colour -> light -> dark
    appearanceState: 0,
    viewState: 0,
    maxViewStates: 3,
    cursorVisible: true,
    usingLabels: true,
    projectorModeEnabled: false,

    init() {
        document.body.classList.add(`${this.getCurrentAppearance()}-mode`);
        
        console.log("UI Manager initiated");

    },

    getCurrentAppearance() {
        return this.appearances[this.appearanceState];

    },

    cycleAppearance() {
        document.body.classList.remove(`${this.getCurrentAppearance()}-mode`);

        this.appearanceState = (this.appearanceState + 1) % this.appearances.length

        document.body.classList.add(`${this.getCurrentAppearance()}-mode`)
        
        fetchAircraftData();

        console.log(`Switched to ${this.getCurrentAppearance()}-mode`);

    },

    cycleView() {
        const controls = document.getElementById('controls-display');
        const attributions = document.getElementById('attribution-panel');

        switch (this.viewState % this.maxViewStates) {
            case 0: // Show controls
                controls.style.display = 'flex';
                attributions.style.display = 'none';

                console.log('Controls shown');

                break;
            
            case 1: // + show attributions
                controls.style.display = 'flex';
                attributions.style.display = 'block';
                
                console.log('Attributions shown');

                break;

            case (this.maxViewStates - 1): // Hide both
                controls.style.display = 'none';
                attributions.style.display = 'none';

                console.log('All panels hidden');

                break;

        }

        console.log(`Switched to viewstate ${this.viewState}`);

        this.viewState += 1;

    },

    toggleCursor() {
        if (this.cursorVisible) {
            document.body.classList.add('hide-cursor');

            console.log('Cursor hidden');

        } else {
            document.body.classList.remove('hide-cursor');

            console.log('Cursor shown');

        }

        this.cursorVisible = !this.cursorVisible;

    },

    toggleMapLabels() {
        if (!map) return;

        map.removeLayer(currentTileLayer);

        if (this.usingLabels) {
            currentTileLayer = noLabelTileLayer;

            console.log('Switched to no label map');

        } else {
            currentTileLayer = openStreetMapTileLayer;
            
            console.log('Switched to labeled OpenStreetMap');

        }

        currentTileLayer.addTo(map);
        this.usingLabels = !this.usingLabels;

    },

    toggleProjectorMode() {
        this.projectorModeEnabled = !this.projectorModeEnabled;

        if (this.projectorModeEnabled) {
            document.body.classList.add('projector-overlay');
            console.log(`Projector turned mode on for ${this.getCurrentAppearance}`);

        } else {
            document.body.classList.remove('projector-overlay');
            console.log(`Projector mode turned off for ${this.getCurrentAppearance}`);

        }

    }
    
}