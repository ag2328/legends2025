// Test file to compare config.js behavior
import { getSheetUrl, fetchSheetMappings, SHEET_MAPPINGS } from './config.js';

async function runTest() {
    console.log('=== Starting Config Test ===');
    console.log('Initial SHEET_MAPPINGS:', SHEET_MAPPINGS);
    
    try {
        console.log('\n=== Testing fetchSheetMappings ===');
        const mappings = await fetchSheetMappings();
        console.log('Fetched mappings:', mappings);
        console.log('SHEET_MAPPINGS after fetch:', SHEET_MAPPINGS);
        
        console.log('\n=== Testing getSheetUrl for standings ===');
        const standingsUrl = await getSheetUrl('standings');
        console.log('Standings URL:', standingsUrl);
        
        console.log('\n=== Testing getSheetUrl for Overall ===');
        const overallUrl = await getSheetUrl('Overall');
        console.log('Overall URL:', overallUrl);
        
        console.log('\n=== Testing getSheetUrl for Week 1 ===');
        const week1Url = await getSheetUrl('Week 1');
        console.log('Week 1 URL:', week1Url);
        
        console.log('\n=== Testing getSheetUrl for Bruins ===');
        const bruinsUrl = await getSheetUrl('Bruins');
        console.log('Bruins URL:', bruinsUrl);
        
        console.log('\n=== Testing getAvailableSheets ===');
        const availableSheets = await getAvailableSheets();
        console.log('Available sheets:', availableSheets);
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
runTest().catch(console.error); 