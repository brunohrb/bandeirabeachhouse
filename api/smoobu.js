export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://api.smoobu.com/reservations",
      {
        headers: {
          "Api-Key": process.env.SMOOBU_API_KEY,
          "Accept": "application/json"
        }
      }
    );

    const text = await response.text();
    res.status(200).send(text);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
