// Файл: magic-maze/js/player.js
// Логика лисёнка Фокси: движение, анимации, усиления, неуязвимость

class Player {
    constructor(startPos, cellSize) {
        this.gridX = startPos.x;
        this.gridY = startPos.y;
        this.cellSize = cellSize;
        
        // Позиция для плавной анимации (в пикселях)
        this.pixelX = startPos.x * cellSize;
        this.pixelY = startPos.y * cellSize;
        this.targetX = this.pixelX;
        this.targetY = this.pixelY;
        
        // Состояние
        this.lives = GAME_CONSTANTS.PLAYER.LIVES;
        this.score = 0;
        this.isMoving = false;
        this.moveProgress = 0;
        this.moveStartX = this.pixelX;
        this.moveStartY = this.pixelY;
        
        // Неуязвимость
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.blinkTimer = 0;
        this.isVisible = true;
        
        // Замедление (паутина)
        this.isSlowed = false;
        this.slowTimer = 0;
        
        // Усиления
        this.activePower = null;
        this.powerTimer = 0;
        
        // Анимации
        this.bounceOffset = 0;
        this.bouncePhase = 0;
        this.tailAngle = 0;
        this.tailPhase = 0;
        this.facingDirection = 'right'; // right, left, up, down
        this.dustParticles = [];
        
        // Победная анимация
        this.isVictory = false;
        this.victoryRotation = 0;
        this.victoryJump = 0;

        // ======================================================================
        // УЛУЧШЕНИЕ 3: Система эмоций лисёнка
        // Эмоции — временные состояния, которые проигрываются параллельно движению
        // ======================================================================
        this.emotionState = 'neutral';  // neutral, happy, surprised, scared, celebrating, sad, idle
        this.emotionTimer = 0;          // Оставшееся время эмоции (мс)
        this.emotionPhase = 0;          // Фаза анимации эмоции
        this.emotionIntensity = 1;      // Интенсивность (затухает к концу)
        
        // Таймер бездействия (для зевоты)
        this.idleTimer = 0;
        this.lastInputTime = 0;
        
        // Параметры анимации эмоций
        this.emotionSquash = 1;         // Сжатие (squash & stretch)
        this.emotionStretch = 1;
        this.emotionJumpOffset = 0;     // Подпрыгивание при радости
        this.emotionEyeScale = 1;       // Масштаб глаз
        this.emotionMouthState = 'normal'; // normal, smile, ooo, sad, yawn
        this.emotionEarAngle = 0;       // Угол ушей (прижаты при испуге)
        this.emotionSparkles = [];      // Блёстки вокруг при удивлении
        this.emotionTears = [];         // Слёзки при грусти
    }

    // Получить текущую скорость передвижения (мс на клетку)
    getMoveDuration() {
        let duration = GAME_CONSTANTS.PLAYER.MOVE_DURATION;
        
        if (this.isSlowed) {
            duration /= GAME_CONSTANTS.PLAYER.SLOWDOWN_MULTIPLIER;
        }
        
        if (this.activePower === 'dash') {
            duration /= GAME_CONSTANTS.PLAYER.DASH_MULTIPLIER;
        }
        
        return duration;
    }

    // Начать движение к соседней клетке
    moveTo(newGridX, newGridY) {
        if (this.isMoving) return false;
        
        // Определяем направление
        if (newGridX > this.gridX) this.facingDirection = 'right';
        else if (newGridX < this.gridX) this.facingDirection = 'left';
        else if (newGridY > this.gridY) this.facingDirection = 'down';
        else if (newGridY < this.gridY) this.facingDirection = 'up';
        
        this.gridX = newGridX;
        this.gridY = newGridY;
        this.moveStartX = this.pixelX;
        this.moveStartY = this.pixelY;
        this.targetX = newGridX * this.cellSize;
        this.targetY = newGridY * this.cellSize;
        this.isMoving = true;
        this.moveProgress = 0;
        
        // Добавляем пылинки при движении
        if (this.activePower === 'dash') {
            this._addDustParticle();
        }
        
        return true;
    }

