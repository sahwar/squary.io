(function(globals){
    'use strict';
    /* jshint unused: vars */
    /* global window */
    /* global Deps */
    /* global $ */
    /* global _ */

    // Board Class
    globals.Pixelboard = function (_boardId, _ownerId) {

        this.boardId = _boardId;
        this.ownerId = _ownerId;
        this.defaultColorPixel = '#CCC';
        this.isMouseDown = 0;
        this.pixelSize = 30;
        this.canvas = null;
        this.ctx = null;
        this.ctxLayer = null;
        this.w = null;
        this.h = null;
        this.colorPicker = $('#picker');
        this.colorSaver = $('#save-color');
        this.actionsType = [
            'addPixel',
            'removePixel',
            'updatePixel'
        ];

        this.history = new History();
        this.toolActiveClass = 'tool-selected';
        this.tools = {
            active: 'brush',
            brush: {},
            activate: function(tool) {
                $(self.tools.list[tool].dom).addClass(self.toolActiveClass);
            },
            desactivate: function(tool) {
                $(self.tools.list[tool].dom).removeClass(self.toolActiveClass);
            },
            list: {
                brush: {
                    dom: $('.tool-brush')
                },
                eraser: {
                    dom: $('.tool-eraser')
                },
                pipette: {
                    dom: $('.tool-pipette'),
                    activate: function() { // Specific activate action for this tool
                        self.layer.style.cursor = 'crosshair';
                    },
                    desactivate: function() { // Specific desactive action for this tool
                        self.layer.style.cursor = 'default';
                    }
                }
            }
        };
        var self = this;

        // Set up the canvas element
        this.setup = function () {
            this.setColorForPicker(randomColor());

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

            console.log('Opening pixel board ' + self.boardId);

            self.setupEvents();
            self.startUpdateListener();
        };

        // Tools
        this.getTool = function(toolName) {
            return self.tools.list[toolName];
        };

        this.setCurrentTool = function(toolName) {
            if (self.tools.list[toolName] && self.tools.active != toolName) {
                // Global activate and desactive for all tools
                self.tools.activate(toolName);
                self.tools.desactivate(self.tools.active);

                // Specific desactivate and activate actions
                if (typeof self.tools.list[self.tools.active].desactivate === 'function') {
                    self.tools.list[self.tools.active].desactivate();
                }
                if (typeof self.tools.list[toolName].activate === 'function') {
                    self.tools.list[toolName].activate();
                }

                self.tools.active = toolName;
            }
        };

        this.isCurrentTool = function(toolName) {
            return self.tools.active === toolName;
        };

        this.toggleTool = function(toolName) {
            if (self.isCurrentTool(toolName)) {
                self.setCurrentTool('brush');
            } else {
                self.setCurrentTool(toolName);
            }
        };

        this.setColorForPicker = function(color) {
            self.colorPicker.spectrum("set", color);
            self.colorPicker.spectrum("option", "move")(self.colorPicker.spectrum("get"));
            self.colorSaver.css('background-color', color);
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
            $('.tool').on('click', function(event) {
                var tool = event.target.dataset.tool;
                if (tool) {
                    self.setCurrentTool(tool);
                }
            });
            $('.tool-color').on('click', function() {
                self.setCurrentTool('brush');
            });

            // Keyboards event
            Mousetrap.bind(['mod+z'], function(e) {
                e.preventDefault();
                self.executeAction(self.history.undo(), true);
            });

            Mousetrap.bind(['mod+shift+z', 'mod+y'], function(e) {
                e.preventDefault();
                self.executeAction(self.history.redo());
            });

            Mousetrap.bind(['b'], function(e) {
                e.preventDefault();
                self.setCurrentTool('brush');
            });
            Mousetrap.bind(['e'], function(e) {
                e.preventDefault();
                self.toggleTool('eraser');
            });
            Mousetrap.bind(['i'], function(e) {
                e.preventDefault();
                self.toggleTool('pipette');
            });
        };

        this.getOppositeAction = function(action) {
            // TODO Check if action is in array of actions
            var oppositeAction = null;
            switch (action) {
                case 'addPixel':
                    oppositeAction = self.actionsType[1];
                    break;
                case 'removePixel':
                    oppositeAction = self.actionsType[0];
                    break;
                case 'updatePixel':
                    oppositeAction = self.actionsType[2];
                    break;
            }
            return oppositeAction;
        };

        this.executeAction = function(action, opposite) {
            if (!action) {
                return;
            }

            var actionType = action.action;
            if (opposite) {
                actionType = self.getOppositeAction(action.action);
            }

            // TODO Check if action is in array of actions
            if (actionType) {
                switch (actionType) {
                    case 'addPixel':
                        self.drawPixelAt(action.object.x, action.object.y, action.object.color, false);
                        break;
                    case 'removePixel':
                        self.removePixelAt(action.object.x, action.object.y, false);
                        break;
                    case 'updatePixel':
                        self.drawPixelAt(action.object.x, action.object.y, action.object.color, false);
                        break;
                }
            }
        };

        this.clickEvent = function(mouseBtn, gx, gy) {
            if (self.isMouseDown === 1) { // Mouse left
                if (self.isCurrentTool('pipette')) {
                    self.pickColor(gx, gy);
                } else if (self.isCurrentTool('eraser')) {
                    self.removePixelAt(gx, gy, true);
                } else {
                    self.drawPixelAt(gx, gy, self.colorPicker.spectrum("get").toHexString(), true);
                }
            } else if(self.isMouseDown === 3) { // Mouse right
                self.removePixelAt(gx, gy, true);
            }
        };

        this.pickColor = function(x, y) {
            var pixel = PixelsCollection.findOne({x:x, y:y, boardId: self.boardId});
            if (pixel) {
                this.setColorForPicker(pixel.color);
            } else {
                this.setColorForPicker(self.defaultColorPixel);
            }
            self.setCurrentTool('brush');
        };

        this.drawPixelAt = function(x, y, color, addToHistory) {
            if (!self.isCurrentTool('brush')) {
                return;
            }

            addToHistory = typeof addToHistory !== 'undefined' ?  addToHistory : true;

            var pixel = PixelsCollection.findOne({x:x, y:y, boardId: self.boardId});
            if (pixel && pixel.color === color) {
                return;
            }

            var colorHistory = pixel ? pixel.color : color;
            var actionType = pixel ? self.actionsType[2] : self.actionsType[0];

            if (addToHistory) {
                self.history.add(
                    actionType,
                    {x: x, y: y, color: colorHistory, boardId: self.boardId}
                );
            }

            Meteor.call('addPixel', {x:x, y:y, color:color, boardId: self.boardId, ownerId: self.ownerId}, function(error, result) {
                if (error) {
                    Session.set('toast', {
                        type: "warning",
                        title: "Can't draw",
                        msg: "This board is not yours."
                    });
                }
            });
        };

        this.removePixelAt = function(x, y, addToHistory) {
            var pixel = PixelsCollection.findOne({x:x, y:y, boardId: self.boardId});
            if (!pixel) {
                return;
            }

            Meteor.call('removePixel', {x:x, y:y, boardId: self.boardId, ownerId: self.ownerId}, function(error, result) {
                if (error) {
                    Session.set('message', error);
                } else if (addToHistory) {
                    self.history.add(
                        self.actionsType[1],
                        {x: x, y:y, boardId: self.boardId, color: pixel.color}
                    );
                }
            });
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

                // Reset canvas display
                self.ctx.fillStyle = self.defaultColorPixel;
                self.ctx.fillRect(0, 0, self.ctx.canvas.width, self.ctx.canvas.height);

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
