module.exports = function (dir) {

  var crumbs = [{name: 'Home', url: '/'}];

  var names = dir.split('/').filter(function(name){return !!name;});

  names.forEach(function(name, i){

    crumbs.push({
      url: '/~/' + names.slice(0,i+1).join('/'),
      name: name
    });

  });

  crumbs[crumbs.length - 1].last = true;

  return crumbs;
};