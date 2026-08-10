const { vesselIcon, sendWaypoint } = require('../waypoint');

const regex = /waypoint (.+?)(?: ([0-9]+)h)?\s*$/i;

/*
Signal K stores communication values as objects:
shortName: {
value: '9829',
timestamp: ...,
source: ...
}

This helper returns the actual value regardless of whether
Signal K gives us a value object or a plain value.
*/
function signalKValue(value) {
if (value && typeof value === 'object' && 'value' in value) {
return value.value;
}
return value;
}

module.exports = {
crewOnly: true,
example: 'Waypoint <callsign, boat name or Meshtastic short name>',

accept: (msg) => {
const waypointTgt = msg.data.match(regex);
return !!waypointTgt;
},

handle: (msg, settings, device, app, create, Protobuf) => {
const waypointTgt = msg.data.match(regex);

if (!waypointTgt) {
  return;
}

const identifier = waypointTgt[1].trim().normalize('NFC');
const lIdentifier = identifier.toLowerCase();

// Optional duration, e.g. "Waypoint AB 2h"
const length = Number(waypointTgt[2] || 1);

const waypointVesselCtx = Object.keys(app.signalk.root.vessels)
  .find((vesselCtx) => {
    const vessel = app.signalk.root.vessels[vesselCtx];

    /*
     * Read Signal K communication values.
     * These may be value objects rather than plain strings.
     */
    const shortName = signalKValue(
      vessel.communication?.meshtastic?.shortName,
    );

    const longName = signalKValue(
      vessel.communication?.meshtastic?.longName,
    );

    const nodeNum = signalKValue(
      vessel.communication?.meshtastic?.nodeNum,
    );

    /*
     * 1. MMSI
     */
    if (
      vessel.mmsi
      && String(vessel.mmsi).trim() === identifier
    ) {
      return true;
    }

    /*
     * 2. Normal Signal K vessel name
     */
    if (
      vessel.name
      && String(vessel.name)
        .trim()
        .normalize('NFC')
        .toLowerCase() === lIdentifier
    ) {
      return true;
    }

    /*
     * 3. AIS callsign
     */
    const callsign = signalKValue(
      vessel.communication?.callsignVhf,
    );

    if (
      callsign
      && String(callsign)
        .trim()
        .normalize('NFC')
        .toLowerCase() === lIdentifier
    ) {
      return true;
    }

    /*
     * 4. Meshtastic short name
     *
     * Example:
     *   shortName = "9829"
     */
    if (
      shortName
      && String(shortName)
        .trim()
        .normalize('NFC')
        .toLowerCase() === lIdentifier
    ) {
      return true;
    }

    /*
     * 5. Meshtastic long name
     *
     * The long name is normally also available as vessel.name,
     * but check the Meshtastic value explicitly as well.
     */
    if (
      longName
      && String(longName)
        .trim()
        .normalize('NFC')
        .toLowerCase() === lIdentifier
    ) {
      return true;
    }

    /*
     * 6. Meshtastic node number
     */
    if (
      nodeNum != null
      && String(nodeNum).trim() === identifier
    ) {
      return true;
    }

    return false;
  });

if (!waypointVesselCtx) {
  return device.sendText(
    `Unable to find vessel ${identifier}`,
    msg.from,
    true,
    false,
  );
}

const waypointVessel = app.signalk.root.vessels[waypointVesselCtx];

const position = waypointVessel.navigation?.position?.value;

if (
  position?.latitude == null
  || position?.longitude == null
) {
  return device.sendText(
    `Vessel ${identifier} has no known position`,
    msg.from,
    true,
    false,
  );
}

/*
 * Use the best available name for the waypoint.
 */
const shortName = signalKValue(
  waypointVessel.communication?.meshtastic?.shortName,
);

const longName = signalKValue(
  waypointVessel.communication?.meshtastic?.longName,
);

const waypointName =
  waypointVessel.name
  || longName
  || shortName
  || waypointVessel.mmsi
  || identifier;

const waypointIcon = vesselIcon(waypointVessel);

return sendWaypoint(
  waypointVessel.mmsi,
  position,
  waypointName,
  `AIS vessel ${waypointVessel.mmsi || identifier}`,
  waypointIcon,
  length,
  msg.from,
  device,
  create,
  Protobuf,
);

},
};
