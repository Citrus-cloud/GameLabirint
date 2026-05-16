// Файл: magic-maze/js/storage.js
// Сохранение прогресса в localStorage

class GameStorage {
    constructor() {
        this.storageKey = 'magic_maze_save';
    }

    // Сохранить прогресс
    save(data) {
        try {
            const saveData = {
                level: data.level || 1,
                highScore: data.highScore || 0,
                lastPlayed: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(saveData));
            return true;
        } catch (e) {
            return false;
        }
    }

    // Загрузить прогресс
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {}
        return null;
    }

    // Проверить наличие сохранения
    hasSave() {
        try {
            return localStorage.getItem(this.storageKey) !== null;
        } catch (e) {
            return false;
        }
    }

    // Обновить рекорд
    updateHighScore(score) {
        const save = this.load();
        if (save) {
            if (score > save.highScore) {
                save.highScore = score;
                this.save(save);
                return true;
            }
        } else {
            this.save({ level: 1, highScore: score });
            return true;
        }
        return false;
    }

    // Обновить уровень
    updateLevel(level) {
        const save = this.load() || { level: 1, highScore: 0 };
        save.level = level;
        this.save(save);
    }

    // Удалить сохранение
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) {}
    }

    // Получить рекорд
    getHighScore() {
        const save = this.load();
        return save ? save.highScore : 0;
    }

    // Получить сохранённый уровень
    getSavedLevel() {
        const save = this.load();
        return save ? save.level : 1;
    }

    // ======================================================================
    // УЛУЧШЕНИЕ 1: Совместимость с системой кристаллов (баланс скинов)
    // Кристаллы хранятся в отдельном ключе (magic_maze_crystals),
    // чтобы не ломать совместимость с существующими сохранениями.
    // ======================================================================

    // Получить общий баланс кристаллов
    getTotalCrystals() {
        try {
            const data = localStorage.getItem('magic_maze_crystals');
            return data ? parseInt(data) : 0;
        } catch (e) {
            return 0;
        }
    }

    // Добавить кристаллы к общему балансу
    addCrystals(amount) {
        try {
            const current = this.getTotalCrystals();
            localStorage.setItem('magic_maze_crystals', (current + amount).toString());
        } catch (e) {}
    }
}
