export default async function handler(req, res) {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      res.status(400).json({ error: "Datas inválidas" });
      return;
    }

 const response = await fetch(
  `https://api.smoobu.com/reservations`,
  {
    method: "GET",
    headers: {
      "Api-Key": process.env.SMOOBU_API_KEY,
      "Accept": "application/json"
    }
  }
);


    if (!response.ok) {
      throw new Error("Erro ao acessar o Smoobu");
    }

const text = await response.text();
res.status(200).send(text);


  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
