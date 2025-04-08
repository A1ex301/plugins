(function(){
    'use strict';
    
    // Перевірка ініціалізації плагіна
    function init() {
        // Щоб уникнути повторної ініціалізації
        if (window.lampa_imdb_plugin_ready) return;
        window.lampa_imdb_plugin_ready = true;
        
        // Додаємо CSS стилі
        const style = document.createElement('style');
        style.textContent = `
            .card__imdb {
                position: absolute;
                bottom: 0;
                left: 0;
                margin: 0.6em;
                padding: 0.4em 0.6em;
                background-color: rgba(0, 0, 0, 0.7);
                border-radius: 0.3em;
                font-size: 0.9em;
                cursor: pointer;
                z-index: 2;
                transition: transform 0.1s ease-in-out;
            }
            .card__imdb:hover {
                transform: scale(1.1);
            }
            .card__imdb-text {
                display: flex;
                align-items: center;
                color: #fff;
                font-weight: 600;
            }
            .imdb-icon {
                background-image: url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZjVjNTE4IiBoZWlnaHQ9IjUxMiIgcng9IjE1JSIgd2lkdGg9IjUxMiIvPjxwYXRoIGQ9Im0xMDQgMzI4aDcydi0xNDRoLTcyem0xNjgtMTQ0djE0NGgtMzZ2LTEwOGgtOHYxMDhoLTM2di0xNDR6bTY0IDBjMTEuNSAwIDIwLjUgMS41IDI2LjggNC4zIDYuMyAyLjggMTAuNyA3LjIgMTMuMyAxMi43IDIuNSA1LjQgMy44IDEyLjcgMy44IDIxLjl2ODIuOWgtMzZ2LTc0LjRjMC05LjMtMS4zLTE1LjQtMy44LTE4LjEtMi41LTIuOC03LjMtNC4yLTE0LjUtNC4yaC0yLjV2OTYuOGgtMzZ2LTE0NGgzNnptODQgMHYxNDRoLTM2di0xNDRoMzZ6bTUwLjUgMGMxMS4yIDAgMjEuMSAyLjYgMjkuNiA3LjcgOC41IDUuMSAxNC45IDE3LjEgMTQuOSAyOS4yIDAgMTItNi40IDI0LTE0LjkgMjkuMi04LjUgNS4xLTE4LjQgNy43LTI5LjYgNy43aC0xMS41djcwLjJoLTM2di0xNDRoMzZ6IiBmaWxsPSIjMDUwNTA1Ii8+PHBhdGggZD0ibTMzNi41IDIxNi45YzQuMiAwIDcuOC0xLjMgMTAuNi0zLjkgMi44LTIuNiA0LjMtNS43IDQuMy05LjMgMC0zLjYtMS40LTYuNy00LjMtOS4zLTIuOC0yLjYtNi40LTMuOS0xMC42LTMuOWgtMTEuNXYyNi40eiIgZmlsbD0iI2Y1YzUxOCIvPjwvc3ZnPg==');
                background-size: contain;
                background-repeat: no-repeat;
                width: 1.2em;
                height: 1.2em;
                margin-right: 0.4em;
            }
        `;
        document.head.appendChild(style);
        
        // API ключ OMDb
        const apiKey = 'e0a2c76f';
        
        // Створюємо мережевий клас
        const network = new Lampa.Reguest();
        
        // Функція для очищення назви фільму від спеціальних символів
        function cleanTitle(title) {
            if (!title) return '';
            return title.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        // Функція для додавання рейтингу до картки
        function addRatingToCard(card) {
            if (!card || !card.id || !card.element) return;
            
            // Перевіряємо, чи рейтинг вже існує
            if (card.element.find('.card__imdb').length) return;
            
            // Дані для пошуку
            const title = cleanTitle(card.title || card.name);
            const original_title = card.original_title || card.original_name;
            const year = parseInt((card.release_date || card.first_air_date || '0000').slice(0, 4));
            
            // Формуємо URL запит
            let url = 'https://www.omdbapi.com/?apikey=' + apiKey;
            
            // Пріоритет по IMDB ID, якщо доступний
            if (card.imdb_id) {
                url += '&i=' + encodeURIComponent(card.imdb_id);
            } else {
                // Якщо немає IMDB ID, шукаємо за назвою і роком
                url += '&t=' + encodeURIComponent(title) + '&y=' + year;
            }
            
            // Робимо запит до API
            network.clear();
            network.timeout(15000);
            network.silent(url, function(json) {
                if (json && json.Response === 'True' && json.imdbRating && json.imdbRating !== 'N/A') {
                    // Створюємо елемент з рейтингом
                    const rating_div = document.createElement('div');
                    rating_div.className = 'card__imdb';
                    rating_div.innerHTML = '<div class="card__imdb-text"><div class="imdb-icon"></div>' + json.imdbRating + '</div>';
                    
                    // Додаємо клік для переходу на сторінку IMDB, якщо є imdbID
                    if (json.imdbID) {
                        rating_div.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const url = 'https://www.imdb.com/title/' + json.imdbID;
                            
                            if (Lampa.Platform.is('android')) {
                                window.location.href = url;
                            } else {
                                Lampa.Utils.openLink(url);
                            }
                        });
                    }
                    
                    // Додаємо до елемента картки
                    $('.card__view', card.element).append(rating_div);
                }
            });
        }
        
        // Функція для обробки карток з активністю "full"
        function processFullActivity(e) {
            if (e.type === 'complite') {
                const activity = e.object.activity;
                if (!activity) return;
                
                const render = activity.render();
                if (!render || !render.render) return;
                
                const items = render.render.find('.items-line > div');
                
                if (items.length) {
                    items.each(function() {
                        const card = $(this)[0].card;
                        if (card && card.copy) {
                            const cardData = card.copy();
                            if (cardData) {
                                addRatingToCard(cardData);
                            }
                        }
                    });
                }
            }
        }
        
        // Функція для обробки головної активності
        function processMainActivity(e) {
            if (e.component === 'main') {
                const cards = $('.card');
                
                if (cards.length) {
                    cards.each(function() {
                        const card = $(this)[0].card;
                        if (card && card.id) {
                            addRatingToCard(card);
                        }
                    });
                }
            }
        }
        
        // Додаємо слухачів подій
        Lampa.Listener.follow('full', processFullActivity);
        Lampa.Listener.follow('activity', processMainActivity);
        
        // Показуємо повідомлення про успішне підключення плагіна
        Lampa.Noty.show('IMDB Ratings плагін успішно активовано');
        
        // Додаємо плагін до списку в налаштуваннях
        const plugins = window.lampa_settings.plugins || [];
        
        // Перевіряємо, чи плагін вже доданий
        const existingPlugin = plugins.find(p => p.url === 'IMDB Ratings' || p.name === 'IMDB Ratings');
        
        if (!existingPlugin) {
            plugins.push({
                name: 'IMDB Ratings',
                version: '1.0.0',
                url: 'IMDB Ratings',
                description: 'Показує рейтинг IMDB для фільмів',
                status: true
            });
            
            window.lampa_settings.plugins = plugins;
        }
        
        console.log('IMDB Ratings плагін успішно ініціалізовано');
    }
    
    // Якщо додаток вже готовий, ініціалізуємо плагін негайно
    if (window.appready) {
        init();
    } else {
        // Чекаємо готовності додатка
        Lampa.Listener.follow('app', function(event) {
            if (event.type === 'ready') {
                init();
            }
        });
    }
})();
