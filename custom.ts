
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
namespace custom {
    /**
     * TODO: beschrijf hier je functie
     * @param n beschrijf hier de parameter, eg: 5
     * @param s beschrijf hier de parameter, eg: "Hello"
     * @param e beschrijf hier de parameter
     */
    //% block
    export function foo(n: number, s: string, e: MyEnum): void {
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
