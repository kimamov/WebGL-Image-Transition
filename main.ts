class Transition {
    private canvasRef: HTMLCanvasElement | null;
    private canvasContext: WebGLRenderingContext;
    constructor(canvasIndex: string, imageOne: any, imageTwo: any, displacementImage: any){
        this.canvasRef=document.getElementById(canvasIndex) as HTMLCanvasElement;
        if(!this.canvasRef){
            throw new TypeError('could not find a valid canvas element with your provided canvas index')
        }
        this.canvasContext=this.canvasRef.getContext('webgl');
        
    }
}