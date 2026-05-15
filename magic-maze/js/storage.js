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
            console.warn('Не удалось сохранить прогресс:', e);
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
        } catch (e) {
            console.warn('Не удалось загрузить прогресс:', e);
        }
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
        } catch (e) {
            console.warn('Не удалось удалить сохранение:', e);
        }
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
}
