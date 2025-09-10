// calculate.js

// run over all the cells in the sheet and calculate them if needed
// update the data on the DOM
function calculateAll(sheetData) {
    for(let cell in sheetData.cells) {
        let dc = $$(`id-${cell}`); // DOM cell
        
        if(!dc) {
            console.log('calculateAll unknown cell:' + cell);
            continue;
        }
        
        let val = sheetData.cells[cell];
        if(val.length > 0 && val[0] === '=') {
            try {
                dc.innerHTML = calculateCellValue(cell, []);
            } catch(e) {
                dc.innerHTML = e.message;
            }
        }
    }
}

// gets a cell text with formula and calculate it (global sheetData)
// e.g. =5+2/2 or =A5+A7-2 or =SUM(A3:B7) or 5/5 without the =
// returns the results of the calculation
// text - a text containing a formula (e.g. =B5+3 or just C7/2)
// cell - is the current cell coordinate we work on
// cellsStack is and array with cell coordinates adding each recursive call to prevent circular references
// This function throws Error exception
function calculateCellValue(cell, cellsStack) {
    consolelog(`calculateCellValue: ${cell}`);
    if (cellsStack.length > 20) {
        throw new Error(`#ERROR: no more than 20 recursive ${cell}`);
    }

    // if (cellsStack.indexOf(cell) >= 0) {
    //     throw new Error(`#ERROR: circular reference ${cell}`);
    // }

    let text = sheetData.cells[cell];

    if(!text)
        return 0;

	if(text.length === 0)
		return text;
	
    // get rid of the '='
    if(text[0] === '=')
		text = text.substring(1); 

    cellsStack.push(cell);

    // rebuild the formula with values
    // replace cells indicators like A5 with their value
    const tokens = splitter(text, ['+', '-', '*', '/', '%', '^']);
    let formula = '';
    for(let i in tokens) {
        let token = tokens[i].trim();

        switch(whatIsThisToken(token)) {
            case 'function':
                    token = calculateFunction(token, cellsStack);
                    break;
            case 'cell':
                    token = (token in sheetData.cells) ? calculateCellValue(token, cellsStack) : 0; // recursive
                    break;
            case 'number':
            case 'string':
            case null:
            default:
                break;
        }

        formula += token;
    }
    consolelog(`calculateCellValue formula(${cell}): ` + formula);

    try {
	   return evaluateMathFormula(formula);
    } catch(e) {
        throw new Error(`#ERROR evaluateMathFormula: ` + e);
    }
}

// get's a token and returns the token + what is it
// e.g. '56' is a number, 'Tokyo' is text, also Tokyo is text, A7 is a cell indicator, SUM() is a function
// null - means I don't know what it is and i don't care
// number - means it is a number
// string - means it is a string
// cell - means it is a cell coordinates
// function - means it is a function
function whatIsThisToken(token) {
    token = token.toUpperCase(); // and convert to string

    // if it's something else (not a number or a letter)
    if(!(token[0] >= '0' && token[0] <= '9') && !(token[0] >= 'A' && token[0] <= 'Z')) {
        return null;
    }

    // if it is a number // TODO: check that it's really just digits for number
    if(token[0] >= '0' && token[0] <= '9') {
        return 'number';
    }

    // function
    if(token.includes('(') && token[0] >= 'A' && token[0] <= 'Z') {
        return 'function';
    }
    // find the cell indicator
    // let chars = '';
    // let nums  = '';
    // for(let i = 0; i < token.length; i++) {
    //     if(token[i] >= 'A' && token[i] <= 'Z' && nums === '') {
    //         chars += token[i];
    //     } else if(token[i] >='0' && token[i] <= '9' && chars.length > 0) {
    //         nums += token[i];
    //     }
    // }

    // let cell = chars + nums;
    return 'cell';
}

