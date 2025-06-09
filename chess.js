// Game state
let selectedPiece = null;
let currentPlayer = 'white';
let gameState = createInitialBoard();
let possibleMoves = [];
let enPassantTarget = null;
let playAgainstAI = false;
let aiThinking = false;
let checkStatus = { white: false, black: false };
let gameOver = false;  // Add gameOver flag

// DOM elements
const chessboard = document.getElementById('chessboard');
const statusDisplay = document.getElementById('status');
const newGameBtn = document.getElementById('new-game');
const aiToggleBtn = document.getElementById('ai-toggle');

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    newGameBtn.addEventListener('click', startNewGame);
    aiToggleBtn.addEventListener('click', toggleAI);
    renderBoard();
});

function startNewGame() {
    gameState = createInitialBoard();
    currentPlayer = 'white';
    selectedPiece = null;
    possibleMoves = [];
    enPassantTarget = null;
    checkStatus = { white: false, black: false };
    gameOver = false;  // Reset gameOver flag
    statusDisplay.textContent = "White's turn";
    renderBoard();
    
    if (playAgainstAI && currentPlayer === 'black') {
        makeAIMove();
    }
}

function toggleAI() {
    playAgainstAI = !playAgainstAI;
    aiToggleBtn.textContent = `Play vs AI: ${playAgainstAI ? 'ON' : 'OFF'}`;
    
    if (playAgainstAI && currentPlayer === 'black') {
        makeAIMove();
    }
}

function createInitialBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Set up pawns
    for (let i = 0; i < 8; i++) {
        board[1][i] = { type: 'pawn', color: 'black' };
        board[6][i] = { type: 'pawn', color: 'white' };
    }
    
    // Set up back row pieces
    const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let i = 0; i < 8; i++) {
        board[0][i] = { type: pieceOrder[i], color: 'black' };
        board[7][i] = { type: pieceOrder[i], color: 'white' };
    }
    
    return board;
}

function renderBoard() {
    chessboard.innerHTML = '';
    
    // Find kings to highlight if in check
    const kings = findKings();
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const tile = document.createElement('div');
            tile.className = `tile ${(row + col) % 2 === 0 ? 'white-tile' : 'black-tile'}`;
            
            // Highlight selected piece
            if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
                tile.classList.add('selected');
            }
            
            // Highlight possible moves
            const move = possibleMoves.find(m => m.row === row && m.col === col);
            if (move) {
                tile.classList.add(move.isEnPassant ? 'en-passant' : 'possible-move');
            }
            
            // Highlight king in check
            if (kings.white && kings.white.row === row && kings.white.col === col && checkStatus.white) {
                tile.classList.add('check');
            }
            if (kings.black && kings.black.row === row && kings.black.col === col && checkStatus.black) {
                tile.classList.add('check');
            }
            
            // Add piece if exists
            const piece = gameState[row][col];
            if (piece) {
                tile.textContent = getPieceSymbol(piece);
                tile.classList.add(`${piece.color}-piece`);
            }
            
            tile.addEventListener('click', () => handleTileClick(row, col));
            chessboard.appendChild(tile);
        }
    }
}

function findKings() {
    const kings = { white: null, black: null };
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            if (piece && piece.type === 'king') {
                kings[piece.color] = { row, col };
            }
        }
    }
    return kings;
}

function getPieceSymbol(piece) {
    const symbols = {
        king:   { white: '\u2654', black: '\u265A' },
        queen:  { white: '\u2655', black: '\u265B' },
        rook:   { white: '\u2656', black: '\u265C' },
        bishop: { white: '\u2657', black: '\u265D' },
        knight: { white: '\u2658', black: '\u265E' },
        pawn:   { white: '\u2659', black: '\u265F' }
    };
    return symbols[piece.type][piece.color];
}

function handleTileClick(row, col) {
    // Don't allow moves if game is over or AI is thinking
    if (gameOver || aiThinking || (playAgainstAI && currentPlayer === 'black')) return;
    
    const piece = gameState[row][col];
    
    if (!selectedPiece) {
        if (piece && piece.color === currentPlayer) {
            selectedPiece = { row, col };
            possibleMoves = getValidMoves(row, col);
            renderBoard();
        }
        return;
    }
    
    if (selectedPiece.row === row && selectedPiece.col === col) {
        selectedPiece = null;
        possibleMoves = [];
        renderBoard();
        return;
    }
    
    const move = possibleMoves.find(m => m.row === row && m.col === col);
    
    if (move) {
        executeMove(selectedPiece.row, selectedPiece.col, row, col, move.isEnPassant);
        
        if (playAgainstAI && currentPlayer === 'black' && !gameOver) {
            setTimeout(makeAIMove, 500);
        }
    }
}

