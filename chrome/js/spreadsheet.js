// spreadsheet.js

function $$(id) {return document.getElementById(id);}

// Constants for sheet dimensions
const NUM_COLS = 10;
const NUM_ROWS = 20;
const LAST_SHEETID_KEY = 'lastSheet';
const SHEET_STORAGE_KEY = 'simpleSheetData';

// Store sheet data
let sheetData = newEmptySheet();

// globals
let currentCell = 'A1';      // c-current : the current cell (with blue border around it)
let allowkeys = true;        // when editing the title we disable the onkeyup from the cells
let selecting = null;        // when true means we are selecting with the mousedown events
let undo = null;             // an object which holds a linked-list of undo states
let newSelectedRange = null; // c-range : currently selected range 
let copyRange = null;        // holds the range for copying

let selectingFormula = null; // when true means the selection is for formula


/**
 * Builds the spreadsheet grid (headers and cells).
 */
function buildSpreadsheet() {
    consolelog('buildSpreadsheet');

    // DOM Elements
    const spreadsheetTable = document.getElementById('id-spreadsheet');
    const theadRow = spreadsheetTable.querySelector('thead tr');
    const tbody = spreadsheetTable.querySelector('tbody');

    // Create column headers
    let theadrow = '<th></th>';
    for (let c = 0; c < NUM_COLS; c++) {
        let letter = getColumnLetter(c);
        theadrow += `<th id="id-${letter}">${letter}</th>`;
    }
    theadRow.innerHTML = theadrow;

    // Create rows and cells
    let fullbody = '';
    for (let r = 1; r <= NUM_ROWS; r++) {
        let t = `<tr><th id="id-${r}">${r}</th>`;
        for (let c = 0; c < NUM_COLS; c++) {
            let col = getColumnLetter(c);
            // t += `<td id="id-${k}"><input type="text" class="c-editable" id="id-${k}-t" data-col="${col}" data-row="${r}"></td>`;
            t += `<td id="id-${col}${r}" data-col="${col}" data-colnum="${c}" data-row="${r}" data-cor="${col}${r}" class="c-editable"></td>`;
        }
        t += '</tr>';
        fullbody += t;
    }
    tbody.innerHTML = fullbody;

    setCurrentCell(currentCell);

    // Create the events
    let allInputs = tbody.querySelectorAll('.c-editable');
    for(let i = 0; i < allInputs.length; i++) {
        allInputs[i].onclick = function(event) {
            consolelog(`onclick: ${this.dataset.cor} ${this.innerHTML}`);
            
            if(event.ctrlKey) {
                if(newSelectedRange) {
                    newSelectedRange.toggleFreeCell(this.dataset.cor);
                } else {
                    newSelectedRange = new CellRange(this.dataset.cor, this.dataset.cor);
                }

                $$('id-fastresults').innerHTML = colorTheCells(newSelectedRange.allCellsInRange(), 'c-range');
            } else {
                if(selectingFormula) {
                    consolelog('onclick formulaRange ending');
                    selectingFormula = null; // global
                }

                if(event.shiftKey) {
                    consolelog('onmousedown: shift:' + this.id);
                    setSelectedCells(currentCell, this.dataset.cor);
                    return;
                }

                setCurrentCell(this.dataset.cor);
            }

            //clearSelectedCells();

            // if(document.activeElement == this)
            //     return;

            //makeCellEditable(this, null);
        }

        allInputs[i].ondblclick = function() {
            let key = this.dataset.col + this.dataset.row;
            consolelog(`ondblclick text: ${key} ${this.innerHTML}`);
            clearSelectedCells();

            if(document.activeElement == this)
                return;

            makeCellEditable(this, null);
        }

        allInputs[i].onblur = function() {
            //delete this.contentEditable; //
            this.contentEditable = false;
            let cell = this.dataset.cor;
            consolelog(`onblur text: ${cell} ${this.innerHTML}`);

            if(selectingFormula) {
                return;
            }

            let val = clearCellRubbish(this.innerHTML);
            let calcval = val;
            
            if(val[0] === '=') {
                try {
                    calcval = calculateCellValue(cell, []);
                } catch(e) {
                    calcval = e.message;
                }
            }

            sheetData.cells[cell] = val;
            
            this.innerHTML = calcval;
            this.title = val;

            if(val === '')
                delete sheetData.cells[cell];
            
            undo = saveSheetData(sheetData, true, undo);
        }

        allInputs[i].onmousedown = function(event) {
            // Check if it's the left button (0)
            if (event.button === 0) {
                consolelog('onmousedown: ' + this.id);

                if(event.ctrlKey) {
                    return;
                }

                if(newSelectedRange)
                    clearSelectedCells();

                selecting = this.dataset.cor;
                newSelectedRange = new CellRange(this.dataset.cor, this.dataset.cor);
            }
        }

        allInputs[i].onmouseup = function(event) {
            if (event.button === 0) { 
                consolelog('onmouseup: ' + this.id);
                
                // stop selecting formula
                if(selecting) {
                    if(selectingFormula) {
                        consolelog('onmouseup formulaRange ending');
                        selectingFormula.title = selectingFormula.innerHTML;
                        makeCellEditable(selectingFormula, null);
                        selectingFormula = null; // global
                    }

                    selecting = null;
                }
            }
        }

        allInputs[i].onmouseover = function(event) {
            if(selecting) {
                consolelog('onmouseover selecting: ' + this.id);
                event.preventDefault();
                let selectedRange = setSelectedCells(selecting, this.dataset.cor);
                if(selectingFormula) {
                    selectingFormula.innerHTML = selectingFormula.originalText + selectedRange.getRangeString(); // set the formulaSelecting text
                }
            }
        }

        allInputs[i].onkeyup = function(event) {
            $$('id-fastresults').innerHTML = 'allInputs:' + event.key;
            if(this.innerHTML.startsWith('=')) {
                consolelog('onkeyup formulaRange starting');
                this.originalText = this.innerHTML; // save the original text we had
                selectingFormula = this; // global
                // $$('id-dialog-function').show();
            }
        }

    } // allInputs
} // buildSpreadsheet

