// Файл: magic-maze/js/input.js
// Мгновенная обработка ввода: свайпы, клавиатура, тапы.
// КЛЮЧЕВАЯ ОПТИМИЗАЦИЯ ОТЗЫВЧИВОСТИ:
//   - События touch/pointer/keydown НЕ привязаны к игровому циклу.
//   - При свайпе колбэк onDirection вызывается СИНХРОННО, прямо из обработчика
//     события, не дожидаясь следующего кадра requestAnimationFrame.
//   - Это даёт нулевую задержку отклика управления.
//   - Очередь буферизует максимум один следующий ход во время анимации.

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;

        // Колбэки, которые задаются извне (Game)
        this.onDirection = null; // (dir) => void — вызывается при свайпе/клавише со стрелкой
        this.onTap = null;       // (x, y) => void — вызывается при тапе/клике (меню, пауза)

        // Параметры свайпа
        this.swipeThreshold = 24;     // Порог в пикселях, чтобы засчитать свайп
        this.tapMaxDuration = 250;    // Макс. длительность для тапа (мс)

        // Состояние касания
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._touchStartTime = 0;
        this._touchActive = false;

        // Маркер: уже выпустили свайп в этом жесте? (чтобы не дублировать)
        this._swipeFired = false;

        this._bind();
    }

    _bind() {
        const c = this.canvas;

        // === TOUCH (мобильные) ===
        // touchstart: фиксируем начальную точку
        c.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            this._beginGesture(t.clientX, t.clientY);
        }, { passive: false });

        // touchmove: пытаемся выпустить свайп ДО touchend (моментальная реакция)
        c.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this._touchActive || this._swipeFired) return;
            const t = e.touches[0];
            this._tryFireSwipe(t.clientX, t.clientY);
        }, { passive: false });

        // touchend: если свайп ещё не выпущен — выпускаем; иначе считаем тапом
        c.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this._touchActive) return;
            const t = e.changedTouches[0];
            this._endGesture(t.clientX, t.clientY);
        }, { passive: false });

        c.addEventListener('touchcancel', () => {
            this._touchActive = false;
            this._swipeFired = false;
        }, { passive: false });

        // === POINTER / MOUSE (desktop fallback) ===
        // Используем mouse-события — pointer уже частично покрывается touch на мобильных
        c.addEventListener('mousedown', (e) => {
            this._beginGesture(e.clientX, e.clientY);
        });
        c.addEventListener('mousemove', (e) => {
            if (!this._touchActive || this._swipeFired) return;
            this._tryFireSwipe(e.clientX, e.clientY);
        });
        c.addEventListener('mouseup', (e) => {
            if (!this._touchActive) return;
            this._endGesture(e.clientX, e.clientY);
        });
        c.addEventListener('mouseleave', () => {
            this._touchActive = false;
            this._swipeFired = false;
        });

        // === КЛАВИАТУРА ===
        window.addEventListener('keydown', (e) => this._handleKey(e));
    }

    // Начало жеста — пользователь только что прикоснулся
    _beginGesture(x, y) {
        this._touchStartX = x;
        this._touchStartY = y;
        this._touchStartTime = performance.now();
        this._touchActive = true;
        this._swipeFired = false;
    }

    // Попытка выпустить свайп немедленно при движении пальца
    // Это ключ к мгновенной отзывчивости: НЕ ждём отпускания пальца
    _tryFireSwipe(x, y) {
        const dx = x - this._touchStartX;
        const dy = y - this._touchStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.swipeThreshold) return;

        const dir = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');

        this._swipeFired = true;
        // Синхронный вызов: лисёнок реагирует прямо здесь, не дожидаясь кадра
        if (this.onDirection) this.onDirection(dir);
    }

    // Окончание жеста — либо тап, либо последний шанс выпустить свайп
    _endGesture(x, y) {
        const dx = x - this._touchStartX;
        const dy = y - this._touchStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const duration = performance.now() - this._touchStartTime;

        this._touchActive = false;

        if (this._swipeFired) {
            // Свайп уже отправлен в touchmove — больше ничего не делаем
            this._swipeFired = false;
            return;
        }

        if (dist < this.swipeThreshold && duration < 1000) {
            // Это тап — передаём координаты в обработчик меню/паузы
            if (this.onTap) {
                const rect = this.canvas.getBoundingClientRect();
                this.onTap(x - rect.left, y - rect.top);
            }
            return;
        }

        if (dist >= this.swipeThreshold) {
            const dir = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'right' : 'left')
                : (dy > 0 ? 'down' : 'up');
            if (this.onDirection) this.onDirection(dir);
        }
    }

    // Обработка клавиатуры — стрелки/WASD синхронно дёргают onDirection
    _handleKey(e) {
        let dir = null;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                dir = 'up'; break;
            case 'ArrowDown': case 's': case 'S':
                dir = 'down'; break;
            case 'ArrowLeft': case 'a': case 'A':
                dir = 'left'; break;
            case 'ArrowRight': case 'd': case 'D':
                dir = 'right'; break;
            case 'Escape': case 'p': case 'P':
                if (this.onPause) this.onPause();
                return;
        }
        if (dir && this.onDirection) {
            // Предотвращаем прокрутку страницы стрелками
            e.preventDefault();
            this.onDirection(dir);
        }
    }
}
