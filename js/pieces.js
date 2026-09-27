/**
 * BlokuShen - 棋子定義與變換邏輯
 * 經典格格不入 (Blokus) 21 種多格骨牌 (Polyominoes) 定義
 * 包含單格 (1格)、雙格 (2格)、三格 (3格)、四格 (4格) 與五格 (5格)
 * 遵守規範：繁體中文註解
 */

// 經典 21 塊棋子原始幾何座標（以 (0,0) 為基準的局部座標）
const PIECE_DEFINITIONS = [
    // 1 格骨牌 (Mononimo) - 1種
    { id: 1, name: 'I1', size: 1, coords: [[0, 0]] },

    // 2 格骨牌 (Domino) - 1種
    { id: 2, name: 'I2', size: 2, coords: [[0, 0], [0, 1]] },

    // 3 格骨牌 (Triominoes) - 2種
    { id: 3, name: 'I3', size: 3, coords: [[0, 0], [0, 1], [0, 2]] },
    { id: 4, name: 'V3', size: 3, coords: [[0, 0], [1, 0], [0, 1]] },

    // 4 格骨牌 (Tetrominoes) - 5種
    { id: 5, name: 'I4', size: 4, coords: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: 6, name: 'L4', size: 4, coords: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    { id: 7, name: 'T4', size: 4, coords: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { id: 8, name: 'O4', size: 4, coords: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 9, name: 'Z4', size: 4, coords: [[0, 0], [0, 1], [1, 1], [1, 2]] },

    // 5 格骨牌 (Pentominoes) - 12種
    { id: 10, name: 'I5', size: 5, coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { id: 11, name: 'L5', size: 5, coords: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]] },
    { id: 12, name: 'Y5', size: 5, coords: [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1]] },
    { id: 13, name: 'P5', size: 5, coords: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]] },
    { id: 14, name: 'X5', size: 5, coords: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] },
    { id: 15, name: 'T5', size: 5, coords: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },
    { id: 16, name: 'U5', size: 5, coords: [[0, 0], [1, 0], [1, 1], [1, 2], [0, 2]] },
    { id: 17, name: 'V5', size: 5, coords: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]] },
    { id: 18, name: 'W5', size: 5, coords: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },
    { id: 19, name: 'Z5', size: 5, coords: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]] },
    { id: 20, name: 'F5', size: 5, coords: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]] },
    { id: 21, name: 'N5', size: 5, coords: [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]] }
];

/**
 * 將座標群規格化：平移使得最小 row=0 與最小 col=0，並排序以確保唯一性
 * @param {Array<[number, number]>} coords 
 * @returns {Array<[number, number]>}
 */
function normalizeCoords(coords) {
    if (!coords || coords.length === 0) return [];
    let minR = Math.min(...coords.map(c => c[0]));
    let minC = Math.min(...coords.map(c => c[1]));
    let normalized = coords.map(([r, c]) => [r - minR, c - minC]);
    // 依 row 升冪，再依 col 升冪排序
    normalized.sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
    return normalized;
}

/**
 * 順時針旋轉 90 度：(r, c) -> (c, -r) 再規格化
 * @param {Array<[number, number]>} coords 
 * @returns {Array<[number, number]>}
 */
function rotateCoords(coords) {
    let rotated = coords.map(([r, c]) => [c, -r]);
    return normalizeCoords(rotated);
}

/**
 * 水平翻轉 (左右鏡射)：(r, c) -> (r, -c) 再規格化
 * @param {Array<[number, number]>} coords 
 * @returns {Array<[number, number]>}
 */
function flipCoords(coords) {
    let flipped = coords.map(([r, c]) => [r, -c]);
    return normalizeCoords(flipped);
}

/**
 * 將座標陣列轉為雜湊字串以檢測重複變換
 * @param {Array<[number, number]>} coords 
 * @returns {string}
 */
function coordsKey(coords) {
    return coords.map(([r, c]) => `${r},${c}`).join(';');
}

/**
 * 計算單一棋子所有獨特的幾何變換形狀（至多 8 種：4次旋轉 x 2次翻轉）
 * @param {Array<[number, number]>} baseCoords 
 * @returns {Array<Array<[number, number]>>}
 */
function getAllUniqueOrientations(baseCoords) {
    let current = normalizeCoords(baseCoords);
    let orientations = [];
    let visitedKeys = new Set();

    for (let f = 0; f < 2; f++) {
        for (let r = 0; r < 4; r++) {
            let key = coordsKey(current);
            if (!visitedKeys.has(key)) {
                visitedKeys.add(key);
                orientations.push(current);
            }
            current = rotateCoords(current);
        }
        current = flipCoords(current);
    }
    return orientations;
}

/**
 * 取得棋子的包圍寬與高
 * @param {Array<[number, number]>} coords 
 * @returns {{rows: number, cols: number}}
 */
function getPieceDimensions(coords) {
    let maxR = Math.max(...coords.map(c => c[0]));
    let maxC = Math.max(...coords.map(c => c[1]));
    return { rows: maxR + 1, cols: maxC + 1 };
}
