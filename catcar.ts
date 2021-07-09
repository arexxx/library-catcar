/* =============================
*   Arexx Engineering CatCar MakeCode library
*
*   By Dennis Goor and Sjors Smit
*   July 2021
*
*   Free to use under MIT license
**/


//
//% weight=100 color=#0fbc11 icon=""
//% groups=["Motor", "LED", "Sensors","Utility"]
namespace CatCar {

    /**
     * PCA9685 registers and adresses
    */
    const chip_address = 65      //I2C address

    const chipResolution = 4096; //chip has 12-bit resolution
    const PrescaleReg = 0xFE     //the prescale register address
    const PinRegDistance = 4    //
    const osc_clock = 25000000  //SPI frequency
    const pca_frequency = 200   //PWM output frequency

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

    //Global variables for odometrie
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

    const degree_puls = 2.1


    //Directional Enums
    //% group="Utility"
    export enum Turn {
      links = 10,
      rechts = 11,
    }
    //% group="Utility"
    export enum Directions {
      voorwaards = 20,
      achterwaards = 21,
    }


//_____________________________________________________________________________________________________//

    /**
     * Write to the PCA I/O expander
     * @param chip_address - the I2C address of the I/O expander
     * @param register - The register to write to
     * @param number - the value to write in the register
     */
    function writePCA(chip_address: number, register: number, value: number): void {
        const buffer = pins.createBuffer(2)
        buffer[0] = register
        buffer[1] = value
        pins.i2cWriteBuffer(chip_address, buffer, false)
    }