function buildExtraEvents() {
    buildSheetsDropdown();

    $$('id-sheettitle').onfocus = function() {
        allowkeys = false; // global
    }

    $$('id-sheettitle').onblur = function() {
        allowkeys = true; // global
        this.innerHTML = sheetData.title = this.innerHTML.substring(0, 30);
        undo = saveSheetData(sheetData, true, undo);
        buildSheetsDropdown(); // to update with the new title
    }

    $$('id-addsheet').onclick = function() {
        saveSheetData(sheetData, false, null);
        newSheet();
        buildSheetsDropdown(); // to update with the new title
    }

    $$('id-deletesheet').onclick = function() {
        if(!confirm('Are you sure?'))
            return;
        
        consolelog('deleting ' + sheetData.sheetId)
        //localStorage.removeItem('temp_data');
        delete localStorage[SHEET_STORAGE_KEY + '-' + sheetData.sheetId];

        let sheetId = findFirstSheet();
        if(sheetId) {
            clearSheet();
            loadSheetData(sheetId);
        } else {
            newSheet();
        }
        buildSheetsDropdown();
    }

    $$('id-sheetselect').onchange = function() {
        consolelog('sheetSelect.onchange:' + this.value);
        saveSheetData(sheetData, false, null);
        clearSheet();
        loadSheetData(this.value);
    }

    $$('id-body').onkeydown = async function(event) {
        if(!allowkeys)
            return;

        // event.key: A string representing the key pressed (e.g., "A", "Enter", "ArrowUp")
        // event.code: A string representing the physical key on the keyboard (e.g., "KeyA", "Enter", "ArrowUp")
        // event.keyCode: (Deprecated, use event.key or event.code) The numerical ASCII/Unicode value of the key

        // consolelog("Key pressed:", event.key);
        //consolelog("Key code:", event.code);
        //$$('id-fastresults').innerHTML = event.code;
        // consolelog("Ctrl key down?", event.ctrlKey);
        // consolelog("Shift key down?", event.shiftKey);
        // consolelog("Alt key down?", event.altKey);
        // consolelog("Meta (Cmd/Windows) key down?", event.metaKey);

        // Example: Detect specific key
        if (event.key === 'Delete' || event.key === 'Backspace' || event.code === 'NumpadDecimal') {
            consolelog('Delete key was pressed!');

            // inside edit we let the regular keys functions
            if($$(`id-${currentCell}`).contentEditable === "true") {
                return;
            }

            if(newSelectedRange) {
                let cells = newSelectedRange.allCellsInRange();
                for(let i in cells) {
                    clearCellData(cells[i]);
                }
            } else {
                clearCellData(currentCell);
            }

            undo = saveSheetData(sheetData, true, undo);
            return;
        }

        // the elusive Enter key
        if (event.ctrlKey && event.key === 'Enter') {
            // TODO: fix this, because it jumps to the beginning
            // let cc = $$(`id-${currentCell}`);
            // cc.innerHTML += '<br>';
            return;
        } else if(event.key === 'Enter') {
            // should we go down to the element below?
            let cc = $$(`id-${currentCell}`);
            if(isCursorAtEndOfContentEditable(cc) && cc === document.activeElement) {
                cc.blur();
                cc = setCurrentCell(downCell(currentCell));
            }
            return;
        }

        // escape
        if(event.key === 'Escape') {
            if(copyRange) {
                event.preventDefault(); // Prevent browser's default save action
                unColorTheCells(copyRange.allCellsInRange(), 'c-copy');
                copyRange = null; // global parameter
            }
            
            return;
        }

        // Example: Detect a combination (e.g., Ctrl + Z) Undo
        if (event.ctrlKey && event.key === 'z') {
            consolelog('Ctrl + Z was pressed!');
            if(undo) {
                undo = undo.getPreviousVersion(); // move back on global object list
                if(undo) {
                    sheetData = undo.getSheetData();
                    if(sheetData) {
                        buildSpreadsheet();
                        drawSheetData(sheetData);
                        saveSheetData(sheetData, true, false);
                    }
                }
            }
            return;
        }

        // Example: Detect a combination (e.g., Ctrl + Shift +Z) Redo of Undo
        if (event.ctrlKey && event.shiftKey && event.key === 'Z') {
            consolelog('Ctrl + Shift + Z was pressed!');
            if(undo) {
                undo = undo.getForwardVersion(); // move forward on global object list
                if(undo) {
                    sheetData = undo.getSheetData();
                    if(sheetData) {
                        buildSpreadsheet();
                        drawSheetData(sheetData);
                        saveSheetData(sheetData, true, false);
                    }
                }
            }
            return;
        }

        // Example: Detect a combination (e.g., Ctrl + S)
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault(); // Prevent browser's default save action
            consolelog('Ctrl + S was pressed!');
            alert('Save action triggered!');
            return;
        }

        // Example: Detect a combination (e.g., Ctrl + c) copy
        if (event.ctrlKey && event.key === 'c') {
            // event.preventDefault(); // Prevent browser's default save action
            consolelog('Ctrl + C was pressed!');
            
            if($$(`id-${currentCell}`).contentEditable === "true") {
                return;
            }

            event.preventDefault(); // Prevent browser's default save action

            // global copyRange
            if(copyRange) {
                unColorTheCells(copyRange.allCellsInRange(), 'c-copy');
                copyRange = null;  // global
            }

            if(newSelectedRange) {
                copyRange = newSelectedRange.copyObj();  // global
            } else {
                copyRange = new CellRange(currentCell, currentCell); // global
            }

            colorTheCells(copyRange.allCellsInRange(), 'c-copy');
            await navigator.clipboard.writeText(copyRange.getText(sheetData));

            return;
        }

        // Example: Detect a combination (e.g., Ctrl + x) cut
        if (event.ctrlKey && event.key === 'x') {
            // event.preventDefault(); // Prevent browser's default save action
            consolelog('Ctrl + X was pressed!');
            
            if($$(`id-${currentCell}`).contentEditable === "true") {
                return;
            }

            event.preventDefault(); // Prevent browser's default save action

            // global copyRange
            if(copyRange) {
                unColorTheCells(copyRange.allCellsInRange(), 'c-copy');
                copyRange = null;  // global
            }

            if(newSelectedRange) {
                copyRange = newSelectedRange.copyObj();  // global
            } else {
                copyRange = new CellRange(currentCell, currentCell); // global
            }

            colorTheCells(copyRange.allCellsInRange(), 'c-copy');
            await navigator.clipboard.writeText(copyRange.getText(sheetData));
            copyRange.cut = true; // adding the cut scene

            return;
        }

        // Example: Detect a combination (e.g., Ctrl + v) paste
        if (event.ctrlKey && event.key === 'v') {
            if($$(`id-${currentCell}`).contentEditable === "true") {
                return;
            }

            event.preventDefault(); // Prevent browser's default save action
            let clipboardContents = await navigator.clipboard.read();

            if(copyRange) {
                // create a new range to paste the data
                let offsetRange = copyRange.newOffset(currentCell);
                
                // iterate over the copyRange
                let data   = [];
                let styles = [];
                let cCell  = null;
                while(cCell = copyRange.iteratore(cCell)) {
                    if(cCell in sheetData.cells)
                        data.push(sheetData.cells[cCell]);
                    else
                        data.push(null);

                    if(cCell in sheetData.cellsStyles)
                        styles.push(sheetData.cellsStyles[cCell]);
                    else
                        styles.push(null);

                    if(copyRange.cut === true) {
                        $$(`id-${cCell}`).innerHTML = '';
                        delete sheetData.cells[cCell];
                    }
                }

                // iterate over the offsetRange (paste area)
                let i = 0;
                let oCell = null;
                while(oCell = offsetRange.iteratore(oCell)) {
                    let v = data[i];
                    let s = styles[i];

                    if(v !== null)
                        sheetData.cells[oCell] = v;
                    else if(oCell in sheetData.cells)
                        delete sheetData.cells[oCell];

                    if(s !== null)
                        sheetData.cellsStyles[oCell] = s;
                    else if(oCell in sheetData.cellsStyles)
                        delete sheetData.cellsStyles[oCell];

                    // copy the cell
                    let o = $$(`id-${oCell}`);
                    if(o) {
                        if(v !== null) {
                            o.innerHTML = v;
                            o.title = v;
                        } else {
                            o.innerHTML = '';
                        }
                        if(s !== null) {
                            o.style = s;
                        }
                    }

                    i++;
                }

                if(copyRange.cut) {
                    delete copyRange.cut;
                    unColorTheCells(copyRange.allCellsInRange(), 'c-copy');
                    copyRange = null; // global
                }

                undo = saveSheetData(sheetData, true, undo);
            } else if(clipboardContents) {
                for (const item of clipboardContents) {
                    let text = null;
                    // if(item.types.includes("text/html")) {
                    //     const blob = await item.getType("text/html");
                    //     text = await blob.text();
                    // } else
                    if(item.types.includes("text/plain")) {
                        const blob = await item.getType("text/plain");
                        text = await blob.text();
                    }

                    if(text) {
                        let a = parsePaste(text);
                        let iCell = currentCell;
                        let lRow  = currentCell;
                        for(let i in a) {
                            if(a[i] === "\t") {
                                iCell = rightCell(iCell);
                            } else if(a[i] === "\n") {
                                iCell = lRow = downCell(lRow);
                            } else {
                                if($$(`id-${iCell}`)) {
                                    $$(`id-${iCell}`).innerHTML = a[i];
                                    sheetData.cells[iCell] = a[i];
                                }
                            }
                        }

                        undo = saveSheetData(sheetData, true, undo);
                    }
                }
            }

            return;
        }

        // Example: Detect a combination (e.g., Ctrl + d)
        if (event.ctrlKey && event.key === 'd') {
            event.preventDefault(); // Prevent browser's default save action

            let cc = $$(`id-${currentCell}`);
            let upcell = upCell(currentCell);
            let uc = $$(`id-${upcell}`);

            cc.innerHTML = uc.innerHTML;
            cc.title = uc.title;

            sheetData.cells[currentCell] = sheetData.cells[upcell];
            undo = saveSheetData(sheetData, true, undo);
            return;
        }

        // Example: Detect a combination (e.g., Ctrl + b)
        if (event.ctrlKey && event.key === 'b') {
            let isBold = $$(`id-${currentCell}`).style.fontWeight === 'bold';

            if(newSelectedRange)
                bold(newSelectedRange.allCellsInRange(), !isBold); 
            else
                bold([currentCell], !isBold); 
            
            undo = saveSheetData(sheetData, true, undo);
            return;
        }        


        // tab
        if(event.code === 'Tab') {
            // move to next cell
            $$(`id-${currentCell}`).blur();
            setCurrentCell(rightCell(currentCell));

            // prevent default
            $$('id-spreadsheet').focus();
            event.preventDefault();
            return;
        }

        // arrows
        if(event.key === 'ArrowUp') {
            arrowKey(event, upCell);
            return;
        } else if(event.key === 'ArrowDown') {
            arrowKey(event, downCell);
            return;
        } else if(event.key === 'ArrowLeft') {
            arrowKey(event, leftCell);
            return;
        } else if(event.key === 'ArrowRight') {
            arrowKey(event, rightCell);
            return;
        }
        

        // regular key strokes - must be last
        //$$('id-fastresults').innerHTML = event.code + ':' + event.key;
        if(isPrintable(event.code)) {
            let cc = $$(`id-${currentCell}`);
            if(cc != document.activeElement) {
                makeCellEditable(cc, null);
                //makeCellEditable(cc, event.key);
            }
            return;
        }
    };

    // menu
    $$('id-menu-wrap').onchange = function() {
        if(newSelectedRange)
            wrap(newSelectedRange.allCellsInRange(), this.checked); 
        else
            wrap([currentCell], this.checked);

        undp = saveSheetData(sheetData, true, undo);
    }

    $$('id-menu-bold').onchange = function() {
        if(newSelectedRange)
            bold(newSelectedRange.allCellsInRange(), this.checked); // TODO: pass range of cells
        else
            bold([currentCell], this.checked); // TODO: pass range of cells

        undo = saveSheetData(sheetData, true, undo);
    }

    $$('id-export-dialog-close').onclick = function() {
        $$('id-dialog-export').close();
    }

    $$('id-export-link').onclick = function() {
        //$$('id-dialog-export').show(); // showModal
        buildExportDialog(sheetData);

        $$('id-dialog-export').showModal(); // showModal

        $$('id-dialog-export').onkeydown = function(event) {
            // Check if the Escape key was pressed and the dialog is currently open
            if (event.key === 'Escape' && this.open) {
                // Prevent the default browser/extension behavior for the Escape key
                event.preventDefault();
                // Close the dialog programmatically
                this.close();
                // console.log("Dialog closed by custom Escape key handler.");
            }
        };
    }

    $$('id-sync-link').onclick = syncPressed;
}

