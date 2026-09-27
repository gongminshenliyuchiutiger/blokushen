/**
 * BlokuShen - 棋盤規則與驗證邏輯
 * 棋盤尺寸：20 x 20
 * 4 色玩家：藍 (0,0)、黃 (0,19)、紅 (19,19)、綠 (19,0)
 * 遵守規範：繁體中文註解
 */

const BOARD_SIZE = 20;

// 4 位玩家經典配置
const PLAYER_CONFIGS = [
    {
        id: 0,
        name: '藍方',
        color: '#2563eb',
        lightColor: '#60a5fa',
        startPos: [0, 0],
        icon: 'fa-solid fa-gem'
    },
    {
        id: 1,
        name: '黃方',
        color: '#ca8a04',
        lightColor: '#facc15',
        startPos: [0, 19],
        icon: 'fa-solid fa-sun'
    },
    {
        id: 2,
        name: '紅方',
        color: '#dc2626',
        lightColor: '#f87171',
        startPos: [19, 19],
        icon: 'fa-solid fa-fire'
    },
    {
        id: 3,
        name: '綠方',
        color: '#16a34a',
        lightColor: '#4ade80',
        startPos: [19, 0],
        icon: 'fa-solid fa-clover'
    }
];

/**
 * 建立空白棋盤 (20 x 20，無人佔領時為 -1)
 * @returns {Array<Array<number>>}
 */
function createEmptyBoard() {
    let board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        board.push(new Array(BOARD_SIZE).fill(-1));
    }
    return board;
}

/**
 * 複製棋盤陣列
 * @param {Array<Array<number>>} board 
 * @returns {Array<Array<number>>}
 */
function cloneBoard(board) {
    return board.map(row => [...row]);
}

/**
 * 驗證在指定盤面座標 (originR, originC) 放置棋子是否符合 Blokus 規則
 * @param {Array<Array<number>>} board 棋盤
 * @param {number} playerId 玩家編號 (0~3)
 * @param {Array<[number, number]>} coords 棋子相對座標
 * @param {number} originR 放置起始橫列
 * @param {number} originC 放置起始直欄
 * @param {boolean} isFirstMove 是否為此玩家的第一步
 * @returns {boolean} 是否合法
 */
function isValidMove(board, playerId, coords, originR, originC, isFirstMove) {
    const startCorner = PLAYER_CONFIGS[playerId].startPos;
    let coversStartCorner = false;
    let hasDiagonalCorner = false;

    // 四個相鄰方向 (上下左右)
    const orthogonalOffsets = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    // 四個斜對角方向
    const diagonalOffsets = [
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    for (let i = 0; i < coords.length; i++) {
        let r = originR + coords[i][0];
        let c = originC + coords[i][1];

        // 1. 邊界檢查：必須完全在棋盤範圍內
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
            return false;
        }

        // 2. 空格檢查：目標格子必須為空
        if (board[r][c] !== -1) {
            return false;
        }

        // 檢查是否覆蓋專屬起始角落
        if (r === startCorner[0] && c === startCorner[1]) {
            coversStartCorner = true;
        }

        // 3. 邊對邊檢查：不能與自己同色的棋子邊邊相鄰 (Orthogonal)
        for (let j = 0; j < orthogonalOffsets.length; j++) {
            let nr = r + orthogonalOffsets[j][0];
            let nc = c + orthogonalOffsets[j][1];
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                if (board[nr][nc] === playerId) {
                    return false; // 違規：邊邊相連同色棋子
                }
            }
        }

        // 4. 角對角檢查：是否有與自己同色的棋子角對角接觸 (Diagonal)
        for (let j = 0; j < diagonalOffsets.length; j++) {
            let nr = r + diagonalOffsets[j][0];
            let nc = c + diagonalOffsets[j][1];
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                if (board[nr][nc] === playerId) {
                    hasDiagonalCorner = true;
                }
            }
        }
    }

    // 第一手：必須覆蓋起始角落
    if (isFirstMove) {
        return coversStartCorner;
    }

    // 後續走步：必須至少有一個角對角接觸
    return hasDiagonalCorner;
}

/**
 * 診斷為什麼無法在該處落子，提供具體的繁體中文引導說明
 * @param {Array<Array<number>>} board 
 * @param {number} playerId 
 * @param {Array<[number, number]>} coords 
 * @param {number} originR 
 * @param {number} originC 
 * @param {boolean} isFirstMove 
 * @returns {string} 繁體中文原因
 */
