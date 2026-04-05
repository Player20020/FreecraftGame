/**
 * MINE-CASINO ENGINE v1.0
 * Разработчик: Kalajer AI Collab
 * Особенности: Система чеков, Админка "Admin2202Ai", Динамические шансы.
 */

// ==========================================
// 1. КОНФИГУРАЦИЯ И ДАННЫЕ (Генетический код)
// ==========================================

const ORE_DATA = [
    { id: 'netherite', name: 'Незерит', symbol: '🌌', price: 2500, weight: 1 },
    { id: 'diamond', name: 'Алмаз', symbol: '💎', price: 1000, weight: 5 },
    { id: 'iron', name: 'Железо', symbol: '⚙️', price: 600, weight: 15 },
    { id: 'emerald', name: 'Изумруд', symbol: '✳️', price: 450, weight: 10 },
    { id: 'gold', name: 'Золото', symbol: '📀', price: 300, weight: 20 },
    { id: 'lapis', name: 'Лазурит', symbol: '🔹', price: 225, weight: 25 },
    { id: 'coal', name: 'Уголь', symbol: '🌑', price: 100, weight: 40 }
];

const APP_STATE = {
    currentUser: null,
    db: {
        users: JSON.parse(localStorage.getItem('mc_users')) || [],
        promos: JSON.parse(localStorage.getItem('mc_promos')) || [
            { code: 'START', reward: 500, usedBy: [] }
        ],
        receipts: JSON.parse(localStorage.getItem('mc_receipts')) || []
    },
    settings: {
        sound: true,
        theme: 'dark',
        lang: 'ru'
    },
    receiptTimer: null
};

// ==========================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Нейронные связи)
// ==========================================

const saveDB = () => {
    localStorage.setItem('mc_users', JSON.stringify(APP_STATE.db.users));
    localStorage.setItem('mc_promos', JSON.stringify(APP_STATE.db.promos));
    localStorage.setItem('mc_receipts', JSON.stringify(APP_STATE.db.receipts));
};

const notify = (text, duration = 3000) => {
    const container = document.getElementById('notification-container');
    const msg = document.getElementById('notification-text');
    msg.innerText = text;
    container.classList.remove('hidden');
    setTimeout(() => container.classList.add('hidden'), duration);
};

const switchScreen = (screenId) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
};

const updateHUD = () => {
    if (!APP_STATE.currentUser) return;
    document.getElementById('player-name').innerText = `Игрок: ${APP_STATE.currentUser.username}`;
    document.getElementById('player-balance').innerText = `Баланс: ${APP_STATE.currentUser.balance} 💰`;
    
    // Показываем кнопку админки, если роль подходящая
    if (APP_STATE.currentUser.role === 'admin') {
        document.getElementById('nav-admin').classList.remove('hidden');
    }
};

// ==========================================
// 3. СИСТЕМА АВТОРИЗАЦИИ (Врата в мир)
// ==========================================

const register = (user, pass) => {
    if (APP_STATE.db.users.find(u => u.username === user)) return notify('Ник уже занят!');
    
    const newUser = {
        id: Date.now(),
        username: user,
        password: pass,
        balance: 100, // Стартовый капитал
        role: 'user',
        history: []
    };
    
    APP_STATE.db.users.push(newUser);
    saveDB();
    notify('Регистрация успешна! Теперь войдите.');
};

const login = (user, pass) => {
    const found = APP_STATE.db.users.find(u => u.username === user && u.password === pass);
    if (found) {
        APP_STATE.currentUser = found;
        updateHUD();
        switchScreen('screen-game');
        notify(`С возвращением, ${user}! Приятной игры.`);
    } else {
        notify('Неверный ник или пароль!');
    }
};

// ==========================================
// 4. ЛОГИКА КАЗИНО (Сердце азарта)
// ==========================================

const spinSlots = () => {
    const cost = 10;
    if (APP_STATE.currentUser.balance < cost) return notify('Недостаточно монет!');
    
    APP_STATE.currentUser.balance -= cost;
    updateHUD();
    
    const display = document.getElementById('slot-result');
    display.classList.add('spinning');
    display.innerText = "⏳ КРУТИМ...";

    setTimeout(() => {
        display.classList.remove('spinning');
        
        // Взвешенная вероятность
        const pool = [];
        ORE_DATA.forEach(ore => {
            for (let i = 0; i < ore.weight; i++) pool.push(ore);
        });
        
        const result = pool[Math.floor(Math.random() * pool.length)];
        
        display.innerHTML = `${result.symbol} ${result.name} ${result.symbol}`;
        
        // Награда за выпадение (цена руды / 10 в качестве выигрыша)
        const win = Math.floor(result.price / 10);
        APP_STATE.currentUser.balance += win;
        
        notify(`Выпало: ${result.name}! Награда: ${win} монет.`);
        updateHUD();
        saveDB();
    }, 1500);
};

// ==========================================
// 5. МАГАЗИН И ЧЕКИ (Экономический узел)
// ==========================================

