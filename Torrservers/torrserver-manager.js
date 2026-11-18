(function () {
    'use strict';

    if (window.torrserver_manager_loaded) return;
    window.torrserver_manager_loaded = true;

    var CONFIG_URL = 'https://a1ex301.github.io/plugins/Torrservers/torrserver-servers.json';
    var TIMEOUT = 6000;
    var settingsBody = null;

    function notify(message) {
        if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message);
    }

    function cleanUrl(value) {
        var url = String(value || '').replace(/^\s+|\s+$/g, '').replace(/\\/g, '/').replace(/\/+$/, '');
        if (url && !/^https?:\/\//i.test(url)) url = 'http://' + url;
        return url;
    }

    function displayAddress(value) {
        return String(value || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    }
    function loadConfig(success, fail) {
        $.ajax({
            url: CONFIG_URL + '?_=' + Date.now(),
            method: 'GET',
            dataType: 'json',
            cache: false,
            timeout: 10000,
            success: function (data) {
                if (!data || !Array.isArray(data.servers)) {
                    fail('Невірний формат torrserver-servers.json');
                    return;
                }

                var servers = data.servers.filter(function (server) {
                    return server && server.name && server.url;
                }).map(function (server) {
                    return { name: String(server.name), url: cleanUrl(server.url) };
                });

                success(servers);
            },
            error: function () {
                fail('Не вдалося завантажити список серверів з GitHub');
            }
        });
    }

    var COUNTRY_CACHE_KEY = 'torrserver_country_cache';
    var COUNTRY_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

    function serverHost(url) {
        return String(url || '').replace(/^https?:\/\//i, '').split('/')[0].replace(/^\[|\]$/g, '').split(':')[0].toLowerCase();
    }

    function countryFlag(code) {
        code = String(code || '').toUpperCase();
        if (!/^[A-Z]{2}$/.test(code)) return '';
        return String.fromCodePoint(127462 + code.charCodeAt(0) - 65, 127462 + code.charCodeAt(1) - 65);
    }

    function lookupCountry(server, done) {
        var host = serverHost(server.url);
        if (!host) return done('');

        var cache = Lampa.Storage.get(COUNTRY_CACHE_KEY, {}) || {};
        var cached = cache[host];
        if (cached && cached.time && Date.now() - cached.time < COUNTRY_CACHE_TTL) {
            return done(cached.label || '');
        }

        $.ajax({
            url: 'https://ipwho.is/' + encodeURIComponent(host),
            method: 'GET',
            dataType: 'json',
            cache: true,
            timeout: 2500,
            success: function (data) {
                var label = data && data.success && data.country && data.country_code
                    ? countryFlag(data.country_code) + ' ' + data.country
                    : '';
                cache[host] = { time: Date.now(), label: label };
                Lampa.Storage.set(COUNTRY_CACHE_KEY, cache);
                done(label);
            },
            error: function () {
                done('');
            }
        });
    }

    function lookupCountries(servers, done) {
        if (!servers.length) return done();
        var completed = 0;
        servers.forEach(function (server) {
            lookupCountry(server, function (label) {
                server.country = label;
                completed++;
                if (completed === servers.length) done();
            });
        });
    }

    // TorrServer API: POST /settings with action=get.
    function checkServer(server, done) {
        var started = Date.now();

        $.ajax({
            url: server.url + '/settings',
            method: 'POST',
            data: JSON.stringify({ action: 'get' }),
            // Залишаємо стандартний content-type jQuery, як у штатних запитах Lampa.
            // Це важливо для CORS/preflight на деяких TorrServer.
            dataType: 'json',
            cache: false,
            timeout: TIMEOUT,
            beforeSend: function (xhr) {
                // Повторюємо авторизацію, яку штатний Request Lampa додає до TorrServer.
                if (Lampa.Storage.field('torrserver_auth')) {
                    var login = Lampa.Storage.get('torrserver_login', '');
                    var password = Lampa.Storage.value('torrserver_password') || '';
                    var credentials = unescape(encodeURIComponent(login + ':' + password));
                    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(credentials));
                }
            },
            success: function (response) {
                done(response && typeof response.CacheSize !== 'undefined'
                    ? { online: true, ms: Date.now() - started }
                    : { online: false });
            },
            error: function (xhr, textStatus, errorThrown) {
                var reason = 'HTTP ' + (xhr && xhr.status ? xhr.status : 0);
                if (textStatus === 'timeout') reason = 'Тайм-аут (' + (TIMEOUT / 1000) + ' с)';
                else if (xhr && xhr.status === 0) reason = 'Немає відповіді (можливий CORS, HTTPS/HTTP або недоступний порт)';
                else if (xhr && xhr.status === 401) reason = '401 — потрібна авторизація';
                else if (xhr && xhr.status === 403) reason = '403 — доступ заборонено';
                else if (xhr && xhr.status === 404) reason = '404 — endpoint /settings не знайдено';
                else if (errorThrown) reason += ' — ' + String(errorThrown);
                done({ online: false, error: reason });
            }
        });
    }

    // GET /echo повертає ідентифікатор версії TorrServer.
    // У списку показуємо лише номер, без назви MatriX/Silo.
    function checkVersion(server, done) {
        $.ajax({
            url: server.url + '/echo',
            method: 'GET',
            dataType: 'text',
            cache: false,
            timeout: 4000,
            beforeSend: function (xhr) {
                if (Lampa.Storage.field('torrserver_auth')) {
                    var login = Lampa.Storage.get('torrserver_login', '');
                    var password = Lampa.Storage.value('torrserver_password') || '';
                    var credentials = unescape(encodeURIComponent(login + ':' + password));
                    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(credentials));
                }
            },
            success: function (response) {
                var value = String(response || '').replace(/\\s+/g, ' ').trim();
                var match = value.match(/^(?:MatriX|Silo)[.\\s-]*([0-9][A-Za-z0-9._-]*)$/i);
                done(match ? match[1] : '');
            },
            error: function () {
                done('');
            }
        });
    }

    function checkAll(servers, done) {
        if (!servers.length) return done([]);

        var results = [];
        var completed = 0;

        servers.forEach(function (server, index) {
            var statusReady = false;
            var versionReady = false;
            var statusResult = null;

            function finishIfReady() {
                if (!statusReady || !versionReady) return;
                statusResult.version = server.version || '';
                results[index] = statusResult;
                completed++;
                if (completed === servers.length) done(results);
            }

            checkServer(server, function (status) {
                statusResult = status;
                statusReady = true;
                finishIfReady();
            });

            checkVersion(server, function (version) {
                server.version = version;
                versionReady = true;
                finishIfReady();
            });
        });
    }

    function activeSlot() {
        return Lampa.Storage.field('torrserver_use_link') === 'two' ? 'two' : 'one';
    }

    function activeUrl(slot) {
        return cleanUrl(Lampa.Storage.get(slot === 'two' ? 'torrserver_url_two' : 'torrserver_url', ''));
    }

    // Оновлюємо значення у вже відкритому меню налаштувань без повторного входу.
    function refreshSettingsFields() {
        if (!settingsBody || !settingsBody.length) return;

        ['one', 'two'].forEach(function (slot) {
            var key = slot === 'two' ? 'torrserver_url_two' : 'torrserver_url';
            var value = Lampa.Storage.get(key, '');
            settingsBody.find('[data-name="' + key + '"] .settings-param__value')
                .text(displayAddress(value));
        });

        var selected = Lampa.Storage.get('torrserver_use_link', 'one');
        var labels = {
            one: 'Основне посилання',
            two: 'Додаткове посилання'
        };
        settingsBody.find('[data-name="torrserver_use_link"] .settings-param__value')
            .text(labels[selected] || labels.one);
    }

    function showSlotChoice(server) {
        Lampa.Select.show({
            title: 'Куди встановити сервер «' + server.name + '»?',
            items: [
                { title: 'Основне посилання', value: 'one' },
                { title: 'Додаткове посилання', value: 'two' }
            ],
            onSelect: function (item) {
                var slot = item.value;
                // У налаштування Lampa записуємо адресу без протоколу.
                Lampa.Storage.set(slot === 'two' ? 'torrserver_url_two' : 'torrserver_url', displayAddress(server.url));
                Lampa.Storage.set('torrserver_use_link', slot);
                refreshSettingsFields();
                notify('Активний TorrServer: ' + server.name + (slot === 'one' ? ' (основне посилання)' : ' (додаткове посилання)'));
            }
        });
    }

    function showServers(servers, statuses) {
        var currentUrl = activeUrl(activeSlot());
        var onlineCount = statuses.filter(function (status) { return status && status.online; }).length;

        var items = servers.map(function (server, index) {
            var status = statuses[index] || { online: false };
            var marker = server.url === currentUrl ? ' ⭐' : '';
            var state = status.online ? '🟢 ' + status.ms + ' мс' : '🔴 offline';
            var country = server.country ? server.country + ' · ' : '';
            var version = status.version ? 'v.' + status.version + ' · ' : '';
            return {
                title: country + displayAddress(server.url) + ' · ' + version + state + marker,
                value: index,
                online: !!status.online,
                ms: typeof status.ms === 'number' ? status.ms : Number.MAX_SAFE_INTEGER,
                originalIndex: index,
                onDraw: function (item) {
                    item.find('.selectbox-item__title').css({
                        'font-size': '0.95em',
                        'white-space': 'nowrap',
                        'overflow': 'hidden',
                        'text-overflow': 'ellipsis'
                    });
                }
            };
        });

        // Спочатку доступні сервери з найменшим часом відповіді;
        // недоступні сервери переміщуємо в кінець списку.
        items.sort(function (a, b) {
            if (a.online !== b.online) return a.online ? -1 : 1;
            if (a.online && a.ms !== b.ms) return a.ms - b.ms;
            return a.originalIndex - b.originalIndex;
        });

        if (!items.length) {
            notify('Список серверів порожній. Додай сервери у torrserver-servers.json на GitHub.');
            return;
        }

        Lampa.Select.show({
            title: 'Список серверів · онлайн: ' + onlineCount + '/' + servers.length,
            items: items,
            onSelect: function (item) {
                var server = servers[item.value];
                if (!statuses[item.value] || !statuses[item.value].online) {
                    notify('Сервер недоступний: ' + ((statuses[item.value] && statuses[item.value].error) || 'невідома помилка'));
                    return;
                }
                showSlotChoice(server);
            }
        });
    }

    function openManager() {
        notify('Завантаження списку та перевірка серверів…');
        loadConfig(function (servers) {
            var statuses = null;
            var countriesReady = false;
            function renderWhenReady() {
                if (statuses && countriesReady) showServers(servers, statuses);
            }
            checkAll(servers, function (result) {
                statuses = result;
                renderWhenReady();
            });
            lookupCountries(servers, function () {
                countriesReady = true;
                renderWhenReady();
            });
        }, function (error) {
            notify(error);
        });
    }

    function init() {
        if (!window.Lampa || !Lampa.Settings || !Lampa.Settings.listener) return;

        // Вставляємо кнопку безпосередньо в наявний екран Налаштування → Сервер.
        // Це той самий механізм, який використовує штатний тест швидкості Lampa.
        Lampa.Settings.listener.follow('open', function (event) {
            if (event.name !== 'server') return;
            settingsBody = event.body;

            var anchor = event.body.find('[data-name="torrserver_url_two"]');
            if (!anchor.length || event.body.find('.torrserver-manager-button').length) return;

            var button = $('<div class="settings-param selector settings-param--button torrserver-manager-button" data-type="button"><div class="settings-param__name">Список серверів</div><div class="settings-param__descr">Перевірити доступність і вибрати сервер · тест автооновлення</div></div>');

            button.on('hover:enter', openManager);
            anchor.after(button);
        });
    }

    if (window.appready) init();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
