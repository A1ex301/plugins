(function () {
    'use strict';

    // Постійний завантажувач: щоразу отримує актуальну версію основного плагіна.
    var script = document.createElement('script');
    script.src = 'https://a1ex301.github.io/plugins/Torrservers/torrserver-manager.js?_=' + Date.now();
    script.async = true;

    script.onerror = function () {
        if (window.Lampa && Lampa.Noty && Lampa.Noty.show) {
            Lampa.Noty.show('Не вдалося завантажити TorrServer Manager. Перевір підключення до інтернету.');
        }
    };

    (document.head || document.documentElement).appendChild(script);
})();