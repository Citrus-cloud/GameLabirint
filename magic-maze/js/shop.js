// Файл: magic-maze/js/shop.js
// Улучшение 1: Волшебный гардероб — система скинов лисёнка
// 10 уникальных обликов, покупаемых за кристаллы

// ======================================================================
// ДАННЫЕ СКИНОВ
// ======================================================================
const SKINS_DATA = [
    {
        id: 0, name: 'Пушистое чудо', price: 200,
        tier: 1, // Простая перекраска
        description: 'Мягкие пастельные тона и звёздная пыльца',
        bodyColor: '#ffb366', bellyColor: '#fff3e0', tailColor: '#ff9933',
        earsColor: '#ff7043', glowColor: '#ffe082', glowIntensity: 3
    },
    {
        id: 1, name: 'Звёздный странник', price: 200,
        tier: 1,
        description: 'Полоски из звёздного света',
        bodyColor: '#7c4dff', bellyColor: '#e8daef', tailColor: '#651fff',
        earsColor: '#aa00ff', glowColor: '#b388ff', glowIntensity: 4
    },
    {
        id: 2, name: 'Лесной эльф', price: 500,
        tier: 2, // Аксессуары + частицы
        description: 'Венок из листьев и лесная магия',
        bodyColor: '#66bb6a', bellyColor: '#c8e6c9', tailColor: '#43a047',
        earsColor: '#2e7d32', glowColor: '#a5d6a7', glowIntensity: 5,
        accessory: 'wreath', particles: 'leaves'
    },
    {
        id: 3, name: 'Пиратский лис', price: 500,
        tier: 2,
        description: 'Треуголка и золотые искры',
        bodyColor: '#8d6e63', bellyColor: '#d7ccc8', tailColor: '#6d4c41',
        earsColor: '#5d4037', glowColor: '#ffd54f', glowIntensity: 5,
        accessory: 'pirate_hat', particles: 'sparks'
    },
    {
        id: 4, name: 'Огненный хвост', price: 1500,
        tier: 3, // Огненные/ледяные эффекты
        description: 'Хвост горит пламенем, следы огня',
        bodyColor: '#ff5722', bellyColor: '#ffccbc', tailColor: '#dd2c00',
        earsColor: '#bf360c', glowColor: '#ff9100', glowIntensity: 10,
        effect: 'fire', trailEffect: 'flames'
    },
    {
        id: 5, name: 'Ледяной принц', price: 1500,
        tier: 3,
        description: 'Иней переливается, следы льда при ходьбе',
        bodyColor: '#4dd0e1', bellyColor: '#e0f7fa', tailColor: '#00bcd4',
        earsColor: '#0097a7', glowColor: '#80deea', glowIntensity: 10,
        effect: 'ice', trailEffect: 'frost'
    },
    {
        id: 6, name: 'Призрачный воин', price: 3000,
        tier: 4, // Полупрозрачность, шлейфы
        description: 'Полупрозрачный силуэт с призрачными частицами',
        bodyColor: 'rgba(100, 180, 255, 0.7)', bellyColor: 'rgba(200, 230, 255, 0.5)',
        tailColor: 'rgba(80, 150, 220, 0.6)', earsColor: 'rgba(60, 120, 200, 0.7)',
        glowColor: '#82b1ff', glowIntensity: 12,
        effect: 'ghost', trailEffect: 'ghostTrail', transparency: 0.7
    },
    {
        id: 7, name: 'Космический рейнджер', price: 3000,
        tier: 4,
        description: 'Мерцающие звёзды внутри силуэта',
        bodyColor: '#1a237e', bellyColor: '#283593', tailColor: '#0d47a1',
        earsColor: '#1565c0', glowColor: '#448aff', glowIntensity: 12,
        effect: 'cosmic', trailEffect: 'stars', transparency: 0.85
    },
    {
        id: 8, name: 'Король теней', price: 10000,
        tier: 5, // Максимальная роскошь
        description: 'Корона из теней с пульсирующей аурой',
        bodyColor: '#1a0033', bellyColor: '#2d004d', tailColor: '#0d001a',
        earsColor: '#33004d', glowColor: '#9c27b0', glowIntensity: 18,
        effect: 'shadow_king', trailEffect: 'shadowPulse',
        accessory: 'shadow_crown', aura: true
    },
    {
        id: 9, name: 'Создатель звёзд', price: 10000,
        tier: 5,
        description: 'Тело — мини-галактика с вращающимися рукавами',
        bodyColor: '#0a0025', bellyColor: '#1a0040', tailColor: '#05001a',
        earsColor: '#1a0033', glowColor: '#ffd700', glowIntensity: 20,
        effect: 'galaxy', trailEffect: 'galaxyTrail',
        accessory: 'galaxy_crown', aura: true
    }
];


