// sync.js

// init sync, sends ALL the sheetData and userId and creates a new sheet for the user
// returns successFunc with object {remoteSheetId: string, success: bool, error: string / null}
// this function is called when the user click to sync the sheet
function initSync(sheetData, email, sessionId, sheetId, sheetTitle, resultFunc) {
	if(!email) {
		resultFunc(`User is not logged in (email) ${email}`);
		return;
	}

	if(!sessionId) {
		resultFunc(`User is not logged in (sessionId) ${sessionId}`);
		return;
	}

	email      = encodeURIComponent(email);
	sessionId  = encodeURIComponent(sessionId);
	sheetId    = encodeURIComponent(sheetId);
	sheetTitle = encodeURIComponent(sheetTitle);
	let lsheetData = encodeURIComponent(JSON.stringify(sheetData));
	
	let body = `email=${email}&sessionId=${sessionId}&sheetId=${sheetId}&sheetTitle=${sheetTitle}&sheetData=${lsheetData}`;

	console.log(`initSync ${sheetId}:${sessionId}`);
	nanoajax.ajax({url: 'http://localhost:8080/api/initsync/', method: 'POST', body: body}, function (code, responseText, request) {
        console.log(`initSync ${sheetId}:${sessionId}:` + responseText);
        try {
            let response = JSON.parse(responseText);
           	resultFunc(response);
        } catch(e) {
            resultFunc('initSync general error:' + e + ' responseText:' + responseText);
        }
    });
}

// calls remote API to validate the sessionId - if the sessionId is deleted on the
// server side then we need to login again, or that the time expired
function validateSessionId(email, sessionId, resultFunc) {
	if(!email) {
		resultFunc(false);
	}

	if(!sessionId) {
		resultFunc(false);
	}

	email     = encodeURIComponent(email);
	sessionId = encodeURIComponent(sessionId);
	
	let body = `email=${email}&sessionId=${sessionId}`;

	console.log(`validateSessionId ${email}:${sessionId}`);
	nanoajax.ajax({url: 'http://localhost:8080/api/validatesession/', method: 'POST', body: body}, function (code, responseText, request) {
        console.log(`validateSessionId ${email}:${sessionId}:` + responseText);
        try {
            let response = JSON.parse(responseText);

            if(response.success) {
           		resultFunc(true);
           		return;
            }
           	
           	if(response.error) {
           		console.log('validateSessionId error:' + response.error);
           	}

           	if(response.errorNum) {
           		resultFunc(false, response.errorNum);
           		return;
           	}

           	resultFunc(false);
        } catch(e) {
            console.log('validateSessionId general error:' + e + ' responseText:' + responseText);
            resultFunc(false);
        }
    });

	return null;
}

function getRemoteSheet(sheetId, email, sessionId, successFunc, errorFunc) {
    console.log(`getRemoteSheet sheetId:${sheetId}`);
    email     = encodeURIComponent(email);
    sessionId = encodeURIComponent(sessionId);
    sheetId   = encodeURIComponent(sheetId);

    nanoajax.ajax({url: 'http://localhost:8080/api/sheetdata/', method: 'POST', body: `sessionId=${sessionId}&email=${email}&sheetId=${sheetId}`}, function (code, responseText, request) {
        try {
            let response = JSON.parse(responseText);

            if(response.error) {
                throw new Error(response.error);
            }

            if(response.remoteSheetId) {
            	successFunc(sheetId, response);
            }

        } catch(e) {
        	errorFunc(sheetId, e);
        }
    });
}

function deleteRemoteSheet(sheetId, email, sessionId, successFunc) {
    email     = encodeURIComponent(email);
    sessionId = encodeURIComponent(sessionId);
    sheetId   = encodeURIComponent(sheetId);

    nanoajax.ajax({url: 'http://localhost:8080/api/deletesheet/', method: 'POST', body: `sessionId=${sessionId}&email=${email}&sheetId=${sheetId}`}, function (code, responseText, request) {
        try {
            let response = JSON.parse(responseText);

            if(response.error) {
                throw new Error(response.error);
            }

           	successFunc(sheetId, response);
        } catch(e) {
        	alert(`Error deleteRemoteSheet ${sheetId} ${e}`);
        	console.log(`Error deleteRemoteSheet ${sheetId} ${e}`);
        }
    });
}

// send the data inside a cell (A15) to the server
function sendCellData(cell, data, sheetId, userId) {

}

