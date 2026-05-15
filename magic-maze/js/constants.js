// Файл: magic-maze/js/constants.js
// Константы игры "Сказочный лабиринт: Магия процедурных миров"

const GAME_CONSTANTS = {
    // Размеры Canvas
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 700,
    
    // Размеры лабиринта по уровням
    MAZE_SIZES: {
        SMALL: 7,    // Уровни 1-3
        MEDIUM: 9,   // Уровни 4-7
        LARGE: 11,   // Уровни 8-12
        MAX: 13      // Уровни 13+
    },
    
    // Размер клетки (адаптируется)
    CELL_SIZE: 60,
    
    // Цвета
    COLORS: {
        // Фон и стены
        BACKGROUND: '#1a0a2e',
        WALL_PRIMARY: '#4a2c8a',
        WALL_SECONDARY: '#6b3fa0',
        WALL_GLOW: '#9b59b6',
        FLOOR: '#2d1b4e',
        FLOOR_LIGHT: '#3d2b5e',
        
        // Лисёнок Фокси
        FOXY_BODY: '#ff8c42',
        FOXY_BELLY: '#ffe0b2',
        FOXY_TAIL: '#ff6b1a',
        FOXY_EARS: '#ff5722',
        FOXY_NOSE: '#3d2b1f',
        
        // Кристаллы
        CRYSTAL_BLUE: '#64b5f6',
        CRYSTAL_PINK: '#f48fb1',
        CRYSTAL_GREEN: '#81c784',
        CRYSTAL_GLOW: '#ffffff',
        
        // Тени-враги
        SHADOW_BODY: '#2c2c2c',
        SHADOW_EYES: '#ff1744',
        SHADOW_GLOW: '#4a0072',
        
        // Хранитель (босс)
        GUARDIAN_BODY: '#1a0033',
        GUARDIAN_CROWN: '#ffd700',
        GUARDIAN_EYES: '#ff0000',
        
        // Усиления
        POWER_DASH: '#ffeb3b',       // Звёздный рывок
        POWER_SHIELD: '#4caf50',     // Щит светлячков
        POWER_MAGNET: '#e91e63',     // Магнит кристаллов
        POWER_FREEZE: '#03a9f4',     // Заморозка теней
        
        // Портал
        PORTAL_PRIMARY: '#9c27b0',
        PORTAL_SECONDARY: '#e040fb',
        PORTAL_SPARKS: '#ffeb3b',
        
        // UI
        UI_HEART: '#f44336',
        UI_HEART_EMPTY: '#5c5c5c',
        UI_SCORE: '#ffd700',
        UI_TEXT: '#ffffff',
        UI_PAUSE_BG: 'rgba(0, 0, 0, 0.7)',
        
        // Финишная звезда
        STAR_PRIMARY: '#ffd700',
        STAR_GLOW: '#fff9c4',
        
        // Паутина
        WEB_COLOR: '#c0c0c0',
        WEB_GLOW: '#e0e0e0',
        
        // Эффекты
        PARTICLE_GOLD: '#ffd700',
        PARTICLE_WHITE: '#ffffff',
        PARTICLE_ORANGE: '#ff9800',
        DAMAGE_RED: 'rgba(255, 0, 0, 0.3)',
        LEVEL_GOLD: 'rgba(255, 215, 0, 0.5)'
    },
    
    // Игровые параметры
    PLAYER: {
        LIVES: 5,
        SPEED: 1,                    // Клеток за действие
        INVULNERABILITY_TIME: 2000,  // мс неуязвимости после урона
        MOVE_DURATION: 200,          // мс на перемещение между клетками
        DASH_MULTIPLIER: 2,          // Множитель скорости при рывке
        SLOWDOWN_MULTIPLIER: 0.5     // Множитель при замедлении (паутина)
    },
    
    // Враги
    ENEMIES: {
        BASE_SPEED: 1500,            // мс на перемещение
        SPEED_DECREASE_PER_LEVEL: 50, // На сколько мс быстрее каждый уровень
        MIN_SPEED: 600,              // Минимальная скорость (мс)
        PATROL_RANGE: 3,             // Клеток патрулирования
        GUARDIAN_SPEED_MULT: 0.6,    // Хранитель быстрее обычных
        GUARDIAN_DAMAGE: 2,          // Урон хранителя
        MIN_DISTANCE_FROM_START: 3   // Мин. расстояние от старта
    },
    
    // Усиления
    POWERS: {
        DASH_DURATION: 8000,         // мс
        SHIELD_DURATION: 10000,      // мс
        MAGNET_DURATION: 10000,      // мс
        FREEZE_DURATION: 6000,       // мс
        MAGNET_RADIUS: 3             // Радиус магнита в клетках
    },
    
    // Портал
    PORTAL: {
        APPEAR_FROM_LEVEL: 3,        // С какого уровня появляется
        APPEAR_CHANCE: 0.7,          // Вероятность появления
        BONUS_ROOM_SIZE: 5,          // Размер бонус-комнаты
        BONUS_CRYSTALS: 8,           // Кристаллов в бонус-комнате
        BONUS_TIME: 10000            // мс в бонус-комнате
    },
    
    // Препятствия
    OBSTACLES: {
        WEB_FROM_LEVEL: 5,           // С какого уровня паутина
        WEB_SLOW_DURATION: 2000,     // мс замедления
        MOVING_WALLS_FROM_LEVEL: 8,  // С какого уровня движущиеся стены
        MOVING_WALL_CYCLE: 3000,     // мс цикл движения стены
        GUARDIAN_EVERY: 10           // Каждые N уровней босс
    },
    
    // Количество объектов
    ITEMS: {
        CRYSTALS_MIN: 5,
        CRYSTALS_MAX: 15,
        ENEMIES_MIN: 1,
        ENEMIES_MAX: 4,
        POWERS_MIN: 1,
        POWERS_MAX: 3
    },
    
    // Анимации
    ANIMATIONS: {
        FIREFLY_COUNT: 8,            // Количество светлячков
        CRYSTAL_PARTICLES: 12,       // Частиц при сборе кристалла
        LEVEL_COMPLETE_PARTICLES: 35, // Частиц при завершении уровня
        PORTAL_SPARKS: 10,           // Искр портала
        PARTICLE_LIFETIME: 1000,     // мс жизни частицы
        BOUNCE_HEIGHT: 8,            // Высота подпрыгивания лисёнка (px)
        UI_WOBBLE_SPEED: 2000        // мс цикл покачивания UI
    },
    
    // Очки
    SCORING: {
        CRYSTAL_POINTS: 10,
        LEVEL_BONUS: 50,
        BONUS_ROOM_CRYSTAL: 20,
        GUARDIAN_DEFEAT: 100
    },
    
    // Состояния игры
    STATES: {
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        LEVEL_INTRO: 'level_intro',
        BONUS_ROOM: 'bonus_room',
        GAME_OVER: 'game_over',
        LEVEL_COMPLETE: 'level_complete',
        PORTAL_TRANSITION: 'portal_transition'
    },
    
    // Типы клеток лабиринта
    CELL_TYPES: {
        WALL: 0,
        PATH: 1,
        CRYSTAL: 2,
        POWER_UP: 3,
        PORTAL: 4,
        STAR: 5,
        WEB: 6,
        ENEMY_SPAWN: 7
    }
};

