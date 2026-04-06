/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║        MINE-CASINO CORE ENGINE v2.0 - BY KALAJER COLLAB          ║
 * ║    System: Authentication, Weighted RNG, Receipt Timer, Admin    ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

"use strict";

// ==========================================
// 1. КОНСТАНТЫ И КОНФИГУРАЦИЯ (Генетический код)
// ==========================================
const ORE_CONFIG = [
    { id: 'coal', name: { ru: 'Уголь', en: 'Coal' }, img: 'assets/coal.webp', weight: 40, color: '#444', payout: 5, price: 100 },
    { id: 'lapis', name: { ru: 'Лазурит', en: 'Lapis' }, img: 'assets/lapis.webp', weight: 25, color: '#1a42ff', payout: 7, price: 150 },
    { id: 'iron', name: { ru: 'Железо', en: 'Iron' }, img: 'assets/iron.webp', weight: 15, color: '#ced4da', payout: 10, price: 250 },
    { id: 'gold', name: { ru: 'Золото', en: 'Gold' }, img: 'assets/gold.webp', weight: 20, color: '#ffd700', payout: 8, price: 200 },
    { id: 'emerald', name: { ru: 'Изумруд', en: 'Emerald' }, img: 'assets/emerald.webp', weight: 10, color: '#17dd62', payout: 9, price: 300 },
    { id: 'diamond', name: { ru: 'Алмаз', en: 'Diamond' }, img: 'assets/diamond.png', weight: 5, color: '#00ffff', payout: 30, price: 1000 },
    { id: 'netherite', name: { ru: 'Незерит', en: 'Netherite' }, img: 'assets/netherite.png', weight: 1, color: '#a476a8', payout: 100, price: 5000 }
];

const TRANSLATIONS = {
    ru: {
        welcome: "Добро пожаловать в игру!",
        low_balance: "Недостаточно монет!",
        win_msg: "Выпало: {ore}! Награда: {win} 💰",
        promo_ok: "Промокод активирован! +{reward} 💰",
        admin_on: "Режим Администратора включен!",
        receipt_created: "Чек успешно создан!",
        reg_ok: "Регистрация успешна! Теперь войдите.",
        login_err: "Неверный логин или пароль!"
    },
    en: {
        welcome: "Welcome to the game!",
        low_balance: "Not enough coins!",
        win_msg: "Result: {ore}! Reward: {win} 💰",
        promo_ok: "Promo code activated! +{reward} 💰",
        admin_on: "Admin Mode Enabled!",
        receipt_created: "Receipt created successfully!",
        reg_ok: "Registration success! Please login.",
        login_err: "Invalid username or password!"
    }
};

const APP_STATE = {
    user: null,
    db: {
        users: JSON.parse(localStorage.getItem('mc_users')) || [],
        receipts: JSON.parse(localStorage.getItem('mc_receipts')) || [],
        promos: JSON.parse(localStorage.getItem('mc_promos')) || [
            { code: 'FREE600', reward: 600, usedBy: [] }
        ]
    },
    settings: {
        sound: true,
        theme: 'dark',
        lang: 'ru'
    },
    timers: {
        receipt: null
    }
};

// ==========================================
// 2. СИСТЕМНЫЕ УТИЛИТЫ (Ядро системы)
// ==========================================
const DB = {
    save: () => {
        localStorage.setItem('mc_users', JSON.stringify(APP_STATE.db.users));
        localStorage.setItem('mc_receipts', JSON.stringify(APP_STATE.db.receipts));
        localStorage.setItem('mc_promos', JSON.stringify(APP_STATE.db.promos));
    },
    findUser: (username) => APP_STATE.db.users.find(u => u.username.toLowerCase() === username.toLowerCase()),
    findUserById: (id) => APP_STATE.db.users.find(u => u.id === parseInt(id))
};

const UI = {
    notify: (text, type = 'info') => {
        const container = document.getElementById('notification-container');
        const msg = document.getElementById('notification-text');
        msg.innerText = text;
        container.style.display = 'flex';
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('hidden'), 4000);
    },
    
    switchScreen: (targetId) => {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        const target = document.getElementById(targetId);
        target.style.display = 'flex';
        setTimeout(() => target.classList.add('active'), 50);
    },

    updateHUD: () => {
        if (!APP_STATE.user) return;
        document.getElementById('player-name').innerText = `ID: ${APP_STATE.user.id} | ${APP_STATE.user.username}`;
        document.getElementById('player-balance').innerText = `${APP_STATE.user.balance} 💰`;
        if (APP_STATE.user.role === 'admin') document.getElementById('nav-admin').classList.remove('hidden');
    }
};

const SoundEngine = {
    play: (type) => {
        if (!APP_STATE.settings.sound) return;
        const sounds = {
            click: 'https://www.soundjay.com/buttons/sounds/button-16.mp3',
            win: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
            spin: 'https://www.soundjay.com/buttons/sounds/button-3.mp3'
        };
        const audio = new Audio(sounds[type]);
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Игнорим ошибку если браузер блокирует автоплей
    }
};

