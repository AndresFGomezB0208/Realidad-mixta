const inputs = {
    a: document.getElementById('input-a'),
    b: document.getElementById('input-b'),
    c: document.getElementById('input-c')
};
const vals = {
    a: document.getElementById('val-a'),
    b: document.getElementById('val-b'),
    c: document.getElementById('val-c')
};
const outputLight = document.getElementById('output-light');
const outputVal = document.getElementById('output-val');
const box = document.querySelector('.box');
const truthTableBody = document.getElementById('table-body');
const truthTableHeader = document.getElementById('table-header');
const modeTitle = document.getElementById('mode-title');
const containerC = document.getElementById('container-c');
const diagramContainer = document.getElementById('active-diagram-container');
const victoryMessage = document.getElementById('victory-message');
const nextLevelBtn = document.getElementById('next-level-btn');

let appMode = 'LEARNING'; // 'LEARNING' or 'GAME'
let currentGate = 'AND';
let gameDifficulty = 'easy';
let gameCircuit = null; // Object holding the generated circuit
let revealedRows = new Set(); // For game mode

const gates = {
    AND: (a, b) => a && b,
    OR: (a, b) => a || b,
    NOT: (a) => !a,
    NAND: (a, b) => !(a && b),
    NOR: (a, b) => !(a || b),
    XOR: (a, b) => !!(a ^ b)
};

const explanations = {
    AND: "La salida es 1 solo si **todas** las entradas son 1.",
    OR: "La salida es 1 si **al menos una** entrada es 1.",
    NOT: "La salida es el **inverso** de la entrada. (Solo usa A)",
    NAND: "Es lo opuesto a AND. Salida 0 solo si todas son 1.",
    NOR: "Es lo opuesto a OR. Salida 1 solo si todas son 0.",
    XOR: "Salida 1 si las entradas son **diferentes**.",
    CIRCUIT: "Circuito: (A AND B) AND (NOT C). Salida 1 solo si A=1, B=1, y C=0."
};

// --- Diagrams ---
function getDiagram(gate) {
    if (gate === 'AND') return `A ----|\n      AND )---- SALIDA\nB ----|`;
    if (gate === 'OR') return `A ----\\\n       OR )---- SALIDA\nB ----/`;
    if (gate === 'NOT') return `A ----|>o---- SALIDA`;
    if (gate === 'NAND') return `A ----|\n      AND )o---- SALIDA\nB ----|`;
    if (gate === 'NOR') return `A ----\\\n       OR )o---- SALIDA\nB ----/`;
    if (gate === 'XOR') return `A ----)\n      XOR )---- SALIDA\nB ----)`;
    if (gate === 'CIRCUIT') return `A ---| AND |---\nB ---|     |   |\n               AND )--- SALIDA\nC ---|>o NOT --|`;
    return "";
}

// --- Circuit Generator (Game Mode) ---
function generateRandomCircuit(difficulty) {
    let numGates;
    if (difficulty === 'easy') numGates = 2; // Fixed 2 gates
    else if (difficulty === 'normal') numGates = 3; // Fixed 3 gates
    else numGates = Math.floor(Math.random() * 5) + 4; // 4 to 8 gates

    const availableGates = Object.keys(gates).filter(g => g !== 'NOT'); // Simplify for now, handle NOT carefully

    // Attempt to generate a valid circuit (exactly ONE solution)
    let attempts = 0;
    while (attempts < 100) {
        // Create tree structure
        // Simple linear/tree generation: 
        // We will create a list of "nodes". Initial nodes are Inputs A, B, C.
        // We pick 2 nodes, combine them with a gate -> new Node. Repeat until 1 node left.

        let nodes = [{ id: 'A', type: 'input' }, { id: 'B', type: 'input' }, { id: 'C', type: 'input' }];
        let operations = [];

        for (let i = 0; i < numGates; i++) {
            if (nodes.length < 2) break;

            // Pick 2 random nodes
            const idx1 = Math.floor(Math.random() * nodes.length);
            const node1 = nodes.splice(idx1, 1)[0];
            const idx2 = Math.floor(Math.random() * nodes.length);
            const node2 = nodes.splice(idx2, 1)[0];

            const gateType = availableGates[Math.floor(Math.random() * availableGates.length)];

            const newNode = {
                id: `G${i}`,
                type: 'gate',
                op: gateType,
                inputs: [node1, node2]
            };
            nodes.push(newNode);
            operations.push(newNode);
        }

        // The last node is the output
        const root = nodes[0];

        // Validate: Calculate Truth Table
        let solutionCount = 0;
        let lastSolution = null;

        for (let a = 0; a < 2; a++) {
            for (let b = 0; b < 2; b++) {
                for (let c = 0; c < 2; c++) {
                    const res = evaluateCircuit(root, a, b, c);
                    if (res) {
                        solutionCount++;
                        lastSolution = { a, b, c };
                    }
                }
            }
        }

        if (solutionCount === 1) {
            // Found a valid circuit!
            return { root, operations, solution: lastSolution, difficulty };
        }
        attempts++;
    }
    // Fallback if fails (should be rare with 3 inputs)
    return generateRandomCircuit('easy');
}

