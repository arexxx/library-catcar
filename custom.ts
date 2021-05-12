/**
 * PCA9685
 */
//% weight=100 color=#0fbc11 icon=""
namespace CC2 {

    const chip_address = 65

    const chipResolution = 4096;
    const PrescaleReg = 0xFE //the prescale register address
    const PinRegDistance = 4
    const osc_clock = 25000000
    const pca_frequency = 200

    const modeRegister1 = 0x00 // MODE1
    const modeRegister1Default = 0x01
    const modeRegister2 = 0x01 // MODE2
    const modeRegister2Default = 0x04

    const sleep = modeRegister1Default | 0x10; // Set sleep bit to 1
    const wake = modeRegister1Default & 0xEF; // Set sleep bit to 0
    const restart = wake | 0x80; // Set restart bit to 1

    const allChannelsOnStepLowByte = 0xFA // ALL_LED_ON_L
    const allChannelsOnStepHighByte = 0xFB // ALL_LED_ON_H
    const allChannelsOffStepLowByte = 0xFC // ALL_LED_OFF_L
    const allChannelsOffStepHighByte = 0xFD // ALL_LED_OFF_H

    const channel0OnStepLowByte = 0x06 // LED0_ON_L
    const channel0OnStepHighByte = 0x07 // LED0_ON_H
    const channel0OffStepLowByte = 0x08 // LED0_OFF_L
    const channel0OffStepHighByte = 0x09 // LED0_OFF_H


//_____________________________________________________________________________________________________//


    function writePCA(chip_address: number, register: number, value: number): void {
        const buffer = pins.createBuffer(2)
        buffer[0] = register
        buffer[1] = value
        pins.i2cWriteBuffer(chip_address, buffer, false)
    }

    function writeloop(pinNumber: number, onStep: number = 0, offStep: number = 2048): void {
        pinNumber = Math.max(0, Math.min(15, pinNumber))
        const buffer = pins.createBuffer(2)
        const pinOffset = PinRegDistance * pinNumber
        onStep = Math.max(0, Math.min(4095, onStep))
        offStep = Math.max(0, Math.min(4095, offStep))

        // Low byte of onStep
        writePCA(chip_address, pinOffset + channel0OnStepLowByte, onStep & 0xFF)
        // High byte of onStep
        writePCA(chip_address, pinOffset + channel0OnStepHighByte, (onStep >> 8) & 0x0F)
        // Low byte of offStep
        writePCA(chip_address, pinOffset + channel0OffStepLowByte, offStep & 0xFF)
        // High byte of offStep
        writePCA(chip_address, pinOffset + channel0OffStepHighByte, (offStep >> 8) & 0x0F)
    }


//_____________________________________________________________________________________________________//


    /**
     * Used to reset the chip, will cause the chip to do a full reset and turn off all outputs
     */
    //% block
    export function resetLedsEnMotor(): void {
        const prescaler = (osc_clock / (pca_frequency * chipResolution)) - 1;

        writePCA(chip_address, modeRegister1, sleep)

        writePCA(chip_address, PrescaleReg, prescaler)

        writePCA(chip_address, allChannelsOnStepLowByte, 0x00)
        writePCA(chip_address, allChannelsOnStepHighByte, 0x00)
        writePCA(chip_address, allChannelsOffStepLowByte, 0x00)
        writePCA(chip_address, allChannelsOffStepHighByte, 0x00)

        writePCA(chip_address, modeRegister1, wake)

        control.waitMicros(1000)
        writePCA(chip_address, modeRegister1, restart)
    }


    /**
     * Used to set the duty cycle (0-100) of a given led connected to the PCA9685
     * @param frontred, eg:0-100
     * @param frontgreen, eg:0-100
     * @param frontblue, eg:0-100
     */
    //% block="Maak koplampen: Rood%frontred Groen%frontgreen Blauw%frontblue"
    export function maakKoplampen(frontred: number, frontgreen: number, frontblue: number): void {
        frontred = Math.max(0, Math.min(100, frontred))
        const pwm_fr = (frontred * (chipResolution - 1)) / 100
        writeloop(0, 0, pwm_fr)

        frontgreen = Math.max(0, Math.min(100, frontgreen))
        const pwm_fg = (frontgreen * (chipResolution - 1)) / 100
        writeloop(1, 0, pwm_fg)

        frontblue = Math.max(0, Math.min(100, frontblue))
        const pwm_fb = (frontblue * (chipResolution - 1)) / 100
        writeloop(2, 0, pwm_fb)
    }
}
