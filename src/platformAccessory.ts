import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { CasaTunesHomebridgePlatform } from './platform';
import { fetch } from 'cross-fetch';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class CasaTunesPlatformAccessory {
  private service: Service;

  // The specific CasaTunes zond ID for the accessory.
  private zoneId = '';

  constructor(
    private readonly platform: CasaTunesHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, 'N/A')
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.platform.getPlatformInfo().Manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.platform.getPlatformInfo().Model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'N/A')
      .setCharacteristic(this.platform.Characteristic.SoftwareRevision, this.platform.getPlatformInfo().SoftwareRevision);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    //
    // Note: The Speaker service is unsupported in the Home app, but we can use the LightBulb
    // to turn on/off and set the volume.
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.Name + ' Speakers');

    // each service must implement at-minimum the "required characteristics" for the given service type

    // register handlers for the On Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOn.bind(this))  // SET - bind to the `setOn` method below
      .on('get', this.getOn.bind(this)); // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .on('set', this.setVolume.bind(this))  // SET - bind to the 'setVolume` method below
      .on('get', this.getVolume.bind(this)); // GET - bind to the 'getVolume' method below
  }

  /**
   * This method stores the accessory's zone ID for CasaTunes API calls.
   */
  setZoneId(id: string) {
    // Store the zone ID.
    this.zoneId = id;

    this.platform.log.debug('Set ' + this.accessory.displayName + ' zone ID ->', this.zoneId);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn = async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
    // Throw an error if the URI isn't defined in the config.
    if (this.platform.getCasaTunesURI().match('undefined')) {
      this.platform.log.error('URI for CasaTunes API is not defined in the config');
    } else {
      // The URI for CasaTunes REST API to fetch the zone info.
      const uri = this.platform.getCasaTunesURI() + '/zones/' + this.zoneId + '?Power=' + value;
      
      // Wait for the response.
      await fetch(uri);

      this.platform.log.debug('Set ' + this.accessory.displayName + ' Characteristic On ->', value);

      // you must call the callback function
      callback(null);
    }
  };

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   * 
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   * 
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  getOn = async (callback: CharacteristicGetCallback) => {
    // Throw an error if the URI isn't defined in the config.
    if (this.platform.getCasaTunesURI().match('undefined')) {
      this.platform.log.error('URI for CasaTunes API is not defined in the config');
    } else {
      // The URI for CasaTunes REST API to fetch the zone info.
      const uri = this.platform.getCasaTunesURI() + '/zones/' + this.zoneId;
      
      // Wait for the response.
      const response = await fetch(uri);

      // Wait for the JSON.
      const info = await response.json();

      // Fetch the Power property.
      const isOn = info.Power;

      this.platform.log.debug('Get ' + this.accessory.displayName + ' Characteristic On ->', isOn);

      // you must call the callback function
      // the first argument should be null if there were no errors
      // the second argument should be the value to return
      callback(null, isOn);
    }
  };

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  setVolume = async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
    // Throw an error if the URI isn't defined in the config.
    if (this.platform.getCasaTunesURI().match('undefined')) {
      this.platform.log.error('URI for CasaTunes API is not defined in the config');
    } else {
      // The URI for CasaTunes REST API to fetch the zone info.
      const uri = this.platform.getCasaTunesURI() + '/zones/' + this.zoneId + '?Volume=' + value;
      
      // Wait for the response.
      await fetch(uri);

      this.platform.log.debug('Set ' + this.accessory.displayName + ' Characteristic Volume ->', value);

      // you must call the callback function
      callback(null);
    }
  };

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, getting the brightness.
   */
  getVolume = async (callback: CharacteristicGetCallback) => {
    // Throw an error if the URI isn't defined in the config.
    if (this.platform.getCasaTunesURI().match('undefined')) {
      this.platform.log.error('URI for CasaTunes API is not defined in the config');
    } else {
      // The URI for CasaTunes REST API to fetch the zone info.
      const uri = this.platform.getCasaTunesURI() + '/zones/' + this.zoneId;
      
      // Wait for the response.
      const response = await fetch(uri);

      // Wait for the JSON.
      const info = await response.json();

      // Fetch the Volume property.
      const volume = info.Volume;

      this.platform.log.debug('Get ' + this.accessory.displayName + ' Characteristic Volume ->', volume);

      // you must call the callback function
      callback(null, volume);
    }
  };
}
