// Placeholder API route for updating settings
// POST /api/update-setting
// Expected body: { settingKey: "...", subKey: "...", value: "..." }
// Or: { settingKey: "...", values: { subKey1: "val1", ... } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { settingKey, subKey, value, values } = req.body;

    console.log('Received request to update setting:');
    console.log('Setting Key:', settingKey);
    if (subKey !== undefined) console.log('Sub Key:', subKey);
    if (value !== undefined) console.log('Value:', value);
    if (values !== undefined) console.log('Values:', values);

    // TODO: Implement actual settings update logic here.
    // This could involve:
    // 1. Validating the settingKey, subKey, and value/values.
    // 2. Storing the settings in a database or a configuration file on the server.
    // 3. Triggering actions based on the setting change (e.g., reloading NGINX if NGINX settings were changed).
    // 4. Broadcasting the change to connected clients via WebSockets if real-time UI updates are needed.

    // For now, just acknowledge the request.
    res.status(200).json({ 
      message: 'Setting update request received successfully.', 
      received: req.body 
    });

  } catch (error) {
    console.error('Error in /api/update-setting:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