function getMoveInvalidReason(board, playerId, coords, originR, originC, isFirstMove) {
    const startCorner = PLAYER_CONFIGS[playerId].startPos;
    let outOfBounds = false;
    let overlapped = false;
    let edgeConflict = false;
    let cornerConnected = false;
    let coversStart = false;

    const orthoOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const diagOffsets = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (let i = 0; i < coords.length; i++) {
        let r = originR + coords[i][0];
        let c = originC + coords[i][1];

        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
            outOfBounds = true;
            continue;
        }

        if (board[r][c] !== -1) {
            overlapped = true;
        }

        if (r === startCorner[0] && c === startCorner[1]) {
            coversStart = true;
        }

        for (let j = 0; j < orthoOffsets.length; j++) {
            let nr = r + orthoOffsets[j][0];
            let nc = c + orthoOffsets[j][1];
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                if (board[nr][nc] === playerId) {
                    edgeConflict = true;
                }
            }
        }

        for (let j = 0; j < diagOffsets.length; j++) {
            let nr = r + diagOffsets[j][0];
            let nc = c + diagOffsets[j][1];
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                if (board[nr][nc] === playerId) {
                    cornerConnected = true;
                }
            }
        }
    }

    if (outOfBounds) return '超出棋盤邊界！請往棋盤內部放置。';
    if (overlapped) return '與現有棋子重疊！目標格子必須為空。';
    if (isFirstMove && !coversStart) {
        return `首步必須覆蓋您專屬的起始角落星號格！`;
    }
    if (edgeConflict) {
        return '違規：嚴禁與自己同色的棋子【邊靠邊】相鄰！';
    }
    if (!cornerConnected) {
        return '提示：必須與自己同色的棋子【角對角】相接觸！';
    }

    return '此位置不符合規則，無法放置。';
}

/**
 * 智慧對齊演算法：檢測以目標格 (targetR, targetC) 為準，骨牌是否有任何方塊對齊時能合法落子
 * @param {Array<Array<number>>} board 
 * @param {number} playerId 
 * @param {Array<[number, number]>} coords 
 * @param {number} targetR 
 * @param {number} targetC 
 * @param {boolean} isFirstMove 
 * @returns {{valid: boolean, originR: number, originC: number, reason?: string}}
 */
function findPlacementAtTarget(board, playerId, coords, targetR, targetC, isFirstMove) {
    const { rows, cols } = getPieceDimensions(coords);
    const centerR = rows / 2;
    const centerC = cols / 2;

    // 將骨牌的方塊依照接近中央排序，優先嘗試讓中央或特定方塊對齊目標格
    const sortedPts = [...coords].sort((a, b) => {
        let distA = Math.hypot(a[0] - centerR, a[1] - centerC);
        let distB = Math.hypot(b[0] - centerR, b[1] - centerC);
        return distA - distB;
    });

    for (let i = 0; i < sortedPts.length; i++) {
        let pt = sortedPts[i];
        let originR = targetR - pt[0];
        let originC = targetC - pt[1];

        if (isValidMove(board, playerId, coords, originR, originC, isFirstMove)) {
            return {
                valid: true,
                originR: originR,
                originC: originC
            };
        }
    }

    // 若是第一步，且目標格落在起點周圍 3x3 區域，智慧吸附至起點
    if (isFirstMove) {
        const start = PLAYER_CONFIGS[playerId].startPos;
        if (Math.abs(targetR - start[0]) <= 2 && Math.abs(targetC - start[1]) <= 2) {
            for (let pt of coords) {
                let originR = start[0] - pt[0];
                let originC = start[1] - pt[1];
                if (isValidMove(board, playerId, coords, originR, originC, true)) {
                    return {
                        valid: true,
                        originR: originR,
                        originC: originC
                    };
                }
            }
        }
    }

    // 無法合法放置時，以中心基準位置顯示無效預覽並提供診斷原因
    let fallbackOriginR = Math.max(0, Math.min(BOARD_SIZE - rows, targetR - Math.floor(rows / 2)));
    let fallbackOriginC = Math.max(0, Math.min(BOARD_SIZE - cols, targetC - Math.floor(cols / 2)));
    let reason = getMoveInvalidReason(board, playerId, coords, fallbackOriginR, fallbackOriginC, isFirstMove);

    return {
        valid: false,
        originR: fallbackOriginR,
        originC: fallbackOriginC,
        reason: reason
    };
}

/**
 * 放置棋子到棋盤上
 * @param {Array<Array<number>>} board 
 * @param {number} playerId 
 * @param {Array<[number, number]>} coords 
 * @param {number} originR 
 * @param {number} originC 
 */
