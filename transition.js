"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Transition {
    constructor(canvasIndex, imageOne, imageTwo, displacementImage) {
        this.imageDataArray = null;
        this.shaderProgram = null;
        this.renderLoop = null;
        this.frag = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_tex;
        uniform sampler2D u_image0;
        uniform sampler2D u_image1;
        
        void main() {
            vec4 color0 = texture2D(u_image0, v_texCoord);
            vec4 color1 = texture2D(u_image1, v_texCoord);
            gl_FragColor = mix(color0, color1, 0.4);
        }
    
    `;
        this.vert = `
        precision mediump float;
        attribute vec4 a_position;
        varying vec2 v_texCoord;

        void main() {
            gl_Position = a_position;
            v_texCoord = a_position.xy * .5 + .5;  // because we know we're using a -1 + 1 quad
        }
    `;
        this.createRenderer = (images) => {
            if (!this.gl || !this.shaderProgram)
                throw new Error('failed');
            if (images.length < 2)
                throw new Error('at least 2 images are required');
            let positionLocation = this.gl.getAttribLocation(this.shaderProgram, "a_position");
            // Create a buffer to put three 2d clip space points in 
            let positionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                -1, -1,
                1, -1,
                -1, 1,
                -1, 1,
                1, -1,
                1, 1,
            ]), this.gl.STATIC_DRAW);
            // Tell it to use our program (pair of shaders)
            this.gl.useProgram(this.shaderProgram);
            // look up resolution uniform location
            const uResolutionLocation = this.gl.getUniformLocation(this.shaderProgram, "u_resolution");
            const uTimeLocation = this.gl.getUniformLocation(this.shaderProgram, "u_time");
            // set resolution
            this.gl.uniform2fv(uResolutionLocation, [this.canvasRef.clientWidth, this.canvasRef.clientHeight]);
            // Turn on the position attribute
            this.gl.enableVertexAttribArray(positionLocation);
            // Bind the position buffer.
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            // create texture for every image in images array
            let textures = [];
            for (let i = 0; i < images.length; ++i) {
                let texture = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                // Set the parameters so we can render any size image.
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                // Upload the image into the texture.
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, images[i]);
                // add the texture to the array of textures.
                textures.push(texture);
            }
            // lookup the sampler locations.
            const u_image0Location = this.gl.getUniformLocation(this.shaderProgram, "u_image0");
            const u_image1Location = this.gl.getUniformLocation(this.shaderProgram, "u_image1");
            // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
            let size = 2; // 2 components per iteration
            let type = this.gl.FLOAT; // the data is 32bit floats
            let normalize = false; // don't normalize the data
            let stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
            let offset = 0; // start at the beginning of the buffer
            this.gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);
            this.gl.viewport(0, 0, this.canvasRef.width, this.canvasRef.height);
            // Clear the canvas
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            // set which texture units to render with.
            this.gl.uniform1i(u_image0Location, 0); // texture unit 0
            this.gl.uniform1i(u_image1Location, 1); // texture unit 1
            // Set each texture unit to use a particular texture.
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, textures[0]);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, textures[1]);
            window.onresize = () => {
                if (this.gl) {
                    this.setCanvasDim();
                    /* recover orbs that might be off screen */
                    this.gl.uniform2fv(uResolutionLocation, [this.canvasRef.clientWidth, this.canvasRef.clientHeight]);
                    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
                }
            };
            let startTime = Date.now();
            let lastRenderTime = startTime;
            let currentRenderTime = 0;
            let deltaTime = 0;
            const startRender = () => {
                currentRenderTime = Date.now();
                //deltaTime=currentRenderTime-lastRenderTime;
                this.gl.uniform1f(uTimeLocation, currentRenderTime - startTime);
                // Draw the rectangle.
                this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
                this.renderLoop = requestAnimationFrame(() => startRender());
            };
            return startRender;
        };
        this.render = () => {
            console.log("was called");
            console.log(this);
            if (this.renderer || true) {
                console.log("was called reached");
                this.renderer();
            }
        };
        this.destroy = () => {
            if (this.gl) {
                if (this.renderLoop)
                    cancelAnimationFrame(this.renderLoop);
                this.gl.deleteProgram(this.shaderProgram);
            }
        };
        this.createShaderProgram = (gl, vertexShaderSource, fragmentShaderSource) => {
            const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
            const program = this.createProgram(gl, vertexShader, fragmentShader);
            return program;
        };
        this.createShader = (gl, type, source) => {
            const shader = gl.createShader(type);
            if (!shader)
                throw 'could not create shader';
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            const succes = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (succes) {
                return shader;
            }
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw `could not compile shader: ${info}`;
        };
        this.createProgram = (gl, vertexShader, fragmentShader) => {
            const program = gl.createProgram();
            if (!program)
                throw 'could not create program';
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            const success = gl.getProgramParameter(program, gl.LINK_STATUS);
            if (success) {
                return program;
            }
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw `could not compile shader: ${info}`;
        };
        if (!canvasIndex) {
            throw new TypeError('id of canvas element is required');
        }
        if (!displacementImage) {
            console.warn('no displacement image provided. Default image will be used but consider adding one for better effects');
        }
        if (!imageOne || !imageTwo) {
            throw new TypeError('2 images to transition between are required');
        }
        this.canvasRef = document.getElementById(canvasIndex);
        if (!this.canvasRef) {
            throw new TypeError('could not find a valid canvas element with your provided canvas index');
        }
        this.gl = this.canvasRef.getContext('webgl');
        if (!this.gl) {
            throw new TypeError('could not find a valid WebGL Rendering Context');
        }
        this.imageArray = [imageOne, imageTwo];
        this.create();
    }
    loadImages() {
        return new Promise((resolve, reject) => {
            let imageCreatedCount = 0;
            let imageOutput = [];
            this.imageArray.forEach((element, index) => {
                console.log(`imageIndex: ${index}`);
                let image = new Image();
                image.src = element;
                image.onload = () => {
                    document.body.appendChild(image);
                    //imageOutput.push((image))
                    imageOutput[index] = image;
                    imageCreatedCount++;
                    if (imageCreatedCount === this.imageArray.length) {
                        resolve(imageOutput);
                    }
                };
                image.onerror = () => reject('could not load image');
            });
        });
    }
    setCanvasDim() {
        this.canvasRef.width = this.canvasRef.clientWidth;
        this.canvasRef.height = this.canvasRef.clientHeight;
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.canvasRef) {
                try {
                    /* set renderer dimensions */
                    this.setCanvasDim();
                    this.imageDataArray = yield this.loadImages();
                    this.shaderProgram = this.createShaderProgram(this.gl, this.vert, this.frag);
                    this.renderer = this.createRenderer(this.imageDataArray);
                }
                catch (error) {
                    //console.log('could not load image')
                    console.dir(error);
                    //throw error
                }
            }
            else
                console.log("no reference to the canvas was found");
        });
    }
}
