// Session timeouts

const SessionManager = {
    timeoutDuration: 60 * 60 * 1000, // This one to change timeout length, currently 1 hour
    timeoutId: null,
    isTimedOut: false,

    init() {
        this.setupEventListeners();
        this.resetTimer();
        console.log("Session Manager initiated");
    },

    setupEventListeners() {
        const resetIfNoSelection = () => {
            if (!selectedAircraft) {
                this.resetTimer();
            }
        };

        document.addEventListener('click', resetIfNoSelection);

        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() !== 't') {
                resetIfNoSelection();
            }
        });
    },

    resetTimer() {
        if (this.isTimedOut) return;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            this.timeoutSession();
        }, this.timeoutDuration);

        console.log('Session timer reset');
    },

    timeoutSession() {
        this.isTimedOut = true;

        // Update global vars from main.js
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        const timeoutDialog = document.getElementById('timeout-dialog');
        const fullscreenCover = document.getElementById('fullscreen-cover');

        timeoutDialog.style.display = 'block';
        fullscreenCover.style.display = 'block';

        console.log('Session timed out');
    },

    stopTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        console.log('Session timeout stopped');
    }
}