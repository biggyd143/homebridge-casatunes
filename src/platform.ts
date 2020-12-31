import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { CasaTunesPlatformAccessory } from './platformAccessory';
import { fetch } from 'cross-fetch';

// Interface definition for the zone information.
interface zoneInfo {
  Name: string;
  ID: string;
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class CasaTunesHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // Used to store the results from fetchPlatformInfo().
  private platformInfo = {
    Manufacturer: '',
    Model: '',
    SoftwareRevision: '',
  };

  // this is used to track restored cached accessories
  private readonly accessories: PlatformAccessory[] = [];

  // This is used to store the URI for the CasaTunes API from the config.
  private casaTunesUri = '';

  // This is used to track the fetched zones from CasaTunes.
  private zonesArray: zoneInfo[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // Store the URI string from the config.
    this.casaTunesUri = String(this.config.uri);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // Call the method to get the platform information (manufacturer, model, etc.).
      await this.fetchPlatformInfo();
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This method returns the URI for the CasaTunes API.
   */
  getCasaTunesURI() {
    return this.casaTunesUri;
  }

  /**
   * This method returns the platform information.
   */
  getPlatformInfo() {
    return this.platformInfo;
  }

  /**
   * This method fetches the platform information from CasaTunes.
   */
  fetchPlatformInfo = async () => {
    // Throw an error if the URI isn't defined in the config.
    if (this.casaTunesUri.match('undefined')) {
      this.log.error('URI for CasaTunes API is not defined in the config');
    } else {
      // The URI for CasaTunes REST API to fetch the platform info.
      const uri = this.casaTunesUri + '/system/info';
      
      // Wait for the response.
      const response = await fetch(uri);

      // Wait for the JSON.
      const info = await response.json();

      // Store the results from the JSON.
      this.platformInfo.Manufacturer = info.AppName;
      this.platformInfo.Model = info.MatrixInfo[0].Title;
      this.platformInfo.SoftwareRevision = info.CasaTunesVersion;

      const matrixString = 'Matrix: ';

      // Strip out the "Matrix: " string if it exists.
      if (this.platformInfo.Model.includes(matrixString)) {
        this.platformInfo.Model =
          this.platformInfo.Model.substring(matrixString.length, this.platformInfo.Model.length);
      }

      this.log.debug(
        'Manufacturer = ' + this.platformInfo.Manufacturer +
        ', Model = ' + this.platformInfo.Model +
        ', Software Revision = ' + this.platformInfo.SoftwareRevision);
    }
  };

  /**
   * This method fetches the zones from CasaTunes.
   */
  fetchZones = async () => {
    // Throw an error if the URI isn't defined in the config.
    if (this.casaTunesUri.match('undefined')) {
      this.log.error('URI for CasaTunes API is not defined in the config');
    } else {
      // The URI for CasaTunes REST API to fetch the zones.
      const uri = this.casaTunesUri + '/zones';
      
      // Wait for the response.
      const response = await fetch(uri);

      // Wait for the JSON.
      const zones = await response.json();

      // A counter for the zonesArray index.
      let count = 0;

      // Loop through each zone in the JSON and store in the public array.
      for (let i=0; i<zones.length; i++) {
        // Leave out the AirPlay devices which have a @ symbol in the persistent zone ID.
        if (!zones[i].PersistentZoneID.includes('@')) {
          this.log.debug('Found Zone: name = ' + zones[i].Name + ', id = ' + zones[i].PersistentZoneID);

          // Initialize a zoneInfo variable.
          const temp = {Name: zones[i].Name, ID: zones[i].PersistentZoneID} as zoneInfo;

          // Store the zoneInfo variable in the public array.
          this.zonesArray[count] = temp;

          // Increment the counter.
          count++;
        }
      }
    }
  };

  /**
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices = async () => {
    // Get the zones from CasaTunes.
    await this.fetchZones();

    // loop over the discovered devices and register each one if it has not already been registered
    for (const zone of this.zonesArray) {
      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(zone.ID);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        const casatunesAccessory = new CasaTunesPlatformAccessory(this, existingAccessory);

        // Store the zone ID for CasaTunes API calls.
        casatunesAccessory.setZoneId(zone.ID);
        
        // update accessory cache with any changes to the accessory details and information
        this.api.updatePlatformAccessories([existingAccessory]);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', zone.Name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(zone.Name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = zone;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new CasaTunesPlatformAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // Loop over the accessories cache and unregister the ones that have not been discovered.
    for (const accessory of this.accessories) {
      // See if any of the discovered device's uuid match the accessory's uuid.
      const existingDevice = this.zonesArray.find(zone => this.api.hap.uuid.generate(zone.ID) === accessory.UUID);

      if (!existingDevice) {
        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.info('Removing existing accessory from cache:', accessory.displayName);
      }
    }
  };
}