function evaluateCircuit(node, a, b, c) {
    if (node.type === 'input') {
        if (node.id === 'A') return a;
        if (node.id === 'B') return b;
        if (node.id === 'C') return c;
    }
    const val1 = evaluateCircuit(node.inputs[0], a, b, c);
    const val2 = evaluateCircuit(node.inputs[1], a, b, c);

    // We only selected binary gates in generator to simplify
    const fn = gates[node.op];
    return fn(val1 ? 1 : 0, val2 ? 1 : 0) ? 1 : 0;
}

function renderCircuitDiagram(circuit) {
    // Generate a simple text representation
    // Recursive print
    let lines = [];

    function printNode(node, level) {
        if (node.type === 'input') return node.id;
        const left = printNode(node.inputs[0], level + 1);
        const right = printNode(node.inputs[1], level + 1);
        return `(${left} ${node.op} ${right})`;
    }

    let text = printNode(circuit.root, 0);
    // Format nicer:
    text = "OBJETIVO: Lograr Salida 1\n\n" + text.replace(/\(/g, '[').replace(/\)/g, ']');

    // If difficult, maybe show just the operations list?
    if (circuit.difficulty === 'hard') {
        text = "OBJETIVO: Lograr Salida 1\n\nCONEXIONES:\n";
        circuit.operations.forEach((op, i) => {
            const in1 = op.inputs[0].id.startsWith('G') ? `Gate${op.inputs[0].id.substring(1)}` : op.inputs[0].id;
            const in2 = op.inputs[1].id.startsWith('G') ? `Gate${op.inputs[1].id.substring(1)}` : op.inputs[1].id;
            text += `Paso ${i + 1}: ${in1} ${op.op} ${in2} -> Gate${i}\n`;
        });
        text += "Salida Final: Gate" + (circuit.operations.length - 1);
    }

    return text;
}


// --- Main Logic ---

function setMode(mode, subType) {
    appMode = mode;

    // Reset UI
    victoryMessage.classList.add('hidden');
    nextLevelBtn.classList.add('hidden');
    containerC.style.display = 'none'; // Default hide
    inputs.b.disabled = false;
    inputs.b.parentElement.parentElement.style.opacity = '1';

    const navGates = document.getElementById('nav-gates');
    const navCircuit = document.getElementById('nav-circuit');
    const navGame = document.getElementById('nav-game');

    // Reset all nav buttons
    navGates.classList.remove('active-mode');
    navCircuit.classList.remove('active-mode');
    navGame.classList.remove('active-mode');

    if (mode === 'LEARNING') {
        currentGate = subType;

        if (currentGate === 'CIRCUIT') {
            navCircuit.classList.add('active-mode');
        } else {
            navGates.classList.add('active-mode');
        }

        modeTitle.textContent = `Modo Aprendizaje: ${currentGate}`;

        // Show Diagram
        diagramContainer.classList.remove('hidden');
        diagramContainer.innerHTML = getDiagram(currentGate);

        // Show Inputs appropriately
        if (currentGate === 'CIRCUIT') containerC.style.display = 'flex';
        if (currentGate === 'NOT') {
            inputs.b.disabled = true;
            inputs.b.parentElement.parentElement.style.opacity = '0.3';
        }

    } else if (mode === 'GAME') {
        gameDifficulty = subType;
        navGame.classList.add('active-mode');
        modeTitle.textContent = `Desafío: ${gameDifficulty.toUpperCase()}`;

        // Generate Level
        gameCircuit = generateRandomCircuit(gameDifficulty);
        revealedRows.clear();

        // Show Inputs (Always 3 for game to make it harder/consistent)
        containerC.style.display = 'flex';

        // Show Diagram
        diagramContainer.classList.remove('hidden');
        diagramContainer.textContent = renderCircuitDiagram(gameCircuit);
    }

    update();
}

