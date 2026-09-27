/**
 * BlokuShen - 吉祥物 (LiyuChillGuy) 拖曳與特效邏輯
 * 初始出現在網頁左下角，支援滑鼠與觸控自由拖曳至全螢幕任意位置
 * 懸停具備霓虹彩色發光與抖動特效，點擊播放專屬互動音效
 * 遵守規範：繁體中文註解
 */

class MascotController {
    constructor() {
        this.container = document.getElementById('mascot-container');
        this.img = document.getElementById('mascot-image');
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.initialLeft = 0;
        this.initialTop = 0;
        this.hasMoved = false;

        this.init();
    }

    init() {
        if (!this.container) return;

        // 綁定現代 Pointer Events，同時相容觸控螢幕與滑鼠
        this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
        window.addEventListener('pointercancel', this.onPointerUp.bind(this));

        // 視窗尺寸改變時防溢出處理
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // 雙擊可讓吉祥物歸位回左下角
        this.container.addEventListener('dblclick', () => {
            this.resetToInitialCorner();
        });
    }

    resetToInitialCorner() {
        this.container.style.position = 'fixed';
        this.container.style.bottom = '24px';
        this.container.style.left = '24px';
        this.container.style.top = 'auto';
        this.container.style.right = 'auto';
    }

    onPointerDown(e) {
        // 避免右鍵觸發拖曳
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        this.isDragging = true;
        this.hasMoved = false;
        this.startX = e.clientX;
        this.startY = e.clientY;

        const rect = this.container.getBoundingClientRect();
        this.initialLeft = rect.left;
        this.initialTop = rect.top;

        // 清除 bottom 與 right 以免與 top/left 衝突
        this.container.style.bottom = 'auto';
        this.container.style.right = 'auto';
        this.container.style.top = `${this.initialTop}px`;
        this.container.style.left = `${this.initialLeft}px`;

        this.container.classList.add('is-dragging');
        this.container.setPointerCapture(e.pointerId);
    }

    onPointerMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        // 若位移超過 4 像素則判定為拖曳而非單純點擊
        if (Math.hypot(deltaX, deltaY) > 4) {
            this.hasMoved = true;
        }

        let newLeft = this.initialLeft + deltaX;
        let newTop = this.initialTop + deltaY;

        // 邊界防溢出處理，限制在視窗可視範圍內
        const mascotWidth = this.container.offsetWidth;
        const mascotHeight = this.container.offsetHeight;
        const maxLeft = window.innerWidth - mascotWidth - 6;
        const maxTop = window.innerHeight - mascotHeight - 6;

        newLeft = Math.max(6, Math.min(maxLeft, newLeft));
        newTop = Math.max(6, Math.min(maxTop, newTop));

        this.container.style.left = `${newLeft}px`;
        this.container.style.top = `${newTop}px`;
    }

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.container.classList.remove('is-dragging');

        try {
            this.container.releasePointerCapture(e.pointerId);
        } catch (err) {
            // 忽略釋放捕捉失敗情況
        }

        // 若沒有大幅移動，判定為單純點擊，播放專屬音效
        if (!this.hasMoved) {
            this.triggerClickInteraction();
        }
    }

    onWindowResize() {
        const rect = this.container.getBoundingClientRect();
        const mascotWidth = this.container.offsetWidth;
        const mascotHeight = this.container.offsetHeight;

        let newLeft = Math.min(rect.left, window.innerWidth - mascotWidth - 10);
        let newTop = Math.min(rect.top, window.innerHeight - mascotHeight - 10);

        newLeft = Math.max(10, newLeft);
        newTop = Math.max(10, newTop);

        this.container.style.left = `${newLeft}px`;
        this.container.style.top = `${newTop}px`;
    }

    triggerClickInteraction() {
        if (window.soundManager) {
            window.soundManager.playMascotChirp();
        }
    }

    // 保留相容空函式，不顯示任何對話框
    speak() {}
}

// 於 DOM 載入後自動實例化
document.addEventListener('DOMContentLoaded', () => {
    window.mascotInstance = new MascotController();
});
