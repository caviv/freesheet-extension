// exportpage.js
const LAST_SHEETID_KEY = 'lastSheet';
const SHEET_STORAGE_KEY = 'simpleSheetData';

function $$(id) {return document.getElementById(id);}

// build the table of all sheets saved
function buildListOfSheets() {
    console.log('buildSheetsDropdown');

    // Iterate over all keys in localStorage
    let tbody = '';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i); // Get the key at the current index

        // Check if the key starts with the specified prefix
        if (key && key.startsWith(SHEET_STORAGE_KEY)) {
            let tData = localStorage[key];
            let nSheetData = null;
            try {
                nSheetData = JSON.parse(tData);
            } catch(e) {
                console.log('Error: can not parse sheetData of: ' + key);
                continue;
            }
            nSheetData.size = tData.length;
            let sheetId = key.replace(SHEET_STORAGE_KEY + '-', '');
            
            if(!nSheetData.dates) {
                nSheetData.dates = {
                    created: null,
                    viewed: null,
                    modified: null,
                    downloaded: null,
                }
            }
            if(!nSheetData.type)
                nSheetData.type = 'spreadsheet';

            let synched = nSheetData.remoteSheetId ? 'sync' : 'not';

            tbody += `<tr>
                        <td style="width:20px">${i+1}</td>
                        <td title="${sheetId}"><a href="index.html#${sheetId}">${nSheetData.title}</a></td>
                        <td>${nSheetData.dates.created}</td>
                        <td>${nSheetData.dates.viewed}</td>
                        <td>${nSheetData.dates.modified}</td>
                        <td>${nSheetData.dates.downloaded}</td>
                        <td>${nSheetData.size}</td>
                        <td>${synched}</td>
                        <td align="center"><a href="#" title="delete sheet" data-id="${sheetId}" class="c-delete"><img src="icons/delete.svg" style="height: 20px;" alt="delete sheet"></a></td>
                    </tr>`;
        }
    }

    $$('id-sheetlist').innerHTML = tbody;

    // create delete action
    let allDelete = $$('id-sheetlist').querySelectorAll('a.c-delete');
    for(let i = 0; i < allDelete.length; i++) {
        allDelete[i].onclick = function() {
            if(!confirm('Are you sure?'))
                return;

            console.log('deleting: ' + this.dataset.id);
            delete localStorage[SHEET_STORAGE_KEY + '-' + this.dataset.id];

            if(localStorage[LAST_SHEETID_KEY] == this.dataset.id) {
                let nSheetId = findFirstSheet();
                if(nSheetId)
                    localStorage[LAST_SHEETID_KEY] = nSheetId;
                else
                    delete localStorage[LAST_SHEETID_KEY];
            }

            buildListOfSheets();
        }
    }

    buildListOfRemoteSheets();
}

function buildListOfRemoteSheets() {
    let loginData = getLoginData();
    if(!loginData.email || !loginData.sessionId || !loginData.success) {
        console.log('buildListOfRemoteSheets - not logged in');
        $$('id-output-loadremotesheet').innerHTML = 'buildListOfRemoteSheets - not logged in';
        return;
    }

    let email     = encodeURIComponent(loginData.email);
    let sessionId = encodeURIComponent(loginData.sessionId);
    let serverPrefix = getServerPrefix();

    nanoajax.ajax({url: serverPrefix + '/api/sheetlist/', method: 'POST', body: `sessionId=${sessionId}&email=${email}`}, function (code, responseText, request) {
        try {
            let response = JSON.parse(responseText);

            if(response.error) {
                $$('id-output-loadremotesheet').innerHTML = response.error;
                return;
            }

            if(response.message)
                $$('id-output-loadremotesheet').innerHTML = response.message;

            if(response.sheetList) {
                let tbody = '';
                for (let i = 0; i < response.sheetList.length; i++) {
                    let sd = response.sheetList[i];
                    let sheet = localStorage[SHEET_STORAGE_KEY + '-' + sd.Id];

                    let synched = (sheet) ? 'synched' : `<a href="#" class="c-synctolocal" data-id="${sd.Id}">synch locally</a>`;

                    tbody += `<tr>
                                <td style="width:20px">${i+1}</td>
                                <td title="${sd.Id}"><a href="index.html#${sd.Id}">${sd.SheetTitle}</a></td>
                                <td>${sd.CreationDate}</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>${synched}</td>
                                <td align="center"><a href="#" title="delete sheet" data-id="${sd.Id}" class="c-delete"><img src="icons/delete.svg" style="height: 20px;" alt="delete sheet"></a></td>
                            </tr>`;
                }

                $$('id-remotesheetlist').innerHTML = tbody;

                // create synch action
                let allSync = $$('id-remotesheetlist').querySelectorAll('a.c-synctolocal');
                for(let i = 0; i < allSync.length; i++) {
                    allSync[i].onclick = function() {
                        let loginData = getLoginData();
                        if(!loginData.email || !loginData.sessionId) {
                            alert('You must be logged in to copy data locally');
                            return;
                        }
                            
                        console.log('synching to local: ' + this.dataset.id);
                        getRemoteSheet(this.dataset.id, loginData.email, loginData.sessionId, function(sheetId, sheetData) {
                            localStorage[SHEET_STORAGE_KEY + '-' + sheetId] = JSON.stringify(sheetData);
                            buildListOfSheets();
                        }, function(sheetId, error) {
                            alert('Error copying sheet: ' + error);
                        });
                    }
                }

                // create delete action
                let allDelete = $$('id-remotesheetlist').querySelectorAll('a.c-delete');
                for(let i = 0; i < allDelete.length; i++) {
                    allDelete[i].onclick = function() {
                        let loginData = getLoginData();
                        if(!loginData.email || !loginData.sessionId) {
                            alert('You must be logged in to remote delete sheet');
                            return;
                        }

                        if(!confirm('Are you sure?'))
                            return;

                        console.log('remote deleting: ' + this.dataset.id);
                        deleteRemoteSheet(this.dataset.id, loginData.email, loginData.sessionId, function(sheetId, response) {
                            // find the sheet in the localStorage and remove the sync 
                            try {
                                let lSheetData = localStorage[SHEET_STORAGE_KEY + '-' + sheetId];
                                if(lSheetData) {
                                    lSheetData = JSON.parse(lSheetData);
                                    lSheetData.synched = false;
                                    lSheetData.remoteSheetId = null;
                                    localStorage[SHEET_STORAGE_KEY + '-' + sheetId] = JSON.stringify(lSheetData);
                                }
                            } catch(e) {
                                $$('id-output-loadremotesheet').innerHTML = "Error in deleteRemoteSheet: " + e;
                                console.error("Error in deleteRemoteSheet: " + e);
                            }

                            buildListOfSheets();
                        });
                    }
                }
            }
        } catch(e) {
            $$('id-output-loadremotesheet').innerHTML = responseText + ` error: ${e}`;
        }
    });
}

