/**
 * BlokuShen - 遊戲主邏輯控制器
 * 支援單人人機對戰 (1P vs 3AI)、二人模式 (2P)、四人本機對戰 (4P)
 * 具備完整 20x20 經典規則驗證、即時落子幽靈預覽、悔棋機制、計分面板
 * 網站全面使用 Font Awesome 圖標
 * 遵守規範：繁體中文註解
 */

class BlokuShenGame {
    constructor() {
        this.board = createEmptyBoard();
        this.players = [];
        this.currentPlayerIndex = 0;
        this.selectedPiece = null;
        this.currentOrientation = null; // 當前經過旋轉翻轉後的相對座標
        this.hoverCell = null; // 滑鼠懸停的盤面 [r, c]
        this.gameMode = '1p'; // '1p': 1玩家vs3電腦, '2p': 雙人模式, '4p': 四人本機
        this.aiDifficulty = AI_DIFFICULTIES.NORMAL;
        this.moveHistory = [];
        this.isGameOver = false;
        this.isAIThinking = false;

        this.initDomElements();
        this.initEventListeners();
        this.startNewGame();
    }

    initDomElements() {
        this.boardGridEl = document.getElementById('board-grid');
        this.pieceTrayEl = document.getElementById('piece-tray');
        this.turnBannerEl = document.getElementById('current-turn-banner');
        this.playersListEl = document.getElementById('players-score-list');
        this.modalRulesEl = document.getElementById('modal-rules');
        this.modalGameOverEl = document.getElementById('modal-game-over');
        this.gameResultTableEl = document.getElementById('game-result-table');

        // 控制按鈕
        this.btnRotate = document.getElementById('btn-rotate-piece');
        this.btnFlip = document.getElementById('btn-flip-piece');
        this.btnPass = document.getElementById('btn-pass-turn');
        this.btnUndo = document.getElementById('btn-undo-move');
        this.btnMute = document.getElementById('btn-toggle-sound');
        this.gameModeSelect = document.getElementById('select-game-mode');
        this.aiDiffSelect = document.getElementById('select-ai-difficulty');

        // 操作引導條與即時提示 Toast
        this.statusToastEl = document.getElementById('game-status-toast');
        this.guideStep1 = document.getElementById('guide-step-1');
        this.guideStep2 = document.getElementById('guide-step-2');
        this.guideStep3 = document.getElementById('guide-step-3');
        this.toastTimer = null;
    }

