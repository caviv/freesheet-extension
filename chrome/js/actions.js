// actions.js

// bold or unbold cells
function bold(cells, bold) {
    for(let c in cells) {
        let cell = cells[c];
        $$(`id-${cell}`).style.fontWeight = bold ? 'bold' : '';
        let cellStyles = getStyleObject(cell);
        if(bold)
            cellStyles.fontWeight = 'bold';
        else
            delete cellStyles.fontWeight;

        if(Object.keys(cellStyles).length === 0)
            delete sheetData.cellsStyles[cell];
    }
}

// nowrap or normal cells
// notice: nowrap is the cell default
function wrap(cells, wrap) {
    for(let c in cells) {
        let cell = cells[c];
        $$(`id-${cell}`).style.whiteSpace = wrap ? 'normal' : '';
        let cellStyles = getStyleObject(cell);
        if(wrap)
            cellStyles.whiteSpace = 'normal';
        else
            delete cellStyles.whiteSpace;

        if(Object.keys(cellStyles).length === 0)
            delete sheetData.cellsStyles[cell];
    }    

}