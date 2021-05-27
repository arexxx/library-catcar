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

    let rotationsRight: number = 0
    let rotationsLeft: number = 0
    let numRotorTurnsRight: number = 0
    let numRotorTurnsLeft: number = 0
    let odometrieMonitorStarted = false

    const wheelCircumference = 138 // in mm
    const gearBoxRatio = 150
    let target_rps_rotor = 0
    let targetSpeed = 0
    let setspeedloop = 0
    let speedLeft = 0
    let speedRight = 0



    export enum Turn {
      links = 10,
      rechts = 11,
    }

    export enum Directions {
      voorwaards = 20,
      achterwaards = 21,
    }


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


    /**
     * Used to set the duty cycle (0-100) of a given led connected to the PCA9685
     * @param backred, eg:0-100
     * @param backLyellow, eg:0-100
     * @param backRyellow, eg:0-100
     */
    //% block="Maak achterlampen: geel links%backLyellow rood%backred geel rechts%backRyellow"
    export function maakAchterlampen(backLyellow: number, backred: number, backRyellow: number): void {
        backLyellow = Math.max(0, Math.min(100, backLyellow))
        const pwm_bly = (backLyellow * (chipResolution - 1)) / 100
        writeloop(11, 0, pwm_bly)

        backred = Math.max(0, Math.min(100, backred))
        const pwm_br = (backred * (chipResolution - 1)) / 100
        writeloop(9, 0, pwm_br)

        backRyellow = Math.max(0, Math.min(100, backRyellow))
        const pwm_bry = (backRyellow * (chipResolution - 1)) / 100
        writeloop(10, 0, pwm_bry)
    }





    /**
    * blablablabla
    * @param turning kiezen tussen links en rechts draaien
    * @param speed snelheid van de motor in %, eg:0-100
    */
    //% block="Draai %turning met snelheid %speed procent"
    export function draaien(turning: Turn = 10, speed: number): void {
      turning = Math.max(10, Math.min(11, turning))
      const pca_spd_value = (speed * (chipResolution - 1)) / 100

      if(turning === 10) {
        writeloop(12, 0, 0)
        writeloop(13, 0, pca_spd_value)
        writeloop(14, 0, 0)
        writeloop(15, 0, pca_spd_value)
      }

      if(turning === 11) {
        writeloop(12, 0, pca_spd_value)
        writeloop(13, 0, 0)
        writeloop(14, 0, pca_spd_value)
        writeloop(15, 0, 0)
      }
    }


    /**
    * blablablabla
    * @param direction kiezen tussen links en rechts draaien
    * @param speed snelheid van de motor in %, eg:0-100
    *
    */
    //% block="rijden %direction met snelheid %speed procent"
    export function rijden(direction: Directions = 20, speed: number): void {
      direction = Math.max(20, Math.min(21, direction))
      const pca_spd_value = (speed * (chipResolution - 1)) / 100

      if(direction === 20) {
        writeloop(12, 0, pca_spd_value)
        writeloop(13, 0, 0)
        writeloop(14, 0, 0)
        writeloop(15, 0, pca_spd_value)
      }

      if(direction === 21) {
        writeloop(12, 0, 0)
        writeloop(13, 0, pca_spd_value)
        writeloop(14, 0, pca_spd_value)
        writeloop(15, 0, 0)
      }
    }


    /**
    * blablablabla
    *
    */
    //% block="stoppen met rijden"
    export function stoppenrijden(): void {
      writeloop(12, 0, 0)
      writeloop(13, 0, 0)
      writeloop(14, 0, 0)
      writeloop(15, 0, 0)
    }




    /**
    * rijden op snelheid
    * @param direction kiezen tussen links en rechts draaien
    * @param speed snelheid van de motor in cm/s min:5 max:20 cm/s, eg:10
    *
    */
    //% block="rijden %direction met snelheid %speed cm/s"
    export function rijdensnelheid(direction: Directions = 20, speed: number): void {
      direction = Math.max(20, Math.min(21, direction))
      speed = Math.max(5, Math.min(20, speed))

      if (speed != setspeedloop){
        setspeedloop = speed;
        target_rps_rotor = (speed * 10 / wheelCircumference * gearBoxRatio)
        targetSpeed = (((target_rps_rotor - 45) / 7.24) + 10)
        const pca_spd_value = (targetSpeed * (chipResolution - 1)) / 100
        speedLeft = speedRight = pca_spd_value

        if(direction === 20) {
          writeloop(12, 0, speedLeft)
          writeloop(13, 0, 0)
          writeloop(14, 0, 0)
          writeloop(15, 0, speedRight)
        }

        if(direction === 21) {
          writeloop(12, 0, 0)
          writeloop(13, 0, speedLeft)
          writeloop(14, 0, speedRight)
          writeloop(15, 0, 0)
        }
      }

      rotationsLeft = wheelrotationsLeft();
      rotationsRight = wheelrotationsRight();

      serial.writeNumber(rotationsLeft)
      serial.writeline(\n)
      serial.writeNumber(rotationsRight)
      serial.writeline(\n)

      if (rotationsLeft <= target_rps_rotor) {
        speedLeft = speedLeft + 20
      }
      if (rotationsLeft >= target_rps_rotor) {
        speedLeft = speedLeft - 20
      }


      if (rotationsRight <= target_rps_rotor) {
        speedRight = speedRight + 20
      }
      if (rotationsRight >= target_rps_rotor) {
        speedRight = speedRight - 20
      }

      basic.pause(1000)

      if(direction === 20) {
        writeloop(12, 0, speedLeft)
        writeloop(13, 0, 0)
        writeloop(14, 0, 0)
        writeloop(15, 0, speedRight)
      }

      if(direction === 21) {
        writeloop(12, 0, 0)
        writeloop(13, 0, speedLeft)
        writeloop(14, 0, speedRight)
        writeloop(15, 0, 0)
      }
    }



    /**
    * blablabla
    */
    //% weight=21 blockGap=8 blockId="wheelrotationsRight" block="speed right"
    export function wheelrotationsRight(): number {
        startOdometrieMonitoring();
        return rotationsRight
    }


    /**
    * blablabla
    */
    //% weight=21 blockGap=8 blockId="wheelrotationsLeft" block="speed left"
    export function wheelrotationsLeft(): number {
        startOdometrieMonitoring();
        return rotationsLeft
    }


    /**
    * Sets up an event on pin 4 pulse high and event handler to increment
    * numWindTurns on said event.  Starts background service to reset
    * numWindTurns every 1 seconds and calculate MPH.
    */
    //% weight=22 blockGap=8 blockId="startOdometrieMonitoring" block="start odometrie"
    export function startOdometrieMonitoring(): void {
      if (odometrieMonitorStarted) return;

        pins.setPull(DigitalPin.P4, PinPullMode.PullNone)
        pins.setPull(DigitalPin.P13, PinPullMode.PullNone)

        // Watch pin 4 for a high pulse and send an event
        pins.onPulsed(DigitalPin.P4, PulseValue.High, () => {
            control.raiseEvent(
                EventBusSource.MICROBIT_ID_IO_P4,
                EventBusValue.MICROBIT_PIN_EVT_RISE
            )
        })

        pins.onPulsed(DigitalPin.P13, PulseValue.High, () => {
            control.raiseEvent(
                EventBusSource.MICROBIT_ID_IO_P13,
                EventBusValue.MICROBIT_PIN_EVT_RISE
            )
        })

        // Register event handler for a pin 4 high pulse
        control.onEvent(EventBusSource.MICROBIT_ID_IO_P4, EventBusValue.MICROBIT_PIN_EVT_RISE, () => {
            numRotorTurnsRight++
        })

        // Register event handler for a pin 13 high pulse
        control.onEvent(EventBusSource.MICROBIT_ID_IO_P13, EventBusValue.MICROBIT_PIN_EVT_RISE, () => {
            numRotorTurnsLeft++
        })

        // Update value every 1 seconds
        control.inBackground(() => {
          while (true) {
            basic.pause(1000)
            rotationsLeft = numRotorTurnsLeft
            numRotorTurnsLeft = 0
          }
        })

        control.inBackground(() => {
            while (true) {
              basic.pause(1000)
              rotationsRight = numRotorTurnsRight
              numRotorTurnsRight = 0
            }
        })

        odometrieMonitorStarted = true;
    }

}
