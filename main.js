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
const currentGateTitle = document.getElementById('current-gate-title');
const containerC = document.getElementById('container-c');

let currentGate = 'AND';

const gates = {
    AND: (a, b) => a && b,
    OR: (a, b) => a || b,
    NOT: (a) => !a, // Ignores b
    NAND: (a, b) => !(a && b),
    NOR: (a, b) => !(a || b),
    XOR: (a, b) => !!(a ^ b),
    CIRCUIT: (a, b, c) => (a && b) && (!c)
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

function update() {
    const a = inputs.a.checked ? 1 : 0;
    const b = inputs.b.checked ? 1 : 0;
    const c = inputs.c.checked ? 1 : 0;

    // UI Update
    vals.a.textContent = a;
    vals.b.textContent = b;
    vals.c.textContent = c;

    let out = 0;
    if (currentGate === 'NOT') {
        out = gates[currentGate](a) ? 1 : 0;
        inputs.b.parentElement.parentElement.style.opacity = '0.3'; // Dim B
        inputs.b.disabled = true;
    } else if (currentGate === 'CIRCUIT') {
        out = gates[currentGate](a, b, c) ? 1 : 0;
        inputs.b.parentElement.parentElement.style.opacity = '1';
        inputs.b.disabled = false;
    } else {
        out = gates[currentGate](a, b) ? 1 : 0;
        inputs.b.parentElement.parentElement.style.opacity = '1';
        inputs.b.disabled = false;
    }

    // Output UI
    outputVal.textContent = out;
    if (out === 1) {
        outputLight.classList.add('on');
        box.classList.add('open');
    } else {
        outputLight.classList.remove('on');
        box.classList.remove('open');
    }

    updateTruthTable(a, b, c);
}

function updateTruthTable(currA, currB, currC) {
    truthTableBody.innerHTML = '';
    truthTableHeader.innerHTML = '';

    // Headers
    const headers = ['A'];
    if (currentGate !== 'NOT') headers.push('B');
    if (currentGate === 'CIRCUIT') headers.push('C');
    headers.push('Salida');
    
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        truthTableHeader.appendChild(th);
    });

    // Rows
    const combinations = [];
    if (currentGate === 'NOT') {
        combinations.push([0], [1]);
    } else if (currentGate === 'CIRCUIT') {
        for (let i = 0; i < 2; i++)
            for (let j = 0; j < 2; j++)
                for (let k = 0; k < 2; k++)
                    combinations.push([i, j, k]);
    } else {
        combinations.push([0, 0], [0, 1], [1, 0], [1, 1]);
    }

    combinations.forEach(combo => {
        const row = document.createElement('tr');
        let res;
        
        let match = false;
        if (currentGate === 'NOT') {
            res = gates[currentGate](combo[0]) ? 1 : 0;
            if (combo[0] === currA) match = true;
        } else if (currentGate === 'CIRCUIT') {
            res = gates[currentGate](combo[0], combo[1], combo[2]) ? 1 : 0;
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

// Event Listeners
Object.values(inputs).forEach(inp => inp.addEventListener('change', update));

document.querySelectorAll('.gate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove active class
        document.querySelectorAll('.gate-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        currentGate = e.target.getAttribute('data-gate');
        currentGateTitle.textContent = currentGate;

        // Show/Hide Input C
        if (currentGate === 'CIRCUIT') {
            containerC.style.display = 'flex';
        } else {
            containerC.style.display = 'none';
        }

        update();
    });
});

// Explain Modal
const modal = document.getElementById('diagram-overlay');
const btnExplain = document.getElementById('btn-explain');
const btnClose = document.getElementById('close-diagram');
const diagramContainer = document.getElementById('diagram-container');

btnExplain.addEventListener('click', () => {
    modal.classList.remove('hidden');
    // Generate ASCII/SVG diagram based on currentGate
    let content = `<p>${explanations[currentGate]}</p>`;
    // Simple representation
    content += `<div style="font-family: monospace; white-space: pre; background: #000; padding: 10px; border-radius: 5px; margin-top: 10px;">`;
    if(currentGate === 'AND') content += `A ----|\n      AND )---- SALIDA\nB ----|`;
    else if(currentGate === 'OR') content += `A ----\\\n       OR )---- SALIDA\nB ----/`;
    else if(currentGate === 'NOT') content += `A ----|>o---- SALIDA`;
    else if(currentGate === 'NAND') content += `A ----|\n      AND )o---- SALIDA\nB ----|`;
    else if(currentGate === 'NOR') content += `A ----\\\n       OR )o---- SALIDA\nB ----/`;
    else if(currentGate === 'XOR') content += `A ----)\n      XOR )---- SALIDA\nB ----)`;
    else if(currentGate === 'CIRCUIT') content += `A ---| AND |---\nB ---|     |   |\n               AND )--- SALIDA\nC ---|>o NOT --|`;
    content += `</div>`;
    
    diagramContainer.innerHTML = content;
});

btnClose.addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Initialize
document.querySelector('[data-gate="AND"]').click();
