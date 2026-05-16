// Файл: magic-maze/js/renderer.js
// Отрисовка Canvas — ОПТИМИЗИРОВАНО
// Offscreen canvas для стен, viewport culling, кеширование размеров

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

        // Offscreen canvas для статичных стен (пререндер)
        this._wallCanvas = null;
        this._wallCtx = null;
        this._wallCacheDirty = true;
        this._cachedMatrix = null;
    }

    setOffset(mazeWidth, mazeHeight, cellSize) {
        this.cellSize = cellSize;
        this.offsetX = (this.width - mazeWidth * cellSize) / 2;
        this.offsetY = 60 + (this.height - 60 - mazeHeight * cellSize) / 2;
        // Помечаем кеш стен как грязный при смене уровня
        this._wallCacheDirty = true;
    }

    clear() {
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    updateWallBreath(deltaTime) {
        this.wallBreathPhase += deltaTime * 0.001;
    }

    // === OFFSCREEN CANVAS ДЛЯ СТЕН ===
    _buildWallCache(matrix) {
        const cs = this.cellSize;
        const mazeW = matrix[0].length * cs;
        const mazeH = matrix.length * cs;

        if (!this._wallCanvas || this._wallCanvas.width !== mazeW || this._wallCanvas.height !== mazeH) {
            this._wallCanvas = document.createElement('canvas');
            this._wallCanvas.width = mazeW;
            this._wallCanvas.height = mazeH;
            this._wallCtx = this._wallCanvas.getContext('2d');
        }

        const wctx = this._wallCtx;
        wctx.clearRect(0, 0, mazeW, mazeH);

        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[0].length; x++) {
                const px = x * cs;
                const py = y * cs;

                if (matrix[y][x] === GAME_CONSTANTS.CELL_TYPES.WALL) {
                    // Стена с простым градиентом
                    const grad = wctx.createLinearGradient(px, py, px + cs, py + cs);
                    grad.addColorStop(0, GAME_CONSTANTS.COLORS.WALL_PRIMARY);
                    grad.addColorStop(1, GAME_CONSTANTS.COLORS.WALL_SECONDARY);
                    wctx.fillStyle = grad;
                    wctx.fillRect(px, py, cs, cs);
                    // Свечение краёв
                    wctx.strokeStyle = GAME_CONSTANTS.COLORS.WALL_GLOW;
                    wctx.lineWidth = 0.5;
                    wctx.globalAlpha = 0.3;
                    wctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
                    wctx.globalAlpha = 1;
                } else {
                    // Пол
                    wctx.fillStyle = GAME_CONSTANTS.COLORS.FLOOR;
                    wctx.fillRect(px, py, cs, cs);
                    if ((x + y) % 2 === 0) {
                        wctx.fillStyle = GAME_CONSTANTS.COLORS.FLOOR_LIGHT;
                        wctx.globalAlpha = 0.1;
                        wctx.fillRect(px, py, cs, cs);
                        wctx.globalAlpha = 1;
                    }
                }
            }
        }

        this._wallCacheDirty = false;
        this._cachedMatrix = matrix;
    }

    // === ОТРИСОВКА ЛАБИРИНТА (из кеша) ===
    drawMaze(matrix) {
        // Пререндерим стены один раз
        if (this._wallCacheDirty || this._cachedMatrix !== matrix) {
            this._buildWallCache(matrix);
        }
        // Рисуем кешированное изображение
        this.ctx.drawImage(this._wallCanvas, this.offsetX, this.offsetY);
    }

    // Сбросить кеш стен (вызывать при изменении матрицы призрачными стенами)
    invalidateWallCache() {
        this._wallCacheDirty = true;
    }

    // === ПРОВЕРКА ВИДИМОСТИ (viewport culling) ===
    _isVisible(px, py, size) {
        return px + size > 0 && px - size < this.width &&
               py + size > 0 && py - size < this.height;
    }

    // === ОТРИСОВКА КРИСТАЛЛОВ ===
    drawCrystals(crystals, time) {
        const cs = this.cellSize;
        for (const crystal of crystals) {
            if (crystal.collected) continue;
            const px = this.offsetX + crystal.x * cs + cs / 2;
            const py = this.offsetY + crystal.y * cs + cs / 2;

            // Viewport culling
            if (!this._isVisible(px, py, cs)) continue;

            const float = Math.sin(time * 0.003 + crystal.x + crystal.y) * 3;
            const size = cs * 0.25;

            // Свечение через shadowBlur
            this.ctx.shadowColor = GAME_CONSTANTS.COLORS.CRYSTAL_BLUE;
            this.ctx.shadowBlur = 8 + Math.sin(time * 0.005) * 3;

            // Ромб кристалла
            this.ctx.beginPath();
            this.ctx.moveTo(px, py - size + float);
            this.ctx.lineTo(px + size * 0.7, py + float);
            this.ctx.lineTo(px, py + size * 0.6 + float);
            this.ctx.lineTo(px - size * 0.7, py + float);
            this.ctx.closePath();

            // Упрощённая заливка (без createRadialGradient для каждого кристалла)
            this.ctx.fillStyle = GAME_CONSTANTS.COLORS.CRYSTAL_BLUE;
            this.ctx.fill();

            // Белый центр
            this.ctx.fillStyle = '#ffffff';
            this.ctx.globalAlpha = 0.5;
            this.ctx.beginPath();
            this.ctx.arc(px, py + float, size * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;

            this.ctx.shadowBlur = 0;
        }
    }

    // === ОТРИСОВКА ЛИСЁНКА ФОКСИ ===
    drawPlayer(player, skinOverride, skinEffects) {
        if (!player.isVisible) return;

        const cs = this.cellSize;
        const emotionJump = player.emotionJumpOffset || 0;
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

        const skin = skinOverride || null;
        const bodyColor = skin ? skin.bodyColor : GAME_CONSTANTS.COLORS.FOXY_BODY;
        const bellyColor = skin ? skin.bellyColor : GAME_CONSTANTS.COLORS.FOXY_BELLY;
        const tailColor = skin ? skin.tailColor : GAME_CONSTANTS.COLORS.FOXY_TAIL;
        const earsColor = skin ? skin.earsColor : GAME_CONSTANTS.COLORS.FOXY_EARS;

        if (skin && skin.glowIntensity > 3) {
            this.ctx.shadowColor = skin.glowColor;
            this.ctx.shadowBlur = skin.glowIntensity * 0.5;
        }

        if (player.activePower === 'shield') {
            this.ctx.shadowColor = GAME_CONSTANTS.COLORS.POWER_SHIELD;
            this.ctx.shadowBlur = 15;
        } else if (player.activePower === 'dash') {
            this.ctx.shadowColor = GAME_CONSTANTS.COLORS.POWER_DASH;
            this.ctx.shadowBlur = 10;
        }

        if (skin && skin.transparency) {
            this.ctx.globalAlpha = skin.transparency;
        }

        const skinData = { bodyColor, bellyColor, tailColor, earsColor };
        this.drawDetailedFox(px, drawY, size, skinData, player);

        this.ctx.shadowBlur = 0;
        this.ctx.restore();

        // Блёстки эмоций
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

        // Слёзки
        for (const tear of player.emotionTears) {
            const tx = px + tear.x * size;
            const ty = drawY - size * 0.3 + tear.y + size * 0.3;
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



    // === ДЕТАЛИЗИРОВАННАЯ ОТРИСОВКА ЛИСЁНКА (без изменений — анимации скинов) ===
    drawDetailedFox(px, drawY, size, skinData, player) {
        const ctx = this.ctx;
        const time = performance.now();
        const squash = player.emotionSquash || 1;
        const stretch = player.emotionStretch || 1;
        const earAngle = player.emotionEarAngle || 0;
        const tailAngle = player.emotionState === 'sad' ? 0.5 : (player.tailAngle || 0);
        const { bodyColor, bellyColor, tailColor, earsColor } = skinData;

        // Хвост
        ctx.save();
        const tailBaseX = px - size * 0.6;
        const tailBaseY = drawY + size * 0.4;
        ctx.translate(tailBaseX, tailBaseY);
        ctx.rotate(tailAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-size * 0.3, -size * 0.4, -size * 0.8, -size * 0.5, -size * 0.9, -size * 0.1);
        ctx.bezierCurveTo(-size * 1.0, size * 0.1, -size * 0.7, size * 0.3, -size * 0.3, size * 0.15);
        ctx.bezierCurveTo(-size * 0.1, size * 0.1, 0, size * 0.05, 0, 0);
        const tailGrad = ctx.createLinearGradient(0, 0, -size * 0.9, 0);
        tailGrad.addColorStop(0, tailColor);
        tailGrad.addColorStop(0.7, tailColor);
        tailGrad.addColorStop(1, bellyColor);
        ctx.fillStyle = tailGrad;
        ctx.fill();
        ctx.restore();

        // Задние лапки
        const legBounce = player.isMoving ? Math.sin(time * 0.015) * 2 : 0;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(px - size * 0.35, drawY + size * 0.85 + legBounce, size * 0.18 * squash, size * 0.22 * stretch, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bellyColor;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(px - size * 0.4 + i * size * 0.06, drawY + size * 1.05 + legBounce, size * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }
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

        // Туловище
        const bodyGrad = ctx.createRadialGradient(px, drawY - size * 0.1, 0, px, drawY, size * 1.2);
        bodyGrad.addColorStop(0, this._lightenColor(bodyColor, 20));
        bodyGrad.addColorStop(0.7, bodyColor);
        bodyGrad.addColorStop(1, this._darkenColor(bodyColor, 30));
        ctx.beginPath();
        ctx.ellipse(px, drawY + size * 0.2, size * 0.7 * squash, size * 0.85 * stretch, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Грудка
        const bellyGrad = ctx.createRadialGradient(px, drawY + size * 0.3, 0, px, drawY + size * 0.3, size * 0.5);
        bellyGrad.addColorStop(0, bellyColor);
        bellyGrad.addColorStop(1, 'rgba(255, 224, 178, 0)');
        ctx.beginPath();
        ctx.ellipse(px, drawY + size * 0.35, size * 0.4 * squash, size * 0.55 * stretch, 0, 0, Math.PI * 2);
        ctx.fillStyle = bellyGrad;
        ctx.fill();

        // Передние лапки
        const armBounce = player.isMoving ? Math.sin(time * 0.015 + 1) * 2 : 0;
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

        // Голова
        const headY = drawY - size * 0.35;
        const headGrad = ctx.createRadialGradient(px, headY - size * 0.1, 0, px, headY, size * 0.7);
        headGrad.addColorStop(0, this._lightenColor(bodyColor, 15));
        headGrad.addColorStop(1, bodyColor);
        ctx.beginPath();
        ctx.ellipse(px, headY, size * 0.55 * squash, size * 0.5 * stretch, 0, 0, Math.PI * 2);
        ctx.fillStyle = headGrad;
        ctx.fill();

        // Щёчки
        ctx.fillStyle = bellyColor;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.ellipse(px - size * 0.3, headY + size * 0.15, size * 0.2, size * 0.15, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px + size * 0.3, headY + size * 0.15, size * 0.2, size * 0.15, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Ушки
        ctx.save();
        ctx.translate(px - size * 0.35, headY - size * 0.35);
        ctx.rotate(-0.25 + earAngle);
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

        // Глаза
        const eyeScale = player.emotionEyeScale || 1;
        const eyeSpacing = size * 0.22;
        const eyeY = headY - size * 0.02;
        const eyeR = size * 0.14 * eyeScale;

        if (player.emotionState === 'happy' || player.emotionState === 'celebrating') {
            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.arc(px + eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            this._drawStar(px - eyeSpacing, eyeY, eyeR * 0.5, 4);
            this._drawStar(px + eyeSpacing, eyeY, eyeR * 0.5, 4);
        } else if (player.emotionState === 'scared') {
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
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing, eyeY, eyeR * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing, eyeY, eyeR * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - eyeSpacing + eyeR * 0.2, eyeY - eyeR * 0.25, eyeR * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing + eyeR * 0.2, eyeY - eyeR * 0.25, eyeR * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px - eyeSpacing - eyeR * 0.15, eyeY + eyeR * 0.15, eyeR * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + eyeSpacing - eyeR * 0.15, eyeY + eyeR * 0.15, eyeR * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Носик
        const noseY = headY + size * 0.15;
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(px, noseY - size * 0.04);
        ctx.lineTo(px - size * 0.06, noseY + size * 0.04);
        ctx.lineTo(px + size * 0.06, noseY + size * 0.04);
        ctx.closePath();
        ctx.fill();

        // Ротик
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
            ctx.strokeStyle = '#2c2c2c';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, mouthY - size * 0.02, size * 0.06, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();
        }
    }

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
            // Viewport culling
            if (!this._isVisible(px, py, cs)) continue;

            const size = cs * 0.35 * enemy.shadowSize;
            const pulse = Math.sin(enemy.pulsePhase) * 3;

            this.ctx.save();
            if (enemy.isFrozen) {
                this.ctx.shadowColor = '#80d8ff';
                this.ctx.shadowBlur = 6;
                this.ctx.fillStyle = '#4fc3f7';
            } else {
                this.ctx.shadowColor = GAME_CONSTANTS.COLORS.SHADOW_GLOW;
                this.ctx.shadowBlur = 6 + pulse;
                this.ctx.fillStyle = GAME_CONSTANTS.COLORS.SHADOW_BODY;
            }

            // Тело
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
                this.ctx.shadowBlur = 3;
                this.ctx.shadowColor = '#ff0000';
                const eyeSize = size * 0.2;
                this.ctx.beginPath();
                this.ctx.arc(px - size * 0.3 + enemy.eyeOffset, py - size * 0.1, eyeSize, 0, Math.PI * 2);
                this.ctx.arc(px + size * 0.3 + enemy.eyeOffset, py - size * 0.1, eyeSize, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(px - size * 0.3, py - size * 0.1, size * 0.15, 0, Math.PI * 2);
                this.ctx.arc(px + size * 0.3, py - size * 0.1, size * 0.15, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Корона хранителя
            if (enemy.isGuardian) {
                this.ctx.fillStyle = GAME_CONSTANTS.COLORS.GUARDIAN_CROWN;
                this.ctx.shadowColor = '#ffd700';
                this.ctx.shadowBlur = 4;
                const crownY = py - size * 0.9;
                this.ctx.beginPath();
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
            if (!this._isVisible(px, py, cs)) continue;

            const size = cs * 0.3;
            const color = power.getColor();

            this.ctx.save();
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 8 * power.glowIntensity;
            this.ctx.beginPath();
            this.ctx.arc(px, py, size, 0, Math.PI * 2);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.6 + power.glowIntensity * 0.4;
            this.ctx.stroke();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = color;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = '#ffffff';
            this._drawPowerIcon(px, py, size * 0.5, power.getIcon());
            this.ctx.restore();
        }
    }

    _drawPowerIcon(x, y, size, icon) {
        switch (icon) {
            case 'star': this._drawStar(x, y, size, 5); break;
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

    // === ПОРТАЛ ===
    drawPortal(portal) {
        if (!portal || !portal.active) return;
        const cs = this.cellSize;
        const px = this.offsetX + portal.pos.x * cs + cs / 2;
        const py = this.offsetY + portal.pos.y * cs + cs / 2;
        if (!this._isVisible(px, py, cs * 2)) return;

        const size = cs * 0.4 * portal.pulseScale;
        this.ctx.save();
        this.ctx.shadowColor = GAME_CONSTANTS.COLORS.PORTAL_PRIMARY;
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size, 0, Math.PI * 2);
        this.ctx.strokeStyle = GAME_CONSTANTS.COLORS.PORTAL_PRIMARY;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 0.7, portal.ringPhase, portal.ringPhase + Math.PI * 1.5);
        this.ctx.strokeStyle = GAME_CONSTANTS.COLORS.PORTAL_SECONDARY;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        const innerGrad = this.ctx.createRadialGradient(px, py, 0, px, py, size * 0.5);
        innerGrad.addColorStop(0, 'rgba(156, 39, 176, 0.8)');
        innerGrad.addColorStop(1, 'rgba(156, 39, 176, 0)');
        this.ctx.fillStyle = innerGrad;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
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

    // === ПАУТИНА ===
    drawWebs(webs) {
        const cs = this.cellSize;
        for (const web of webs) {
            const px = this.offsetX + web.x * cs + cs / 2;
            const py = this.offsetY + web.y * cs + cs / 2;
            if (!this._isVisible(px, py, cs)) continue;
            const size = cs * 0.35;
            this.ctx.save();
            this.ctx.strokeStyle = GAME_CONSTANTS.COLORS.WEB_COLOR;
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.7;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                this.ctx.beginPath();
                this.ctx.moveTo(px, py);
                this.ctx.lineTo(px + Math.cos(angle) * size, py + Math.sin(angle) * size);
                this.ctx.stroke();
            }
            for (let r = 1; r <= 3; r++) {
                this.ctx.beginPath();
                this.ctx.arc(px, py, size * r / 3, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }
    }

    // === ДВИЖУЩИЕСЯ СТЕНЫ ===
    drawMovingWalls(movingWalls) {
        const cs = this.cellSize;
        for (const wall of movingWalls) {
            if (!wall.isBlocking) continue;
            const px = this.offsetX + wall.pos.x * cs;
            const py = this.offsetY + wall.pos.y * cs;
            if (!this._isVisible(px + cs/2, py + cs/2, cs)) continue;
            this.ctx.fillStyle = '#8b4513';
            this.ctx.shadowColor = '#ff8c00';
            this.ctx.shadowBlur = 4;
            this.ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
            this.ctx.shadowBlur = 0;
        }
    }

    // === ФИНИШНАЯ ЗВЕЗДА ===
    drawFinishStar(pos, time) {
        const cs = this.cellSize;
        const px = this.offsetX + pos.x * cs + cs / 2;
        const py = this.offsetY + pos.y * cs + cs / 2;
        if (!this._isVisible(px, py, cs)) return;
        const size = cs * 0.35 + Math.sin(time * 0.004) * 3;
        this.ctx.save();
        this.ctx.shadowColor = GAME_CONSTANTS.COLORS.STAR_GLOW;
        this.ctx.shadowBlur = 12 + Math.sin(time * 0.003) * 4;
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.STAR_PRIMARY;
        this.ctx.translate(px, py);
        this.ctx.rotate(time * 0.001);
        this.ctx.translate(-px, -py);
        this._drawStar(px, py, size, 5);
        this.ctx.restore();
    }

    // === ЧАСТИЦЫ ===
    drawParticles(particleSystem) {
        const ctx = this.ctx;
        // Светлячки
        for (const ff of particleSystem.fireflies) {
            ctx.globalAlpha = ff.brightness * 0.6;
            ctx.fillStyle = GAME_CONSTANTS.COLORS.POWER_DASH;
            ctx.beginPath();
            ctx.arc(ff.x, ff.y, ff.size, 0, Math.PI * 2);
            ctx.fill();
            // Ореол без shadowBlur
            ctx.globalAlpha = ff.brightness * 0.15;
            ctx.beginPath();
            ctx.arc(ff.x, ff.y, ff.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Основные частицы
        for (const p of particleSystem.particles) {
            if (!this._isVisible(p.x, p.y, p.size * 2)) continue;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            if (p.type === 'flash') {
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
            ctx.shadowBlur = 3;
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    }

    // === ЭФФЕКТ АКТИВНОГО УСИЛЕНИЯ ===
    drawActivePowerEffect(effect) {
        if (!effect) return;
        const ctx = this.ctx;
        for (const p of effect.particles) {
            if (!this._isVisible(p.x, p.y, p.size * 2)) continue;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // === UI ===
    drawUI(lives, score, level, activePower, powerTimer, powerMaxTimer, time) {
        const ctx = this.ctx;
        const wobble = Math.sin(time / GAME_CONSTANTS.ANIMATIONS.UI_WOBBLE_SPEED * Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.width, 55);
        for (let i = 0; i < GAME_CONSTANTS.PLAYER.LIVES; i++) {
            const hx = 20 + i * 28;
            const hy = 27 + wobble * (i % 2 === 0 ? 1 : -1);
            this._drawHeart(hx, hy, 10, i < lives);
        }
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_TEXT;
        ctx.textAlign = 'center';
        ctx.fillText(`Уровень ${level}`, this.width / 2, 32);
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_SCORE;
        ctx.textAlign = 'right';
        ctx.fillText(`★ ${score}`, this.width - 15, 32);
        if (activePower && powerTimer > 0) {
            const progress = powerTimer / powerMaxTimer;
            const barWidth = 80;
            const barX = this.width / 2 - barWidth / 2;
            const barY = 42;
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

    drawPauseButton(x, y, size) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x - size * 0.3, y - size * 0.4, size * 0.2, size * 0.8);
        this.ctx.fillRect(x + size * 0.1, y - size * 0.4, size * 0.2, size * 0.8);
    }

    drawPauseScreen() {
        // Используется только как fallback — основная отрисовка в menu.js
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.UI_PAUSE_BG;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.font = 'bold 40px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Пауза', this.width / 2, this.height / 2);
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Нажмите чтобы продолжить', this.width / 2, this.height / 2 + 40);
        this.ctx.textAlign = 'left';
    }

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
        this.ctx.shadowBlur = 15;
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

    // === СТАРТОВЫЙ ЭКРАН (Legacy - заменён на menu.js) ===
    drawMenuScreen(hasSave, time, crystalBalance) {
        // Теперь управляется menu.js
    }

    // Экран поражения (Legacy - заменён на menu.js)
    drawGameOverScreen(score, level, highScore) {
        // Теперь управляется menu.js
    }

    // === МАГАЗИН (Legacy - заменён на menu.js) ===
    drawShopScreen(shop, time) {
        // Теперь управляется menu.js
    }

    drawPurchaseAnimation(shop, time) {
        // Теперь управляется menu.js
    }

    // Бонус-комната (без изменений)
    drawBonusRoom(bonusRoom, player, time) {
        // Фон бонус-комнаты
        this.ctx.fillStyle = '#1a0a3e';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // === ЭФФЕКТЫ СКИНОВ (без изменений — не трогаем) ===
    drawSkinEffects(player, skin, time, skinEffects) {
        if (!skinEffects) return;
        skinEffects.render(this.ctx, this.offsetX, this.offsetY, player, skin, time, this.cellSize);
    }

    // === МОЛНИЯ ===
    drawLightning(lightning) {
        if (!lightning || !lightning.isActive()) return;
        lightning.render(this.ctx, this.offsetX, this.offsetY, this.cellSize);
    }

    // === ВСПОМОГАТЕЛЬНЫЕ ДЛЯ СКРУГЛЕННЫХ ПРЯМОУГОЛЬНИКОВ ===
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
}
