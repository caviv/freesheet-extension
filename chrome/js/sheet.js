// sheet.js

// returns an object of an empty sheet for sheetData
function newEmptySheet() {
    return {
        version: 1,
        title: 'My Tiny Sheet',
        sheetId: generateSheetId(),
        remoteSheetId: null,
        type: 'spreadsheet',
        cells: {}, // Object to store cell values, e.g., { 'A1': 'Hello', 'B2': '=A1+1' }
        cellsStyles: {}, // Object to store cell styles, e.g., { 'A1': {bold: true}, 'B2': {color: 'red'} }
        dates: {
            created: formatDateTimeUTCISOish(new Date()),
            viewed: formatDateTimeUTCISOish(new Date()),
            modified: formatDateTimeUTCISOish(new Date()),
            downloaded: null,
        },
    };
}

// generate a unique id for the sheet (based on current date + random number)
function generateSheetId() {
    const now = new Date();

    // Get components of the date and time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed, so add 1
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // Generate a random number between 0 and 999
    const randomNumber = Math.floor(Math.random() * 1000); // Multiplies by 1000 for 0-999 range
    const paddedRandomNumber = String(randomNumber).padStart(3, '0'); // Pad with leading zeros to 3 digits

    // Construct the final string
    return `${year}-${month}-${day}-${hours}${minutes}.${paddedRandomNumber}`;
}

// check the gloanl object of sheetData.cellsStyles and returns object of styles { bold: true, whitespace: 'no-wrap'}
function getStyleObject(currentCell) {
    if(!sheetData.cellsStyles)
        sheetData.cellsStyles = {};
    if(!sheetData.cellsStyles[currentCell])
        sheetData.cellsStyles[currentCell] = {};
    
    return sheetData.cellsStyles[currentCell];
}

// find from localStorage the first sheet we have and return the sheetId or null
function findFirstSheet() {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i); // Get the key at the current index

        // Check if the key starts with the specified prefix
        if (key && key.startsWith(SHEET_STORAGE_KEY)) {
            return key.replace(SHEET_STORAGE_KEY + '-', '');
        }
    }

    return null;
}

// save the sheetData to the localStorage
// sheetData - is the global object holding the sheetData
// updateLastModified - true / false - if to update the sheetData.dates.modified date
// undo - is the previous undo object of the linked list
function saveSheetData(sheetData, updateLastModified, undo) {
    consolelog('saveSheetData: ' + sheetData.sheetId);

    if(updateLastModified) {
        sheetData.dates.modified = formatDateTimeUTCISOish(new Date());
    }

    // undo (notice, we passed undo object only if there was a change in the sheet, this is why we need calculateAll only if undo passed)
    if(undo) {
        undo = new Undo(undo, sheetData); // global object of undo - push a new item to the linked-list
        calculateAll(sheetData);
    }

    // save the data
    localStorage[LAST_SHEETID_KEY] = sheetData.sheetId;
    localStorage[SHEET_STORAGE_KEY + '-' + sheetData.sheetId] = JSON.stringify(sheetData);

    // if we are synched
    if(sheetData.remoteSheetId) {
        let loginData = getLoginData();
        if(!loginData.email || !loginData.sessionId) {
            $$('id-info-line').innerHTML = 'Can not sync - session is not valid: please try login again';
        } else {
            initSync(sheetData, loginData.email, loginData.sessionId, sheetData.sheetId, sheetData.title, function(response) {
                if(typeof response === 'string') {
                    $$('id-info-line').innerHTML = response;
                    return;
                }

                if(response.error) {
                    $$('id-info-line').innerHTML = response.error;
                    // invalidate session
                    if(response.errorNum === 1) {
                        loginLogout();
                    }
                    return;
                }

                if(response.success && response.remoteSheetId) {
                    $$('id-info-line').innerHTML = `Updated: ${response.remoteSheetId} (${response.date})`;
                    return;
                }
            });
        }
    }

    return undo;
}


// checks that all needed componenets exists in the sheetData and returns it
function upgradeSheetToLatestVersion(sheetData) {
    // update dates
    if(!sheetData.dates) {
        sheetData.dates = {
            created: formatDateTimeUTCISOish(new Date()),
            viewed: formatDateTimeUTCISOish(new Date()),
            modified: formatDateTimeUTCISOish(new Date()),
            downloaded: null,
        }
    } else {
        sheetData.dates.viewed = formatDateTimeUTCISOish(new Date());
    }

    // remoteSheetId
    if(!sheetData.remoteSheetId)
        sheetData.remoteSheetId = null;

    // type
    if(!sheetData.type)
        sheetData.type = 'spreadsheet';

    return sheetData;
}