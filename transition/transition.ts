interface TransitionOptions {
    duration?: number

}
// todo add option to fit aspect ratio of image


class Transition {
    public container: HTMLElement;
    public canvasRef!: HTMLCanvasElement;
    private gl!: WebGLRenderingContext;

    private renderLoop: number | null = null;
    private shaderProgram: WebGLProgram | null = null;
    // uniforms that can be update inside render
    private uResolutionLocation: any;
    private uProgressLocation: any;

    transitionFinished: boolean = false;
    transitionActive: boolean = false;
    private transitionTick: number = 1000;
    private transitionProgress: number = 0;

    private frag: string = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_tex;
        uniform sampler2D u_image0;
        uniform sampler2D u_image1;
        uniform sampler2D u_imageDisplace;
        
        uniform float u_progress;

        void main() {
            float displacement=texture2D(u_imageDisplace, v_texCoord).r * 0.3;
            vec2 uvFromDist=vec2(v_texCoord.x+u_progress*displacement, v_texCoord.y);
            vec2 uvToDist=vec2(v_texCoord.x-(1.0-u_progress)*displacement, v_texCoord.y);
            vec4 colorFrom = texture2D(u_image0, uvFromDist);
            vec4 colorTo = texture2D(u_image1, uvToDist);
            gl_FragColor = mix(colorFrom, colorTo, u_progress);
        }
    
    `

    private vert: string = `
        precision mediump float;
        attribute vec4 a_position;
        uniform mat4 u_matrix;
        varying vec2 v_texCoord;

