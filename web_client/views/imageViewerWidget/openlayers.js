import ImageViewerWidget from './base';

var OpenlayersImageViewerWidget = ImageViewerWidget.extend({
    initialize: function (settings) {
        if (!$('head #large_image-openlayers-css').length) {
            $('head').prepend(
                $('<link>', {
                    id: 'large_image-openlayers-css',
                    rel: 'stylesheet',
                    href: 'https://cdnjs.cloudflare.com/ajax/libs/openlayers/4.6.4/ol.css'
                })
            );
        }

        $.when(
            ImageViewerWidget.prototype.initialize.call(this, settings),
            $.ajax({  // like $.getScript, but allow caching
                url: 'https://cdnjs.cloudflare.com/ajax/libs/openlayers/4.6.4/ol.js',
                dataType: 'script',
                cache: true
            }))
            .done(() => this.render());
    },

    render: function () {
        // If script or metadata isn't loaded, then abort
        if (!window.ol || !this.tileWidth || !this.tileHeight || this.deleted) {
            return this;
        }

        if (this.viewer) {
            // don't rerender the viewer
            return this;
        }

        var ol = window.ol; // this makes the style checker happy

        if (!this.geospatial || !this.bounds) {
            this.viewer = new ol.Map({
                target: this.el,
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.XYZ({
                            tileSize: [this.tileWidth, this.tileHeight],
                            url: this._getTileUrl('{z}', '{x}', '{y}', {edge: 'white'}),
                            crossOrigin: 'use-credentials',
                    // projection: new ol.proj.Projection({
                    //     code: 'rect',
                    //     units: 'pixels',
                    //     extent: [0, 0, this.sizeX, this.sizeY],
                    // })
                            maxZoom: this.levels,
                            wrapX: false
                        }),
                        preload: 1
                    })
                ],
                view: new ol.View({
                    minZoom: 0,
                    maxZoom: this.levels,
                    center: [0.0, 0.0],
                    zoom: 0
                    // projection: new ol.proj.Projection({
                    //     code: 'rect',
                    //     units: 'pixels',
                    //     extent: [0, 0, this.sizeX, this.sizeY],
                    // })
                }),
                logo: false
            });
        } else {
            this.viewer = new ol.Map({
                target: this.el,
                layers: [
                    new ol.layer.Tile({source: new ol.source.OSM()}),
                    new ol.layer.Tile({
                        source: new ol.source.XYZ({
                            tileSize: [this.tileWidth, this.tileHeight],
                            url: this._getTileUrl('{z}', '{x}', '{y}', {'encoding': 'PNG'}),
                            crossOrigin: 'use-credentials',
                            maxZoom: this.levels,
                            wrapX: true
                        }),
                        preload: 1
                    })
                ],
                view: new ol.View({
                    minZoom: 0,
                    maxZoom: this.levels
                }),
                logo: false
            });
            this.viewer.getView().fit([this.bounds.xmin, this.bounds.ymin, this.bounds.xmax, this.bounds.ymax], {constrainResolution: false});
        }
        this.trigger('g:imageRendered', this);
        return this;
    },

    destroy: function () {
        if (this.viewer) {
            this.viewer.setTarget(null);
            this.viewer = null;
        }
        this.deleted = true;
        // TODO: delete CSS
        ImageViewerWidget.prototype.destroy.call(this);
    }
});

export default OpenlayersImageViewerWidget;