// when user clicks on "sync" link (from the export popup or from the bottom line)
function syncPressed(event) {
    let loginData = getLoginData();
    if(!loginData.email || !loginData.sessionId) {
        alert('You must be logged in for synching the sheet');
        return;
    }

    if(!sheetData.remoteSheetId) {
        if(!confirm('Are you sure you want to remotely sync this sheet?')) {
            return;
        }
    }

    initSync(sheetData, loginData.email, loginData.sessionId, sheetData.sheetId, sheetData.title, function(d) {
        if(d.success && d.remoteSheetId) {
            sheetData.remoteSheetId = d.remoteSheetId; // should be the same as the local sheetId
            saveSheetData(sheetData, false, false);
            updateSyncView(sheetData.remoteSheetId);
        } else {
            updateSyncView(null);
        }
    });
}

function updateSyncView(remoteSheetId) {
    let loginData = getLoginData();
    if(remoteSheetId && loginData.sessionId) {
        $$('id-sync-link').style.color = 'green';
        $$('id-sync-link').innerHTML = 'Synched';
    } else if(remoteSheetId && !loginData.sessionId) {
        $$('id-sync-link').style.color = 'red';
        $$('id-sync-link').innerHTML = 'Sync error';
    } else {
        $$('id-sync-link').style.color = 'red';
        $$('id-sync-link').innerHTML = 'Not Synched';
    }
}

