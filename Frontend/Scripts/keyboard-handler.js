const keyboardHandler = {
    keybinds: {
        zoomIn: "+",
        zoomInSecondary: "=",
        zoomOut: "-",
        zoomOutSecondary: "_",

        centerMap: "c",
        resetMap: "r",

        toggleLabels: "l",
        cycleAppearance: "a",

        toggleCursor: "m",
        changeView: "v",

        toggleProjectorMode: "p",

        exitAircraft: "x",

        exit: "Escape",

        disableTimeout: "t",

        debug: "d"

    },

    init() {
        this.setupKeyboardListener();
        console.log("Keyboard Handler initialized");

    },

    setupKeyboardListener() {
        document.addEventListener('keydown', (event) => {
            // Don't trigger when in text fields
            if (event.target.tagName === 'INPUT') {
                return;

            }

            const key = event.key;
            
            switch(key) { 
                case this.keybinds.zoomIn:
                case this.keybinds.zoomInSecondary:
                    console.log('Zooming in...');
                    zoomIn();

                    break
                
                case this.keybinds.zoomOut:
                case this.keybinds.zoomOutSecondary:
                    console.log('Zooming out...');
                    zoomOut();

                    break;

                case this.keybinds.centerMap:
                case this.keybinds.centerMap.toUpperCase():
                    console.log('Centering map...');
                    centerMap();

                    break;
                
                case this.keybinds.resetMap:
                case this.keybinds.resetMap.toUpperCase():
                    console.log('Resetting map...');
                    resetMap();
                    
                    break;
                
                case this.keybinds.toggleLabels:
                case this.keybinds.toggleLabels.toUpperCase():
                    console.log('Toggling map labels...');
                    UIManager.toggleMapLabels();

                    break;

                case this.keybinds.toggleCursor:
                case this.keybinds.toggleCursor.toUpperCase():
                    console.log('Toggling cursor...');
                    UIManager.toggleCursor();

                    break;
                
                case this.keybinds.cycleAppearance:
                case this.keybinds.cycleAppearance.toUpperCase():
                    console.log('Cycling appearance...');
                    UIManager.cycleAppearance();

                    break;
                
                case this.keybinds.changeView:
                case this.keybinds.changeView.toUpperCase():
                    console.log('Cycling controls...')
                    UIManager.cycleView();
                    
                    break;

                case this.keybinds.toggleProjectorMode:
                case this.keybinds.toggleProjectorMode.toUpperCase():
                    console.log('Toggling projector mode...')
                    UIManager.toggleProjectorMode();

                    break;
                
                case this.keybinds.disableTimeout:
                case this.keybinds.disableTimeout.toUpperCase():
                    console.log('Stopping session timeout...')
                    SessionManager.stopTimeout();

                    break;

                case this.keybinds.exitAircraft:
                case this.keybinds.exitAircraft.toUpperCase():
                    console.log('Deselecting aircraft...')
                    deselectAircraft();

                    break;
                
                case this.keybinds.exit:
                    console.log('Escaping current state...');
                    exitState();

                    break;
                
                case this.keybinds.debug:
                case this.keybinds.debug.toUpperCase():
                    console.log('Running debug');

                    if (updateInterval) {
                        clearInterval(updateInterval);
                        console.log('Refresh timer stopped');
                        
                    } else {
                        restartUpdateTimer(true);
                        console.log('Refresh timer started');

                    }

                    break;
                
                default:
                    break;

            }
        });
    },

    getKeybinds() {
        return { ...this.keybinds };

    }
}