// ======================================================================
// КЛАСС МАГАЗИНА СКИНОВ (ВОЛШЕБНЫЙ ГАРДЕРОБ)
// ======================================================================
class SkinShop {
    constructor() {
        this.storageKey = 'magic_maze_skins';
        this.crystalKey = 'magic_maze_crystals';
        
        // Загружаем данные из localStorage
        this.ownedSkins = this._loadOwned();     // Set с id купленных скинов
        this.activeSkinId = this._loadActive();   // id текущего скина (-1 = без скина)
        this.crystalBalance = this._loadCrystals(); // Баланс кристаллов
        
        // Состояние UI гардероба
        this.isOpen = false;
        this.scrollOffset = 0;
        this.selectedSkin = -1;
        this.hoverSkin = -1;
        
        // Анимация покупки
        this.purchaseAnimation = null; // { skinId, phase, particles, ... }
        this.purchasePhase = 0;
        this.purchaseDuration = 3000; // мс
    }

    // Загрузка купленных скинов
    _loadOwned() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) return new Set(JSON.parse(data));
        } catch (e) {}
        return new Set();
    }

    // Загрузка активного скина
    _loadActive() {
        try {
            const data = localStorage.getItem(this.storageKey + '_active');
            if (data !== null) return parseInt(data);
        } catch (e) {}
        return -1; // Без скина
    }

    // Загрузка баланса кристаллов
    _loadCrystals() {
        try {
            const data = localStorage.getItem(this.crystalKey);
            if (data !== null) return parseInt(data);
        } catch (e) {}
        return 0;
    }

    // Сохранение
    _saveOwned() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify([...this.ownedSkins]));
        } catch (e) {}
    }

    _saveActive() {
        try {
            localStorage.setItem(this.storageKey + '_active', this.activeSkinId.toString());
        } catch (e) {}
    }

    _saveCrystals() {
        try {
            localStorage.setItem(this.crystalKey, this.crystalBalance.toString());
        } catch (e) {}
    }

    // Добавить кристаллы (вызывается при сборе в игре)
    addCrystals(amount) {
        this.crystalBalance += amount;
        this._saveCrystals();
    }

    // Получить баланс
    getCrystals() {
        return this.crystalBalance;
    }

    // Проверить, можно ли купить скин
    canBuy(skinId) {
        if (this.ownedSkins.has(skinId)) return false;
        const skin = SKINS_DATA[skinId];
        return skin && this.crystalBalance >= skin.price;
    }

    // Купить скин
    buySkin(skinId) {
        if (!this.canBuy(skinId)) return false;
        const skin = SKINS_DATA[skinId];
        this.crystalBalance -= skin.price;
        this.ownedSkins.add(skinId);
        this.activeSkinId = skinId;
        this._saveOwned();
        this._saveActive();
        this._saveCrystals();
        return true;
    }

    // Экипировать уже купленный скин
    equipSkin(skinId) {
        if (skinId === -1 || this.ownedSkins.has(skinId)) {
            this.activeSkinId = skinId;
            this._saveActive();
            return true;
        }
        return false;
    }

    // Получить данные активного скина
    getActiveSkin() {
        if (this.activeSkinId < 0) return null;
        return SKINS_DATA[this.activeSkinId] || null;
    }

    // Проверить, куплен ли скин
    isOwned(skinId) {
        return this.ownedSkins.has(skinId);
    }

    // Открыть гардероб
    open() {
        this.isOpen = true;
        this.scrollOffset = 0;
        this.selectedSkin = -1;
    }

    // Закрыть гардероб
    close() {
        this.isOpen = false;
        this.purchaseAnimation = null;
    }

    // Начать анимацию покупки
    startPurchaseAnimation(skinId) {
        this.purchaseAnimation = {
            skinId: skinId,
            phase: 0,
            particles: [],
            waveRadius: 0,
            flashAlpha: 0
        };
        this.purchasePhase = 0;
    }

    // Обновление анимации покупки
    updatePurchaseAnimation(deltaTime) {
        if (!this.purchaseAnimation) return false;
        
        this.purchasePhase += deltaTime;
        const progress = this.purchasePhase / this.purchaseDuration;
        const anim = this.purchaseAnimation;
        
        if (progress >= 1) {
            this.purchaseAnimation = null;
            return false; // Анимация завершена
        }

        // Фаза 1 (0-0.3): затемнение + силуэт окутывается сиянием
        if (progress < 0.3) {
            anim.flashAlpha = progress / 0.3 * 0.7;
        }
        // Фаза 2 (0.3-0.6): взрыв фейерверков из частиц
        else if (progress < 0.6) {
            anim.flashAlpha = 0.7;
            if (Math.random() < 0.4) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 6;
                anim.particles.push({
                    x: 250, y: 350,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 800, maxLife: 800,
                    size: 3 + Math.random() * 5,
                    color: ['#ffd700', '#ff69b4', '#87ceeb', '#ff4444', '#44ff44', '#ffffff'][
                        Math.floor(Math.random() * 6)
                    ]
                });
            }
            anim.waveRadius = (progress - 0.3) / 0.3 * 200;
        }
        // Фаза 3 (0.6-1.0): вспышка + скин надевается + расходящиеся волны
        else {
            anim.flashAlpha = 0.7 * (1 - (progress - 0.6) / 0.4);
            anim.waveRadius = 200 + (progress - 0.6) / 0.4 * 100;
        }

        // Обновление частиц
        for (let i = anim.particles.length - 1; i >= 0; i--) {
            const p = anim.particles[i];
            p.life -= deltaTime;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            if (p.life <= 0) anim.particles.splice(i, 1);
        }

        return true; // Анимация продолжается
    }

    // Обработка клика в гардеробе
    handleClick(x, y, canvasWidth, canvasHeight) {
        // Если анимация покупки — игнорируем клики
        if (this.purchaseAnimation) return 'animating';

        // Кнопка закрытия (правый верхний угол)
        if (x > canvasWidth - 50 && y < 50) {
            return 'close';
        }

        // Сетка скинов: 2 колонки, 5 рядов
        const gridStartX = 30;
        const gridStartY = 100;
        const cellW = (canvasWidth - 80) / 2;
        const cellH = 100;
        const gap = 10;

        for (let i = 0; i < SKINS_DATA.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cx = gridStartX + col * (cellW + gap);
            const cy = gridStartY + row * (cellH + gap) - this.scrollOffset;

            if (x >= cx && x <= cx + cellW && y >= cy && y <= cy + cellH) {
                // Клик на скин
                if (this.isOwned(i)) {
                    // Уже куплен — экипируем или снимаем
                    if (this.activeSkinId === i) {
                        this.equipSkin(-1); // Снять скин
                        return 'unequip';
                    } else {
                        this.equipSkin(i);
                        return 'equip';
                    }
                } else if (this.canBuy(i)) {
                    // Можно купить
                    this.buySkin(i);
                    this.startPurchaseAnimation(i);
                    return 'bought';
                } else {
                    return 'too_expensive';
                }
            }
        }

        return 'none';
    }

    // Обработка скролла
    handleScroll(dy) {
        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset + dy, 200));
    }
}