// Функция для получения размера лабиринта по уровню
function getMazeSizeForLevel(level) {
    if (level <= 3) return GAME_CONSTANTS.MAZE_SIZES.SMALL;
    if (level <= 7) return GAME_CONSTANTS.MAZE_SIZES.MEDIUM;
    if (level <= 12) return GAME_CONSTANTS.MAZE_SIZES.LARGE;
    return GAME_CONSTANTS.MAZE_SIZES.MAX;
}

// Функция для получения количества врагов по уровню
function getEnemyCountForLevel(level) {
    return Math.min(
        GAME_CONSTANTS.ITEMS.ENEMIES_MIN + Math.floor(level / 3),
        GAME_CONSTANTS.ITEMS.ENEMIES_MAX
    );
}

// Функция для получения количества кристаллов по размеру
function getCrystalCountForSize(mazeSize) {
    const ratio = (mazeSize - 7) / 6; // 0 для 7x7, 1 для 13x13
    return Math.floor(
        GAME_CONSTANTS.ITEMS.CRYSTALS_MIN + 
        ratio * (GAME_CONSTANTS.ITEMS.CRYSTALS_MAX - GAME_CONSTANTS.ITEMS.CRYSTALS_MIN)
    );
}

// Функция для получения количества усилений по уровню
function getPowerCountForLevel(level) {
    const base = GAME_CONSTANTS.ITEMS.POWERS_MAX;
    return Math.max(GAME_CONSTANTS.ITEMS.POWERS_MIN, base - Math.floor(level / 5));
}
