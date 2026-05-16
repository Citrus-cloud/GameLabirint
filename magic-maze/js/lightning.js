// Файл: magic-maze/js/lightning.js
// Система «Удар молнии» — опасность с 4-го уровня
// Молния бьёт извне, вызывает дрожание экрана, наносит урон

class LightningSystem {
    constructor() {
        // Состояние системы
        this.active = false;           // Активна ли система (уровень >= 4)
        this.level = 1;
        
        // Таймер между ударами
        this.strikeTimer = 0;
        this.nextStrikeInterval = 0;   // Когда ударит следующая молния
        
        // Фазы удара
        this.state = 'idle';           // idle, charging, striking, aftermath
        this.chargeTimer = 0;          // Время зарядки (3000мс)
        this.chargeMaxTime = 3000;
        this.strikeTime = 0;           // Время отображения удара
        this.aftermathTimer = 0;       // Время дымящегося следа
        
        // Целевая клетка
        this.targetX = -1;
        this.targetY = -1;
        
        // Направление удара (откуда летит молния)
        this.strikeEdge = 'top';       // top, left, right, bottom
        this.strikeStartX = 0;
        this.strikeStartY = 0;
        
        // Последнее направление движения лисёнка
        this.lastDirection = 'right';
        
        // Визуальные параметры молнии
        this.boltSegments = [];        // Сегменты зигзага
        this.boltBranches = [];        // Ответвления
        this.boltAlpha = 0;            // Прозрачность молнии
        
        // Искры от удара
        this.sparks = [];
        
        // Дымящийся след
        this.smokeParticles = [];
        
        // Дрожание экрана
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;
        
        // Вспышка экрана
        this.flashAlpha = 0;
        
        // Пульсация зарядки
        this.pulsePhase = 0;
        
        // Позиции старта и финиша (молния не бьёт туда)
        this.startPos = null;
        this.finishPos = null;
        
        // Матрица лабиринта (для проверки стен)
        this.matrix = null;
        this.cellSize = 0;
    }

    // Инициализация для нового уровня
    init(level, matrix, cellSize, startPos, finishPos) {
        this.level = level;
        this.matrix = matrix;
        this.cellSize = cellSize;
        this.startPos = startPos;
        this.finishPos = finishPos;
        
        // Молнии начинаются с 4-го уровня
        this.active = level >= 4;
        
        if (this.active) {
            this._scheduleNextStrike();
        }
        
        // Сброс состояния
        this.state = 'idle';
        this.chargeTimer = 0;
        this.strikeTime = 0;
        this.aftermathTimer = 0;
        this.targetX = -1;
        this.targetY = -1;
        this.boltSegments = [];
        this.boltBranches = [];
        this.sparks = [];
        this.smokeParticles = [];
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.flashAlpha = 0;
    }

    // Расписание следующего удара
    _scheduleNextStrike() {
        if (this.level >= 10) {
            this.nextStrikeInterval = 8000 + Math.random() * 4000;  // 8-12с
        } else if (this.level >= 7) {
            this.nextStrikeInterval = 10000 + Math.random() * 5000; // 10-15с
        } else {
            this.nextStrikeInterval = 12000 + Math.random() * 6000; // 12-18с
        }
        this.strikeTimer = 0;
    }

    // Обновление направления лисёнка (вызывается из main.js при движении)
    updatePlayerDirection(direction) {
        this.lastDirection = direction;
    }

