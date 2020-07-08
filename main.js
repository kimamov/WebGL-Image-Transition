var Transition = /** @class */ (function () {
    function Transition(canvasIndex, imageOne, imageTwo, displacementImage) {
        this.canvasRef = document.getElementById(canvasIndex);
        if (!this.canvasRef) {
            throw new TypeError('could not find a valid canvas element with your provided canvas index');
        }
        this.canvasContext = this.canvasRef.getContext('webgl');
    }
    return Transition;
}());
