// Configuration for logging
let LOGGING_ENABLED = true;

// Enable or disable logging
export function setLoggingEnabled(enabled) {
    LOGGING_ENABLED = enabled;
}

// Log function that can be toggled
export function log(message, ...args) {
    if (LOGGING_ENABLED) {
        console.log(message, ...args);
    }
}

// Error logging function that can be toggled
export function logError(message, ...args) {
    if (LOGGING_ENABLED) {
        console.error(message, ...args);
    }
}

// Warning logging function that can be toggled
export function logWarning(message, ...args) {
    if (LOGGING_ENABLED) {
        console.warn(message, ...args);
    }
} 