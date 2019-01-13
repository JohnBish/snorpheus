const NOTES = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G',
    'Bb', 'C#', 'Eb', 'F#', 'Ab'
]
const FLATS = {
    'Ab': 'G#',
    'Bb': 'A#',
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
}
const CHORD_TYPES = [
    'min', 'dim', 'aug',
    'maj7', 'min7', '7', 'dim7', 'hdim7', 'minmaj7',
    'min6', 'maj6',
    '9', 'maj9', 'min9',
    'sus4'
]
const JTAB_CHORD_TYPES = [
    'm', 'dim', 'aug',
    '7', 'm7', '7', 'dim7', 'dim7', '7',
    'm6', '6',
    '9', '9', 'm9',
    'sus4'
]
const JTAB_CHORDS = [
    '',
    NOTES,
    NOTES.map(x => JTAB_CHORD_TYPES.map(y => x + y))
].flat(2)
const CHORDS = [
    'N',
    NOTES,
    NOTES.map(x => CHORD_TYPES.map(y => x + ":" + y))
].flat(2)
const NOTES_META = {
    0: {
        letter: 'C',
        frequency: 16.35,
        color: 'rgb(244, 67, 54)'
    },
    1: {
        letter: 'C#',
        frequency: 17.32,
        color: 'rgb(233, 30, 99)'
    },
    2: {
        letter: 'D',
        frequency: 18.35,
        color: 'rgb(156, 39, 176)'
    },
    3: {
        letter: 'Eb',
        frequency: 19.45,
        color: 'rgb(103, 58, 183)'
    },
    4: {
        letter: 'E',
        frequency: 20.60,
        color: 'rgb(63, 81, 181)'
    },
    5: {
        letter: 'F',
        frequency: 21.83,
        color: 'rgb(3, 169, 244)'
    },
    6: {
        letter: 'F#',
        frequency: 23.12,
        color: 'rgb(0, 150, 136)'
    },
    7: {
        letter: 'G',
        frequency: 24.50,
        color: 'rgb(76, 175, 80)'
    },
    8: {
        letter: 'Ab',
        frequency: 25.96,
        color: 'rgb(139, 195, 74)'
    },
    9: {
        letter: 'A',
        frequency: 27.50,
        color: 'rgb(255, 235, 59)'
    },
    10: {
        letter: 'Bb',
        frequency: 29.14,
        color: 'rgb(255, 193, 7)'
    },
    11: {
        letter: 'B',
        frequency: 30.87,
        color: 'rgb(255, 87, 34)'
    },
}

const RADIUS = 90
const RESTING_THETA = Math.PI * (1 / 2)
const THETA_I = Math.PI * (1 / 6)
const THETA_F = Math.PI * (9 / 6)
var thetaI = RESTING_THETA
var thetaF = RESTING_THETA
var chordBuffer = []

var canvasEl = document.getElementById('canvas')


var ctx = canvasEl.getContext('2d')

var audioCtx
var analyser
var soundArray = []
var frequencyArray = []
var semitones = []


function getSemitone(frequency) {
    f = frequency
    while (f > 31.785) {
        f /= 2
    }

    var minDiff = Infinity
    var semitone = 0
    for (n in NOTES_META) {
        const diff = Math.abs(NOTES_META[n].frequency - f)
        if (diff < minDiff) {
            minDiff = diff
            semitone = n
        }
    }
    return semitone
}

function getFrequency(idx) {
    const step = audioCtx.sampleRate / analyser.fftSize
    return idx * step + step / 2
}

function processFrequencies(dataArray) {
    semitones = []

    for (d in dataArray) {
        s = getSemitone(getFrequency(d))
        if (semitones.length == 0) {
            semitones.push([s, dataArray[d]])
        } else if (s == semitones[semitones.length - 1][0]) {
            semitones[semitones.length - 1][1] =
                Math.max(dataArray[d], semitones[semitones.length - 1][1])
        } else {
            semitones.push([s, dataArray[d]])
        }
    }

    return semitones
}

function analyzeAudio() {
    if (audioCtx != null) return
    const audioEl = document.getElementById('audio')
    const AudioContext = window.AudioContext || window.webkitAudioContext
    audioCtx = new AudioContext()
    analyser = audioCtx.createAnalyser()
    const track = audioCtx.createMediaElementSource(audioEl)
    track.connect(analyser).connect(audioCtx.destination)
    analyser.fftSize = 32768
    bufferLength = analyser.frequencyBinCount

    soundArray = new Uint8Array(bufferLength)
    frequencyArray = new Uint8Array(bufferLength)

    updateAnalyser()
}

function predictChord(semitones) {
    return new Promise((res, rej) => {
        var xhr = new XMLHttpRequest()
        xhr.onreadystatechange = () => {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    res(xhr.responseText)
                } else {
                    rej(xhr.statusText)
                }
            }
        }
        xhr.open("POST", "http://localhost:8080/", true)
        xhr.send(semitones)
    })
}

function pushChord(chord) {
    timestamp = document.getElementById('audio').currentTime
    if(chordBuffer.length == 0) {
        chordBuffer.push({
            chord: chord,
            timestamp: timestamp
        })
        process();
    } else if(chordBuffer[chordBuffer.length - 1]['chord'] != chord &&
                (timestamp - chordBuffer[chordBuffer.length - 1]['timestamp']) > .1) {
        chordBuffer.push({
            chord: chord,
            timestamp: timestamp
        })
        process();

    }
}

async function analyseChord() {
    if (semitones) {
        chord = await predictChord(semitones.map(x => x[1]))
        app.chord = CHORDS[chord]
        pushChord(chord);
    }
    requestAnimationFrame(analyseChord)
}

