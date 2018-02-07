#!/usr/bin/env python
# -*- coding: utf-8 -*-

#############################################################################
#  Copyright Kitware Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#############################################################################

import os
import PIL.Image
import PIL.ImageChops
import six
import json

from girder import config
from tests import base

from . import common


# boiler plate to start and stop the server

os.environ['GIRDER_PORT'] = os.environ.get('GIRDER_TEST_PORT', '20200')
config.loadConfig()  # Must reload config to pickup correct port


def setUpModule():
    base.enabledPlugins.append('large_image')
    base.startServer(False)


def tearDownModule():
    base.stopServer()


class LargeImageSourceMapnikTest(common.LargeImageCommonTest):

    def testTileFromGeotiffs(self):
        file = self._uploadFile(os.path.join(
            os.path.dirname(__file__), 'test_files', 'rgb_geotiff.tiff'))

        itemId = str(file['itemId'])
        # Get the metadata in pixel space
        resp = self.request(path='/item/%s/tiles' % itemId, user=self.admin)
        self.assertStatusOk(resp)
        tileMetadata = resp.json
        self.assertEqual(tileMetadata['tileWidth'], 256)
        self.assertEqual(tileMetadata['tileHeight'], 256)
        self.assertEqual(tileMetadata['sizeX'], 256)
        self.assertEqual(tileMetadata['sizeY'], 256)
        self.assertEqual(tileMetadata['levels'], 1)
        self.assertEqual(tileMetadata['bounds']['xmax'], 597915.0)
        self.assertEqual(tileMetadata['bounds']['xmin'], 367185.0)
        self.assertEqual(tileMetadata['bounds']['ymax'], 3788115.0)
        self.assertEqual(tileMetadata['bounds']['ymin'], 3552885.0)
        self.assertEqual(tileMetadata['bounds']['srs'],
                         '+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs ')
        self.assertTrue(tileMetadata['geospatial'])
        # Check that we read some band data, too
        self.assertEqual(len(tileMetadata['bands']), 3)
        self.assertEqual(tileMetadata['bands']['2']['interpretation'], 'green')
        self.assertEqual(tileMetadata['bands']['2']['max'], 212.0)
        self.assertEqual(tileMetadata['bands']['2']['min'], 0.0)

        # Getting the metadata with a specified projection will be different
        resp = self.request(path='/item/%s/tiles' % itemId, user=self.admin,
                            params={'projection': 'EPSG:3857'})
        self.assertStatusOk(resp)
        tileMetadata = resp.json

        self.assertEqual(tileMetadata['tileWidth'], 256)
        self.assertEqual(tileMetadata['tileHeight'], 256)
        self.assertEqual(tileMetadata['sizeX'], 65536)
        self.assertEqual(tileMetadata['sizeY'], 65536)
        self.assertEqual(tileMetadata['levels'], 9)
        self.assertAlmostEqual(tileMetadata['bounds']['xmax'], -12906033, places=0)
        self.assertAlmostEqual(tileMetadata['bounds']['xmin'], -13184900, places=0)
        self.assertAlmostEqual(tileMetadata['bounds']['ymax'], 4059661, places=0)
        self.assertAlmostEqual(tileMetadata['bounds']['ymin'], 3777034, places=0)
        self.assertEqual(tileMetadata['bounds']['srs'], '+init=epsg:3857')
        self.assertTrue(tileMetadata['geospatial'])

        resp = self.request(
            path='/item/%s/tiles/zxy/9/89/207' % itemId, user=self.admin,
            isJson=False, params={'encoding': 'PNG', 'projection': 'EPSG:3857'})

        self.assertStatusOk(resp)
        image = PIL.Image.open(six.BytesIO(self.getBody(resp, text=False)))
        testImage = os.path.join(
            os.path.dirname(__file__), 'test_files', 'geotiff_9_89_207.png')

        testImagePy3 = os.path.join(
            os.path.dirname(__file__), 'test_files', 'geotiff_9_89_207_py3.png')

        testImage = PIL.Image.open(testImage)
        testImagePy3 = PIL.Image.open(testImagePy3)

        # https://stackoverflow.com/questions/35176639/compare-images-python-pil
        diffs = [
            PIL.ImageChops.difference(image, testImage).getbbox(),
            PIL.ImageChops.difference(image, testImagePy3).getbbox()
        ]

        # If one of the diffs is None (means the images are same)
        self.assertIn(None, diffs)

    def testTileStyleFromGeotiffs(self):
        file = self._uploadFile(os.path.join(
            os.path.dirname(__file__), 'test_files', 'rgb_geotiff.tiff'))

        style = json.dumps({'band': 1, 'min': 0, 'max': 100,
                            'palette': 'matplotlib.Plasma_6'})

        itemId = str(file['itemId'])
        resp = self.request(
            path='/item/%s/tiles/zxy/7/22/51' % itemId, user=self.admin,
            isJson=False, params={'encoding': 'PNG', 'projection': 'EPSG:3857',
                                  'style': style})

        self.assertStatusOk(resp)
        image = PIL.Image.open(six.BytesIO(self.getBody(resp, text=False)))
        testImage = os.path.join(
            os.path.dirname(__file__), 'test_files', 'geotiff_style_7_22_51.png')

        testImagePy3 = os.path.join(
            os.path.dirname(__file__), 'test_files', 'geotiff_style_7_22_51_py3.png')

        testImage = PIL.Image.open(testImage)
        testImagePy3 = PIL.Image.open(testImagePy3)

        diffs = [
            PIL.ImageChops.difference(image, testImage).getbbox(),
            PIL.ImageChops.difference(image, testImagePy3).getbbox()
        ]

        self.assertIn(None, diffs)

    def _assertStyleResponse(self, itemId, style, message):
        style = json.dumps(style)
        resp = self.request(
            path='/item/%s/tiles/zxy/7/22/51' % itemId, user=self.admin,
            isJson=False, params={'encoding': 'PNG', 'projection': 'EPSG:3857',
                                  'style': style})

        body = resp.body[0]
        if isinstance(body, six.binary_type):
            body = body.decode('utf8')
        self.assertEquals(json.loads(body)['message'], message)

    def testTileStyleBadInput(self):
        file = self._uploadFile(os.path.join(
            os.path.dirname(__file__), 'test_files', 'rgb_geotiff.tiff'))

        itemId = str(file['itemId'])

        self._assertStyleResponse(itemId, {
            'band': 1.0,
            'min': 0,
            'max': 100,
            'palette': 'matplotlib.Plasma_6'
        }, 'Band has to be an integer.')

        self._assertStyleResponse(itemId, {
            'band': 1,
            'min': 'min',
            'max': 100,
            'palette': 'matplotlib.Plasma_6'
        }, 'Minimum and maximum values should be numbers.')

        self._assertStyleResponse(itemId, {
            'band': 1,
            'min': 0,
            'max': 'max',
            'palette': 'matplotlib.Plasma_6'
        }, 'Minimum and maximum values should be numbers.')

        self._assertStyleResponse(itemId, {
            'band': 1,
            'min': 0,
            'max': 100,
            'palette': 'nonexistent.palette'
        }, 'Palette is not a valid palettable path.')

        self._assertStyleResponse(itemId, ['style'],
                                  'Style is not a valid json object.')

    def testThumbnailFromGeotiffs(self):
        file = self._uploadFile(os.path.join(
            os.path.dirname(__file__), 'test_files', 'rgb_geotiff.tiff'))
        itemId = str(file['itemId'])
        # We get a thumbnail without a projection
        resp = self.request(
            path='/item/%s/tiles/thumbnail' % itemId, user=self.admin,
            isJson=False, params={'encoding': 'PNG'})
        self.assertStatusOk(resp)
        image = self.getBody(resp, text=False)
        self.assertEqual(image[:len(common.PNGHeader)], common.PNGHeader)
        # We get a different thumbnail with a projection
        resp = self.request(
            path='/item/%s/tiles/thumbnail' % itemId, user=self.admin,
            isJson=False, params={'encoding': 'PNG', 'projection': 'EPSG:3857'})
        self.assertStatusOk(resp)
        image2 = self.getBody(resp, text=False)
        self.assertEqual(image2[:len(common.PNGHeader)], common.PNGHeader)
        self.assertNotEqual(image, image2)