        void main() {
            gl_Position = u_matrix * a_position;
            v_texCoord=a_position.xy* .5 + .5;
        }
    `

    constructor(
        container: HTMLElement,
        imageOne: string,
        imageTwo: string,
        displacementImage: string,
        options: TransitionOptions = {}
    ) {
        
        if (!container) {
            throw new TypeError('valid container element needs to be provided')
        }
        this.container = container;
        // get displacement image from TransitionOptions or use default
        if (!displacementImage) {
            throw new TypeError('displacement image is required');
        }
        // check if 2 images are provided
        if (!imageOne || !imageTwo) {
            throw new TypeError('2 images to transition between are required');
        }


        
        // calc the progress that needs to happen every frame to finish the transition in the set time
        let duration = options.duration || 1200; // if no duration is provided take 1200ms / 1.2 seconds
        const frameTime = 1000 / 60;
        this.transitionTick = 1 / duration * frameTime;
        // do some async stuff load images create renderer etc
        this.create([imageOne, imageTwo], displacementImage);
    }

    private loadImages(imageArray: string[] | HTMLImageElement[]): Promise<HTMLImageElement[]> {
        return new Promise((resolve, reject) => {
            let imageCreatedCount = 0;
            let imageOutput: HTMLImageElement[] = [];

            imageArray.forEach((element: string | HTMLImageElement, index: number) => {
                let image:HTMLImageElement;
                if(typeof element === 'string'){
                    // if image is provided by string src create image element and load it that way
                    image=new Image();
                    image.src = element;
                }
                else if(element instanceof HTMLImageElement){
                    // if element is a valid image element just pass that instead of creating one
                    image=element;
                }
                else return reject('could not load image: ' + element)

                if(image.complete){
                    // if image data was already loaded just pass down the element
                    imageOutput[index] = image;
                    imageCreatedCount++;
                }else{
                    // if image data was not loaded yet wait for it to load and handle errors that might happen
                    image.onload = () => {
                        imageOutput[index] = image;
                        imageCreatedCount++;
                        if (imageCreatedCount === imageArray.length) {
                            resolve(imageOutput)
                        }
                    }
                    image.onerror = () => reject('could not load image: ' + image.src)
                }
                if (imageCreatedCount === imageArray.length) {
                    resolve(imageOutput)
                }
            })
        })

    }

    private setCanvasDim() {
        this.canvasRef.width = this.canvasRef.clientWidth;
        this.canvasRef.height = this.canvasRef.clientHeight;
    }

    private createGlContext(container: HTMLElement) {
        // create canvas to render to
        const canvas=document.createElement("canvas");
        this.canvasRef=canvas;
        // set its size to fill the container
        this.canvasRef.style.height="100%"
        this.canvasRef.style.width="100%"
        this.canvasRef.style.display="block"
        // get the gl context
        this.gl = this.canvasRef.getContext('webgl') as WebGLRenderingContext;
        if (!this.gl) {
            throw new TypeError('could not find a valid WebGL Rendering Context')
        }
        // insert canvas into the container
        container.appendChild(canvas);
    }   

    private async create(imagesSrc: string[], displacementImageSrc: string) {
        try {
            const extendedImageArray = [...imagesSrc, displacementImageSrc];
            const loadedImages = await this.loadImages(extendedImageArray);
            const displacementImage = loadedImages.pop() as HTMLImageElement;
            const images = loadedImages;
            // once all the images are successfully loaded create the canvas and its webGL context
            this.createGlContext(this.container);
            /* set renderer dimensions */
            this.setCanvasDim();
            
            this.shaderProgram = this.createShaderProgram(this.gl, this.vert, this.frag);

            this.createRenderer(images, displacementImage);
        } catch (error) {
            console.dir(error)
        }

    }

    private createRenderer(images: HTMLImageElement[], displacementImage: HTMLImageElement) {
        if (!this.gl || !this.shaderProgram) throw new Error('failed');
        if (images.length < 2) throw new Error('at least 2 images are required');
        // get attribute locations
        let positionLocation = this.gl.getAttribLocation(this.shaderProgram, "a_position");
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
        this.gl.useProgram(this.shaderProgram);

        // create texture for every image in images array
        const textures = [];
        let displacementTexture: WebGLTexture | null = null;
        for (let i = 0; i < images.length + 1; ++i) {
            const texture: WebGLTexture | null = this.gl.createTexture();
            if (!texture) throw new Error('failed to create texture')
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

            // Set the parameters so we can render any size image.
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

            if (i === images.length) {
                // after all image textures are created create the displacement texture
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, displacementImage);
                displacementTexture = texture;
                continue;
            }
            // Upload the image into the texture.
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, images[i]);

            // add the texture to the array of textures.
            textures.push(texture);
        }

        // look up resolution uniform location
        this.uResolutionLocation = this.gl.getUniformLocation(this.shaderProgram, "u_resolution");
        this.uProgressLocation = this.gl.getUniformLocation(this.shaderProgram, "u_progress");
        const uMatrix = this.gl.getUniformLocation(this.shaderProgram, "u_matrix");

        const updateScaleMode = () => {
            // function to update the image scaling to cover
            const image = images[0];
            if (!image) throw new TypeError('failed to get image');
            const canvasAspect = this.canvasRef.clientWidth / this.canvasRef.clientHeight;
            const imageAspect = image.width / image.height;
            let scaleX = imageAspect / canvasAspect;
            let scaleY = 1;
            if (scaleX < 1) {
                scaleY = 1 / scaleX;
                scaleX = 1;
            }
            this.gl.uniformMatrix4fv(uMatrix, false, new Float32Array([
                scaleX, 0, 0, 0,
                0, -scaleY, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ]))
        }

        // lookup the sampler locations.
        const uImage0Location = this.gl.getUniformLocation(this.shaderProgram, "u_image0");
        const uImage1Location = this.gl.getUniformLocation(this.shaderProgram, "u_image1");
        // lookup the sampler location of the displacement texture
        const uImageDisplaceLocation = this.gl.getUniformLocation(this.shaderProgram, "u_imageDisplace");

        // set resolution
        this.gl.uniform2fv(this.uResolutionLocation, [this.canvasRef.clientWidth, this.canvasRef.clientHeight]);
        // set progress to 0
        this.gl.uniform1f(this.uProgressLocation, 0);
        // set the matrix so the image will be scaled to cover the available space
        updateScaleMode();
        // set which texture units to render with.
        this.gl.uniform1i(uImage0Location, 0);  // texture unit 0
        this.gl.uniform1i(uImage1Location, 1);  // texture unit 1
        this.gl.uniform1i(uImageDisplaceLocation, 2);  // texture unit 1
        // Set each texture unit to use a particular texture.
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, textures[0]);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, textures[1]);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, displacementTexture);

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


        this.gl.viewport(0, 0, this.canvasRef.width, this.canvasRef.height);
        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        window.onresize = () => {
            if (this.gl) {
                this.setCanvasDim();
                updateScaleMode();
                this.gl.uniform2fv(this.uResolutionLocation, [this.canvasRef.clientWidth, this.canvasRef.clientHeight]);
                this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
                this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

            }
        }


    }


    private render() {
        this.gl.uniform1f(this.uProgressLocation, this.transitionProgress);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    public start() {
        this.transitionActive = true;
        if (this.renderLoop) cancelAnimationFrame(this.renderLoop);
        this.transitionForwards();
    }
    public reverse() {
        this.transitionActive = true;
        if (this.renderLoop) cancelAnimationFrame(this.renderLoop);
        this.transitionBackwards();
    }
    private transitionForwards() {
        if (this.transitionProgress <= 1.0) {
            this.transitionProgress += this.transitionTick;
            this.render();
            this.renderLoop = requestAnimationFrame(() => this.transitionForwards());
        } else {
            // after transition is finished the number will not be exact usually
            // so set it the to exact value
            this.transitionProgress = 1.0;
            this.render();
            this.transitionActive = false
            this.transitionFinished = true;
        }
    }
    private transitionBackwards() {
        if (this.transitionProgress >= 0) {
            this.transitionProgress -= this.transitionTick;
            this.render();
            this.renderLoop = requestAnimationFrame(() => this.transitionBackwards());
        } else {
            // after transition is finished the number will not be exact usually
            // so set it the to exact value start value
            this.transitionProgress = 0;
            this.render();
            this.transitionActive = false
            this.transitionFinished = false;
        }
    }

    public destroy() {
        if (this.gl) {
            if (this.renderLoop) cancelAnimationFrame(this.renderLoop);
            this.gl.deleteProgram(this.shaderProgram);
        }
    }

    private createShaderProgram(gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram | null {

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

        const program = this.createProgram(gl, vertexShader, fragmentShader);

        return program
    }


    private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
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

    private createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
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


