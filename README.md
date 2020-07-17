# WebGL-Image-Transition
Package for transitioning between 2 images most likely by using a displacement map. Inspired by Hover.js https://github.com/robin-dela/hover-effect but without extra libraries :)

# Demo 
https://jolly-wing-fcb2b3.netlify.app/

# Usage 
Get the transition.js file and import it via script tag or any other way.

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<style>
    html,
    body {
        margin: 0;
        height: 100vh;
    }

    * {
        box-sizing: border-box;
    }

    #myCanvas {
        display: block;
        height: 100%;
        width: 100%;
        margin: 0;
    }
</style>

<body>
    <canvas id="myCanvas"></canvas>
    <script src="transition.js">

    </script>
    <script>
        const canvas = document.querySelector('#myCanvas');
        // (canvasElement: HTMLCanvasElement, imageOne: string, imageTwo: string, options: {duration: number, displacementImageSrc: string})
        const transition = new Transition(canvas, "./space1.jpg", "./space2.jpg", {
            duration: 2000
        });
        canvas.addEventListener('click', () => {
            if (transition.transitionFinished) {
                return transition.reverse()
            }
            transition.start()
        })
    </script>
</body>

</html>
```
