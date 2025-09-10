// ranger.js

// Ranger is a class to hold a range of cells
// For example: A4:C8 or separeted: C9,A10,B7 or both

// Define the CellRange class
class CellRange {
    /**
     * @property {string} startCell - The starting cell of the range (e.g., "A1").
     * @property {string} endCell - The ending cell of the range (e.g., "C5").
     */
	originalStartCell;
	originalEndCell;
    startCell;
    endCell;
    lastSuffix; // holds \t for cell, \n for new line - so can be used for copy-paste

    freeCells; // an object of {key:value} for cells that added with ctrl+click and are selected outside the range, e.g. {"B1": true, "A11": true}

    /**
     * Constructor for the CellRange class.
     * Initializes the start and end cells of the range.
     * @param {string} startCell - The starting cell (e.g., "A1").
     * @param {string} endCell - The ending cell (e.g., "C5").
     */
    constructor(startCell, endCell) {
        // Basic validation to ensure inputs are strings
        if (typeof startCell !== 'string' || typeof endCell !== 'string') {
            console.error("Error: startCell and endCell must be strings.");
            // Set to default or throw an error based on desired behavior
            this.startCell = "A1";
            this.endCell = "A1";
            return;
        }

        this.originalStartCell = startCell.toUpperCase(); // Convert to uppercase for consistency
        this.originalEndCell = endCell.toUpperCase();     // Convert to uppercase for consistency

        this.startCell = startCell.toUpperCase(); // Convert to uppercase for consistency
        this.endCell = endCell.toUpperCase();     // Convert to uppercase for consistency

        // Optional: More robust validation could be added here,
        // e.g., checking if the cell format is valid (e.g., "A1", "B10")
        // and if start cell is before or equal to end cell.
        if (!this._isValidCell(this.startCell) || !this._isValidCell(this.endCell)) {
            console.error("Error: Invalid cell format detected. Please use formats like 'A1', 'B10'.");
            this.startCell = "A1";
            this.endCell = "A1";
        } 

        let mincell = minCell(this.startCell, this.endCell);
        let maxcell = maxCell(this.startCell, this.endCell);
        this.startCell = mincell;
        this.endCell = maxcell;
    }

    copyObj() {
        return new CellRange(this.originalStartCell, this.originalEndCell);
    }

    // creates a new range with the same size starting from the newStartCell
    // e.g. we had an original range from B5 to C7 (3x3 = 9 cells)
    // now we call with E9 - the function will return a new range E9 to G11 (3x3) 
    newOffset(newStartCell) {
        let cellLetter = this._getColumnLetters(newStartCell);

        let cellX      = this._columnLettersToIndex(cellLetter);
        let cellY      = this._getRowNumber(newStartCell);

        let startX  = this._columnLettersToIndex(this._getColumnLetters(this.startCell));
        let startY  = this._getRowNumber(this.startCell);
        let endX    = this._columnLettersToIndex(this._getColumnLetters(this.endCell));
        let endY    = this._getRowNumber(this.endCell);

        let width  = endX - startX;
        let height = endY - startY;

        let startCell = newStartCell;
        let endCell   = this._columnIndexToLetters(cellX + width) + (cellY + height);

        return new CellRange(startCell, endCell);
    }

    // when called without 'cell' it returns the mincell (top left)
    // when called with a 'cell' it returns the next cell, going right or a new line if reacehd the end of the line
    // returns null when last cell returned
    // cell is a string e.g. 'B9', returns also a string
    iteratore(cell) {
        if(!cell) {
            // if(this._columnLettersToIndex(this._getColumnLetters(this.startCell)) == this._columnLettersToIndex(this._getColumnLetters(this.endCell)))
            //     this.lastSuffix = "\n";
            // else
            //     this.lastSuffix = "\t";
            this.lastSuffix = null;
            return this.startCell;
        }

        if(cell === this.endCell) {
            this.lastSuffix = null;
            return null;
        }

        this.lastSuffix = "\t";

        let cellLetter = this._getColumnLetters(cell);

        let cellX      = this._columnLettersToIndex(cellLetter);
        let cellY      = this._getRowNumber(cell);

        let startX     = this._columnLettersToIndex(this._getColumnLetters(this.startCell));
        let startY     = this._getRowNumber(this.startCell);

        let endX       = this._columnLettersToIndex(this._getColumnLetters(this.endCell));
        let endY       = this._getRowNumber(this.endCell);

        // moving forward
        cellX++;

        if(cellX > endX) {
            cellX = startX;
            cellY++;
            this.lastSuffix = "\n";
        }

        // reached the end or out of bound
        if(cellY > endY) {
            this.lastSuffix = null;
            return null;
        }

        return this._columnIndexToLetters(cellX) + cellY;
    }

