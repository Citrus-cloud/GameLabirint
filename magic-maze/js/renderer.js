// Файл: magic-maze/js/renderer.js
// Отрисовка Canvas: стены, персонаж, предметы, UI

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.offsetX = 0;
        this.offsetY = 0;
        this.cellSize = GAME_CONSTANTS.CELL_SIZE;
        this.wallBreathPhase = 0;
    }

    // Установить смещение для отрисовки лабиринта по центру
    setOffset(mazeWidth, mazeHeight, cellSize) {
        this.cellSize = cellSize;
        this.offsetX = (this.width - mazeWidth * cellSize) / 2;
        this.offsetY = 60 + (this.height - 60 - mazeHeight * cellSize) / 2;
    }

    // Очистить экран
    clear() {
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // Обновить анимацию дыхания стен
    updateWallBreath(deltaTime) {
        this.wallBreathPhase += deltaTime * 0.001;
    }

    // === ОТРИСОВКА ЛАБИРИНТА ===
    drawMaze(matrix) {
        const cs = this.cellSize;
        const breathOffset = Math.sin(this.wallBreathPhase) * 5;

        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[0].length; x++) {
                const px = this.offsetX + x * cs;
                const py = this.offsetY + y * cs;

                if (matrix[y][x] === GAME_CONSTANTS.CELL_TYPES.WALL) {
                    // Стена с градиентом
                    const grad = this.ctx.createLinearGradient(px, py, px + cs, py + cs);
                    const r = Math.floor(74 + breathOffset);
                    const g = Math.floor(44 + breathOffset * 0.5);
                    const b = Math.floor(138 + breathOffset);
                    grad.addColorStop(0, `rgb(${r},${g},${b})`);
                    grad.addColorStop(1, GAME_CONSTANTS.COLORS.WALL_SECONDARY);
                    this.ctx.fillStyle = grad;
                    this.ctx.fillRect(px, py, cs, cs);

                    // Свечение краёв
                    this.ctx.strokeStyle = GAME_CONSTANTS.COLORS.WALL_GLOW;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.globalAlpha = 0.3;
                    this.ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
                    this.ctx.globalAlpha = 1;
                } else {
                    // Пол
                    this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FLOOR;
                    this.ctx.fillRect(px, py, cs, cs);
                    // Лёгкая клетка
                    this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FLOOR_LIGHT;
                    this.ctx.globalAlpha = 0.1;
                    if ((x + y) % 2 === 0) {
                        this.ctx.fillRect(px, py, cs, cs);
                    }
                    this.ctx.globalAlpha = 1;
                }
            }
        }
    }

    // === ОТРИСОВКА КРИСТАЛЛОВ ===
    drawCrystals(crystals, time) {
        const cs = this.cellSize;
        for (const crystal of crystals) {
            if (crystal.collected) continue;
            const px = this.offsetX + crystal.x * cs + cs / 2;
            const py = this.offsetY + crystal.y * cs + cs / 2;
            const float = Math.sin(time * 0.003 + crystal.x + crystal.y) * 3;

            // Свечение
            this.ctx.shadowColor = GAME_CONSTANTS.COLORS.CRYSTAL_BLUE;
            this.ctx.shadowBlur = 10 + Math.sin(time * 0.005) * 5;

            // Ромб кристалла
            this.ctx.beginPath();
            const size = cs * 0.25;
            this.ctx.moveTo(px, py - size + float);
            this.ctx.lineTo(px + size * 0.7, py + float);
            this.ctx.lineTo(px, py + size * 0.6 + float);
            this.ctx.lineTo(px - size * 0.7, py + float);
            this.ctx.closePath();

            const grad = this.ctx.createRadialGradient(px, py + float, 0, px, py + float, size);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.5, GAME_CONSTANTS.COLORS.CRYSTAL_BLUE);
            grad.addColorStop(1, GAME_CONSTANTS.COLORS.CRYSTAL_PINK);
            this.ctx.fillStyle = grad;
            this.ctx.fill();

            this.ctx.shadowBlur = 0;
        }
    }

    // === ОТРИСОВКА ЛИСЁНКА ФОКСИ ===
    drawPlayer(player, skinOverride, skinEffects) {
        if (!player.isVisible) return;

        const cs = this.cellSize;
        // Улучшение 3: смещения от эмоций
        const emotionJump = player.emotionJumpOffset || 0;
        // Смещение от полёта (тир 4 скина)
        const flyOffset = skinEffects ? skinEffects.getFlyOffset() : 0;
        const px = this.offsetX + player.pixelX + cs / 2;
        const py = this.offsetY + player.pixelY + cs / 2 - player.bounceOffset - emotionJump - flyOffset;
        const size = cs * 0.35;

        this.ctx.save();

        // Кувырок от скина (тир 3)
        const flipAngle = skinEffects ? skinEffects.getFlipAngle() : 0;
        if (flipAngle > 0) {
            this.ctx.translate(px, py);
            this.ctx.rotate(flipAngle);
            this.ctx.translate(-px, -py);
        }

        // Победное вращение
        if (player.isVictory) {
            this.ctx.translate(px, py - player.victoryJump);
            this.ctx.rotate(player.victoryRotation);
            this.ctx.translate(-px, -(py - player.victoryJump));
        }

        const drawY = player.isVictory ? py - player.victoryJump : py;

        // Улучшение 3: squash & stretch от эмоций
        const squash = player.emotionSquash || 1;
        const stretch = player.emotionStretch || 1;

        // Улучшение 1: цвета из скина (если есть)
        const skin = skinOverride || null;
        const bodyColor = skin ? skin.bodyColor : GAME_CONSTANTS.COLORS.FOXY_BODY;
        const bellyColor = skin ? skin.bellyColor : GAME_CONSTANTS.COLORS.FOXY_BELLY;
        const tailColor = skin ? skin.tailColor : GAME_CONSTANTS.COLORS.FOXY_TAIL;
        const earsColor = skin ? skin.earsColor : GAME_CONSTANTS.COLORS.FOXY_EARS;

        // Свечение скина
        if (skin && skin.glowIntensity > 3) {
            this.ctx.shadowColor = skin.glowColor;
            this.ctx.shadowBlur = skin.glowIntensity * 0.5;
        }

        // Свечение при щите
        if (player.activePower === 'shield') {
            this.ctx.shadowColor = GAME_CONSTANTS.COLORS.POWER_SHIELD;
            this.ctx.shadowBlur = 15;
        } else if (player.activePower === 'dash') {
            this.ctx.shadowColor = GAME_CONSTANTS.COLORS.POWER_DASH;
            this.ctx.shadowBlur = 10;
        }

        // Прозрачность для призрачных скинов
        if (skin && skin.transparency) {
            this.ctx.globalAlpha = skin.transparency;
        }

        // === ВЫЗОВ ДЕТАЛИЗИРОВАННОЙ ОТРИСОВКИ ===
        const skinData = {
            bodyColor: bodyColor,
            bellyColor: bellyColor,
            tailColor: tailColor,
            earsColor: earsColor
        };
        this.drawDetailedFox(px, drawY, size, skinData, player);

        this.ctx.shadowBlur = 0;
        this.ctx.restore();

        // Улучшение 3: блёстки эмоций
        for (const sparkle of player.emotionSparkles) {
            const sx = px + sparkle.x * cs * 0.5;
            const sy = drawY + sparkle.y * cs * 0.5 - cs * 0.3;
            this.ctx.globalAlpha = sparkle.alpha;
            this.ctx.fillStyle = sparkle.color;
            this.ctx.save();
            this.ctx.translate(sx, sy);
            this.ctx.rotate(sparkle.rotation);
            this._drawStar(0, 0, sparkle.size, 4);
            this.ctx.restore();
        }
        this.ctx.globalAlpha = 1;

        // Улучшение 3: слёзки
        for (const tear of player.emotionTears) {
            const tx = px + tear.x * size;
            const ty = eyeY + tear.y + size * 0.3;
            this.ctx.globalAlpha = tear.alpha;
            this.ctx.fillStyle = '#87ceeb';
            this.ctx.beginPath();
            this.ctx.ellipse(tx, ty, tear.size * 0.6, tear.size, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;

        // Частицы пыли
        for (const dust of player.dustParticles) {
            const alpha = dust.life / dust.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = GAME_CONSTANTS.COLORS.POWER_DASH;
            this.ctx.beginPath();
            this.ctx.arc(this.offsetX + dust.x, this.offsetY + dust.y, dust.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    // Улучшение 3: Отрисовка рта лисёнка в зависимости от эмоции
    _drawFoxyMouth(px, drawY, size, state, intensity) {
        const ctx = this.ctx;
        const mouthY = drawY + size * 0.25;

        switch (state) {
            case 'smile':
                // Улыбка
                ctx.strokeStyle = '#2c2c2c';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(px, mouthY - size * 0.05, size * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
                ctx.stroke();
                break;
            case 'ooo':
                // Буква О (удивление)
                ctx.fillStyle = '#2c2c2c';
                ctx.beginPath();
                ctx.ellipse(px, mouthY, size * 0.08 * intensity, size * 0.12 * intensity, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'sad':
                // Перевёрнутая улыбка
                ctx.strokeStyle = '#2c2c2c';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(px, mouthY + size * 0.1, size * 0.12, 1.1 * Math.PI, 1.9 * Math.PI);
                ctx.stroke();
                break;
            case 'yawn':
                // Зевота — большой открытый рот
                ctx.fillStyle = '#2c2c2c';
                ctx.beginPath();
                ctx.ellipse(px, mouthY, size * 0.12, size * 0.18 * intensity, 0, 0, Math.PI * 2);
                ctx.fill();
                // Язычок
                ctx.fillStyle = '#ff8a80';
                ctx.beginPath();
                ctx.ellipse(px, mouthY + size * 0.08, size * 0.06, size * 0.08, 0, 0, Math.PI);
                ctx.fill();
                break;
            default:
                // Нормальный — маленькая точка
                break;
        }
    }



    // === УЛУЧШЕННАЯ ДЕТАЛИЗИРОВАННАЯ ОТРИСОВКА ЛИСЁНКА ===
    // Вызывается из drawPlayer вместо старой простой отрисовки
    drawDetailedFox(px, drawY, size, skinData, player) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const time = performance.now();
        
        // Параметры эмоций
        const squash = player.emotionSquash || 1;
        const stretch = player.emotionStretch || 1;
        const earAngle = player.emotionEarAngle || 0;
        const tailAngle = player.emotionState === 'sad' ? 0.5 : (player.tailAngle || 0);
        
        // Цвета (из скина или стандартные)
        const bodyColor = skinData.bodyColor;
        const bellyColor = skinData.bellyColor;
        const tailColor = skinData.tailColor;
        const earsColor = skinData.earsColor;
        
        // === ХВОСТ (рисуется первым, за телом) ===
        ctx.save();
        const tailBaseX = px - size * 0.6;
        const tailBaseY = drawY + size * 0.4;
        ctx.translate(tailBaseX, tailBaseY);
        ctx.rotate(tailAngle);
        
        // Пушистый хвост — изогнутая форма с волнистым краем
        ctx.beginPath();
        // Основная форма хвоста (безье для изгиба)
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-size * 0.3, -size * 0.4, -size * 0.8, -size * 0.5, -size * 0.9, -size * 0.1);
        ctx.bezierCurveTo(-size * 1.0, size * 0.1, -size * 0.7, size * 0.3, -size * 0.3, size * 0.15);
        ctx.bezierCurveTo(-size * 0.1, size * 0.1, 0, size * 0.05, 0, 0);
        
        // Градиент хвоста
        const tailGrad = ctx.createLinearGradient(0, 0, -size * 0.9, 0);
        tailGrad.addColorStop(0, tailColor);
        tailGrad.addColorStop(0.7, tailColor);
        tailGrad.addColorStop(1, bellyColor); // Белый кончик
        ctx.fillStyle = tailGrad;
        ctx.fill();
        
        // Волнистые линии по краю (имитация шерсти)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 5; i++) {
            const t = i / 5;
            const wx = -size * 0.9 * t;
            const wy = -size * 0.3 * Math.sin(t * Math.PI) + Math.sin(time * 0.003 + i) * 1.5;
            ctx.beginPath();
            ctx.arc(wx, wy, 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
        
        // === ЗАДНИЕ ЛАПКИ ===
        const legBounce = player.isMoving ? Math.sin(time * 0.015) * 2 : 0;
        
        // Левая задняя лапка
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(px - size * 0.35, drawY + size * 0.85 + legBounce, size * 0.18 * squash, size * 0.22 * stretch, 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Пальчики
        ctx.fillStyle = bellyColor;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(px - size * 0.4 + i * size * 0.06, drawY + size * 1.05 + legBounce, size * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Правая задняя лапка
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(px + size * 0.35, drawY + size * 0.85 - legBounce, size * 0.18 * squash, size * 0.22 * stretch, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bellyColor;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(px + size * 0.28 + i * size * 0.06, drawY + size * 1.05 - legBounce, size * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // === ТУЛОВИЩЕ (овальное, с градиентом) ===
        const bodyGrad = ctx.createRadialGradient(px, drawY - size * 0.1, 0, px, drawY, size * 1.2);
        bodyGrad.addColorStop(0, this._lightenColor(bodyColor, 20));
        bodyGrad.addColorStop(0.7, bodyColor);
        bodyGrad.addColorStop(1, this._darkenColor(bodyColor, 30));
        
        ctx.beginPath();
        ctx.ellipse(px, drawY + size * 0.2, size * 0.7 * squash, size * 0.85 * stretch, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        
        // Белая грудка (с мягким градиентом)
        const bellyGrad = ctx.createRadialGradient(px, drawY + size * 0.3, 0, px, drawY + size * 0.3, size * 0.5);
        bellyGrad.addColorStop(0, bellyColor);
        bellyGrad.addColorStop(1, 'rgba(255, 224, 178, 0)');
        ctx.beginPath();
        ctx.ellipse(px, drawY + size * 0.35, size * 0.4 * squash, size * 0.55 * stretch, 0, 0, Math.PI * 2);
        ctx.fillStyle = bellyGrad;
        ctx.fill();
        
        // === ПЕРЕДНИЕ ЛАПКИ ===
        const armBounce = player.isMoving ? Math.sin(time * 0.015 + 1) * 2 : 0;
        
        // Левая передняя лапка
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(px - size * 0.45, drawY + size * 0.6 + armBounce, size * 0.14 * squash, size * 0.2 * stretch, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bellyColor;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.arc(px - size * 0.5 + i * size * 0.06, drawY + size * 0.78 + armBounce, size * 0.035, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Правая передняя лапка
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(px + size * 0.45, drawY + size * 0.6 - armBounce, size * 0.14 * squash, size * 0.2 * stretch, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bellyColor;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.arc(px + size * 0.4 + i * size * 0.06, drawY + size * 0.78 - armBounce, size * 0.035, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // === ГОЛОВА (овальная с пушистыми щёчками) ===
        const headY = drawY - size * 0.35;
        
        // Основной овал головы
        const headGrad = ctx.createRadialGradient(px, headY - size * 0.1, 0, px, headY, size * 0.7);
        headGrad.addColorStop(0, this._lightenColor(bodyColor, 15));
        headGrad.addColorStop(1, bodyColor);
        ctx.beginPath();
        ctx.ellipse(px, headY, size * 0.55 * squash, size * 0.5 * stretch, 0, 0, Math.PI * 2);
        ctx.fillStyle = headGrad;
        ctx.fill();
        
        // Пушистые щёчки (белые, чуть выпирают)
        ctx.fillStyle = bellyColor;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.ellipse(px - size * 0.3, headY + size * 0.15, size * 0.2, size * 0.15, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px + size * 0.3, headY + size * 0.15, size * 0.2, size * 0.15, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // === УШКИ (треугольные с розовой внутренней частью) ===
        // Левое ушко
        ctx.save();
        ctx.translate(px - size * 0.35, headY - size * 0.35);
        ctx.rotate(-0.25 + earAngle);
        // Внешняя часть
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, size * 0.1);
        ctx.lineTo(0, -size * 0.35);
        ctx.lineTo(size * 0.12, size * 0.1);
        ctx.closePath();
        ctx.fillStyle = earsColor;
        ctx.fill();
        // Внутренняя розовая часть
        ctx.beginPath();
        ctx.moveTo(-size * 0.06, size * 0.05);
        ctx.lineTo(0, -size * 0.22);
        ctx.lineTo(size * 0.06, size * 0.05);
        ctx.closePath();
        ctx.fillStyle = '#ffb3c1';
        ctx.fill();
        ctx.restore();
        
        // Правое ушко
        ctx.save();
        ctx.translate(px + size * 0.35, headY - size * 0.35);
        ctx.rotate(0.25 - earAngle);
        ctx.beginPath();
        ctx.moveTo(-size * 0.12, size * 0.1);
        ctx.lineTo(0, -size * 0.35);
        ctx.lineTo(size * 0.12, size * 0.1);
        ctx.closePath();
        ctx.fillStyle = earsColor;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-size * 0.06, size * 0.05);
        ctx.lineTo(0, -size * 0.22);
        ctx.lineTo(size * 0.06, size * 0.05);
        ctx.closePath();
        ctx.fillStyle = '#ffb3c1';
        ctx.fill();
        ctx.restore();
        
        // === ГЛАЗА (большие, выразительные) ===
        const eyeScale = player.emotionEyeScale || 1;
        const eyeSpacing = size * 0.22;
        const eyeY = headY - size * 0.02;
        const eyeR = size * 0.14 * eyeScale;
        
        if (player.emotionState === 'happy' || player.emotionState === 'celebrating') {
            // Глаза-звёздочки (радость)
            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.arc(px + eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            this._drawStar(px - eyeSpacing, eyeY, eyeR * 0.5, 4);
            this._drawStar(px + eyeSpacing, eyeY, eyeR * 0.5, 4);
        } else if (player.emotionState === 'scared') {
            // Большие испуганные глаза
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY, eyeR * 1.3, 0, Math.PI * 2);
            ctx.arc(px + eyeSpacing, eyeY, eyeR * 1.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY + 1, eyeR * 0.7, 0, Math.PI * 2);
            ctx.arc(px + eyeSpacing, eyeY + 1, eyeR * 0.7, 0, Math.PI * 2);
            ctx.fill();
            // Маленькие белые блики
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing + 2, eyeY - 2, eyeR * 0.2, 0, Math.PI * 2);
            ctx.arc(px + eyeSpacing + 2, eyeY - 2, eyeR * 0.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (player.emotionState === 'sad') {
            ctx.strokeStyle = '#2c2c2c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY, eyeR * 0.7, 0, Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing, eyeY, eyeR * 0.7, 0, Math.PI);
            ctx.stroke();
        } else if (player.emotionState === 'idle') {
            ctx.strokeStyle = '#2c2c2c';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(px - eyeSpacing - eyeR * 0.5, eyeY);
            ctx.lineTo(px - eyeSpacing + eyeR * 0.5, eyeY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px + eyeSpacing - eyeR * 0.5, eyeY);
            ctx.lineTo(px + eyeSpacing + eyeR * 0.5, eyeY);
            ctx.stroke();
        } else {
            // Обычные глаза: белая основа + большой чёрный зрачок + два белых блика
            // Белая основа
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            
            // Большой чёрный зрачок
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY, eyeR * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing, eyeY, eyeR * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // Большой блик (сверху)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing + eyeR * 0.2, eyeY - eyeR * 0.25, eyeR * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing + eyeR * 0.2, eyeY - eyeR * 0.25, eyeR * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Маленький блик (сбоку)
            ctx.beginPath();
            ctx.arc(px - eyeSpacing - eyeR * 0.15, eyeY + eyeR * 0.15, eyeR * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing - eyeR * 0.15, eyeY + eyeR * 0.15, eyeR * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // === НОСИК (маленький чёрный треугольник) ===
        const noseY = headY + size * 0.15;
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(px, noseY - size * 0.04);
        ctx.lineTo(px - size * 0.06, noseY + size * 0.04);
        ctx.lineTo(px + size * 0.06, noseY + size * 0.04);
        ctx.closePath();
        ctx.fill();
        
        // === РОТИК (лёгкая улыбка-дуга) ===
        const mouthY = noseY + size * 0.08;
        const mouthState = player.emotionMouthState || 'normal';
        
        if (mouthState === 'smile') {
            ctx.strokeStyle = '#2c2c2c';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(px, mouthY, size * 0.1, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
        } else if (mouthState === 'ooo') {
            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.ellipse(px, mouthY + size * 0.02, size * 0.06, size * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (mouthState === 'sad') {
            ctx.strokeStyle = '#2c2c2c';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(px, mouthY + size * 0.08, size * 0.08, 1.2 * Math.PI, 1.8 * Math.PI);
            ctx.stroke();
        } else if (mouthState === 'yawn') {
            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.ellipse(px, mouthY + size * 0.02, size * 0.08, size * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff8a80';
            ctx.beginPath();
            ctx.ellipse(px, mouthY + size * 0.08, size * 0.04, size * 0.05, 0, 0, Math.PI);
            ctx.fill();
        } else {
            // Нормальный — лёгкая улыбка
            ctx.strokeStyle = '#2c2c2c';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, mouthY - size * 0.02, size * 0.06, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();
        }
    }
    
    // Вспомогательная функция: осветлить цвет
    _lightenColor(color, amount) {
        if (color.startsWith('rgba')) return color;
        try {
            const hex = color.replace('#', '');
            const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount);
            const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount);
            const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount);
            return `rgb(${r}, ${g}, ${b})`;
        } catch(e) { return color; }
    }
    
    // Вспомогательная функция: затемнить цвет
    _darkenColor(color, amount) {
        if (color.startsWith('rgba')) return color;
        try {
            const hex = color.replace('#', '');
            const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
            const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
            const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
            return `rgb(${r}, ${g}, ${b})`;
        } catch(e) { return color; }
    }

    // === ОТРИСОВКА ВРАГОВ ===
    drawEnemies(enemies) {
        const cs = this.cellSize;
        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            const px = this.offsetX + enemy.pixelX + cs / 2;
            const py = this.offsetY + enemy.pixelY + cs / 2;
            const size = cs * 0.35 * enemy.shadowSize;
            const pulse = Math.sin(enemy.pulsePhase) * 3;

            // Тень-клякса
            this.ctx.save();

            if (enemy.isFrozen) {
                // Замороженный — голубой оттенок
                this.ctx.shadowColor = '#80d8ff';
                this.ctx.shadowBlur = 8;
                this.ctx.fillStyle = '#4fc3f7';
            } else {
                this.ctx.shadowColor = GAME_CONSTANTS.COLORS.SHADOW_GLOW;
                this.ctx.shadowBlur = 8 + pulse;
                this.ctx.fillStyle = GAME_CONSTANTS.COLORS.SHADOW_BODY;
            }

            // Тело (волнистый круг)
            this.ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                const r = size + Math.sin(angle * 3 + enemy.pulsePhase) * 3;
                const x = px + Math.cos(angle) * r;
                const y = py + Math.sin(angle) * r;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fill();

            // Глаза
            if (!enemy.isFrozen) {
                this.ctx.fillStyle = GAME_CONSTANTS.COLORS.SHADOW_EYES;
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = '#ff0000';
                const eyeSize = size * 0.2;
                this.ctx.beginPath();
                this.ctx.arc(px - size * 0.3 + enemy.eyeOffset, py - size * 0.1, eyeSize, 0, Math.PI * 2);
                this.ctx.arc(px + size * 0.3 + enemy.eyeOffset, py - size * 0.1, eyeSize, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Замороженные глаза
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(px - size * 0.3, py - size * 0.1, size * 0.15, 0, Math.PI * 2);
                this.ctx.arc(px + size * 0.3, py - size * 0.1, size * 0.15, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Корона для хранителя
            if (enemy.isGuardian) {
                this.ctx.fillStyle = GAME_CONSTANTS.COLORS.GUARDIAN_CROWN;
                this.ctx.shadowColor = '#ffd700';
                this.ctx.shadowBlur = 5;
                this.ctx.beginPath();
                const crownY = py - size * 0.9;
                this.ctx.moveTo(px - size * 0.5, crownY);
                this.ctx.lineTo(px - size * 0.4, crownY - size * 0.4);
                this.ctx.lineTo(px - size * 0.15, crownY - size * 0.15);
                this.ctx.lineTo(px, crownY - size * 0.5);
                this.ctx.lineTo(px + size * 0.15, crownY - size * 0.15);
                this.ctx.lineTo(px + size * 0.4, crownY - size * 0.4);
                this.ctx.lineTo(px + size * 0.5, crownY);
                this.ctx.closePath();
                this.ctx.fill();
            }

            this.ctx.restore();
        }
    }

    // === ОТРИСОВКА УСИЛЕНИЙ ===
    drawPowerUps(powerUps) {
        const cs = this.cellSize;
        for (const power of powerUps) {
            if (power.collected) continue;

            const px = this.offsetX + power.pos.x * cs + cs / 2;
            const py = this.offsetY + power.pos.y * cs + cs / 2 + power.floatOffset;
            const size = cs * 0.3;
            const color = power.getColor();

            // Пузырь
            this.ctx.save();
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 10 * power.glowIntensity;

            // Внешний пузырь
            this.ctx.beginPath();
            this.ctx.arc(px, py, size, 0, Math.PI * 2);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.6 + power.glowIntensity * 0.4;
            this.ctx.stroke();

            // Заполнение с прозрачностью
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = color;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;

            // Иконка внутри
            this.ctx.fillStyle = '#ffffff';
            const icon = power.getIcon();
            this._drawPowerIcon(px, py, size * 0.5, icon);

            this.ctx.restore();
        }
    }

    _drawPowerIcon(x, y, size, icon) {
        this.ctx.fillStyle = '#ffffff';
        switch (icon) {
            case 'star':
                this._drawStar(x, y, size, 5);
                break;
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                break;
            case 'magnet':
                this.ctx.beginPath();
                this.ctx.arc(x, y - size * 0.2, size * 0.5, Math.PI, 0);
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(x - size * 0.5, y - size * 0.2);
                this.ctx.lineTo(x - size * 0.5, y + size * 0.4);
                this.ctx.moveTo(x + size * 0.5, y - size * 0.2);
                this.ctx.lineTo(x + size * 0.5, y + size * 0.4);
                this.ctx.stroke();
                break;
            case 'snow':
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.stroke();
                }
                break;
        }
    }

    _drawStar(cx, cy, size, points) {
        this.ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (Math.PI / points) * i - Math.PI / 2;
            const r = i % 2 === 0 ? size : size * 0.4;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fill();
    }

    // === ОТРИСОВКА ПОРТАЛА ===
    drawPortal(portal) {
        if (!portal || !portal.active) return;

        const cs = this.cellSize;
        const px = this.offsetX + portal.pos.x * cs + cs / 2;
        const py = this.offsetY + portal.pos.y * cs + cs / 2;
        const size = cs * 0.4 * portal.pulseScale;

        this.ctx.save();
        this.ctx.shadowColor = GAME_CONSTANTS.COLORS.PORTAL_PRIMARY;
        this.ctx.shadowBlur = 15;

        // Внешнее кольцо
        this.ctx.beginPath();
        this.ctx.arc(px, py, size, 0, Math.PI * 2);
        this.ctx.strokeStyle = GAME_CONSTANTS.COLORS.PORTAL_PRIMARY;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Внутреннее мерцающее кольцо
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 0.7, portal.ringPhase, portal.ringPhase + Math.PI * 1.5);
        this.ctx.strokeStyle = GAME_CONSTANTS.COLORS.PORTAL_SECONDARY;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Центр портала
        const innerGrad = this.ctx.createRadialGradient(px, py, 0, px, py, size * 0.5);
        innerGrad.addColorStop(0, 'rgba(156, 39, 176, 0.8)');
        innerGrad.addColorStop(1, 'rgba(156, 39, 176, 0)');
        this.ctx.fillStyle = innerGrad;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Искры
        for (const spark of portal.sparks) {
            const sx = px + Math.cos(spark.angle) * spark.radius;
            const sy = py + Math.sin(spark.angle) * spark.radius;
            this.ctx.globalAlpha = spark.brightness;
            this.ctx.fillStyle = GAME_CONSTANTS.COLORS.PORTAL_SPARKS;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, spark.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;
        this.ctx.restore();
    }

    // === ОТРИСОВКА ПАУТИНЫ ===
    drawWebs(webs) {
        const cs = this.cellSize;
        for (const web of webs) {
            const px = this.offsetX + web.x * cs + cs / 2;
            const py = this.offsetY + web.y * cs + cs / 2;
            const size = cs * 0.35;

            this.ctx.save();
            this.ctx.strokeStyle = GAME_CONSTANTS.COLORS.WEB_COLOR;
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.7;

            // Радиальные линии
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                this.ctx.beginPath();
                this.ctx.moveTo(px, py);
                this.ctx.lineTo(px + Math.cos(angle) * size, py + Math.sin(angle) * size);
                this.ctx.stroke();
            }

            // Концентрические кольца
            for (let r = 1; r <= 3; r++) {
                this.ctx.beginPath();
                this.ctx.arc(px, py, size * r / 3, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            this.ctx.restore();
        }
    }

    // === ОТРИСОВКА ДВИЖУЩИХСЯ СТЕН ===
    drawMovingWalls(movingWalls) {
        const cs = this.cellSize;
        for (const wall of movingWalls) {
            if (!wall.isBlocking) continue;
            const px = this.offsetX + wall.pos.x * cs;
            const py = this.offsetY + wall.pos.y * cs;

            this.ctx.fillStyle = '#8b4513';
            this.ctx.shadowColor = '#ff8c00';
            this.ctx.shadowBlur = 5;
            this.ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
            this.ctx.shadowBlur = 0;
        }
    }

    // === ОТРИСОВКА ФИНИШНОЙ ЗВЕЗДЫ ===
    drawFinishStar(pos, time) {
        const cs = this.cellSize;
        const px = this.offsetX + pos.x * cs + cs / 2;
        const py = this.offsetY + pos.y * cs + cs / 2;
        const size = cs * 0.35 + Math.sin(time * 0.004) * 3;

        this.ctx.save();
        this.ctx.shadowColor = GAME_CONSTANTS.COLORS.STAR_GLOW;
        this.ctx.shadowBlur = 15 + Math.sin(time * 0.003) * 5;

        // Звезда
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.STAR_PRIMARY;
        this.ctx.translate(px, py);
        this.ctx.rotate(time * 0.001);
        this.ctx.translate(-px, -py);
        this._drawStar(px, py, size, 5);

        this.ctx.restore();
    }



    // === ОТРИСОВКА ЧАСТИЦ ===
    drawParticles(particleSystem) {
        const ctx = this.ctx;

        // Светлячки (фон)
        for (const ff of particleSystem.fireflies) {
            ctx.globalAlpha = ff.brightness * 0.6;
            ctx.fillStyle = GAME_CONSTANTS.COLORS.POWER_DASH;
            ctx.shadowColor = GAME_CONSTANTS.COLORS.POWER_DASH;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(ff.x, ff.y, ff.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Основные частицы
        for (const p of particleSystem.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;

            if (p.type === 'flash') {
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                grad.addColorStop(0, p.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            } else if (p.type === 'star') {
                ctx.save();
                if (p.rotation !== undefined) {
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.translate(-p.x, -p.y);
                }
                this._drawStar(p.x, p.y, p.size, 4);
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // Экранные эффекты
        for (const effect of particleSystem.screenEffects) {
            ctx.globalAlpha = effect.alpha * 0.5;
            ctx.fillStyle = effect.color;
            if (effect.type === 'damage') {
                // Красная виньетка по краям
                const grad = ctx.createRadialGradient(
                    this.width / 2, this.height / 2, this.width * 0.3,
                    this.width / 2, this.height / 2, this.width * 0.7
                );
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(1, effect.color);
                ctx.fillStyle = grad;
            }
            ctx.fillRect(0, 0, this.width, this.height);
        }
        ctx.globalAlpha = 1;

        // Текстовые всплывашки
        for (const popup of particleSystem.textPopups) {
            ctx.globalAlpha = popup.alpha;
            ctx.font = `bold ${popup.size * popup.scale}px Arial`;
            ctx.fillStyle = popup.color;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    }

    // === ОТРИСОВКА ЭФФЕКТОВ АКТИВНОГО УСИЛЕНИЯ ===
    drawActivePowerEffect(effect) {
        if (!effect) return;
        const ctx = this.ctx;

        for (const p of effect.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    // === UI: ВЕРХНЯЯ ПАНЕЛЬ ===
    drawUI(lives, score, level, activePower, powerTimer, powerMaxTimer, time) {
        const ctx = this.ctx;
        const wobble = Math.sin(time / GAME_CONSTANTS.ANIMATIONS.UI_WOBBLE_SPEED * Math.PI * 2);

        // Фон панели
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.width, 55);

        // Сердца (жизни) — слева
        for (let i = 0; i < GAME_CONSTANTS.PLAYER.LIVES; i++) {
            const hx = 20 + i * 28;
            const hy = 27 + wobble * (i % 2 === 0 ? 1 : -1);
            this._drawHeart(hx, hy, 10, i < lives);
        }

        // Номер уровня — по центру
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_TEXT;
        ctx.textAlign = 'center';
        ctx.fillText(`Уровень ${level}`, this.width / 2, 32);

        // Счёт — справа
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_SCORE;
        ctx.textAlign = 'right';
        ctx.fillText(`★ ${score}`, this.width - 15, 32);

        // Иконка активного усиления
        if (activePower && powerTimer > 0) {
            const progress = powerTimer / powerMaxTimer;
            const barWidth = 80;
            const barX = this.width / 2 - barWidth / 2;
            const barY = 42;

            // Полоска таймера
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(barX, barY, barWidth, 6);

            let barColor;
            switch (activePower) {
                case 'dash': barColor = GAME_CONSTANTS.COLORS.POWER_DASH; break;
                case 'shield': barColor = GAME_CONSTANTS.COLORS.POWER_SHIELD; break;
                case 'magnet': barColor = GAME_CONSTANTS.COLORS.POWER_MAGNET; break;
                case 'freeze': barColor = GAME_CONSTANTS.COLORS.POWER_FREEZE; break;
                default: barColor = '#ffffff';
            }
            ctx.fillStyle = barColor;
            ctx.fillRect(barX, barY, barWidth * progress, 6);
        }

        ctx.textAlign = 'left';
    }

    _drawHeart(x, y, size, filled) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size * 0.3);
        this.ctx.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.1);
        this.ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size * 1.2);
        this.ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y + size * 0.1);
        this.ctx.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3);
        this.ctx.closePath();
        this.ctx.fillStyle = filled ? GAME_CONSTANTS.COLORS.UI_HEART : GAME_CONSTANTS.COLORS.UI_HEART_EMPTY;
        this.ctx.fill();
        this.ctx.restore();
    }

    // === КНОПКА ПАУЗЫ ===
    drawPauseButton(x, y, size) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x - size * 0.3, y - size * 0.4, size * 0.2, size * 0.8);
        this.ctx.fillRect(x + size * 0.1, y - size * 0.4, size * 0.2, size * 0.8);
    }

    // === ЭКРАН ПАУЗЫ ===
    drawPauseScreen() {
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_PAUSE_BG;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.font = 'bold 40px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Пауза', this.width / 2, this.height / 2);
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Нажмите чтобы продолжить', this.width / 2, this.height / 2 + 40);
        
        // Улучшение 1: иконка гардероба в паузе
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillText('Гардероб', 30, 35);
        this.ctx.font = '18px Arial';
        this.ctx.fillText('👕', 30, 18);
        
        this.ctx.textAlign = 'left';
    }

    // === ЭКРАН НАЧАЛА УРОВНЯ ===
    drawLevelIntro(level, progress) {
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const scale = 0.5 + progress * 0.5;
        const alpha = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;

        this.ctx.globalAlpha = alpha;
        this.ctx.font = `bold ${60 * scale}px Arial`;
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.STAR_PRIMARY;
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = GAME_CONSTANTS.COLORS.STAR_GLOW;
        this.ctx.shadowBlur = 20;
        this.ctx.fillText(`Уровень ${level}`, this.width / 2, this.height / 2);
        this.ctx.shadowBlur = 0;

        if (level % 10 === 0) {
            this.ctx.font = '20px Arial';
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillText('⚔ Хранитель ждёт! ⚔', this.width / 2, this.height / 2 + 50);
        }

        this.ctx.globalAlpha = 1;
        this.ctx.textAlign = 'left';
    }

    // === СТАРТОВЫЙ ЭКРАН ===
    drawMenuScreen(hasSave, time, crystalBalance) {
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Название
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.STAR_PRIMARY;
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = GAME_CONSTANTS.COLORS.STAR_GLOW;
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('Сказочный Лабиринт', this.width / 2, 120);
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.PORTAL_SECONDARY;
        this.ctx.fillText('Магия процедурных миров', this.width / 2, 155);
        this.ctx.shadowBlur = 0;

        // Баланс кристаллов (Улучшение 1)
        if (crystalBalance !== undefined) {
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#64b5f6';
            this.ctx.fillText(`Кристаллы: ${crystalBalance}`, this.width / 2, 180);
        }

        // Лисёнок (машет лапкой)
        const foxyY = 270 + Math.sin(time * 0.002) * 5;
        this._drawMenuFoxy(this.width / 2, foxyY, time);

        // Кнопка "Играть"
        this._drawButton(this.width / 2, 430, 160, 50, 'Играть', GAME_CONSTANTS.COLORS.POWER_SHIELD);

        // Кнопка "Продолжить"
        if (hasSave) {
            this._drawButton(this.width / 2, 500, 160, 50, 'Продолжить', GAME_CONSTANTS.COLORS.PORTAL_PRIMARY);
        }

        // Улучшение 1: Кнопка "Гардероб"
        this._drawButton(this.width / 2, 570, 160, 50, 'Гардероб', '#ffd700');

        this.ctx.textAlign = 'left';
    }

    _drawMenuFoxy(x, y, time) {
        const cs = 80;
        const size = cs * 0.4;
        const ctx = this.ctx;

        // Тело
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 1.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_BODY;
        ctx.fill();

        // Животик
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.3, size * 0.5, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_BELLY;
        ctx.fill();

        // Ушки
        ctx.beginPath();
        ctx.moveTo(x - size * 0.6, y - size * 0.8);
        ctx.lineTo(x - size * 0.3, y - size * 1.5);
        ctx.lineTo(x, y - size * 0.8);
        ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_EARS;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.8);
        ctx.lineTo(x + size * 0.3, y - size * 1.5);
        ctx.lineTo(x + size * 0.6, y - size * 0.8);
        ctx.fill();

        // Глаза
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath();
        ctx.arc(x - size * 0.25, y - size * 0.2, size * 0.15, 0, Math.PI * 2);
        ctx.arc(x + size * 0.25, y - size * 0.2, size * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Блики
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - size * 0.2, y - size * 0.25, size * 0.06, 0, Math.PI * 2);
        ctx.arc(x + size * 0.3, y - size * 0.25, size * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Нос
        ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_NOSE;
        ctx.beginPath();
        ctx.arc(x, y + size * 0.05, size * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Машущая лапка
        const waveAngle = Math.sin(time * 0.005) * 0.4;
        ctx.save();
        ctx.translate(x + size * 0.7, y);
        ctx.rotate(waveAngle - 0.5);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.3, size * 0.2, size * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_BODY;
        ctx.fill();
        ctx.restore();
    }

    _drawButton(x, y, w, h, text, color) {
        const ctx = this.ctx;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        // Скругленный прямоугольник
        ctx.beginPath();
        const r = 12;
        ctx.moveTo(x - w / 2 + r, y - h / 2);
        ctx.lineTo(x + w / 2 - r, y - h / 2);
        ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r);
        ctx.lineTo(x + w / 2, y + h / 2 - r);
        ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r, y + h / 2);
        ctx.lineTo(x - w / 2 + r, y + h / 2);
        ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r);
        ctx.lineTo(x - w / 2, y - h / 2 + r);
        ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r, y - h / 2);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.textBaseline = 'alphabetic';

        ctx.restore();
    }

    // === ЭКРАН ПОРАЖЕНИЯ ===
    drawGameOverScreen(score, level, highScore) {
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_PAUSE_BG;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const ctx = this.ctx;
        ctx.textAlign = 'center';

        // Грустный лисёнок
        this._drawSadFoxy(this.width / 2, 200);

        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Ой! Попробуй ещё раз', this.width / 2, 320);

        ctx.font = '18px Arial';
        ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_SCORE;
        ctx.fillText(`Очки: ${score}`, this.width / 2, 370);
        ctx.fillText(`Уровень: ${level}`, this.width / 2, 400);
        ctx.fillText(`Рекорд: ${highScore}`, this.width / 2, 430);

        this._drawButton(this.width / 2, 510, 160, 50, 'Заново', GAME_CONSTANTS.COLORS.POWER_SHIELD);

        ctx.textAlign = 'left';
    }

    _drawSadFoxy(x, y) {
        const size = 30;
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 1.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_BODY;
        ctx.fill();

        // Грустные глаза (полукруги вниз)
        ctx.strokeStyle = '#2c2c2c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x - size * 0.25, y - size * 0.1, size * 0.12, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + size * 0.25, y - size * 0.1, size * 0.12, 0, Math.PI);
        ctx.stroke();

        // Грустный рот
        ctx.beginPath();
        ctx.arc(x, y + size * 0.4, size * 0.2, Math.PI, 0);
        ctx.stroke();
    }

    // ======================================================================
    // УЛУЧШЕНИЕ 1: Отрисовка экрана Волшебного Гардероба
    // ======================================================================
    drawShopScreen(shop, time) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Фон
        ctx.fillStyle = '#0d0520';
        ctx.fillRect(0, 0, w, h);
        
        // Магические частицы фона
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 20; i++) {
            const x = (Math.sin(time * 0.001 + i * 1.7) + 1) * w / 2;
            const y = (Math.cos(time * 0.0008 + i * 2.3) + 1) * h / 2;
            ctx.fillStyle = ['#9c27b0', '#e040fb', '#ffd700', '#64b5f6'][i % 4];
            ctx.beginPath();
            ctx.arc(x, y, 2 + Math.sin(time * 0.003 + i) * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Заголовок
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.fillText('Волшебный Гардероб', w / 2, 40);
        ctx.shadowBlur = 0;

        // Баланс кристаллов
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#64b5f6';
        ctx.fillText(`Кристаллы: ${shop.getCrystals()}`, w / 2, 70);

        // Кнопка закрытия
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(w - 30, 30, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w - 37, 23);
        ctx.lineTo(w - 23, 37);
        ctx.moveTo(w - 23, 23);
        ctx.lineTo(w - 37, 37);
        ctx.stroke();

        // Сетка скинов (2 колонки)
        const gridStartX = 30;
        const gridStartY = 100;
        const cellW = (w - 80) / 2;
        const cellH = 100;
        const gap = 10;

        for (let i = 0; i < SKINS_DATA.length; i++) {
            const skin = SKINS_DATA[i];
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = gridStartX + col * (cellW + gap);
            const cy = gridStartY + row * (cellH + gap) - shop.scrollOffset;

            // Пропускаем вне экрана
            if (cy + cellH < 80 || cy > h) continue;

            const isOwned = shop.isOwned(i);
            const isActive = shop.activeSkinId === i;
            const canBuy = shop.canBuy(i);

            // Фон карточки
            if (isActive) {
                ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
                ctx.strokeStyle = '#4caf50';
            } else if (isOwned) {
                ctx.fillStyle = 'rgba(100, 181, 246, 0.2)';
                ctx.strokeStyle = '#64b5f6';
            } else if (canBuy) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
                ctx.strokeStyle = '#ffd700';
            } else {
                ctx.fillStyle = 'rgba(80, 80, 80, 0.3)';
                ctx.strokeStyle = '#555555';
            }

            // Скругленный прямоугольник
            this._drawRoundedRect(cx, cy, cellW, cellH, 8);
            ctx.fill();
            ctx.lineWidth = isActive ? 2 : 1;
            this._drawRoundedRect(cx, cy, cellW, cellH, 8);
            ctx.stroke();

            // Мини-лисёнок с цветами скина (или вопросительный знак)
            if (isOwned || canBuy) {
                this._drawMiniSkinPreview(cx + 30, cy + cellH / 2, skin, time);
            } else {
                // Серый силуэт с вопросительным знаком
                ctx.fillStyle = '#555555';
                ctx.beginPath();
                ctx.arc(cx + 30, cy + cellH / 2, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = '#888888';
                ctx.textAlign = 'center';
                ctx.fillText('?', cx + 30, cy + cellH / 2 + 6);
            }

            // Название
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = isOwned ? '#ffffff' : (canBuy ? '#ffd700' : '#888888');
            ctx.textAlign = 'left';
            ctx.fillText(skin.name, cx + 60, cy + 25);

            // Цена или статус
            ctx.font = '11px Arial';
            if (isActive) {
                ctx.fillStyle = '#4caf50';
                ctx.fillText('Надето', cx + 60, cy + 45);
            } else if (isOwned) {
                ctx.fillStyle = '#64b5f6';
                ctx.fillText('Нажми чтобы надеть', cx + 60, cy + 45);
            } else {
                ctx.fillStyle = canBuy ? '#ffd700' : '#ff5252';
                ctx.fillText(`${skin.price} кристаллов`, cx + 60, cy + 45);
            }

            // Описание
            ctx.font = '10px Arial';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(skin.description.substring(0, 28), cx + 60, cy + 65);
            if (skin.description.length > 28) {
                ctx.fillText(skin.description.substring(28, 56), cx + 60, cy + 80);
            }

            // Индикатор уровня (звёздочки по тиру)
            for (let s = 0; s < skin.tier; s++) {
                ctx.fillStyle = isOwned ? '#ffd700' : '#555555';
                ctx.font = '8px Arial';
                ctx.fillText('★', cx + 60 + s * 10, cy + cellH - 8);
            }
        }

        // Подсказка внизу
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('Собирай кристаллы в лабиринтах!', w / 2, h - 15);
        ctx.textAlign = 'left';
    }

    // Мини-превью скина (маленький лисёнок с цветами)
    _drawMiniSkinPreview(x, y, skin, time) {
        const ctx = this.ctx;
        const size = 16;

        // Свечение
        if (skin.glowIntensity > 5) {
            ctx.shadowColor = skin.glowColor;
            ctx.shadowBlur = skin.glowIntensity * 0.5;
        }

        // Тело
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 1.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin.bodyColor;
        ctx.fill();

        // Животик
        ctx.beginPath();
        ctx.ellipse(x, y + size * 0.3, size * 0.5, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin.bellyColor;
        ctx.fill();

        // Ушки
        ctx.beginPath();
        ctx.moveTo(x - size * 0.5, y - size * 0.7);
        ctx.lineTo(x - size * 0.2, y - size * 1.3);
        ctx.lineTo(x + size * 0.1, y - size * 0.7);
        ctx.fillStyle = skin.earsColor;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - size * 0.1, y - size * 0.7);
        ctx.lineTo(x + size * 0.2, y - size * 1.3);
        ctx.lineTo(x + size * 0.5, y - size * 0.7);
        ctx.fill();

        // Глазки
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath();
        ctx.arc(x - size * 0.2, y - size * 0.15, 2, 0, Math.PI * 2);
        ctx.arc(x + size * 0.2, y - size * 0.15, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Аксессуары для тиров 2+
        if (skin.accessory === 'wreath') {
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y - size * 0.9, size * 0.5, 0.8 * Math.PI, 0.2 * Math.PI);
            ctx.stroke();
            // Листочки
            ctx.fillStyle = '#66bb6a';
            ctx.beginPath();
            ctx.ellipse(x - size * 0.4, y - size * 1.1, 3, 2, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x + size * 0.3, y - size * 1.0, 3, 2, 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (skin.accessory === 'pirate_hat') {
            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.moveTo(x - size * 0.6, y - size * 1.2);
            ctx.lineTo(x, y - size * 1.8);
            ctx.lineTo(x + size * 0.6, y - size * 1.2);
            ctx.closePath();
            ctx.fill();
            // Черепушка
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y - size * 1.35, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (skin.accessory === 'shadow_crown') {
            // Корона из теней
            const pulse = Math.sin(time * 0.003) * 2;
            ctx.fillStyle = '#9c27b0';
            ctx.shadowColor = '#9c27b0';
            ctx.shadowBlur = 5 + pulse;
            ctx.beginPath();
            const crownY = y - size * 1.3;
            ctx.moveTo(x - size * 0.5, crownY);
            ctx.lineTo(x - size * 0.3, crownY - size * 0.4);
            ctx.lineTo(x, crownY - size * 0.15);
            ctx.lineTo(x + size * 0.3, crownY - size * 0.4);
            ctx.lineTo(x + size * 0.5, crownY);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (skin.accessory === 'galaxy_crown') {
            // Звёздная корона
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 8;
            this._drawStar(x, y - size * 1.4, 6, 5);
            ctx.shadowBlur = 0;
        }
    }

    // Отрисовка анимации покупки скина
    drawPurchaseAnimation(shop, time) {
        if (!shop.purchaseAnimation) return;
        const ctx = this.ctx;
        const anim = shop.purchaseAnimation;
        const w = this.width;
        const h = this.height;
        const progress = shop.purchasePhase / shop.purchaseDuration;
        const skin = SKINS_DATA[anim.skinId];

        // Затемнение
        ctx.fillStyle = `rgba(0, 0, 0, ${anim.flashAlpha})`;
        ctx.fillRect(0, 0, w, h);

        // Силуэт лисёнка в центре
        const cx = w / 2;
        const cy = h / 2;
        const foxySize = 40;

        // Свечение вокруг лисёнка
        if (progress > 0.1) {
            const glowSize = 60 + Math.sin(time * 0.01) * 10;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
            grad.addColorStop(0, skin.glowColor);
            grad.addColorStop(1, 'transparent');
            ctx.globalAlpha = Math.min(1, progress * 2) * 0.6;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Лисёнок (переходит от оранжевого к цвету скина)
        const t = Math.min(1, (progress - 0.3) / 0.4);
        const bodyColor = t > 0 ? skin.bodyColor : GAME_CONSTANTS.COLORS.FOXY_BODY;
        
        ctx.beginPath();
        ctx.ellipse(cx, cy, foxySize, foxySize * 1.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();

        // Расходящиеся волны света
        if (anim.waveRadius > 0) {
            ctx.strokeStyle = skin.glowColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = Math.max(0, 1 - anim.waveRadius / 300);
            ctx.beginPath();
            ctx.arc(cx, cy, anim.waveRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Частицы фейерверков
        for (const p of anim.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Текст с названием скина (появляется в конце)
        if (progress > 0.7) {
            const textAlpha = (progress - 0.7) / 0.3;
            ctx.globalAlpha = textAlpha;
            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = skin.glowColor;
            ctx.textAlign = 'center';
            ctx.shadowColor = skin.glowColor;
            ctx.shadowBlur = 10;
            ctx.fillText(skin.name, cx, cy + 80);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Облик получен!', cx, cy + 105);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        ctx.textAlign = 'left';
    }

    // Вспомогательный: скруглённый прямоугольник
    _drawRoundedRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // === ОТРИСОВКА ЭФФЕКТОВ СКИНА (новая система через SkinEffectsSystem) ===
    drawSkinEffects(player, skin, time, skinEffects) {
        if (!skin) return;
        // Если передана новая система эффектов — используем её
        if (skinEffects) {
            skinEffects.render(this.ctx, this.offsetX, this.offsetY, player, skin, time);
            return;
        }
        // Фоллбэк для совместимости (минимальные эффекты)
        const ctx = this.ctx;
        const cs = this.cellSize;
        const px = this.offsetX + player.pixelX + cs / 2;
        const py = this.offsetY + player.pixelY + cs / 2 - player.bounceOffset;
        const size = cs * 0.35;
        if (skin.glowIntensity >= 10) {
            ctx.shadowColor = skin.glowColor;
            ctx.shadowBlur = skin.glowIntensity * 0.3 + Math.sin(time * 0.003) * 3;
            ctx.beginPath();
            ctx.ellipse(px, py, size * 0.3, size * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'transparent';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // === ОТРИСОВКА МОЛНИИ (поверх всего) ===
    drawLightning(lightning) {
        if (!lightning || !lightning.isActive()) return;
        lightning.render(this.ctx, this.offsetX, this.offsetY, this.width, this.height);
    }

    // === БОНУС-КОМНАТА ===
    drawBonusRoom(bonusRoom, player, time) {
        // Золотой фон
        const grad = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width
        );
        grad.addColorStop(0, '#3d2b00');
        grad.addColorStop(1, '#1a0a2e');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Надпись
        this.ctx.font = 'bold 22px Arial';
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.STAR_PRIMARY;
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = GAME_CONSTANTS.COLORS.STAR_GLOW;
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('Тайная комната!', this.width / 2, 35);
        this.ctx.shadowBlur = 0;

        // Таймер
        const progress = bonusRoom.getTimerProgress();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(this.width / 2 - 60, 45, 120, 6);
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.STAR_PRIMARY;
        this.ctx.fillRect(this.width / 2 - 60, 45, 120 * progress, 6);

        // Золотые частицы
        for (const p of bonusRoom.goldParticles) {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = GAME_CONSTANTS.COLORS.PARTICLE_GOLD;
            this.ctx.beginPath();
            this.ctx.arc(this.offsetX + p.x, this.offsetY + p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
        this.ctx.textAlign = 'left';
    }
}
