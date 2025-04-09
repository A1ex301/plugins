(function () {
  var MyObject = {
    init: function () {
      Lampa.Api.resources('script', [
        'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js'
      ]);
  
      Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') {
          MyObject.ready();
        }
      });
    },
    ready: function () {
      $('body').append('<div id="rt_test_div" style="display:none">RT Plugin Loaded</div>');
  
      /* Добавляем в меню */
      var menu_info = $('<li class="menu__item selector" data-action="rtinfo"><div class="menu__ico"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg></div><div class="menu__text">RT Plugin</div></li>');
  
      menu_info.on('hover:enter', function () {
        Lampa.Modal.open({
          title: 'Rotten Tomatoes Plugin',
          html: '<div style="padding: 1.5em">Plugin for showing Rotten Tomatoes ratings is active</div>',
          onBack: function () {
            Lampa.Modal.close();
          }
        });
      });
  
      $('.menu .menu__list').eq(0).append(menu_info);
  
      // Добавляем слушатель для карточек
      Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complite') {
          var btn = $('<div class="full-descr__item selector" style="background-color:#fa320a;color:white;">RT Rating</div>');
          $('.full-descr__advanced-items', e.data).append(btn);
          
          btn.on('hover:enter', function () {
            var title = e.data.movie.title || e.data.movie.name;
            var year = (e.data.movie.release_date || e.data.movie.first_air_date || '').slice(0, 4);
            
            Lampa.Modal.open({
              title: 'Loading...',
              html: '<div style="text-align:center;padding:2em;">Loading Rotten Tomatoes rating for: ' + title + '</div>',
              size: 'small',
              onBack: function () {
                Lampa.Modal.close();
                Lampa.Controller.toggle('full_descr');
              }
            });
            
            // Получаем данные из OMDB API
            $.ajax({
              url: 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&y=' + year + '&apikey=e0a2c76f',
              dataType: 'json',
              success: function (data) {
                var html = '<div style="padding:1.5em">';
                
                if (data && data.Response === 'True') {
                  html += '<div style="font-size:1.2em;margin-bottom:1em;font-weight:bold;">' + data.Title + ' (' + data.Year + ')</div>';
                  
                  var rtRating = '';
                  
                  if (data.Ratings && data.Ratings.length) {
                    for (var i = 0; i < data.Ratings.length; i++) {
                      var source = data.Ratings[i].Source;
                      var value = data.Ratings[i].Value;
                      
                      if (source === 'Rotten Tomatoes') {
                        rtRating = value;
                        html += '<div style="color:#fa320a;font-weight:bold;font-size:1.1em;margin-bottom:0.5em">Rotten Tomatoes: ' + value + '</div>';
                      } else {
                        html += '<div style="margin-bottom:0.5em">' + source + ': ' + value + '</div>';
                      }
                    }
                  }
                  
                  if (!rtRating) {
                    html += '<div>No Rotten Tomatoes rating found</div>';
                  }
                } else {
                  html += '<div>No ratings found</div>';
                }
                
                html += '</div>';
                
                Lampa.Modal.update(html);
                Lampa.Modal.title('Rotten Tomatoes');
              },
              error: function () {
                Lampa.Modal.update('<div style="text-align:center;padding:2em;">Error loading data</div>');
              }
            });
          });
        }
      });
    }
  };
  
  MyObject.init();
})();
