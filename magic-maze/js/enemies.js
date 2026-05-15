// Файл: magic-maze/js/enemies.js
// Логика врагов: тени-кляксы и Хранитель лабиринта

class Enemy {
    constructor(config, level, cellSize) {
        this.cellSize = cellSize;
        this.isGuardian = config.isGuardian;
        this.patrolRoute = config.patrolRoute;
        this.currentRouteIndex = 0;
        this.direction = 1; // 1 = вперёд, -1 = назад по маршруту
        
        // Позиция
        this.gridX = config.startPos.x;
        this.gridY = config.startPos.y;
        this.pixelX = config.startPos.x * cellSize;
        this.pixelY = config.startPos.y * cellSize;
        this.targetX = this.pixelX;
        this.targetY = this.pixelY;
        
        // Скорость
        let baseSpeed = GAME_CONSTANTS.ENEMIES.BASE_SPEED - 
            (level * GAME_CONSTANTS.ENEMIES.SPEED_DECREASE_PER_LEVEL);
        baseSpeed = Math.max(baseSpeed, GAME_CONSTANTS.ENEMIES.MIN_SPEED);
        
        if (this.isGuardian) {
            baseSpeed *= GAME_CONSTANTS.ENEMIES.GUARDIAN_SPEED_MULT;
        }
        this.moveSpeed = baseSpeed;
        
        // Состояние
        this.isMoving = false;
        this.moveProgress = 0;
        this.moveStartX = this.pixelX;
        this.moveStartY = this.pixelY;
        this.moveTimer = 0;
        this.waitTimer = 500; // Пауза перед первым движением
        
        // Заморозка
        this.isFrozen = false;
        this.frozenTimer = 0;
        
        // Анимация
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.eyeOffset = 0;
        this.shadowSize = this.isGuardian ? 1.4 : 1.0;
        this.alive = true;
        
        // Урон
        this.damage = this.isGuardian ? GAME_CONSTANTS.ENEMIES.GUARDIAN_DAMAGE : 1;
    }

    // Обновление
    update(deltaTime) {
        if (!this.alive) return;
        
        // Если заморожен — только анимация
        if (this.isFrozen) {
            this.frozenTimer -= deltaTime;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
            }
            // Пульсация замороженного состояния
            this.pulsePhase += deltaTime * 0.002;
            return;
        }
        
        // Пульсация
        this.pulsePhase += deltaTime * 0.003;
        
        // Движение по маршруту
        if (this.isMoving) {
            this.moveProgress += deltaTime / this.moveSpeed;
            
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
                this.pixelX = this.targetX;
                this.pixelY = this.targetY;
                this.waitTimer = 200 + Math.random() * 300; // Пауза между шагами
            } else {
                // Линейная интерполяция
                this.pixelX = this.moveStartX + (this.targetX - this.moveStartX) * this.moveProgress;
                this.pixelY = this.moveStartY + (this.targetY - this.moveStartY) * this.moveProgress;
            }
        } else {
            // Ожидание перед следующим шагом
            this.waitTimer -= deltaTime;
            if (this.waitTimer <= 0) {
                this._moveToNextPatrolPoint();
            }
        }
        
        // Анимация глаз (следят за игроком — просто колебания)
        this.eyeOffset = Math.sin(this.pulsePhase * 2) * 2;
    }

    // Движение к следующей точке маршрута
    _moveToNextPatrolPoint() {
        if (this.patrolRoute.length <= 1) return;
        
        // Двигаемся вперёд/назад по маршруту
        this.currentRouteIndex += this.direction;
        
        if (this.currentRouteIndex >= this.patrolRoute.length) {
            this.direction = -1;
            this.currentRouteIndex = this.patrolRoute.length - 2;
        } else if (this.currentRouteIndex < 0) {
            this.direction = 1;
            this.currentRouteIndex = 1;
        }
        
        const nextPoint = this.patrolRoute[this.currentRouteIndex];
        this.gridX = nextPoint.x;
        this.gridY = nextPoint.y;
        
        this.moveStartX = this.pixelX;
        this.moveStartY = this.pixelY;
        this.targetX = nextPoint.x * this.cellSize;
        this.targetY = nextPoint.y * this.cellSize;
        this.isMoving = true;
        this.moveProgress = 0;
    }

    // Заморозить врага
    freeze(duration) {
        this.isFrozen = true;
        this.frozenTimer = duration;
    }

    // Проверка столкновения с игроком (по сетке)
    checkCollision(playerGridX, playerGridY) {
        if (!this.alive || this.isFrozen) return false;
        return this.gridX === playerGridX && this.gridY === playerGridY;
    }

    // Проверка столкновения с игроком (по пикселям, более точная)
    checkPixelCollision(playerPixelX, playerPixelY, cellSize) {
        if (!this.alive || this.isFrozen) return false;
        const dx = Math.abs(this.pixelX - playerPixelX);
        const dy = Math.abs(this.pixelY - playerPixelY);
        const collisionDist = cellSize * 0.6;
        return dx < collisionDist && dy < collisionDist;
    }

    // Убить врага (хранитель)
    kill() {
        this.alive = false;
    }
}

// Менеджер врагов
class EnemyManager {
    constructor() {
        this.enemies = [];
    }

    // Инициализация врагов для уровня
    init(enemyConfigs, level, cellSize) {
        this.enemies = [];
        for (const config of enemyConfigs) {
            this.enemies.push(new Enemy(config, level, cellSize));
        }
    }

    // Обновление всех врагов
    update(deltaTime) {
        for (const enemy of this.enemies) {
            enemy.update(deltaTime);
        }
    }

    // Заморозить всех врагов
    freezeAll(duration) {
        for (const enemy of this.enemies) {
            enemy.freeze(duration);
        }
    }

    // Проверка столкновений с игроком
    checkCollisions(playerPixelX, playerPixelY, cellSize) {
        for (const enemy of this.enemies) {
            if (enemy.checkPixelCollision(playerPixelX, playerPixelY, cellSize)) {
                return enemy;
            }
        }
        return null;
    }

    // Получить живых хранителей
    getGuardians() {
        return this.enemies.filter(e => e.isGuardian && e.alive);
    }
}
