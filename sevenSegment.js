// sevenSegment.js / 0.2.0 ///////////////////////////////////////// 10.16.18 //
// A clock display based on seven-segment LED displays                        //
///////////////////////////////////////////////////////////////// studioKeywi //
(() => {
    'use strict';
})();

/** Seven-Segment display */
class SevSeg {
    constructor(origin, hori, vert, colors) {
        /** Validate the passed arguments */
        function validateArgs(...args) {
            function badArg(msg, arg) {
                throw `Invalid argument used in SevSeg constructor:\n\t${arg}: ${msg}`;
            }

            // Vector checks
            let vectors = args
                .slice(0, args.length - 1)
                .filter(v => !(v instanceof p5.Vector));
            if (vectors.length !== 0) {
                return badArg(
                    'One or more objects that are not p5.Vectors were used',
                    vectors.join(', ')
                );
            }

            // Size checks
            let sizes = args.slice(1, 3).filter(s => s <= 0);
            if (sizes.length !== 0) {
                return badArg(
                    'One or both segments were given an invalid dimension (dimensions must be positive and non-zero',
                    sizes.join(', ')
                );
            }

            // Color checks
            let colors = args.slice(-1).filter(c => !Array.isArray(c));
            if (colors.length !== 0) {
                return badArg(
                    'An array of arrays is required for the color of this clock',
                    colors.join(', ')
                );
            }
            colors = [...args.slice(-1)].filter(
                c =>
                    (Array.isArray(c) && c.length !== 3) ||
                    (!Array.isArray(c) && !/#[a-z\d]{6}/i.test(c))
            );
            // TODO: Check if this validation works
            if (colors.length !== 0) {
                return badArg(
                    'An array of 3 values is required for each color of this clock, or a hex string in the format #HHHHHH',
                    colors.join(', ')
                );
            }
        }
        validateArgs(origin, hori, vert, colors);

        // X-positions of segments
        let x1 = origin.x;
        let x2 = x1 + vert.x;
        let x3 = x2 + hori.x;

        // Y-positions of segments
        let y1 = origin.y;
        let y2 = y1 + hori.y;
        let y3 = y2 + vert.y;
        let y4 = y3 + hori.y;
        let y5 = y4 + vert.y;

        // Rounded corners
        let rad = min(hori.y, vert.x) / 4;

        this.segments = [
            [x2, y1, hori.x, hori.y, rad],
            [x3, y2, vert.x, vert.y, rad],
            [x3, y4, vert.x, vert.y, rad],
            [x2, y5, hori.x, hori.y, rad],
            [x1, y4, vert.x, vert.y, rad],
            [x1, y2, vert.x, vert.y, rad],
            [x2, y3, hori.x, hori.y, rad]
        ];

        // Colors
        this.dimColor = color(colors[1]);
        this.litColor = color(colors[2]);
    }

    display(bits) {
        for (let i = 0; i < bits.length; i++) {
            fill(bits[i] === 1 ? this.litColor : this.dimColor);
            rect(...this.segments[i]);
        }
    }
}
SevSeg.digits = [
    [1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 0, 0, 0, 0],
    [1, 1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 1, 1],
    [1, 0, 1, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 0],
    Array(7).fill(1),
    [1, 1, 1, 1, 0, 1, 1],
    Array(7).fill(0)
];

/** Clock made of seven-segment displays */
class ClockDisplay {
    constructor(options) {
        // TODO: Pre-segment validations
        let { hori, vert, padding, gutter, margin, colors } = options;

        // Information for calculating display positions
        let digit = {
            w: hori.x + 2 * vert.x,
            h: 3 * hori.y + 2 * vert.y,
            pad: hori.x + 2 * vert.x + padding,
            gut: hori.x + 2 * vert.x + gutter
        };

        // Information about clock itself
        this.width = digit.w * 6 + 4 * margin + 3 * padding + 2 * gutter;
        this.height = digit.h + 2 * margin;
        this.margin = margin;
        this.background = color(colors[0]);
        this.dimColor = color(colors[1]);
        this.litColor = color(colors[2]);

        // Create seven-segment displays
        let origin = createVector(margin, margin);
        this.hrTen = new SevSeg(origin, hori, vert, colors);
        this.hrOne = new SevSeg(origin.add(digit.pad), hori, vert, colors);
        this.minTen = new SevSeg(origin.add(digit.gut), hori, vert, colors);
        this.minOne = new SevSeg(origin.add(digit.pad), hori, vert, colors);
        this.secTen = new SevSeg(origin.add(digit.gut), hori, vert, colors);
        this.secOne = new SevSeg(origin.add(digit.pad), hori, vert, colors);

        // Information for positioning dots
        let dotSize = (min(gutter, digit.h / 4) * 5) / 8;
        let gutterLeft =
            2 * digit.w + padding + gutter / 2 - dotSize / 2 + margin;
        let gutterRight = gutterLeft + (2 * digit.w + padding + gutter);
        let gutterTop = digit.h / 2 - (dotSize * 3) / 2 + margin;
        let gutterBottom = gutterTop + dotSize * 2;
        let rad = min(hori.y, vert.x) / 4;
        this.hrMinDots = {
            top: [gutterLeft, gutterTop, dotSize, dotSize, rad],
            bottom: [gutterLeft, gutterBottom, dotSize, dotSize, rad]
        };
        this.minSecDots = {
            top: [gutterRight, gutterTop, dotSize, dotSize, rad],
            bottom: [gutterRight, gutterBottom, dotSize, dotSize, rad]
        };

        // 12 hour/24 hour mode
        // TODO: Derive better placement for AM/PM text
        this.hourMode = '12';
        this.ampmX = this.width - (5 * margin) / 2;
        this.amY = this.height - 3 * margin;
        this.pmY = this.height - margin;
    }