// a function that called when an arrow key is pressed
// the event is the event
// nextCellFunc is a reference to the function that returns the next cell
function arrowKey(event, nextCellFunc) {
    if(event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        if($$(`id-${currentCell}`).innerHTML != '' && $$(`id-${currentCell}`) === document.activeElement) // allow editing arrows right and left
            return;
    }

    let newcell = nextCellFunc(currentCell);

    // creating range
    if(event.shiftKey) {
        // global object for range
        if(!newSelectedRange)
            setSelectedCells(currentCell, newcell);
        else
            setSelectedCells(newSelectedRange.getOriginalStartCell(), newcell);
    } else {
        if(newSelectedRange)
            clearSelectedCells();
    }

    $$(`id-${currentCell}`).blur();
    setCurrentCell(newcell);
}

// set the current 'active' cell + update the menu
// recieve string cell cordinates 'A5'
// returns element of new current active cell
function setCurrentCell(newCurrentCell) {
    let cc = cellToXY(currentCell);
    $$(`id-${currentCell}`).classList.remove('c-current');
    $$(`id-${cc.n}`).classList.remove('c-current-m'); // column letter
    $$(`id-${cc.y}`).classList.remove('c-current-m'); // row

    currentCell = newCurrentCell;
    cc = cellToXY(currentCell);
    $$(`id-${currentCell}`).classList.add('c-current');
    $$(`id-${cc.n}`).classList.add('c-current-m'); // column letter
    $$(`id-${cc.y}`).classList.add('c-current-m'); // row

    // update the menu
    $$(`id-menu-wrap`).checked = ($$(`id-${currentCell}`).style.whiteSpace === 'normal');
    $$(`id-menu-bold`).checked = ($$(`id-${currentCell}`).style.fontWeight === 'bold');

    return $$(`id-${currentCell}`);
}