    getLastSuffix() {
        return this.lastSuffix;
    }

    // iterate over the range and returns a copy-paste text string with \t and \n as seperators
    getText(sheetData) {
        let text = '';
        let cCell = null;
        while(cCell = this.iteratore(cCell)) {
            let ls = this.getLastSuffix() 
            if(ls)
                text += this.getLastSuffix();
            text += (cCell in sheetData.cells) ? sheetData.cells[cCell] : '';
        }

        return text;
    }

    /**
     * Private helper method to validate a single cell string format.
     * Assumes format like "A1", "AA100".
     * @param {string} cell - The cell string to validate.
     * @returns {boolean} True if the cell format is valid, false otherwise.
     */
    _isValidCell(cell) {
        // Regular expression to match one or more letters followed by one or more digits
        return /^[A-Z]+[0-9]+$/.test(cell);
    }

    /**
     * Private helper method to extract column letters from a cell string.
     * @param {string} cell - The cell string (e.g., "A1", "BC10").
     * @returns {string} The column letters (e.g., "A", "BC").
     */
    _getColumnLetters(cell) {
        return cell.match(/^[A-Z]+/)[0];
    }

    /**
     * Private helper method to extract row number from a cell string.
     * @param {string} cell - The cell string (e.g., "A1", "BC10").
     * @returns {number} The row number (e.g., 1, 10).
     */
    _getRowNumber(cell) {
        return parseInt(cell.match(/[0-9]+$/)[0], 10);
    }

