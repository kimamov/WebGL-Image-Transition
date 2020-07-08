var Transition = /** @class */ (function () {
    function Transition(canvasIndex, imageOne, imageTwo, displacementImage) {
        var _this = this;
        this.shaderProgram = null;
        this.renderLoop = null;
        this.frag = "\n    precision mediump float;\n    uniform float u_time;\n    uniform vec2 u_resolution;\n    float aspectRatio=u_resolution.x / u_resolution.y;\n    \n    void main() {\n        vec2 uv=gl_FragCoord.xy / u_resolution;\n        \n        gl_FragColor = vec4(1.0, 0.3, 0, 1.0);\n    }\n    ";
        this.vert = "\n    precision mediump float;\n    attribute vec4 a_position;\n    void main() {\n        gl_Position = a_position;\n    }\n    ";
        this.render = function () {
            if (_this.gl && _this.shaderProgram) {
                var positionLocation = _this.gl.getAttribLocation(_this.shaderProgram, "a_position");
                // Create a buffer to put three 2d clip space points in 
                var positionBuffer = _this.gl.createBuffer();
                _this.gl.bindBuffer(_this.gl.ARRAY_BUFFER, positionBuffer);
                _this.gl.bufferData(_this.gl.ARRAY_BUFFER, new Float32Array([
                    -1, -1,
                    1, -1,
                    -1, 1,
                    -1, 1,
                    1, -1,
                    1, 1,
                ]), _this.gl.STATIC_DRAW);
                // Tell it to use our program (pair of shaders)
                _this.gl.useProgram(_this.shaderProgram);
                // look up resolution uniform location
                var uResolutionLocation_1 = _this.gl.getUniformLocation(_this.shaderProgram, "u_resolution");
                var uTimeLocation_1 = _this.gl.getUniformLocation(_this.shaderProgram, "u_time");
                // set resolution
                _this.gl.uniform2fv(uResolutionLocation_1, [_this.canvasRef.clientWidth, _this.canvasRef.clientHeight]);
                // Turn on the position attribute
                _this.gl.enableVertexAttribArray(positionLocation);
                // Bind the position buffer.
                _this.gl.bindBuffer(_this.gl.ARRAY_BUFFER, positionBuffer);
                // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
                var size = 2; // 2 components per iteration
                var type = _this.gl.FLOAT; // the data is 32bit floats
                var normalize = false; // don't normalize the data
                var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
                var offset = 0; // start at the beginning of the buffer
                _this.gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);
                _this.gl.viewport(0, 0, _this.canvasRef.width, _this.canvasRef.height);
                // Clear the canvas
                _this.gl.clearColor(0, 0, 0, 0);
                _this.gl.clear(_this.gl.COLOR_BUFFER_BIT);
                window.onresize = function () {
                    if (_this.gl) {
                        _this.setCanvasDim();
                        /* recover orbs that might be off screen */
                        _this.gl.uniform2fv(uResolutionLocation_1, [_this.canvasRef.clientWidth, _this.canvasRef.clientHeight]);
                        _this.gl.viewport(0, 0, _this.gl.drawingBufferWidth, _this.gl.drawingBufferHeight);
                    }
                };
                var startTime_1 = Date.now();
                var lastRenderTime = startTime_1;
                var currentRenderTime_1 = 0;
                var deltaTime = 0;
                var drawLoop_1 = function (gl) {
                    currentRenderTime_1 = Date.now();
                    //deltaTime=currentRenderTime-lastRenderTime;
                    _this.gl.uniform1f(uTimeLocation_1, currentRenderTime_1 - startTime_1);
                    // Draw the rectangle.
                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                    _this.renderLoop = requestAnimationFrame(function () { return drawLoop_1(gl); });
                };
                drawLoop_1(_this.gl);
            }
        };
        this.destroy = function () {
            if (_this.gl) {
                cancelAnimationFrame(_this.renderLoop);
                _this.gl.deleteProgram(_this.shaderProgram);
            }
        };
        this.createShaderProgram = function (gl, vertexShaderSource, fragmentShaderSource) {
            var vertexShader = _this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            var fragmentShader = _this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
            var program = _this.createProgram(gl, vertexShader, fragmentShader);
            return program;
        };
        this.createShader = function (gl, type, source) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            var succes = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (succes) {
                return shader;
            }
            gl.deleteShader(shader);
            throw "could not compile shader: " + gl.getShaderInfoLog(shader);
        };
        this.createProgram = function (gl, vertexShader, fragmentShader) {
            var program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            var success = gl.getProgramParameter(program, gl.LINK_STATUS);
            if (success) {
                return program;
            }
            gl.deleteProgram(program);
            throw "could not compile shader: " + gl.getProgramInfoLog(program);
        };
        this.canvasRef = document.getElementById(canvasIndex);
        if (!this.canvasRef) {
            throw new TypeError('could not find a valid canvas element with your provided canvas index');
        }
        this.gl = this.canvasRef.getContext('webgl');
        this.create();
    }
    Transition.prototype.setCanvasDim = function () {
        this.canvasRef.width = this.canvasRef.clientWidth;
        this.canvasRef.height = this.canvasRef.clientHeight;
    };
    Transition.prototype.create = function () {
        if (this.canvasRef) {
            /* set renderer dimensions */
            this.setCanvasDim();
            this.shaderProgram = this.createShaderProgram(this.gl, this.vert, this.frag);
        }
        else
            console.log("no reference to the canvas was found");
    };
    return Transition;
}());
