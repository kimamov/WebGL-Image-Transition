class Transition {
    private canvasRef: HTMLCanvasElement | null;
    private gl: WebGLRenderingContext | null;
    private imageArray: any [];
    private shaderProgram: WebGLProgram | null = null;
    private renderLoop: number | null=null;

    private frag: string= `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    float aspectRatio=u_resolution.x / u_resolution.y;
    
    void main() {
        vec2 uv=gl_FragCoord.xy / u_resolution;
        
        gl_FragColor = vec4(1.0, 0.3, 0, 1.0);
    }
    `
    
    private vert: string= `
    precision mediump float;
    attribute vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
    `

    constructor(canvasIndex: string, imageOne: any, imageTwo: any, displacementImage: any){
        this.canvasRef=document.getElementById(canvasIndex) as HTMLCanvasElement;
        if(!this.canvasRef){
            throw new TypeError('could not find a valid canvas element with your provided canvas index')
        }
        this.gl=this.canvasRef.getContext('webgl');   
        this.create();
    }


    private setCanvasDim() {
        this.canvasRef.width = this.canvasRef.clientWidth;
        this.canvasRef.height = this.canvasRef.clientHeight;
    }

    private create() {
        if (this.canvasRef) {
            /* set renderer dimensions */
            this.setCanvasDim();
            this.shaderProgram = this.createShaderProgram(this.gl, this.vert, this.frag);
        } else console.log("no reference to the canvas was found")
    }




    public render = () => {
        if (this.gl && this.shaderProgram) {
            let positionLocation = this.gl.getAttribLocation(this.shaderProgram, "a_position");

            // Create a buffer to put three 2d clip space points in 
            let positionBuffer = this.gl.createBuffer();

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                -1, -1, // tri 1
                1, -1,
                -1, 1,
                -1, 1, // tri 2
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

            window.onresize = () => {
                if (this.gl) {
                    this.setCanvasDim()

                    /* recover orbs that might be off screen */

                    this.gl.uniform2fv(uResolutionLocation, [this.canvasRef.clientWidth, this.canvasRef.clientHeight]);
                    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
                }

            }

            let startTime=Date.now();
            let lastRenderTime=startTime;
            let currentRenderTime=0;
            let deltaTime=0;
            const drawLoop = (gl: WebGLRenderingContext): void => {
                currentRenderTime=Date.now();
                //deltaTime=currentRenderTime-lastRenderTime;
                this.gl.uniform1f(uTimeLocation, currentRenderTime-startTime);
                // Draw the rectangle.
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                this.renderLoop = requestAnimationFrame(() => drawLoop(gl));
            }
            drawLoop(this.gl);
        }

    }



    public destroy = () => {
        if (this.gl) {
            cancelAnimationFrame(this.renderLoop);
            this.gl.deleteProgram(this.shaderProgram);
        }
    }

    private createShaderProgram = (gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string):WebGLProgram => {

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    
        const program = this.createProgram(gl, vertexShader, fragmentShader);
    
        return program
    }
    
    
    private createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const succes = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (succes) {
            return shader;
        }
        gl.deleteShader(shader);
        throw `could not compile shader: ${gl.getShaderInfoLog(shader)}`
    }
    
    private createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }
        gl.deleteProgram(program);
        throw `could not compile shader: ${gl.getProgramInfoLog(program)}`
    }
    
    
     
    

}


