// Session timeouts

const SessionManager = {
    seconds: 1000,
    timeoutLength: 60 * 60 * this.seconds, // 1 hour
    sessionTimeout: null,

    init() {
        this.sessionTimeout = new SessionTimeout(this.timeoutLenghth);
        this.setupEventListeners();
        this.sessionTimeout.resetTimer();

        console.log("Session Manager initiated");

    },

    setupEventListeners() {
        document.addEventListener('click', (event) =>{
            if (!selectedAircraft) {
                this.sessionTimeout.resetTimer();

            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 't' || event.key === 'T') {
                return;

            }

            if (!selectedAircraft) {
                this.sessionTimeout.resetTimer();

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

    stopTimeout() {
        console.log('Stopping session timeout');
        this.sessionTimeout.stopTimeout();
        
    }
};

class SessionTimeout {
    constructor(length = 60 * 60 * 1000) {
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

        // Update global vars from main.js
        if (updateInterval) {
            clearInterval(updateInterval);

        }

        const timeoutDialog = document.getElementById('timeout-dialog');
        const fullscreenCover = document.getElementById('fullscreen-cover');

        timeoutDialog.style.display = 'block';
        fullscreenCover.style.display = 'block';

        console.log('Session timed out');

    }

    stopTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;

        }

        console.log('Session timeout stopped');

    }
}