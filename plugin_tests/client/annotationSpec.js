/* globals girder, girderTest, describe, it, expect, waitsFor, runs */

girderTest.addScripts([
    '/clients/web/static/built/plugins/jobs/plugin.min.js',
    '/clients/web/static/built/plugins/worker/plugin.min.js',
    '/clients/web/static/built/plugins/large_image/plugin.min.js'
]);

describe('Annotations', function () {
    /**
     * Compute the l_inf distance from a to b.
     */
    function dist(a, b) {
        var i, max = 0, dx, dy;
        if (a.length !== b.length) {
            return Number.POSITIVE_INFINITY;
        }
        for (i = 0; i < a.length; i += 1) {
            dx = a[i][0] - b[i][0];
            dy = a[i][1] - b[i][1];
            max = Math.max(max, dx * dx + dy * dy);
        }
        return Math.sqrt(max);
    }

    function expectClose(a, b, eps) {
        eps = eps || 1e-6;
        var d = dist(a, b);
        if (!(d >= 0) && !(d <= 0)) {
            throw new Error(
                'Vector is invalid'
            );
        }
        if (d >= eps) {
            throw new Error(
                'Vectors are not equal'
            );
        }
    }

    var largeImage;
    beforeEach(function () {
        largeImage = girder.plugins.large_image;
    });
    describe('geometry', function () {
        it('rectangle', function () {
            var obj = largeImage.annotations.geometry.rectangle({
                type: 'rectangle',
                id: 'a',
                center: [10, 20, 0],
                width: 5,
                height: 10,
                rotation: 0
            });

            expect(obj.type).toBe('Polygon');
            expect(obj.coordinates.length).toBe(1);
            expectClose(
                obj.coordinates[0], [
                    [7.5, 15], [12.5, 15], [12.5, 25], [7.5, 25], [7.5, 15]
                ]
            );

            obj = largeImage.annotations.geometry.rectangle({
                type: 'rectangle',
                id: 'a',
                center: [10, 10, 0],
                width: Math.sqrt(2),
                height: Math.sqrt(2),
                rotation: Math.PI / 4
            });

            expect(obj.type).toBe('Polygon');
            expect(obj.coordinates.length).toBe(1);
            expectClose(
                obj.coordinates[0], [
                    [10, 9], [11, 10], [10, 11], [9, 10], [10, 9]
                ]
            );
        });

        it('open polyline', function () {
            var obj = largeImage.annotations.geometry.polyline({
                type: 'polyline',
                id: 'a',
                points: [
                    [0, 1, 0],
                    [1, 0, 0]
                ],
                closed: false
            });

            expect(obj.type).toBe('LineString');
            expect(obj.coordinates.length).toBe(2);
            expectClose(
                obj.coordinates, [
                    [0, 1], [1, 0]
                ]
            );
        });

        it('closed polyline', function () {
            var obj = largeImage.annotations.geometry.polyline({
                type: 'polyline',
                id: 'a',
                points: [
                    [0, 1, 0],
                    [1, 0, 0],
                    [1, 1, 0]
                ],
                closed: true
            });

            expect(obj.type).toBe('Polygon');
            expect(obj.coordinates.length).toBe(1);
            expect(obj.coordinates[0].length).toBe(4);
            expectClose(
                obj.coordinates[0], [
                    [0, 1], [1, 0], [1, 1], [0, 1]
                ]
            );
        });

        it('point', function () {
            var obj = largeImage.annotations.geometry.point({
                type: 'point',
                id: 'a',
                center: [1, 2, 0]
            });
            expect(obj.type).toBe('Point');
            expect(obj.coordinates).toEqual([1, 2]);
        });
    });

    describe('style', function () {
        it('color names', function () {
            var obj = largeImage.annotations.style({
                fillColor: 'red',
                lineColor: 'black'
            });
            expect(obj.fillColor).toBe('#ff0000');
            expect(obj.fillOpacity).toBe(1);
            expect(obj.strokeColor).toBe('#000000');
            expect(obj.strokeOpacity).toBe(1);
        });
        it('hex colors', function () {
            var obj = largeImage.annotations.style({
                fillColor: '#ff0000',
                lineColor: '#00ff00'
            });
            expect(obj.fillColor).toBe('#ff0000');
            expect(obj.fillOpacity).toBe(1);
            expect(obj.strokeColor).toBe('#00ff00');
            expect(obj.strokeOpacity).toBe(1);
        });
        it('rgba colors', function () {
            var obj = largeImage.annotations.style({
                fillColor: 'rgba(255,0,0,0.5)',
                lineColor: 'rgba(0,255,255,0.5)'
            });
            expect(obj.fillColor).toBe('#ff0000');
            expect(obj.fillOpacity).toBe(0.5);
            expect(obj.strokeColor).toBe('#00ffff');
            expect(obj.strokeOpacity).toBe(0.5);
        });
        it('line width, no colors', function () {
            var obj = largeImage.annotations.style({
                lineWidth: 2
            });
            expect(obj).toEqual({
                strokeWidth: 2
            });
        });
    });

    describe('convert', function () {
        it('rectangle', function () {
            var element = {
                type: 'rectangle',
                id: 'a',
                center: [10, 20, 0],
                width: 5,
                height: 10,
                rotation: 0
            };
            var obj = largeImage.annotations.convert([element]);
            var features = obj.features;

            expect(obj.type).toBe('FeatureCollection');
            expect(features.length).toBe(1);
            expect(features[0].id).toBe('a');

            var properties = features[0].properties;
            expect(properties.strokeWidth).toBe(2);
            expect(properties.fillColor).toBe('#000000');
            expect(properties.fillOpacity).toBe(0);
            expect(properties.strokeColor).toBe('#000000');
            expect(properties.strokeOpacity).toBe(1);
            expect(properties.element).toEqual(element);
        });

        it('polyline', function () {
            var element = {
                type: 'polyline',
                id: 'a',
                points: [
                    [0, 1, 0],
                    [1, 0, 0]
                ]
            };
            var obj = largeImage.annotations.convert([element]);
            var features = obj.features;

            expect(obj.type).toBe('FeatureCollection');
            expect(features.length).toBe(1);
            expect(features[0].id).toBe('a');

            var properties = features[0].properties;
            expect(properties.strokeWidth).toBe(2);
            expect(properties.fillColor).toBe('#000000');
            expect(properties.fillOpacity).toBe(0);
            expect(properties.strokeColor).toBe('#000000');
            expect(properties.strokeOpacity).toBe(1);
            expect(properties.element).toEqual(element);
        });
    });

    describe('CRUD', function () {
        var item, user, annotationId, annotation;

        it('setup', function () {
            girder.auth.login('admin', 'adminpassword!').done(function (resp) {
                user = resp;
            }).fail(function (resp) {
                console.error(resp);
            });
            waitsFor(function () {
                return user;
            }, 'admin to login');

            runs(function () {
                girder.rest.restRequest({
                    url: 'item?text=empty'
                }).done(function (l) {
                    expect(l.length).toBeGreaterThan(0);
                    item = l[0];
                });
            });
            waitsFor(function () {
                return item;
            }, 'Get an item id');
        });

        it('create a new annotation', function () {
            var model = new largeImage.models.AnnotationModel({itemId: item._id});
            var done;

            model.elements().add({
                center: [5, 5, 0],
                height: 1,
                rotation: 0,
                type: 'rectangle',
                width: 1
            });

            model.save().done(function (resp) {
                expect(model.id).toBeDefined();
                annotationId = model.id;
                expect(resp.annotation).toBeDefined();
                expect(resp.annotation.elements).toBeDefined();
                expect(resp.annotation.elements.length).toBe(1);
                done = true;
            }).fail(function (resp) {
                console.error(resp);
            });

            waitsFor(function () {
                return done;
            });
        });

        it('fetch an existing annotation', function () {
            var done;
            annotation = new largeImage.models.AnnotationModel({_id: annotationId});
            annotation.fetch().done(function () {
                expect(annotation.get('itemId')).toBeDefined();
                done = true;
            }).fail(function (resp) {
                console.error(resp);
            });
            waitsFor(function () {
                return done;
            }, 'fetch to complete');
        });

        it('update an existing annotation', function () {
            var done;
            var elements = annotation.elements();
            elements.add({
                center: [10, 10, 0],
                height: 2,
                rotation: 0,
                type: 'rectangle',
                width: 2,
                label: {}
            });

            annotation.save().done(function (resp) {
                expect(resp.annotation).toBeDefined();
                expect(resp.annotation.elements).toBeDefined();
                expect(resp.annotation.elements.length).toBe(2);
                done = true;
            }).fail(function (resp) {
                console.error(resp);
            });

            waitsFor(function () {
                return done;
            }, 'annotation to save');
        });

        it('destroy an existing annotation', function () {
            var done, consoleError = console.error;

            annotation.destroy().done(function () {
                done = true;
            }).fail(function (resp) {
                console.error(resp);
            });
            waitsFor(function () {
                return done;
            }, 'annotation to destroy');

            runs(function () {
                // silence rest request error message
                console.error = function () {};

                done = false;
                annotation = new largeImage.models.AnnotationModel({_id: annotationId});
                annotation.fetch().done(function () {
                    console.error = consoleError;
                    console.error('Expected fetch on deleted annotation to fail');
                }).fail(function () {
                    console.error = consoleError;
                    done = true;
                });
            });
            waitsFor(function () {
                return done;
            }, 'fetch to fail');
        });

        it('cannot save paged annotation', function () {
            var model = new largeImage.models.AnnotationModel({_id: annotationId});
            model._pageElements = true;
            expect(function () {
                model.save();
            }).toThrow();
        });

        it('cannot create an annotation without an itemId', function () {
            var model = new largeImage.models.AnnotationModel();
            expect(function () {
                model.save();
            }).toThrow();
        });
    });
});
