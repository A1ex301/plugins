(function () {
    'use strict';

    if (window.torrserver_manager_loaded) return;
    window.torrserver_manager_loaded = true;

    var CONFIG_URL = 'https://a1ex301.github.io/plugins/Torrservers/torrserver-servers.json';
    var TIMEOUT = 6000;

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

    function checkAll(servers, done) {
        if (!servers.length) return done([]);

        var results = [];
        var completed = 0;

        servers.forEach(function (server, index) {
            checkServer(server, function (status) {
                results[index] = status;
                completed++;
                if (completed === servers.length) done(results);
            });
        });
    }

    function activeSlot() {
        return Lampa.Storage.field('torrserver_use_link') === 'two' ? 'two' : 'one';
    }

    function activeUrl(slot) {
        return cleanUrl(Lampa.Storage.get(slot === 'two' ? 'torrserver_url_two' : 'torrserver_url', ''));
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
                notify('Активний TorrServer: ' + server.name + (slot === 'one' ? ' (основне посилання)' : ' (додаткове посилання)'));
            }
        });
    }

    function showServers(servers, statuses) {
        var currentUrl = activeUrl(activeSlot());
        var onlineCount = statuses.filter(function (status) { return status && status.online; }).length;

        var items = servers.map(function (server, index) {
            var status = statuses[index] || { online: false };
            var marker = server.url === currentUrl ? ' ✓' : '';
            var state = status.online ? '🟢 ' + status.ms + ' мс' : '🔴 ' + (status.error || 'Недоступний');
            return { title: server.name + ' · ' + displayAddress(server.url) + marker + ' — ' + state, value: index };
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
            checkAll(servers, function (statuses) {
                showServers(servers, statuses);
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

            var anchor = event.body.find('[data-name="torrserver_url_two"]');
            if (!anchor.length || event.body.find('.torrserver-manager-button').length) return;

            var button = $('<div class="settings-param selector settings-param--button torrserver-manager-button" data-type="button"><div class="settings-param__name">Список серверів TorrServer</div><div class="settings-param__descr">Перевірити доступність і вибрати сервер</div></div>');

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
