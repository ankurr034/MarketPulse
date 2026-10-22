import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yahooFinanceService from './YahooFinanceService.js';
import quarterlyRevenueService from './QuarterlyRevenueService.js';
import marketDataGateway from './MarketDataGateway.js';
import athBaseService from './AthBaseService.js';
import { getIndianMarketSession, KNOWN_GLOBAL_SYMBOLS } from './MarketDataValidator.js';
import { runWithConcurrencyLimit, withTimeout } from '../utils/concurrencyLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MASTER_PATH = path.join(__dirname, '../data/indian_equity_master.json');

// INDIAN SECTORS (13 Nifty sectors)
const INDIAN_SECTORS = [
  {
    id: 'nifty-bank',
    name: 'Nifty Bank',
    region: 'india',
    assetClass: 'stocks',
    indexTicker: '^NSEBANK',
    etfTicker: 'BANKBEES.NS',
    stocks: [
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
      { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
      { symbol: 'SBIN.NS', name: 'State Bank of India' },
      { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
      { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank' },
      { symbol: 'BANKBARODA.NS', name: 'Bank of Baroda' },
      { symbol: 'PNB.NS', name: 'Punjab National Bank' },
      { symbol: 'IDFCFIRSTB.NS', name: 'IDFC First Bank' },
      { symbol: 'FEDERALBNK.NS', name: 'Federal Bank' }
    ]
  },
  {
    id: 'nifty-it',
    name: 'Nifty IT',
    region: 'india',
    indexTicker: '^CNXIT',
    etfTicker: 'ITBEES.NS',
    stocks: [
      { symbol: 'TCS.NS', name: 'TCS' },
      { symbol: 'INFY.NS', name: 'Infosys' },
      { symbol: 'HCLTECH.NS', name: 'HCL Tech' },
      { symbol: 'WIPRO.NS', name: 'Wipro' },
      { symbol: 'TECHM.NS', name: 'Tech Mahindra' },
      { symbol: 'PERSISTENT.NS', name: 'Persistent Systems' },
      { symbol: 'COFORGE.NS', name: 'Coforge' },
      { symbol: 'MPHASIS.NS', name: 'Mphasis' },
      { symbol: 'LTTS.NS', name: 'L&T Technology Services' },
      { symbol: 'TATAELXSI.NS', name: 'Tata Elxsi' }
    ]
  },
  {
    id: 'nifty-auto',
    name: 'Nifty Auto',
    region: 'india',
    indexTicker: '^CNXAUTO',
    etfTicker: 'AUTOBEES.NS',
    stocks: [
      { symbol: 'TMCV.NS', name: 'Tata Motors (Commercial)' },
      { symbol: 'TMPV.NS', name: 'Tata Motors Passenger Vehicles' },
      { symbol: 'M&M.NS', name: 'Mahindra & Mahindra' },
      { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
      { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto' },
      { symbol: 'EICHERMOT.NS', name: 'Eicher Motors' },
      { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp' },
      { symbol: 'ASHOKLEY.NS', name: 'Ashok Leyland' },
      { symbol: 'BALKRISIND.NS', name: 'Balkrishna Industries' },
      { symbol: 'TVSMOTOR.NS', name: 'TVS Motor Company' }
    ]
  },
  {
    id: 'nifty-pharma',
    name: 'Nifty Pharma',
    region: 'india',
    indexTicker: '^CNXPHARMA',
    etfTicker: 'PHARMABEES.NS',
    stocks: [
      { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
      { symbol: 'DRREDDY.NS', name: 'Dr. Reddys' },
      { symbol: 'CIPLA.NS', name: 'Cipla' },
      { symbol: 'DIVISLAB.NS', name: 'Divis Labs' },
      { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals' },
      { symbol: 'LUPIN.NS', name: 'Lupin' },
      { symbol: 'AUROPHARMA.NS', name: 'Aurobindo Pharma' },
      { symbol: 'BIOCON.NS', name: 'Biocon' },
      { symbol: 'MANKIND.NS', name: 'Mankind Pharma' },
      { symbol: 'ZYDUSLIFE.NS', name: 'Zydus Lifesciences' }
    ]
  },
  {
    id: 'nifty-fmcg',
    name: 'Nifty FMCG',
    region: 'india',
    indexTicker: '^CNXFMCG',
    stocks: [
      { symbol: 'ITC.NS', name: 'ITC' },
      { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
      { symbol: 'NESTLEIND.NS', name: 'Nestle India' },
      { symbol: 'BRITANNIA.NS', name: 'Britannia' },
      { symbol: 'GODREJCP.NS', name: 'Godrej Consumer' },
      { symbol: 'DABUR.NS', name: 'Dabur India' },
      { symbol: 'MARICO.NS', name: 'Marico' },
      { symbol: 'COLPAL.NS', name: 'Colgate Palmolive' },
      { symbol: 'TATACONSUM.NS', name: 'Tata Consumer' },
      { symbol: 'VBL.NS', name: 'Varun Beverages' }
    ]
  },
  {
    id: 'nifty-metal',
    name: 'Nifty Metal',
    region: 'india',
    indexTicker: '^CNXMETAL',
    stocks: [
      { symbol: 'TATASTEEL.NS', name: 'Tata Steel' },
      { symbol: 'JSWSTEEL.NS', name: 'JSW Steel' },
      { symbol: 'HINDALCO.NS', name: 'Hindalco' },
      { symbol: 'COALINDIA.NS', name: 'Coal India' },
      { symbol: 'VEDL.NS', name: 'Vedanta' },
      { symbol: 'NMDC.NS', name: 'NMDC' },
      { symbol: 'SAIL.NS', name: 'SAIL' },
      { symbol: 'NATIONALUM.NS', name: 'National Aluminium' },
      { symbol: 'JINDALSTEL.NS', name: 'Jindal Steel & Power' }
    ]
  },
  {
    id: 'nifty-energy',
    name: 'Nifty Energy',
    region: 'india',
    indexTicker: '^CNXENERGY',
    stocks: [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
      { symbol: 'NTPC.NS', name: 'NTPC' },
      { symbol: 'POWERGRID.NS', name: 'Power Grid' },
      { symbol: 'ONGC.NS', name: 'ONGC' },
      { symbol: 'BPCL.NS', name: 'BPCL' },
      { symbol: 'IOC.NS', name: 'Indian Oil' },
      { symbol: 'ADANIGREEN.NS', name: 'Adani Green' },
      { symbol: 'TATAPOWER.NS', name: 'Tata Power' },
      { symbol: 'GAIL.NS', name: 'GAIL India' }
    ]
  },
  {
    id: 'nifty-realty',
    name: 'Nifty Realty',
    region: 'india',
    indexTicker: '^CNXREALTY',
    stocks: [
      { symbol: 'DLF.NS', name: 'DLF' },
      { symbol: 'GODREJPROP.NS', name: 'Godrej Properties' },
      { symbol: 'OBEROIRLTY.NS', name: 'Oberoi Realty' },
      { symbol: 'PRESTIGE.NS', name: 'Prestige Estates' },
      { symbol: 'PHOENIXLTD.NS', name: 'Phoenix Mills' },
      { symbol: 'BRIGADE.NS', name: 'Brigade Enterprises' },
      { symbol: 'SOBHA.NS', name: 'Sobha Ltd' }
    ]
  },
  {
    id: 'nifty-psu-bank',
    name: 'Nifty PSU Bank',
    region: 'india',
    indexTicker: '^CNXPSUBANK',
    etfTicker: 'PSUBNKBEES.NS',
    stocks: [
      { symbol: 'SBIN.NS', name: 'State Bank of India' },
      { symbol: 'BANKBARODA.NS', name: 'Bank of Baroda' },
      { symbol: 'PNB.NS', name: 'Punjab National Bank' },
      { symbol: 'CANBK.NS', name: 'Canara Bank' },
      { symbol: 'UNIONBANK.NS', name: 'Union Bank' },
      { symbol: 'IOB.NS', name: 'Indian Overseas Bank' },
      { symbol: 'INDIANB.NS', name: 'Indian Bank' },
      { symbol: 'MAHABANK.NS', name: 'Bank of Maharashtra' }
    ]
  },
  {
    id: 'nifty-financial-services',
    name: 'Nifty Financial Services',
    region: 'india',
    indexTicker: 'NIFTY_FIN_SERVICE.NS',
    stocks: [
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
      { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
      { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv' },
      { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance' },
      { symbol: 'HDFCLIFE.NS', name: 'HDFC Life' },
      { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
      { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
      { symbol: 'CHOLAFIN.NS', name: 'Cholamandalam Investment' },
      { symbol: 'MUTHOOTFIN.NS', name: 'Muthoot Finance' }
    ]
  },
  {
    id: 'nifty-media',
    name: 'Nifty Media',
    region: 'india',
    indexTicker: '^CNXMEDIA',
    stocks: [
      { symbol: 'ZEEL.NS', name: 'Zee Entertainment' },
      { symbol: 'PVRINOX.NS', name: 'PVR Inox' },
      { symbol: 'SUNTV.NS', name: 'Sun TV Network' },
      { symbol: 'NETWORK18.NS', name: 'Network18' },
      { symbol: 'NDTV.NS', name: 'NDTV Ltd' },
      { symbol: 'NAZARA.NS', name: 'Nazara Technologies' }
    ]
  },
  {
    id: 'nifty-infra',
    name: 'Nifty Infra',
    region: 'india',
    indexTicker: '^CNXINFRA',
    etfTicker: 'INFRABEES.NS',
    stocks: [
      { symbol: 'LT.NS', name: 'Larsen & Toubro' },
      { symbol: 'ADANIPORTS.NS', name: 'Adani Ports' },
      { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement' },
      { symbol: 'GRASIM.NS', name: 'Grasim Industries' },
      { symbol: 'ADANIENT.NS', name: 'Adani Enterprises' },
      { symbol: 'SIEMENS.NS', name: 'Siemens India' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' }
    ]
  },
  {
    id: 'nifty-consumer-durables',
    name: 'Nifty Consumer Durables',
    region: 'india',
    indexTicker: 'NIFTY_CONSR_DURBL.NS',
    stocks: [
      { symbol: 'TITAN.NS', name: 'Titan Company' },
      { symbol: 'HAVELLS.NS', name: 'Havells India' },
      { symbol: 'VOLTAS.NS', name: 'Voltas' },
      { symbol: 'WHIRLPOOL.NS', name: 'Whirlpool India' },
      { symbol: 'BLUESTARCO.NS', name: 'Blue Star' },
      { symbol: 'CROMPTON.NS', name: 'Crompton Greaves' },
      { symbol: 'BATAINDIA.NS', name: 'Bata India' },
      { symbol: 'DIXON.NS', name: 'Dixon Technologies' },
      { symbol: 'KALYANKJIL.NS', name: 'Kalyan Jewellers' }
    ]
  },
  {
    id: 'nifty-50',
    name: 'Nifty 50 Index',
    region: 'india',
    assetClass: 'stocks',
    indexTicker: '^NSEI',
    stocks: [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
      { symbol: 'TCS.NS', name: 'TCS' },
      { symbol: 'INFY.NS', name: 'Infosys' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
      { symbol: 'SBIN.NS', name: 'State Bank of India' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
      { symbol: 'ITC.NS', name: 'ITC' },
      { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
      { symbol: 'LT.NS', name: 'Larsen & Toubro' },
      { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
      { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
      { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
      { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
      { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
      { symbol: 'TITAN.NS', name: 'Titan Company' },
      { symbol: 'HCLTECH.NS', name: 'HCL Technologies' },
      { symbol: 'NTPC.NS', name: 'NTPC' },
      { symbol: 'TATASTEEL.NS', name: 'Tata Steel' },
      { symbol: 'ONGC.NS', name: 'ONGC' },
      { symbol: 'POWERGRID.NS', name: 'Power Grid' },
      { symbol: 'M&M.NS', name: 'Mahindra & Mahindra' },
      { symbol: 'ADANIENT.NS', name: 'Adani Enterprises' },
      { symbol: 'ADANIPORTS.NS', name: 'Adani Ports' },
      { symbol: 'WIPRO.NS', name: 'Wipro' },
      { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement' },
      { symbol: 'JSWSTEEL.NS', name: 'JSW Steel' },
      { symbol: 'TECHM.NS', name: 'Tech Mahindra' },
      { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv' },
      { symbol: 'HINDALCO.NS', name: 'Hindalco' },
      { symbol: 'DRREDDY.NS', name: 'Dr. Reddys' },
      { symbol: 'NESTLEIND.NS', name: 'Nestle India' },
      { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank' },
      { symbol: 'GRASIM.NS', name: 'Grasim Industries' },
      { symbol: 'CIPLA.NS', name: 'Cipla' },
      { symbol: 'DIVISLAB.NS', name: 'Divis Labs' },
      { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp' },
      { symbol: 'BRITANNIA.NS', name: 'Britannia' },
      { symbol: 'COALINDIA.NS', name: 'Coal India' },
      { symbol: 'EICHERMOT.NS', name: 'Eicher Motors' },
      { symbol: 'BPCL.NS', name: 'BPCL' },
      { symbol: 'TATACONSUM.NS', name: 'Tata Consumer' },
      { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals' },
      { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance' },
      { symbol: 'HDFCLIFE.NS', name: 'HDFC Life' },
      { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever' },
      { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto' },
      { symbol: 'BEL.NS', name: 'Bharat Electronics' },
      { symbol: 'TATAPOWER.NS', name: 'Tata Power' },
      { symbol: 'SHRIRAMFIN.NS', name: 'Shriram Finance' }
    ]
  },
  {
    id: 'nifty-100',
    name: 'Nifty 100 Index',
    region: 'india',
    assetClass: 'stocks',
    indexTicker: '^CNX100',
    stocks: [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
      { symbol: 'TCS.NS', name: 'TCS' },
      { symbol: 'INFY.NS', name: 'Infosys' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
      { symbol: 'SBIN.NS', name: 'State Bank of India' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
      { symbol: 'ITC.NS', name: 'ITC' },
      { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
      { symbol: 'LT.NS', name: 'Larsen & Toubro' },
      { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
      { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
      { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
      { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
      { symbol: 'MARUTI.NS', name: 'Maruti Suzuki' },
      { symbol: 'TITAN.NS', name: 'Titan Company' },
      { symbol: 'HCLTECH.NS', name: 'HCL Technologies' },
      { symbol: 'NTPC.NS', name: 'NTPC' },
      { symbol: 'TATASTEEL.NS', name: 'Tata Steel' },
      { symbol: 'DLF.NS', name: 'DLF' },
      { symbol: 'GODREJPROP.NS', name: 'Godrej Properties' },
      { symbol: 'HAVELLS.NS', name: 'Havells India' },
      { symbol: 'SIEMENS.NS', name: 'Siemens India' },
      { symbol: 'VEDL.NS', name: 'Vedanta' },
      { symbol: 'PNB.NS', name: 'Punjab National Bank' },
      { symbol: 'LUPIN.NS', name: 'Lupin' },
      { symbol: 'PERSISTENT.NS', name: 'Persistent Systems' },
      { symbol: 'MARICO.NS', name: 'Marico' },
      { symbol: 'DABUR.NS', name: 'Dabur India' },
      { symbol: 'COLPAL.NS', name: 'Colgate Palmolive' }
    ]
  },
  {
    id: 'nifty-next-50',
    name: 'Nifty Next 50 Index',
    region: 'india',
    assetClass: 'stocks',
    indexTicker: '^NSMIDCP',
    etfTicker: 'JUNIORBEES.NS',
    stocks: [
      { symbol: 'DLF.NS', name: 'DLF' },
      { symbol: 'GODREJPROP.NS', name: 'Godrej Properties' },
      { symbol: 'HAVELLS.NS', name: 'Havells India' },
      { symbol: 'SIEMENS.NS', name: 'Siemens India' },
      { symbol: 'VEDL.NS', name: 'Vedanta' },
      { symbol: 'PNB.NS', name: 'Punjab National Bank' },
      { symbol: 'LUPIN.NS', name: 'Lupin' },
      { symbol: 'PERSISTENT.NS', name: 'Persistent Systems' },
      { symbol: 'MARICO.NS', name: 'Marico' },
      { symbol: 'DABUR.NS', name: 'Dabur India' },
      { symbol: 'COLPAL.NS', name: 'Colgate Palmolive' },
      { symbol: 'IOC.NS', name: 'Indian Oil' },
      { symbol: 'NMDC.NS', name: 'NMDC' },
      { symbol: 'OBEROIRLTY.NS', name: 'Oberoi Realty' },
      { symbol: 'CANBK.NS', name: 'Canara Bank' }
    ]
  },
  {
    id: 'nifty-midcap-50',
    name: 'Nifty Midcap 50 Index',
    region: 'india',
    assetClass: 'stocks',
    indexTicker: '^NSEMDCP50',
    stocks: [
      { symbol: 'PERSISTENT.NS', name: 'Persistent Systems' },
      { symbol: 'OBEROIRLTY.NS', name: 'Oberoi Realty' },
      { symbol: 'COFORGE.NS', name: 'Coforge' },
      { symbol: 'BRIGADE.NS', name: 'Brigade Enterprises' },
      { symbol: 'VOLTAS.NS', name: 'Voltas' },
      { symbol: 'CROMPTON.NS', name: 'Crompton Greaves' },
      { symbol: 'BATAINDIA.NS', name: 'Bata India' },
      { symbol: 'AUROPHARMA.NS', name: 'Aurobindo Pharma' },
      { symbol: 'MPHASIS.NS', name: 'Mphasis' },
      { symbol: 'ASHOKLEY.NS', name: 'Ashok Leyland' },
      { symbol: 'BALKRISIND.NS', name: 'Balkrishna Industries' },
      { symbol: 'BLUESTARCO.NS', name: 'Blue Star' },
      { symbol: 'NATIONALUM.NS', name: 'National Aluminium' },
      { symbol: 'PRESTIGE.NS', name: 'Prestige Estates' },
      { symbol: 'SOBHA.NS', name: 'Sobha Ltd' }
    ]
  },
  {
    id: 'nifty-smallcap-100',
    name: 'Nifty Smallcap 100 Index',
    region: 'india',
    assetClass: 'stocks',
    indexTicker: '^CNXSC',
    stocks: [
      { symbol: 'SAIL.NS', name: 'SAIL' },
      { symbol: 'IDFCFIRSTB.NS', name: 'IDFC First Bank' },
      { symbol: 'FEDERALBNK.NS', name: 'Federal Bank' },
      { symbol: 'IOB.NS', name: 'Indian Overseas Bank' },
      { symbol: 'INDIANB.NS', name: 'Indian Bank' },
      { symbol: 'MAHABANK.NS', name: 'Bank of Maharashtra' },
      { symbol: 'UNIONBANK.NS', name: 'Union Bank' },
      { symbol: 'BIOCON.NS', name: 'Biocon' },
      { symbol: 'WHIRLPOOL.NS', name: 'Whirlpool India' },
      { symbol: 'DISHTV.NS', name: 'Dish TV' },
      { symbol: 'NETWORK18.NS', name: 'Network18' },
      { symbol: 'EXIDEIND.NS', name: 'Exide Industries' },
      { symbol: 'PHOENIXLTD.NS', name: 'Phoenix Mills' },
      { symbol: 'SUNTV.NS', name: 'Sun TV Network' },
      { symbol: 'ZEEL.NS', name: 'Zee Entertainment' }
    ]
  },
  {
    id: 'nifty-500',
    name: 'Nifty 500 Index',
    region: 'india',
    assetClass: 'stocks',
    indexTicker: '^CRSLDX',
    stocks: [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
      { symbol: 'TCS.NS', name: 'TCS' },
      { symbol: 'INFY.NS', name: 'Infosys' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
      { symbol: 'SBIN.NS', name: 'State Bank of India' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
      { symbol: 'ITC.NS', name: 'ITC' },
      { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank' },
      { symbol: 'LT.NS', name: 'Larsen & Toubro' },
      { symbol: 'TATASTEEL.NS', name: 'Tata Steel' },
      { symbol: 'DLF.NS', name: 'DLF' },
      { symbol: 'PERSISTENT.NS', name: 'Persistent Systems' },
      { symbol: 'SAIL.NS', name: 'SAIL' },
      { symbol: 'IDFCFIRSTB.NS', name: 'IDFC First Bank' }
    ]
  }
];

// GLOBAL SECTORS (11 GICS sectors via SPDR ETFs)
const GLOBAL_SECTORS = [
  {
    id: 'global-technology',
    name: 'Technology',
    region: 'global',
    etfTicker: 'XLK',
    stocks: [
      { symbol: 'AAPL', name: 'Apple' },
      { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'AVGO', name: 'Broadcom' },
      { symbol: 'CRM', name: 'Salesforce' },
      { symbol: 'ADBE', name: 'Adobe' },
      { symbol: 'AMD', name: 'AMD' },
      { symbol: 'ORCL', name: 'Oracle' },
      { symbol: 'CSCO', name: 'Cisco Systems' },
      { symbol: 'INTU', name: 'Intuit' },
      { symbol: 'IBM', name: 'IBM' },
      { symbol: 'QCOM', name: 'Qualcomm' },
      { symbol: 'TXN', name: 'Texas Instruments' },
      { symbol: 'NOW', name: 'ServiceNow' },
      { symbol: 'AMAT', name: 'Applied Materials' }
    ]
  },
  {
    id: 'global-healthcare',
    name: 'Healthcare',
    region: 'global',
    etfTicker: 'XLV',
    stocks: [
      { symbol: 'UNH', name: 'UnitedHealth' },
      { symbol: 'JNJ', name: 'Johnson & Johnson' },
      { symbol: 'LLY', name: 'Eli Lilly' },
      { symbol: 'ABBV', name: 'AbbVie' },
      { symbol: 'MRK', name: 'Merck' },
      { symbol: 'TMO', name: 'Thermo Fisher' },
      { symbol: 'PFE', name: 'Pfizer' },
      { symbol: 'ABT', name: 'Abbott Labs' },
      { symbol: 'DHR', name: 'Danaher' },
      { symbol: 'SYK', name: 'Stryker' },
      { symbol: 'AMGN', name: 'Amgen' },
      { symbol: 'ISRG', name: 'Intuitive Surgical' },
      { symbol: 'MDT', name: 'Medtronic' },
      { symbol: 'VRTX', name: 'Vertex Pharma' }
    ]
  },
  {
    id: 'global-financials',
    name: 'Financials',
    region: 'global',
    etfTicker: 'XLF',
    stocks: [
      { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
      { symbol: 'JPM', name: 'JPMorgan Chase' },
      { symbol: 'V', name: 'Visa' },
      { symbol: 'MA', name: 'Mastercard' },
      { symbol: 'BAC', name: 'Bank of America' },
      { symbol: 'WFC', name: 'Wells Fargo' },
      { symbol: 'GS', name: 'Goldman Sachs' },
      { symbol: 'MS', name: 'Morgan Stanley' },
      { symbol: 'SPGI', name: 'S&P Global' },
      { symbol: 'AXP', name: 'American Express' },
      { symbol: 'BLK', name: 'BlackRock' },
      { symbol: 'C', name: 'Citigroup' },
      { symbol: 'SCHW', name: 'Charles Schwab' },
      { symbol: 'PGR', name: 'Progressive' }
    ]
  },
  {
    id: 'global-energy',
    name: 'Energy',
    region: 'global',
    etfTicker: 'XLE',
    stocks: [
      { symbol: 'XOM', name: 'Exxon Mobil' },
      { symbol: 'CVX', name: 'Chevron' },
      { symbol: 'COP', name: 'ConocoPhillips' },
      { symbol: 'EOG', name: 'EOG Resources' },
      { symbol: 'SLB', name: 'Schlumberger' },
      { symbol: 'MPC', name: 'Marathon Petroleum' },
      { symbol: 'PSX', name: 'Phillips 66' },
      { symbol: 'VLO', name: 'Valero Energy' },
      { symbol: 'OXY', name: 'Occidental Petroleum' },
      { symbol: 'HES', name: 'Hess' },
      { symbol: 'WMB', name: 'Williams Companies' },
      { symbol: 'HAL', name: 'Halliburton' },
      { symbol: 'BKR', name: 'Baker Hughes' }
    ]
  },
  {
    id: 'global-consumer-discretionary',
    name: 'Consumer Discretionary',
    region: 'global',
    etfTicker: 'XLY',
    stocks: [
      { symbol: 'AMZN', name: 'Amazon' },
      { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'HD', name: 'Home Depot' },
      { symbol: 'MCD', name: 'McDonalds' },
      { symbol: 'NKE', name: 'Nike' },
      { symbol: 'SBUX', name: 'Starbucks' },
      { symbol: 'LOW', name: 'Lowes' },
      { symbol: 'TJX', name: 'TJX Companies' },
      { symbol: 'BKNG', name: 'Booking Holdings' },
      { symbol: 'CMG', name: 'Chipotle' },
      { symbol: 'MAR', name: 'Marriott' },
      { symbol: 'HLT', name: 'Hilton' },
      { symbol: 'ORLY', name: 'OReilly Auto Parts' }
    ]
  },
  {
    id: 'global-consumer-staples',
    name: 'Consumer Staples',
    region: 'global',
    etfTicker: 'XLP',
    stocks: [
      { symbol: 'PG', name: 'Procter & Gamble' },
      { symbol: 'KO', name: 'Coca-Cola' },
      { symbol: 'PEP', name: 'PepsiCo' },
      { symbol: 'COST', name: 'Costco' },
      { symbol: 'WMT', name: 'Walmart' },
      { symbol: 'PM', name: 'Philip Morris' },
      { symbol: 'CL', name: 'Colgate-Palmolive' },
      { symbol: 'MDLZ', name: 'Mondelez' },
      { symbol: 'TGT', name: 'Target' },
      { symbol: 'MO', name: 'Altria' },
      { symbol: 'KHC', name: 'Kraft Heinz' },
      { symbol: 'HSY', name: 'Hershey' },
      { symbol: 'STZ', name: 'Constellation Brands' }
    ]
  },
  {
    id: 'global-industrials',
    name: 'Industrials',
    region: 'global',
    etfTicker: 'XLI',
    stocks: [
      { symbol: 'GE', name: 'GE Aerospace' },
      { symbol: 'CAT', name: 'Caterpillar' },
      { symbol: 'UNP', name: 'Union Pacific' },
      { symbol: 'HON', name: 'Honeywell' },
      { symbol: 'RTX', name: 'RTX Corp' },
      { symbol: 'BA', name: 'Boeing' },
      { symbol: 'DE', name: 'Deere & Co' },
      { symbol: 'LMT', name: 'Lockheed Martin' },
      { symbol: 'UPS', name: 'UPS' },
      { symbol: 'FDX', name: 'FedEx' },
      { symbol: 'EMR', name: 'Emerson Electric' },
      { symbol: 'ETN', name: 'Eaton' },
      { symbol: 'ITW', name: 'Illinois Tool Works' }
    ]
  },
  {
    id: 'global-materials',
    name: 'Materials',
    region: 'global',
    etfTicker: 'XLB',
    stocks: [
      { symbol: 'LIN', name: 'Linde' },
      { symbol: 'APD', name: 'Air Products' },
      { symbol: 'SHW', name: 'Sherwin-Williams' },
      { symbol: 'FCX', name: 'Freeport-McMoRan' },
      { symbol: 'NEM', name: 'Newmont' },
      { symbol: 'ECL', name: 'Ecolab' },
      { symbol: 'NUE', name: 'Nucor' },
      { symbol: 'DD', name: 'DuPont' },
      { symbol: 'DOW', name: 'Dow Inc' },
      { symbol: 'CTVA', name: 'Corteva' },
      { symbol: 'VMC', name: 'Vulcan Materials' },
      { symbol: 'MLM', name: 'Martin Marietta' },
      { symbol: 'ALB', name: 'Albemarle' }
    ]
  },
  {
    id: 'global-utilities',
    name: 'Utilities',
    region: 'global',
    etfTicker: 'XLU',
    stocks: [
      { symbol: 'NEE', name: 'NextEra Energy' },
      { symbol: 'SO', name: 'Southern Company' },
      { symbol: 'DUK', name: 'Duke Energy' },
      { symbol: 'CEG', name: 'Constellation Energy' },
      { symbol: 'SRE', name: 'Sempra' },
      { symbol: 'AEP', name: 'American Electric' },
      { symbol: 'D', name: 'Dominion Energy' },
      { symbol: 'EXC', name: 'Exelon' },
      { symbol: 'PCG', name: 'PG&E' },
      { symbol: 'PEG', name: 'Public Service Enterprise' },
      { symbol: 'ED', name: 'Consolidated Edison' },
      { symbol: 'WEC', name: 'WEC Energy Group' }
    ]
  },
  {
    id: 'global-real-estate',
    name: 'Real Estate',
    region: 'global',
    etfTicker: 'XLRE',
    stocks: [
      { symbol: 'PLD', name: 'Prologis' },
      { symbol: 'AMT', name: 'American Tower' },
      { symbol: 'EQIX', name: 'Equinix' },
      { symbol: 'PSA', name: 'Public Storage' },
      { symbol: 'SPG', name: 'Simon Property' },
      { symbol: 'O', name: 'Realty Income' },
      { symbol: 'WELL', name: 'Welltower' },
      { symbol: 'DLR', name: 'Digital Realty' },
      { symbol: 'CSGP', name: 'CoStar Group' },
      { symbol: 'VICI', name: 'VICI Properties' },
      { symbol: 'AVB', name: 'AvalonBay' },
      { symbol: 'EQR', name: 'Equity Residential' }
    ]
  },
  {
    id: 'global-communication',
    name: 'Communication Services',
    region: 'global',
    etfTicker: 'XLC',
    stocks: [
      { symbol: 'META', name: 'Meta Platforms' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'NFLX', name: 'Netflix' },
      { symbol: 'DIS', name: 'Walt Disney' },
      { symbol: 'CMCSA', name: 'Comcast' },
      { symbol: 'T', name: 'AT&T' },
      { symbol: 'VZ', name: 'Verizon' },
      { symbol: 'TMUS', name: 'T-Mobile' },
      { symbol: 'CHTR', name: 'Charter Communications' },
      { symbol: 'EA', name: 'Electronic Arts' },
      { symbol: 'TTWO', name: 'Take-Two Interactive' },
      { symbol: 'WBD', name: 'Warner Bros Discovery' }
    ]
  }
];

// INDIAN MUTUAL FUNDS (Sectoral)
const INDIAN_MUTUAL_FUNDS = [
  {
    id: 'mf-india-tech',
    name: 'Technology Funds (India)',
    region: 'india',
    assetClass: 'mutual-funds',
    indexTicker: '^CNXIT',
    stocks: [
      { symbol: '0P00005V13.BO', name: 'ICICI Prudential Technology Fund' },
      { symbol: '0P00005WZY.BO', name: 'Tata Digital India Fund' },
      { symbol: '0P00005X16.BO', name: 'SBI Technology Opportunities' }
    ]
  },
  {
    id: 'mf-india-pharma',
    name: 'Pharma Funds (India)',
    region: 'india',
    assetClass: 'mutual-funds',
    indexTicker: '^CNXPHARMA',
    stocks: [
      { symbol: '0P00005W8V.BO', name: 'Nippon India Pharma Fund' },
      { symbol: '0P00005VYK.BO', name: 'SBI Healthcare Opportunities' }
    ]
  },
  {
    id: 'mf-india-bank',
    name: 'Banking Funds (India)',
    region: 'india',
    assetClass: 'mutual-funds',
    indexTicker: '^NSEBANK',
    stocks: [
      { symbol: '0P00005W4A.BO', name: 'Nippon India Banking & Financial' },
      { symbol: '0P00005WMX.BO', name: 'SBI Banking & Financial Services' }
    ]
  }
];

// GLOBAL MUTUAL FUNDS (Sectoral)
const GLOBAL_MUTUAL_FUNDS = [
  {
    id: 'mf-global-tech',
    name: 'Technology Funds (Global)',
    region: 'global',
    assetClass: 'mutual-funds',
    etfTicker: 'XLK',
    stocks: [
      { symbol: 'FSPTX', name: 'Fidelity Select Technology' },
      { symbol: 'VITAX', name: 'Vanguard Information Tech' }
    ]
  },
  {
    id: 'mf-global-health',
    name: 'Healthcare Funds (Global)',
    region: 'global',
    assetClass: 'mutual-funds',
    etfTicker: 'XLV',
    stocks: [
      { symbol: 'VGHCX', name: 'Vanguard Health Care' },
      { symbol: 'FSPHX', name: 'Fidelity Select Health Care' }
    ]
  }
];

const ALL_SECTORS = [...INDIAN_SECTORS, ...GLOBAL_SECTORS, ...INDIAN_MUTUAL_FUNDS, ...GLOBAL_MUTUAL_FUNDS];

// Priority set of top Indian equity symbols for deterministic prioritization
export const INDIAN_PRIORITY_SYMBOLS = [
  'RELIANCE', 'BHARTIARTL', 'HDFCBANK', 'ICICIBANK', 'SBIN',
  'TCS', 'BAJFINANCE', 'LT', 'HINDUNILVR', 'SUNPHARMA',
  'INFY', 'TITAN', 'KOTAKBANK', 'ADANIENT', 'MARUTI',
  'AXISBANK', 'ADANIPORTS', 'M&M', 'HCLTECH', 'ITC',
  'ULTRACEMCO', 'BAJAJ-AUTO', 'HAL', 'NTPC', 'JSWSTEEL',
  'POWERGRID', 'ONGC', 'COALINDIA', 'TATASTEEL', 'TMCV', 'TMPV',
  'WIPRO', 'TECHM', 'NESTLEIND', 'BRITANNIA', 'GRASIM',
  'HINDALCO', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'APOLLOHOSP',
  'EICHERMOT', 'HEROMOTOCO', 'VEDL', 'INDUSINDBK', 'BANKBARODA',
  'PNB', 'IDFCFIRSTB', 'FEDERALBNK', 'GODREJPROP', 'OBEROIRLTY',
  'PRESTIGE', 'PHOENIXLTD', 'BRIGADE', 'SOBHA', 'TATAPOWER',
  'ADANIGREEN', 'GAIL', 'SIEMENS', 'LUPIN', 'AUROPHARMA',
  'BIOCON', 'MANKIND', 'ZYDUSLIFE', 'GODREJCP', 'DABUR',
  'MARICO', 'COLPAL', 'TATACONSUM', 'VBL', 'PERSISTENT',
  'COFORGE', 'MPHASIS', 'LTTS', 'TATAELXSI', 'BALKRISIND',
  'ASHOKLEY', 'TVSMOTOR', 'NMDC', 'SAIL', 'NATIONALUM',
  'JINDALSTEL', 'BPCL', 'IOC', 'CANBK', 'UNIONBANK',
  'IOB', 'INDIANB', 'MAHABANK', 'BAJAJFINSV', 'SBILIFE',
  'HDFCLIFE', 'CHOLAFIN', 'MUTHOOTFIN', 'ZEEL', 'PVRINOX',
  'SUNTV', 'NETWORK18', 'HAVELLS', 'VOLTAS', 'WHIRLPOOL',
  'BLUESTARCO', 'CROMPTON', 'BATAINDIA', 'DIXON', 'KALYANKJIL',
  'LTIM', 'SHRIRAMFIN', 'DISHTV', 'TV18BRDCST', 'ZOMATO',
  'PAYTM', 'POLICYBZR', 'NYKAA', 'DMART', 'BEL', 'MAZDOCK',
  'COCHINSHIP', 'BSE', 'CDSL', 'ANGELONE', 'TRENT', 'SUZLON',
  'IRFC', 'RVNL', 'IRCON', 'RECLTD', 'IRCTC', 'RAILTEL',
  'SJVN', 'NHPC', 'IREDA', 'HUDCO', 'BOMDYEING', 'SEJALLTD',
  'CENTRALBK', 'UCOBANK', 'PSB', 'DELHIVERY', 'IDEA'
];

/**
 * SINGLE SOURCE OF TRUTH: Pure Indian NSE/BSE Stock Universe
 * Strictly contains Indian listed equity constituents.
 * Excludes foreign stocks, ETFs, mutual funds, and index tickers.
 */
function buildIndianStockUniverse() {
  const stockMap = new Map();
  const prioritySymbols = INDIAN_PRIORITY_SYMBOLS;

  // 1. Populate priority Indian liquid equities (e.g. ZOMATO, SUZLON, TRENT, HAL, etc.)
  prioritySymbols.forEach(bareSym => {
    const sym = `${bareSym}.NS`;
    stockMap.set(sym, {
      symbol: sym,
      canonicalSymbol: bareSym,
      bareSymbol: bareSym,
      name: bareSym,
      companyName: bareSym,
      sectorId: 'general',
      sectorName: 'General',
      region: 'india',
      exchange: 'NSE'
    });
  });

  // 2. Populate sector constituent stocks
  INDIAN_SECTORS.forEach(sector => {
    if ((sector.assetClass || 'stocks') === 'stocks') {
      sector.stocks.forEach(stock => {
        const sym = stock.symbol;
        if (
          sym &&
          !sym.startsWith('^') &&
          !sym.startsWith('0P') &&
          !sym.endsWith('BEES.NS') &&
          !sym.endsWith('ETF.NS') &&
          !sym.endsWith('BEES.BO') &&
          !sym.endsWith('ETF.BO')
        ) {
          const canonical = sym.replace(/\.(NS|BO)$/i, '').toUpperCase();
          stockMap.set(sym, {
            symbol: sym,
            canonicalSymbol: canonical,
            bareSymbol: canonical,
            name: stock.name,
            companyName: stock.name,
            sectorId: sector.id,
            sectorName: sector.name,
            region: 'india',
            exchange: sym.endsWith('.BO') ? 'BSE' : 'NSE'
          });
        }
      });
    }
  });

  // 2. Load authoritative master from disk if available
  try {
    if (fs.existsSync(MASTER_PATH)) {
      const rawMaster = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
      if (Array.isArray(rawMaster)) {
        rawMaster.forEach(item => {
          if (!item || !item.symbol) return;
          const sym = item.symbol;
          if (
            sym.startsWith('^') ||
            sym.startsWith('0P') ||
            sym.endsWith('BEES.NS') ||
            sym.endsWith('ETF.NS') ||
            sym.endsWith('BEES.BO') ||
            sym.endsWith('ETF.BO')
          ) return;

          const canonical = item.canonicalSymbol || item.bareSymbol || sym.replace(/\.(NS|BO)$/i, '').toUpperCase();
          const targetSym = (!sym.endsWith('.NS') && !sym.endsWith('.BO')) ? `${canonical}.NS` : sym;
          if (!stockMap.has(targetSym) && !stockMap.has(canonical) && !stockMap.has(`${canonical}.NS`) && !stockMap.has(`${canonical}.BO`)) {
            stockMap.set(targetSym, {
              symbol: targetSym,
              canonicalSymbol: canonical,
              bareSymbol: canonical,
              name: item.name || canonical,
              companyName: item.companyName || item.name || canonical,
              isin: item.isin,
              sectorId: item.sectorId || 'general',
              sectorName: item.sectorName || 'General',
              region: 'india',
              exchange: item.exchange || (targetSym.endsWith('.BO') ? 'BSE' : 'NSE')
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('SectorDataService: Note loading master universe:', err.message);
  }

  const prioritySet = new Set(prioritySymbols.map(s => `${s}.NS`));

  // Sort with prominent NSE equities first
  const list = Array.from(stockMap.values());
  list.sort((a, b) => {
    const aPri = prioritySet.has(a.symbol) ? 0 : (a.exchange === 'NSE' ? 1 : 2);
    const bPri = prioritySet.has(b.symbol) ? 0 : (b.exchange === 'NSE' ? 1 : 2);
    if (aPri !== bPri) return aPri - bPri;
    return a.canonicalSymbol.localeCompare(b.canonicalSymbol);
  });

  return list;
}

export const INDIAN_NSE_BSE_STOCK_UNIVERSE = buildIndianStockUniverse();
export const INDIAN_NSE_BSE_SYMBOLS = INDIAN_NSE_BSE_STOCK_UNIVERSE.map(s => s.symbol);

class SectorDataService {
  constructor() {
    this.cache = new Map();
    this.symbolCache = new Map();
    this.inFlightFetches = new Map();
    this.inFlightRankMap = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.SYMBOL_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
    this.isWarmingFinancials = false;
    this._warmingStarted = false;
    this.circuitBreakerOpen = false;
    this.circuitBreakerCooldown = 60000; // 60 seconds cooldown
    this.circuitBreakerLastTrip = 0;
    this.globalRankCache = null;
    this.globalRankCacheTime = 0;
    this.marketCapCache = new Map();
  }

  isCircuitBreakerActive() {
    if (this.circuitBreakerOpen) {
      if (Date.now() - this.circuitBreakerLastTrip < this.circuitBreakerCooldown) {
        return true;
      }
      this.circuitBreakerOpen = false; // Cooldown elapsed, allow half-open retry
    }
    return false;
  }

  tripCircuitBreaker(reason = 'external failures') {
    this.circuitBreakerOpen = true;
    this.circuitBreakerLastTrip = Date.now();
    console.warn(`[SectorDataService] Circuit breaker tripped (${reason}). Falling back to cached/local data for ${this.circuitBreakerCooldown / 1000}s.`);
  }

  /**
   * Controlled non-blocking background cache warmer.
   * Invoked after the HTTP server is listening.
   */
  startBackgroundWarming() {
    if (this._warmingStarted) return;
    this._warmingStarted = true;
    setTimeout(async () => {
      try {
        console.log('[SectorDataService] Starting deferred background cache warm-up...');
        await this.prewarmStockCache();
        await this.warmHistoricalReturns();
        await this.warmFinancialsCache();
      } catch (err) {
        console.warn('[SectorDataService] Background warm-up notice:', err.message);
      }
    }, 2000);
  }

  /**
   * Proactively warm up multi-period historical returns (1W..ALL) & ATH/52W metrics for constituent stocks.
   */
  async warmHistoricalReturns() {
    try {
      const symSet = new Set();
      ALL_SECTORS.forEach(s => (s.stocks || []).forEach(st => {
        if (st && st.symbol) {
          const isGlobal = s.region === 'global' || KNOWN_GLOBAL_SYMBOLS.has(st.symbol) || (!st.symbol.endsWith('.NS') && !st.symbol.endsWith('.BO') && s.region === 'global');
          const sym = (st.symbol.endsWith('.NS') || st.symbol.endsWith('.BO') || isGlobal) ? st.symbol : `${st.symbol}.NS`;
          symSet.add(sym);
        }
      }));
      INDIAN_PRIORITY_SYMBOLS.slice(0, 50).forEach(s => symSet.add(`${s}.NS`));

      const symbols = Array.from(symSet);
      console.log(`[SectorDataService] Warming historical returns & ATH metrics for ${symbols.length} constituent & priority stocks...`);

      const BATCH_SIZE = 5;
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        if (this.isCircuitBreakerActive()) break;
        const batch = symbols.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map(sym => yahooFinanceService.getHistoricalAnalysis(sym, this.symbolCache.get(sym)?.data?.ltp)));
        await new Promise(r => setTimeout(r, 150));
      }
      console.log(`[SectorDataService] Completed historical returns & ATH metrics warming for constituent stocks.`);
    } catch (err) {
      console.warn('[SectorDataService] Error warming historical returns:', err.message);
    }
  }

  /**
   * Proactively warm up quarterly financials cache for sector constituent stocks in the background.
   */
  async warmFinancialsCache() {
    if (this.isWarmingFinancials) return;
    this.isWarmingFinancials = true;
    try {
      const symSet = new Set();
      ALL_SECTORS.forEach(s => (s.stocks || []).forEach(st => {
        if (st && st.symbol) symSet.add(st.symbol);
      }));

      // Also proactively warm top Indian equities
      const topLargeCaps = [
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'BHARTIARTL.NS', 'ICICIBANK.NS',
        'INFY.NS', 'SBIN.NS', 'ITC.NS', 'HINDUNILVR.NS', 'LT.NS',
        'BAJFINANCE.NS', 'HCLTECH.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'ADANIENT.NS',
        'KOTAKBANK.NS', 'TITAN.NS', 'ONGC.NS', 'TATAMOTORS.NS', 'NTPC.NS',
        'AXISBANK.NS', 'ADANIPORTS.NS', 'M&M.NS', 'POWERGRID.NS', 'ULTRACEMCO.NS',
        'COALINDIA.NS', 'BAJAJFINSV.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS', 'ASIANPAINT.NS',
        'SIEMENS.NS', 'IOC.NS', 'HAL.NS', 'BEL.NS', 'DMART.NS', 'VBL.NS',
        'NESTLEIND.NS', 'GRASIM.NS', 'BAJAJ-AUTO.NS', 'WIPRO.NS', 'TECHM.NS',
        'ADANIGREEN.NS', 'ADANIPOWER.NS', 'BPCL.NS', 'HINDALCO.NS', 'EICHERMOT.NS',
        'SHRIRAMFIN.NS', 'DIVISLAB.NS', 'TRENT.NS', 'CHOLAFIN.NS', 'SBILIFE.NS',
        'VEDL.NS', 'GAIL.NS', 'ZOMATO.NS', 'JIOFIN.NS', 'INDIGO.NS', 'CIPLA.NS',
        'DRREDDY.NS', 'APOLLOHOSP.NS', 'TATAPOWER.NS', 'TVSMOTOR.NS', 'BANKBARODA.NS',
        'PNB.NS', 'CANBK.NS', 'UNIONBANK.NS', 'INDIANB.NS', 'ABB.NS', 'AMBUJACEM.NS',
        'HDFCLIFE.NS', 'MUTHOOTFIN.NS', 'PIDILITIND.NS', 'LODHA.NS', 'DLF.NS',
        'GODREJCP.NS', 'DABUR.NS', 'BRITANNIA.NS', 'COLPAL.NS', 'MARICO.NS',
        'HAVELLS.NS', 'VOLTAS.NS', 'POLYCAB.NS', 'KEI.NS', 'PERSISTENT.NS',
        'COFORGE.NS', 'MPHASIS.NS', 'LTTS.NS', 'KPITTECH.NS', 'TATAELXSI.NS',
        'BEL.NS', 'IRFC.NS', 'PFC.NS', 'RECLTD.NS', 'MAXHEALTH.NS', 'MANKIND.NS'
      ];
      topLargeCaps.forEach(s => symSet.add(s));

      const symbols = Array.from(symSet);
      console.log(`[SectorDataService] Starting background warming of quarterly financials for ${symbols.length} constituent & top stocks...`);

      const BATCH_SIZE = 3;
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        if (this.isCircuitBreakerActive()) {
          console.log('[SectorDataService] Circuit breaker active; pausing financials cache warming.');
          break;
        }
        const batch = symbols.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map(sym => yahooFinanceService.getStockFinancials(sym)));
        await new Promise(r => setTimeout(r, 300));
      }
      console.log(`[SectorDataService] Completed quarterly financials warming for ${symbols.length} constituent stocks.`);
    } catch (err) {
      console.warn('[SectorDataService] Error warming financials cache:', err.message);
    } finally {
      this.isWarmingFinancials = false;
    }
  }

  /**
   * Fast batch fetch quotes in parallel chunks of 25 with symbol-level caching,
   * bounded concurrency, circuit breaker protection, and consolidated error reporting.
   */
  async _batchFetchQuotes(symbols) {
    const now = Date.now();
    const uncached = [];
    const resultsMap = new Map();

    for (const sym of symbols) {
      const cached = this.symbolCache.get(sym);
      if (cached && now - cached.timestamp < this.SYMBOL_CACHE_TTL) {
        resultsMap.set(sym, cached.data);
      } else {
        uncached.push(sym);
      }
    }

    if (uncached.length === 0 || this.isCircuitBreakerActive()) {
      for (const sym of symbols) {
        if (!resultsMap.has(sym)) {
          const symClean = sym.replace(/\.(NS|BO)$/i, '');
          const fallback = this.symbolCache.get(sym)?.data || 
                           this.symbolCache.get(`${symClean}.NS`)?.data ||
                           this.symbolCache.get(symClean)?.data ||
                           yahooFinanceService.quoteCache?.get(sym)?.data ||
                           yahooFinanceService.quoteCache?.get(`${symClean}.NS`)?.data ||
                           yahooFinanceService.quoteCache?.get(symClean)?.data;
          if (fallback) {
            resultsMap.set(sym, fallback);
          }
        }
      }
      return Array.from(resultsMap.values());
    }

    const CHUNK_SIZE = 25;
    const chunks = [];
    for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
      chunks.push(uncached.slice(i, i + CHUNK_SIZE));
    }

    let failedChunkCount = 0;
    let consecutiveFailures = 0;

    const chunkTasks = chunks.map((chunk) => async () => {
      if (this.isCircuitBreakerActive()) return;

      try {
        const quotesRes = await marketDataGateway.getQuotes(chunk);
        if (quotesRes && quotesRes.data && quotesRes.data.length > 0) {
          const hasValidData = quotesRes.data.some(q => q && typeof q.ltp === 'number' && q.ltp > 0 && q.dataStatus !== 'UNAVAILABLE');
          if (hasValidData) {
            consecutiveFailures = 0;
          }
          for (const q of quotesRes.data) {
            if (q && typeof q.ltp === 'number' && q.ltp > 0 && q.dataStatus !== 'UNAVAILABLE') {
              const cleanSym = q.symbol.replace(/\.(NS|BO)$/i, '');
              if (typeof q.marketCap === 'number' && q.marketCap > 0) {
                const canonical = this.getCanonicalSymbol(q.symbol);
                this.marketCapCache.set(canonical, q.marketCap);
                this.marketCapCache.set(q.symbol, q.marketCap);
                this.marketCapCache.set(`${cleanSym}.NS`, q.marketCap);
              }
              this.symbolCache.set(q.symbol, { data: q, timestamp: now });
              this.symbolCache.set(`${cleanSym}.NS`, { data: q, timestamp: now });
              this.symbolCache.set(cleanSym, { data: q, timestamp: now });
            }
            resultsMap.set(q.symbol, q);
          }
        }
      } catch (err) {
        failedChunkCount++;
        consecutiveFailures++;
        if (consecutiveFailures >= 15) {
          this.tripCircuitBreaker('consecutive quote chunk failures');
        }
      }
    });

    await runWithConcurrencyLimit(chunkTasks, 3);

    // Fall back to any available cached quotes for symbols that failed to fetch fresh
    for (const sym of symbols) {
      if (!resultsMap.has(sym)) {
        const symClean = sym.replace(/\.(NS|BO)$/i, '');
        const fallback = this.symbolCache.get(sym)?.data || 
                         this.symbolCache.get(`${symClean}.NS`)?.data ||
                         this.symbolCache.get(symClean)?.data ||
                         yahooFinanceService.quoteCache?.get(sym)?.data ||
                         yahooFinanceService.quoteCache?.get(`${symClean}.NS`)?.data ||
                         yahooFinanceService.quoteCache?.get(symClean)?.data;
        if (fallback) {
          resultsMap.set(sym, fallback);
        }
      }
    }

    if (failedChunkCount > 0 && !this.isCircuitBreakerActive()) {
      console.warn(`[SectorDataService] ${failedChunkCount}/${chunks.length} quote chunks failed, using cached data.`);
    }

    return Array.from(resultsMap.values());
  }

  /**
   * Helper to retrieve cached financials across all symbol representations.
   */
  _getFinFromCache(sym) {
    if (!sym) return null;
    const yfFin = yahooFinanceService.financialsCache?.get(sym)?.data ||
           (sym.endsWith('.NS') ? yahooFinanceService.financialsCache?.get(sym.replace('.NS', ''))?.data : null) ||
           (sym.endsWith('.BO') ? yahooFinanceService.financialsCache?.get(sym.replace('.BO', ''))?.data : null) ||
           yahooFinanceService.financialsCache?.get(`${sym}.NS`)?.data ||
           yahooFinanceService.financialsCache?.get(`${sym}.BO`)?.data ||
           null;
    if (yfFin) return yfFin;

    // Fallback to QuarterlyRevenueService cache
    const qRev = quarterlyRevenueService.getCachedRevenue(sym);
    if (qRev) {
      return {
        revenue: qRev.revenueCr ?? qRev.revenue ?? null,
        revenueCr: qRev.revenueCr ?? qRev.revenue ?? null,
        revenueYoY: qRev.revenueYoY ?? null,
        revenueQuarterly: qRev.revenueQuarterly || null,
        revenueSource: qRev.source || 'Quarterly Statement',
        reportingPeriod: qRev.currentPeriod?.periodEnd ? `Q (${qRev.currentPeriod.periodEnd})` : '—',
        ebit: null,
        netProfit: null
      };
    }
    return null;
  }

  /**
   * Generic cache wrapper — returns cached data if fresh, serves stale-while-revalidate
   * to eliminate caller blocking, and deduplicates in-flight executions.
   */
  async _getCachedOrFetch(cacheKey, fetchFn) {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    const isWithinTtl = cached && (now - cached.timestamp < this.CACHE_TTL);

    if (cached && cached.data) {
      let isStale = false;
      // Check staleness for datasets if rankings, prices, or financials are missing
      if (cacheKey.startsWith('all_sectors_') || cacheKey.startsWith('sectors_')) {
        const sectors = Array.isArray(cached.data) ? cached.data : [];
        const bank = sectors.find(s => s.id === 'nifty-bank') || sectors[0];
        const firstStock = bank?.stocks?.[0];
        if (!firstStock || firstStock.indiaStockRank === null || firstStock.globalRank === null || firstStock.ltp === null) {
          isStale = true;
        } else if ((firstStock.revenue === null || firstStock.revenue === undefined) && this._getFinFromCache(firstStock.symbol)) {
          isStale = true;
        } else if (sectors.length > 0 && (sectors[0].revenue === null || sectors[0].revenue === undefined) && sectors[0].stocks?.some(s => s.revenue !== null && s.revenue !== undefined)) {
          isStale = true;
        } else if (firstStock?.returns?.['1W'] === null && (yahooFinanceService.returnsCache.has(firstStock.symbol) || yahooFinanceService.historicalCache.has(firstStock.symbol))) {
          isStale = true;
        }
      } else if (cacheKey.startsWith('all_ranked_stocks_')) {
        const stocks = Array.isArray(cached.data) ? cached.data : [];
        const firstStock = stocks[0];
        const validQuotes = stocks.filter(s => s && typeof s.ltp === 'number' && s.ltp > 0);
        if (!firstStock || firstStock.indiaStockRank === null || firstStock.globalRank === null || firstStock.ltp === null || validQuotes.length < 50) {
          isStale = true;
        }
      } else if (cacheKey.startsWith('sector_detail_')) {
        const stocks = Array.isArray(cached.data) ? cached.data : (cached.data?.stocks || []);
        isStale = stocks.length > 0 && stocks.some(s => s && s.symbol && (
          ((s.revenue === null || s.revenue === undefined) && this._getFinFromCache(s.symbol)) ||
          (s.returns?.['1W'] === null && (yahooFinanceService.returnsCache.has(s.symbol) || yahooFinanceService.historicalCache.has(s.symbol)))
        ));
      }

      // If fresh within TTL and not structurally stale, return immediately
      if (isWithinTtl && !isStale) {
        return cached.data;
      }

      // STALE-WHILE-REVALIDATE: Return existing cached snapshot immediately (<1ms)
      // and revalidate asynchronously in background if not already in-flight
      if (!this.inFlightFetches.has(cacheKey)) {
        const revalidatePromise = (async () => {
          try {
            const data = await fetchFn();
            if (data && (!Array.isArray(data) || data.some(s => s.indexPrice !== null || s.validStocks > 0 || (typeof s.ltp === 'number' && s.ltp > 0)))) {
              if (cacheKey.startsWith('all_ranked_stocks_') && Array.isArray(data)) {
                const firstStock = data[0];
                const validQuotes = data.filter(s => s && typeof s.ltp === 'number' && s.ltp > 0);
                if (firstStock && firstStock.ltp !== null && validQuotes.length >= 50) {
                  this.cache.set(cacheKey, { data, timestamp: Date.now() });
                }
              } else {
                this.cache.set(cacheKey, { data, timestamp: Date.now() });
              }
            }
          } catch (err) {
            console.warn(`[SectorDataService] Background revalidation failed for ${cacheKey}:`, err.message);
          } finally {
            this.inFlightFetches.delete(cacheKey);
          }
        })();
        this.inFlightFetches.set(cacheKey, revalidatePromise);
      }
      return cached.data;
    }

    // Cold start: deduplicate in-flight fetch
    if (this.inFlightFetches.has(cacheKey)) {
      return this.inFlightFetches.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const data = await fetchFn();
        if (data && (!Array.isArray(data) || data.some(s => s.indexPrice !== null || s.validStocks > 0 || (typeof s.ltp === 'number' && s.ltp > 0)))) {
          if (cacheKey.startsWith('all_ranked_stocks_') && Array.isArray(data)) {
            const firstStock = data[0];
            const validQuotes = data.filter(s => s && typeof s.ltp === 'number' && s.ltp > 0);
            if (!firstStock || firstStock.ltp === null || validQuotes.length < 50) {
              return data;
            }
          }
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }
        return data;
      } finally {
        this.inFlightFetches.delete(cacheKey);
      }
    })();

    this.inFlightFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Returns all Indian NSE/BSE equity symbols across the complete Indian equity universe.
   * Strictly excludes:
   * - Foreign/global stocks
   * - Index tickers (^NSEI, ^NSEBANK, etc.)
   * - Mutual funds (0P...)
   * - ETFs (BANKBEES.NS, etc.)
   */
  getAllIndianSymbols() {
    return INDIAN_NSE_BSE_SYMBOLS;
  }

  /**
   * Helper to extract canonical company identifier to deduplicate NSE/BSE dual listings.
   * e.g., RELIANCE.NS -> RELIANCE, RELIANCE.BO -> RELIANCE
   */
  getCanonicalSymbol(sym) {
    if (!sym) return '';
    return String(sym).trim().replace(/\.(NS|BO)$/i, '').toUpperCase();
  }

  /**
   * Helper to determine if a symbol belongs to the Indian NSE/BSE equity universe.
   */
  isIndianStock(sym) {
    if (!sym || typeof sym !== 'string') return false;
    const clean = sym.trim().toUpperCase();
    if (clean.startsWith('^') || clean.startsWith('0P') || clean.endsWith('BEES.NS') || clean.endsWith('ETF.NS') || clean.endsWith('BEES.BO') || clean.endsWith('ETF.BO')) {
      return false;
    }
    if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
      return true;
    }
    const canonical = this.getCanonicalSymbol(clean);
    return INDIAN_NSE_BSE_STOCK_UNIVERSE.some(s => s.canonicalSymbol === canonical || s.bareSymbol === canonical);
  }

  /**
   * Computes deterministic global market-cap ranking across the Indian NSE/BSE stock universe.
   * Sorts strictly by marketCap DESC, with deterministic secondary sort by canonicalSymbol ASC.
   * Sequential unique ranks 1..N for valid Indian companies.
   * Invalid stocks (marketCap null/<=0/NaN/undefined) receive globalRank = null.
   * Excludes foreign stocks, ETFs, mutual funds, and index rows.
   * Deduplicates dual NSE/BSE company listings into ONE canonical company rank.
   * @param {Array<string>} [symbols] - Optional universe symbols
   * @param {Map<string, Object>|Array<Object>} [quotesMapOrList] - Optional quotes
   * @returns {Map<string, number|null>} Map of symbol -> globalRank
   */
  _computeGlobalRankings(symbols = null, quotesMapOrList = null) {
    const universeSymbols = symbols && symbols.length > 0 ? symbols : this.getAllIndianSymbols();
    
    // Normalize quotes lookup with global quoteCache fallback
    const quoteLookup = (sym) => {
      let q = null;
      if (quotesMapOrList instanceof Map) {
        q = quotesMapOrList.get(sym) || 
            (sym.endsWith('.NS') ? quotesMapOrList.get(sym.replace('.NS', '')) : null) ||
            (sym.endsWith('.BO') ? quotesMapOrList.get(sym.replace('.BO', '')) : null);
      }
      if (!q && Array.isArray(quotesMapOrList)) {
        q = quotesMapOrList.find(item => item && (
          item.symbol === sym || 
          (sym.endsWith('.NS') && item.symbol === sym.replace('.NS', '')) ||
          (sym.endsWith('.BO') && item.symbol === sym.replace('.BO', ''))
        ));
      }
      if (!q) {
        const symClean = sym.replace(/\.(NS|BO)$/i, '');
        q = this.symbolCache?.get(sym)?.data || 
            this.symbolCache?.get(`${symClean}.NS`)?.data || 
            this.symbolCache?.get(`${symClean}.BO`)?.data || 
            yahooFinanceService.quoteCache?.get(sym)?.data || 
            yahooFinanceService.quoteCache?.get(`${symClean}.NS`)?.data ||
            yahooFinanceService.quoteCache?.get(`${symClean}.BO`)?.data;
      }
      return q;
    };

    // Group by Canonical Company Identity to prevent duplicate NSE/BSE ranking
    const companyMap = new Map(); // canonicalSymbol -> { canonicalSymbol, symbols: Set, marketCap }

    for (const sym of universeSymbols) {
      // Exclude foreign stocks, ETFs, mutual funds, indices
      if (!this.isIndianStock(sym)) {
        continue;
      }
      
      const canonicalSymbol = this.getCanonicalSymbol(sym);
      const q = quoteLookup(sym);
      const mCap = (q && typeof q.marketCap === 'number' && q.marketCap > 0 && !isNaN(q.marketCap))
        ? q.marketCap
        : null;

      if (!companyMap.has(canonicalSymbol)) {
        companyMap.set(canonicalSymbol, {
          canonicalSymbol,
          symbols: new Set([sym]),
          marketCap: mCap
        });
      } else {
        const existing = companyMap.get(canonicalSymbol);
        existing.symbols.add(sym);
        if (mCap !== null) {
          existing.marketCap = existing.marketCap !== null ? Math.max(existing.marketCap, mCap) : mCap;
        }
      }
    }

    const companyEntries = Array.from(companyMap.values());
    const validCompanies = companyEntries.filter(c => c.marketCap !== null);
    const invalidCompanies = companyEntries.filter(c => c.marketCap === null);

    // Sort strictly by marketCap DESC, with deterministic secondary sort by canonicalSymbol ASC
    validCompanies.sort((a, b) => {
      if (b.marketCap !== a.marketCap) {
        return b.marketCap - a.marketCap;
      }
      return a.canonicalSymbol.localeCompare(b.canonicalSymbol);
    });

    const rankMap = new Map();
    validCompanies.forEach((comp, idx) => {
      const rank = idx + 1;
      rankMap.set(comp.canonicalSymbol, rank);
      comp.symbols.forEach(sym => {
        rankMap.set(sym, rank);
        rankMap.set(`${comp.canonicalSymbol}.NS`, rank);
        rankMap.set(`${comp.canonicalSymbol}.BO`, rank);
      });
    });

    invalidCompanies.forEach(comp => {
      rankMap.set(comp.canonicalSymbol, null);
      comp.symbols.forEach(sym => {
        rankMap.set(sym, null);
        rankMap.set(`${comp.canonicalSymbol}.NS`, null);
        rankMap.set(`${comp.canonicalSymbol}.BO`, null);
      });
    });

    return rankMap;
  }

  /**
   * Helper to check if a rankMap contains valid, positive numerical rankings.
   */
  hasValidRanks(rankMap) {
    if (!rankMap || !(rankMap instanceof Map) || rankMap.size === 0) return false;
    let count = 0;
    for (const val of rankMap.values()) {
      if (typeof val === 'number' && val > 0) {
        count++;
        if (count >= 5) return true;
      }
    }
    return false;
  }

  async _getOrComputeGlobalRankMap(passedQuotes = null) {
    const now = Date.now();
    const isCacheFresh = this.globalRankCacheTime && (now - this.globalRankCacheTime < this.CACHE_TTL);
    const cachedValidCount = this.globalRankCache ? Array.from(this.globalRankCache.values()).filter(r => typeof r === 'number' && r > 0).length : 0;
    const passedCount = passedQuotes instanceof Map ? passedQuotes.size : (Array.isArray(passedQuotes) ? passedQuotes.length : 0);

    if (this.hasValidRanks(this.globalRankCache) && isCacheFresh) {
      if (!passedQuotes || passedCount <= cachedValidCount || cachedValidCount >= 80) {
        return this.globalRankCache;
      }
    }

    if (!passedQuotes && this.inFlightRankMap) {
      return this.inFlightRankMap;
    }

    const computePromise = (async () => {
      try {
        const qMap = new Map();

    // 1. Gather all cached quotes from SectorDataService symbolCache
    if (this.symbolCache && typeof this.symbolCache.entries === 'function') {
      for (const [sym, entry] of this.symbolCache.entries()) {
        const q = entry?.data;
        if (q && q.symbol && typeof q.marketCap === 'number' && q.marketCap > 0) {
          qMap.set(q.symbol, q);
          if (q.symbol.endsWith('.NS')) qMap.set(q.symbol.replace('.NS', ''), q);
          if (q.symbol.endsWith('.BO')) qMap.set(q.symbol.replace('.BO', ''), q);
        }
      }
    }

    // Gather quotes from any cached sectors in this.cache
    if (this.cache && typeof this.cache.entries === 'function') {
      for (const [key, entry] of this.cache.entries()) {
        if (Array.isArray(entry?.data)) {
          entry.data.forEach(item => {
            if (Array.isArray(item?.stocks)) {
              item.stocks.forEach(stk => {
                if (stk && stk.symbol && typeof stk.marketCap === 'number' && stk.marketCap > 0 && !qMap.has(stk.symbol)) {
                  qMap.set(stk.symbol, stk);
                  const clean = stk.symbol.replace(/\.(NS|BO)$/i, '');
                  qMap.set(`${clean}.NS`, stk);
                  qMap.set(clean, stk);
                }
              });
            } else if (item && item.symbol && typeof item.marketCap === 'number' && item.marketCap > 0 && !qMap.has(item.symbol)) {
              qMap.set(item.symbol, item);
              const clean = item.symbol.replace(/\.(NS|BO)$/i, '');
              qMap.set(`${clean}.NS`, item);
              qMap.set(clean, item);
            }
          });
        }
      }
    }

    // Merge persistent market caps from marketCapCache
    if (this.marketCapCache && typeof this.marketCapCache.entries === 'function') {
      for (const [sym, mCap] of this.marketCapCache.entries()) {
        if (!qMap.has(sym)) {
          qMap.set(sym, { symbol: sym, marketCap: mCap });
        }
      }
    }

    // 2. Gather quotes from yahooFinanceService.quoteCache
    if (yahooFinanceService.quoteCache && typeof yahooFinanceService.quoteCache.entries === 'function') {
      for (const [sym, entry] of yahooFinanceService.quoteCache.entries()) {
        const q = entry?.data;
        if (q && q.symbol && typeof q.marketCap === 'number' && q.marketCap > 0 && !qMap.has(q.symbol)) {
          qMap.set(q.symbol, q);
          if (q.symbol.endsWith('.NS')) qMap.set(q.symbol.replace('.NS', ''), q);
          if (q.symbol.endsWith('.BO')) qMap.set(q.symbol.replace('.BO', ''), q);
        }
      }
    }

    // 3. Merge in any explicitly passed quotes (Map or Array)
    if (passedQuotes instanceof Map) {
      for (const [sym, q] of passedQuotes.entries()) {
        if (q && q.symbol) {
          qMap.set(q.symbol, q);
          if (q.symbol.endsWith('.NS')) qMap.set(q.symbol.replace('.NS', ''), q);
          if (q.symbol.endsWith('.BO')) qMap.set(q.symbol.replace('.BO', ''), q);
        }
      }
    } else if (Array.isArray(passedQuotes)) {
      passedQuotes.forEach(q => {
        if (q && q.symbol) {
          qMap.set(q.symbol, q);
          if (q.symbol.endsWith('.NS')) qMap.set(q.symbol.replace('.NS', ''), q);
          if (q.symbol.endsWith('.BO')) qMap.set(q.symbol.replace('.BO', ''), q);
        }
      });
    }

    // 4. Ensure priority symbols quotes are populated if missing
    const prioritySymbols = [...new Set([
      ...this.getAllSymbols(),
      ...INDIAN_PRIORITY_SYMBOLS.map(s => `${s}.NS`),
      ...INDIAN_PRIORITY_SYMBOLS
    ])];
    const missingPriority = prioritySymbols.filter(s => !qMap.has(s));
    if (missingPriority.length > 20 && !this.isCircuitBreakerActive()) {
      const freshQuotes = await this._batchFetchQuotes(missingPriority.slice(0, 80));
      freshQuotes.forEach(q => {
        if (q && q.symbol) {
          qMap.set(q.symbol, q);
          if (q.symbol.endsWith('.NS')) qMap.set(q.symbol.replace('.NS', ''), q);
          if (q.symbol.endsWith('.BO')) qMap.set(q.symbol.replace('.BO', ''), q);
        }
      });
    }

    const computed = this._computeGlobalRankings(this.getAllIndianSymbols(), qMap);
    if (this.hasValidRanks(computed)) {
      this.globalRankCache = computed;
      this.globalRankCacheTime = Date.now();

      // Synchronize all cached sector constituents so all views share 100% identical ranks
      for (const [key, entry] of this.cache.entries()) {
        if (key.startsWith('sectors_') && Array.isArray(entry?.data)) {
          entry.data.forEach(sec => {
            if (sec && Array.isArray(sec.stocks)) {
              sec.stocks.forEach(stk => {
                if (stk && stk.symbol) {
                  const sRank = computed.get(stk.symbol) ?? (stk.symbol.endsWith('.NS') ? computed.get(stk.symbol.replace('.NS', '')) : null);
                  stk.indiaStockRank = sRank;
                  stk.globalRank = sRank;
                  stk.rank = sRank;
                }
              });
            }
          });
        }
      }

      return computed;
    }

    // If existing cache has valid ranks, prefer it over an invalid new compute
    if (this.hasValidRanks(this.globalRankCache)) {
      return this.globalRankCache;
    }

    return computed;
      } finally {
        if (!passedQuotes) {
          this.inFlightRankMap = null;
        }
      }
    })();

    if (!passedQuotes) {
      this.inFlightRankMap = computePromise;
    }
    return computePromise;
  }

  /**
   * Fetch quotes for a sector's constituent stocks with per-symbol error tolerance and provenance tracking.
   */
  async _fetchSectorQuotes(sector, fetchReturns = false, passedRankMap = null) {
    const symbols = sector.stocks.map(s => s.symbol);
    const quotes = await this._batchFetchQuotes(symbols);

    // Map quotes by symbol for easy lookup
    const quoteMap = new Map();
    quotes.forEach(q => {
      quoteMap.set(q.symbol, q);
      if (q.symbol.endsWith('.NS')) {
        quoteMap.set(q.symbol.replace('.NS', ''), q);
      }
      if (q.symbol.endsWith('.BO')) {
        quoteMap.set(q.symbol.replace('.BO', ''), q);
      }
    });

    const rankMap = (this.hasValidRanks(passedRankMap) ? passedRankMap : null) || 
                    (this.hasValidRanks(this.globalRankCache) ? this.globalRankCache : null) || 
                    await this._getOrComputeGlobalRankMap(quoteMap);

    const isFinancialSector = sector.id.includes('bank') || sector.id.includes('fin') || sector.id.includes('insurance');

    // Fetch multi-period historical returns for constituent stocks in parallel if requested or cached
    const returnsMap = new Map();
    if (fetchReturns) {
      const stockReturnsList = await Promise.allSettled(
        symbols.map(sym => yahooFinanceService.getHistoricalReturns(sym))
      );
      symbols.forEach((sym, idx) => {
        if (stockReturnsList[idx].status === 'fulfilled' && stockReturnsList[idx].value) {
          returnsMap.set(sym, stockReturnsList[idx].value);
          const clean = sym.replace(/\.(NS|BO)$/i, '');
          returnsMap.set(`${clean}.NS`, stockReturnsList[idx].value);
          returnsMap.set(clean, stockReturnsList[idx].value);
        }
      });
    } else {
      symbols.forEach(sym => {
        const yahooSym = yahooFinanceService.resolveYahooSymbol(sym);
        const cached = yahooFinanceService.returnsCache?.get(sym)?.data ||
                       yahooFinanceService.returnsCache?.get(yahooSym)?.data ||
                       yahooFinanceService.historicalCache?.get(yahooSym)?.data?.returns ||
                       yahooFinanceService.historicalCache?.get(sym)?.data?.returns;
        if (cached) {
          returnsMap.set(sym, cached);
          const clean = sym.replace(/\.(NS|BO)$/i, '');
          returnsMap.set(`${clean}.NS`, cached);
          returnsMap.set(clean, cached);
        }
      });
      // If any constituent stocks are missing from cache, fetch up to 15 on-demand so initial render never shows —
      const missingReturns = symbols.filter(sym => !returnsMap.has(sym));
      if (missingReturns.length > 0 && missingReturns.length <= 15) {
        const freshReturns = await Promise.allSettled(
          missingReturns.map(sym => yahooFinanceService.getHistoricalReturns(sym))
        );
        missingReturns.forEach((sym, idx) => {
          if (freshReturns[idx].status === 'fulfilled' && freshReturns[idx].value) {
            returnsMap.set(sym, freshReturns[idx].value);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            returnsMap.set(`${clean}.NS`, freshReturns[idx].value);
            returnsMap.set(clean, freshReturns[idx].value);
          }
        });
      }
    }

    // Fetch financials (EBIT & Net Profit & YoY %) for constituent stocks if requested or cached
    const financialsMap = new Map();
    if (fetchReturns) {
      const stockFinList = await Promise.allSettled(
        symbols.map(sym => yahooFinanceService.getStockFinancials(sym))
      );
      symbols.forEach((sym, idx) => {
        if (stockFinList[idx].status === 'fulfilled' && stockFinList[idx].value) {
          financialsMap.set(sym, stockFinList[idx].value);
          const clean = sym.replace(/\.(NS|BO)$/i, '');
          financialsMap.set(`${clean}.NS`, stockFinList[idx].value);
          financialsMap.set(clean, stockFinList[idx].value);
        }
      });
    } else {
      symbols.forEach(sym => {
        const yahooSym = yahooFinanceService.resolveYahooSymbol(sym);
        const cached = this._getFinFromCache(sym) || this._getFinFromCache(yahooSym);
        if (cached) {
          financialsMap.set(sym, cached);
          const clean = sym.replace(/\.(NS|BO)$/i, '');
          financialsMap.set(`${clean}.NS`, cached);
          financialsMap.set(clean, cached);
        }
      });
      // If any constituent stocks are missing from cache, fetch up to 15 on-demand so initial render never shows —
      const missingFin = symbols.filter(sym => !financialsMap.has(sym) && !this._getFinFromCache(sym));
      if (missingFin.length > 0 && missingFin.length <= 15) {
        const freshFin = await Promise.allSettled(
          missingFin.map(sym => yahooFinanceService.getStockFinancials(sym))
        );
        missingFin.forEach((sym, idx) => {
          if (freshFin[idx].status === 'fulfilled' && freshFin[idx].value) {
            financialsMap.set(sym, freshFin[idx].value);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            financialsMap.set(`${clean}.NS`, freshFin[idx].value);
            financialsMap.set(clean, freshFin[idx].value);
          }
        });
      }
    }

    // Fetch ATH & Base metrics for constituent stocks if requested or cached
    const athBaseMap = new Map();
    if (fetchReturns) {
      const stockAthBaseList = await Promise.allSettled(
        symbols.map(sym => athBaseService.getAthAndBaseMetrics(sym, quoteMap.get(sym)?.ltp))
      );
      symbols.forEach((sym, idx) => {
        if (stockAthBaseList[idx].status === 'fulfilled' && stockAthBaseList[idx].value) {
          athBaseMap.set(sym, stockAthBaseList[idx].value);
          const clean = sym.replace(/\.(NS|BO)$/i, '');
          athBaseMap.set(`${clean}.NS`, stockAthBaseList[idx].value);
          athBaseMap.set(clean, stockAthBaseList[idx].value);
        }
      });
    } else {
      symbols.forEach(sym => {
        const yahooSym = yahooFinanceService.resolveYahooSymbol(sym);
        const resolved = sym.endsWith('.NS') ? sym : `${sym}.NS`;
        const cached = athBaseService.cache?.get(`ATH_52W_V5:${sym.toUpperCase()}`)?.data ||
                       athBaseService.cache?.get(`ATH_52W_V5:${resolved.toUpperCase()}`)?.data ||
                       athBaseService.cache?.get(`ATH_52W_V5:${yahooSym.toUpperCase()}`)?.data ||
                       yahooFinanceService.historicalCache?.get(yahooSym)?.data?.athBase ||
                       yahooFinanceService.historicalCache?.get(sym)?.data?.athBase;
        if (cached) {
          athBaseMap.set(sym, cached);
          const clean = sym.replace(/\.(NS|BO)$/i, '');
          athBaseMap.set(`${clean}.NS`, cached);
          athBaseMap.set(clean, cached);
        }
      });
      const missingAthBase = symbols.filter(sym => !athBaseMap.has(sym));
      if (missingAthBase.length > 0 && missingAthBase.length <= 15) {
        const freshAthBase = await Promise.allSettled(
          missingAthBase.map(sym => athBaseService.getAthAndBaseMetrics(sym, quoteMap.get(sym)?.ltp))
        );
        missingAthBase.forEach((sym, idx) => {
          if (freshAthBase[idx].status === 'fulfilled' && freshAthBase[idx].value) {
            athBaseMap.set(sym, freshAthBase[idx].value);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            athBaseMap.set(`${clean}.NS`, freshAthBase[idx].value);
            athBaseMap.set(clean, freshAthBase[idx].value);
          }
        });
      }
    }

    // Return enriched stock data, preserving sector stock metadata and strict provenance
    const enrichedStocks = sector.stocks.map((stock) => {
      const quote = quoteMap.get(stock.symbol) || 
                    (stock.symbol.endsWith('.NS') ? quoteMap.get(stock.symbol.replace('.NS', '')) : null) ||
                    (stock.symbol.endsWith('.BO') ? quoteMap.get(stock.symbol.replace('.BO', '')) : null) ||
                    null;
      const stockFin = financialsMap.get(stock.symbol) || 
                       (stock.symbol.endsWith('.NS') ? financialsMap.get(stock.symbol.replace('.NS', '')) : null) ||
                       (stock.symbol.endsWith('.BO') ? financialsMap.get(stock.symbol.replace('.BO', '')) : null) ||
                       this._getFinFromCache(stock.symbol);
      const stockRets = returnsMap.get(stock.symbol) || (stock.symbol.endsWith('.NS') ? returnsMap.get(stock.symbol.replace('.NS', '')) : null) || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };
      const stockAthBase = athBaseMap.get(stock.symbol) || (stock.symbol.endsWith('.NS') ? athBaseMap.get(stock.symbol.replace('.NS', '')) : null);

      const resolvedEbit = isFinancialSector ? null : (stockFin?.ebit ?? quote?.ebit ?? null);
      const resolvedRevenue = stockFin?.revenue ?? quote?.revenue ?? null;
      const resolvedRevenueYoY = stockFin?.revenueYoY ?? quote?.revenueYoY ?? null;
      const resolvedRevenueQuarterly = stockFin?.revenueQuarterly ?? quote?.revenueQuarterly ?? null;
      const resolvedNetProfit = stockFin?.netProfit ?? quote?.netProfit ?? null;

      const rawRank = rankMap.get(stock.symbol) ?? (stock.symbol.endsWith('.NS') ? rankMap.get(stock.symbol.replace('.NS', '')) : null) ?? (stock.symbol.endsWith('.BO') ? rankMap.get(stock.symbol.replace('.BO', '')) : null) ?? null;
      const validMCap = (quote && typeof quote.marketCap === 'number' && quote.marketCap > 0 && !isNaN(quote.marketCap)) ? quote.marketCap : null;
      const globalRank = (typeof rawRank === 'number' && rawRank > 0) ? rawRank : (validMCap !== null ? rawRank : null);

      const hasValidPrice = quote && typeof quote.ltp === 'number' && quote.ltp > 0;
      const hasValidPrevClose = quote && typeof quote.previousClose === 'number' && quote.previousClose > 0;

      let direction = 'UNKNOWN';
      let change = null;
      let changePercent = null;

      if (hasValidPrice && hasValidPrevClose) {
        const diff = quote.ltp - quote.previousClose;
        if (diff > 0.0001) {
          direction = 'ADVANCING';
        } else if (diff < -0.0001) {
          direction = 'DECLINING';
        } else {
          direction = 'UNCHANGED';
        }
        change = parseFloat((quote.ltp - quote.previousClose).toFixed(4));
        changePercent = parseFloat((((quote.ltp - quote.previousClose) / quote.previousClose) * 100).toFixed(4));
      } else if (hasValidPrice) {
        change = (quote && typeof quote.change === 'number') ? quote.change : null;
        changePercent = (quote && typeof quote.changePercent === 'number') ? quote.changePercent : null;
      }

      const isGlobalStock = sector.region === 'global' || (!stock.symbol.endsWith('.NS') && !stock.symbol.endsWith('.BO'));
      const resolvedExchange = quote?.exchange && quote.exchange !== 'UNKNOWN'
        ? quote.exchange
        : (isGlobalStock ? 'US' : (stock.symbol.endsWith('.BO') ? 'BSE' : 'NSE'));
      const resolvedCurrency = quote?.currency || (isGlobalStock ? 'USD' : 'INR');

      if (hasValidPrice) {
        return {
          ...stock,
          ...quote,
          companyName: stock.name || quote.name || stock.symbol.replace(/\.(NS|BO)$/i, ''),
          exchange: resolvedExchange,
          currency: resolvedCurrency,
          sector: sector.name,
          sectorId: sector.id,
          sectorName: sector.name,
          indiaStockRank: isGlobalStock ? null : globalRank,
          indiaRank: isGlobalStock ? null : globalRank,
          indianMarketRank: isGlobalStock ? null : globalRank,
          globalRank,
          rank: globalRank,
          marketCap: validMCap,
          marketCapCr: validMCap ? (isGlobalStock ? parseFloat((validMCap / 1e9).toFixed(2)) : (validMCap > 1e9 ? Math.round(validMCap / 10000000) : Math.round(validMCap))) : null,
          currentPrice: quote.ltp,
          price: quote.ltp,
          pe: (typeof quote?.pe === 'number' && quote.pe > 0) ? quote.pe : (typeof stockFin?.pe === 'number' && stockFin.pe > 0 ? stockFin.pe : (quote?.pe ?? null)),
          eps: (typeof quote?.eps === 'number' && !isNaN(quote.eps)) ? quote.eps : (typeof stockFin?.eps === 'number' && !isNaN(stockFin.eps) ? stockFin.eps : (quote?.eps ?? null)),
          previousClose: hasValidPrevClose ? quote.previousClose : (quote.previousClose || null),
          change,
          changePercent,
          direction,
          performance: stockRets,
          returns: stockRets,
          ebit: resolvedEbit,
          revenue: resolvedRevenue,
          revenueCr: resolvedRevenue,
          revenueYoY: resolvedRevenueYoY,
          revenueQuarterly: resolvedRevenueQuarterly,
          netProfit: resolvedNetProfit,
          netProfitYoY: stockFin?.netProfitYoY ?? quote?.netProfitYoY ?? null,
          netProfitQuarterly: stockFin?.netProfitQuarterly ?? quote?.netProfitQuarterly ?? null,
          fiftyTwoWeekHigh: stockAthBase?.allTimeHigh || quote.high52 || null,
          fiftyTwoWeekLow: stockAthBase?.week52Low ?? stockAthBase?.baseLow ?? quote.low52 ?? null,
          week52Low: stockAthBase?.week52Low ?? stockAthBase?.baseLow ?? quote.low52 ?? null,
          week52LowDate: stockAthBase?.week52LowDate ?? stockAthBase?.baseLowDate ?? null,
          allTimeHigh: stockAthBase?.allTimeHigh || quote.high52 || null,
          allTimeHighDate: stockAthBase?.allTimeHighDate || null,
          ath: stockAthBase?.allTimeHigh || quote.high52 || null,
          ATH: stockAthBase?.allTimeHigh || quote.high52 || null,
          ATHDate: stockAthBase?.allTimeHighDate || null,
          percentFrom52WLow: stockAthBase?.percentFrom52WLow ?? stockAthBase?.pctFrom52WLow ?? stockAthBase?.recoveryFromBasePercent ?? (quote.ltp && quote.low52 ? Math.round(((quote.ltp - quote.low52) / quote.low52) * 10000) / 100 : null),
          percentFromATH: stockAthBase?.percentFromATH ?? stockAthBase?.pctFromATH ?? stockAthBase?.distanceFromATHPercent ?? (quote.ltp && quote.high52 ? Math.round(((quote.ltp - quote.high52) / quote.high52) * 10000) / 100 : null),
          pctFrom52WLow: stockAthBase?.pctFrom52WLow ?? stockAthBase?.recoveryFromBasePercent ?? (quote.ltp && quote.low52 ? Math.round(((quote.ltp - quote.low52) / quote.low52) * 10000) / 100 : null),
          pctFromATH: stockAthBase?.pctFromATH ?? stockAthBase?.distanceFromATHPercent ?? (quote.ltp && quote.high52 ? Math.round(((quote.ltp - quote.high52) / quote.high52) * 10000) / 100 : null),
          baseLow: stockAthBase?.week52Low ?? stockAthBase?.baseLow ?? quote.low52 ?? null,
          baseLowDate: stockAthBase?.week52LowDate ?? stockAthBase?.baseLowDate ?? null,
          longTermBaseLow: stockAthBase?.week52Low ?? stockAthBase?.baseLow ?? quote.low52 ?? null,
          longTermBaseLowDate: stockAthBase?.week52LowDate ?? stockAthBase?.baseLowDate ?? null,
          recoveryFromBasePercent: stockAthBase?.pctFrom52WLow ?? stockAthBase?.recoveryFromBasePercent ?? (quote.ltp && quote.low52 ? Math.round(((quote.ltp - quote.low52) / quote.low52) * 10000) / 100 : null),
          distanceFromATHPercent: stockAthBase?.pctFromATH ?? stockAthBase?.distanceFromATHPercent ?? (quote.ltp && quote.high52 ? Math.round(((quote.ltp - quote.high52) / quote.high52) * 10000) / 100 : null),
          baseStatus: stockAthBase?.baseStatus || 'WEEK_52_LOW',
          positionDataSource: stockAthBase?.positionDataSource || quote.source || 'YAHOO_FINANCE',
          historicalAsOf: stockAthBase?.historicalAsOf || null,
          athBaseMetrics: stockAthBase || null,
          source: quote.source || "YAHOO_FINANCE",
          sourceType: quote.sourceType || "YAHOO_QUOTE",
          dataStatus: quote.dataStatus || (quote.isLive ? "LIVE" : "EOD"),
          isLive: quote.isLive ?? false,
          priceAsOf: quote.priceAsOf || new Date().toISOString(),
          fetchedAt: quote.priceAsOf || quote.lastUpdatedAt || new Date().toISOString(),
          lastUpdatedAt: quote.lastUpdatedAt || new Date().toISOString()
        };
      }
      
      // If quote is completely missing or unavailable, return clean honest null representation
      return {
        ...stock,
        companyName: stock.name || stock.symbol.replace(/\.(NS|BO)$/i, ''),
        exchange: stock.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
        sector: sector.name,
        sectorId: sector.id,
        sectorName: sector.name,
        indiaStockRank: globalRank,
        indiaRank: globalRank,
        indianMarketRank: globalRank,
        globalRank,
        rank: globalRank,
        currentPrice: null,
        price: null,
        ltp: null,
        open: null,
        previousClose: null,
        change: null,
        changePercent: null,
        direction: 'UNKNOWN',
        dayHigh: null,
        dayLow: null,
        high52: null,
        low52: null,
        allTimeHigh: null,
        allTimeHighDate: null,
        ath: null,
        ATH: null,
        ATHDate: null,
        baseLow: null,
        baseLowDate: null,
        baseDurationDays: null,
        baseDurationYears: null,
        declineFromPeakPercent: null,
        recoveryFromBasePercent: null,
        distanceFromATHPercent: null,
        percentFrom52WLow: null,
        percentFromATH: null,
        pctFrom52WLow: null,
        pctFromATH: null,
        baseStatus: 'UNAVAILABLE',
        athBaseMetrics: null,
        volume: null,
        marketCap: null,
        pe: (typeof stockFin?.pe === 'number' && stockFin.pe > 0) ? stockFin.pe : null,
        pb: null,
        eps: (typeof stockFin?.eps === 'number' && !isNaN(stockFin.eps)) ? stockFin.eps : null,
        ebit: resolvedEbit,
        revenue: resolvedRevenue,
        revenueCr: resolvedRevenue,
        revenueYoY: resolvedRevenueYoY,
        revenueQuarterly: resolvedRevenueQuarterly,
        netProfit: resolvedNetProfit,
        netProfitYoY: stockFin?.netProfitYoY ?? quote?.netProfitYoY ?? null,
        netProfitQuarterly: stockFin?.netProfitQuarterly ?? quote?.netProfitQuarterly ?? null,
        dividendYield: null,
        vwap: null,
        performance: stockRets,
        returns: stockRets,
        source: "UNAVAILABLE",
        sourceType: "UNAVAILABLE",
        dataStatus: "UNAVAILABLE",
        isLive: false,
        priceAsOf: null,
        fetchedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      };
    });

    return enrichedStocks;
  }

  /**
   * Fetch historical index change percent for a timeframe.
   */
  async _getHistoricalIndexData(ticker, timeframe, baseChangePercent = 0) {
    try {
      const returns = await yahooFinanceService.getHistoricalReturns(ticker);
      if (returns && typeof returns[timeframe] === 'number' && !isNaN(returns[timeframe])) {
        return {
          changePercent: returns[timeframe]
        };
      }

      let range = '1y';
      if (timeframe === '1W') range = '5d';
      else if (timeframe === '1M') range = '1mo';
      else if (timeframe === '6M') range = '6mo';
      else if (timeframe === '1Y') range = '1y';
      else if (timeframe === '3Y') range = '5y';
      else if (timeframe === '5Y') range = '5y';
      else if (timeframe === 'ALL') range = 'max';

      const chartRes = await yahooFinanceService.getChartData(ticker, range);
      const chart = chartRes.available ? chartRes.data : [];
      if (chart && chart.length >= 2) {
        const firstPrice = chart[0].close || chart[0].value || chart[0].price;
        const lastPrice = chart[chart.length - 1].close || chart[chart.length - 1].value || chart[chart.length - 1].price;
        if (firstPrice && lastPrice && firstPrice > 0) {
          const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
          return {
            changePercent: parseFloat(changePercent.toFixed(2))
          };
        }
      }
    } catch (e) {
      console.warn(`Historical index fetch for ${ticker} (${timeframe}):`, e.message);
    }

    return {
      changePercent: baseChangePercent
    };
  }

  /**
   * Get all sectors with aggregated metrics.
   * @param {string} region - 'india', 'global', or 'all'
   * @param {string} timeframe - '1D', '1W', '1M', 'YTD'
   */
  async getAllSectors(region = 'all', timeframe = '1D', assetClass = 'stocks') {
    const cacheKey = `sectors_${region}_${timeframe}_${assetClass}`;
    return this._getCachedOrFetch(cacheKey, async () => {
      // Filter sectors by region and assetClass
      let sectors = ALL_SECTORS.filter(s => (s.assetClass || 'stocks') === assetClass);
      
      const normRegion = (region || 'all').toLowerCase();
      if (normRegion === 'india' || normRegion === 'in') {
        sectors = sectors.filter(s => s.region === 'india');
      } else if (normRegion === 'global' || normRegion === 'us') {
        sectors = sectors.filter(s => s.region === 'global');
      }

      const session = getIndianMarketSession();

      // ──────────────────────────────────────────────────────
      // STEP 1: Determine primary instrument ticker for each sector
      //   - Indian sectors: always use indexTicker (^NSEBANK, ^CNXIT, etc.)
      //     NEVER use etfTicker for Indian index rows.
      //   - Global sectors: use etfTicker (XLK, XLV, etc.) as the benchmark instrument.
      // ──────────────────────────────────────────────────────
      const primaryTickerMap = new Map(); // sectorId -> ticker
      for (const s of sectors) {
        if (s.region === 'india') {
          if (s.indexTicker) {
            primaryTickerMap.set(s.id, s.indexTicker);
          }
        } else {
          if (s.etfTicker) {
            primaryTickerMap.set(s.id, s.etfTicker);
          } else if (s.indexTicker) {
            primaryTickerMap.set(s.id, s.indexTicker);
          }
        }
      }

      // ──────────────────────────────────────────────────────
      // STEP 2: Batch-fetch index and constituent quotes concurrently
      // ──────────────────────────────────────────────────────
      const uniquePrimaryTickers = [...new Set([...primaryTickerMap.values()].filter(Boolean))];
      const allConstituentSymbols = [...new Set(sectors.flatMap(s => s.stocks.map(st => st.symbol)))];

      const [primaryQuotes, constituentQuotes] = await Promise.all([
        uniquePrimaryTickers.length > 0 ? this._batchFetchQuotes(uniquePrimaryTickers) : Promise.resolve([]),
        allConstituentSymbols.length > 0 ? this._batchFetchQuotes(allConstituentSymbols) : Promise.resolve([])
      ]);

      const primaryQuoteMap = new Map();
      primaryQuotes.forEach(q => {
        if (q && q.symbol) {
          primaryQuoteMap.set(q.symbol, q);
        }
      });

      const fullQuoteMap = new Map();
      if (this.symbolCache && typeof this.symbolCache.entries === 'function') {
        for (const [sym, entry] of this.symbolCache.entries()) {
          const q = entry?.data;
          if (q && q.symbol) {
            fullQuoteMap.set(q.symbol, q);
            const clean = q.symbol.replace(/\.(NS|BO)$/i, '');
            fullQuoteMap.set(`${clean}.NS`, q);
            fullQuoteMap.set(clean, q);
          }
        }
      }
      if (yahooFinanceService.quoteCache && typeof yahooFinanceService.quoteCache.entries === 'function') {
        for (const [sym, entry] of yahooFinanceService.quoteCache.entries()) {
          const q = entry?.data;
          if (q && q.symbol && !fullQuoteMap.has(q.symbol)) {
            fullQuoteMap.set(q.symbol, q);
            const clean = q.symbol.replace(/\.(NS|BO)$/i, '');
            fullQuoteMap.set(`${clean}.NS`, q);
            fullQuoteMap.set(clean, q);
          }
        }
      }
      constituentQuotes.forEach(q => {
        if (q && q.symbol) {
          fullQuoteMap.set(q.symbol, q);
          const clean = q.symbol.replace(/\.(NS|BO)$/i, '');
          fullQuoteMap.set(`${clean}.NS`, q);
          fullQuoteMap.set(clean, q);
        }
      });

      const globalRankMap = await this._getOrComputeGlobalRankMap(fullQuoteMap);

      // ──────────────────────────────────────────────────────
      // STEP 3: Unified Historical Analysis for Primary Index Tickers (1 pass for Returns + ATH + 52W)
      // ──────────────────────────────────────────────────────
      const indexAnalysisMap = new Map();
      if (!this.isCircuitBreakerActive() && uniquePrimaryTickers.length > 0) {
        let failedIndices = 0;
        const indexTasks = uniquePrimaryTickers.map((ticker) => async () => {
          if (this.isCircuitBreakerActive()) return;
          try {
            const ltp = primaryQuoteMap.get(ticker)?.ltp;
            const analysis = await withTimeout(yahooFinanceService.getHistoricalAnalysis(ticker, ltp), 3500, null);
            if (analysis && (Object.values(analysis.returns || {}).some(v => v !== null) || analysis.athBase)) {
              indexAnalysisMap.set(ticker, analysis);
            } else {
              failedIndices++;
            }
          } catch (e) {
            failedIndices++;
          }
        });
        await runWithConcurrencyLimit(indexTasks, 8);
        if (failedIndices > 0) {
          console.warn(`[SectorDataService] ${failedIndices}/${uniquePrimaryTickers.length} index fetches failed, using cached data.`);
          if (failedIndices === uniquePrimaryTickers.length) {
            this.tripCircuitBreaker('all index historical fetches failed');
          }
        }
      }

      // ──────────────────────────────────────────────────────
      // STEP 4: Build Sector Objects
      // ──────────────────────────────────────────────────────
      const results = [];

      for (const sector of sectors) {
        try {
          const stocksWithQuotes = await this._fetchSectorQuotes(sector, false, globalRankMap);
          const validStocks = stocksWithQuotes.filter(s => typeof s.ltp === 'number' && s.ltp > 0 && s.dataStatus !== 'UNAVAILABLE');

          // Constituent aggregates
          const changePercents = validStocks.map(s => s.changePercent).filter(v => typeof v === 'number' && !isNaN(v));
          const avgChangePercent = changePercents.length > 0
            ? parseFloat((changePercents.reduce((sum, v) => sum + v, 0) / changePercents.length).toFixed(2))
            : 0;

          const advancingStocks = stocksWithQuotes.filter(s => s.direction === 'ADVANCING');
          const decliningStocks = stocksWithQuotes.filter(s => s.direction === 'DECLINING');
          const unchangedStocks = stocksWithQuotes.filter(s => s.direction === 'UNCHANGED');
          const unknownStocks = stocksWithQuotes.filter(s => s.direction === 'UNKNOWN');

          const advances = advancingStocks.length;
          const declines = decliningStocks.length;
          const unchanged = unchangedStocks.length;
          const unknown = unknownStocks.length;

          // Constituent market cap and financials
          const totalMarketCap = validStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
          
          const isFinancialSector = sector.id.includes('bank') || sector.id.includes('fin') || sector.id.includes('insurance');
          let totalEbit = null;
          if (!isFinancialSector) {
            const validEbitStocks = validStocks.filter(s => typeof s.ebit === 'number' && !isNaN(s.ebit));
            if (validEbitStocks.length > 0) {
              totalEbit = validEbitStocks.reduce((sum, s) => sum + s.ebit, 0);
            }
          }

          const validRevenueStocks = validStocks.filter(s => typeof s.revenue === 'number' && s.revenue > 0);
          const totalRevenue = validRevenueStocks.length > 0
            ? validRevenueStocks.reduce((sum, s) => sum + s.revenue, 0)
            : null;

          let sectorRevenueYoY = null;
          const stocksWithYoY = validStocks.filter(s => typeof s.revenueYoY === 'number' && !isNaN(s.revenueYoY) && typeof s.revenue === 'number' && s.revenue > 0);
          if (stocksWithYoY.length > 0) {
            const totalRevForYoY = stocksWithYoY.reduce((sum, s) => sum + s.revenue, 0);
            if (totalRevForYoY > 0) {
              sectorRevenueYoY = parseFloat((stocksWithYoY.reduce((sum, s) => sum + (s.revenueYoY * s.revenue), 0) / totalRevForYoY).toFixed(2));
            }
          }

          const validNetProfitStocks = validStocks.filter(s => typeof s.netProfit === 'number' && s.netProfit > 0);
          let totalNetProfit = validNetProfitStocks.length > 0
            ? validNetProfitStocks.reduce((sum, s) => sum + s.netProfit, 0)
            : null;

          // Official index instrument data
          const primaryTicker = primaryTickerMap.get(sector.id) || null;
          const indexQuote = primaryTicker ? primaryQuoteMap.get(primaryTicker) : null;
          const indexAnalysis = primaryTicker ? indexAnalysisMap.get(primaryTicker) : null;
          const indexReturns = indexAnalysis?.returns || null;
          const athBase = indexAnalysis?.athBase || null;

          // Official index prices (never constituent averages)
          const indexPrice = (indexQuote && typeof indexQuote.ltp === 'number' && indexQuote.ltp > 0) ? indexQuote.ltp : null;
          const previousClose = (indexQuote && typeof indexQuote.previousClose === 'number' && indexQuote.previousClose > 0) ? indexQuote.previousClose : null;
          const open = (indexQuote && typeof indexQuote.open === 'number' && indexQuote.open > 0) ? indexQuote.open : null;
          const dayHigh = (indexQuote && typeof indexQuote.dayHigh === 'number' && indexQuote.dayHigh > 0) ? indexQuote.dayHigh : null;
          const dayLow = (indexQuote && typeof indexQuote.dayLow === 'number' && indexQuote.dayLow > 0) ? indexQuote.dayLow : null;

          // Official 52W High / Low & ATH
          const fiftyTwoWeekHigh = athBase?.allTimeHigh || ((indexQuote && typeof indexQuote.high52 === 'number' && indexQuote.high52 > 0) ? indexQuote.high52 : null);
          const fiftyTwoWeekLow = athBase?.week52Low || ((indexQuote && typeof indexQuote.low52 === 'number' && indexQuote.low52 > 0) ? indexQuote.low52 : null);

          // Index PE & EPS (strictly from index instrument, never constituent average)
          const indexPe = (indexQuote && typeof indexQuote.pe === 'number' && indexQuote.pe > 0) ? indexQuote.pe : null;
          const indexEps = (indexQuote && typeof indexQuote.eps === 'number') ? indexQuote.eps : null;
          const indexVolume = (indexQuote && typeof indexQuote.volume === 'number' && indexQuote.volume > 0) ? indexQuote.volume : null;

          // Index multi-period returns
          const sectorReturns = {};
          ['1W', '1M', '6M', '1Y', '3Y', '5Y', 'ALL'].forEach(p => {
            const hasIndexVal = indexReturns && typeof indexReturns[p] === 'number' && !isNaN(indexReturns[p]);
            sectorReturns[p] = hasIndexVal ? indexReturns[p] : null;
          });

          // Sector change percent
          let sectorChangePercent = 0;
          if (timeframe === '1D') {
            sectorChangePercent = (indexQuote && typeof indexQuote.changePercent === 'number' && !isNaN(indexQuote.changePercent))
              ? indexQuote.changePercent 
              : avgChangePercent;
          } else if (sectorReturns[timeframe] !== null && sectorReturns[timeframe] !== undefined) {
            sectorChangePercent = sectorReturns[timeframe];
          } else {
            sectorChangePercent = avgChangePercent;
          }

          let trend = 'Neutral';
          if (sectorChangePercent > 0.5) trend = 'Bullish';
          else if (sectorChangePercent < -0.5) trend = 'Bearish';

          const indexDataStatus = indexPrice !== null
            ? (session.isOpen ? 'LIVE' : 'EOD')
            : 'UNAVAILABLE';

          results.push({
            id: sector.id,
            name: sector.name,
            region: sector.region,
            assetClass: sector.assetClass || 'stocks',
            primaryTicker,
            indexTicker: sector.indexTicker || null,
            etfTicker: sector.etfTicker || null,
            indexDataSource: primaryTicker || null,
            indexDataStatus,
            indexDataTimestamp: new Date().toISOString(),

            // Official index metrics
            price: indexPrice,
            indexPrice,
            previousClose,
            open,
            dayHigh,
            dayLow,
            fiftyTwoWeekHigh,
            fiftyTwoWeekLow,

            // ATH & 52W Low
            week52Low: athBase?.week52Low ?? fiftyTwoWeekLow ?? null,
            week52LowDate: athBase?.week52LowDate ?? null,
            allTimeHigh: athBase?.allTimeHigh ?? fiftyTwoWeekHigh ?? null,
            allTimeHighDate: athBase?.allTimeHighDate ?? null,
            ath: athBase?.allTimeHigh ?? fiftyTwoWeekHigh ?? null,
            ATH: athBase?.allTimeHigh ?? fiftyTwoWeekHigh ?? null,
            ATHDate: athBase?.allTimeHighDate ?? null,
            percentFrom52WLow: athBase?.percentFrom52WLow ?? athBase?.pctFrom52WLow ?? (indexPrice && fiftyTwoWeekLow ? Math.round(((indexPrice - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 10000) / 100 : null),
            percentFromATH: athBase?.percentFromATH ?? athBase?.pctFromATH ?? (indexPrice && fiftyTwoWeekHigh ? Math.round(((indexPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 10000) / 100 : null),
            pctFrom52WLow: athBase?.pctFrom52WLow ?? (indexPrice && fiftyTwoWeekLow ? Math.round(((indexPrice - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 10000) / 100 : null),
            pctFromATH: athBase?.pctFromATH ?? (indexPrice && fiftyTwoWeekHigh ? Math.round(((indexPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 10000) / 100 : null),
            recoveryFromBasePercent: athBase?.pctFrom52WLow ?? (indexPrice && fiftyTwoWeekLow ? Math.round(((indexPrice - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 10000) / 100 : null),
            distanceFromATHPercent: athBase?.pctFromATH ?? (indexPrice && fiftyTwoWeekHigh ? Math.round(((indexPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 10000) / 100 : null),
            baseStatus: athBase?.baseStatus || 'WEEK_52_LOW',
            positionDataSource: athBase?.positionDataSource || 'YAHOO_FINANCE',
            historicalAsOf: athBase?.historicalAsOf || null,
            athBaseMetrics: athBase || null,

            pe: indexPe,
            eps: indexEps,
            totalVolume: indexVolume,

            changePercent: sectorChangePercent,
            trend,
            returns: sectorReturns,

            // Constituent metrics and stock lists
            advances,
            declines,
            unchanged,
            unknown,
            totalValidStocks: stocksWithQuotes.length,
            advancingStocks,
            decliningStocks,
            unchangedStocks,
            unknownStocks,
            totalStocks: validStocks.length,
            configuredStocks: sector.stocks.length,
            validStocks: validStocks.length,
            totalMarketCap,
            ebit: totalEbit,
            revenue: totalRevenue,
            revenueCr: totalRevenue,
            revenueYoY: sectorRevenueYoY,
            revenueQuarterly: null,
            netProfit: totalNetProfit,

            stocks: stocksWithQuotes
          });
        } catch (err) {
          console.error(`Error processing sector ${sector.id}:`, err.message);
        }
      }

      return results;
    });
  }

  /**
   * Get detailed data for a single sector by ID.
   */
  async getSectorDetail(sectorId, timeframe = '1D') {
    if (!sectorId) return null;
    const normId = sectorId.toLowerCase().trim();
    const sector = ALL_SECTORS.find(s => 
      s.id.toLowerCase() === normId ||
      s.name.toLowerCase() === normId ||
      s.id.replace('global-', '').toLowerCase() === normId ||
      s.id.replace('nifty-', '').toLowerCase() === normId ||
      (normId.includes('tech') && s.id.includes('technology')) ||
      (normId.includes('bank') && s.id.includes('bank')) ||
      (normId.includes('pharma') && s.id.includes('pharma')) ||
      (normId.includes('auto') && s.id.includes('auto')) ||
      (normId.includes('fmcg') && s.id.includes('fmcg'))
    );
    if (!sector) return null;

    const cacheKey = `sector_detail_${sector.id}_${timeframe}`;
    return this._getCachedOrFetch(cacheKey, async () => {
      // Ensure global rankings are computed
      const rankMap = await this._getOrComputeGlobalRankMap();

      const stocksWithQuotes = await this._fetchSectorQuotes(sector, true, rankMap);
      const validStocks = stocksWithQuotes.filter(s => typeof s.ltp === 'number' && s.ltp > 0);

      // If timeframe is not 1D, use constituent stock historical return for the selected timeframe
      const isHistorical = timeframe !== '1D';
      if (isHistorical) {
        stocksWithQuotes.forEach(stock => {
          if (stock.returns && typeof stock.returns[timeframe] === 'number' && !isNaN(stock.returns[timeframe])) {
            stock.changePercent = stock.returns[timeframe];
            if (typeof stock.ltp === 'number' && stock.ltp > 0) {
              const basePrice = stock.ltp / (1 + stock.changePercent / 100);
              stock.change = parseFloat((stock.ltp - basePrice).toFixed(2));
            }
          }
        });
      }

      // Sort by changePercent descending
      const sorted = [...stocksWithQuotes].sort((a, b) => {
        const aVal = (typeof a.changePercent === 'number' && !isNaN(a.changePercent)) ? a.changePercent : -99999;
        const bVal = (typeof b.changePercent === 'number' && !isNaN(b.changePercent)) ? b.changePercent : -99999;
        return bVal - aVal;
      });
      const validSorted = sorted.filter(s => typeof s.ltp === 'number' && s.ltp > 0 && typeof s.changePercent === 'number' && !isNaN(s.changePercent));
      const gainers = validSorted.slice(0, 5);
      const losers = [...validSorted].reverse().slice(0, 5);

      const changePercents = validStocks.map(s => s.changePercent).filter(v => typeof v === 'number' && !isNaN(v));
      const avgChangePercent = changePercents.length > 0
        ? parseFloat((changePercents.reduce((sum, v) => sum + v, 0) / changePercents.length).toFixed(2))
        : 0;

      const advanceCount = validStocks.filter(s => typeof s.changePercent === 'number' && s.changePercent > 0).length;
      const declineCount = validStocks.filter(s => typeof s.changePercent === 'number' && s.changePercent < 0).length;

      // Fetch the primary index quote to get the true change percent and 52W metrics
      const primaryTicker = sector.region === 'india' 
        ? (sector.indexTicker || null)
        : (sector.etfTicker || sector.indexTicker || null);

      let sectorChangePercent = avgChangePercent;
      let indexPrice = null;
      let fiftyTwoWeekHigh = null;
      let fiftyTwoWeekLow = null;
      let indexPe = null;
      let indexEps = null;
      
      if (primaryTicker) {
        try {
          if (isHistorical) {
            const hist = await this._getHistoricalIndexData(primaryTicker, timeframe, 0);
            if (hist) {
              sectorChangePercent = hist.changePercent;
              if (hist.price) indexPrice = hist.price;
            }
          } else {
            const indexQuoteArrayRes = await marketDataGateway.getQuotes([primaryTicker]);
            const indexQuoteArray = indexQuoteArrayRes.available ? indexQuoteArrayRes.data : [];
            if (indexQuoteArray && indexQuoteArray.length > 0) {
              const q = indexQuoteArray[0];
              if (typeof q.changePercent === 'number') sectorChangePercent = q.changePercent;
              if (q.ltp) indexPrice = q.ltp;
              if (q.high52) fiftyTwoWeekHigh = q.high52;
              if (q.low52) fiftyTwoWeekLow = q.low52;
              if (typeof q.pe === 'number' && q.pe > 0) indexPe = q.pe;
              if (typeof q.eps === 'number') indexEps = q.eps;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch index quote for ${primaryTicker}:`, e.message);
        }
      }

      let trend = 'Neutral';
      if (sectorChangePercent > 0.5) trend = 'Bullish';
      else if (sectorChangePercent < -0.5) trend = 'Bearish';

      // Generate AI summary dynamically based on trend
      const periodLabel = timeframe === '1D' ? 'today' : `over the ${timeframe} period`;
      let aiSummary = '';
      if (trend === 'Bullish') {
        aiSummary = `The ${sector.name} sector is exhibiting strong bullish momentum ${periodLabel}. Heavy institutional flows are driving top counters higher, with ${gainers[0]?.name || 'major stocks'} leading the rally. Technical charts suggest the sector has broken out of its short-term resistance zone. ${advanceCount} out of ${validStocks.length} constituents are trading in the green.`;
      } else if (trend === 'Bearish') {
        aiSummary = `The ${sector.name} sector has turned bearish ${periodLabel} under significant selling pressure. Volatility remains high as institutional investors trim holdings in key stocks like ${losers[0]?.name || 'heavyweights'}. Support levels on daily charts are currently being tested. ${declineCount} out of ${validStocks.length} constituents are trading in the red.`;
      } else {
        aiSummary = `The ${sector.name} sector is demonstrating range-bound and neutral activity ${periodLabel}. Trading volume remains moderate with mixed performance across the constituents. ${advanceCount} stocks are advancing while ${declineCount} are declining. Traders are awaiting key macro indicators before committing to directional positions.`;
      }

      const isFinancialSector = sector.id.includes('bank') || sector.id.includes('fin') || sector.id.includes('insurance');
      let totalEbit = null;
      if (!isFinancialSector) {
        const validEbitStocks = validStocks.filter(s => typeof s.ebit === 'number' && !isNaN(s.ebit));
        if (validEbitStocks.length > 0) {
          totalEbit = validEbitStocks.reduce((sum, s) => sum + s.ebit, 0);
        }
      }

      const validRevenueStocks = validStocks.filter(s => typeof s.revenue === 'number' && s.revenue > 0);
      const totalRevenue = validRevenueStocks.length > 0
        ? validRevenueStocks.reduce((sum, s) => sum + s.revenue, 0)
        : null;

      let sectorRevenueYoY = null;
      const stocksWithYoY = validStocks.filter(s => typeof s.revenueYoY === 'number' && !isNaN(s.revenueYoY) && typeof s.revenue === 'number' && s.revenue > 0);
      if (stocksWithYoY.length > 0) {
        const totalRevForYoY = stocksWithYoY.reduce((sum, s) => sum + s.revenue, 0);
        if (totalRevForYoY > 0) {
          sectorRevenueYoY = parseFloat((stocksWithYoY.reduce((sum, s) => sum + (s.revenueYoY * s.revenue), 0) / totalRevForYoY).toFixed(2));
        }
      }

      const validNetProfitStocks = validStocks.filter(s => typeof s.netProfit === 'number' && s.netProfit > 0);
      let totalNetProfit = validNetProfitStocks.length > 0
        ? validNetProfitStocks.reduce((sum, s) => sum + s.netProfit, 0)
        : null;

      const totalVolume = validStocks.reduce((sum, s) => sum + (s.volume || 0), 0);
      const totalMarketCap = validStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);

      let athBase = null;
      if (primaryTicker) {
        try {
          athBase = await athBaseService.getAthAndBaseMetrics(primaryTicker, indexPrice);
        } catch (e) {
          console.warn(`Failed to fetch ATH/Base metrics for index ${primaryTicker}:`, e.message);
        }
      }

      const advancingStocks = stocksWithQuotes.filter(s => s.direction === 'ADVANCING');
      const decliningStocks = stocksWithQuotes.filter(s => s.direction === 'DECLINING');
      const unchangedStocks = stocksWithQuotes.filter(s => s.direction === 'UNCHANGED');
      const unknownStocks = stocksWithQuotes.filter(s => s.direction === 'UNKNOWN');

      const advances = advancingStocks.length;
      const declines = decliningStocks.length;
      const unchanged = unchangedStocks.length;
      const unknown = unknownStocks.length;

      return {
        id: sector.id,
        name: sector.name,
        region: sector.region,
        indexSymbol: primaryTicker,
        indexPrice,
        fiftyTwoWeekHigh: athBase?.allTimeHigh || fiftyTwoWeekHigh || null,
        fiftyTwoWeekLow: athBase?.week52Low || fiftyTwoWeekLow || null,
        week52Low: athBase?.week52Low ?? athBase?.baseLow ?? fiftyTwoWeekLow ?? null,
        week52LowDate: athBase?.week52LowDate ?? athBase?.baseLowDate ?? null,
        allTimeHigh: athBase?.allTimeHigh || fiftyTwoWeekHigh || null,
        allTimeHighDate: athBase?.allTimeHighDate || null,
        ath: athBase?.allTimeHigh || fiftyTwoWeekHigh || null,
        ATH: athBase?.allTimeHigh || fiftyTwoWeekHigh || null,
        ATHDate: athBase?.allTimeHighDate || null,
        percentFrom52WLow: athBase?.percentFrom52WLow ?? athBase?.pctFrom52WLow ?? athBase?.recoveryFromBasePercent ?? (indexPrice && (athBase?.week52Low || fiftyTwoWeekLow) ? Math.round(((indexPrice - (athBase?.week52Low || fiftyTwoWeekLow)) / (athBase?.week52Low || fiftyTwoWeekLow)) * 10000) / 100 : null),
        percentFromATH: athBase?.percentFromATH ?? athBase?.pctFromATH ?? athBase?.distanceFromATHPercent ?? (indexPrice && (athBase?.allTimeHigh || fiftyTwoWeekHigh) ? Math.round(((indexPrice - (athBase?.allTimeHigh || fiftyTwoWeekHigh)) / (athBase?.allTimeHigh || fiftyTwoWeekHigh)) * 10000) / 100 : null),
        pctFrom52WLow: athBase?.pctFrom52WLow ?? athBase?.recoveryFromBasePercent ?? (indexPrice && (athBase?.week52Low || fiftyTwoWeekLow) ? Math.round(((indexPrice - (athBase?.week52Low || fiftyTwoWeekLow)) / (athBase?.week52Low || fiftyTwoWeekLow)) * 10000) / 100 : null),
        pctFromATH: athBase?.pctFromATH ?? athBase?.distanceFromATHPercent ?? (indexPrice && (athBase?.allTimeHigh || fiftyTwoWeekHigh) ? Math.round(((indexPrice - (athBase?.allTimeHigh || fiftyTwoWeekHigh)) / (athBase?.allTimeHigh || fiftyTwoWeekHigh)) * 10000) / 100 : null),
        baseLow: athBase?.week52Low ?? athBase?.baseLow ?? fiftyTwoWeekLow ?? null,
        baseLowDate: athBase?.week52LowDate ?? athBase?.baseLowDate ?? null,
        longTermBaseLow: athBase?.week52Low ?? athBase?.baseLow ?? fiftyTwoWeekLow ?? null,
        longTermBaseLowDate: athBase?.week52LowDate ?? athBase?.baseLowDate ?? null,
        recoveryFromBasePercent: athBase?.pctFrom52WLow ?? athBase?.recoveryFromBasePercent ?? (indexPrice && (athBase?.week52Low || fiftyTwoWeekLow) ? Math.round(((indexPrice - (athBase?.week52Low || fiftyTwoWeekLow)) / (athBase?.week52Low || fiftyTwoWeekLow)) * 10000) / 100 : null),
        distanceFromATHPercent: athBase?.pctFromATH ?? athBase?.distanceFromATHPercent ?? (indexPrice && (athBase?.allTimeHigh || fiftyTwoWeekHigh) ? Math.round(((indexPrice - (athBase?.allTimeHigh || fiftyTwoWeekHigh)) / (athBase?.allTimeHigh || fiftyTwoWeekHigh)) * 10000) / 100 : null),
        baseStatus: athBase?.baseStatus || 'WEEK_52_LOW',
        positionDataSource: athBase?.positionDataSource || 'YAHOO_FINANCE',
        historicalAsOf: athBase?.historicalAsOf || null,
        athBaseMetrics: athBase || null,
        pe: indexPe,
        eps: indexEps,
        changePercent: sectorChangePercent,
        timeframe,
        trend,
        ebit: totalEbit,
        revenue: totalRevenue,
        revenueCr: totalRevenue,
        revenueYoY: sectorRevenueYoY,
        revenueQuarterly: null,
        netProfit: totalNetProfit,
        totalVolume,
        totalMarketCap,
        stocks: sorted,
        gainers,
        losers,
        advances,
        declines,
        unchanged,
        unknown,
        totalValidStocks: stocksWithQuotes.length,
        advanceCount: advances,
        declineCount: declines,
        advancingStocks,
        decliningStocks,
        unchangedStocks,
        unknownStocks,
        validStocks: validStocks.length,
        totalStocks: validStocks.length,
        aiSummary
      };
    });
  }

  /**
   * Returns the entire Stocks Performance universe as a deduplicated, globally ranked list of stocks.
   * Sorted strictly by globalRank ASC (1..N), with unranked at end.
   */
  async getAllRankedStocks(region = 'all', timeframe = '1D', assetClass = 'stocks') {
    const cacheKey = `all_ranked_stocks_${region}_${timeframe}_${assetClass}`;
    return this._getCachedOrFetch(cacheKey, async () => {
      let sectors = ALL_SECTORS.filter(s => (s.assetClass || 'stocks') === assetClass);
      if (region === 'india') {
        sectors = sectors.filter(s => s.region === 'india');
      } else if (region === 'global') {
        sectors = sectors.filter(s => s.region === 'global');
      }

      // Map stock symbol -> primary sector metadata
      const stockSectorMap = new Map();
      sectors.forEach(s => {
        s.stocks.forEach(st => {
          if (!stockSectorMap.has(st.symbol)) {
            stockSectorMap.set(st.symbol, {
              sectorId: s.id,
              sectorName: s.name,
              region: s.region
            });
          }
        });
      });

      // For active stocks universe, fetch constituent and priority symbols
      const normRegion = (region || 'all').toLowerCase();
      const isGlobal = normRegion === 'global' || normRegion === 'us';
      const sectorStockSyms = sectors.flatMap(s => (s.stocks || []).map(st => st.symbol));
      const activeSymbols = isGlobal
        ? [...new Set(sectorStockSyms)]
        : [...new Set([
            ...sectorStockSyms,
            ...this.getAllSymbols(),
            ...INDIAN_PRIORITY_SYMBOLS.map(s => `${s}.NS`),
            ...INDIAN_PRIORITY_SYMBOLS
          ])];
      const allSymbols = isGlobal ? activeSymbols : this.getAllIndianSymbols();

      // Seed quoteMap from existing symbolCache and quoteCache before fetching fresh
      const quoteMap = new Map();
      if (this.symbolCache && typeof this.symbolCache.entries === 'function') {
        for (const [sym, entry] of this.symbolCache.entries()) {
          const q = entry?.data;
          if (q && q.symbol && typeof q.ltp === 'number' && q.ltp > 0) {
            quoteMap.set(q.symbol, q);
            const clean = q.symbol.replace(/\.(NS|BO)$/i, '');
            quoteMap.set(`${clean}.NS`, q);
            quoteMap.set(clean, q);
          }
        }
      }
      if (yahooFinanceService.quoteCache && typeof yahooFinanceService.quoteCache.entries === 'function') {
        for (const [sym, entry] of yahooFinanceService.quoteCache.entries()) {
          const q = entry?.data;
          if (q && q.symbol && typeof q.ltp === 'number' && q.ltp > 0 && !quoteMap.has(q.symbol)) {
            quoteMap.set(q.symbol, q);
            const clean = q.symbol.replace(/\.(NS|BO)$/i, '');
            quoteMap.set(`${clean}.NS`, q);
            quoteMap.set(clean, q);
          }
        }
      }

      // Seed quoteMap from existing sectors in this.cache
      if (this.cache && typeof this.cache.entries === 'function') {
        for (const [key, entry] of this.cache.entries()) {
          if (Array.isArray(entry?.data)) {
            entry.data.forEach(sec => {
              if (Array.isArray(sec?.stocks)) {
                sec.stocks.forEach(stk => {
                  if (stk && stk.symbol && typeof stk.currentPrice === 'number' && stk.currentPrice > 0 && !quoteMap.has(stk.symbol)) {
                    const q = {
                      ...stk,
                      ltp: stk.currentPrice,
                      open: stk.open ?? stk.currentPrice,
                      previousClose: stk.previousClose ?? stk.currentPrice,
                      marketCap: stk.marketCap
                    };
                    quoteMap.set(stk.symbol, q);
                    const clean = stk.symbol.replace(/\.(NS|BO)$/i, '');
                    quoteMap.set(`${clean}.NS`, q);
                    quoteMap.set(clean, q);
                  }
                });
              }
            });
          }
        }
      }

      const quotes = await this._batchFetchQuotes(activeSymbols);
      quotes.forEach(q => {
        if (q && q.symbol) {
          quoteMap.set(q.symbol, q);
          const clean = q.symbol.replace(/\.(NS|BO)$/i, '');
          quoteMap.set(`${clean}.NS`, q);
          quoteMap.set(clean, q);
        }
      });

      // Compute global rankings strictly across the Indian NSE/BSE equity universe
      const globalRankMap = await this._getOrComputeGlobalRankMap(quoteMap);

      // Fast cached historical returns, financials, and ATH metrics
      const returnsMap = new Map();
      const finMap = new Map();
      const athBaseMap = new Map();

      if (timeframe !== '1D') {
        const heavySymbols = [...new Set([...sectors.flatMap(s => s.stocks.map(st => st.symbol)), ...INDIAN_PRIORITY_SYMBOLS.slice(0, 30)])];
        const [returnsList, finList, athBaseList] = await Promise.all([
          Promise.allSettled(heavySymbols.map(sym => yahooFinanceService.getHistoricalReturns(sym))),
          Promise.allSettled(heavySymbols.map(sym => yahooFinanceService.getStockFinancials(sym))),
          Promise.allSettled(heavySymbols.map(sym => athBaseService.getAthAndBaseMetrics(sym, quoteMap.get(sym)?.ltp)))
        ]);
        heavySymbols.forEach((sym, idx) => {
          if (returnsList[idx].status === 'fulfilled' && returnsList[idx].value) {
            returnsMap.set(sym, returnsList[idx].value);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            returnsMap.set(`${clean}.NS`, returnsList[idx].value);
            returnsMap.set(clean, returnsList[idx].value);
          }
          if (finList[idx].status === 'fulfilled' && finList[idx].value) {
            finMap.set(sym, finList[idx].value);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            finMap.set(`${clean}.NS`, finList[idx].value);
            finMap.set(clean, finList[idx].value);
          }
          if (athBaseList[idx].status === 'fulfilled' && athBaseList[idx].value) {
            athBaseMap.set(sym, athBaseList[idx].value);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            athBaseMap.set(`${clean}.NS`, athBaseList[idx].value);
            athBaseMap.set(clean, athBaseList[idx].value);
          }
        });
        // Check memory caches for all other symbols
        allSymbols.forEach(sym => {
          const yahooSym = yahooFinanceService.resolveYahooSymbol(sym);
          const resolved = sym.endsWith('.NS') || sym.endsWith('.BO') ? sym : `${sym}.NS`;
          if (!returnsMap.has(sym)) {
            const ret = yahooFinanceService.returnsCache?.get(sym)?.data ||
                        yahooFinanceService.returnsCache?.get(resolved)?.data ||
                        yahooFinanceService.returnsCache?.get(yahooSym)?.data ||
                        yahooFinanceService.historicalCache?.get(yahooSym)?.data?.returns ||
                        yahooFinanceService.historicalCache?.get(resolved)?.data?.returns ||
                        yahooFinanceService.historicalCache?.get(sym)?.data?.returns;
            if (ret) {
              returnsMap.set(sym, ret);
              const clean = sym.replace(/\.(NS|BO)$/i, '');
              returnsMap.set(`${clean}.NS`, ret);
              returnsMap.set(clean, ret);
            }
          }
          if (!finMap.has(sym)) {
            const fin = this._getFinFromCache(sym) || this._getFinFromCache(yahooSym);
            if (fin) {
              finMap.set(sym, fin);
              const clean = sym.replace(/\.(NS|BO)$/i, '');
              finMap.set(`${clean}.NS`, fin);
              finMap.set(clean, fin);
            }
          }
          if (!athBaseMap.has(sym)) {
            const resolved = sym.endsWith('.NS') ? sym : `${sym}.NS`;
            const ath = athBaseService.cache?.get(`ATH_52W_V5:${sym.toUpperCase()}`)?.data ||
                        athBaseService.cache?.get(`ATH_52W_V5:${resolved.toUpperCase()}`)?.data ||
                        athBaseService.cache?.get(`ATH_52W_V5:${yahooSym.toUpperCase()}`)?.data ||
                        yahooFinanceService.historicalCache?.get(yahooSym)?.data?.athBase ||
                        yahooFinanceService.historicalCache?.get(sym)?.data?.athBase;
            if (ath) {
              athBaseMap.set(sym, ath);
              const clean = sym.replace(/\.(NS|BO)$/i, '');
              athBaseMap.set(`${clean}.NS`, ath);
              athBaseMap.set(clean, ath);
            }
          }
        });
      } else {
        // Fast path for 1D overview: pull from memory caches
        allSymbols.forEach(sym => {
          const yahooSym = yahooFinanceService.resolveYahooSymbol(sym);
          const resolved = sym.endsWith('.NS') || sym.endsWith('.BO') ? sym : `${sym}.NS`;
          const ret = yahooFinanceService.returnsCache?.get(sym)?.data ||
                      yahooFinanceService.returnsCache?.get(resolved)?.data ||
                      yahooFinanceService.returnsCache?.get(yahooSym)?.data ||
                      yahooFinanceService.historicalCache?.get(yahooSym)?.data?.returns ||
                      yahooFinanceService.historicalCache?.get(resolved)?.data?.returns ||
                      yahooFinanceService.historicalCache?.get(sym)?.data?.returns;
          if (ret) {
            returnsMap.set(sym, ret);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            returnsMap.set(`${clean}.NS`, ret);
            returnsMap.set(clean, ret);
          }

          const fin = this._getFinFromCache(sym) || this._getFinFromCache(yahooSym);
          if (fin) {
            finMap.set(sym, fin);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            finMap.set(`${clean}.NS`, fin);
            finMap.set(clean, fin);
          }

          const ath = athBaseService.cache?.get(`ATH_52W_V5:${sym.toUpperCase()}`)?.data ||
                      athBaseService.cache?.get(`ATH_52W_V5:${resolved.toUpperCase()}`)?.data ||
                      athBaseService.cache?.get(`ATH_52W_V5:${yahooSym.toUpperCase()}`)?.data ||
                      yahooFinanceService.historicalCache?.get(yahooSym)?.data?.athBase ||
                      yahooFinanceService.historicalCache?.get(sym)?.data?.athBase;
          if (ath) {
            athBaseMap.set(sym, ath);
            const clean = sym.replace(/\.(NS|BO)$/i, '');
            athBaseMap.set(`${clean}.NS`, ath);
            athBaseMap.set(clean, ath);
          }
        });

        // Ensure all top 100 ranked stocks and sector constituents have genuine financials and returns
        const constituentSymbols = sectors.flatMap(s => (s.stocks || []).map(st => st.symbol));
        const topRankedSymbols = Array.from(globalRankMap.entries())
          .filter(([s, rank]) => typeof rank === 'number' && rank <= 100)
          .sort((a, b) => a[1] - b[1])
          .map(([s]) => (s.endsWith('.NS') || s.endsWith('.BO') || isGlobal || KNOWN_GLOBAL_SYMBOLS.has(s) ? s : `${s}.NS`));

        // Deduplicate into distinct canonical equities
        const prioritySymbols = [...new Set([
          ...topRankedSymbols,
          ...constituentSymbols.map(s => (s.endsWith('.NS') || s.endsWith('.BO') || isGlobal || KNOWN_GLOBAL_SYMBOLS.has(s) ? s : `${s}.NS`))
        ])];

        const missingFin = prioritySymbols.filter(sym => !finMap.has(sym) && !this._getFinFromCache(sym));
        if (missingFin.length > 0) {
          const toFetch = missingFin.slice(0, 30);
          const topFinList = await Promise.allSettled(toFetch.map(sym => yahooFinanceService.getStockFinancials(sym)));
          toFetch.forEach((sym, idx) => {
            if (topFinList[idx].status === 'fulfilled' && topFinList[idx].value) {
              finMap.set(sym, topFinList[idx].value);
              const clean = sym.replace(/\.(NS|BO)$/i, '');
              finMap.set(`${clean}.NS`, topFinList[idx].value);
              finMap.set(clean, topFinList[idx].value);
            }
          });
        }

        const missingReturns = prioritySymbols.filter(sym => !returnsMap.has(sym));
        if (missingReturns.length > 0) {
          const toFetchRets = missingReturns.slice(0, 35);
          const topRetList = await Promise.allSettled(
            toFetchRets.map(sym => yahooFinanceService.getHistoricalAnalysis(sym, quoteMap.get(sym)?.ltp))
          );
          toFetchRets.forEach((sym, idx) => {
            if (topRetList[idx].status === 'fulfilled' && topRetList[idx].value) {
              const res = topRetList[idx].value;
              if (res.returns) {
                returnsMap.set(sym, res.returns);
                const clean = sym.replace(/\.(NS|BO)$/i, '');
                returnsMap.set(`${clean}.NS`, res.returns);
                returnsMap.set(clean, res.returns);
              }
              if (res.athBase) {
                athBaseMap.set(sym, res.athBase);
                const clean = sym.replace(/\.(NS|BO)$/i, '');
                athBaseMap.set(`${clean}.NS`, res.athBase);
                athBaseMap.set(clean, res.athBase);
              }
            }
          });
        }
      }

      // Build map of sector constituents from this.cache to guarantee direction and price consistency
      const sectorConstituentMap = new Map();
      if (this.cache && typeof this.cache.entries === 'function') {
        for (const [key, entry] of this.cache.entries()) {
          if (key.startsWith('sectors_') && Array.isArray(entry?.data)) {
            entry.data.forEach(sec => {
              if (Array.isArray(sec?.stocks)) {
                sec.stocks.forEach(stk => {
                  if (stk && stk.symbol && typeof stk.currentPrice === 'number' && stk.currentPrice > 0) {
                    sectorConstituentMap.set(stk.symbol, stk);
                    const clean = stk.symbol.replace(/\.(NS|BO)$/i, '');
                    sectorConstituentMap.set(`${clean}.NS`, stk);
                    sectorConstituentMap.set(clean, stk);
                  }
                });
              }
            });
          }
        }
      }

      const rankedStockList = allSymbols.map(sym => {
        const quote = quoteMap.get(sym) || null;
        const secMeta = stockSectorMap.get(sym) || { sectorId: 'general', sectorName: 'General', region: 'india' };
        const isFin = secMeta.sectorId.includes('bank') || secMeta.sectorId.includes('fin') || secMeta.sectorId.includes('insurance');
        const stockRets = returnsMap.get(sym) || 
                          (sym.endsWith('.NS') ? returnsMap.get(sym.replace('.NS', '')) : null) || 
                          (!sym.endsWith('.NS') ? returnsMap.get(`${sym}.NS`) : null) || 
                          { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };
        const fin = finMap.get(sym) || 
                    (sym.endsWith('.NS') ? finMap.get(sym.replace('.NS', '')) : null) || 
                    (!sym.endsWith('.NS') ? finMap.get(`${sym}.NS`) : null) || 
                    this._getFinFromCache(sym) || 
                    null;
        const athBase = athBaseMap.get(sym) || 
                        (sym.endsWith('.NS') ? athBaseMap.get(sym.replace('.NS', '')) : null) || 
                        (!sym.endsWith('.NS') ? athBaseMap.get(`${sym}.NS`) : null) || 
                        null;

        const rawRank = globalRankMap.get(sym) ?? (sym.endsWith('.NS') ? globalRankMap.get(sym.replace('.NS', '')) : null) ?? (sym.endsWith('.BO') ? globalRankMap.get(sym.replace('.BO', '')) : null) ?? null;
        const validMarketCap = (quote && typeof quote.marketCap === 'number' && quote.marketCap > 0) ? quote.marketCap : null;
        const globalRank = (typeof rawRank === 'number' && rawRank > 0) ? rawRank : (validMarketCap !== null ? rawRank : null);

        const resolvedEbit = isFin ? null : (fin?.ebit ?? quote?.ebit ?? null);
        const resolvedRevenue = fin?.revenue ?? quote?.revenue ?? null;
        const resolvedRevenueYoY = fin?.revenueYoY ?? quote?.revenueYoY ?? null;
        const resolvedRevenueQuarterly = fin?.revenueQuarterly ?? quote?.revenueQuarterly ?? null;
        const resolvedNetProfit = fin?.netProfit ?? quote?.netProfit ?? null;

        const hasValidPrice = quote && typeof quote.ltp === 'number' && quote.ltp > 0;
        const hasValidPrevClose = quote && typeof quote.previousClose === 'number' && quote.previousClose > 0;

        let direction = 'UNKNOWN';
        let change = null;
        let changePercent = null;

        if (hasValidPrice && hasValidPrevClose) {
          const diff = quote.ltp - quote.previousClose;
          if (diff > 0.0001) {
            direction = 'ADVANCING';
          } else if (diff < -0.0001) {
            direction = 'DECLINING';
          } else {
            direction = 'UNCHANGED';
          }
          change = parseFloat((quote.ltp - quote.previousClose).toFixed(4));
          changePercent = parseFloat((((quote.ltp - quote.previousClose) / quote.previousClose) * 100).toFixed(4));
        } else if (hasValidPrice) {
          change = (quote && typeof quote.change === 'number') ? quote.change : null;
          changePercent = (quote && typeof quote.changePercent === 'number') ? quote.changePercent : null;
        }

        if (timeframe !== '1D' && stockRets && typeof stockRets[timeframe] === 'number' && !isNaN(stockRets[timeframe])) {
          changePercent = stockRets[timeframe];
          direction = changePercent > 0.0001 ? 'ADVANCING' : (changePercent < -0.0001 ? 'DECLINING' : 'UNCHANGED');
          if (hasValidPrice) {
            const basePrice = quote.ltp / (1 + changePercent / 100);
            change = parseFloat((quote.ltp - basePrice).toFixed(4));
          }
        }

        if (hasValidPrice) {
          return {
            symbol: sym,
            name: quote.name || sym,
            companyName: quote.name || sym.replace(/\.(NS|BO)$/i, ''),
            exchange: sym.endsWith('.BO') ? 'BSE' : 'NSE',
            sector: secMeta.sectorName,
            sectorId: secMeta.sectorId,
            sectorName: secMeta.sectorName,
            region: secMeta.region,
            indiaStockRank: globalRank,
            indiaRank: globalRank,
            indianMarketRank: globalRank,
            globalRank,
            rank: globalRank,
            marketCap: validMarketCap,
            marketCapCr: validMarketCap ? (validMarketCap > 1e9 ? Math.round(validMarketCap / 10000000) : Math.round(validMarketCap)) : null,
            revenue: resolvedRevenue,
            revenueCr: resolvedRevenue,
            revenueYoY: resolvedRevenueYoY,
            revenueQuarterly: resolvedRevenueQuarterly,
            netProfit: resolvedNetProfit,
            netProfitYoY: fin?.netProfitYoY ?? quote?.netProfitYoY ?? null,
            netProfitQuarterly: fin?.netProfitQuarterly ?? quote?.netProfitQuarterly ?? null,
            ebit: resolvedEbit,
            currentPrice: quote.ltp,
            price: quote.ltp,
            ltp: quote.ltp,
            open: quote.open,
            previousClose: hasValidPrevClose ? quote.previousClose : (quote?.previousClose || null),
            change,
            changePercent,
            direction,
            fiftyTwoWeekHigh: athBase?.allTimeHigh || quote.high52 || null,
            fiftyTwoWeekLow: athBase?.week52Low || quote.low52 || null,
            week52Low: athBase?.week52Low ?? quote.low52 ?? null,
            week52LowDate: athBase?.week52LowDate ?? null,
            allTimeHigh: athBase?.allTimeHigh || quote.high52 || null,
            allTimeHighDate: athBase?.allTimeHighDate || null,
            ath: athBase?.allTimeHigh || quote.high52 || null,
            ATH: athBase?.allTimeHigh || quote.high52 || null,
            ATHDate: athBase?.allTimeHighDate || null,
            percentFrom52WLow: athBase?.percentFrom52WLow ?? athBase?.pctFrom52WLow ?? (quote.ltp && quote.low52 ? Math.round(((quote.ltp - quote.low52) / quote.low52) * 10000) / 100 : null),
            percentFromATH: athBase?.percentFromATH ?? athBase?.pctFromATH ?? (quote.ltp && quote.high52 ? Math.round(((quote.ltp - quote.high52) / quote.high52) * 10000) / 100 : null),
            pctFrom52WLow: athBase?.pctFrom52WLow ?? (quote.ltp && quote.low52 ? Math.round(((quote.ltp - quote.low52) / quote.low52) * 10000) / 100 : null),
            pctFromATH: athBase?.pctFromATH ?? (quote.ltp && quote.high52 ? Math.round(((quote.ltp - quote.high52) / quote.high52) * 10000) / 100 : null),
            recoveryFromBasePercent: athBase?.pctFrom52WLow ?? (quote.ltp && quote.low52 ? Math.round(((quote.ltp - quote.low52) / quote.low52) * 10000) / 100 : null),
            distanceFromATHPercent: athBase?.pctFromATH ?? (quote.ltp && quote.high52 ? Math.round(((quote.ltp - quote.high52) / quote.high52) * 10000) / 100 : null),
            pe: (typeof quote?.pe === 'number' && quote.pe > 0) ? quote.pe : (typeof fin?.pe === 'number' && fin.pe > 0 ? fin.pe : (quote?.pe ?? null)),
            eps: (typeof quote?.eps === 'number' && !isNaN(quote.eps)) ? quote.eps : (typeof fin?.eps === 'number' && !isNaN(fin.eps) ? fin.eps : (quote?.eps ?? null)),
            volume: quote.volume,
            returns: stockRets,
            performance: stockRets,
            source: quote.source || "YAHOO_FINANCE",
            sourceType: quote.sourceType || "YAHOO_QUOTE",
            dataStatus: quote.dataStatus || (quote.isLive ? "LIVE" : "EOD"),
            isLive: quote.isLive ?? false,
            priceAsOf: quote.priceAsOf || new Date().toISOString(),
            fetchedAt: quote.priceAsOf || quote.lastUpdatedAt || new Date().toISOString(),
            lastUpdatedAt: quote.lastUpdatedAt || new Date().toISOString()
          };
        }

        return {
          symbol: sym,
          name: sym,
          companyName: sym.replace(/\.(NS|BO)$/i, ''),
          exchange: sym.endsWith('.BO') ? 'BSE' : 'NSE',
          sector: secMeta.sectorName,
          sectorId: secMeta.sectorId,
          sectorName: secMeta.sectorName,
          region: secMeta.region,
          indiaStockRank: globalRank,
          indiaRank: globalRank,
          indianMarketRank: globalRank,
          globalRank,
          rank: globalRank,
          marketCap: null,
          marketCapCr: null,
          revenue: resolvedRevenue,
          revenueCr: resolvedRevenue,
          revenueYoY: resolvedRevenueYoY,
          revenueQuarterly: resolvedRevenueQuarterly,
          netProfit: resolvedNetProfit,
          netProfitYoY: fin?.netProfitYoY ?? quote?.netProfitYoY ?? null,
          netProfitQuarterly: fin?.netProfitQuarterly ?? quote?.netProfitQuarterly ?? null,
          ebit: resolvedEbit,
          currentPrice: null,
          price: null,
          ltp: null,
          open: null,
          previousClose: null,
          change: null,
          changePercent: null,
          direction: 'UNKNOWN',
          fiftyTwoWeekHigh: null,
          fiftyTwoWeekLow: null,
          week52Low: null,
          week52LowDate: null,
          allTimeHigh: null,
          allTimeHighDate: null,
          ath: null,
          ATH: null,
          ATHDate: null,
          percentFrom52WLow: null,
          percentFromATH: null,
          pctFrom52WLow: null,
          pctFromATH: null,
          pe: (typeof fin?.pe === 'number' && fin.pe > 0) ? fin.pe : null,
          eps: (typeof fin?.eps === 'number' && !isNaN(fin.eps)) ? fin.eps : null,
          volume: null,
          returns: stockRets,
          performance: stockRets,
          source: "UNAVAILABLE",
          sourceType: "UNAVAILABLE",
          dataStatus: "UNAVAILABLE",
          isLive: false,
          priceAsOf: null,
          fetchedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        };
      });

      // Default sorting: globalRank ASC (1, 2, 3...), then marketCap DESC, then ltp, unquoted at end
      rankedStockList.sort((a, b) => {
        if (a.globalRank !== null && b.globalRank !== null) {
          return a.globalRank - b.globalRank;
        }
        if (a.globalRank !== null) return -1;
        if (b.globalRank !== null) return 1;
        if (a.marketCap !== null && b.marketCap !== null) {
          return b.marketCap - a.marketCap;
        }
        if (a.marketCap !== null) return -1;
        if (b.marketCap !== null) return 1;
        if (a.ltp !== null && b.ltp === null) return -1;
        if (a.ltp === null && b.ltp !== null) return 1;
        return a.symbol.localeCompare(b.symbol);
      });

      return rankedStockList;
    });
  }

  /**
   * Get top movers across ALL sectors (deduplicated).
   * @param {number} count - Number of top gainers and losers to return.
   */
  async getTopMovers(count = 10) {
    const cacheKey = `top_movers_${count}`;
    return this._getCachedOrFetch(cacheKey, async () => {
      try {
        const allSymbols = this.getAllSymbols();
        const allQuotes = await this._batchFetchQuotes(allSymbols);
        const validQuotes = allQuotes.filter(q => q && typeof q.ltp === 'number' && q.ltp > 0 && typeof q.changePercent === 'number' && !isNaN(q.changePercent));

        const sortedByChange = [...validQuotes].sort((a, b) => b.changePercent - a.changePercent);
        const gainers = sortedByChange.slice(0, count);
        const losers = [...sortedByChange].reverse().slice(0, count);

        return { gainers, losers };
      } catch (e) {
        console.warn('Top movers error:', e.message);
        return { gainers: [], losers: [] };
      }
    });
  }

  /**
   * Synchronous fuzzy search across all sector names and stock names/symbols.
   */
  searchStocksAndSectors(query) {
    if (!query || query.trim().length === 0) {
      return { sectors: [], stocks: [] };
    }

    const q = query.toLowerCase().trim();

    const matchingSectors = ALL_SECTORS
      .filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      )
      .map(s => ({
        id: s.id,
        name: s.name,
        region: s.region,
        stockCount: s.stocks.length
      }));

    const matchingStocks = [];
    ALL_SECTORS.forEach(sector => {
      sector.stocks.forEach(stock => {
        const symClean = stock.symbol.replace('.NS', '').replace('.BO', '').toLowerCase();
        if (
          stock.symbol.toLowerCase().includes(q) ||
          symClean.includes(q) ||
          stock.name.toLowerCase().includes(q)
        ) {
          matchingStocks.push({
            symbol: stock.symbol,
            name: stock.name,
            sectorId: sector.id,
            sectorName: sector.name
          });
        }
      });
    });

    // Deduplicate stocks by symbol (a stock may appear in multiple sectors)
    const seen = new Set();
    const uniqueStocks = matchingStocks.filter(s => {
      const key = `${s.symbol}_${s.sectorId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { sectors: matchingSectors, stocks: uniqueStocks };
  }

  /**
   * Returns deduplicated array of all stock symbols across all sectors.
   */
  getAllSymbols() {
    const symbolSet = new Set();
    ALL_SECTORS.forEach(sector => {
      sector.stocks.forEach(stock => {
        symbolSet.add(stock.symbol);
      });
    });
    return [...symbolSet];
  }

  /**
   * Returns the raw sector definitions (useful for frontend to know sector structure without data).
   */
  getSectorDefinitions() {
    return ALL_SECTORS.map(sector => ({
      id: sector.id,
      name: sector.name,
      region: sector.region,
      indexTicker: sector.indexTicker || null,
      etfTicker: sector.etfTicker || null,
      stockCount: sector.stocks.length,
      stocks: sector.stocks.map(s => ({ symbol: s.symbol, name: s.name }))
    }));
  }

  async prewarmStockCache() {
    try {
      await this.getAllRankedStocks('india', '1D', 'stocks');
      await this.getAllSectors('india', '1D', 'stocks');
    } catch (e) {
      // Non-blocking
    }
  }
}

const sectorDataService = new SectorDataService();
export default sectorDataService;

