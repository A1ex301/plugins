(function () {
    'use strict';
    
    function start_plugin() {
        var html = $('<div class="settings-folder" style="padding:0!important"></div>');
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });

        // Создаем плагин
        Lampa.Template.add('rt_ratings_style', "<style>.icon--rt-rating{background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2ZhMzIwYSIvPjxwYXRoIGQ9Ik0xMiw0IEM3LjU4LDQgNCw3LjU4IDQsMTIgQzQsMTYuNDIgNy41OCwyMCAxMiwyMCBDMTYuNDIsMjAgMjAsMTYuNDIgMjAsMTIgQzIwLDcuNTggMTYuNDIsNCAxMiw0IFogTTEyLDE4IEM4LjY5LDE4IDYsMTUuMzEgNiwxMiBDNiw4LjY5IDguNjksNiAxMiw2IEMxNS4zMSw2IDE4LDguNjkgMTgsMTIgQzE4LDE1LjMxIDE1LjMxLDE4IDEyLDE4IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTAsOSBMOC41LDEyIEwxMCwxNSBMMTQsMTUgTDE1LjUsMTIgTDE0LDkgWiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==);background-position:50% 50%;background-repeat:no-repeat;background-size:70%;border-radius:.3em;backdrop-filter:blur(.5em);-webkit-backdrop-filter:blur(.5em);color:hsla(0,0%,100%,.875);display:inline-flex;align-items:center;justify-content:center;background-color:hsla(0,0%,32.2%,.5);position:absolute;right:.3em;bottom:.3em;width:1.8em;height:1.8em;margin-left:.5em}</style>");
        $('body').append(Lampa.Template.get('rt_ratings_style', {}, true));

        function RTRating() {
            var menu_item = $('<li class="menu__item selector" data-action="rtratings">Rotten Tomatoes</li>');
            menu_item.on('hover:enter', function() {
                Lampa.Modal.open({
                    title: 'Rotten Tomatoes Ratings',
                    html: 'Added RT ratings to movie cards.',
                    size: 'small',
                    onBack: function onBack() {
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('settings_component');
                    }
                });
            });

            $('.menu .menu__list').eq(0).append(menu_item);

            var last_card = '';
            var omdb_api_key = 'e0a2c76f';

            Lampa.Listener.follow('full', function(e) {
                if (!e.card.id) return;
                last_card = e.card.id;

                var card = e.card;
                var cardElement = card.render();
                var categoryElement = cardElement.find('.card--category');

                if (categoryElement.length) {
                    var rtIcon = $('<div class="card__icon icon--rt-rating"></div>');
                    categoryElement.append(rtIcon);
                }
            });

            Lampa.Listener.follow('activity', function(e) {
                if(e.component == 'full' && e.type == 'start' && last_card) {
                    setTimeout(function() {
                        var card_data = Lampa.Activity.active().card;
                        if(card_data.id == last_card) {
                            var btn = $('<div class="full-start__button selector rtratings__button">RT</div>');
                            $('.full-start__buttons').append(btn);
                            
                            btn.on('hover:enter', function() {
                                getOMDBData(card_data);
                            });
                        }
                    }, 1000);
                }
            });

            function getOMDBData(card_data) {
                var title = card_data.title || card_data.name;
                var url;
                
                if (card_data.imdb_id) {
                    url = 'https://www.omdbapi.com/?i=' + card_data.imdb_id + '&apikey=' + omdb_api_key;
                } else {
                    var year = card_data.release_date || card_data.first_air_date || '';
                    year = year ? (new Date(year)).getFullYear() : '';
                    
                    url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&y=' + year + '&apikey=' + omdb_api_key;
                }
                
                $.ajax({
                    url: url,
                    type: 'GET',
                    dataType: 'json',
                    success: function(json) {
                        showRatings(json);
                    },
                    error: function() {
                        Lampa.Noty.show('Error loading data from OMDB');
                    }
                });
            }

            function showRatings(data) {
                if (!data || data.Response === 'False') {
                    Lampa.Noty.show('No ratings found');
                    return;
                }

                var html = '<div class="about">';
                html += '<div class="title">' + data.Title + ' (' + data.Year + ')</div>';

                if (data.Ratings && data.Ratings.length) {
                    html += '<div class="section"><div class="section-title">Ratings</div>';
                    
                    for(var i = 0; i < data.Ratings.length; i++) {
                        var source = data.Ratings[i].Source;
                        var value = data.Ratings[i].Value;
                        var color = '';
                        
                        if (source === 'Rotten Tomatoes') {
                            var match = value.match(/(\d+)%/);
                            var percent = match ? parseInt(match[1]) : 0;
                            
                            if (percent >= 60) {
                                color = '#00E400'; // Fresh
                            } else {
                                color = '#fa320a'; // Rotten
                            }
                        }
                        
                        html += '<div class="videos__line" style="color:' + color + '">' + source + ': ' + value + '</div>';
                    }
                    
                    html += '</div>';
                }

                if (data.Plot && data.Plot !== 'N/A') {
                    html += '<div class="section"><div class="section-title">Plot</div>';
                    html += '<div class="videos__line">' + data.Plot + '</div>';
                    html += '</div>';
                }

                if (data.Director && data.Director !== 'N/A') {
                    html += '<div class="section"><div class="section-title">Director</div>';
                    html += '<div class="videos__line">' + data.Director + '</div>';
                    html += '</div>';
                }

                if (data.Actors && data.Actors !== 'N/A') {
                    html += '<div class="section"><div class="section-title">Actors</div>';
                    html += '<div class="videos__line">' + data.Actors + '</div>';
                    html += '</div>';
                }

                html += '</div>';

                Lampa.Modal.open({
                    title: 'Rotten Tomatoes Ratings',
                    html: $(html),
                    size: 'medium',
                    onBack: function() {
                        Lampa.Modal.close();
                    }
                });
            }
        }

        var rt_ratings = new RTRating();
    }

    if (typeof Lampa !== 'undefined') {
        start_plugin();
    }
})();
