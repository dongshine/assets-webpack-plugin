var merge = require('lodash.merge')

var getAssetKind = require('./lib/getAssetKind')
var isHMRUpdate = require('./lib/isHMRUpdate')
var isSourceMap = require('./lib/isSourceMap')

var createQueuedWriter = require('./lib/output/createQueuedWriter')
var createOutputWriter = require('./lib/output/createOutputWriter')

function AssetsWebpackPlugin (options) {
  this.options = merge({}, {
    path: '.',
    filename: 'webpack-assets.json',
    prettyPrint: false,
    update: false,
    fullPath: true,
    //ignore:["underscore"],
    ignore:[],
    //sort:["libs","common"]    
    sort:[], 
    assetsRegex: /\.(jpe?g|png|gif|svg)$/
  }, options)
  this.writer = createQueuedWriter(createOutputWriter(this.options))
}

AssetsWebpackPlugin.prototype = {

  constructor: AssetsWebpackPlugin,

  apply: function (compiler) {
    var self = this

    compiler.plugin('after-emit', function (compilation, callback) {
      var output = {}
      var options = compiler.options
      var stats = compilation.getStats().toJson({
        hash: true,
        publicPath: true,
        assets: true,
        chunks: false,
        modules: false,
        source: false,
        errorDetails: false,
        timings: false
      })
            // publicPath with resolved [hash] placeholder

      var assetPath = (stats.publicPath && self.options.fullPath) ? stats.publicPath : ''
            // assetsByChunkName contains a hash with the bundle names and the produced files
            // e.g. { one: 'one-bundle.js', two: 'two-bundle.js' }
            // in some cases (when using a plugin or source maps) it might contain an array of produced files
            // e.g. {
            // main:
            //   [ 'index-bundle-42b6e1ec4fa8c5f0303e.js',
            //     'index-bundle-42b6e1ec4fa8c5f0303e.js.map' ]
            // }
      var assetsByChunkName = stats.assetsByChunkName

      output.entries = Object.keys(assetsByChunkName).reduce(function (chunkMap, chunkName) {
        var assets = assetsByChunkName[chunkName]
        if (!Array.isArray(assets)) {
          assets = [assets]
        }
        chunkMap[chunkName] = assets.reduce(function (typeMap, asset) {
          if (isHMRUpdate(options, asset) || isSourceMap(options, asset)) {
            return typeMap
          }

          var typeName = getAssetKind(options, asset)
          typeMap[typeName] = assetPath + asset

          return typeMap
        }, {})

        return chunkMap
      }, {})

      output.assets = stats.assets.filter(function (asset) {
        return self.options.assetsRegex.test(asset.name)
      }).map(function (asset) {
        return { name: asset.name, path: assetPath + asset.name }
      })
      
      /* ignore key **************************************************/
      if(self.options.ignore.length != 0 ){
          var _ignore = self.options.ignore;
          for(var j = 0,ignLeng = _ignore.length; j < ignLeng; j++){
              delete output[_ignore[j]];
          }
      }      
      /* ignore**************************************************/
      
      /* sort *****************************************/
      if(self.options.sort.length != 0 ){
           var _tmpObj = {},_sort = self.options.sort; 
           for(var i = 0,sortleng = _sort.length; i < sortleng ;i++){
               if(output[_sort[i]]){
                   _tmpObj[_sort[i]] = output[_sort[i]];
                   delete output[i];
               } 
           }            
           output =  merge(_tmpObj,output);
      }
      /* sort *****************************************/
      
      if (self.options.metadata) {
        output.metadata = self.options.metadata
      }

      self.writer(output, function (err) {
        if (err) {
          compilation.errors.push(err)
        }
        callback()
      })
    })
  }
}

module.exports = AssetsWebpackPlugin
