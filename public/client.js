/**
 * client.js
 * - Vanilla JS frontend for the chess mini app
 * - Simple click-to-select flow (click piece -> click destination)
 * - Uses Socket.IO to talk to server
 *
 * This intentionally keeps UI minimal so logic is clear.
 */

// map from chess piece letter to unicode pieces (white uppercase, black lowercase)
const PIECES_UNICODE = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
};

const socket = io(); // connects to same origin

// DOM
const statusEl = document.getElementById('status');
const boardEl = document.getElementById('board');
const colorEl = document.getElementById('color');
const turnEl = document.getElementById('turn');
const inCheckEl = document.getElementById('inCheck');
const moveListEl = document.getElementById('moveList');
const resignBtn = document.getElementById('resignBtn');
const requestStateBtn = document.getElementById('requestStateBtn');

let myColor = null; // 'white' or 'black'
let fen = null;
let selectedSquare = null; // e.g., 'e2'

// Represent board as array of 64 squares a8..h1
function squareName(fileIndex, rankIndex) {
    const file = 'abcdefgh'[fileIndex];
    const rank = 8 - rankIndex; // because we render top-down
    return file + rank;
}

// render FEN to board DOM
function renderFromFen(fenStr) {
    fen = fenStr;
    // if fen is null, clear board
    boardEl.innerHTML = '';
    const parts = fenStr.split(' ');
    const rows = parts[0].split('/');
    for (let r = 0; r < 8; r++) {
        const row = rows[r];
        let file = 0;
        for (const c of row) {
            if (/[1-8]/.test(c)) {
                const emptyCount = parseInt(c, 10);
                for (let i = 0; i < emptyCount; i++) {
                    const sq = document.createElement('div');
                    sq.className = `square ${((file + r) % 2 === 0) ? 'light' : 'dark'}`;
                    const name = squareName(file, r);
                    sq.dataset.square = name;
                    sq.addEventListener('click', onSquareClick);
                    boardEl.appendChild(sq);
                    file++;
                }
            } else {
                const sq = document.createElement('div');
                sq.className = `square ${((file + r) % 2 === 0) ? 'light' : 'dark'}`;
                const name = squareName(file, r);
                sq.dataset.square = name;
                sq.addEventListener('click', onSquareClick);
                // piece
                const pieceChar = c;
                const span = document.createElement('span');
                span.textContent = PIECES_UNICODE[pieceChar] || '?';
                span.dataset.piece = pieceChar;
                sq.appendChild(span);
                boardEl.appendChild(sq);
                file++;
            }
        }
    }
}

// handle click flow
function onSquareClick(e) {
    const sq = e.currentTarget;
    const sqName = sq.dataset.square;

    // if no selection, select if there's a piece of our color
    if (!selectedSquare) {
        const pieceSpan = sq.querySelector('span');
        if (!pieceSpan) return; // nothing to select
        const piece = pieceSpan.dataset.piece;
        const isWhitePiece = (piece === piece.toUpperCase());
        if ((myColor === 'white' && !isWhitePiece) || (myColor === 'black' && isWhitePiece)) {
            // cannot select opponent piece
            return;
        }
        selectedSquare = sqName;
        sq.classList.add('selected');
        statusEl.textContent = `Selected ${sqName}`;
        return;
    }

    // If clicked same square again, deselect
    if (selectedSquare === sqName) {
        document.querySelectorAll('.square.selected').forEach(el => el.classList.remove('selected'));
        selectedSquare = null;
        statusEl.textContent = 'Selection cleared';
        return;
    }

    // attempt move
    const from = selectedSquare;
    const to = sqName;
    socket.emit('move', { from, to });
    statusEl.textContent = `Attempting move ${from} → ${to}`;
    // clear selection UI
    document.querySelectorAll('.square.selected').forEach(el => el.classList.remove('selected'));
    selectedSquare = null;
}

// Helpers to render moves list (simple)
function appendMove(move) {
    const li = document.createElement('li');
    li.textContent = `${move.san} (${move.from}→${move.to})`;
    moveListEl.appendChild(li);
    moveListEl.scrollTop = moveListEl.scrollHeight;
}

// socket.io handlers
socket.on('connect', () => {
    statusEl.textContent = 'Connected. Waiting for opponent / pairing...';
});

socket.on('disconnect', () => {
    statusEl.textContent = 'Disconnected from server';
});

socket.on('game:start', (data) => {
    myColor = data.color;
    colorEl.textContent = myColor;
    renderFromFen(data.fen);
    turnEl.textContent = data.turn === 'w' ? 'white' : 'black';
    statusEl.textContent = 'Game started. Good luck!';
    moveListEl.innerHTML = '';
});

socket.on('game:update', (data) => {
    renderFromFen(data.fen);
    turnEl.textContent = data.turn === 'w' ? 'white' : 'black';
    if (data.lastMove) appendMove(data.lastMove);
    inCheckEl.style.display = data.inCheck ? 'block' : 'none';
    statusEl.textContent = `Move processed. ${data.turn === 'w' ? 'White' : 'Black'} to move.`;
});

socket.on('game:over', (data) => {
    statusEl.textContent = `Game over: ${data.result}`;
    // optionally disable further interactions by removing click listeners
});

socket.on('opponent:disconnect', () => {
    statusEl.textContent = 'Opponent disconnected — you win by abandonment (refresh to play again).';
});

socket.on('invalid:move', (data) => {
    statusEl.textContent = `Invalid move: ${data.message}`;
});

socket.on('invalid:turn', (data) => {
    statusEl.textContent = data.message;
});

resignBtn.addEventListener('click', () => {
    if (confirm('Resign the current game?')) {
        socket.emit('resign');
    }
});

requestStateBtn.addEventListener('click', () => {
    socket.emit('get:state');
    statusEl.textContent = 'Requested current state...';
});
