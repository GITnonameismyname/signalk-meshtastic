module.exports = (app, message) => {
  if (!message || !message.data) {
    return;
  }

  app.handleMessage('signalk-meshtastic', {
    context: 'vessels.self',
    updates: [
      {
        source: {
          label: 'signalk-meshtastic',
        },
        timestamp: new Date().toISOString(),
        values: [
          {
            path: 'communication.meshtastic.rx',
            value: {
                text: message.data,
                from: message.from,
                timestamp: new Date().toISOString(),
            }
          },
        ],
      },
    ],
  });
};
