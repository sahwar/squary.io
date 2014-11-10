(function(globals){
    'use strict';
    /* jshint unused: vars */
    /* global window */
    /* global Deps */
    /* global $ */
    /* global _ */
    /* global PixelsCollection */
    /* global PixelBoards:true */

    // Board Class
    globals.PixelBoards = function (_boardId) {
        this.boardId = _boardId;
        this.defaultColorPixel = '#CCC';
        this.isMouseDown = 0;
        this.pixelSize = 30;
        this.canvas = null;
        this.ctx = null;
        this.ctxLayer = null;
        this.w = null;
        this.h = null;
        this.colorPicker = $('.colorCanvasInput');
        var self = this;

        // Set up the canvas element
        this.setup = function () {
            self.colorPicker.css('background-color', randomColor());

            self.canvas = document.getElementById('canvasboard');
            self.layer  = document.getElementById('layer');

            self.ctx = self.canvas.getContext('2d');
            self.ctxLayer = layer.getContext('2d');

            self.ctx.canvas.width  = self.ctxLayer.canvas.width = window.innerWidth;
            self.ctx.canvas.height = self.ctxLayer.canvas.height = window.innerHeight;

            self.ctx.scale(1, 1);
            self.ctxLayer.scale(1, 1);

            // how many cells fit on the canvas
            self.w = Math.round(self.canvas.width / self.pixelSize);
            self.h = Math.round(self.canvas.height / self.pixelSize);

            console.log('Opening pixel board '+self.boardId);

            self.setupEvents();
            self.startUpdateListener();
        };

        // Events
        this.setupEvents = function () {
            var onMouseMove = function(e) {
                var positions = self.getPixelIndexes(e);

                if (positions) {
                    var gx = positions[0];
                    var gy = positions[1];

                    self.ctxLayer.clearRect(0, 0, self.ctxLayer.canvas.width, self.ctxLayer.canvas.height);
                    self.ctxLayer.fillStyle = '#FFF';
                    self.ctxLayer.fillRect(gx*self.pixelSize, gy*self.pixelSize, self.pixelSize, self.pixelSize);

                    self.clickEvent(e.which, gx, gy);
                }
            };

            var onMouseDown = function(e) {
                self.isMouseDown = e.which;
                var positions = self.getPixelIndexes(e);

                if (positions) {
                    var gx = positions[0];
                    var gy = positions[1];

                   self.clickEvent(e.which, gx, gy);
                }
            };

            var onMouseUp = function(e) {
                self.isMouseDown = 0;
            };

            $(document).on('contextmenu', function(e) {
                return false;
            });

            // Touch events
            self.layer.addEventListener('touchstart', function(e) {
                e.preventDefault();
                var touch = e.touches[0];
                touch.which = 1;
                onMouseDown(touch);
            }, false);

            self.layer.addEventListener('touchmove', function(e) {
                e.preventDefault();
                var touch = e.touches[0];
                touch.which = 1;
                onMouseMove(touch);
            }, false);

            self.layer.addEventListener('touchend', function(e) {
                e.preventDefault();
                var touch = e.touches[0];
                touch.which = 0;
                onMouseMove(touch);
            }, false);

            // Mouse events
            $(self.layer).mousemove(onMouseMove);
            $(self.layer).mousedown(onMouseDown);
            $(self.layer).mouseup(onMouseUp);
        };

        this.clickEvent = function(mouseBtn, gx, gy) {
            var pixel = PixelsCollection.findOne({x: gx, y: gy, boardId: self.boardId});

            if (self.isMouseDown == 1) { // Mouse left
                var colorPixel = self.colorPicker.css('background-color');
                self.drawPixelAt(pixel, gx, gy, colorPixel);

            } else if(self.isMouseDown == 3) { // Mouse right
                if (pixel) {
                    self.removePixelAt(pixel, gx, gy);
                }
            }
        };

        this.drawPixelAt = function(pixel, x, y, color) {
            if (pixel) {
                PixelsCollection.update(
                pixel._id,
                {$set: {color : color}}
                );
            } else {
                PixelsCollection.insert({x: x, y: y, color: color, boardId: self.boardId});
            }
        };

        this.removePixelAt = function(pixel, x, y) {
            PixelsCollection.update(
                pixel._id,
                {$set: {color : self.defaultColorPixel}}
            );
        };

        this.getPixelIndexes = function(e) {
            // get mouse click position
            var mx = e.pageX;
            var my = e.pageY;

            // calculate grid square numbers
            var gx = ~~ (mx / self.pixelSize);
            var gy = ~~ (my / self.pixelSize);

            // make sure we're in bounds
            if (gx < 0 || gx >= self.w || gy < 0 || gy >= self.h) {
                return;
            }

            return [gx, gy];
        };

        // Set up listeners for the draw method
        this.startUpdateListener = function () {
            // Each time we interact with PixelsCollection this method is call
            Deps.autorun(function ()
            {
                var pixels = PixelsCollection.find({boardId: self.boardId});

                _.each(pixels.fetch(), function(pixel) {
                    self.draw(pixel);
                });
            });
        };

        this.draw = function (pixel) {
            self.ctx.fillStyle = pixel.color;
            self.ctx.fillRect(pixel.x * self.pixelSize, pixel.y * self.pixelSize, self.pixelSize, self.pixelSize);
        };
    };
}(this));