function trylogin(email, password) {
    $$('id-login-output').innerHTML = "<progress></progress>";

    email    = encodeURIComponent(email);
    password = encodeURIComponent(password);
    let serverPrefix = getServerPrefix();

    nanoajax.ajax({url: serverPrefix + '/api/login/', method: 'POST', body: `email=${email}&password=${password}`}, function (code, responseText, request) {
        try {
            let response = JSON.parse(responseText);

            if(response.error) {
                $$('id-login-output').innerHTML = response.error;
                return;
            }

            if(response.message)
                $$('id-login-output').innerHTML = response.message;

            if(response.sessionId && response.email) {
                console.log(`login success - sessionId: ${response.sessionId} - email: ${response.email}`);
                saveLoginData(response);
                displayLoginPanels();
            }
        } catch(e) {
            $$('id-login-output').innerHTML = responseText;
        }
    });
}

function logOut() {
    loginLogout();
    displayLoginPanels();
}

// weather to display the login panels if we are not logged in
// or login data - if we are logged in
function displayLoginPanels() {
    // are we logged in
    let loginData = getLoginData();
    if(loginData && loginData.sessionId) {
        $$('id-login-panels').style.display = 'none';
        $$('id-userinfo').style.display = 'block';
        $$('id-session-id').innerHTML = loginData.sessionId;
    } else {
        $$('id-login-panels').style.display = 'flex';
        $$('id-userinfo').style.display = 'none';
    }

    if(loginData && loginData.email) {
        $$('id-login-email').value = loginData.email; // on login screen input box
        $$('id-session-email').innerHTML = loginData.email; // on view screen when logged in
    }

    let serverPrefix = getServerPrefix();
    $$('id-server-prefix').value = serverPrefix; // on login
    $$('id-connected-server').innerHTML = serverPrefix; // on view
}

// display the relevant tab
function viewTab(event) {
    $$('sheets').style.display = 'none';
    $$('login').style.display = 'none';
    $$('about').style.display = 'none';

    $$(this.dataset.page).style.display = '';
}

// Initialize the spreadsheet when the DOM is fully loaded (onload)
document.addEventListener('DOMContentLoaded', () => {
    buildListOfSheets();

    $$('id-login-form').onsubmit = function(event) {
        event.preventDefault(); // Prevent browser's default save action
        trylogin($$('id-login-email').value, $$('id-login-password').value);
        return false;
    }

    $$('id-logout-button').onclick = function(event) {
        event.preventDefault(); // Prevent browser's default save action
        logOut();
        return false;
    }

    $$('id-logout-button').onclick = function(event) {
        event.preventDefault(); // Prevent browser's default save action
        logOut();
        return false;
    }

    $$('id-view-upload-csv').onclick = function(event) {
        event.preventDefault(); // Prevent browser's default save action
        $$('id-upload-csv-form').style.display = ($$('id-upload-csv-form').style.display == 'block') ? '' : 'block';
        return false;
    }

    $$('id-csvfile').addEventListener('change', function(event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();

            // The onload event is triggered when the file is successfully read.
            reader.onload = function(e) {
                const contents = e.target.result;
                let sheetData = newEmptySheet();
                let row = 1;

                // A simple parsing example: splitting by lines and commas
                const lines = contents.split('\n');

                lines.forEach(line => {
                    const columns = line.split(',');
                    for(let c = 0; c < columns.length; c++) {
                        let column = getColumnLetter(c);
                        sheetData.cells[column + row] = columns[c];
                    }
                    row++;
                });

                sheetData.title = file.name; // TODO: make sure the length of the name is not too long

                // save the data of the new uploaded file in the localStorage
                localStorage[SHEET_STORAGE_KEY + '-' + sheetData.sheetId] = JSON.stringify(sheetData);

                // relist all files
                buildListOfSheets();
            };


            // Read the file as a text string
            reader.readAsText(file);
        }
    }, false);

    $$('id-server-prefix').onchange = function(event) {
        setServerPrefix(this.value);
    }


    let tabs = document.querySelectorAll('.c-tabs a[data-page]');
    for(let i = 0; i < tabs.length; i++) {
        tabs[i].onclick = function(event) {
            $$('sheets').style.display = 'none';
            $$('login').style.display = 'none';
            $$('about').style.display = 'none';

            $$(this.dataset.page).style.display = '';

            let e = document.querySelector('.c-tab-selected');
            e.classList.remove('c-tab-selected');

            this.parentNode.classList.add('c-tab-selected');
        };
    }

    displayLoginPanels();
});