// ==========================================
// 3. ЛОГИКА АВТОРИЗАЦИИ (Безопасность)
// ==========================================
const Auth = {
    register: (user, pass) => {
        if (!user || !pass) return UI.notify(TRANSLATIONS[APP_STATE.settings.lang].login_err);
        if (DB.findUser(user)) return UI.notify("Этот ник уже в системе!");

        const newUser = {
            id: Math.floor(1000 + Math.random() * 9000),
            username: user,
            password: pass,
            balance: 500,
            role: 'user',
            history: [],
            regDate: new Date().toISOString()
        };

        APP_STATE.db.users.push(newUser);
        DB.save();
        UI.notify(TRANSLATIONS[APP_STATE.settings.lang].reg_ok);
    },

    login: (user, pass) => {
        const found = APP_STATE.db.users.find(u => u.username === user && u.password === pass);
        if (found) {
            APP_STATE.user = found;
            UI.updateHUD();
            UI.switchScreen('screen-game');
            UI.notify(`${TRANSLATIONS[APP_STATE.settings.lang].welcome}, ${user}!`);
            SoundEngine.play('win');
        } else {
            UI.notify(TRANSLATIONS[APP_STATE.settings.lang].login_err);
        }
    }
};

// ==========================================
// 4. КАЗИНО И ВЕРОЯТНОСТИ (Азарт)
// ==========================================
const Casino = {
    isSpinning: false,
    cooldown: false,
    getWeightedResult: () => {
        const pool = [];
        ORE_CONFIG.forEach(ore => { for (let i = 0; i < ore.weight; i++) pool.push(ore); });
        return pool[Math.floor(Math.random() * pool.length)];
    },
    spin: () => {
        if (Casino.isSpinning || Casino.cooldown) return;
        const btn = document.getElementById('btn-spin');
        if (APP_STATE.user.balance < 10) return UI.notify("Мало монет!");

        Casino.isSpinning = true;
        APP_STATE.user.balance -= 10;
        UI.updateHUD();
        
        const display = document.getElementById('slot-result');
        display.style.minHeight = "150px"; 
        display.style.display = "flex";
        display.style.flexDirection = "column";
        display.style.alignItems = "center";
        display.style.justifyContent = "center";
        btn.disabled = true;

        let speed = 50; 
        let count = 0;
        const total = 25; 

        const shuffle = () => {
            count++;
            const randomOre = ORE_CONFIG[Math.floor(Math.random() * ORE_CONFIG.length)];
            display.innerHTML = `<img src="${randomOre.img}" style="width:80px; height:80px; filter:blur(3px); opacity:0.6;">`;

            if (count < total) {
                speed += (count * 1.5); 
                setTimeout(shuffle, speed);
            } else {
                const res = Casino.getWeightedResult();
                display.innerHTML = `
                    <div style="animation: bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; flex-direction: column; align-items: center;">
                        <img src="${res.img}" style="width:100px; height:100px; filter:drop-shadow(0 0 20px ${res.color})">
                        <div style="color:${res.color}; font-size:1.4rem; margin-top:12px; font-weight:bold; text-transform:uppercase; text-shadow: 0 0 10px rgba(0,0,0,0.5);">
                            ${res.name[APP_STATE.settings.lang]}
                        </div>
                    </div>
                `;
                const win = res.payout;
                APP_STATE.user.balance += win;
                UI.notify(`Выпало: ${res.name[APP_STATE.settings.lang]} (+${win} 💰)`);
                UI.updateHUD();
                DB.save();
                Casino.isSpinning = false;
                Casino.startCooldown(btn);
            }
        };
        shuffle();
    },
    startCooldown: (btn) => {
        Casino.cooldown = true;
        let timer = 3;
        btn.innerText = `ЖДИ ${timer}с`;
        const cd = setInterval(() => {
            timer--;
            if (timer > 0) btn.innerText = `ЖДИ ${timer}с`;
            else { clearInterval(cd); Casino.cooldown = false; btn.disabled = false; btn.innerText = "КРУТИТЬ"; }
        }, 1000);
    }
};

