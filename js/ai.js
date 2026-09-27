/**
 * BlokuShen - AI 電腦對手決策引擎
 * 提供多種難度：初級 (Easy)、中級 (Normal)、高級 (Hard)
 * 遵循 Blokus 經典致勝策略：優先消化大骨牌、向中央挺進、創造新接觸角落、阻斷敵方線路
 * 遵守規範：繁體中文註解
 */

const AI_DIFFICULTIES = {
    EASY: 'easy',
    NORMAL: 'normal',
    HARD: 'hard'
};

/**
 * 評估單一步驟的啟發式權重分數
 * @param {Array<Array<number>>} board 
 * @param {number} playerId 
 * @param {Object} move 
 * @param {string} difficulty 
 * @returns {number}
 */
function evaluateMove(board, playerId, move, difficulty) {
    if (difficulty === AI_DIFFICULTIES.EASY) {
        // 簡單難度：以棋子大小為主，並加上大量隨機擾動
        return move.pieceSize * 10 + Math.random() * 20;
    }

    let score = 0;

    // 1. 棋子尺寸權重：5格骨牌優先下，殘留1~2格骨牌在殘局靈活收尾
    score += move.pieceSize * 25;

    // 2. 棋盤中心挺進度 (中心點為 9.5, 9.5)
    let centerDistSum = 0;
    move.coords.forEach(([r, c]) => {
        let absR = move.originR + r;
        let absC = move.originC + c;
        let dist = Math.hypot(absR - 9.5, absC - 9.5);
        centerDistSum += dist;
    });
    let avgDist = centerDistSum / move.coords.length;
    // 距離中心越近得分越高（最多加約 30 分）
    score += (14 - avgDist) * 3;

    // 若是高級難度，模擬該步放下後所產生的新角落數量
    if (difficulty === AI_DIFFICULTIES.HARD) {
        // 模擬落子
        const simBoard = cloneBoard(board);
        placePieceOnBoard(simBoard, playerId, move.coords, move.originR, move.originC);

        // 計算我方新的可用對角點
        let newCornersCount = 0;
        const diagonalOffsets = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        const orthoOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        move.coords.forEach(([r, c]) => {
            let absR = move.originR + r;
            let absC = move.originC + c;

            for (let d = 0; d < diagonalOffsets.length; d++) {
                let dr = absR + diagonalOffsets[d][0];
                let dc = absC + diagonalOffsets[d][1];
                if (dr >= 0 && dr < BOARD_SIZE && dc >= 0 && dc < BOARD_SIZE && simBoard[dr][dc] === -1) {
                    let hasSelfOrtho = false;
                    for (let o = 0; o < orthoOffsets.length; o++) {
                        let or = dr + orthoOffsets[o][0];
                        let oc = dc + orthoOffsets[o][1];
                        if (or >= 0 && or < BOARD_SIZE && oc >= 0 && oc < BOARD_SIZE && simBoard[or][oc] === playerId) {
                            hasSelfOrtho = true;
                            break;
                        }
                    }
                    if (!hasSelfOrtho) {
                        newCornersCount++;
                    }
                }
            }
        });

        score += newCornersCount * 8;
    }

    // 加入少量隨機性使棋步更多樣化
    score += Math.random() * 5;

    return score;
}

/**
 * 根據難度決定 AI 最適走步
 * @param {Array<Array<number>>} board 
 * @param {number} playerId 
 * @param {Array<Object>} remainingPieces 
 * @param {boolean} isFirstMove 
 * @param {string} difficulty 
 * @returns {Object|null}
 */
function chooseAIMove(board, playerId, remainingPieces, isFirstMove, difficulty = AI_DIFFICULTIES.NORMAL) {
    const validMoves = findAllValidMovesForPlayer(board, playerId, remainingPieces, isFirstMove);
    if (!validMoves || validMoves.length === 0) {
        return null;
    }

    if (difficulty === AI_DIFFICULTIES.EASY) {
        // 從評估前 30% 隨機挑選
        validMoves.sort((a, b) => b.pieceSize - a.pieceSize);
        let pickCount = Math.max(1, Math.floor(validMoves.length * 0.4));
        let randomIndex = Math.floor(Math.random() * pickCount);
        return validMoves[randomIndex];
    }

    // 評估所有走步
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (let i = 0; i < validMoves.length; i++) {
        let currentScore = evaluateMove(board, playerId, validMoves[i], difficulty);
        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestMove = validMoves[i];
        }
    }

    return bestMove;
}
