(function() {
    'use strict';

    function rating_imdb(card) {
        var network = new Lampa.Reguest();
        
        var clean_title = cleanTitle(card.title || card.name);
        var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
        var search_year = parseInt((search_date + '').slice(0, 4));
        var orig = card.original_title || card.original_name;

        var params = {
            id: card.id,
            // OMDb API url
            url: 'https://www.omdbapi.com/',
            api_key: 'e0a2c76f', // OMDb API key
            cache_time: 60 * 60 * 24 * 1000 // 86400000 ms = 1 day cache time
        };

        getRating();

        function getRating() {
            var movieRating = _getCache(params.id);
            
            if (movieRating) {
                return _showRating(movieRating[params.id]);
            } else {
                searchFilm();
            }
        }

        function searchFilm() {
            var url = params.url;
            var request_url = '';

            // Try to search by IMDb ID first if available
            if (card.imdb_id) {
                request_url = Lampa.Utils.addUrlComponent(url, 'i=' + encodeURIComponent(card.imdb_id) + '&apikey=' + params.api_key);
            } else {
                // Search by title and year
                request_url = Lampa.Utils.addUrlComponent(url, 't=' + encodeURIComponent(clean_title) + '&y=' + search_year + '&apikey=' + params.api_key);
            }

            network.clear();
            network.timeout(15000);
            network.silent(request_url, function(json) {
                if (json && json.Response === 'True') {
                    var imdb_id = json.imdbID;
                    var imdb_rating = json.imdbRating;
                    var movieRating = {};
                    
                    if (imdb_rating && imdb_rating !== 'N/A') {
                        movieRating[params.id] = {
                            'imdb': imdb_rating,
                            'imdb_id': imdb_id
                        };
                        
                        _setCache(params.id, movieRating);
                        _showRating(movieRating[params.id]);
                    } else if (!card.imdb_id && orig && orig !== clean_title) {
                        // If no rating found and we have original title, try again with original title
                        searchByOriginalTitle();
                    } else {
                        _showRating({});
                    }
                } else if (!card.imdb_id && orig && orig !== clean_title) {
                    // If no results and we have original title, try again with original title
                    searchByOriginalTitle();
                } else {
                    _showRating({});
                }
            }, function() {
                _showRating({});
            });
        }

        function searchByOriginalTitle() {
            var url = params.url;
            var request_url = Lampa.Utils.addUrlComponent(url, 't=' + encodeURIComponent(orig) + '&y=' + search_year + '&apikey=' + params.api_key);

            network.clear();
            network.timeout(15000);
            network.silent(request_url, function(json) {
                if (json && json.Response === 'True') {
                    var imdb_id = json.imdbID;
                    var imdb_rating = json.imdbRating;
                    var movieRating = {};
                    
                    if (imdb_rating && imdb_rating !== 'N/A') {
                        movieRating[params.id] = {
                            'imdb': imdb_rating,
                            'imdb_id': imdb_id
                        };
                        
                        _setCache(params.id, movieRating);
                        _showRating(movieRating[params.id]);
                    } else {
                        _showRating({});
                    }
                } else {
                    _showRating({});
                }
            }, function() {
                _showRating({});
            });
        }

        function _showRating(data) {
            var element = Lampa.Storage.field('card_rating') === true ? createElement(data) : '';
            
            // Remove any existing rating elements
            $('.exists--rate', card.element).remove();
            
            if (element) {
                card.element.find('.card__view').append(element);
            }
        }

        function createElement(data) {
            var div = document.createElement('div');
            var imdb = data.imdb;
            var imdb_id = data.imdb_id;
            
            div.className = 'card__imdb exists--rate';
            div.dataset.id = params.id;
            
            if (imdb) {
                div.innerHTML = '<div class="card__imdb-text"><div class="imdb-icon"></div>' + imdb + '</div>';
                
                if (imdb_id) {
                    div.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        var url = 'https://www.imdb.com/title/' + imdb_id;
                        if (Lampa.Platform.is('android')) {
                            window.location.href = url;
                        } else {
                            Lampa.Utils.openLink(url);
                        }
                    });
                }
            }

            return imdb ? div : false;
        }

        function cleanTitle(title) {
            // Remove special characters and trim
            if (!title) return '';
            
            return title.replace(/[^a-zA-Z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function _getCache(id) {
            var cache = localStorage.getItem('rating_' + id);
            
            if (cache) {
                var time = parseInt(localStorage.getItem('rating_' + id + '_time'));
                
                if ((new Date()).getTime() < time + params.cache_time) {
                    try {
                        return JSON.parse(cache);
                    } catch (e) {}
                }
            }
            
            return false;
        }

        function _setCache(id, data) {
            localStorage.setItem('rating_' + id, JSON.stringify(data));
            localStorage.setItem('rating_' + id + '_time', (new Date()).getTime());
        }
    }

    // Add styles for IMDB rating
    var style = document.createElement('style');
    style.appendChild(document.createTextNode(`
        .card__imdb {
            position: absolute;
            bottom: 0;
            left: 0;
            margin: 1em;
            padding: 0.4em 0.6em;
            background-color: rgba(0, 0, 0, 0.7);
            border-radius: 0.3em;
            font-size: 0.9em;
            cursor: pointer;
            z-index: 2;
            transition: transform 0.1s ease-in-out;
        }
        .card__imdb:hover {
            transform: scale(1.05);
        }
        .card__imdb-text {
            display: flex;
            align-items: center;
            color: #fff;
            font-weight: 600;
        }
        .imdb-icon {
            background-image: url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZjVjNTE4IiBoZWlnaHQ9IjUxMiIgcng9IjE1JSIgd2lkdGg9IjUxMiIvPjxwYXRoIGQ9Im0xMDQgMzI4aDcydi0xNDRoLTcyem0xNjgtMTQ0djE0NGgtMzZ2LTEwOGgtOHYxMDhoLTM2di0xNDR6bTY0IDBjMTEuNSAwIDIwLjUgMS41IDI2LjggNC4zIDYuMyAyLjggMTAuNyA3LjIgMTMuMyAxMi43IDIuNSA1LjQgMy44IDEyLjcgMy44IDIxLjl2ODIuOWgtMzZ2LTc0LjRjMC05LjMtMS4zLTE1LjQtMy44LTE4LjEtMi41LTIuOC03LjMtNC4yLTE0LjUtNC4yaC0yLjV2OTYuOGgtMzZ2LTE0NHptMTIwIDE0NGgtMzZ2LTE0NGg1NmM5LjYgMCAxNi44IDEgMjEuNyAzIDQuOSAyIDguNSA0LjkgMTEgOC43IDIuNSAzLjggMy44IDcuOSAzLjggMTIuNHYyNC40YzAgNC41LTEuMyA4LjgtMy44IDEyLjctMi41IDQtNS44IDcuMS0xMCA5LjQgOS4zIDMuOCAxNCA5LjggMTQgMjAuMXYyNWMwIDQuNC0uNSA4LjUtMS40IDEyLjMtLjkgMy44LTIuNSA3LjEtNC45IDkuOS0yLjQgMi44LTUuOSA1LTEwLjcgNi41cy0xMC44IDIuMy0xOC4xIDIuM2MtMi4yIDAtNi0uMi0xMS42LS43em0xOS42NS04OC45YzEuNy0yLjEgMi41LTUuNiAyLjUtMTAuNCAwLS4xLS4xLTMuNy0uMy0xMC43LS4zLTEwLjMtNC4yLTE1LjQtMTEuOC0xNS40aC0xMC4xdjQxLjJoMTMuMWM0LjEgMCA2LjItMS42IDYuNi00Ljd6bS03LjM1IDMyLjk2Yy0yLjUtMS41LTUuNC0yLjMtOC41LTIuM2gtNi4xdjQwLjVoNy42YzQuMiAwIDcuMS0uNCAxMC4zLTEuNyAzLjItMS4yIDQuNi00LjUgNC42LTEwLjZ2LTE1LjljMC00LjYtMS40LTguNC00LTEweiIgZmlsbD0iIzA1MDUwNSIvPjwvc3ZnPg==');
            background-size: contain;
            background-repeat: no-repeat;
            width: 1.2em;
            height: 1.2em;
            margin-right: 0.4em;
        }
    `));
    document.head.appendChild(style);

    // Register plugin for Lampa
    function startPlugin() {
        var plugins = window.lampa_settings.plugins;
        
        if (!plugins) {
            plugins = [];
            window.lampa_settings.plugins = plugins;
        }

        plugins.push({
            name: 'IMDB ratings',
            version: '1.0.0',
            description: 'Display IMDB ratings on movie cards',
            status: true
        });

        // This is the hook to the Lampa platform - connecting our rating function
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                
                if (render && render.render) {
                    var items = render.render.find('.items-line > div');
                    
                    if (items.length) {
                        items.each(function() {
                            var card = $(this)[0].card;
                            
                            if (card && card.copy) {
                                var copyCard = card.copy();
                                
                                if (copyCard) {
                                    rating_imdb(copyCard);
                                }
                            }
                        });
                    }
                }
            }
        });

        Lampa.Listener.follow('activity', function(e) {
            try {
                if (e.component === 'main') {
                    var elements = $('.card');
                    
                    if (elements.length) {
                        elements.each(function() {
                            var card = $(this)[0].card;
                            
                            if (card && card.id && !$('.exists--rate', $(this)).length) {
                                rating_imdb(card);
                            }
                        });
                    }
                }
            } catch (e) {
                console.log('IMDB ratings plugin error:', e);
            }
        });
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }
})();
