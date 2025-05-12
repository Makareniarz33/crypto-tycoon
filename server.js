// server.js
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

let prices = {
  BTC: 30000,
  KTY: 1,
  ZAZ: 2.5,
  DGC: 0.0001,
  XTR: 10
};

function updatePrices() {
  for (let coin in prices) {
    let volatility = coin === 'XTR' ? prices[coin] * 0.5 :
                     coin === 'BTC' ? 50 : 
                     coin === 'DGC' ? 0.0001 : 1;
    const change = (Math.random() - 0.5) * volatility;
    prices[coin] = Math.max(0.00001, parseFloat((prices[coin] + change).toFixed(6)));
  }
}
setInterval(updatePrices, 1000);

app.get('/prices', (req, res) => {
  res.json(prices);
});

app.listen(3000, () => {
  console.log('🟢 Serwer działa na http://localhost:3000');
});