function executeMove(fromRow, fromCol, toRow, toCol, isEnPassant) {
    // Create a copy of the current state for checking moves
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Handle en passant capture
    if (isEnPassant) {
        newState[fromRow][toCol] = null;
    }
    
    // Move the piece
    newState[toRow][toCol] = newState[fromRow][fromCol];
    newState[fromRow][fromCol] = null;
    
    // Handle pawn promotion
    if (newState[toRow][toCol].type === 'pawn' && (toRow === 0 || toRow === 7)) {
        newState[toRow][toCol].type = 'queen';
    }
    
    // Check if move puts current player in check (illegal move)
    const kings = findKings();
    const kingPos = kings[currentPlayer];
    if (isSquareUnderAttack(newState, kingPos.row, kingPos.col, currentPlayer)) {
        return; // Illegal move - don't execute it
    }
    
    // Update the actual game state
    gameState = newState;
    
    // Set en passant target if pawn moved two squares
    if (gameState[toRow][toCol].type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = {
            row: fromRow + (currentPlayer === 'white' ? 1 : -1),
            col: fromCol
        };
    } else {
        enPassantTarget = null;
    }
    
    // Check for check/checkmate
    const opponent = currentPlayer === 'white' ? 'black' : 'white';
    const opponentKingPos = kings[opponent];
    checkStatus[opponent] = isSquareUnderAttack(gameState, opponentKingPos.row, opponentKingPos.col, opponent);
    
    // Switch turns
    selectedPiece = null;
    possibleMoves = [];
    currentPlayer = opponent;
    
    // Check for checkmate or stalemate
    let isCheckmated = false;
    if (checkStatus[opponent]) {
        isCheckmated = isCheckmate(opponent);
        if (isCheckmated) {
            gameOver = true; // Set game over flag
        }
    } else {
        // Check for stalemate
        if (isStalemate(opponent)) {
            gameOver = true;
            statusDisplay.textContent = "Stalemate! Game ends in a draw.";
            renderBoard();
            return;
        }
    }
    
    // Update status message
    if (isCheckmated) {
        const winner = opponent === 'white' ? 'black' : 'white';
        statusDisplay.textContent = `Checkmate! ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins!`;
    } else if (checkStatus[opponent]) {
        statusDisplay.textContent = `${opponent.charAt(0).toUpperCase() + opponent.slice(1)} is in check!`;
    } else {
        statusDisplay.textContent = `${opponent.charAt(0).toUpperCase() + opponent.slice(1)}'s turn`;
    }
    
    renderBoard();
}

function getValidMoves(row, col) {
    const piece = gameState[row][col];
    if (!piece || piece.color !== currentPlayer) return [];
    
    const moves = getPossibleMovesForPiece(gameState, row, col);
    const validMoves = [];
    
    // Filter out moves that would leave the king in check
    for (const move of moves) {
        const newState = JSON.parse(JSON.stringify(gameState));
        
        // Make the move on the temporary board
        newState[move.row][move.col] = newState[row][col];
        newState[row][col] = null;
        
        // Handle en passant
        if (move.isEnPassant) {
            newState[row][move.col] = null;
        }
        
        // Find the king's position
        let kingRow = -1, kingCol = -1;
        
        // If we're moving the king, use the destination position
        if (piece.type === 'king') {
            kingRow = move.row;
            kingCol = move.col;
        } else {
            // Otherwise find the king's current position
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = newState[r][c];
                    if (p && p.type === 'king' && p.color === currentPlayer) {
                        kingRow = r;
                        kingCol = c;
                        break;
                    }
                }
                if (kingRow !== -1) break;
            }
        }
        
        // Check if king would be under attack after this move
        if (!isSquareUnderAttack(newState, kingRow, kingCol, currentPlayer)) {
            validMoves.push(move);
        }
    }
    
    return validMoves;
}

