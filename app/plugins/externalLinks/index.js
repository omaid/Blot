var Url = require('url');

function render ($, callback, options) {

  // Links with these hosts
  // are not external.
  var ignore;

  try {

    ignore = [
      Url.parse(options.domain).host,
      Url.parse(options.baseURL).host
    ];

  } catch(e) {

    return callback();
  }

  $('a').each(function(){

    try {

      var href = $(this).attr('href');
      var host = Url.parse(href).host;

      if (host && ignore.indexOf(host) === -1)
        $(this).attr('target', '_blank');

    } catch (e) {}

  });

  return callback();
}

module.exports = {
  render: render,
  isDefault: false,
  category: 'Typography',
  description: 'Make links to other websites open in a new tab.'
};