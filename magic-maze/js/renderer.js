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
    drawPlayer(player) {
        if (!player.isVisible) return;

        const cs = this.cellSize;
        const px = this.offsetX + player.pixelX + cs / 2;
        const py = this.offsetY + player.pixelY + cs / 2 - player.bounceOffset;
        const size = cs * 0.35;

        this.ctx.save();

        // Победное вращение
        if (player.isVictory) {
            this.ctx.translate(px, py - player.victoryJump);
            this.ctx.rotate(player.victoryRotation);
            this.ctx.translate(-px, -(py - player.victoryJump));
        }

        const drawY = player.isVictory ? py - player.victoryJump : py;

        // Свечение при щите
        if (player.activePower === 'shield') {
            this.ctx.shadowColor = GAME_CONSTANTS.COLORS.POWER_SHIELD;
            this.ctx.shadowBlur = 15;
        } else if (player.activePower === 'dash') {
            this.ctx.shadowColor = GAME_CONSTANTS.COLORS.POWER_DASH;
            this.ctx.shadowBlur = 10;
        }

        // Тело (овал)
        this.ctx.beginPath();
        this.ctx.ellipse(px, drawY, size, size * 1.1, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_BODY;
        this.ctx.fill();

        // Животик
        this.ctx.beginPath();
        this.ctx.ellipse(px, drawY + size * 0.3, size * 0.5, size * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_BELLY;
        this.ctx.fill();

        // Ушки
        const earSize = size * 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(px - size * 0.6, drawY - size * 0.7);
        this.ctx.lineTo(px - size * 0.3, drawY - size * 1.3);
        this.ctx.lineTo(px, drawY - size * 0.7);
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_EARS;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(px, drawY - size * 0.7);
        this.ctx.lineTo(px + size * 0.3, drawY - size * 1.3);
        this.ctx.lineTo(px + size * 0.6, drawY - size * 0.7);
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_EARS;
        this.ctx.fill();

        // Глаза
        const eyeOffsetX = size * 0.25;
        const eyeY = drawY - size * 0.2;
        this.ctx.beginPath();
        this.ctx.arc(px - eyeOffsetX, eyeY, size * 0.15, 0, Math.PI * 2);
        this.ctx.arc(px + eyeOffsetX, eyeY, size * 0.15, 0, Math.PI * 2);
        this.ctx.fillStyle = '#2c2c2c';
        this.ctx.fill();

        // Блики в глазах
        this.ctx.beginPath();
        this.ctx.arc(px - eyeOffsetX + 2, eyeY - 2, size * 0.06, 0, Math.PI * 2);
        this.ctx.arc(px + eyeOffsetX + 2, eyeY - 2, size * 0.06, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();

        // Нос
        this.ctx.beginPath();
        this.ctx.arc(px, drawY + size * 0.05, size * 0.1, 0, Math.PI * 2);
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_NOSE;
        this.ctx.fill();

        // Хвостик
        this.ctx.save();
        const tailX = px - size * 0.8;
        this.ctx.translate(tailX, drawY + size * 0.2);
        this.ctx.rotate(player.tailAngle);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, size * 0.6, size * 0.25, -0.3, 0, Math.PI * 2);
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_TAIL;
        this.ctx.fill();
        // Кончик хвоста
        this.ctx.beginPath();
        this.ctx.ellipse(-size * 0.4, 0, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = GAME_CONSTANTS.COLORS.FOXY_BELLY;
        this.ctx.fill();
        this.ctx.restore();

        this.ctx.shadowBlur = 0;
        this.ctx.restore();

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
    drawMenuScreen(hasSave, time) {
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

        // Лисёнок (машет лапкой)
        const foxyY = 280 + Math.sin(time * 0.002) * 5;
        this._drawMenuFoxy(this.width / 2, foxyY, time);

        // Кнопка "Играть"
        this._drawButton(this.width / 2, 430, 160, 50, 'Играть', GAME_CONSTANTS.COLORS.POWER_SHIELD);

        // Кнопка "Продолжить"
        if (hasSave) {
            this._drawButton(this.width / 2, 500, 160, 50, 'Продолжить', GAME_CONSTANTS.COLORS.PORTAL_PRIMARY);
        }

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