// popuate from local storage all the sheets we have into the select dropdown
function buildSheetsDropdown() {
    consolelog('buildSheetsDropdown');

    // Iterate over all keys in localStorage
    let options = '';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i); // Get the key at the current index

        // Check if the key starts with the specified prefix
        if (key && key.startsWith(SHEET_STORAGE_KEY)) {
            let nSheetData = localStorage[key];
            try {            
                nSheetData = JSON.parse(nSheetData);
            } catch(e) {
                console.log('Error buildSheetsDropdown parsing localStorage sheetData of key:' + key);
                continue;
            }
            let sheetId = key.replace(SHEET_STORAGE_KEY + '-', '');
            if(sheetId == sheetData.sheetId) {
                options += `<option value="${sheetId}" selected>${nSheetData.title}</option>`;
            } else {
                options += `<option value="${sheetId}">${nSheetData.title}</option>`;
            }
        }
    }
    // options += `<option value="${sheetData.sheetId}" selected>${sheetData.title}</option>`;
    $$('id-sheetselect').innerHTML = options;
}

// clear data inside a cell 'C5'
function clearCellData(cell) {
    $$(`id-${cell}`).innerHTML = '';
    $$(`id-${cell}`).title = '';
    delete sheetData.cells[cell];
}

// clear sheet data
function clearSheet() {
    consolelog('clearSheet cells and visual');
    sheetData.cells = {};
    sheetData.cellsStyles = {};
    buildSpreadsheet();
}