    showStatusToast(message, isError = false) {
        if (!this.statusToastEl) return;
        this.statusToastEl.innerHTML = isError
            ? `<i class="fa-solid fa-triangle-exclamation"></i> <span>${message}</span>`
            : `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;

        this.statusToastEl.className = 'game-status-toast visible ' + (isError ? 'error' : 'info');

        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            if (this.statusToastEl) {
                this.statusToastEl.classList.remove('visible');
            }
        }, 3600);
    }

    updateGuideSteps(stepNumber) {
        if (!this.guideStep1 || !this.guideStep2 || !this.guideStep3) return;
        this.guideStep1.classList.toggle('active', stepNumber === 1);
        this.guideStep2.classList.toggle('active', stepNumber === 2);
        this.guideStep3.classList.toggle('active', stepNumber === 3);
    }

    initEventListeners() {
        // 棋盤事件 (指針懸停與點擊)
        this.boardGridEl.addEventListener('pointermove', this.onBoardPointerMove.bind(this));
        this.boardGridEl.addEventListener('pointerleave', this.onBoardPointerLeave.bind(this));
        this.boardGridEl.addEventListener('click', this.onBoardClick.bind(this));

        // 旋轉與翻轉按鈕
        this.btnRotate.addEventListener('click', () => this.rotateSelectedPiece());
        this.btnFlip.addEventListener('click', () => this.flipSelectedPiece());
        this.btnPass.addEventListener('click', () => this.passCurrentTurn());
        this.btnUndo.addEventListener('click', () => this.undoLastMove());

        // 音效切換
        this.btnMute.addEventListener('click', () => {
            const isMuted = soundManager.toggleMute();
            const icon = this.btnMute.querySelector('i');
            if (isMuted) {
                icon.className = 'fa-solid fa-volume-xmark';
                this.btnMute.classList.add('muted');
            } else {
                icon.className = 'fa-solid fa-volume-high';
                this.btnMute.classList.remove('muted');
            }
        });

        // 模式切換與難度切換
        if (this.gameModeSelect) {
            this.gameModeSelect.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
                this.startNewGame();
            });
        }
        if (this.aiDiffSelect) {
            this.aiDiffSelect.addEventListener('change', (e) => {
                this.aiDifficulty = e.target.value;
            });
        }

        // 新局按鈕
        const btnNewGame = document.getElementById('btn-new-game');
        if (btnNewGame) {
            btnNewGame.addEventListener('click', () => this.startNewGame());
        }
        const btnRestart = document.getElementById('btn-restart-game');
        if (btnRestart) {
            btnRestart.addEventListener('click', () => {
                this.modalGameOverEl.classList.remove('active');
                this.startNewGame();
            });
        }

        // 規則說明彈窗
        const btnShowRules = document.getElementById('btn-show-rules');
        const btnCloseRules = document.getElementById('btn-close-rules');
        if (btnShowRules && this.modalRulesEl) {
            btnShowRules.addEventListener('click', () => {
                this.modalRulesEl.classList.add('active');
            });
        }
        if (btnCloseRules && this.modalRulesEl) {
            btnCloseRules.addEventListener('click', () => {
                this.modalRulesEl.classList.remove('active');
            });
        }

        // 鍵盤快捷鍵
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
                e.preventDefault();
                this.rotateSelectedPiece();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.flipSelectedPiece();
            } else if (e.key === 'Escape') {
                this.unselectPiece();
            } else if (e.key === 'z' || e.key === 'Z') {
                if (e.ctrlKey || e.metaKey) {
                    this.undoLastMove();
                }
            }
        });

        // 滑鼠滾輪快速旋轉棋子
        this.boardGridEl.addEventListener('wheel', (e) => {
            if (this.selectedPiece) {
                e.preventDefault();
                this.rotateSelectedPiece();
                this.renderGhostPreview();
            }
        }, { passive: false });
    }

    startNewGame() {
        this.board = createEmptyBoard();
        this.moveHistory = [];
        this.isGameOver = false;
        this.isAIThinking = false;
        this.currentPlayerIndex = 0;
        this.selectedPiece = null;
        this.currentOrientation = null;
        this.hoverCell = null;

        // 初始化 4 位玩家資料
        this.players = PLAYER_CONFIGS.map((cfg, idx) => {
            let isAI = false;
            if (this.gameMode === '1p') {
                isAI = (idx !== 0); // 只有玩家 0 (藍方) 為真人，其餘為電腦
            } else if (this.gameMode === '2p') {
                // 雙人模式：玩家1 操作 藍(0)、紅(2)；玩家2 操作 黃(1)、綠(3)
                isAI = false;
            } else {
                // 4人模式全為真人
                isAI = false;
            }

            return {
                id: cfg.id,
                name: cfg.name,
                color: cfg.color,
                lightColor: cfg.lightColor,
                startPos: cfg.startPos,
                icon: cfg.icon,
                isAI: isAI,
                isFirstMove: true,
                hasPassed: false,
                remainingPieces: JSON.parse(JSON.stringify(PIECE_DEFINITIONS)), // 21 塊棋子複製
                placedTilesCount: 0,
                lastPieceId: null
            };
        });

        this.renderBoardDom();
        this.renderPlayerScores();
        this.renderTurnIndicator();
        this.renderPieceTray();
        this.updateActionButtons();

        // 預設為開局第一位玩家自動選取第一塊骨牌，省去玩家困惑
        if (!this.players[0].isAI && this.players[0].remainingPieces.length > 0) {
            this.selectPiece(this.players[0].remainingPieces[0]);
        }
    }

    renderBoardDom() {
        this.boardGridEl.innerHTML = '';
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'board-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                // 標記四個角落起始格
                PLAYER_CONFIGS.forEach(player => {
                    if (player.startPos[0] === r && player.startPos[1] === c) {
                        cell.classList.add('start-corner');
                        cell.style.setProperty('--corner-color', player.color);
                        cell.setAttribute('title', `${player.name} 起始格`);
                        const star = document.createElement('i');
                        star.className = 'fa-solid fa-star corner-star';
                        cell.appendChild(star);
                    }
                });

                this.boardGridEl.appendChild(cell);
            }
        }
        this.updateBoardCells();
    }

    updateBoardCells() {
        const cells = this.boardGridEl.children;
        const curPlayer = this.players[this.currentPlayerIndex];

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const idx = r * BOARD_SIZE + c;
                const cellEl = cells[idx];
                const playerId = this.board[r][c];

                if (playerId !== -1) {
                    cellEl.classList.add('occupied');
                    cellEl.style.backgroundColor = PLAYER_CONFIGS[playerId].color;
                    cellEl.style.borderColor = PLAYER_CONFIGS[playerId].lightColor;
                    cellEl.dataset.player = playerId;
                    cellEl.classList.remove('current-player-start');
                } else {
                    cellEl.classList.remove('occupied');
                    cellEl.style.backgroundColor = '';
                    cellEl.style.borderColor = '';
                    delete cellEl.dataset.player;

                    // 若為當前玩家首步起始格，加入引導呼吸高亮
                    if (curPlayer && curPlayer.isFirstMove && curPlayer.startPos[0] === r && curPlayer.startPos[1] === c) {
                        cellEl.classList.add('current-player-start');
                    } else {
                        cellEl.classList.remove('current-player-start');
                    }
                }
            }
        }
    }

    onBoardPointerMove(e) {
        const cell = e.target.closest('.board-cell');
        if (!cell) {
            this.clearGhostPreview();
            this.hoverCell = null;
            return;
        }

        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);

        if (!this.hoverCell || this.hoverCell[0] !== r || this.hoverCell[1] !== c) {
            this.hoverCell = [r, c];
            this.renderGhostPreview();
        }
    }

    onBoardPointerLeave() {
        this.hoverCell = null;
        this.clearGhostPreview();
    }

    renderGhostPreview() {
        this.clearGhostPreview();
        if (!this.selectedPiece || !this.currentOrientation || !this.hoverCell) return;
        const [hoverR, hoverC] = this.hoverCell;
        const curPlayer = this.players[this.currentPlayerIndex];

        // 呼叫智慧對齊吸附演算法
        const placement = findPlacementAtTarget(
            this.board,
            curPlayer.id,
            this.currentOrientation,
            hoverR,
            hoverC,
            curPlayer.isFirstMove
        );

        this.lastPlacement = placement;
        const originR = placement.originR;
        const originC = placement.originC;

        this.currentOrientation.forEach(([dr, dc]) => {
            const r = originR + dr;
            const c = originC + dc;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                const idx = r * BOARD_SIZE + c;
                const cellEl = this.boardGridEl.children[idx];
                if (cellEl) {
                    cellEl.classList.add('ghost');
                    if (placement.valid) {
                        cellEl.classList.add('ghost-valid');
                        cellEl.style.setProperty('--ghost-color', curPlayer.color);
                    } else {
                        cellEl.classList.add('ghost-invalid');
                    }
                }
            }
        });

        if (placement.valid) {
            this.updateGuideSteps(3);
        } else {
            this.updateGuideSteps(2);
        }
    }

    clearGhostPreview() {
        const ghosts = this.boardGridEl.querySelectorAll('.ghost');
        ghosts.forEach(cell => {
            cell.classList.remove('ghost', 'ghost-valid', 'ghost-invalid');
            cell.style.removeProperty('--ghost-color');
        });
    }

    onBoardClick(e) {
        if (this.isGameOver || this.isAIThinking) return;
        const curPlayer = this.players[this.currentPlayerIndex];
        if (curPlayer.isAI) return;

        // 若尚未選取任何骨牌，提示使用者從手牌庫點選
        if (!this.selectedPiece || !this.currentOrientation) {
            soundManager.playInvalid();
            this.showStatusToast('請先從右側（或下方）骨牌庫點選一塊骨牌！', true);
            this.pieceTrayEl.classList.add('shake-highlight');
            setTimeout(() => this.pieceTrayEl.classList.remove('shake-highlight'), 600);
            this.updateGuideSteps(1);
            return;
        }

        const cell = e.target.closest('.board-cell');
        if (!cell) return;

        const hoverR = parseInt(cell.dataset.row, 10);
        const hoverC = parseInt(cell.dataset.col, 10);

        // 使用智慧吸附演算法評估點擊位置
        const placement = findPlacementAtTarget(
            this.board,
            curPlayer.id,
            this.currentOrientation,
            hoverR,
            hoverC,
            curPlayer.isFirstMove
        );

        if (!placement.valid) {
            soundManager.playInvalid();
            cell.classList.add('shake-error');
            setTimeout(() => cell.classList.remove('shake-error'), 400);

            const reason = placement.reason || '此處無法合法放置！';
            this.showStatusToast(reason, true);
            return;
        }

        // 放置成功！執行走步
        this.executeMove(
            curPlayer.id,
            this.selectedPiece.id,
            this.currentOrientation,
            placement.originR,
            placement.originC
        );
        this.showStatusToast(`${curPlayer.name} 成功放置骨牌！`, false);
    }

    executeMove(playerId, pieceId, coords, originR, originC) {
        const player = this.players[playerId];

        // 放置到棋盤
        placePieceOnBoard(this.board, playerId, coords, originR, originC);

        // 從該玩家手牌移除
        const pieceIdx = player.remainingPieces.findIndex(p => p.id === pieceId);
        let usedPiece = null;
        if (pieceIdx !== -1) {
            usedPiece = player.remainingPieces.splice(pieceIdx, 1)[0];
            player.placedTilesCount += coords.length;
            player.lastPieceId = pieceId;
        }

        const wasFirst = player.isFirstMove;
        player.isFirstMove = false;

        // 紀錄走步歷史
        this.moveHistory.push({
            playerId,
            piece: usedPiece,
            coords,
            originR,
            originC,
            wasFirstMove: wasFirst
        });

        soundManager.playPlace();
        this.clearGhostPreview();
        this.updateBoardCells();
        this.renderPlayerScores();

        // 重設選中狀態
        this.selectedPiece = null;
        this.currentOrientation = null;

        // 檢查下一位玩家
        this.advanceToNextTurn();
    }

    advanceToNextTurn() {
        // 檢查全體是否皆結束
        if (this.checkGameOver()) {
            this.handleGameOver();
            return;
        }

        // 尋找下一位尚未棄權的玩家
        let nextIndex = (this.currentPlayerIndex + 1) % 4;
        let checkedCount = 0;

        while (checkedCount < 4) {
            const candPlayer = this.players[nextIndex];
            if (!candPlayer.hasPassed) {
                // 檢查是否還有任何可行走步
                const canMove = hasAnyValidMove(this.board, candPlayer.id, candPlayer.remainingPieces, candPlayer.isFirstMove);
                if (canMove) {
                    this.currentPlayerIndex = nextIndex;
                    this.onTurnChanged();
                    return;
                } else {
                    // 自動判定棄權
                    candPlayer.hasPassed = true;
                }
            }
            nextIndex = (nextIndex + 1) % 4;
            checkedCount++;
        }

        // 四方皆無法再下，結束遊戲
        this.handleGameOver();
    }

    onTurnChanged() {
        this.renderTurnIndicator();
        this.renderPieceTray();
        this.renderPlayerScores();
        this.updateActionButtons();

        const curPlayer = this.players[this.currentPlayerIndex];

        // 若為電腦回合，呼叫 AI 決策引擎；若為真人回合且手上仍有牌，自動為其選中手上第一塊骨牌
        if (curPlayer.isAI && !this.isGameOver) {
            this.handleAITurn(curPlayer);
        } else if (!curPlayer.isAI && !this.isGameOver && curPlayer.remainingPieces.length > 0) {
            this.selectPiece(curPlayer.remainingPieces[0]);
        }
    }

    handleAITurn(player) {
        this.isAIThinking = true;
        this.turnBannerEl.classList.add('ai-thinking');

        // 模擬短暫思考時間，使對局具備節奏感
        const thinkDelay = Math.floor(Math.random() * 300) + 400;

        setTimeout(() => {
            if (this.isGameOver) {
                this.isAIThinking = false;
                return;
            }

            const aiMove = chooseAIMove(
                this.board,
                player.id,
                player.remainingPieces,
                player.isFirstMove,
                this.aiDifficulty
            );

            this.isAIThinking = false;
            this.turnBannerEl.classList.remove('ai-thinking');

            if (aiMove) {
                this.executeMove(
                    player.id,
                    aiMove.pieceId,
                    aiMove.coords,
                    aiMove.originR,
                    aiMove.originC
                );
            } else {
                player.hasPassed = true;
                soundManager.playPass();
                this.advanceToNextTurn();
            }
        }, thinkDelay);
    }

    passCurrentTurn() {
        const curPlayer = this.players[this.currentPlayerIndex];
        if (curPlayer.isAI || this.isGameOver || this.isAIThinking) return;

        curPlayer.hasPassed = true;
        soundManager.playPass();
        this.unselectPiece();
        this.advanceToNextTurn();
    }

    undoLastMove() {
        if (this.isAIThinking || this.moveHistory.length === 0 || this.isGameOver) return;

        // 若在人機對戰模式，悔棋需連續退回到使用者的上一手
        let stepsToUndo = 1;
        if (this.gameMode === '1p') {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            // 若最後一手是 AI 下的，一路退到真人的上一步
            let foundHuman = false;
            for (let i = this.moveHistory.length - 1; i >= 0; i--) {
                if (this.moveHistory[i].playerId === 0) {
                    foundHuman = true;
                    stepsToUndo = this.moveHistory.length - i;
                    break;
                }
            }
            if (!foundHuman) return;
        }

        for (let s = 0; s < stepsToUndo; s++) {
            const move = this.moveHistory.pop();
            if (!move) break;

            const player = this.players[move.playerId];

            // 從棋盤清除
            move.coords.forEach(([r, c]) => {
                this.board[move.originR + r][move.originC + c] = -1;
            });

            // 歸還手牌
            if (move.piece) {
                player.remainingPieces.push(move.piece);
                player.remainingPieces.sort((a, b) => a.id - b.id);
                player.placedTilesCount -= move.coords.length;
            }

            player.isFirstMove = move.wasFirstMove;
            player.hasPassed = false;
            this.currentPlayerIndex = move.playerId;
        }

        // 解除其他玩家的 Pass 狀態以利重新檢驗
        this.players.forEach(p => {
            if (p.remainingPieces.length > 0) p.hasPassed = false;
        });

        this.updateBoardCells();
        this.renderPlayerScores();
        this.onTurnChanged();
    }

    selectPiece(piece) {
        if (this.isAIThinking || this.isGameOver) return;
        soundManager.playRotate();
        this.selectedPiece = piece;
        this.currentOrientation = normalizeCoords(piece.coords);
        this.highlightSelectedPieceInTray();
        this.updateActionButtons();
        this.updateGuideSteps(2);

        const curPlayer = this.players[this.currentPlayerIndex];
        if (curPlayer.isFirstMove) {
            this.showStatusToast(`已拿取【${piece.name}】，首步請移至專屬角落星號格！`, false);
        } else {
            this.showStatusToast(`已拿取【${piece.name}】，可按 R 鍵旋轉，移至棋盤角對角綠光處點擊！`, false);
        }

        if (this.hoverCell) {
            this.renderGhostPreview();
        }
    }

    unselectPiece() {
        this.selectedPiece = null;
        this.currentOrientation = null;
        this.highlightSelectedPieceInTray();
        this.clearGhostPreview();
        this.updateActionButtons();
        this.updateGuideSteps(1);
    }

    rotateSelectedPiece() {
        if (!this.currentOrientation) return;
        soundManager.playRotate();
        this.currentOrientation = rotateCoords(this.currentOrientation);
        this.renderGhostPreview();
        this.renderPiecePreviewInTray();
    }

    flipSelectedPiece() {
        if (!this.currentOrientation) return;
        soundManager.playRotate();
        this.currentOrientation = flipCoords(this.currentOrientation);
        this.renderGhostPreview();
        this.renderPiecePreviewInTray();
    }

    renderPieceTray() {
        this.pieceTrayEl.innerHTML = '';
        const curPlayer = this.players[this.currentPlayerIndex];

        if (curPlayer.isAI) {
            this.pieceTrayEl.innerHTML = `<div class="tray-ai-status"><i class="fa-solid fa-robot"></i> ${curPlayer.name} 電腦正在分析棋局...</div>`;
            return;
        }

        if (curPlayer.remainingPieces.length === 0) {
            this.pieceTrayEl.innerHTML = `<div class="tray-empty-status"><i class="fa-solid fa-crown"></i> 棋子已全數出清！太厲害了！</div>`;
            return;
        }

        curPlayer.remainingPieces.forEach(piece => {
            const itemEl = document.createElement('div');
            itemEl.className = 'piece-item';
            itemEl.dataset.pieceId = piece.id;

            if (this.selectedPiece && this.selectedPiece.id === piece.id) {
                itemEl.classList.add('selected');
            }

            // 繪製棋子形狀的迷你預覽網格
            const previewEl = this.createPieceSvgOrGrid(piece.coords, curPlayer.color, 16);
            itemEl.appendChild(previewEl);

            const labelEl = document.createElement('div');
            labelEl.className = 'piece-label';
            labelEl.textContent = `${piece.name} (${piece.size}格)`;
            itemEl.appendChild(labelEl);

            itemEl.addEventListener('click', () => {
                if (this.selectedPiece && this.selectedPiece.id === piece.id) {
                    // 再次點選已選中的棋子進行快速旋轉
                    this.rotateSelectedPiece();
                } else {
                    this.selectPiece(piece);
                }
            });

            this.pieceTrayEl.appendChild(itemEl);
        });
    }

    createPieceSvgOrGrid(coords, color, cellSize = 16) {
        const norm = normalizeCoords(coords);
        const { rows, cols } = getPieceDimensions(norm);

        const container = document.createElement('div');
        container.className = 'piece-mini-grid';
        container.style.display = 'grid';
        container.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
        container.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        container.style.gap = '2px';
        container.style.width = `${cols * cellSize + (cols - 1) * 2}px`;
        container.style.height = `${rows * cellSize + (rows - 1) * 2}px`;

        const set = new Set(norm.map(([r, c]) => `${r},${c}`));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'mini-cell';
                if (set.has(`${r},${c}`)) {
                    cell.style.backgroundColor = color;
                    cell.classList.add('filled');
                } else {
                    cell.style.opacity = '0';
                }
                container.appendChild(cell);
            }
        }
        return container;
    }

    highlightSelectedPieceInTray() {
        const items = this.pieceTrayEl.querySelectorAll('.piece-item');
        items.forEach(el => {
            const pId = parseInt(el.dataset.pieceId, 10);
            if (this.selectedPiece && pId === this.selectedPiece.id) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }

    renderPiecePreviewInTray() {
        if (!this.selectedPiece || !this.currentOrientation) return;
        const curPlayer = this.players[this.currentPlayerIndex];
        const selectedEl = this.pieceTrayEl.querySelector(`.piece-item[data-piece-id="${this.selectedPiece.id}"]`);
        if (selectedEl) {
            const oldGrid = selectedEl.querySelector('.piece-mini-grid');
            if (oldGrid) {
                const newGrid = this.createPieceSvgOrGrid(this.currentOrientation, curPlayer.color, 16);
                selectedEl.replaceChild(newGrid, oldGrid);
            }
        }
    }

    renderTurnIndicator() {
        const cur = this.players[this.currentPlayerIndex];
        let roleTag = cur.isAI ? '<span class="badge-ai"><i class="fa-solid fa-robot"></i> 電腦</span>' : '<span class="badge-human"><i class="fa-solid fa-user"></i> 玩家</span>';

        this.turnBannerEl.innerHTML = `
            <div class="turn-color-indicator" style="background-color: ${cur.color};">
                <i class="${cur.icon}"></i>
            </div>
            <div class="turn-text-info">
                <div class="turn-player-name">${cur.name} 的回合 ${roleTag}</div>
                <div class="turn-subtext">${cur.isFirstMove ? '<i class="fa-solid fa-star"></i> 首步須覆蓋專屬起點角落' : '<i class="fa-solid fa-link"></i> 須角對角相連，嚴禁邊邊相靠'}</div>
            </div>
        `;
    }

    renderPlayerScores() {
        this.playersListEl.innerHTML = '';
        this.players.forEach((p, idx) => {
            const item = document.createElement('div');
            item.className = 'player-card';
            if (idx === this.currentPlayerIndex) {
                item.classList.add('active-turn');
            }
            if (p.hasPassed) {
                item.classList.add('passed');
            }

            const remainingTilesCount = p.remainingPieces.reduce((acc, cur) => acc + cur.size, 0);

            item.innerHTML = `
                <div class="card-header" style="border-left-color: ${p.color};">
                    <span class="player-badge" style="background-color: ${p.color};">
                        <i class="${p.icon}"></i>
                    </span>
                    <span class="player-title">${p.name} ${p.isAI ? '(AI)' : ''}</span>
                    ${p.hasPassed ? '<span class="status-tag passed-tag"><i class="fa-solid fa-ban"></i> PASS</span>' : ''}
                </div>
                <div class="card-stats">
                    <div class="stat-col">
                        <span class="stat-lbl"><i class="fa-solid fa-cubes-stacked"></i> 已放置</span>
                        <span class="stat-val font-accent">${p.placedTilesCount} 格</span>
                    </div>
                    <div class="stat-col">
                        <span class="stat-lbl"><i class="fa-solid fa-box-archive"></i> 剩餘棋子</span>
                        <span class="stat-val">${p.remainingPieces.length} 塊 (${remainingTilesCount}格)</span>
                    </div>
                </div>
            `;
            this.playersListEl.appendChild(item);
        });
    }

    updateActionButtons() {
        const hasSelection = !!this.selectedPiece;
        this.btnRotate.disabled = !hasSelection;
        this.btnFlip.disabled = !hasSelection;
        this.btnUndo.disabled = this.moveHistory.length === 0;

        const curPlayer = this.players[this.currentPlayerIndex];
        this.btnPass.disabled = curPlayer.isAI || this.isGameOver;
    }

    checkGameOver() {
        return this.players.every(p => p.hasPassed || p.remainingPieces.length === 0);
    }

    handleGameOver() {
        this.isGameOver = true;
        soundManager.playVictory();

        // 依據 Blokus 官方正式計分規則：
        // 剩餘每格記 -1 分 (或已放每格 +1)
        // 出清全部 21 塊棋子額外獲贈 +15 分
        // 若最後一塊剛好是 1 格骨牌 (I1)，額外再獎勵 +5 分（總計 +20 分）
        const results = this.players.map(p => {
            const remainingTiles = p.remainingPieces.reduce((acc, cur) => acc + cur.size, 0);
            let score = -remainingTiles; // 基本負分
            let bonus = 0;

            if (p.remainingPieces.length === 0) {
                bonus += 15;
                if (p.lastPieceId === 1) { // I1 單骨牌
                    bonus += 5;
                }
            }
            score += bonus;

            return {
                player: p,
                remainingTiles,
                placedTiles: p.placedTilesCount,
                bonus,
                finalScore: score
            };
        });

        // 排序：分數最高者排第一
        results.sort((a, b) => b.finalScore - a.finalScore);

        this.renderGameOverModal(results);
    }

    renderGameOverModal(results) {
        if (!this.gameResultTableEl || !this.modalGameOverEl) return;

        let tableHtml = `
            <thead>
                <tr>
                    <th>名次</th>
                    <th>玩家</th>
                    <th>已放置</th>
                    <th>剩餘格數</th>
                    <th>全出獎勵</th>
                    <th>總得分</th>
                </tr>
            </thead>
            <tbody>
        `;

        results.forEach((res, rank) => {
            let rankIcon = '';
            if (rank === 0) rankIcon = '<i class="fa-solid fa-trophy rank-gold"></i> 冠軍';
            else if (rank === 1) rankIcon = '<i class="fa-solid fa-medal rank-silver"></i> 亞軍';
            else if (rank === 2) rankIcon = '<i class="fa-solid fa-medal rank-bronze"></i> 季軍';
            else rankIcon = `<span class="rank-num">${rank + 1}</span>`;

            tableHtml += `
                <tr class="${rank === 0 ? 'winner-row' : ''}">
                    <td>${rankIcon}</td>
                    <td>
                        <span class="player-color-dot" style="background-color: ${res.player.color};"></span>
                        <strong>${res.player.name}</strong> ${res.player.isAI ? '(AI)' : ''}
                    </td>
                    <td>${res.placedTiles} 格</td>
                    <td>${res.remainingTiles} 格</td>
                    <td>${res.bonus > 0 ? `<span class="bonus-badge">+${res.bonus}</span>` : '0'}</td>
                    <td><strong class="score-highlight">${res.finalScore > 0 ? '+' + res.finalScore : res.finalScore} 分</strong></td>
                </tr>
            `;
        });

        tableHtml += '</tbody>';
        this.gameResultTableEl.innerHTML = tableHtml;
        this.modalGameOverEl.classList.add('active');
    }
}

// 頁面加載完成後啟動遊戲
document.addEventListener('DOMContentLoaded', () => {
    window.blokushenGame = new BlokuShenGame();
});
