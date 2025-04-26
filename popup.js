document.addEventListener('DOMContentLoaded', function() {
    const toggleSolver = document.getElementById('toggleSolver');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    const MIN_DELAY = 50;
    const MAX_DELAY = 10000;
    const MIN_SPEED = 1;
    const MAX_SPEED = 100;

    // Function to map speed (1-100) to delay (50-10000)
    function mapSpeedToDelay(speed) {
        const delay = MAX_DELAY - (speed - MIN_SPEED) * (MAX_DELAY - MIN_DELAY) / (MAX_SPEED - MIN_SPEED);
        return Math.round(Math.max(MIN_DELAY, Math.min(MAX_DELAY, delay)));
    }

    // Function to map delay (50-10000) to speed (1-100)
    function mapDelayToSpeed(delay) {
        const speed = MIN_SPEED + (MAX_DELAY - delay) * (MAX_SPEED - MIN_SPEED) / (MAX_DELAY - MIN_DELAY);
        return Math.round(Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed)));
    }

    // Load saved settings
    chrome.storage.local.get(['solverEnabled', 'solveSpeed'], function(result) {
        toggleSolver.checked = result.solverEnabled !== undefined ? result.solverEnabled : true; // Default to true
        
        const savedDelay = result.solveSpeed !== undefined ? result.solveSpeed : 8000; // Default to 8000ms delay
        const initialSpeed = mapDelayToSpeed(savedDelay);
        
        speedSlider.value = initialSpeed;
        speedValue.textContent = initialSpeed;
    });

    // Save toggle state
    toggleSolver.addEventListener('change', function() {
        chrome.storage.local.set({solverEnabled: this.checked});
        sendMessageToContentScript({solverEnabled: this.checked});
    });

    // Handle speed slider changes
    speedSlider.addEventListener('input', function() {
        const currentSpeed = parseInt(this.value);
        speedValue.textContent = currentSpeed;
        
        const calculatedDelay = mapSpeedToDelay(currentSpeed);
        
        // Save the calculated delay
        chrome.storage.local.set({solveSpeed: calculatedDelay});
        // Send the calculated delay to the content script
        sendMessageToContentScript({solveSpeed: calculatedDelay});
    });
});

// Function to send messages to the content script
function sendMessageToContentScript(message) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].id) {
             // Check if the tab's URL matches the content script pattern
            if (tabs[0].url && tabs[0].url.startsWith('https://openquant.co/math-game')) {
                chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
                    if (chrome.runtime.lastError) {
                        // Handle potential error (e.g., content script not ready)
                        console.log("Error sending message: ", chrome.runtime.lastError.message);
                    }
                });
            } else {
                 console.log("Solver not active on this tab.");
            }
        }
    });
} 