function placePieceOnBoard(board, playerId, coords, originR, originC) {
    coords.forEach(([r, c]) => {
        board[originR + r][originC + c] = playerId;
    });
}

/**
 * 搜尋玩家在盤面上所有合法的走步
 * @param {Array<Array<number>>} board 
 * @param {number} playerId 
 * @param {Array<Object>} remainingPieces 剩餘棋子物件
 * @param {boolean} isFirstMove 
 * @returns {Array<Object>} 所有可行的放置方案
 */
function findAllValidMovesForPlayer(board, playerId, remainingPieces, isFirstMove) {
    const validMoves = [];

    // 若是第一手，直接鎖定起點鄰近可能位置加速檢索
    if (isFirstMove) {
        const start = PLAYER_CONFIGS[playerId].startPos;
        for (const piece of remainingPieces) {
            const orientations = getAllUniqueOrientations(piece.coords);
            for (let oIdx = 0; oIdx < orientations.length; oIdx++) {
                const shape = orientations[oIdx];
                // 棋子中的任一格必須落在 start 上
                for (let pt = 0; pt < shape.length; pt++) {
                    let originR = start[0] - shape[pt][0];
                    let originC = start[1] - shape[pt][1];
                    if (isValidMove(board, playerId, shape, originR, originC, true)) {
                        validMoves.push({
                            pieceId: piece.id,
                            pieceName: piece.name,
                            pieceSize: piece.size,
                            coords: shape,
                            originR: originR,
                            originC: originC
                        });
                    }
                }
            }
        }
        return validMoves;
    }

    // 後續走步：先找出該玩家現存所有可接觸的可用對角點 (Corners)
    const diagonalOffsets = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const candidateCells = new Set();

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === playerId) {
                for (let d = 0; d < diagonalOffsets.length; d++) {
                    let nr = r + diagonalOffsets[d][0];
                    let nc = c + diagonalOffsets[d][1];
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === -1) {
                        // 檢查該空位四周是否已有同色邊相鄰，若有則此空位根本不能放
                        let hasOrthoSelf = false;
                        const ortho = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                        for (let o = 0; o < ortho.length; o++) {
                            let onr = nr + ortho[o][0];
                            let onc = nc + ortho[o][1];
                            if (onr >= 0 && onr < BOARD_SIZE && onc >= 0 && onc < BOARD_SIZE && board[onr][onc] === playerId) {
                                hasOrthoSelf = true;
                                break;
                            }
                        }
                        if (!hasOrthoSelf) {
                            candidateCells.add(`${nr},${nc}`);
                        }
                    }
                }
            }
        }
    }

    // 若根本沒有可用對角空位，直接回傳空陣列
    if (candidateCells.size === 0) {
        return validMoves;
    }

    const candidateArray = Array.from(candidateCells).map(str => str.split(',').map(Number));

    // 遍歷所有剩餘棋子的變換形狀
    for (const piece of remainingPieces) {
        const orientations = getAllUniqueOrientations(piece.coords);
        for (let oIdx = 0; oIdx < orientations.length; oIdx++) {
            const shape = orientations[oIdx];
            const testedOrigins = new Set();

            for (let cIdx = 0; cIdx < candidateArray.length; cIdx++) {
                const [targetR, targetC] = candidateArray[cIdx];
                // 嘗試將棋子的任一格對齊 targetR, targetC
                for (let pt = 0; pt < shape.length; pt++) {
                    let originR = targetR - shape[pt][0];
                    let originC = targetC - shape[pt][1];
                    let key = `${originR},${originC}`;

                    if (!testedOrigins.has(key)) {
                        testedOrigins.add(key);
                        if (isValidMove(board, playerId, shape, originR, originC, false)) {
                            validMoves.push({
                                pieceId: piece.id,
                                pieceName: piece.name,
                                pieceSize: piece.size,
                                coords: shape,
                                originR: originR,
                                originC: originC
                            });
                        }
                    }
                }
            }
        }
    }

    return validMoves;
}

/**
 * 檢查玩家是否還有任何合法的走步
 * @param {Array<Array<number>>} board 
 * @param {number} playerId 
 * @param {Array<Object>} remainingPieces 
 * @param {boolean} isFirstMove 
 * @returns {boolean}
 */
function hasAnyValidMove(board, playerId, remainingPieces, isFirstMove) {
    if (remainingPieces.length === 0) return false;
    const moves = findAllValidMovesForPlayer(board, playerId, remainingPieces, isFirstMove);
    return moves.length > 0;
}