const generateReceipt = (ore) => {
    if (APP_STATE.currentUser.balance < ore.price) return notify('Не хватает монет!');
    
    APP_STATE.currentUser.balance -= ore.price;
    const receiptCode = `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const receipt = {
        id: receiptCode,
        userId: APP_STATE.currentUser.id,
        user: APP_STATE.currentUser.username,
        item: ore.name,
        date: new Date().toLocaleString()
    };
    
    APP_STATE.db.receipts.push(receipt);
    APP_STATE.currentUser.history.push(receipt);
    saveDB();
    updateHUD();
    showReceiptModal(receipt);
};

const showReceiptModal = (receipt) => {
    const modal = document.getElementById('modal-receipt');
    document.getElementById('receipt-item').innerText = receipt.item;
    document.getElementById('receipt-code').innerText = receipt.id;
    
    modal.classList.remove('hidden');
    
    let timeLeft = 30;
    document.getElementById('receipt-timer').innerText = timeLeft;
    
    clearInterval(APP_STATE.receiptTimer);
    APP_STATE.receiptTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('receipt-timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            closeReceiptModal();
        }
    }, 1000);

    // Обновить список истории
    renderHistory();
};

const closeReceiptModal = () => {
    document.getElementById('modal-receipt').classList.add('hidden');
    clearInterval(APP_STATE.receiptTimer);
};

const renderHistory = () => {
    const list = document.getElementById('history-list');
    list.innerHTML = APP_STATE.currentUser.history.map(r => `
        <li>[${r.date}] ${r.item} - <code>${r.id}</code></li>
    `).join('');
};

// ==========================================
// 6. АДМИНКА И ПРОМОКОДЫ (Верховная власть)
// ==========================================

const handlePromo = (code) => {
    if (code === "Admin2202Ai") {
        APP_STATE.currentUser.role = 'admin';
        updateHUD();
        notify('Режим разработчика активирован!');
        return;
    }

    const promo = APP_STATE.db.promos.find(p => p.code === code);
    if (!promo) return notify('Код не существует!');
    if (promo.usedBy.includes(APP_STATE.currentUser.id)) return notify('Вы уже использовали это!');
    
    APP_STATE.currentUser.balance += promo.reward;
    promo.usedBy.push(APP_STATE.currentUser.id);
    saveDB();
    updateHUD();
    notify(`Активировано! Получено ${promo.reward} монет.`);
};

const renderAdminUsers = () => {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = APP_STATE.db.users.map(u => `
        <li>
            ID: ${u.id} | ${u.username} | Баланс: ${u.balance} 
            <button onclick="adminAddMoney(${u.id})">+1000</button>
        </li>
    `).join('');
};

// Глобальные функции для кнопок в админке
window.adminAddMoney = (userId) => {
    const user = APP_STATE.db.users.find(u => u.id === userId);
    if (user) {
        user.balance += 1000;
        saveDB();
        renderAdminUsers();
        notify(`Выдано 1000 монет игроку ${user.username}`);
    }
};

// ==========================================
// 7. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ (Жизненный цикл)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Кнопки авторизации
    document.getElementById('btn-register').onclick = () => {
        const u = document.getElementById('auth-username').value;
        const p = document.getElementById('auth-password').value;
        if(u && p) register(u, p);
    };

    document.getElementById('btn-login').onclick = () => {
        const u = document.getElementById('auth-username').value;
        const p = document.getElementById('auth-password').value;
        login(u, p);
    };

    // Навигация
    document.getElementById('nav-shop').onclick = () => {
        switchScreen('screen-shop');
        renderHistory();
    };
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.onclick = () => switchScreen('screen-game');
    });
    document.getElementById('nav-settings').onclick = () => switchScreen('screen-settings');
    document.getElementById('nav-logout').onclick = () => location.reload();
    document.getElementById('nav-admin').onclick = () => {
        switchScreen('screen-admin');
        renderAdminUsers();
    };

    // Казино
    document.getElementById('btn-spin').onclick = spinSlots;

    // Магазин (делегирование событий)
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.onclick = (e) => {
            const itemDiv = e.target.closest('.shop-item');
            const oreId = itemDiv.dataset.ore;
            const ore = ORE_DATA.find(o => o.id === oreId);
            generateReceipt(ore);
        };
    });

    // Промокоды
    document.getElementById('nav-promo').onclick = () => {
        const code = prompt('Введите промокод:');
        if(code) handlePromo(code);
    };

    // Настройки темы
    document.getElementById('setting-theme').onchange = (e) => {
        document.body.className = e.target.value === 'light' ? 'theme-light' : 'theme-dark';
    };

    // Закрытие чека
    document.getElementById('btn-close-receipt').onclick = closeReceiptModal;
    document.getElementById('close-notification').onclick = () => {
        document.getElementById('notification-container').classList.add('hidden');
    };

    // Админка: Создание промо
    document.getElementById('admin-add-promo').onclick = () => {
        const name = document.getElementById('admin-promo-name').value;
        const reward = parseInt(document.getElementById('admin-promo-reward').value);
        if(name && reward) {
            APP_STATE.db.promos.push({ code: name, reward, usedBy: [] });
            saveDB();
            notify(`Промокод ${name} создан!`);
        }
    };
    
    // Админка: Рассылка
    document.getElementById('admin-send-broadcast').onclick = () => {
        const msg = document.getElementById('admin-broadcast-msg').value;
        if(msg) notify(`ОБЪЯВЛЕНИЕ: ${msg}`, 10000);
    };
});
