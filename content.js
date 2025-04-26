// Function to solve the equation
function solveEquation(num1, operator, num2) {
    switch(operator) {
        case '+': return num1 + num2;
        case '-': return num1 - num2;
        case '*': return num1 * num2;
        case '/': return num1 / num2;
        default: return null;
    }
}

// Function to tokenize a string expression into an array
function tokenizeExpression(expr) {
    // Add spaces around operators and brackets
    expr = expr.replace(/([+\-*/()=])/g, ' $1 ').trim();
    // Split by spaces and filter out empty strings
    return expr.split(/\s+/).filter(token => token !== '');
}

// Function to evaluate expressions with brackets
function evaluateExpression(elements) {
    // Convert elements array to expression array
    let expression = [];
    
    // Check if it's a single div containing the full expression
    if (elements.length === 3 && elements[0].textContent.includes('(')) {
        // It's a single div containing the full expression
        expression = tokenizeExpression(elements[0].textContent);
    } else {
        // Multiple divs, each containing part of the expression
        for (let i = 0; i < elements.length; i++) {
            const text = elements[i].textContent.trim();
            if (text !== '=' && !elements[i].querySelector('input')) {
                // Check if this element contains a complex expression
                if (text.includes('(') || text.includes(')') || 
                    text.includes('+') || text.includes('-') || 
                    text.includes('*') || text.includes('/')) {
                    // Tokenize the complex expression
                    expression.push(...tokenizeExpression(text));
                } else {
                    expression.push(text);
                }
            }
        }
    }

    // Process brackets first
    while (expression.includes('(') || expression.includes(')')) {
        let openIndex = expression.lastIndexOf('(');
        if (openIndex !== -1) {
            let closeIndex = expression.indexOf(')', openIndex);
            if (closeIndex !== -1) {
                // Extract the sub-expression within brackets
                let subExpression = expression.slice(openIndex + 1, closeIndex);
                // Calculate the result of the sub-expression
                let result = evaluateSimpleExpression(subExpression);
                // Replace the bracketed expression with its result
                expression.splice(openIndex, closeIndex - openIndex + 1, result.toString());
            }
        }
    }

    // After all brackets are resolved, evaluate the remaining expression
    return evaluateSimpleExpression(expression);
}

// Function to evaluate a simple expression without brackets
function evaluateSimpleExpression(expression) {
    // Handle negative numbers at the start of expression or after operators
    for (let i = 0; i < expression.length; i++) {
        if (expression[i] === '-' && (i === 0 || /[+\-*/]/.test(expression[i-1]))) {
            // Combine negative sign with number
            expression.splice(i, 2, (-parseFloat(expression[i+1])).toString());
        }
    }

    // First handle multiplication and division
    while (expression.includes('*') || expression.includes('/')) {
        let mulIndex = expression.indexOf('*');
        let divIndex = expression.indexOf('/');
        let index;
        
        if (mulIndex === -1) index = divIndex;
        else if (divIndex === -1) index = mulIndex;
        else index = Math.min(mulIndex, divIndex);
        
        if (index !== -1) {
            let num1 = parseFloat(expression[index - 1]);
            let num2 = parseFloat(expression[index + 1]);
            let result = solveEquation(num1, expression[index], num2);
            expression.splice(index - 1, 3, result.toString());
        }
    }
    
    // Then handle addition and subtraction
    while (expression.length > 1) {
        let num1 = parseFloat(expression[0]);
        let operator = expression[1];
        let num2 = parseFloat(expression[2]);
        let result = solveEquation(num1, operator, num2);
        expression.splice(0, 3, result.toString());
    }
    
    return parseFloat(expression[0]);
}

// Variable to track if we're currently solving a problem
let isSolving = false;
let lastEquation = '';
let solverEnabled = true; // Default enabled state
let solveSpeed = 8000; // Default speed
let solveInterval;

// Function to parse and solve the current problem
function solveProblem() {
    // Check if solver is enabled
    if (!solverEnabled) {
        return;
    }

    // Get the equation container
    const equationContainer = document.querySelector('.flex.flex-row.space-x-2.items-center.text-4xl.md\\:text-6xl.text-cream.py-10');
    
    if (equationContainer && !isSolving) {
        // Get all div elements within the container
        const divs = Array.from(equationContainer.children).filter(el => el.textContent.trim() !== '');
        
        // Create current equation string to check if it's new
        const currentEquation = divs.map(div => div.textContent.trim()).join('');
        
        // If it's a new equation
        if (currentEquation !== lastEquation && currentEquation.includes('=')) {
            isSolving = true;
            lastEquation = currentEquation;
            
            const result = evaluateExpression(divs);
            const input = equationContainer.querySelector('input[type="number"]');
            
            if (input && !isNaN(result)) {
                // Calculate delays based on solveSpeed
                const delay1 = Math.max(100, solveSpeed - 200); // Ensure at least 100ms
                const delay2 = 200; // Fixed 200ms for input and enter

                // Wait before showing the result
                setTimeout(() => {
                    input.value = result;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Wait before pressing enter
                    setTimeout(() => {
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        });
                        input.dispatchEvent(enterEvent);
                        isSolving = false;
                    }, delay2);
                }, delay1);
            } else {
                // If calculation fails or input not found, reset state
                isSolving = false;
            }
        }
    }
}

// Start solving problems function
function startSolving() {
    // Clear existing interval if any
    if (solveInterval) {
        clearInterval(solveInterval);
    }
    // Check for new problems every 500ms
    solveInterval = setInterval(solveProblem, 500);
}

// Stop solving problems function
function stopSolving() {
    if (solveInterval) {
        clearInterval(solveInterval);
        solveInterval = null;
    }
}

// Load settings and start/stop solver accordingly
function initializeSolver() {
    chrome.storage.local.get(['solverEnabled', 'solveSpeed'], function(result) {
        solverEnabled = result.solverEnabled !== undefined ? result.solverEnabled : true;
        solveSpeed = result.solveSpeed !== undefined ? result.solveSpeed : 8000;
        
        if (solverEnabled) {
            startSolving();
        } else {
            stopSolving();
        }
    });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.solverEnabled !== undefined) {
            solverEnabled = request.solverEnabled;
            if (solverEnabled) {
                startSolving();
            } else {
                stopSolving();
            }
        }
        if (request.solveSpeed !== undefined) {
            solveSpeed = request.solveSpeed;
        }
        // Send response to acknowledge receipt (optional)
        sendResponse({status: "Settings updated"}); 
        return true; // Indicates you wish to send a response asynchronously
    }
);

// Initialize the solver when the script loads
initializeSolver(); 