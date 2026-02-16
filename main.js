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

// --- SVG Diagrams ---
const gateColors = {
    AND: '#2ecc71', // Green
    OR: '#3498db',  // Blue
    NOT: '#e67e22', // Orange
    NAND: '#e74c3c', // Red
    NOR: '#e74c3c',  // Red
    XOR: '#9b59b6', // Purple
    INPUT: '#f1f1f1' // White
};

function drawGateHTML(type, x, y, inputs = [], scale = 1) {
    const color = gateColors[type] || '#fff';
    let path = '';

    // Standard shapes (approximate)
    if (type === 'AND' || type === 'NAND') {
        path = `M 0,0 V 40 H 20 A 20,20 0 0,0 20,0 H 0 Z`; // D shape
        // Adjust origin to center-left
        path = `M ${x},${y} v 40 h 20 a 20,20 0 0,0 20,-20 a 20,20 0 0,0 -20,-20 h -20 z`;
        // Better path:
        // Top-left at x,y. Height 40. Width 40.
        path = `M ${x},${y} L ${x + 25},${y} A 20,20 0 0,1 ${x + 25},${y + 40} L ${x},${y + 40} Z`;
    } else if (type === 'OR' || type === 'NOR') {
        path = `M ${x},${y} 
                Q ${x + 15},${y + 20} ${x},${y + 40} 
                Q ${x + 35},${y + 40} ${x + 50},${y + 20} 
                Q ${x + 35},${y} ${x},${y} Z`;
    } else if (type === 'NOT') {
        path = `M ${x},${y} L ${x + 30},${y + 20} L ${x},${y + 40} Z`; // Triangle
    } else if (type === 'XOR') {
        path = `M ${x - 5},${y} 
                Q ${x + 10},${y + 20} ${x - 5},${y + 40} 
                M ${x},${y} 
                Q ${x + 15},${y + 20} ${x},${y + 40} 
                Q ${x + 35},${y + 40} ${x + 50},${y + 20} 
                Q ${x + 35},${y} ${x},${y} Z`;
    }

    let bubble = '';
    let outX = x + 50; // Default output X
    if (type === 'AND') outX = x + 45;
    if (type === 'NOT') { outX = x + 30; }

    if (type === 'NAND' || type === 'NOR' || type === 'NOT') {
        bubble = `<circle cx="${outX + 5}" cy="${y + 20}" r="4" fill="none" stroke="${color}" stroke-width="2"/>`;
        outX += 10;
    }

    // Connections lines to inputs
    // Assuming inputs are standard 2 for most, 1 for NOT
    // This helper is for single gate view primarily

    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="3" />
            ${bubble}
            <text x="${x + 10}" y="${y - 10}" fill="${color}" font-family="monospace" font-weight="bold">${type}</text>`;
}

function getDiagram(gate) {
    const color = gateColors[gate];
    let content = '';

    // Fixed simple view for Learning Mode
    const w = 300, h = 150;
    const cx = 150, cy = 75;

    // Inputs at x=50, Gate at x=150, Output at x=250
    let paths = '';

    // Draw Gate
    // Center logic? simpler to hardcode per type for best look

    if (gate === 'AND') {
        paths = `<path d="M 120,55 L 145,55 A 25,25 0 0,1 145,105 L 120,105 Z" fill="none" stroke="${color}" stroke-width="4"/>
                 <line x1="80" y1="65" x2="120" y2="65" stroke="white" stroke-width="2"/>
                 <line x1="80" y1="95" x2="120" y2="95" stroke="white" stroke-width="2"/>
                 <line x1="170" y1="80" x2="220" y2="80" stroke="white" stroke-width="2"/>
                 <text x="60" y="70" fill="white">A</text>
                 <text x="60" y="100" fill="white">B</text>`;
    } else if (gate === 'OR') {
        paths = `<path d="M 120,55 Q 135,80 120,105 Q 160,105 180,80 Q 160,55 120,55 Z" fill="none" stroke="${color}" stroke-width="4"/>
                 <line x1="80" y1="65" x2="125" y2="65" stroke="white" stroke-width="2"/>
                 <line x1="80" y1="95" x2="125" y2="95" stroke="white" stroke-width="2"/>
                 <line x1="180" y1="80" x2="220" y2="80" stroke="white" stroke-width="2"/>
                 <text x="60" y="70" fill="white">A</text>
                 <text x="60" y="100" fill="white">B</text>`;
    } else if (gate === 'NOT') {
        paths = `<path d="M 130,55 L 130,105 L 170,80 Z" fill="none" stroke="${color}" stroke-width="4"/>
                 <circle cx="174" cy="80" r="4" fill="none" stroke="${color}" stroke-width="4"/>
                 <line x1="80" y1="80" x2="130" y2="80" stroke="white" stroke-width="2"/>
                 <line x1="178" y1="80" x2="220" y2="80" stroke="white" stroke-width="2"/>
                 <text x="60" y="85" fill="white">A</text>`;
    } else if (gate === 'NAND') {
        paths = `<path d="M 120,55 L 145,55 A 25,25 0 0,1 145,105 L 120,105 Z" fill="none" stroke="${color}" stroke-width="4"/>
                 <circle cx="174" cy="80" r="4" fill="none" stroke="${color}" stroke-width="4"/>
                 <line x1="80" y1="65" x2="120" y2="65" stroke="white" stroke-width="2"/>
                 <line x1="80" y1="95" x2="120" y2="95" stroke="white" stroke-width="2"/>
                 <line x1="178" y1="80" x2="220" y2="80" stroke="white" stroke-width="2"/>
                 <text x="60" y="70" fill="white">A</text>
                 <text x="60" y="100" fill="white">B</text>`;
    } else if (gate === 'NOR') {
        paths = `<path d="M 120,55 Q 135,80 120,105 Q 160,105 180,80 Q 160,55 120,55 Z" fill="none" stroke="${color}" stroke-width="4"/>
                 <circle cx="184" cy="80" r="4" fill="none" stroke="${color}" stroke-width="4"/>
                 <line x1="80" y1="65" x2="125" y2="65" stroke="white" stroke-width="2"/>
                 <line x1="80" y1="95" x2="125" y2="95" stroke="white" stroke-width="2"/>
                 <line x1="188" y1="80" x2="220" y2="80" stroke="white" stroke-width="2"/>
                 <text x="60" y="70" fill="white">A</text>
                 <text x="60" y="100" fill="white">B</text>`;
    } else if (gate === 'XOR') {
        paths = `<path d="M 110,55 Q 125,80 110,105" fill="none" stroke="${color}" stroke-width="4"/>
                 <path d="M 120,55 Q 135,80 120,105 Q 160,105 180,80 Q 160,55 120,55 Z" fill="none" stroke="${color}" stroke-width="4"/>
                 <line x1="80" y1="65" x2="115" y2="65" stroke="white" stroke-width="2"/>
                 <line x1="80" y1="95" x2="115" y2="95" stroke="white" stroke-width="2"/>
                 <line x1="180" y1="80" x2="220" y2="80" stroke="white" stroke-width="2"/>
                 <text x="60" y="70" fill="white">A</text>
                 <text x="60" y="100" fill="white">B</text>`;
    } else if (gate === 'CIRCUIT') {
        // (A AND B) AND (NOT C)
        // A, B -> AND1 -> AND2 <- NOT <- C
        return `<svg width="400" height="200" viewBox="0 0 400 200">
            <!-- A and B to AND -->
            <text x="20" y="50" fill="white">A</text>
            <text x="20" y="90" fill="white">B</text>
            <path d="M 80,40 L 105,40 A 25,25 0 0,1 105,90 L 80,90 Z" fill="none" stroke="${gateColors.AND}" stroke-width="4"/>
            <line x1="30" y1="50" x2="80" y2="50" stroke="white" stroke-width="2"/>
            <line x1="30" y1="80" x2="80" y2="80" stroke="white" stroke-width="2"/>

            <!-- C to NOT -->
            <text x="20" y="150" fill="white">C</text>
            <path d="M 80,130 L 80,170 L 120,150 Z" fill="none" stroke="${gateColors.NOT}" stroke-width="4"/>
            <circle cx="124" cy="150" r="4" fill="none" stroke="${gateColors.NOT}" stroke-width="4"/>
            <line x1="30" y1="150" x2="80" y2="150" stroke="white" stroke-width="2"/>

            <!-- AND2 (Final) -->
            <path d="M 200,85 L 225,85 A 25,25 0 0,1 225,135 L 200,135 Z" fill="none" stroke="${gateColors.AND}" stroke-width="4"/>
            
            <!-- Connect AND1 to AND2 -->
            <path d="M 130,65 H 160 V 95 H 200" fill="none" stroke="white" stroke-width="2"/>

            <!-- Connect NOT to AND2 -->
            <path d="M 128,150 H 160 V 125 H 200" fill="none" stroke="white" stroke-width="2"/>

            <line x1="250" y1="110" x2="300" y2="110" stroke="white" stroke-width="2"/>
            <text x="310" y="115" fill="white" font-weight="bold">SALIDA</text>
        </svg>`;
    }

    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${paths}
        <text x="135" y="40" fill="${color}" font-weight="bold" text-anchor="middle" font-size="16">${gate}</text>
    </svg>`;
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

// Basic recursive SVG builder for random circuits
const svgW = 600;
const svgH = 300;

// We need to layout the nodes. Simple strategy:
// Root at right.
// Inputs at left.
// Width divided by depth. 

// 1. Calculate depth and positions
function getDepth(node) {
    if (node.type === 'input') return 0;
    return 1 + Math.max(getDepth(node.inputs[0]), getDepth(node.inputs[1]));
}
const maxDepth = getDepth(circuit.root);

let svgContent = '';

function renderNode(node, x, y, level, heightScope) {
    if (node.type === 'input') {
        // Draw input label
        svgContent += `<circle cx="${x}" cy="${y}" r="15" fill="#555" />`;
        svgContent += `<text x="${x}" y="${y + 5}" fill="white" text-anchor="middle" font-weight="bold">${node.id}</text>`;
        return { x, y };
    }

    // Render children
    const childX = x - 120; // Move left
    const hStep = heightScope / 2;

    const p1 = renderNode(node.inputs[0], childX, y - hStep / 2, level + 1, hStep);
    const p2 = renderNode(node.inputs[1], childX, y + hStep / 2, level + 1, hStep);

    // Draw connections
    svgContent += `<path d="M ${p1.x + 15},${p1.y} C ${p1.x + 60},${p1.y} ${x - 60},${y - 10} ${x - 25},${y - 10}" fill="none" stroke="white" stroke-width="2"/>`;
    svgContent += `<path d="M ${p2.x + 15},${p2.y} C ${p2.x + 60},${p2.y} ${x - 60},${y + 10} ${x - 25},${y + 10}" fill="none" stroke="white" stroke-width="2"/>`;

    // Draw this Gate
    const color = gateColors[node.op];

    let path = '';
    // Mini versions of paths centered at x,y
    if (node.op === 'AND' || node.op === 'NAND') {
        path = `M ${x - 25},${y - 20} L ${x},${y - 20} A 20,20 0 0,1 ${x},${y + 20} L ${x - 25},${y + 20} Z`;
    } else if (node.op === 'OR' || node.op === 'NOR') {
        path = `M ${x - 25},${y - 20} Q ${x - 10},${y} ${x - 25},${y + 20} Q ${x + 15},${y + 20} ${x + 35},${y} Q ${x + 15},${y - 20} ${x - 25},${y - 20} Z`;
    } else if (node.op === 'XOR') {
        path = `M ${x - 35},${y - 20} Q ${x - 20},${y} ${x - 35},${y + 20} M ${x - 25},${y - 20} Q ${x - 10},${y} ${x - 25},${y + 20} Q ${x + 15},${y + 20} ${x + 35},${y} Q ${x + 15},${y - 20} ${x - 25},${y - 20} Z`;
    }

    svgContent += `<path d="${path}" fill="#222" stroke="${color}" stroke-width="3"/>`;

    if (node.op === 'NAND' || node.op === 'NOR') {
        svgContent += `<circle cx="${x + 38}" cy="${y}" r="4" fill="#222" stroke="${color}" stroke-width="3"/>`;
    }

    svgContent += `<text x="${x}" y="${y - 25}" fill="${color}" text-anchor="middle" font-size="12" font-weight="bold">${node.op}</text>`;

    return { x: x + 35, y };
}

renderNode(circuit.root, svgW - 60, svgH / 2, 0, svgH);

// Output label
svgContent += `<text x="${svgW - 10}" y="${svgH / 2 + 5}" fill="white" font-weight="bold">OUT</text>`;

return `<svg width="100%" height="300" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" style="background: #111; border-radius: 8px;">
        ${svgContent}
    </svg>`;
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
        diagramContainer.innerHTML = renderCircuitDiagram(gameCircuit); // Use innerHTML for SVG
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
