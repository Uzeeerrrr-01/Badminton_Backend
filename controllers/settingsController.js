import TournamentSettings from "../models/TournamentSettings.js";

export async function getSettings(req, res) {
  try {
    let settings = await TournamentSettings.findOne({ id: "default" });
    if (!settings) {
      settings = await TournamentSettings.create({ id: "default" });
    }
    return res.json({ settings });
  } catch (error) {
    console.error("GetSettings error:", error);
    return res.status(500).json({ error: "Failed to retrieve tournament settings." });
  }
}

export async function updateSettings(req, res) {
  try {
    const data = req.body;
    let settings = await TournamentSettings.findOne({ id: "default" });
    if (!settings) {
      settings = new TournamentSettings({ id: "default" });
    }

    Object.assign(settings, data);
    settings.updated_at = new Date();
    await settings.save();

    return res.json({ success: true, settings });
  } catch (error) {
    console.error("UpdateSettings error:", error);
    return res.status(500).json({ error: "Failed to update tournament settings." });
  }
}
