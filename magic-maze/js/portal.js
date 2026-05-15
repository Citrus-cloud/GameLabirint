// Файл: magic-maze/js/portal.js
// Секретный портал и бонус-комната

class Portal {
    constructor(pos, cellSize) {
        this.pos = pos;
        this.cellSize = cellSize;
        this.active = true;
        this.entered = false;
        
        // Анимация портала
        this.rotationAngle = 0;
        this.pulsePhase = 0;
        this.pulseScale = 1;
        this.sparks = [];
        this.ringPhase = 0;
        
        // Генерируем начальные искры
        this._initSparks();
    }

    _initSparks() {
        for (let i = 0; i < GAME_CONSTANTS.ANIMATIONS.PORTAL_SPARKS; i++) {
            this.sparks.push({
                angle: (Math.PI * 2 / GAME_CONSTANTS.ANIMATIONS.PORTAL_SPARKS) * i,
                radius: this.cellSize * 0.3 + Math.random() * 10,
                speed: 0.002 + Math.random() * 0.003,
                size: 2 + Math.random() * 3,
                brightness: Math.random()
            });
        }
    }

    update(deltaTime) {
        if (!this.active) return;
        
        // Вращение кольца
        this.rotationAngle += deltaTime * 0.002;
        
        // Пульсация
        this.pulsePhase += deltaTime * 0.003;
        this.pulseScale = 1 + Math.sin(this.pulsePhase) * 0.15;
        
        // Движение кольца
        this.ringPhase += deltaTime * 0.004;
        
        // Обновление искр
        for (const spark of this.sparks) {
            spark.angle += spark.speed * deltaTime;
            spark.brightness = 0.5 + Math.sin(spark.angle * 3) * 0.5;
        }
    }

    // Проверка входа в портал
    checkEntry(playerGridX, playerGridY) {
        if (!this.active || this.entered) return false;
        if (this.pos && this.pos.x === playerGridX && this.pos.y === playerGridY) {
            this.entered = true;
            return true;
        }
        return false;
    }

    deactivate() {
        this.active = false;
    }
}

// Бонус-комната
class BonusRoom {
    constructor() {
        this.active = false;
        this.matrix = null;
        this.startPos = null;
        this.crystals = [];
        this.power = null;
        this.collectedCrystals = 0;
        this.totalCrystals = 0;
        this.timer = GAME_CONSTANTS.PORTAL.BONUS_TIME;
        this.maxTimer = GAME_CONSTANTS.PORTAL.BONUS_TIME;
        this.size = 0;
        
        // Анимация
        this.goldParticles = [];
        this.entryAnimation = 0;
        this.exitReady = false;
        
        // Позиция возврата
        this.returnPos = null;
    }

    // Активировать бонус-комнату
    activate(returnPos) {
        const roomData = generateBonusRoom();
        this.matrix = roomData.matrix;
        this.startPos = roomData.startPos;
        this.crystals = roomData.crystals.map(c => ({ ...c, collected: false }));
        this.power = roomData.power;
        this.totalCrystals = this.crystals.length;
        this.collectedCrystals = 0;
        this.size = roomData.size;
        this.timer = GAME_CONSTANTS.PORTAL.BONUS_TIME;
        this.active = true;
        this.exitReady = false;
        this.returnPos = returnPos;
        this.entryAnimation = 0;
        this.goldParticles = [];
        
        return roomData;
    }

    // Обновление
    update(deltaTime) {
        if (!this.active) return;
        
        // Таймер
        this.timer -= deltaTime;
        
        // Анимация входа
        if (this.entryAnimation < 1) {
            this.entryAnimation += deltaTime / 500;
            if (this.entryAnimation > 1) this.entryAnimation = 1;
        }
        
        // Проверка окончания
        if (this.timer <= 0 || this.collectedCrystals >= this.totalCrystals) {
            this.exitReady = true;
        }
        
        // Золотые частицы фона
        if (Math.random() < 0.1) {
            this.goldParticles.push({
                x: Math.random() * this.size * 40,
                y: -10,
                vy: 0.5 + Math.random() * 1,
                vx: (Math.random() - 0.5) * 0.5,
                life: 3000,
                maxLife: 3000,
                size: 2 + Math.random() * 4,
                alpha: 1
            });
        }
        
        // Обновление частиц
        for (let i = this.goldParticles.length - 1; i >= 0; i--) {
            const p = this.goldParticles[i];
            p.life -= deltaTime;
            p.x += p.vx;
            p.y += p.vy;
            p.alpha = p.life / p.maxLife;
            
            if (p.life <= 0) {
                this.goldParticles.splice(i, 1);
            }
        }
    }

    // Собрать кристалл в бонус-комнате
    collectCrystal(playerGridX, playerGridY) {
        for (const crystal of this.crystals) {
            if (!crystal.collected && crystal.x === playerGridX && crystal.y === playerGridY) {
                crystal.collected = true;
                this.collectedCrystals++;
                return true;
            }
        }
        return false;
    }

    // Собрать усиление в бонус-комнате
    collectPower(playerGridX, playerGridY) {
        if (this.power && !this.power.collected &&
            this.power.pos.x === playerGridX && this.power.pos.y === playerGridY) {
            this.power.collected = true;
            return this.power.type;
        }
        return null;
    }

    // Проверить готовность к выходу
    isExitReady() {
        return this.exitReady;
    }

    // Деактивировать
    deactivate() {
        this.active = false;
    }

    // Получить прогресс таймера (0-1)
    getTimerProgress() {
        return this.timer / this.maxTimer;
    }
}