function updateAnalyser() {
    analyser.getByteTimeDomainData(soundArray)
    analyser.getByteFrequencyData(frequencyArray)
    semitones = processFrequencies(frequencyArray)
    semitones = semitones.slice(18, semitones.length)

    draw()
    requestAnimationFrame(updateAnalyser)
}

function getCoords(i, f, n) {
    const offset = Math.max((i - 0.5 * (n - f)), 0) * .7 * (thetaF - RESTING_THETA) / (THETA_F - RESTING_THETA)
    const angle = thetaI + (f / n) * (thetaI - thetaF)
    return [
        (RADIUS + offset) * Math.cos(angle) + canvasEl.width / 2,
        (RADIUS + offset) * Math.sin(angle) + canvasEl.height / 2
    ]
}

function draw() {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height)

    reducedFrequencyArray = frequencyArray.slice(0, frequencyArray.length * (5 / 9))
    thinnedFrequencyArray = []
    for (f in reducedFrequencyArray) {
        if (f % 32 == 0) {
            thinnedFrequencyArray.push(reducedFrequencyArray[f])
        }
    }
    thinnedSoundArray = []
    for (s in soundArray) {
        if (s % 64 == 0) {
            thinnedSoundArray.push(soundArray[s])
        }
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.lineWidth = 4
    ctx.strokeStyle = '#f3f3f3'
    ctx.beginPath()
    const deltaX = canvasEl.width / thinnedSoundArray.length
    const yOffset = -40
    ctx.moveTo(0, canvasEl.height / 2 + yOffset)
    for (s in thinnedSoundArray) {
        x = s * deltaX
        y = canvasEl.height * thinnedSoundArray[s] / (2 * 128) + yOffset
        ctx.lineTo(x, y)
    }
    ctx.lineTo(canvasEl.width, canvasEl.height / 2 + yOffset)
    ctx.stroke()

    if (document.getElementById('audio').paused) {
        if (thetaI < RESTING_THETA) {
            thetaI += Math.PI / 12
        }
        if (thetaF > RESTING_THETA) {
            thetaF -= Math.PI / 12
        } else {
            return
        }
    } else {
        if (thetaI > THETA_I) {
            thetaI -= Math.PI / 12
        }
        if (thetaF < THETA_F - 3 * Math.PI / 12) {
            thetaF += Math.PI / 12
        }
    }
    ctx.lineWidth = 5
    ctx.strokeStyle = NOTES_META[getSemitone(getFrequency(0))].color
    ctx.beginPath()
    const steps = thinnedFrequencyArray.length
    for (f in thinnedFrequencyArray) {
        const coords = getCoords(thinnedFrequencyArray[f], f, steps)
        const x = coords[0]
        const y = coords[1]
        if (f == 0) {
            ctx.moveTo(x, y)
        } else {
            ctx.lineTo(x, y)
            ctx.stroke()
            ctx.strokeStyle = NOTES_META[getSemitone(getFrequency(f))].color
            ctx.beginPath()
            ctx.moveTo(x, y)
        }
    }

    ctx.fillStyle = '#465352'
    ctx.textAlign = 'center'
    if (app.chord != 'N') ctx.fillText(app.chord, canvasEl.width / 2, canvasEl.height / 2 + 10)
}


var app = new Vue({
    el: '#app',
    data: {
        chord: 'N',
        songLoaded: false
    },
    methods: {
        fileUpload(e) {
            chordBuffer = []
            this.songLoaded = true;
            var audioEl = document.getElementById('audio')
            audioEl.src = URL.createObjectURL(document.getElementById('f-input').files[0])
            audioEl.onend = function(e) {
                URL.revokeObjectURL(document.getElementById('f-input').src)
            }
            canvasEl.style.display = "block";
            canvasEl.width = canvasEl.offsetWidth;
            ctx.font = '50px Lobster';
        },
        play(e) {
            analyzeAudio()
            analyseChord()
        },
        pause(e) {
            console.log(chordBuffer)
        },

        dropHandler(ev) {
            ev.preventDefault();
            console.log('File(s) dropped');

            // Prevent default behavior (Prevent file from being opened)

            if (ev.dataTransfer.items) {
                // Use DataTransferItemList interface to access the file(s)
                for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                    // If dropped items aren't files, reject them
                    if (ev.dataTransfer.items[i].kind === 'file') {
                        var file = ev.dataTransfer.items[i].getAsFile();
                        console.log('... file[' + i + '].name = ' + file);
                    }
                }
                var audioEl = document.getElementById('audio')
                audioEl.src = URL.createObjectURL(ev.dataTransfer.files[0])
                audioEl.onend = function(e) {
                    URL.revokeObjectURL(document.getElementById('f-input').src)
                }
                canvasEl.style.display = "block";
                canvasEl.width = canvasEl.offsetWidth;
                ctx.font = '50px Lobster';
                this.songLoaded = true;
            } else {
                // Use DataTransfer interface to access the file(s)
                for (var i = 0; i < ev.dataTransfer.files.length; i++) {
                    console.log('file[' + i + '] = ' + ev.dataTransfer.files[i]);
                }
                var audioEl = document.getElementById('audio')
                audioEl.src = URL.createObjectURL(ev.dataTransfer.files[0])
                audioEl.onend = function(e) {
                    URL.revokeObjectURL(document.getElementById('f-input').src)
                }
                canvasEl.style.display = "block";
                canvasEl.width = canvasEl.offsetWidth;
                ctx.font = '50px Lobster';
                this.songLoaded = true;
            }
        },
        dragOverHandler(ev) {
            ev.preventDefault();
            console.log('File(s) in drop zone');

            // Prevent default behavior (Prevent file from being opened)
        }
    }
})