// creates new sheet - clear all data from the current sheet
function newSheet() {
    consolelog('newSheet');

    // clear global object
    sheetData = newEmptySheet();

    consolelog('newSheet:' + sheetData.sheetId);

    // update the title
    $$('id-sheettitle').innerHTML = sheetData.title;
    $$('id-sheettitle').title = sheetData.sheetId;

    // clear the visual data
    buildSpreadsheet();

    updateSyncView(sheetData.remoteSheetId);
    $$('id-info-line').innerHTML = '';

    undo = new Undo(null, sheetData); // global

    // insert the new sheet
    undo = saveSheetData(sheetData, false, undo);
}

// load the sheetData from localStorage by sheetId
function loadSheetData(sheetId) {
    consolelog('loadSheetData: ' + sheetId)
    
    // check sheet in localStorage
    let data = localStorage[SHEET_STORAGE_KEY + '-' + sheetId];
    if(data) {
        consolelog('loadSheetData localStorage found:' + sheetId);
        localStorage[LAST_SHEETID_KEY] = sheetId;

        //currentCell = 'A1'; // c-current
        allowkeys = true; // when editing the title we disable the onkeyup from the cells
        selecting = null; // when true means we are selecting with the mousedown events
        newSelectedRange = null; // c-range
        copyRange = null;
        
        sheetData = JSON.parse(data); // global parameter
        sheetData = upgradeSheetToLatestVersion(sheetData); // global
        drawSheetData(sheetData); // put the sheetData on the DOM
        updateSyncView(sheetData.remoteSheetId); // shows the sync / not sync indication

        // validate session
        let loginData = getLoginData();
        if(loginData.email && loginData.sessionId) {
            validateSessionId(loginData.email, loginData.sessionId, function(success, errorNum) {
                // invalidate session
                if(success === false && errorNum === 1) {
                    loginLogout();
                    updateSyncView(sheetData.remoteSheetId);
                }
            });
        }

        undo = new Undo(null, sheetData); // global

        // check for remote sheetData
        if(loginData.email && loginData.sessionId && sheetData.remoteSheetId) {
            getRemoteSheet(sheetData.sheetId, loginData.email, loginData.sessionId, function(sheetId, remoteSheetData) {
                console.log(`loadSheetData received remoteSheetData sheetId:${sheetId}`);
                let newSheetData = upgradeSheetToLatestVersion(remoteSheetData);
                if(newSheetData.dates.modified > sheetData.dates.modified) {
                    consolelog(`loadSheetData: server sheet modified is newer - updating the sheet. server: ${newSheetData.dates.modified} vs current: ${sheetData.dates.modified}`)
                    sheetData = newSheetData; // global set the new sheet data
                    drawSheetData(sheetData); // put the sheetData on the DOM
                } else {
                    consolelog(`loadSheetData: server sheet modified is older - NOT updating. server: ${newSheetData.dates.modified} vs current: ${sheetData.dates.modified}`)
                }
                updateSyncView(sheetData.remoteSheetId); // shows the sync / not sync indication
            }, function(sheetId, error) {
                $$('id-info-line').innerHTML = 'Error loading remote sheet data: ' + error;
            });
        }
    }
    $$('id-info-line').innerHTML = '';
}

