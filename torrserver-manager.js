(function () {
    'use strict';

    if (window.torrserver_manager_loaded) return;
    window.torrserver_manager_loaded = true;

    var CONFIG_URL = 'https://raw.githubusercontent.com/A1ex301/plugins/main/torrserver-servers.json';
    var TIMEOUT = 6000;
    var initialized = false;

    function notify(message) {
        if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message);
    }

    function cleanUrl(value) {
        return String(value || '').replace(/^\s+|\s+$/g, '').replace(/\/+$/, '');
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

    // Та сама перевірка, яку використовує сама Lampa: POST /settings з action=get.
    function checkServer(server, done) {
        var started = Date.now();

        $.ajax({
            url: server.url + '/settings',
            method: 'POST',
            data: JSON.stringify({ action: 'get' }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            cache: false,
            timeout: TIMEOUT,
            success: function (response) {
                if (response && typeof response.CacheSize !== 'undefined') {
                    done({ online: true, ms: Date.now() - started });
                } else {
                    done({ online: false });
                }
            },
            error: function () {
                done({ online: false });
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
        return Lampa.Storage.get('torrserver_use_link', 'one') === 'two' ? 'two' : 'one';
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
                Lampa.Storage.set(slot === 'two' ? 'torrserver_url_two' : 'torrserver_url', server.url);
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
            var state = status.online ? '● Онлайн · ' + status.ms + ' мс' : '○ Недоступний';

            return { title: server.name + marker + ' — ' + state, value: index };
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
                    notify('Сервер недоступний. Вибери сервер зі статусом «Онлайн».');
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
        if (initialized || !window.Lampa || !Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;
        initialized = true;

        Lampa.SettingsApi.addParam({
            component: 'server',
            param: { name: 'torrserver_manager_open', type: 'button' },
            field: {
                name: 'Список серверів TorrServer',
                description: 'Завантажити список з GitHub та перевірити доступність'
            },
            onChange: openManager
        });
    }

    if (window.appready) init();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
