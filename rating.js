(function () {
  function RTPlugin(object) {
    this.widget = object;
    this.api_key = 'e0a2c76f';
    this.source = 'Rotten Tomatoes';
  }

  RTPlugin.prototype.start = function () {
    Lampa.Listener.follow('full', function (e) {
      if (e.type == 'complite') {
        this.add(e.data);
      }
    }.bind(this));
  };

  RTPlugin.prototype.add = function (data) {
    var btn = $('<div class="full-descr__item selector">Rotten Tomatoes</div>');
    
    $('.full-descr__advanced-items', data).append(btn);
    
    btn.on('hover:enter', function () {
      this.getRatings(data);
    }.bind(this));
  };

  RTPlugin.prototype.getRatings = function (data) {
    var _data = data.movie;
    var title = _data.title || _data.name;
    var year = (_data.release_date || _data.first_air_date || '').slice(0, 4);
    var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&y=' + year + '&apikey=' + this.api_key;
    
    var loader = '<div class="broadcast__scan"><div></div></div>';
    var html = '<div class="rtplugin-loader">' + loader + '</div>';
    
    Lampa.Modal.open({
      title: 'Rotten Tomatoes Ratings',
      html: $(html),
      size: 'medium',
      class: 'rtplugin-modal',
      onBack: function () {
        Lampa.Modal.close();
        Lampa.Controller.toggle('full_descr');
      }
    });
    
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json',
      success: function (result) {
        $('.rtplugin-loader').remove();
        
        if (result && result.Response === 'True') {
          this.showRatings(result);
        } else {
          Lampa.Modal.update('<div class="rtplugin-error">No ratings found</div>');
        }
      }.bind(this),
      error: function () {
        $('.rtplugin-loader').remove();
        Lampa.Modal.update('<div class="rtplugin-error">Error loading ratings</div>');
      }
    });
  };

  RTPlugin.prototype.showRatings = function (data) {
    var html = '<div class="rtplugin-content">';
    html += '<div class="rtplugin-title">' + data.Title + ' (' + data.Year + ')</div>';
    
    if (data.Ratings && data.Ratings.length) {
      html += '<div class="rtplugin-ratings">';
      
      for (var i = 0; i < data.Ratings.length; i++) {
        var rating = data.Ratings[i];
        var color = '';
        
        if (rating.Source === this.source) {
          color = 'color: #fa320a; font-weight: bold;';
          
          var value = rating.Value;
          var match = value.match(/(\d+)%/);
          if (match && parseInt(match[1]) >= 60) {
            color = 'color: #00E400; font-weight: bold;';
          }
        }
        
        html += '<div class="rtplugin-rating" style="' + color + '">' + 
          rating.Source + ': ' + rating.Value + 
        '</div>';
      }
      
      html += '</div>';
    }
    
    if (data.Plot && data.Plot !== 'N/A') {
      html += '<div class="rtplugin-plot">' + data.Plot + '</div>';
    }
    
    html += '</div>';
    
    Lampa.Modal.update(html);
    
    $('head').append('<style>' + 
      '.rtplugin-content { padding: 1.5em; }' +
      '.rtplugin-loader { display: flex; justify-content: center; align-items: center; padding: 2em; }' +
      '.rtplugin-error { text-align: center; padding: 2em; }' +
      '.rtplugin-title { font-size: 1.5em; margin-bottom: 1em; font-weight: bold; }' +
      '.rtplugin-ratings { margin-bottom: 1.5em; }' +
      '.rtplugin-rating { padding: 0.5em 0; font-size: 1.1em; }' +
      '.rtplugin-plot { line-height: 1.5; opacity: 0.8; }' +
    '</style>');
  };

  var rt_plugin = new RTPlugin({});
  
  Lampa.Plugins.add('rotten_tomatoes', rt_plugin);
  
  if (window.lampa_settings) {
    window.lampa_settings.plugins_add({
      id: 'rotten_tomatoes',
      title: 'Rotten Tomatoes',
      subtitle: 'Movie ratings from OMDB',
      icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#fa320a"/><path d="M12,4 C7.58,4 4,7.58 4,12 C4,16.42 7.58,20 12,20 C16.42,20 20,16.42 20,12 C20,7.58 16.42,4 12,4 Z M12,18 C8.69,18 6,15.31 6,12 C6,8.69 8.69,6 12,6 C15.31,6 18,8.69 18,12 C18,15.31 15.31,18 12,18 Z" fill="#ffffff"/><path d="M10,9 L8.5,12 L10,15 L14,15 L15.5,12 L14,9 Z" fill="#ffffff"/></svg>',
      visible: true
    });
  }
})();