    display() {
        // Clock background
        background(this.background);

        // Disable stroke for segments
        strokeWeight(0);

        // Display Seconds
        let s = second();
        let ones = s % 10;
        let tens = floor(s / 10);
        this.secOne.display(SevSeg.digits[ones]);
        this.secTen.display(SevSeg.digits[tens]);

        // Display Minutes
        let m = minute();
        ones = m % 10;
        tens = floor(m / 10);
        this.minOne.display(SevSeg.digits[ones]);
        this.minTen.display(SevSeg.digits[tens]);

        // Display Hours
        let h = hour();
        ones = h % 10;
        tens = floor(h / 10);
        // 12 Hour mode changes
        if (this.hourMode === '12') {
            // Noon/midnight edge case
            h = h % 12 === 0 ? 12 : h % 12;
            ones = h % 10;
            tens = floor(h / 10) === 0 ? 10 : 1;
            // Display AM/PM
            fill(hour() >= 12 ? this.dimColor : this.litColor);
            text('AM', this.ampmX, this.amY);
            fill(hour() >= 12 ? this.litColor : this.dimColor);
            text('PM', this.ampmX, this.pmY);
        }
        this.hrOne.display(SevSeg.digits[ones]);
        this.hrTen.display(SevSeg.digits[tens]);

        // Display Dots
        fill(s % 2 > 0 ? this.litColor : this.dimColor);
        rect(...this.hrMinDots.top);
        rect(...this.hrMinDots.bottom);
        rect(...this.minSecDots.top);
        rect(...this.minSecDots.bottom);

        // Display Border
        strokeWeight(1);
        noFill();
        stroke(this.litColor);
        rect(
            this.margin / 2,
            this.margin / 2,
            this.width - this.margin,
            this.height - this.margin
        );
    }
}

/** The clock to render */
var clock;
/** Clock configuration bundles */
var options;

var createdCanvas = false;

/** p5.js function */
function setup() {
    // TODO: Interactive option generation
    options = generateBuiltInOptions();
    createClock();

    // TODO: Derive better sizing for AM/PM text
    textSize(32);
    textFont('monospace');
}

/** p5.js function */
function draw() {
    clock.display();
}

/** Bundle up options/settings for constructor */
function generateBuiltInOptions() {
    // TODO: New color schemes
    let green = [
        '#001f00' /* Background color */,
        '#003f00' /* Unlit (dim) segment */,
        '#00ff00' /* Lit segment */
    ];
    let solarDark = [
        '#657b83' /* Background color*/,
        '#586e75' /* Unlit segment */,
        '#002b36' /* Lit segment */
    ];
    let solarLight = [
        '#839496' /* Background color */,
        '#93a1a1' /* Unlit segment */,
        '#fdf6e3' /* Lit segment */
    ];
    // TODO: New segment/spacing schemes
    return {
        default: {
            hori: createVector(40, 20),
            vert: createVector(20, 80),
            padding: 10,
            gutter: 60,
            margin: 20,
            colors: solarDark
        },
        greenBlox: {
            hori: createVector(40, 20),
            vert: createVector(20, 40),
            padding: 20,
            gutter: 60,
            margin: 20,
            colors: green
        },
        skinnyPuppy: {
            hori: createVector(30, 10),
            vert: createVector(10, 120),
            padding: 15,
            gutter: 120,
            margin: 30,
            colors: solarLight
        }
    };
}

function createClock() {
    let clockChoice = Array.from(
        document.getElementsByName('clockType')
    ).filter(type => type.checked)[0].value;
    clock = new ClockDisplay(options[clockChoice]);
    document.body.style.background = options[clockChoice].colors[0];
    document.body.style.color = options[clockChoice].colors[2];
    // Generate canvas size based on clock size
    if (createdCanvas === false) {
        createCanvas(clock.width, clock.height);
        createdCanvas = true;
    } else {
        resizeCanvas(clock.width, clock.height);
    }
}
