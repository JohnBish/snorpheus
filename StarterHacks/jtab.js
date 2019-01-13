var svgArray = [];
function process(){
    var input = JTAB_CHORDS[chordBuffer[chordBuffer.length-1].chord];
    console.log(input);
    getId("divs").innerHTML+= `<div id="chord${chordBuffer.length-1}" class="renderedchord"></div>`;
    jtab.render($(`#chord${chordBuffer.length-1}`), input);
}