    /**
     * Write 
     */
    function writeloop(pinNumber: number, onStep: number = 0, offStep: number = 2048): void {
        pinNumber = Math.constrain(pinNumber, 0, 15)
        const buffer = pins.createBuffer(2)
        const pinOffset = PinRegDistance * pinNumber
        onStep = Math.constrain(onStep, 0, chipResolution-1)
        offStep = Math.constrain(offStep, 0, chipResolution-1)

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
     * Initialiseer de CatCar, deze functie moet altijd in bij opstarten staan!
     */
    //% block weight=199 group="utility"
    //% block="Initialiseer CatCar"
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


    //_____________________________________________________________________________________________________//


    /**
     *  koplampen aanzetten met een kleur
     * @param frontred - Percentage Red in RGB value
     * @param frontgreen - Percentage Green in RGB value
     * @param frontblue - Percentage Blue in RGB value
     */
    //% block="Maak koplampen: Rood%frontred Groen%frontgreen Blauw%frontblue" 
    //% weight=189 group="LEDs"
    //% frontred.max=100 frontred.min=0 frontgreen.max=100 frontgreen.min=0 frontblue.max=100 frontblue.min=0 
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
     *  Set the back LEDs to a specific colour
     * @param backred - Set the PWM percentage for the Red LEDs
     * @param backLyellow - Set the PWM percentage for the left yellow LED
     * @param backRyellow - Set the PWM percentage for the right yellow LED
     */
    //% block="Maak achterlampen: geel links%backLyellow rood%backred geel rechts%backRyellow" weight=188 group="LEDs"
    //% backred.min=0 backred.max=100
    //% backLyellow.min=0 backLyellow.max=100
    //% backRyellow.min=0 backRyellow.max=100
    export function maakAchterlampen(backLyellow: number, backred: number, backRyellow: number): void {
        backLyellow = Math.max(0, Math.min(100, backLyellow))
        //Convert value from 0-100 to 0-4095 for PCA chip
        const pwm_bly = (backLyellow * (chipResolution - 1)) / 100
        writeloop(11, 0, pwm_bly)

        backred = Math.max(0, Math.min(100, backred))
        //Convert value from 0-100 to 0-4095 for PCA chip
        const pwm_br = (backred * (chipResolution - 1)) / 100
        writeloop(9, 0, pwm_br)

        backRyellow = Math.max(0, Math.min(100, backRyellow))
        //Convert value from 0-100 to 0-4095 for PCA chip
        const pwm_bry = (backRyellow * (chipResolution - 1)) / 100
        writeloop(10, 0, pwm_bry)
    }


    /**
     *  set the brightness of the LEDs on the center of the CatCar
     * @param midred - Set percentage for the red LED
     * @param midyellow - Set percentage for the yellow LED
     * @param midblue - Set percentage for the blue LED
     */
    //% block="Maak midden leds: rood%midred geel%midyellow blauw%midblue" weight=187 group="LEDs"
    export function maakMiddenLeds(midred: number, midyellow: number, midblue: number): void {
        midred = Math.max(0, Math.min(100, midred))
        //midLeds are active low (current sink through PCA chip) so invert set value:
        Math.map(midred,0,100,100,0)
        //Convert value from 0-100 to 0-4095 for PCA chip
        const pwm_mr = (midred * (chipResolution - 1)) / 100
        writeloop(8, 0, pwm_mr)

        midyellow = Math.max(0, Math.min(100, midyellow))
        Math.map(midyellow,0,100,100,0)
        //Convert value from 0-100 to 0-4095 for PCA chip
        const pwm_my = (midyellow * (chipResolution - 1)) / 100
        writeloop(7, 0, pwm_my)

        midblue = Math.max(0, Math.min(100, midblue))
        Math.map(midblue,0,100,100,0)
        //Convert value from 0-100 to 0-4095 for PCA chip
        const pwm_mb = (midblue * (chipResolution - 1)) / 100
        writeloop(6, 0, pwm_mb)
    }


    //_____________________________________________________________________________________________________//


    /**
    * CatCar vooruit of achteruit rijden
    * @param direction - vooruit of achteruit (enum Directions)
    * @param speed  -snelheid van de motor in %, eg:0-100
    *
    */
    //% block="Rijden %direction met snelheid %speed procent" weight=179 group="Motor"
    export function rijden(direction: Directions = 20, speed: number): void {
      direction = Math.constrain(direction, Directions.voorwaards, Directions.achterwaards)
      const pca_spd_value = (speed * (chipResolution - 1)) / 100

      if(direction === Directions.voorwaards) {
        writeloop(12, 0, pca_spd_value)
        writeloop(13, 0, 0)
        writeloop(14, 0, 0)
        writeloop(15, 0, pca_spd_value)
      }

      if(direction === Directions.achterwaards) {
        writeloop(12, 0, 0)
        writeloop(13, 0, pca_spd_value)
        writeloop(14, 0, pca_spd_value)
        writeloop(15, 0, 0)
      }
    }



    /**
    * CatCar laten draaien
    * @param turning - Linksom of rechtsom (enum Turn)
    * @param speed - snelheid van de motor in %, eg:0-100
    */ 
    //% block="Draai %turning met snelheid %speed procent" weight=178 group="Motor"
    export function draaien(turning: Turn = 10, speed: number): void {
      turning = Math.constrain(turning, Turn.links, Turn.rechts)
      const pca_spd_value = (speed * (chipResolution - 1)) / 100

      if(turning === Turn.links) {
        writeloop(12, 0, 0)
        writeloop(13, 0, pca_spd_value)
        writeloop(14, 0, 0)
        writeloop(15, 0, pca_spd_value)
      }

      if(turning === Turn.rechts) {
        writeloop(12, 0, pca_spd_value)
        writeloop(13, 0, 0)
        writeloop(14, 0, pca_spd_value)
        writeloop(15, 0, 0)
      }
    }



    /**
    * Disable the motors and stop driving
    *
    */
    //% block="Stoppen met rijden" weight=177 group="Motor"
    export function stoppenrijden(): void {
      writeloop(12, 0, 0)
      writeloop(13, 0, 0)
      writeloop(14, 0, 0)
      writeloop(15, 0, 0)
    }


    //_____________________________________________________________________________________________________//


    /**
    * rijden op snelheid
    * @param direction kiezen tussen links en rechts draaien
    * @param speed snelheid van de motor in cm/s min:5 max:20 cm/s, eg:10
    *
    */
    //% block="rijden %direction met snelheid %speed cm/s" weight=169 group="Motor"
    export function rijdensnelheid(direction: Directions = 20, speed: number): void {
      led.enable (false)
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

      serial.writeLine("rechts:")
      serial.writeNumber(rotationsRight)

      serial.writeLine("left:")
      serial.writeNumber(rotationsLeft)


      if (rotationsRight <= target_rps_rotor) {
        speedRight = speedRight + 10
      }
      if (rotationsRight >= target_rps_rotor) {
        speedRight = speedRight - 10
      }


      if (rotationsLeft <= target_rps_rotor) {
        speedLeft = speedLeft + 10
      }
      if (rotationsLeft >= target_rps_rotor) {
        speedLeft = speedLeft - 10
      }

      basic.pause(500)

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


    //_____________________________________________________________________________________________________//


    /**
    * afstand meting via ultrasoon sensor
    */
    //% block="afstand ultrasoon"
    //% weight=159 group="Sensors"
    export function sonar(): number {
      // send pulse
      led.enable (false);
      let trig = DigitalPin.P6
      let echo = DigitalPin.P7
      let maxCmDistance = 23200

      pins.setPull(trig, PinPullMode.PullNone)
      let d
      for (let x=0; x<10; x++) {
        pins.digitalWritePin(trig, 0)
        control.waitMicros(2)
        pins.digitalWritePin(trig, 1)
        control.waitMicros(15)
        pins.digitalWritePin(trig, 0)
        // read pulse
        d = pins.pulseIn(echo, PulseValue.High, maxCmDistance);
        if (d>0)
          break;
      }
      d = Math.floor(d/58);
      return d;
    }


    //_____________________________________________________________________________________________________//


    /**
    * Rotaties van het rechterwiel
    */
    //% blockId="wheelrotationsRight" block="speed right" weight=98 group="Motor" advanced=true
    export function wheelrotationsRight(): number {
        startOdometrieMonitoring();
        return rotationsRight
    }


    /**
    * rotaties van het linkerwiel
    */
    //% blockId="wheelrotationsLeft" block="speed left" weight=97 group="Motor" advanced=true
    export function wheelrotationsLeft(): number {
        startOdometrieMonitoring();
        return rotationsLeft
    }


    /**
    * Sets up an event on pin 4 pulse high and event handler to increment
    * numWindTurns on said event.  Starts background service to reset
    * numWindTurns every 1 seconds and calculate MPH.
    */
    //% blockId="startOdometrieMonitoring" block="start odometrie" weight=99 group="Motor" advanced=true
    export function startOdometrieMonitoring(): void {
      if (odometrieMonitorStarted) return;

        led.enable (false);
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

        // Update value every 0.5 seconds
        control.inBackground(() => {
          while (true) {
            basic.pause(500)
            rotationsLeft = numRotorTurnsLeft * 2
            numRotorTurnsLeft = 0
          }
        })

        control.inBackground(() => {
            while (true) {
              basic.pause(500)
              rotationsRight = numRotorTurnsRight * 2
              numRotorTurnsRight = 0
            }
        })

        odometrieMonitorStarted = true;
    }




    //% group="Sensors"
    export enum lijnSensor {
        //% blockId="LeftlineSensor" block="links"
        links = 0,
        //% blockId="rightLineSensor" block="rechts"
        rechts = 1
    }
    //% group="Sensors"
    export enum lijnKleur {
        //% blockId="White" block="wit"
        wit = 0,
        //% blockId="Black" block="zwart"
        zwart = 1
    }
    //% group="Sensors"
    export enum voorkantIR {
        //% blockId="OBSTACLE" block="iets"
        zietIets = 0,
        //% blockId="NOOBSTACLE" block="niets"
        zietNiets = 1
    }

    /**
     * Kijk of de IR sensor op de voorkant wel of niet een obstakel ziet
     * @param value - Selecteer of je wilt controleren voor wel- of geen obstakel
     */
    //% blockId=mbit_Avoid_Sensor block="Kijk of de voorkant IR sensor %value ziet"
    //% weight=95 group="Sensors"
    //% blockGap=10
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=12
    export function Avoid_Sensor(value: voorkantIR): boolean {

        let temp: boolean = false;
        pins.setPull(DigitalPin.P9, PinPullMode.PullUp)
        pins.digitalWritePin(DigitalPin.P9, 0);
        control.waitMicros(100);
        switch (value) {
            case voorkantIR.zietIets: {
                serial.writeNumber(pins.analogReadPin(AnalogPin.P3))
                if (pins.analogReadPin(AnalogPin.P3) < 800) {
                
                    temp = true;
                }
                else {                 
                    temp = false;
                }
                break;
            }

            case voorkantIR.zietNiets: {
                if (pins.analogReadPin(AnalogPin.P3) > 800) {

                    temp = true;
                }
                else {
                    temp = false;
                }
                break;
            }
        }
        pins.digitalWritePin(DigitalPin.P9, 1);
        return temp;

    }

    /**
     * Kijk of een lijnsensor wit of zwart ziet
     * @param direct - Kies de linker of rechter sensor
     * @param value - Kies of je wilt controleren voor wit of zwart
     */
    //% blockId=mbit_Line_Sensor block="Kijk op lijnsensor %linksRechts voor kleur %kleur"
    //% weight=94 group="Sensors"
    //% blockGap=10
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=12
    export function Line_Sensor(linksRechts: lijnSensor, kleur: lijnKleur): boolean {

        let temp: boolean = false;

        switch (linksRechts) {
            case lijnSensor.links: {
                if (pins.analogReadPin(AnalogPin.P2) < 500) {
                    if (kleur == lijnKleur.wit) {
                        temp = true;
                    }
                }
                else {
                    if (kleur == lijnKleur.zwart) {
                        temp = true;
                    }
                }
                break;
            }

            case lijnSensor.rechts: {
                if (pins.analogReadPin(AnalogPin.P1) < 500) {
                    if (kleur == lijnKleur.wit) {
                        temp = true;
                    }
                }
                else {
                    if (kleur == lijnKleur.zwart) {
                        temp = true;
                    }
                }
                break;
            }
        }
        return temp;
    }


    //_____________________________________________________________________________________________________//
                //color sensor TCS34725

    const tcs_cdatal = 0x14             /**< Clear channel data low byte */
    const tcs_cdatah = 0x15             /**< Clear channel data high byte */
    const tcs_rdatal = 0x16             /**< Red channel data low byte */
    const tcs_rdatah = 0x17             /**< Red channel data high byte */
    const tcs_gdatal = 0x18             /**< Green channel data low byte */
    const tcs_gdatah = 0x19             /**< Green channel data high byte */
    const tcs_bdatal = 0x1A             /**< Blue channel data low byte */
    const tcs_bdatah = 0x1B             /**< Blue channel data high byte */

    const tcs_adress = 0x29             /**< I2C address **/
    const tcs_command_bit = 0x80        /**< Command bit **/
    const tcs_id = 0x12                 /**< 0x44 = TCS34721/TCS34725, 0x4D = TCS34723/TCS34727 */

    const tcs_enable = 0x00             /**< Interrupt Enable register */
    const tcs_enable_pon = 0x01         /**< Power on - Writing 1 activates the internal oscillator, 0 disables it */
    const tcs_enable_aen = 0x02         /**< RGBC Enable - Writing 1 actives the ADC, 0 disables it */

    const tcs_atime = 0x01              /**< Integration time */
    const tcs_integrationtime = 0xEB    /**< 50.4ms - 21 cycles - Max Count: 21504 */
    const tcs_control = 0x0F            /**< Set the gain level for the sensor */
    const tcs_gain = 0x02               /**< 0x00 = No gain; 0x01 = 4x gain; 0x02 = 16x gain; 0x03 = 60x gain  */

    let tcs_initialised = false

    let red: number = 0
    let green: number = 0
    let blue: number = 0



    export enum TCSkleur {
      rood,
      groen,
      blauw
    }




    function tcs_write(reg: number, value: number): void {
        const tcs_buffer = pins.createBuffer(2)
        tcs_buffer[0] = tcs_command_bit | reg
        tcs_buffer[1] = value & 0xff
        pins.i2cWriteBuffer(tcs_adress, tcs_buffer, false)
    }


    function tcs_read8(reg: number){
        pins.i2cWriteNumber(tcs_adress, tcs_command_bit | reg, NumberFormat.Int8LE)
        return pins.i2cReadNumber(tcs_adress, NumberFormat.Int8LE)
    }

    function tcs_read16(reg: number){
        let x = 0;
        let t = 0;

        pins.i2cWriteNumber(tcs_adress, tcs_command_bit | reg, NumberFormat.Int8LE)
        
        t = pins.i2cReadNumber(tcs_adress, NumberFormat.UInt8LE)
        x = pins.i2cReadNumber(tcs_adress, NumberFormat.UInt8LE)

        return x;

    }



    //% block="init kleuren sensor"
    //% weight=154 group="Sensors" advanced=true

    export function tcs_init():boolean{
        let x = 0
        //serial.writeNumber(x)        
        //serial.writeLine("Connected?")

        x = tcs_read8(tcs_id)
        //serial.writeNumber(x)

        if ((x != 0x4d) && (x != 0x44) && (x != 0x10)) {
            //serial.writeLine("NOOOO")
            return false;
        }
        tcs_write(tcs_atime, tcs_integrationtime)
        tcs_write(tcs_control, tcs_gain)

        tcs_write(tcs_enable, tcs_enable_pon)
        basic.pause(3);
        tcs_write(tcs_enable, tcs_enable_pon | tcs_enable_aen)
        /* Set a delay for the integration time.
        This is only necessary in the case where enabling and then
        immediately trying to read values back. This is because setting
        AEN triggers an automatic integration, so if a read RGBC is
        performed too quickly, the data is not yet valid and all 0's are
        returned */
        /* 12/5 = 2.4, add 1 to account for integer truncation */
        basic.pause((256 - tcs_integrationtime) * 12 / 5 + 1);
        //serial.writeLine("YEEAAHHH")

        tcs_initialised = true;
        return true;
    }




    //% block="kleuren sensor uitlezen"
    //% weight=153 group="Sensors" advanced=true
    export function tcs_data() :void{
        if (!tcs_initialised){
            tcs_init();
        }
        let rawRed = 0
        let rawGreen = 0
        let rawBlue = 0

        for ( let i = 0; i < 10; i++){
            rawRed = rawRed + tcs_read16(tcs_rdatal)
            rawGreen = rawGreen + tcs_read16(tcs_gdatal)
            rawBlue = rawBlue + tcs_read16(tcs_bdatal)
        }
        red = rawRed / 10
        green = rawGreen / 10
        blue = rawBlue / 10

        /*
        serial.writeValue("red", red)
        serial.writeValue("green", green)
        serial.writeValue("blue", blue)
        serial.writeLine("-")
        */
    }

    //% blockId="redIs" block="rood is" weight=152 group="Sensors" advanced=true
    export function redIs(): number {
        tcs_data();
        return red
    }

    //% blockId="greenIs" block="groen is" weight=151 group="Sensors" advanced=true
    export function greenIs(): number {
        tcs_data();
        return green
    }

    //% blockId="blueIs" block="blauw is" weight=150 group="Sensors" advanced=true
    export function blueIs(): number {
        tcs_data();
        return blue
    }    
    
    //% block="kleur is rood"
    //% weight=149 group="Sensors""
    export function roodtrue():boolean{
        tcs_data();
        if ((red<125) && (green>125) && (blue>125)){
            serial.writeLine("het is rood")
            return true
        }
        return false
    }
    
    //% block="kleur is groen"
    //% weight=148 group="Sensors""
    export function groentrue():boolean{
        tcs_data();
        if ((red>125) && (green<125) && (blue>125)){
            serial.writeLine("het is groen")
            return true
        }
        return false
    }

    //% block="kleur is blauw"
    //% weight=147 group="Sensors""
    export function blauwtrue():boolean{
        tcs_data();
        if ((red>125) && (green>125) && (blue<125)){
            serial.writeLine("het is blauw")
            return true
        }
        return false
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    /**
    * tcs34725 kleur uitlezen
    * @param colorIs - (enum tcskleur)
    * @param body TODO
    */ 
    //% block="kleur sensor is %colorIs " weight=152 group="Sensors"
    /*
    export function colorRead(colorIs: TCSkleur, body: () => void): void {
        tcs_data();
        serial.writeValue("red", red)
        serial.writeValue("green", green)
        serial.writeValue("blue", blue)
        serial.writeLine("-")

        if((colorIs === TCSkleur.rood) && (red<125) && (green>125) && (blue>125)) {
            serial.writeLine("rood hier")
        }
        
        while((colorIs === TCSkleur.groen) && (red>125) && (green<125) && (blue>125)) {
            serial.writeLine("groen hier")
        }
        
        while((colorIs === TCSkleur.blauw) && (red>125) && (green>125) && (blue<125)) {
            serial.writeLine("blauw hier")
        }
    }
    */    

}

