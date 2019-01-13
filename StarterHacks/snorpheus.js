// getId("f-input").addEventListener("change", ()=>{
//     app.songLoaded = true;
//     console.log("true");
// })

function getId(a) {
    return document.getElementById(a);
}

getId("start-button").addEventListener("click", ()=>{
    getId("pop-up").style.display="none";
    getId("prompt").style.display="flex";
})
