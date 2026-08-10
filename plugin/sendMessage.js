module.exports = async (device, value, nodes) => {
  if (!device || !value || !value.text) {
    return;
  }

  let destination = value.to || 'broadcast';

  if (typeof destination === 'string'
      && destination !== 'broadcast'
      && destination !== 'self') {
      const nodeId = Object.keys(nodes).find(
        (nodeNum) => nodes[nodeNum].shortName === destination,
      );

    if (!nodeId) {
      throw new Error(`Meshtastic node with short name "${destination}" not found`);
    }

    destination = Number(nodeId);
  }

  await device.sendText(
    value.text,
    destination,
    true,
  );
};
