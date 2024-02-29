// src/index.ts
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();
const app: Express = express();
app.use(express.json())

const port = process.env.PORT || 3000;

app.get("/health-check", (req: Request, res: Response) => {
  res.send("health check OK");
});

interface CurrencyRate {
  currency: string;
  price_pln: string; // decimal value
  date: string;
}

// map of currency rates by currency and by date
const rates = new Map<string, Map<string, CurrencyRate>>();

/*
Handle the 
POST http://localhost:3000/currency
Content-Type: application/json

{
  "currencies": [
    {
      "currency": "EUR",
      "price_pln": "4.31",
      "date": "2023-01-01"
    },
    {
      "currency": "USD",
      "price_pln": "3.98",
      "date": "2023-01-01"
    }
  ]
}
*/
app.post("/currency", (req: Request, res: Response) => {
  console.log(req.body);
  // read CurrencyRate list from request
  const currencyRates = req.body.currencies as CurrencyRate[];
  // store currency rates in the map
  currencyRates.forEach((currencyRate) => {
    const currencyMap = rates.get(currencyRate.currency) || new Map<string, CurrencyRate>();
    currencyMap.set(currencyRate.date, currencyRate);
    rates.set(currencyRate.currency, currencyMap);
  });
  res.send("OK");
});

/*
 Handle
 GET http://localhost:3000/currency
 response like:
 {
    "currencies": [
        {
            "currency": "EUR",
            "price_pln": "4.31",
            "date": "2023-01-01"
        },
        {
            "currency": "USD",
            "price_pln": "3.98",
            "date": "2023-01-01"
        }
]}
 */

app.get("/currency", (req: Request, res: Response) => {
  // return flat list of currencies from currencyRates
  const currencyRates = Array.from(rates.values()).map((currencyMap) => Array.from(currencyMap.values())).flat();
  res.send({ currencies: currencyRates });
});
/*
  Handle
  POST http://localhost:3000/currencyExchange
Content-Type: application/json

{
  "from_currency": "EUR",
  "to_currency": "PLN",
  "amount": 123.33,
  "date": "2023-01-01"
}

Respond with
{
    "currency": "PLN",
    "value":  531.5523,
    "date": "2023-01-01"
}
 */

app.post("/currencyExchange", (req: Request, res: Response) => {
  const fromCurrency = req.body.from_currency as string;
  const toCurrency = req.body.to_currency as string;
  const amount = req.body.amount as number;
  const date = req.body.date as string;
  function getRate(currency: string) {
    if (currency === "PLN")
      return { currency: "PLN", price_pln: "1", date };
    return rates.get(currency)?.get(date);
  }
  const fromCurrencyRate = getRate(fromCurrency);
  const toCurrencyRate = getRate(toCurrency);
  if (!fromCurrencyRate || !toCurrencyRate) {
    res.status(400).send("No data for currency or date");
    return;
  }
  // calculate the value with decimal math fixed to 4 decimal places
  const value = (amount * Number(fromCurrencyRate.price_pln) / Number(toCurrencyRate.price_pln)).toFixed(4);
  res.send({ currency: toCurrency, value: Number(value), date });
});

/* Start the Express app and listen
 for incoming requests on the specified port */
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
