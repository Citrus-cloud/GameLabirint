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
