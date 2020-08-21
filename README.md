# WebGL-Image-Transition
Package for transitioning between 2 images most likely by using a displacement map. Inspired by Hover.js https://github.com/robin-dela/hover-effect but without extra libraries :)

# Demo 
https://jolly-wing-fcb2b3.netlify.app/

# Usage 
Get the transition.js file or the entire transtion folder and import it via script tag or any other way.  
The transition is going to run inside a canvas so create one and set its size.  
If you don't want to use your own displacement texture you can get dis.jpg from the repo.
It is highly recommended that both images have the same aspect ratio to avoid stretching.

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

    #myContainer {
        height: 100%;
        width: 100%;
        margin: 0;
    }
</style>

<body>
    <div id="myContainer"></div>
    <script src="transition.js">

    </script>
    <script>
        // select your container element
        const container = document.querySelector('#myContainer');
        
        /* 
            Transition arguments are:
            (container: HTMLElement, 
            imageOne: string | HTMLImageElement, 
            imageTwo: string | HTMLImageElement, 
            displacementImageSrc: string | HTMLImageElement, 
            options?: {duration?: number}) 
        */

        // everything but options is required
        
        // create Transition by passing your container element, the 2 pictures you want to transition between and a displacement image
        const transition = new Transition(
            container,
            "space1.jpg", 
            "space2.jpg",
            "dis.jpg",
            {
                duration: 1200
            }
        );
        // after creating the transition you can use its methods start and reverse in order to run the transition forwards and backwards.
        // you can call these functions yourself or add them to DOM events
        container.addEventListener('click', () => {
            // if transition is finished click will reverse it
            if (transition.transitionFinished) {
                return transition.reverse()
            }
            // otherwise click will start it
            transition.start()
        })
    </script>
</body>

</html>
```