// ==========================================
// 5. МАГАЗИН И ТАЙМЕР ЧЕКОВ (Экономика)
// ==========================================
const Shop = {
    buy: (oreId) => {
        const ore = ORE_CONFIG.find(o => o.id === oreId);
        if (APP_STATE.user.balance < ore.price) return UI.notify(TRANSLATIONS[APP_STATE.settings.lang].low_balance);

        APP_STATE.user.balance -= ore.price;
        const receiptId = `MC-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
        
        const newReceipt = {
            id: receiptId,
            uId: APP_STATE.user.id,
            user: APP_STATE.user.username,
            item: ore.name[APP_STATE.settings.lang],
            price: ore.price,
            time: new Date().toLocaleTimeString()
        };

        APP_STATE.db.receipts.push(newReceipt);
        APP_STATE.user.history.push(newReceipt);
        DB.save();
        UI.updateHUD();
        Shop.showModal(newReceipt);
    },

    showModal: (data) => {
        const modal = document.getElementById('modal-receipt');
        document.getElementById('receipt-item').innerText = data.item;
        document.getElementById('receipt-code').innerText = data.id;
        modal.classList.remove('hidden');

        let seconds = 30;
        const timerLabel = document.getElementById('receipt-timer');
        timerLabel.innerText = seconds;

        clearInterval(APP_STATE.timers.receipt);
        APP_STATE.timers.receipt = setInterval(() => {
            seconds--;
            timerLabel.innerText = seconds;
            if (seconds <= 0) Shop.closeModal();
        }, 1000);
    },

    closeModal: () => {
        document.getElementById('modal-receipt').classList.add('hidden');
        clearInterval(APP_STATE.timers.receipt);
    },

    renderHistory: () => {
        const list = document.getElementById('history-list');
        list.innerHTML = APP_STATE.user.history.slice(-10).reverse().map(r => `
            <li>[${r.time}] <b>${r.item}</b> | ID: <code>${r.id}</code></li>
        `).join('');
    }
};

// ==========================================
// 6. АДМИН-СИСТЕМА (Власть)
// ==========================================
const AdminSystem = {
    init: () => {
        const list = document.getElementById('admin-user-list');
        list.innerHTML = APP_STATE.db.users.map(u => `
            <li>
                <span>#${u.id} <b>${u.username}</b> (${u.balance}💰)</span>
                <button onclick="AdminSystem.giveMoney(${u.id})">💰 +5k</button>
            </li>
        `).join('');
    },

    giveMoney: (id) => {
        const target = DB.findUserById(id);
        if (target) {
            target.balance += 5000;
            DB.save();
            AdminSystem.init();
            UI.notify(`Выдано 5000 монет игроку ${target.username}`);
        }
    },

    searchReceipt: () => {
        const query = document.getElementById('admin-search-receipt').value;
        const resultDiv = document.getElementById('admin-receipt-result');
        const found = APP_STATE.db.receipts.filter(r => r.id.includes(query) || r.user.includes(query));
        
        resultDiv.innerHTML = found.map(f => `
            <div class="admin-section" style="border-color:cyan">
                ID: ${f.id} | Юзер: ${f.user} | Предмет: ${f.item}
            </div>
        `).join('') || "Ничего не найдено";
    }
};

// ==========================================
// 7. ОБРАБОТКА СОБЫТИЙ (Интерактив)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Вход / Регистрация
    document.getElementById('btn-login').onclick = () => {
        Auth.login(document.getElementById('auth-username').value, document.getElementById('auth-password').value);
    };
    document.getElementById('btn-register').onclick = () => {
        Auth.register(document.getElementById('auth-username').value, document.getElementById('auth-password').value);
    };

    // Навигация
    document.getElementById('nav-shop').onclick = () => { UI.switchScreen('screen-shop'); Shop.renderHistory(); };
    document.getElementById('nav-settings').onclick = () => UI.switchScreen('screen-settings');
    document.querySelectorAll('.btn-back').forEach(b => b.onclick = () => UI.switchScreen('screen-game'));
    
    // Казино
    document.getElementById('btn-spin').onclick = () => Casino.spin();

    // Промокоды
    document.getElementById('nav-promo').onclick = () => {
        const code = prompt("Введите код:");
        if (!code) return;
        
        if (code === "Admin2202Ai") {
            APP_STATE.user.role = 'admin';
            UI.updateHUD();
            UI.notify(TRANSLATIONS[APP_STATE.settings.lang].admin_on);
            return;
        }

        const promo = APP_STATE.db.promos.find(p => p.code === code);
        if (promo && !promo.usedBy.includes(APP_STATE.user.id)) {
            APP_STATE.user.balance += promo.reward;
            promo.usedBy.push(APP_STATE.user.id);
            DB.save();
            UI.updateHUD();
            UI.notify(TRANSLATIONS[APP_STATE.settings.lang].promo_ok.replace('{reward}', promo.reward));
        } else {
            UI.notify("Код неверен или уже использован!");
        }
    };

    // Покупка
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.onclick = (e) => Shop.buy(e.target.closest('.shop-item').dataset.ore);
    });

    // Админка
    document.getElementById('nav-admin').onclick = () => { UI.switchScreen('screen-admin'); AdminSystem.init(); };
    document.getElementById('admin-btn-search').onclick = () => AdminSystem.searchReceipt();
    document.getElementById('admin-send-broadcast').onclick = () => {
        const msg = document.getElementById('admin-broadcast-msg').value;
        UI.notify(`📢 ОБЪЯВЛЕНИЕ: ${msg}`);
    };

    // Настройки
    document.getElementById('setting-theme').onchange = (e) => {
        document.body.className = e.target.value === 'light' ? 'theme-light' : 'theme-dark';
        APP_STATE.settings.theme = e.target.value;
    };
    document.getElementById('setting-lang').onchange = (e) => {
        APP_STATE.settings.lang = e.target.value;
        UI.notify("Language changed / Язык изменен");
    };

    document.getElementById('btn-close-receipt').onclick = () => Shop.closeModal();
    document.getElementById('nav-logout').onclick = () => location.reload();
});