    // Обновление состояния
    update(deltaTime) {
        // Анимация перемещения
        if (this.isMoving) {
            const duration = this.getMoveDuration();
            this.moveProgress += deltaTime / duration;
            
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
                this.pixelX = this.targetX;
                this.pixelY = this.targetY;
            } else {
                // Easing (ease-out quad)
                const t = 1 - (1 - this.moveProgress) * (1 - this.moveProgress);
                this.pixelX = this.moveStartX + (this.targetX - this.moveStartX) * t;
                this.pixelY = this.moveStartY + (this.targetY - this.moveStartY) * t;
            }
            
            // Подпрыгивание во время движения
            this.bouncePhase += deltaTime * 0.01;
            this.bounceOffset = Math.sin(this.bouncePhase * Math.PI) * GAME_CONSTANTS.ANIMATIONS.BOUNCE_HEIGHT * (1 - this.moveProgress);
        } else {
            this.bounceOffset *= 0.9; // Затухание
            if (Math.abs(this.bounceOffset) < 0.5) this.bounceOffset = 0;
        }
        
        // Колыхание хвостика
        this.tailPhase += deltaTime * 0.005;
        this.tailAngle = Math.sin(this.tailPhase) * 0.3;
        
        // Неуязвимость (мерцание)
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            this.blinkTimer += deltaTime;
            this.isVisible = Math.floor(this.blinkTimer / 100) % 2 === 0;
            
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.isVisible = true;
                this.blinkTimer = 0;
            }
        }
        
        // Замедление
        if (this.isSlowed) {
            this.slowTimer -= deltaTime;
            if (this.slowTimer <= 0) {
                this.isSlowed = false;
            }
        }
        
        // Усиление
        if (this.activePower) {
            this.powerTimer -= deltaTime;
            if (this.powerTimer <= 0) {
                this.activePower = null;
                this.powerTimer = 0;
            }
        }
        
        // Обновляем частицы пыли
        this._updateDustParticles(deltaTime);
        
        // Обновляем эмоции (Улучшение 3)
        this._updateEmotions(deltaTime);
        
        // Победная анимация
        if (this.isVictory) {
            this.victoryRotation += deltaTime * 0.01;
            this.victoryJump = Math.abs(Math.sin(this.victoryRotation * 2)) * 20;
        }
    }

    // Получить урон
    takeDamage(amount = 1) {
        if (this.isInvulnerable) return false;
        if (this.activePower === 'shield') return false;
        
        this.lives -= amount;
        this.isInvulnerable = true;
        this.invulnerabilityTimer = GAME_CONSTANTS.PLAYER.INVULNERABILITY_TIME;
        this.blinkTimer = 0;
        
        return true; // Урон нанесён
    }

    // Активировать усиление
    activatePower(type) {
        this.activePower = type;
        switch (type) {
            case 'dash':
                this.powerTimer = GAME_CONSTANTS.POWERS.DASH_DURATION;
                break;
            case 'shield':
                this.powerTimer = GAME_CONSTANTS.POWERS.SHIELD_DURATION;
                break;
            case 'magnet':
                this.powerTimer = GAME_CONSTANTS.POWERS.MAGNET_DURATION;
                break;
            case 'freeze':
                this.powerTimer = GAME_CONSTANTS.POWERS.FREEZE_DURATION;
                break;
        }
    }

    // Замедлить (паутина)
    applySlow() {
        this.isSlowed = true;
        this.slowTimer = GAME_CONSTANTS.OBSTACLES.WEB_SLOW_DURATION;
    }

    // Добавить очки
    addScore(points) {
        this.score += points;
    }

    // Начать победную анимацию
    startVictory() {
        this.isVictory = true;
        this.victoryRotation = 0;
    }

    // Сброс для нового уровня
    resetForNewLevel(startPos, cellSize) {
        this.gridX = startPos.x;
        this.gridY = startPos.y;
        this.cellSize = cellSize;
        this.pixelX = startPos.x * cellSize;
        this.pixelY = startPos.y * cellSize;
        this.targetX = this.pixelX;
        this.targetY = this.pixelY;
        this.isMoving = false;
        this.moveProgress = 0;
        this.isVictory = false;
        this.victoryRotation = 0;
        this.victoryJump = 0;
        this.dustParticles = [];
    }

    // ======================================================================
    // УЛУЧШЕНИЕ 3: Методы системы эмоций
    // ======================================================================

    // Вызвать эмоцию (перезаписывает текущую, если новая важнее)
    triggerEmotion(type, duration = 1000) {
        // Приоритет эмоций: celebrating > scared > sad > happy > surprised > idle
        const priority = { neutral: 0, idle: 1, surprised: 2, happy: 3, sad: 4, scared: 5, celebrating: 6 };
        
        // Не перезаписываем более важную эмоцию, если она ещё активна
        if (this.emotionTimer > 0 && priority[this.emotionState] > priority[type]) return;
        
        this.emotionState = type;
        this.emotionTimer = duration;
        this.emotionPhase = 0;
        this.emotionIntensity = 1;
        this.idleTimer = 0; // Сбрасываем таймер бездействия
        
        // Инициализация параметров по типу эмоции
        switch (type) {
            case 'happy':
                this.emotionMouthState = 'smile';
                this.emotionEyeScale = 1.3;
                this.emotionEarAngle = 0;
                break;
            case 'surprised':
                this.emotionMouthState = 'ooo';
                this.emotionEyeScale = 1.6;
                this.emotionEarAngle = 0.2;
                this._generateSparkles(8);
                break;
            case 'scared':
                this.emotionMouthState = 'sad';
                this.emotionEyeScale = 1.8;
                this.emotionEarAngle = -0.4; // Уши прижаты
                break;
            case 'celebrating':
                this.emotionMouthState = 'smile';
                this.emotionEyeScale = 1.2;
                this.emotionEarAngle = 0.1;
                break;
            case 'sad':
                this.emotionMouthState = 'sad';
                this.emotionEyeScale = 1.4;
                this.emotionEarAngle = -0.3;
                this._generateTears();
                break;
            case 'idle':
                this.emotionMouthState = 'yawn';
                this.emotionEyeScale = 0.6; // Прищуренные глаза
                this.emotionEarAngle = 0;
                break;
        }
    }

    // Обновление системы эмоций (вызывается в update)
    _updateEmotions(deltaTime) {
        // Таймер бездействия
        if (this.emotionState === 'neutral' && !this.isMoving && !this.isVictory) {
            this.idleTimer += deltaTime;
            if (this.idleTimer >= 5000) { // 5 секунд бездействия
                this.triggerEmotion('idle', 2000);
                this.idleTimer = 0;
            }
        }

        // Обновление текущей эмоции
        if (this.emotionTimer > 0) {
            this.emotionTimer -= deltaTime;
            this.emotionPhase += deltaTime * 0.005;
            
            // Затухание интенсивности в последние 30% времени
            const originalDuration = this._getEmotionDuration(this.emotionState);
            const remaining = this.emotionTimer / originalDuration;
            this.emotionIntensity = remaining < 0.3 ? remaining / 0.3 : 1;
            
            // Анимация по типу
            this._animateEmotion(deltaTime);
            
            // Окончание эмоции
            if (this.emotionTimer <= 0) {
                this._resetEmotion();
            }
        }

        // Обновление блёсток
        for (let i = this.emotionSparkles.length - 1; i >= 0; i--) {
            const s = this.emotionSparkles[i];
            s.life -= deltaTime;
            s.x += s.vx * (deltaTime / 16);
            s.y += s.vy * (deltaTime / 16);
            s.vy += 0.02;
            s.alpha = s.life / s.maxLife;
            s.rotation += s.rotSpeed * (deltaTime / 16);
            if (s.life <= 0) this.emotionSparkles.splice(i, 1);
        }

        // Обновление слёзок
        for (let i = this.emotionTears.length - 1; i >= 0; i--) {
            const t = this.emotionTears[i];
            t.life -= deltaTime;
            t.y += t.vy * (deltaTime / 16);
            t.vy += 0.05;
            t.alpha = t.life / t.maxLife;
            if (t.life <= 0) this.emotionTears.splice(i, 1);
        }
    }

    // Анимация конкретной эмоции
    _animateEmotion(deltaTime) {
        const phase = this.emotionPhase;
        const intensity = this.emotionIntensity;

        switch (this.emotionState) {
            case 'happy':
                // Подпрыгивание и squash/stretch
                this.emotionJumpOffset = Math.abs(Math.sin(phase * 3)) * 8 * intensity;
                this.emotionSquash = 1 + Math.sin(phase * 6) * 0.1 * intensity;
                this.emotionStretch = 1 - Math.sin(phase * 6) * 0.08 * intensity;
                break;
                
            case 'surprised':
                // Замирание + лёгкий откат назад
                this.emotionSquash = 1 + Math.sin(phase * 2) * 0.05;
                this.emotionStretch = 1.1 * intensity;
                this.emotionJumpOffset = 0;
                break;
                
            case 'scared':
                // Сжатие в комочек + дрожь
                this.emotionSquash = 0.8 * intensity + 0.2;
                this.emotionStretch = 0.85 * intensity + 0.15;
                this.emotionJumpOffset = Math.sin(phase * 20) * 2 * intensity; // Дрожь
                break;
                
            case 'celebrating':
                // Кручение + прыжки + фейерверки
                this.emotionJumpOffset = Math.abs(Math.sin(phase * 4)) * 15 * intensity;
                this.emotionSquash = 1 + Math.sin(phase * 8) * 0.15 * intensity;
                this.emotionStretch = 1 + Math.cos(phase * 8) * 0.1 * intensity;
                // Генерируем частицы фейерверка
                if (Math.random() < 0.3 * intensity) {
                    this._generateSparkles(2);
                }
                break;
                
            case 'sad':
                // Опускание головы, безвольный хвост
                this.emotionSquash = 1;
                this.emotionStretch = 0.9;
                this.emotionJumpOffset = -3 * intensity; // Сидит ниже
                // Периодически добавляем слёзки
                if (Math.random() < 0.05 * intensity) {
                    this._generateTears();
                }
                break;
                
            case 'idle':
                // Зевота: рот раскрывается и закрывается
                const yawnPhase = this.emotionPhase * 2;
                this.emotionSquash = 1 + Math.sin(yawnPhase) * 0.05;
                this.emotionStretch = 1 + Math.sin(yawnPhase) * 0.1;
                this.emotionJumpOffset = 0;
                break;
        }
    }

    // Сброс эмоций к нейтральному состоянию
    _resetEmotion() {
        this.emotionState = 'neutral';
        this.emotionTimer = 0;
        this.emotionPhase = 0;
        this.emotionIntensity = 1;
        this.emotionSquash = 1;
        this.emotionStretch = 1;
        this.emotionJumpOffset = 0;
        this.emotionEyeScale = 1;
        this.emotionMouthState = 'normal';
        this.emotionEarAngle = 0;
    }

    // Получить исходную длительность эмоции
    _getEmotionDuration(type) {
        switch (type) {
            case 'happy': return 1000;
            case 'surprised': return 800;
            case 'scared': return 1200;
            case 'celebrating': return 2500;
            case 'sad': return 2000;
            case 'idle': return 2000;
            default: return 1000;
        }
    }

    // Генерация блёсток (для удивления и праздника)
    _generateSparkles(count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.emotionSparkles.push({
                x: 0, y: 0, // Будут отрисовываться относительно лисёнка
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 600 + Math.random() * 400,
                maxLife: 800,
                size: 2 + Math.random() * 4,
                alpha: 1,
                rotation: 0,
                rotSpeed: (Math.random() - 0.5) * 0.2,
                color: ['#ffd700', '#ff69b4', '#87ceeb', '#98fb98', '#ffffff'][Math.floor(Math.random() * 5)]
            });
        }
    }

    // Генерация слёзок (для грусти)
    _generateTears() {
        for (let side = -1; side <= 1; side += 2) {
            this.emotionTears.push({
                x: side * 0.25, // Относительная позиция (от центра глаз)
                y: 0,
                vy: 1 + Math.random() * 0.5,
                life: 800,
                maxLife: 800,
                alpha: 1,
                size: 2 + Math.random() * 2
            });
        }
    }

    // Сброс таймера бездействия (вызывается при вводе)
    resetIdleTimer() {
        this.idleTimer = 0;
        if (this.emotionState === 'idle') {
            this._resetEmotion();
        }
    }

    // Приватные методы для частиц пыли
    _addDustParticle() {
        for (let i = 0; i < 3; i++) {
            this.dustParticles.push({
                x: this.pixelX + this.cellSize / 2,
                y: this.pixelY + this.cellSize * 0.8,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 1.5,
                life: 500,
                maxLife: 500,
                size: Math.random() * 4 + 2
            });
        }
    }

    _updateDustParticles(deltaTime) {
        for (let i = this.dustParticles.length - 1; i >= 0; i--) {
            const p = this.dustParticles[i];
            p.life -= deltaTime;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // гравитация
            
            if (p.life <= 0) {
                this.dustParticles.splice(i, 1);
            }
        }
    }
}
