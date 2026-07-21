import fs from 'fs';

// 1. YahooFinanceService
let yf = fs.readFileSync('backend/services/YahooFinanceService.js', 'utf-8');
yf = yf.replace(
`      return (res.quotes || [])
        .filter(q => q.quoteType === 'EQUITY')
        .map(q => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          sector: q.sector || 'General',
          exchange: q.exchange
        }));
    } catch (err) {
      console.error('Yahoo Finance search error:', err.message);
      return [];
    }`,
`      const data = (res.quotes || [])
        .filter(q => q.quoteType === 'EQUITY')
        .map(q => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          sector: q.sector || 'General',
          exchange: q.exchange
        }));
      return { available: true, data };
    } catch (err) {
      console.error('Yahoo Finance search error:', err.message);
      return { available: false, reason: err.message, data: [] };
    }`
);

yf = yf.replace(
`      const resolved = await Promise.all(promises);
      return resolved.filter(Boolean);
    } catch (err) {
      console.error('Yahoo Finance batch quotes error:', err.message);
      return [];
    }`,
`      const resolved = await Promise.all(promises);
      const data = resolved.filter(Boolean);
      return { available: data.length > 0, data };
    } catch (err) {
      console.error('Yahoo Finance batch quotes error:', err.message);
      return { available: false, reason: err.message, data: [] };
    }`
);

yf = yf.replace(
`        earliestDate: q.firstTradeDateMilliseconds || null,
        support,
        resistance,
        sector: 'General'
      };
    } catch (err) {
      console.error(\`Yahoo Finance getQuoteDetail error for \${symbol}:\`, err.message);
      return null;
    }`,
`        earliestDate: q.firstTradeDateMilliseconds || null,
        support,
        resistance,
        sector: 'General'
      };
      return { available: true, data: result };
    } catch (err) {
      console.error(\`Yahoo Finance getQuoteDetail error for \${symbol}:\`, err.message);
      return { available: false, reason: err.message, data: null };
    }`
);
yf = yf.replace(
`      if (!q) return null;`,
`      if (!q) return { available: false, reason: 'Quote not found', data: null };`
);

yf = yf.replace(
`      if (!res || !res.quotes || res.quotes.length === 0) {
        return [];
      }`,
`      if (!res || !res.quotes || res.quotes.length === 0) {
        return { available: false, reason: 'No chart data', data: [] };
      }`
);

yf = yf.replace(
`      this.calculateIndicators(candles);
      if (res.meta && res.meta.firstTradeDate) {
        candles.earliestDate = res.meta.firstTradeDate * 1000;
      }
      return candles;
    } catch (err) {
      console.error(\`Yahoo Finance chart data error for \${symbol}:\`, err.message);
      return [];
    }`,
`      this.calculateIndicators(candles);
      if (res.meta && res.meta.firstTradeDate) {
        candles.earliestDate = res.meta.firstTradeDate * 1000;
      }
      return { available: true, data: candles };
    } catch (err) {
      console.error(\`Yahoo Finance chart data error for \${symbol}:\`, err.message);
      return { available: false, reason: err.message, data: [] };
    }`
);

fs.writeFileSync('backend/services/YahooFinanceService.js', yf);

