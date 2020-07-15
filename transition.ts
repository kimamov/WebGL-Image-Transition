class Transition {
    private canvasRef: HTMLCanvasElement;
    private gl: WebGLRenderingContext;

    private imageArray: any[];
    private imageDataArray: HTMLImageElement[] | null = null;

    private renderLoop: number | null = null;
    private shaderProgram: WebGLProgram | null = null;
    private textures: WebGLTexture[] = []
    // uniforms that can be update inside render
    private uResolutionLocation: any;
    private uImage0Location: any;
    private uImage1Location: any;

    private frag: string = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_tex;
        uniform sampler2D u_image0;
        uniform sampler2D u_image1;
        
        void main() {
            vec4 color0 = texture2D(u_image0, v_texCoord);
            vec4 color1 = texture2D(u_image1, v_texCoord);
            gl_FragColor = mix(color0, color1, 0.1);
        }
    
    `

    private vert: string = `
        precision mediump float;
        attribute vec4 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;

        void main() {
            gl_Position = a_position;
            //v_texCoord = a_texCoord * .5 + .5;  // because we know we're using a -1 + 1 quad
            v_texCoord=(a_texCoord * vec2(1.0, -1.0)* .5 + .5);
        }
    `

    constructor(canvasIndex: string, imageOne: any, imageTwo: any, displacementImage: any) {
        if (!canvasIndex) {
            throw new TypeError('id of canvas element is required');
        }
        if (!displacementImage) {
            console.warn('no displacement image provided. Default image will be used but consider adding one for better effects');
        }
        if (!imageOne || !imageTwo) {
            throw new TypeError('2 images to transition between are required');
        }
        this.canvasRef = document.getElementById(canvasIndex) as HTMLCanvasElement;
        if (!this.canvasRef) {
            throw new TypeError('could not find a valid canvas element with your provided canvas index')
        }
        this.gl = this.canvasRef.getContext('webgl') as WebGLRenderingContext;
        if (!this.gl) {
            throw new TypeError('could not find a valid WebGL Rendering Context')
        }

        this.imageArray = [imageOne, imageTwo];
        this.create();
    }

    private loadImages(): Promise<HTMLImageElement[]> {
        return new Promise((resolve, reject) => {
            let imageCreatedCount = 0;
            let imageOutput: HTMLImageElement[] = [];
            this.imageArray.forEach((element, index) => {
                console.log(`imageIndex: ${index}`)
                let image = new Image();
                image.src = element;
                image.onload = () => {
                    document.body.appendChild(image);
                    //imageOutput.push((image))
                    imageOutput[index] = image;
                    imageCreatedCount++;
                    if (imageCreatedCount === this.imageArray.length) {
                        resolve(imageOutput)
                    }
                }
                image.onerror = () => reject('could not load image')
            })
        })

    }



    private setCanvasDim() {
        this.canvasRef.width = this.canvasRef.clientWidth;
        this.canvasRef.height = this.canvasRef.clientHeight;
    }

    private async create() {
        try {
            /* set renderer dimensions */
            this.setCanvasDim();
            this.imageDataArray = await this.loadImages();
            this.shaderProgram = this.createShaderProgram(this.gl, this.vert, this.frag);
            this.createRenderer(this.imageDataArray);
        } catch (error) {
            console.dir(error)
        }

    }




    private createRenderer(images: any) {
        if (!this.gl || !this.shaderProgram) throw new Error('failed');
        if (images.length < 2) throw new Error('at least 2 images are required');
        // get attribute locations
        let positionLocation = this.gl.getAttribLocation(this.shaderProgram, "a_position");
        let texCoordLocation = this.gl.getAttribLocation(this.shaderProgram, 'a_texCoord');
        // Create a buffer to put three 2d clip space points in 
        let positionBuffer = this.gl.createBuffer();
        // bind position buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        const fullScreenBuffer = new Float32Array([
            -1, -1, // tri 1
            1, -1,
            -1, 1,
            -1, 1, // tri 2
            1, -1,
            1, 1,
        ]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, fullScreenBuffer, this.gl.STATIC_DRAW);
        // Create a buffer to put three 2d clip space points in 
        let textureBuffer = this.gl.createBuffer();
        // bind texture buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, fullScreenBuffer, this.gl.STATIC_DRAW);

        // create texture for every image in images array
        this.textures = [];
        for (let i = 0; i < images.length; ++i) {
            let texture: WebGLTexture | null = this.gl.createTexture();
            if (!texture) throw new Error('failed to create texture')
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

            // Set the parameters so we can render any size image.
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

            // Upload the image into the texture.
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, images[i]);

            // add the texture to the array of textures.
            this.textures.push(texture);
        }



        // look up resolution uniform location
        this.uResolutionLocation = this.gl.getUniformLocation(this.shaderProgram, "u_resolution");

        // lookup the sampler locations.
        this.uImage0Location = this.gl.getUniformLocation(this.shaderProgram, "u_image0");
        this.uImage1Location = this.gl.getUniformLocation(this.shaderProgram, "u_image1");

        this.gl.viewport(0, 0, this.canvasRef.width, this.canvasRef.height);
        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.shaderProgram);


        // Turn on the texturecoord attribute
        this.gl.enableVertexAttribArray(positionLocation);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer)
        // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        let size = 2; // 2 components per iteration
        let type = this.gl.FLOAT; // the data is 32bit floats
        let normalize = false; // don't normalize the data
        let stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
        let offset = 0; // start at the beginning of the buffer
        this.gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);


        // Turn on the texturecoord attribute
        this.gl.enableVertexAttribArray(texCoordLocation);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureBuffer)

        this.gl.vertexAttribPointer(texCoordLocation, size, type, normalize, stride, offset);


        // set resolution
        this.gl.uniform2fv(this.uResolutionLocation, [this.canvasRef.clientWidth, this.canvasRef.clientHeight]);

        // set which texture units to render with.
        this.gl.uniform1i(this.uImage0Location, 0);  // texture unit 0
        this.gl.uniform1i(this.uImage1Location, 1);  // texture unit 1
        // Set each texture unit to use a particular texture.
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[1]);

        window.onresize = () => {
            if (this.gl) {
                this.setCanvasDim()

                /* recover orbs that might be off screen */

                this.gl.uniform2fv(this.uResolutionLocation, [this.canvasRef.clientWidth, this.canvasRef.clientHeight]);
                this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
            }

        }
        this.gl.useProgram(this.shaderProgram);

    }

    private render = () => {
        this.gl.useProgram(this.shaderProgram);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.renderLoop = requestAnimationFrame(() => this.render());
    }

    public start() {
        this.render();
    }

    public destroy = () => {
        if (this.gl) {
            if (this.renderLoop) cancelAnimationFrame(this.renderLoop);
            this.gl.deleteProgram(this.shaderProgram);
        }
    }

    private createShaderProgram = (gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram | null => {

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

        const program = this.createProgram(gl, vertexShader, fragmentShader);

        return program
    }


    private createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader => {
        const shader = gl.createShader(type);
        if (!shader) throw 'could not create shader';
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const succes = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (succes) {
            return shader;
        }
        const info = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader);
        throw `could not compile shader: ${info}`
    }

    private createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
        const program = gl.createProgram();
        if (!program) throw 'could not create program';
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw `could not compile shader: ${info}`
    }


}


