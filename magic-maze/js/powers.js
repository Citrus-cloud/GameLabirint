// Файл: magic-maze/js/powers.js
// Система усилений: рывок, щит, магнит, заморозка

class PowerUp {
    constructor(config, cellSize) {
        this.pos = config.pos;
        this.type = config.type;
        this.cellSize = cellSize;
        this.collected = false;
        
        // Анимация парения
        this.floatPhase = Math.random() * Math.PI * 2;
        this.floatOffset = 0;
        this.glowPhase = Math.random() * Math.PI * 2;
        this.glowIntensity = 0;
        this.rotation = 0;
    }

    // Обновление анимации
    update(deltaTime) {
        if (this.collected) return;
        
        this.floatPhase += deltaTime * 0.003;
        this.floatOffset = Math.sin(this.floatPhase) * 5;
        
        this.glowPhase += deltaTime * 0.004;
        this.glowIntensity = 0.5 + Math.sin(this.glowPhase) * 0.5;
        
        this.rotation += deltaTime * 0.001;
    }

    // Проверка сбора игроком
    checkCollection(playerGridX, playerGridY) {
        if (this.collected) return false;
        return this.pos.x === playerGridX && this.pos.y === playerGridY;
    }

    // Собрать усиление
    collect() {
        this.collected = true;
    }

    // Получить цвет по типу
    getColor() {
        switch (this.type) {
            case 'dash': return GAME_CONSTANTS.COLORS.POWER_DASH;
            case 'shield': return GAME_CONSTANTS.COLORS.POWER_SHIELD;
            case 'magnet': return GAME_CONSTANTS.COLORS.POWER_MAGNET;
            case 'freeze': return GAME_CONSTANTS.COLORS.POWER_FREEZE;
            default: return '#ffffff';
        }
    }

    // Получить название на русском
    getName() {
        switch (this.type) {
            case 'dash': return 'Рывок!';
            case 'shield': return 'Щит!';
            case 'magnet': return 'Магнит!';
            case 'freeze': return 'Заморозка!';
            default: return '';
        }
    }

    // Получить иконку (символ для рисования)
    getIcon() {
        switch (this.type) {
            case 'dash': return 'star';    // Звёздочка
            case 'shield': return 'circle'; // Круг-щит
            case 'magnet': return 'magnet'; // U-образная форма
            case 'freeze': return 'snow';   // Снежинка
            default: return 'circle';
        }
    }
}

// Менеджер усилений
class PowerUpManager {
    constructor() {
        this.powerUps = [];
    }

    // Инициализация для уровня
    init(powerConfigs, cellSize) {
        this.powerUps = [];
        for (const config of powerConfigs) {
            this.powerUps.push(new PowerUp(config, cellSize));
        }
    }

    // Обновление
    update(deltaTime) {
        for (const power of this.powerUps) {
            power.update(deltaTime);
        }
    }

    // Проверка сбора
    checkCollection(playerGridX, playerGridY) {
        for (const power of this.powerUps) {
            if (power.checkCollection(playerGridX, playerGridY)) {
                power.collect();
                return power;
            }
        }
        return null;
    }

    // Получить активные (не собранные) усиления
    getActive() {
        return this.powerUps.filter(p => !p.collected);
    }
}

// Система эффектов активного усиления (для рендеринга)
class ActivePowerEffect {
    constructor(type, duration) {
        this.type = type;
        this.duration = duration;
        this.maxDuration = duration;
        this.timer = duration;
        this.particles = [];
        this.phase = 0;
    }

    update(deltaTime, playerPixelX, playerPixelY, cellSize) {
        this.timer -= deltaTime;
        this.phase += deltaTime * 0.003;

        // Генерация частиц в зависимости от типа
        switch (this.type) {
            case 'dash':
                this._updateDashEffect(deltaTime, playerPixelX, playerPixelY, cellSize);
                break;
            case 'shield':
                this._updateShieldEffect(deltaTime, playerPixelX, playerPixelY, cellSize);
                break;
            case 'magnet':
                // Магнит обрабатывается в основной логике
                break;
            case 'freeze':
                // Заморозка обрабатывается в EnemyManager
                break;
        }

        // Обновляем частицы
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime;
            p.x += p.vx * (deltaTime / 16);
            p.y += p.vy * (deltaTime / 16);
            p.alpha = p.life / p.maxLife;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    _updateDashEffect(deltaTime, px, py, cellSize) {
        // Звёздная пыль за лисёнком
        if (Math.random() < 0.3) {
            this.particles.push({
                x: px + cellSize / 2 + (Math.random() - 0.5) * 10,
                y: py + cellSize / 2 + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                life: 600,
                maxLife: 600,
                size: Math.random() * 4 + 2,
                color: GAME_CONSTANTS.COLORS.POWER_DASH,
                alpha: 1
            });
        }
    }

    _updateShieldEffect(deltaTime, px, py, cellSize) {
        // Светлячки вокруг лисёнка
        const centerX = px + cellSize / 2;
        const centerY = py + cellSize / 2;
        const radius = cellSize * 0.7;
        
        if (this.particles.length < 6) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                vx: Math.cos(angle + Math.PI / 2) * 0.5,
                vy: Math.sin(angle + Math.PI / 2) * 0.5,
                life: 1000,
                maxLife: 1000,
                size: Math.random() * 3 + 3,
                color: GAME_CONSTANTS.COLORS.POWER_SHIELD,
                alpha: 1,
                angle: angle
            });
        }

        // Орбитальное движение
        for (const p of this.particles) {
            if (p.angle !== undefined) {
                p.angle += deltaTime * 0.003;
                p.x = centerX + Math.cos(p.angle) * radius;
                p.y = centerY + Math.sin(p.angle) * radius;
            }
        }
    }

    getProgress() {
        return this.timer / this.maxDuration;
    }

    isExpired() {
        return this.timer <= 0;
    }
}
