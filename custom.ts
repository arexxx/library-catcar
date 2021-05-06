
/**
 * Gebruik dit bestand om specifieke functies en blokken te definiëren.
 * Lees meer op https://makecode.microbit.org/blocks/custom
 */

enum MyEnum {
    //% block="one"
    One,
    //% block="two"
    Two
}

/**
 * Eigen bouwstenen
 */
//% weight=100 color=#0fbc11 icon=""
namespace catCar {


    /**
     * @param lfred, eg: 255
     * @param lfgreen, eg: 255
     * @param lfblue, eg: 255
     */
    //% blockid=device_maak_koplampen
    //% block="maak koplampen: rood: %LFRed groen: %LFGreen blauw: %LFBlue"
    export function maak koplampen(lfred: number, lfgreen: number, lfblue: number): void {
        // Add code here
    }

    /**
     * TODO: beschrijf hier je functie
     * @param value beschrijf de waarde hier, eg: 5
     */
    //% block
    export function fib(value: number): number {
        return value <= 1 ? value : fib(value -1) + fib(value - 2);
    }
}
