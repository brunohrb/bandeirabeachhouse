export default async function handler(req, res) {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      res.status(400).json({ error: "Datas inválidas" });
      return;
    }

    const response = await fetch(
      `https://api.smoobu.com/reservations?arrivalFrom=${start}&arrivalTo=${end}`,
      {
        headers: {
          "Api-Key": process.env.SMOOBU_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao acessar o Smoobu");
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
