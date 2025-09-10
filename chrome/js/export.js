// export.js

function generateCsvAndDownload(dataArray) {
    // Convert your array of arrays (or array of objects) into a CSV string.
    // Example: [['Header1', 'Header2'], ['Value1A', 'Value1B'], ['Value2A', 'Value2B']]
    // Or if you have an array of objects:
    // const headers = Object.keys(dataArray[0]);
    // const csvRows = [
    //     headers.join(','),
    //     ...dataArray.map(row => headers.map(header => row[header]).join(','))
    // ];
    // const csvString = csvRows.join('\n');

    // For simplicity, let's assume dataArray is an array of arrays representing rows
    // and you want to join them with commas and newlines.
    const csvString = dataArray.map(row => row.join(',')).join('\n');

    // Create a Blob from the CSV string
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Create a URL for the Blob
    return URL.createObjectURL(blob);
}


function generateJsonAndDownload(sheetData) {
    const jsonString = JSON.stringify(sheetData);

    // Create a Blob from the CSV string
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });

    // Create a URL for the Blob
    return URL.createObjectURL(blob);
}

function formatDateTimeUTCISOish(date) {
    const isoString = date.toISOString(); // e.g., "2025-07-31T13:17:20.123Z" (UTC time)
    return isoString.slice(0, 19); // Truncate at the 19th character to remove .sssZ
}

// populate the data into the id-dialog-export
function buildExportDialog(sheetData) {
    //$$('id-dialog-export').show(); // showModal
    
    
    // prepare the data: download formula
    let dataFormulas = [];
    for(let y = 1; y <= 20; y++) {
        let row = [];
        for(let x = 0; x < 10; x++) {
            let cell = xyToCell(x, y);
            let value = '';
            if(cell in sheetData.cells)
                value = sheetData.cells[cell];
            row.push(value);
        }
        dataFormulas.push(row);
    }

    $$('id-download-link').href = generateCsvAndDownload(dataFormulas);
    $$('id-download-link').download = sheetData.title;
    $$('id-download-link').onclick = function() {
        saveSheetData(sheetData, true, false); // update the date of last downloaded
    };
    


    // prepare the data: download values
    let dataValues = [];
    for(let y = 1; y <= 20; y++) {
        let row = [];
        for(let x = 0; x < 10; x++) {
            let cell = xyToCell(x, y);
            let value = $$(`id-${cell}`).innerHTML;
            row.push(value);
        }
        dataValues.push(row);
    }

    $$('id-download-link-values').href = generateCsvAndDownload(dataValues);
    $$('id-download-link-values').download = sheetData.title;
    $$('id-download-link-values').onclick = function() {
        saveSheetData(sheetData, true, false); // update the date of last downloaded
    };

    
    // prepare the data: download json
    $$('id-download-link-json').href = generateJsonAndDownload(sheetData);
    $$('id-download-link-json').download = sheetData.title + '.json';
    $$('id-download-link-json').onclick = function() {
        saveSheetData(sheetData, true, false); // update the date of last downloaded
    };


    // update the dates
    $$('id-date-created').innerHTML = sheetData.dates.created;
    $$('id-date-modified').innerHTML = sheetData.dates.modified;
    $$('id-date-downloaded').innerHTML = sheetData.dates.downloaded;

    // update if the sheet is synched
    if(sheetData.remoteSheetId) {
        $$('id-export-sync-link').innerHTML = 'Synched';
        $$('id-export-sync-link').style.color = 'green';
        $$('id-export-sync-link').onclick = null;
    } else {
        $$('id-export-sync-link').innerHTML = 'Not synched';
        $$('id-export-sync-link').style.color = 'red';
        $$('id-export-sync-link').onclick = function(event) {syncPressed(event); $$('id-dialog-export').close();}
    }

}