function update() {
    const a = inputs.a.checked ? 1 : 0;
    const b = inputs.b.checked ? 1 : 0;
    const c = inputs.c.checked ? 1 : 0;

    // UI Update visual values
    vals.a.textContent = a;
    vals.b.textContent = b;
    vals.c.textContent = c;

    let out = 0;

    if (appMode === 'LEARNING') {
        if (currentGate === 'NOT') out = gates['NOT'](a) ? 1 : 0;
        else if (currentGate === 'CIRCUIT') out = ((a && b) && !c) ? 1 : 0; // Hardcoded specific circuit
        else out = gates[currentGate](a, b) ? 1 : 0;

        updateTruthTableLearning(a, b, c);

    } else if (appMode === 'GAME') {
        out = evaluateCircuit(gameCircuit.root, a, b, c);

        // Game Logic: Reveal Row
        // 0-7 index for 3 bits:
        const idx = (a << 2) | (b << 1) | c;
        revealedRows.add(idx);

        // Check Victory
        if (out === 1) {
            victoryMessage.classList.remove('hidden');
            nextLevelBtn.classList.remove('hidden');
        }

        updateTruthTableGame(a, b, c);
    }

    const statusPanel = document.getElementById('status-panel');

    // ... [existing code] ...

    // Output UI
    outputVal.textContent = out;
    if (out === 1) {
        outputLight.classList.add('on');
        box.classList.add('open');
        statusPanel.classList.add('move-up');
    } else {
        outputLight.classList.remove('on');
        box.classList.remove('open');
        statusPanel.classList.remove('move-up');
    }
}

function updateTruthTableLearning(currA, currB, currC) {
    truthTableBody.innerHTML = '';
    truthTableHeader.innerHTML = '';

    const headers = ['A'];
    if (currentGate !== 'NOT') headers.push('B');
    if (currentGate === 'CIRCUIT') headers.push('C');
    headers.push('Salida');

    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        truthTableHeader.appendChild(th);
    });

    const combinations = [];
    if (currentGate === 'NOT') combinations.push([0], [1]);
    else if (currentGate === 'CIRCUIT') {
        for (let i = 0; i < 2; i++)
            for (let j = 0; j < 2; j++)
                for (let k = 0; k < 2; k++)
                    combinations.push([i, j, k]);
    } else {
        combinations.push([0, 0], [0, 1], [1, 0], [1, 1]);
    }

    combinations.forEach(combo => {
        const row = document.createElement('tr');
        let res, match = false;

        if (currentGate === 'NOT') {
            res = gates['NOT'](combo[0]) ? 1 : 0;
            if (combo[0] === currA) match = true;
        } else if (currentGate === 'CIRCUIT') {
            res = ((combo[0] && combo[1]) && !combo[2]) ? 1 : 0;
            if (combo[0] === currA && combo[1] === currB && combo[2] === currC) match = true;
        } else {
            res = gates[currentGate](combo[0], combo[1]) ? 1 : 0;
            if (combo[0] === currA && combo[1] === currB) match = true;
        }

        if (match) row.classList.add('current-row');

        combo.forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            row.appendChild(td);
        });
        const tdOut = document.createElement('td');
        tdOut.textContent = res;
        row.appendChild(tdOut);
        truthTableBody.appendChild(row);
    });
}

function updateTruthTableGame(currA, currB, currC) {
    truthTableBody.innerHTML = '';
    truthTableHeader.innerHTML = '';

    // Headers always A, B, C, Out
    ['A', 'B', 'C', 'Salida'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        truthTableHeader.appendChild(th);
    });

    // All 8 combinations
    for (let i = 0; i < 8; i++) {
        // Extract bits
        const va = (i >> 2) & 1;
        const vb = (i >> 1) & 1;
        const vc = i & 1;

        const row = document.createElement('tr');

        // Is this the current input?
        if (va === currA && vb === currB && vc === currC) {
            row.classList.add('current-row');
        }

        // Is revealed?
        const isRevealed = revealedRows.has(i);

        [va, vb, vc].forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            row.appendChild(td);
        });

        const tdOut = document.createElement('td');
        if (isRevealed) {
            const val = evaluateCircuit(gameCircuit.root, va, vb, vc);
            tdOut.textContent = val;
            tdOut.classList.add('revealed-row');
        } else {
            tdOut.textContent = "?";
            tdOut.classList.add('blurred-text');
        }
        row.appendChild(tdOut);
        truthTableBody.appendChild(row);
    }
}

// Event Listeners
Object.values(inputs).forEach(inp => inp.addEventListener('change', update));

// Learning Mode Buttons
document.querySelectorAll('.gate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        setMode('LEARNING', e.target.getAttribute('data-gate'));
    });
});

// Game Mode Buttons
document.querySelectorAll('.game-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        setMode('GAME', e.target.getAttribute('data-difficulty'));
    });
});

nextLevelBtn.addEventListener('click', () => {
    setMode('GAME', gameDifficulty); // Restart same difficulty
});

// Initialize
setMode('LEARNING', 'AND');
