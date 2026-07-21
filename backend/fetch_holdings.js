import axios from 'axios';
import sectorBasket from './config/sectorBasket.js';

async function fetchAll() {
  const allHoldings = {};
  for (const [sector, data] of Object.entries(sectorBasket)) {
    for (const fund of data.funds) {
      if (fund.region === 'india') {
        try {
          const res = await axios.get(`http://localhost:5001/api/assets/mf/${fund.id}/detail`);
          const holdings = res.data.data?.holdings || res.data.holdings;
          allHoldings[fund.name] = holdings || [];
        } catch(e) {
          allHoldings[fund.name] = [{ stock: 'Error fetching', allocationPct: 0 }];
        }
      }
    }
  }
  
  // Format as Markdown
  let md = "# Indian Mutual Fund Holdings (Current State)\n\n";
  md += "> [!WARNING]\n> **Data Source Note:** The primary data source (`mfdata.in`) is currently returning Cloudflare Error 522 (Connection Timed Out) and FinAPI (`upvaly.com`) is unresolvable. Because of this, the application is currently displaying **mock, auto-generated holdings** for all Indian mutual funds in order to prevent the UI from crashing or displaying blanks. These values are mathematically generated based on the scheme codes.\n\n";
  
  for (const [name, holdings] of Object.entries(allHoldings)) {
    md += `### ${name}\n`;
    if (!holdings || holdings.length === 0) {
      md += "No holdings data available.\n\n";
    } else {
      md += "| Stock | Allocation (%) |\n| :--- | :--- |\n";
      holdings.forEach(h => {
        md += `| ${h.stock} | ${h.allocation || h.allocationPct}% |\n`;
      });
      md += "\n";
    }
  }
  
  import('fs').then(fs => fs.writeFileSync('holdings_dump.md', md));
  console.log('Wrote to holdings_dump.md');
}
fetchAll();