function isSquareUnderAttack(board, row, col, defenderColor) {
    const attackerColor = defenderColor === 'white' ? 'black' : 'white';
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === attackerColor) {
                const moves = getPossibleMovesForPiece(board, r, c, true);
                if (moves.some(m => m.row === row && m.col === col)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function isCheckmate(color) {
    if (!checkStatus[color]) return false;
    
    // Check if any move can get the king out of check
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            if (piece && piece.color === color) {
                const moves = getValidMoves(row, col);
                if (moves.length > 0) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

// Add function to detect stalemate
function isStalemate(color) {
    if (checkStatus[color]) return false; // Not stalemate if in check
    
    // Check if any legal move exists
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            if (piece && piece.color === color) {
                const moves = getValidMoves(row, col);
                if (moves.length > 0) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

// Update getPossibleMovesForPiece to take an optional parameter to indicate
// when we're checking attacks (to avoid recursion problems)
function getPossibleMovesForPiece(board, row, col, checkingAttacks = false) {
    const piece = board[row][col];
    if (!piece) return [];
    
    const moves = [];
    const color = piece.color;
    const opponentColor = color === 'white' ? 'black' : 'white';
    
    switch (piece.type) {
        case 'pawn':
            const direction = color === 'white' ? -1 : 1;
            const startRow = color === 'white' ? 6 : 1;
            
            // Forward move
            if (!board[row + direction][col]) {
                moves.push({row: row + direction, col});
                
                // Double move from starting position
                if (row === startRow && !board[row + 2 * direction][col]) {
                    moves.push({row: row + 2 * direction, col});
                }
            }
            
            // Captures
            for (const captureCol of [col - 1, col + 1]) {
                if (captureCol >= 0 && captureCol < 8) {
                    // Normal capture
                    const target = board[row + direction][captureCol];
                    if (target && target.color === opponentColor) {
                        moves.push({row: row + direction, col: captureCol});
                    }
                    
                    // En passant
                    if (enPassantTarget && enPassantTarget.row === row && 
                        enPassantTarget.col === captureCol) {
                        moves.push({
                            row: row + direction, 
                            col: captureCol,
                            isEnPassant: true
                        });
                    }
                }
            }
            break;
            
        case 'knight':
            const knightMoves = [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]];
            for (const [dr, dc] of knightMoves) {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = board[newRow][newCol];
                    if (!target || target.color === opponentColor) {
                        moves.push({row: newRow, col: newCol});
                    }
                }
            }
            break;
            
        case 'bishop':
            const bishopDirections = [[-1,-1], [-1,1], [1,-1], [1,1]];
            addSlidingMoves(board, row, col, bishopDirections, moves);
            break;
            
        case 'rook':
            const rookDirections = [[-1,0], [1,0], [0,-1], [0,1]];
            addSlidingMoves(board, row, col, rookDirections, moves);
            break;
            
        case 'queen':
            const queenDirections = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]];
            addSlidingMoves(board, row, col, queenDirections, moves);
            break;
            
        case 'king':
            const kingMoves = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
            for (const [dr, dc] of kingMoves) {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = board[newRow][newCol];
                    if (!target || target.color === opponentColor) {
                        moves.push({row: newRow, col: newCol});
                    }
                }
            }
            break;
    }
    
    return moves;
}

function addSlidingMoves(board, row, col, directions, moves) {
    const piece = board[row][col];
    const opponentColor = piece.color === 'white' ? 'black' : 'white';
    
    for (const [dr, dc] of directions) {
        let newRow = row + dr;
        let newCol = col + dc;
        
        while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const target = board[newRow][newCol];
            
            if (!target) {
                moves.push({row: newRow, col: newCol});
            } else {
                if (target.color === opponentColor) {
                    moves.push({row: newRow, col: newCol});
                }
                break;
            }
            
            newRow += dr;
            newCol += dc;
        }
    }
}

function makeAIMove() {
    if (aiThinking || gameOver) return;
    
    aiThinking = true;
    statusDisplay.textContent = "AI thinking...";
    
    setTimeout(() => {
        const bestMove = findBestMove(gameState, 3);
        
        if (bestMove) {
            executeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col, bestMove.isEnPassant);
        }
        
        aiThinking = false;
    }, 100);
}

function evaluateBoard(board) {
    const pieceValues = {
        pawn: 1,
        knight: 3,
        bishop: 3,
        rook: 5,
        queen: 9,
        king: 0
    };
    
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = pieceValues[piece.type];
                score += piece.color === 'white' ? value : -value;
            }
        }
    }
    
    return score;
}

function minimax(board, depth, isMaximizing, alpha, beta) {
    if (depth === 0) {
        return { score: evaluateBoard(board) };
    }
    
    const moves = getAllPossibleMoves(board, isMaximizing ? 'white' : 'black');
    let bestMove = null;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    
    for (const move of moves) {
        const newBoard = JSON.parse(JSON.stringify(board));
        newBoard[move.to.row][move.to.col] = newBoard[move.from.row][move.from.col];
        newBoard[move.from.row][move.from.col] = null;
        
        if (move.isEnPassant) {
            newBoard[move.from.row][move.to.col] = null;
        }
        
        if (newBoard[move.to.row][move.to.col].type === 'pawn' && 
            (move.to.row === 0 || move.to.row === 7)) {
            newBoard[move.to.row][move.to.col].type = 'queen';
        }
        
        const result = minimax(newBoard, depth - 1, !isMaximizing, alpha, beta);
        
        if (isMaximizing) {
            if (result.score > bestScore) {
                bestScore = result.score;
                bestMove = move;
            }
            alpha = Math.max(alpha, bestScore);
        } else {
            if (result.score < bestScore) {
                bestScore = result.score;
                bestMove = move;
            }
            beta = Math.min(beta, bestScore);
        }
        
        if (beta <= alpha) {
            break;
        }
    }
    
    return { score: bestScore, move: bestMove };
}

function findBestMove(board, depth) {
    const result = minimax(board, depth, false, -Infinity, Infinity);
    return result.move;
}

function getAllPossibleMoves(board, color) {
    const moves = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const pieceMoves = getPossibleMovesForPiece(board, row, col);
                pieceMoves.forEach(move => {
                    moves.push({
                        from: { row, col },
                        to: { row: move.row, col: move.col },
                        isEnPassant: move.isEnPassant
                    });
                });
            }
        }
    }
    
    return moves;
}
