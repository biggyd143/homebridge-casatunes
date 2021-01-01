
<p align="center">

<img src="https://uploads-ssl.webflow.com/5995af6e456ddb0001a911be/59a317f3b4ef790001d6e364_ct-circle-logo-p-500.png" width="150">

</p>


# Homebridge CasaTunes Plugin

<a href="https://www.casatunes.com/">CasaTunes</a> is a company that offers a wide range of music servers, as well as amplifiers, to provide whole home audio solutions. They have iOS and Android apps, integrate with a variety of control systems, and even Alexa voice control. However, one thing that's missing is integration with HomeKit, which is where this plugin may come in handy.

This plugin utilizes the CasaTunes REST based API and is based off the <a href="https://github.com/homebridge/homebridge-plugin-template">Homebridge Platform Plugin Template</a>. It will create a Homebridge accessory for each non-Airplay CasaTunes zone that is set up in the server. At the time of this write up, the Speaker service is unsupported in the Home app, so the accessories will appear as light bulbs which you can turn on/off and adjust the brightness (volume). When a zone gets turned on, it will use the same source that it last left on.

## Installation

Run the below command to install the plugin:

```
npm install -g homebridge-casatunes
```

If you are using Homebridge Config UI, you can optionally install the plugin by clicking on the `Plugins` tab and searching for `homebridge-casatunes`.

## Configuration

Below is a sample entry from the Homebridge `config.json` file.

```js
"platforms": [
    {
        "uri": "http://casaserver:8735/api/v1",
        "platform": "CasaTunes"
    }
]
```

The URI value can be found by navigating to the below loctions in your browser:

* PC: `http://casaserver/casadev`
* MAC: `http://casaserver.local/casadev`
* Other: `http://<IP Address of CasaTunes music server>/casadev`