    /**
     * Private helper method to convert column letters to a numerical index (A=1, B=2, AA=27).
     * @param {string} letters - The column letters (e.g., "A", "BC").
     * @returns {number} The numerical column index.
     */
    _columnLettersToIndex(letters) {
        let index = 0;
        for (let i = 0; i < letters.length; i++) {
            index = index * 26 + (letters.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        return index;
    }

    /**
     * Private helper method to convert a numerical column index to column letters (1=A, 2=B, 27=AA).
     * @param {number} index - The numerical column index.
     * @returns {string} The column letters.
     */
    _columnIndexToLetters(index) {
        let letters = '';
        while (index > 0) {
            const remainder = (index - 1) % 26;
            letters = String.fromCharCode(65 + remainder) + letters;
            index = Math.floor((index - 1) / 26);
        }
        return letters;
    }

    /**
     * Private helper method to check if the start cell is before or equal to the end cell.
     * @returns {boolean} True if start is before or equal to end, false otherwise.
     */
    _isStartBeforeEnd() {
        const startCol = this._columnLettersToIndex(this._getColumnLetters(this.startCell));
        const startRow = this._getRowNumber(this.startCell);
        const endCol = this._columnLettersToIndex(this._getColumnLetters(this.endCell));
        const endRow = this._getRowNumber(this.endCell);

        if (startCol < endCol) {
            return true;
        } else if (startCol === endCol) {
            return startRow <= endRow;
        }
        return false;
    }

    /**
     * Returns the cell range as a string (e.g., "A1:C5").
     * @returns {string} The formatted cell range string.
     */
    getRangeString() {
        return `${this.startCell}:${this.endCell}`;
    }

    /**
     * Calculates and returns the total number of cells within the defined range.
     * @returns {number} The total count of cells.
     */
    getCellsCount() {
        if (!this._isValidCell(this.startCell) || !this._isValidCell(this.endCell)) {
            return 0; // Return 0 if cells are invalid
        }

        const startCol = this._columnLettersToIndex(this._getColumnLetters(this.startCell));
        const startRow = this._getRowNumber(this.startCell);
        const endCol = this._columnLettersToIndex(this._getColumnLetters(this.endCell));
        const endRow = this._getRowNumber(this.endCell);

        // Calculate width (number of columns) and height (number of rows)
        const width = endCol - startCol + 1;
        const height = endRow - startRow + 1;

        // Total cells = width * height
        return width * height;
    }

    /**
     * Checks if a given cell string is within the current range.
     * @param {string} cell - The cell string to check (e.g., "B3").
     * @returns {boolean} True if the cell is within the range, false otherwise.
     */
    isCellInRange(cell) {
        if (!this._isValidCell(cell)) {
            return false;
        }

        const checkCol = this._columnLettersToIndex(this._getColumnLetters(cell));
        const checkRow = this._getRowNumber(cell);

        const startCol = this._columnLettersToIndex(this._getColumnLetters(this.startCell));
        const startRow = this._getRowNumber(this.startCell);
        const endCol = this._columnLettersToIndex(this._getColumnLetters(this.endCell));
        const endRow = this._getRowNumber(this.endCell);

        return (
            checkCol >= startCol &&
            checkCol <= endCol &&
            checkRow >= startRow &&
            checkRow <= endRow
        );
    }

    /**
     * Returns an array of all cell strings within the defined range.
     * For example, for "A2:B3", it returns ["A2", "A3", "B2", "B3"].
     * @returns {string[]} An array of cell strings.
     */
    allCellsInRange() {
        const cells = [];
        if (!this._isValidCell(this.startCell) || !this._isValidCell(this.endCell)) {
            console.warn("Cannot list cells for an invalid range.");
            return cells;
        }

        const startColIndex = this._columnLettersToIndex(this._getColumnLetters(this.startCell));
        const startRow = this._getRowNumber(this.startCell);
        const endColIndex = this._columnLettersToIndex(this._getColumnLetters(this.endCell));
        const endRow = this._getRowNumber(this.endCell);

        // Iterate through columns
        for (let colIndex = startColIndex; colIndex <= endColIndex; colIndex++) {
            const columnLetters = this._columnIndexToLetters(colIndex);
            // Iterate through rows
            for (let row = startRow; row <= endRow; row++) {
                cells.push(`${columnLetters}${row}`);
            }
        }

        // add the freeCells
        if(this.freeCells) {
            for(let cc in this.freeCells) {
                cells.push(cc)
            }
        }

        return cells;
    }

    setNewEndCell(endCell) {
		// Basic validation to ensure inputs are strings
        if (typeof endCell !== 'string') {
            console.error("Error: endCell must be strings.");
            return;
        }

        this.originalEndCell = endCell.toUpperCase();  // Convert to uppercase for consistency
        this.endCell = endCell.toUpperCase();          // Convert to uppercase for consistency

        this.startCell = this.originalStartCell;  // reverting startCell to the original one

        // Optional: More robust validation could be added here,
        // e.g., checking if the cell format is valid (e.g., "A1", "B10")
        // and if start cell is before or equal to end cell.
        if (!this._isValidCell(this.endCell)) {
            console.error("Error: Invalid endcell format detected. Please use formats like 'A1', 'B10'.");
            this.endCell = "A1";
        } 

        let mincell = minCell(this.startCell, this.endCell);
        let maxcell = maxCell(this.startCell, this.endCell);
        this.startCell = mincell;
        this.endCell = maxcell;
    }

    getOriginalStartCell() {
    	return this.originalStartCell;
    }

    getEndColumn() {
        return _getColumnLetters(this.endCell);
    }

    // add or removes a cell from freeCells object
    toggleFreeCell(cell) {
        if (!this._isValidCell(cell)) {
            console.error("Error: toggleFreeCell: Invalid cell format requested. Please use formats like 'A1', 'B10'.");
            return;
        } 

        if(!this.freeCells)
            this.freeCells = {};

        if(cell in this.freeCells) {
            delete this.freeCells[cell];
        } else {
            this.freeCells[cell] = true;
        }

        return cell;
    }
}
// --- Demonstrating the CellRange class ---


// global functions for the ranges

// clear the range (global newSelectedRange)
function clearSelectedCells() {
    consolelog('clearSelectedCells');
    if(newSelectedRange) {
        unColorTheCells(newSelectedRange.allCellsInRange(), 'c-range');
    }
    newSelectedRange = null;

    $$('id-fastresults').innerHTML = '';
}

// set range range (global newSelectedRange)
function setSelectedCells(startCell, endCell) {
    consolelog('setSelectedCells: ' + startCell + ':' + endCell);

    if(newSelectedRange) {
        unColorTheCells(newSelectedRange.allCellsInRange(), 'c-range');
    }

    newSelectedRange = new CellRange(startCell, endCell); // global parameter
    $$('id-fastresults').innerHTML = colorTheCells(newSelectedRange.allCellsInRange(), 'c-range');

    return newSelectedRange;
}


function colorTheCells(cells, className) {
    let sum = 0;
    for(let i in cells) {
        let e = $$(`id-${cells[i]}`);
        e.classList.add(className);
        if(e.innerHTML != '') {
            sum += parseFloat(e.innerHTML);
        }
    }
    return sum;
}

function unColorTheCells(cells, className) {
    for(let i in cells) {
        $$(`id-${cells[i]}`).classList.remove(className);
    }
}


// parse the text from the clipboard and seperate it with \t (cells) and \n (lines)
// returns array of items like ["bingo", "\t", "noon", "\t", "yaakov", "\n", "misha"]
function parsePaste(text) {
    let a = [];
    let lines = text.split("\n");
    for(let l in lines) {
        let items = lines[l].split("\t");
        for(let i in items) {
            a.push(items[i]);
            a.push("\t");
        }
        a.push("\n");
    }

    return a;
}