// draw the sheetData on the DOM
function drawSheetData(sheetData) {
    // title
    $$('id-sheettitle').innerHTML = sheetData.title;
    $$('id-sheettitle').title = sheetData.sheetId;
    consolelog('loadSheetData data title:' + sheetData.title);

    // update the data
    for(let cell in sheetData.cells) {
        //$$(`id-${k}-t`).value = sheetData.cells[k];
        let val = sheetData.cells[cell];
        let calcval = val;

        // do we need to calculate
        if(val.length > 0 && val[0] === '=')
        {
            try {
                calcval = calculateCellValue(cell, []);
            } catch(e) {
                calcval = e.message;
            }
        }

        // update the DOM view
        let dcell = $$(`id-${cell}`);
        if(dcell) {
            dcell.innerHTML = calcval;
            dcell.title = val;
        }
    }

    if(!sheetData.cellsStyles)
        sheetData.cellsStyles = {};

    // update the styles
    for(let cell in sheetData.cellsStyles) {
        //$$(`id-${k}-t`).value = sheetData.cells[k];
        for(let item in sheetData.cellsStyles[cell]) {
            let dcell = $$(`id-${cell}`);
            if(dcell)
                dcell.style[item] = sheetData.cellsStyles[cell][item];
        }
    }
}

// Initialize the spreadsheet when the DOM is fully loaded (onload)
document.addEventListener('DOMContentLoaded', () => {
    buildSpreadsheet();

    let sheetToLoad = window.location.hash;
    if(sheetToLoad)
        sheetToLoad = sheetToLoad.substring(1); // remove # hash

    // check if we got hash tag for #sheetId to load a sheet
    if(sheetToLoad === '---') {
        localStorage[LAST_SHEETID_KEY] =  sheetData.sheetId; // new sheet - current sheet
        buildExtraEvents();
        return;
    } else if(sheetToLoad) {
        if(!localStorage[SHEET_STORAGE_KEY + '-' + sheetToLoad])
            sheetToLoad = null;
    }

    // try last sheetId
    if(!sheetToLoad)
        sheetToLoad = localStorage[LAST_SHEETID_KEY];
    
    // load the sheet
    if(!sheetToLoad) {
        localStorage[LAST_SHEETID_KEY] = sheetData.sheetId;
    } else {
        loadSheetData(sheetToLoad);
    }

    buildExtraEvents();
});

// // when the extension popup is closed
// window.addEventListener('unload', function() {
//     // Your code here. This function will be called when the popup is closed.
//     consolelog("Popup is being closed!");

//     // You can call another function, send a message, or perform any other action.
//     saveSheetData(sheetData, false);
// });