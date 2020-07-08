import { frag, vert } from './shaders';
import { createShaderProgram } from './util';


export class Transition {
    private canvasRef: HTMLCanvasElement | null;
    private gl: WebGLRenderingContext | null;
    private imageArray: any [];
    private shaderProgram: WebGLProgram | null = null;
    private renderLoop: number | null=null;


    constructor(canvasIndex: string, imageOne: any, imageTwo: any, displacementImage: any){
        this.canvasRef=document.getElementById(canvasIndex) as HTMLCanvasElement;
        if(!this.canvasRef){
            throw new TypeError('could not find a valid canvas element with your provided canvas index')
        }
        this.gl=this.canvasRef.getContext('webgl');   
    }
    setCanvasDim() {
        this.canvasRef.width = this.canvasRef.clientWidth;
        this.canvasRef.height = this.canvasRef.clientHeight;
    }

    create() {
        if (this.canvasRef) {
            /* set renderer dimensions */
            this.setCanvasDim();
            this.shaderProgram = createShaderProgram(this.gl, vert, frag);
        } else console.log("no reference to the canvas was found")
    }




    render = () => {
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

            // look up orb uniform array location
            const uOrbArrayLocation = this.gl.getUniformLocation(this.shaderProgram, "u_orbData");

            const uDistModifierLocation = this.gl.getUniformLocation(this.shaderProgram, "u_distanceModifier");

            this.gl.uniform1f(uDistModifierLocation, 5.0);
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


            const drawLoop = (gl: WebGLRenderingContext): void => {
                // Draw the rectangle.
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                this.renderLoop = requestAnimationFrame(() => drawLoop(gl));
            }
            drawLoop(this.gl);
        }

    }



    destroy = () => {
        if (this.gl) {
            cancelAnimationFrame(this.renderLoop);
            this.gl.deleteProgram(this.shaderProgram);
        }
    }

}