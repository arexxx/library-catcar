/*
  CatCar Library
  6-5-2021 Dennis Goor:
    lib aan gemaakt en de eerste functie serin gezet.
    bezig geweest met de syntax,
    error handling en bebug.
    PCA9685 erin gezet en hier de eerste beginselen voor gemaakt

*/
//% weight=100 color=#0fbc11 icon=""
namespace catCar {
  /*
  debug section
  */
/*  let _DEBUG: boolean = false
  const debug = (msg: string) => {
    if (_DEBUG === true) {
      serial.writeLine(msg)
    }
  }*/

const CHIP_ADRESS = 0x41 //adress is fixed on the PCB; dec.65 => hex.41
const chipResolution = 4096 //see datasheet
const PrescaleReg = 0xFE //the prescale register address

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
const PinRegDistance = 4
const channel0OnStepLowByte = 0x06 // LED0_ON_L
const channel0OnStepHighByte = 0x07 // LED0_ON_H
const channel0OffStepLowByte = 0x08 // LED0_OFF_L
const channel0OffStepHighByte = 0x09 // LED0_OFF_H

const hexChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']



/*
 * One function to write the to the PCA9685
 */
 function write(chipAddress: number, register: number, value: number): void {
   const buffer = pins.createBuffer(2)
   buffer[0] = register
   buffer[1] = value
   pins.i2cWriteBuffer(chipAddress, buffer, false)
 }

 function setPinPulseRange(pinNumber:number, onStep:number=0, offStep:number=2048, chipAddress:number): void {
   pinNumber = Math.max(0, Math.min(15, pinNumber))
   const buffer = pins.createBuffer(2)
   const pinOffset = PinRegDistance * pinNumber
   onStep = Math.max(0, Math.min(4095, onStep))
   offStep = Math.max(0, Math.min(4095, offStep))

   // Low byte of onStep
   write(chipAddress, pinOffset + channel0OnStepLowByte, onStep & 0xFF)

   // High byte of onStep
   write(chipAddress, pinOffset + channel0OnStepHighByte, (onStep >> 8) & 0x0F)

   // Low byte of offStep
   write(chipAddress, pinOffset + channel0OffStepLowByte, offStep & 0xFF)

   // High byte of offStep
   write(chipAddress, pinOffset + channel0OffStepHighByte, (offStep >> 8) & 0x0F)
 }

    /**
     * @param lfred, eg: 255
     * @param lfgreen, eg: 255
     * @param lfblue, eg: 255
     */
    //% blockid=device_maak_koplampen
    //% block="maak koplampen: rood:%lfred groen:%lfgreen blauw:%lfblue"
    export function maakkoplampen(lfred: number, lfgreen: number, lfblue: number): void {
        // Add code here
    }

    

    //% block
    export function setLedDutyCycle(ledNum:number, dutyCycle:number, chipAddress:number): void {
        ledNum = Math.max(1, Math.min(16, ledNum))
        dutyCycle = Math.max(0, Math.min(100, dutyCycle))
        const pwm = (dutyCycle * (chipResolution - 1)) / 100
        return setPinPulseRange(ledNum - 1, 0, pwm, chipAddress)
    }
}