// function get a regular formula such as 5+5-(4/3)*8
// returns the results
function evaluateMathFormula(formula) {
    // --- Step 1: Tokenization ---
    // This regular expression captures numbers (integers and floats),
    // operators (+, -, *, /, ^, %), and parentheses.
    // It also handles negative numbers at the beginning or after an opening parenthesis.
    const tokens = formula.match(/(\d+\.?\d*|\.\d+|[-+*/%^()]|\s+)/g)
                          .filter(token => token.trim() !== ''); // Remove whitespace tokens

    if (!tokens) {
        throw new Error("Invalid formula: No recognizable tokens.");
    }

    // --- Step 2: Shunting-Yard Algorithm (Infix to RPN Conversion) ---
    const outputQueue = [];
    const operatorStack = [];
    const precedence = {
        '+': 1,
        '-': 1,
        '*': 2,
        '/': 2,
        '%': 2,
        '^': 3 // Exponentiation usually has higher precedence, and is right-associative
    };

    // Helper to check if a token is an operator
    const isOperator = (token) => precedence.hasOwnProperty(token);

    // Helper to check if a token is a number
    const isNumber = (token) => !isNaN(parseFloat(token)) && isFinite(token);

    // Helper to check operator associativity (for exponentiation)
    const isRightAssociative = (op) => op === '^';

    // Handle unary minus: if '-' is at the start or after '(', treat it as part of a number
    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];

        if (token === '-' && (i === 0 || tokens[i - 1] === '(')) {
            // Check if the next token is a number
            if (isNumber(tokens[i + 1])) {
                tokens[i] = '-' + tokens[i + 1]; // Combine '-' with the next number
                tokens.splice(i + 1, 1); // Remove the next number token
            } else {
                throw new Error("Invalid formula: Unary minus must be followed by a number.");
            }
        }
    }


    for (const token of tokens) {
        if (isNumber(token)) {
            outputQueue.push(parseFloat(token)); // Push numbers directly to the output queue
        } else if (isOperator(token)) {
            while (
                operatorStack.length > 0 &&
                isOperator(operatorStack[operatorStack.length - 1]) &&
                ((!isRightAssociative(token) && precedence[token] <= precedence[operatorStack[operatorStack.length - 1]]) ||
                 (isRightAssociative(token) && precedence[token] < precedence[operatorStack[operatorStack.length - 1]]))
            ) {
                outputQueue.push(operatorStack.pop());
            }
            operatorStack.push(token);
        } else if (token === '(') {
            operatorStack.push(token);
        } else if (token === ')') {
            while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
                outputQueue.push(operatorStack.pop());
            }
            if (operatorStack.length === 0 || operatorStack[operatorStack.length - 1] !== '(') {
                throw new Error("Mismatched parentheses: No matching opening parenthesis.");
            }
            operatorStack.pop(); // Pop the '('
        } else {
            throw new Error(`Invalid token: ${token}`);
        }
    }

    // Pop any remaining operators from the stack to the output queue
    while (operatorStack.length > 0) {
        const op = operatorStack.pop();
        if (op === '(' || op === ')') {
            throw new Error("Mismatched parentheses: Unclosed parenthesis.");
        }
        outputQueue.push(op);
    }

    // --- Step 3: Evaluate RPN (Reverse Polish Notation) ---
    const evaluationStack = [];

    for (const token of outputQueue) {
        if (isNumber(token)) {
            evaluationStack.push(token);
        } else if (isOperator(token)) {
            if (evaluationStack.length < 2) {
                throw new Error(`Insufficient operands for operator: ${token}`);
            }
            const operand2 = evaluationStack.pop();
            const operand1 = evaluationStack.pop();
            let result;

            switch (token) {
                case '+': result = operand1 + operand2; break;
                case '-': result = operand1 - operand2; break;
                case '*': result = operand1 * operand2; break;
                case '/':
                    if (operand2 === 0) throw new Error("Division by zero.");
                    result = operand1 / operand2;
                    break;
                case '%': result = operand1 % operand2; break;
                case '^': result = Math.pow(operand1, operand2); break;
                default: throw new Error(`Unknown operator: ${token}`);
            }
            evaluationStack.push(result);
        }
    }

    if (evaluationStack.length !== 1) {
        throw new Error("Invalid formula: Unable to fully evaluate expression.");
    }

    return evaluationStack.pop();
}

// returns the result calculation of the function
// this is a recursive function that calls again to calculateCellValue
// cell - is a string of the cell, e.g. A7
// token - is the content of the cell or part of the content
// cellsStack - array of all cells in recursive calls to avoid curcular refernce
function calculateFunction(token, cellsStack) {
    const parsedF = parseFunction(token);

    if(typeof parsedF === 'string') {
        return parsedF;
    }

    if(token.startsWith("SUM(")) {
        return functionSUM(parsedF.parameters, cellsStack);
    }

    if(token.startsWith("AVG(")) {
        return functionAVG(parsedF.parameters, cellsStack);
    }

    return '#ERROR - calculateFunction: function not recognized';
}

// takes the function text like SUM(E1:E4, 7) or SUM(4,5,6) or SUM(E1,E2,E3)
// returns object with { name: 'SUM', parameters: [E1,E2,E3,E4]}
function parseFunction(token) {
    let firstB = token.indexOf('(');
    let lastB  = token[token.length - 1];

    if(firstB === -1 || lastB !== ')') {
        return "#ERROR - parseFunction: no a valid function";
    }

    let data = token.substring(firstB+1, token.length-1);
    let parameters = data.split(','); // TODO: notice - when we split with comma, we might have another function inside or a string like "fsd,sdf" with comma - need to fix to have smarter parser

    return {name: data.substring(0, firstB), parameters: parameters};
}

// receives 'B4:C5' returns: [B4, B5, C4, C5]
function extractRangeParameter(token) {
    // sanity check - is it a range? - if not we return the same token we got
    if(!token.includes(':')) {
        return token;
    }

    let parts = token.split(':');
    return getAllCellsInRange(parts[0], parts[1]);
}

// calculate the SUM of parameters array e.g. ['C4', 'B5', 'E3:F6']
function functionSUM(parameters, cellsStack) {
    let v = 0;

    // if(cellsStack.indexOf(cell) >= 0)
    //     throw new Error(`#ERROR functionSUM: circular reference ${cell}`);

    for(let i in parameters) {
        let cells = extractRangeParameter(parameters[i]);
        if(Array.isArray(cells)) {
            v += functionSUM(cells, cellsStack);
        } else {
            v += calculateCellValue(parameters[i], cellsStack);
        }
    }

    return v;
}

// calculate the AVG of parameters array e.g. ['C4', 'B5', 'E3:F6']
function functionAVG(parameters, cellsStack) {
    let v = 0;
    let count = 0;
    for(let i in parameters) {
        let cells = extractRangeParameter(parameters[i]);
        if(Array.isArray(cells)) {
            count += cells.length;
            v += functionSUM(cells, cellsStack);
        } else {
            count++;
            v += calculateCellValue(parameters[i], cellsStack);
        }
    }

    if(count == 0)
        return 0;

    return v/count;
}
