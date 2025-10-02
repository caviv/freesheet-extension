// cells.js

// convert from number to letter 3 will be C
function getColumnLetter(colIndex) {
    let letter = '';
    let tempColIndex = colIndex;
    while (tempColIndex >= 0) {
        letter = String.fromCharCode(65 + (tempColIndex % 26)) + letter;
        tempColIndex = Math.floor(tempColIndex / 26) - 1;
    }
    return letter;
}

// get a range of cells like 'B4' to 'C5' and 
// returns array of all cells inside: ['B4', 'B5', 'C4', 'C5']
// maximum 200 cells
function getAllCellsInRange(start, end) {
    let min = minCell(start, end);
    let max = maxCell(start, end);

//    consolelog('getAllCellsInRange start:' + start + ' end:' + end + ' min:' + min + ' max:' + max);

    let a = [min];
    let c = nextCell(min, min, max);
    while(c) {
        a.push(c);
        c = nextCell(c, min, max);
        if(a.length > 200) {
            return '#ERROR - getAllCellsInRange: maximum of 200 cells reached';
        }
    }

    return a;
}

// iterator: used for building a range of cells
// gets the current cell e.g. 'B5' and the end cell e.g. 'C5'
// and returns the next cell in matrix (in this case 'C4') - returns null when it reached the last one
function nextCell(current, start, end) {
    if(current == end) {
        return null;
    }

    let c = cellToXY(current);
    let s = cellToXY(start);
    let e = cellToXY(end);

    if(c.x < e.x) {
        c.x++;
    } else if (c.x == e.x && c.y < e.y) {
        c.x = s.x;
        c.y++;
    } 

    return xyToCell(c.x, c.y);
}


// find the minimum cell of a square (the upper-left corner)
function minCell(start, end) {
    let s = cellToXY(start);
    let e = cellToXY(end);

    let minx = (s.x < e.x) ? s.x : e.x;
    let miny = (s.y < e.y) ? s.y : e.y;

    return xyToCell(minx, miny);
}

// find the maximum cell of a square (the bottom-right corner)
function maxCell(start, end) {
    let s = cellToXY(start);
    let e = cellToXY(end);

    let maxx = (s.x > e.x) ? s.x : e.x;
    let maxy = (s.y > e.y) ? s.y : e.y;

    return xyToCell(maxx, maxy);
}


// get a cell text like 'C5' and returns coordinates {n: 'C', x: 3, y: 5}
function cellToXY(cell) {
    let n = cell[0];
    let x = cell.charCodeAt(0) - 65;
    let y = parseInt(cell.substring(1));
    return {
        n: n, // 'C'
        x: x, // 3
        y: y  // 5
    }
}

// get coordinates like 3, 5 and returns cell: 'C5'
function xyToCell(x, y) {
    return getColumnLetter(x) + y;
}

// finds cell around - used for arrows keys moving currentCell

// gets a cell 'C5' and returns the upper cell 'C4'
function upCell(cell) {
    let c = cellToXY(cell);
    c.y--;
    if(c.y < 1)
        c.y = 1;
    return xyToCell(c.x, c.y);
}

// returns the cell on below from the 'cell' or the same cell if reached boundry
function downCell(cell) {
    let c = cellToXY(cell);
    c.y++;
    if(c.y > NUM_ROWS)
        c.y = NUM_ROWS;
    return xyToCell(c.x, c.y);
}

// returns the cell on the left from the 'cell' or the same cell if reached boundry
function leftCell(cell) {
    let c = cellToXY(cell);
    c.x--;
    if(c.x < 0)
        c.x = 0;
    return xyToCell(c.x, c.y);
}

// returns the cell on the right from the 'cell' or the same cell if reached boundry
function rightCell(cell) {
    let c = cellToXY(cell);
    c.x++;
    if(c.x > NUM_COLS - 1)
        c.x = NUM_COLS - 1;
    return xyToCell(c.x, c.y);
}


// takes text of cell and clean it from extra <br> at the end and trims it
function clearCellRubbish(text) {
    if(text.length >= 4) {
        if(text.substring(text.length - 4) === '<br>') {
            text = text.substring(0, text.length - 4);
        }
    }

    return text.trim();
}

// editable element - set in focus and put the cursor for editing at the end
function focusAndPlaceCursorAtEnd(element, v) {
    if (!element) {
        console.error('Element with ID "' + elementId + '" not found.');
        return;
    }

    if(v)
        element.innerHTML = v;

    // 1. Set focus on the element
    element.focus();

    // 2. Create a new Range object
    const range = document.createRange();
    // 3. Get the current Selection object
    const selection = window.getSelection();

    // Check if the element has child nodes (text nodes or other elements)
    if (element.childNodes.length > 0) {
        // If there's content, set the range to the end of the last child node
        const lastChild = element.childNodes[element.childNodes.length - 1];

        // If the last child is a text node, set the cursor at its end
        if (lastChild.nodeType === Node.TEXT_NODE) {
            range.setStart(lastChild, lastChild.length);
        } else {
            // If the last child is another element (e.g., <div>, <br>),
            // set the cursor just after that element within the parent.
            range.setStartAfter(lastChild);
        }
        range.collapse(true); // Collapse the range to its start point (which is now the end)
    } else {
        // If the element is empty, set the range inside the element itself
        range.selectNodeContents(element);
        range.collapse(false); // Collapse to the end of the selected contents (which is empty)
    }


    // 4. Clear any existing selections
    selection.removeAllRanges();
    // 5. Add the new range to the selection
    selection.addRange(range);
}

// get the cell element and make it editable (DOM)
function makeCellEditable(e, keycode) {
    e.contentEditable = "true";
    if(e.title.length > 0)
        e.innerHTML = e.title;
    
    // should we start a formula selecting
    if(e.innerHTML.startsWith('=') && !selectingFormula) {
        consolelog('makeCellEditable formulaRange starting');
        e.originalText = e.innerHTML; // save the original text we had
        selectingFormula = e; // global
    } else if (!e.innerHTML.startsWith('=') && selectingFormula) {
        consolelog('makeCellEditable formulaRange eding');
        selectingFormula = null; // global
    }

    focusAndPlaceCursorAtEnd(e, keycode);
}