    // Главный метод обновления
    update(deltaTime, playerGridX, playerGridY) {
        if (!this.active) return;
        
        // Обновление дрожания
        this._updateShake(deltaTime);
        
        // Обновление вспышки
        if (this.flashAlpha > 0) {
            this.flashAlpha -= deltaTime * 0.008;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
        
        // Обновление искр
        this._updateSparks(deltaTime);
        
        // Обновление дыма
        this._updateSmoke(deltaTime);
        
        switch (this.state) {
            case 'idle':
                this._updateIdle(deltaTime, playerGridX, playerGridY);
                break;
            case 'charging':
                this._updateCharging(deltaTime, playerGridX, playerGridY);
                break;
            case 'striking':
                this._updateStriking(deltaTime);
                break;
            case 'aftermath':
                this._updateAftermath(deltaTime);
                break;
        }
    }

    // === ФАЗА ОЖИДАНИЯ ===
    _updateIdle(deltaTime, playerGridX, playerGridY) {
        // Не бьём если лисёнок на старте или финише
        if (this._isOnSafeCell(playerGridX, playerGridY)) {
            return;
        }
        
        this.strikeTimer += deltaTime;
        
        if (this.strikeTimer >= this.nextStrikeInterval) {
            // Начинаем зарядку
            this._startCharging(playerGridX, playerGridY);
        }
    }

    // === НАЧАЛО ЗАРЯДКИ ===
    _startCharging(playerGridX, playerGridY) {
        // Определяем целевую клетку
        const target = this._findTargetCell(playerGridX, playerGridY);
        
        if (!target) {
            // Не удалось найти цель — пропускаем
            this._scheduleNextStrike();
            return;
        }
        
        this.targetX = target.x;
        this.targetY = target.y;
        this.state = 'charging';
        this.chargeTimer = 0;
        this.pulsePhase = 0;
    }

    // === ФАЗА ЗАРЯДКИ (3 секунды) ===
    _updateCharging(deltaTime, playerGridX, playerGridY) {
        this.chargeTimer += deltaTime;
        this.pulsePhase += deltaTime * 0.001;
        
        // Нарастающее дрожание
        const progress = this.chargeTimer / this.chargeMaxTime;
        this.shakeIntensity = progress * 2; // 0 → 2 пикселя
        
        if (this.chargeTimer >= this.chargeMaxTime) {
            // УДАР!
            this._executeStrike(playerGridX, playerGridY);
        }
    }

    // === ВЫПОЛНЕНИЕ УДАРА ===
    _executeStrike(playerGridX, playerGridY) {
        this.state = 'striking';
        this.strikeTime = 0;
        
        // Определяем откуда летит молния (случайный край)
        const edges = ['top', 'left', 'right', 'bottom'];
        this.strikeEdge = edges[Math.floor(Math.random() * 4)];
        
        // Координаты начала молнии (в пикселях от края canvas)
        this._calculateStrikeStart();
        
        // Генерируем зигзаг молнии
        this._generateBolt();
        
        // Вспышка экрана
        this.flashAlpha = 1;
        
        // Сильное дрожание
        this.shakeIntensity = 5;
        
        // Искры в точке удара
        this._generateSparks();
        
        // Прозрачность молнии
        this.boltAlpha = 1;
        
        return {
            targetX: this.targetX,
            targetY: this.targetY,
            hitPlayer: (playerGridX === this.targetX && playerGridY === this.targetY)
        };
    }

    // === ФАЗА УДАРА (короткая, ~400мс) ===
    _updateStriking(deltaTime) {
        this.strikeTime += deltaTime;
        this.boltAlpha = Math.max(0, 1 - this.strikeTime / 400);
        
        if (this.strikeTime >= 400) {
            // Переходим к последствиям
            this.state = 'aftermath';
            this.aftermathTimer = 2000;
            this._generateSmoke();
        }
    }

    // === ФАЗА ПОСЛЕДСТВИЙ (дымящийся след, 2 секунды) ===
    _updateAftermath(deltaTime) {
        this.aftermathTimer -= deltaTime;
        
        if (this.aftermathTimer <= 0) {
            this.state = 'idle';
            this.targetX = -1;
            this.targetY = -1;
            this._scheduleNextStrike();
        }
    }

    // === ПОИСК ЦЕЛЕВОЙ КЛЕТКИ ===
    _findTargetCell(playerX, playerY) {
        let dx = 0, dy = 0;
        
        switch (this.lastDirection) {
            case 'up': dy = -1; break;
            case 'down': dy = 1; break;
            case 'left': dx = -1; break;
            case 'right': dx = 1; break;
        }
        
        // Ищем клетку на расстоянии 5 (или ближе, если стена)
        for (let dist = 5; dist >= 3; dist--) {
            const tx = playerX + dx * dist;
            const ty = playerY + dy * dist;
            
            // Проверяем границы
            if (tx < 0 || ty < 0 || !this.matrix || 
                ty >= this.matrix.length || tx >= this.matrix[0].length) {
                continue;
            }
            
            // Проверяем, что это проход (не стена)
            if (this.matrix[ty][tx] !== GAME_CONSTANTS.CELL_TYPES.WALL) {
                // Не бьём в клетку старта/финиша
                if (this._isOnSafeCell(tx, ty)) continue;
                return { x: tx, y: ty };
            }
        }
        
        // Если не нашли — пробуем случайную клетку рядом
        const candidates = [];
        for (let r = 3; r <= 6; r++) {
            const tx = playerX + dx * r;
            const ty = playerY + dy * r;
            if (tx >= 0 && ty >= 0 && this.matrix &&
                ty < this.matrix.length && tx < this.matrix[0].length &&
                this.matrix[ty][tx] !== GAME_CONSTANTS.CELL_TYPES.WALL &&
                !this._isOnSafeCell(tx, ty)) {
                candidates.push({ x: tx, y: ty });
            }
        }
        
        if (candidates.length > 0) {
            return candidates[0];
        }
        
        return null; // Не удалось найти цель
    }

    // Проверка безопасной клетки (старт/финиш)
    _isOnSafeCell(x, y) {
        if (this.startPos && x === this.startPos.x && y === this.startPos.y) return true;
        if (this.finishPos && x === this.finishPos.x && y === this.finishPos.y) return true;
        return false;
    }

    // === ГЕНЕРАЦИЯ ЗИГЗАГА МОЛНИИ ===
    _calculateStrikeStart() {
        // Начальная точка от края (в координатах canvas, будет преобразована при отрисовке)
        // Используем относительные координаты — они будут преобразованы в render
        switch (this.strikeEdge) {
            case 'top':
                this.strikeStartX = this.targetX * this.cellSize + this.cellSize / 2 + (Math.random() - 0.5) * 100;
                this.strikeStartY = -20;
                break;
            case 'bottom':
                this.strikeStartX = this.targetX * this.cellSize + this.cellSize / 2 + (Math.random() - 0.5) * 100;
                this.strikeStartY = (this.matrix ? this.matrix.length * this.cellSize : 500) + 20;
                break;
            case 'left':
                this.strikeStartX = -20;
                this.strikeStartY = this.targetY * this.cellSize + this.cellSize / 2 + (Math.random() - 0.5) * 100;
                break;
            case 'right':
                this.strikeStartX = (this.matrix ? this.matrix[0].length * this.cellSize : 500) + 20;
                this.strikeStartY = this.targetY * this.cellSize + this.cellSize / 2 + (Math.random() - 0.5) * 100;
                break;
        }
    }

    _generateBolt() {
        this.boltSegments = [];
        this.boltBranches = [];
        
        const endX = this.targetX * this.cellSize + this.cellSize / 2;
        const endY = this.targetY * this.cellSize + this.cellSize / 2;
        
        // Главный зигзаг
        const segments = 12 + Math.floor(Math.random() * 6);
        let currentX = this.strikeStartX;
        let currentY = this.strikeStartY;
        const stepX = (endX - this.strikeStartX) / segments;
        const stepY = (endY - this.strikeStartY) / segments;
        
        this.boltSegments.push({ x: currentX, y: currentY });
        
        for (let i = 1; i < segments; i++) {
            currentX += stepX + (Math.random() - 0.5) * 20;
            currentY += stepY + (Math.random() - 0.5) * 20;
            this.boltSegments.push({ x: currentX, y: currentY });
            
            // Ответвления (30% шанс)
            if (Math.random() < 0.3) {
                const branchLen = 2 + Math.floor(Math.random() * 3);
                const branch = [{ x: currentX, y: currentY }];
                let bx = currentX, by = currentY;
                const bAngle = Math.random() * Math.PI * 2;
                for (let j = 0; j < branchLen; j++) {
                    bx += Math.cos(bAngle) * 8 + (Math.random() - 0.5) * 10;
                    by += Math.sin(bAngle) * 8 + (Math.random() - 0.5) * 10;
                    branch.push({ x: bx, y: by });
                }
                this.boltBranches.push(branch);
            }
        }
        
        // Финальная точка — точно в цель
        this.boltSegments.push({ x: endX, y: endY });
    }

    // === ГЕНЕРАЦИЯ ИСКР ===
    _generateSparks() {
        this.sparks = [];
        const cx = this.targetX * this.cellSize + this.cellSize / 2;
        const cy = this.targetY * this.cellSize + this.cellSize / 2;
        const count = 20 + Math.floor(Math.random() * 11); // 20-30
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.sparks.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 500 + Math.random() * 500,
                maxLife: 800,
                size: 1.5 + Math.random() * 2.5,
                color: Math.random() < 0.5 ? '#4fc3f7' : '#ffffff'
            });
        }
    }

    // === ГЕНЕРАЦИЯ ДЫМА ===
    _generateSmoke() {
        const cx = this.targetX * this.cellSize + this.cellSize / 2;
        const cy = this.targetY * this.cellSize + this.cellSize / 2;
        
        for (let i = 0; i < 8; i++) {
            this.smokeParticles.push({
                x: cx + (Math.random() - 0.5) * 10,
                y: cy + (Math.random() - 0.5) * 5,
                vy: -0.3 - Math.random() * 0.5,
                life: 2000,
                maxLife: 2000,
                size: 3 + Math.random() * 4,
                alpha: 0.5
            });
        }
    }

    // === ОБНОВЛЕНИЕ ДРОЖАНИЯ ===
    _updateShake(deltaTime) {
        if (this.shakeIntensity > 0.1) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeIntensity *= Math.pow(this.shakeDecay, deltaTime / 16);
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
        }
    }

    // === ОБНОВЛЕНИЕ ИСКР ===
    _updateSparks(deltaTime) {
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.life -= deltaTime;
            s.x += s.vx * (deltaTime / 16);
            s.y += s.vy * (deltaTime / 16);
            s.vy += 0.1 * (deltaTime / 16); // гравитация
            s.vx *= 0.98;
            if (s.life <= 0) this.sparks.splice(i, 1);
        }
    }

    // === ОБНОВЛЕНИЕ ДЫМА ===
    _updateSmoke(deltaTime) {
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.life -= deltaTime;
            p.y += p.vy * (deltaTime / 16);
            p.alpha = (p.life / p.maxLife) * 0.4;
            p.size += deltaTime * 0.002;
            if (p.life <= 0) this.smokeParticles.splice(i, 1);
        }
    }



    // =======================================================================
    // ОТРИСОВКА — вызывается из renderer.js ПОВЕРХ ВСЕГО
    // =======================================================================
    render(ctx, offsetX, offsetY, canvasWidth, canvasHeight) {
        if (!this.active) return;
        
        // Вспышка экрана (поверх всего)
        if (this.flashAlpha > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha * 0.7})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        // Зарядка — свечение целевой клетки
        if (this.state === 'charging' && this.targetX >= 0) {
            this._renderCharging(ctx, offsetX, offsetY);
        }
        
        // Молния (удар)
        if (this.state === 'striking' && this.boltAlpha > 0) {
            this._renderBolt(ctx, offsetX, offsetY);
        }
        
        // Искры
        this._renderSparks(ctx, offsetX, offsetY);
        
        // Дымящийся след
        if (this.state === 'aftermath' && this.targetX >= 0) {
            this._renderAftermath(ctx, offsetX, offsetY);
        }
    }

    // --- Отрисовка зарядки (пульсирующее свечение на полу) ---
    _renderCharging(ctx, offsetX, offsetY) {
        const cx = offsetX + this.targetX * this.cellSize + this.cellSize / 2;
        const cy = offsetY + this.targetY * this.cellSize + this.cellSize / 2;
        const progress = this.chargeTimer / this.chargeMaxTime;
        
        // Частота пульсации: первые 2с = 2Гц, последняя 1с = 4Гц
        let pulseFreq;
        if (progress < 0.67) {
            pulseFreq = 2; // 2 Гц
        } else {
            pulseFreq = 4; // 4 Гц
        }
        
        const pulse = Math.abs(Math.sin(this.pulsePhase * Math.PI * pulseFreq));
        
        // Яркость: от тёмно-синего к почти белому
        const brightness = progress;
        const r = Math.floor(30 + brightness * 200);
        const g = Math.floor(100 + brightness * 155);
        const b = Math.floor(200 + brightness * 55);
        const alpha = 0.3 + pulse * 0.5 * brightness;
        
        // Свечение клетки
        ctx.save();
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`;
        ctx.shadowBlur = 15 + pulse * 10 * brightness;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        
        // Прямоугольник с мягкими краями
        const pad = 4;
        ctx.beginPath();
        const rx = cx - this.cellSize / 2 + pad;
        const ry = cy - this.cellSize / 2 + pad;
        const rw = this.cellSize - pad * 2;
        const rh = this.cellSize - pad * 2;
        
        // Скруглённый прямоугольник
        const radius = 4;
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    // --- Отрисовка молнии (зигзаг) ---
    _renderBolt(ctx, offsetX, offsetY) {
        if (this.boltSegments.length < 2) return;
        
        ctx.save();
        ctx.globalAlpha = this.boltAlpha;
        
        // Внешнее свечение (широкая синяя линия)
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.6)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#4fc3f7';
        ctx.shadowBlur = 20;
        
        ctx.beginPath();
        ctx.moveTo(offsetX + this.boltSegments[0].x, offsetY + this.boltSegments[0].y);
        for (let i = 1; i < this.boltSegments.length; i++) {
            ctx.lineTo(offsetX + this.boltSegments[i].x, offsetY + this.boltSegments[i].y);
        }
        ctx.stroke();
        
        // Сердцевина (тонкая белая линия)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(offsetX + this.boltSegments[0].x, offsetY + this.boltSegments[0].y);
        for (let i = 1; i < this.boltSegments.length; i++) {
            ctx.lineTo(offsetX + this.boltSegments[i].x, offsetY + this.boltSegments[i].y);
        }
        ctx.stroke();
        
        // Ответвления
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        
        for (const branch of this.boltBranches) {
            if (branch.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(offsetX + branch[0].x, offsetY + branch[0].y);
            for (let i = 1; i < branch.length; i++) {
                ctx.lineTo(offsetX + branch[i].x, offsetY + branch[i].y);
            }
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // --- Отрисовка искр ---
    _renderSparks(ctx, offsetX, offsetY) {
        for (const s of this.sparks) {
            const alpha = s.life / s.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = s.color;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(offsetX + s.x, offsetY + s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    // --- Отрисовка последствий (дымящийся след) ---
    _renderAftermath(ctx, offsetX, offsetY) {
        const cx = offsetX + this.targetX * this.cellSize + this.cellSize / 2;
        const cy = offsetY + this.targetY * this.cellSize + this.cellSize / 2;
        
        // Тёмное пятно на полу
        const afterProgress = this.aftermathTimer / 2000;
        ctx.globalAlpha = afterProgress * 0.5;
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(cx, cy, this.cellSize * 0.3, this.cellSize * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Дым
        for (const p of this.smokeParticles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = `rgba(150, 150, 150, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(offsetX + p.x, offsetY + p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // === ПОЛУЧЕНИЕ ДАННЫХ ДЛЯ GAME LOOP ===
    
    // Получить смещение дрожания для canvas
    getShakeOffset() {
        return { x: this.shakeX, y: this.shakeY };
    }

    // Проверить, произошёл ли удар (для нанесения урона)
    // Возвращает объект с информацией или null
    checkStrike(playerGridX, playerGridY, enemies, crystals) {
        if (this.state !== 'striking' || this.strikeTime > 50) return null;
        
        // Этот метод вызывается один раз в момент удара (strikeTime ~ 0)
        const result = {
            hitPlayer: false,
            hitEnemy: null,
            hitCrystal: null
        };
        
        // Попадание по лисёнку
        if (playerGridX === this.targetX && playerGridY === this.targetY) {
            result.hitPlayer = true;
        }
        
        // Попадание по врагу
        if (enemies) {
            for (const enemy of enemies) {
                if (enemy.alive && enemy.gridX === this.targetX && enemy.gridY === this.targetY) {
                    result.hitEnemy = enemy;
                    break;
                }
            }
        }
        
        // Попадание по кристаллу
        if (crystals) {
            for (const crystal of crystals) {
                if (!crystal.collected && crystal.x === this.targetX && crystal.y === this.targetY) {
                    result.hitCrystal = crystal;
                    break;
                }
            }
        }
        
        return result;
    }

    // Состояние для внешнего кода
    isCharging() { return this.state === 'charging'; }
    isStriking() { return this.state === 'striking'; }
    isActive() { return this.active; }
    getState() { return this.state; }
}
