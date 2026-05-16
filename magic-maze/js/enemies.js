// Файл: magic-maze/js/enemies.js
// Логика врагов — ОПТИМИЗИРОВАНО
// Логика обновления маршрута с пониженной частотой (10-15 раз/сек)
// Визуальное движение интерполируется плавно каждый кадр

class Enemy {
    constructor(config, level, cellSize) {
        this.cellSize = cellSize;
        this.isGuardian = config.isGuardian;
        this.patrolRoute = config.patrolRoute;
        this.currentRouteIndex = 0;
        this.direction = 1;

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
        this.waitTimer = 500;

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

        // Оптимизация: таймер логики (фиксированный шаг 200 мс).
        // Это снижает нагрузку CPU: вместо обновления логики каждый кадр (~60 раз/с)
        // мы делаем это 5 раз/с. Визуальная позиция плавно интерполируется
        // между шагами через this.moveProgress, поэтому глаз не замечает разницы.
        this._logicAccumulator = 0;
        this._logicInterval = 200; // 5 шагов в секунду — глазу достаточно
    }

    // Обновление — разделение на логику и интерполяцию
    update(deltaTime) {
        if (!this.alive) return;

        // Заморозка
        if (this.isFrozen) {
            this.frozenTimer -= deltaTime;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
            }
            this.pulsePhase += deltaTime * 0.002;
            return;
        }

        // Пульсация (визуальная, каждый кадр — дёшево)
        this.pulsePhase += deltaTime * 0.003;
        this.eyeOffset = Math.sin(this.pulsePhase * 2) * 2;

        // Плавная интерполяция позиции каждый кадр
        if (this.isMoving) {
            this.moveProgress += deltaTime / this.moveSpeed;
            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.isMoving = false;
                this.pixelX = this.targetX;
                this.pixelY = this.targetY;
                this.waitTimer = 200 + Math.random() * 300;
            } else {
                this.pixelX = this.moveStartX + (this.targetX - this.moveStartX) * this.moveProgress;
                this.pixelY = this.moveStartY + (this.targetY - this.moveStartY) * this.moveProgress;
            }
        }

        // Логика маршрута — с пониженной частотой
        this._logicAccumulator += deltaTime;
        if (this._logicAccumulator >= this._logicInterval) {
            this._logicAccumulator = 0;
            if (!this.isMoving) {
                this.waitTimer -= this._logicInterval;
                if (this.waitTimer <= 0) {
                    this._moveToNextPatrolPoint();
                }
            }
        }
    }

    _moveToNextPatrolPoint() {
        if (this.patrolRoute.length <= 1) return;

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

    freeze(duration) {
        this.isFrozen = true;
        this.frozenTimer = duration;
    }

    checkCollision(playerGridX, playerGridY) {
        if (!this.alive || this.isFrozen) return false;
        return this.gridX === playerGridX && this.gridY === playerGridY;
    }

    checkPixelCollision(playerPixelX, playerPixelY, cellSize) {
        if (!this.alive || this.isFrozen) return false;
        const dx = Math.abs(this.pixelX - playerPixelX);
        const dy = Math.abs(this.pixelY - playerPixelY);
        const collisionDist = cellSize * 0.6;
        return dx < collisionDist && dy < collisionDist;
    }

    kill() {
        this.alive = false;
    }
}

// Менеджер врагов
class EnemyManager {
    constructor() {
        this.enemies = [];
    }

    init(enemyConfigs, level, cellSize) {
        this.enemies = [];
        for (const config of enemyConfigs) {
            this.enemies.push(new Enemy(config, level, cellSize));
        }
    }

    update(deltaTime) {
        for (const enemy of this.enemies) {
            enemy.update(deltaTime);
        }
    }

    freezeAll(duration) {
        for (const enemy of this.enemies) {
            enemy.freeze(duration);
        }
    }

    checkCollisions(playerPixelX, playerPixelY, cellSize) {
        for (const enemy of this.enemies) {
            if (enemy.checkPixelCollision(playerPixelX, playerPixelY, cellSize)) {
                return enemy;
            }
        }
        return null;
    }

    getGuardians() {
        return this.enemies.filter(e => e.isGuardian && e.alive);
    }
}
