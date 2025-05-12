// Shared DOM Elements
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id "${id}" not found`);
    }
    return element;
}

export const standingsPage = getElement('standings-page');
export const teamPage = getElement('team-page');
export const standingsContainer = getElement('standings');
export const scheduleContainer = getElement('schedule');
export const lastUpdated = getElement('last-updated');
export const lastUpdatedTeam = getElement('last-updated-team');
export const pageTitle = document.querySelector('#team-page .app-title') || null; 
