import yahooFinanceService from './YahooFinanceService.js';
import marketDataGateway from './MarketDataGateway.js';
import { getIndianMarketSession } from './MarketDataValidator.js';

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
    indexTicker: '^CNXFIN',
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
    indexTicker: '^CNXCONSUM',
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
      { symbol: 'LTIM.NS', name: 'LTIMindtree' },
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
      { symbol: 'TV18BRDCST.NS', name: 'TV18 Broadcast' },
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

class SectorDataService {
  constructor() {
    this.cache = new Map();
    this.symbolCache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.SYMBOL_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

    // Automatically pre-warm cache in background on server startup
    setTimeout(() => {
      this.getAllSectors('all', '1D', 'stocks').catch(e => console.error('Cache warm error:', e.message));
    }, 100);
  }

  /**
   * Fast batch fetch quotes in parallel chunks of 25 with symbol-level caching.
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

    if (uncached.length === 0) {
      return Array.from(resultsMap.values());
    }

    const CHUNK_SIZE = 25;
    const chunks = [];
    for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
      chunks.push(uncached.slice(i, i + CHUNK_SIZE));
    }

    // Process chunks concurrently with Promise.allSettled
    const chunkPromises = chunks.map(async (chunk) => {
      try {
        const quotesRes = await marketDataGateway.getQuotes(chunk);
        if (quotesRes && quotesRes.available && quotesRes.data) {
          for (const q of quotesRes.data) {
            this.symbolCache.set(q.symbol, { data: q, timestamp: now });
            resultsMap.set(q.symbol, q);
          }
        }
      } catch (err) {
        console.warn('Batch chunk quote fetch warning:', err.message);
      }
    });

    await Promise.allSettled(chunkPromises);
    return Array.from(resultsMap.values());
  }

  /**
   * Generic cache wrapper — returns cached data if fresh, else fetches and caches.
   */
  async _getCachedOrFetch(cacheKey, fetchFn) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    const data = await fetchFn();
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetch quotes for a sector's constituent stocks with per-symbol error tolerance and provenance tracking.
   */
  async _fetchSectorQuotes(sector, fetchReturns = false) {
    const symbols = sector.stocks.map(s => s.symbol);
    const quotes = await this._batchFetchQuotes(symbols);

    // Map quotes by symbol for easy lookup
    const quoteMap = new Map();
    quotes.forEach(q => {
      quoteMap.set(q.symbol, q);
      if (q.symbol.endsWith('.NS')) {
        quoteMap.set(q.symbol.replace('.NS', ''), q);
      }
    });

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
          if (sym.endsWith('.NS')) {
            returnsMap.set(sym.replace('.NS', ''), stockReturnsList[idx].value);
          }
        }
      });
    } else {
      symbols.forEach(sym => {
        const cached = yahooFinanceService.returnsCache?.get(sym)?.data;
        if (cached) {
          returnsMap.set(sym, cached);
          if (sym.endsWith('.NS')) {
            returnsMap.set(sym.replace('.NS', ''), cached);
          }
        }
      });
    }

    // Fetch financials (EBIT & Net Profit) for constituent stocks if requested or cached
    const financialsMap = new Map();
    if (!isFinancialSector) {
      if (fetchReturns) {
        const stockFinList = await Promise.allSettled(
          symbols.map(sym => yahooFinanceService.getStockFinancials(sym))
        );
        symbols.forEach((sym, idx) => {
          if (stockFinList[idx].status === 'fulfilled' && stockFinList[idx].value) {
            financialsMap.set(sym, stockFinList[idx].value);
            if (sym.endsWith('.NS')) {
              financialsMap.set(sym.replace('.NS', ''), stockFinList[idx].value);
            }
          }
        });
      } else {
        symbols.forEach(sym => {
          const cached = yahooFinanceService.financialsCache?.get(sym)?.data;
          if (cached) {
            financialsMap.set(sym, cached);
            if (sym.endsWith('.NS')) {
              financialsMap.set(sym.replace('.NS', ''), cached);
            }
          }
        });
      }
    }

    // Return enriched stock data, preserving sector stock metadata and strict provenance
    return sector.stocks.map(stock => {
      const quote = quoteMap.get(stock.symbol) || (stock.symbol.endsWith('.NS') ? quoteMap.get(stock.symbol.replace('.NS', '')) : null);
      const stockRets = returnsMap.get(stock.symbol) || (stock.symbol.endsWith('.NS') ? returnsMap.get(stock.symbol.replace('.NS', '')) : null) || { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null };
      const stockFin = financialsMap.get(stock.symbol) || (stock.symbol.endsWith('.NS') ? financialsMap.get(stock.symbol.replace('.NS', '')) : null);

      const resolvedEbit = isFinancialSector ? null : (stockFin?.ebit ?? quote?.ebit ?? null);
      const resolvedNetProfit = stockFin?.netProfit ?? quote?.netProfit ?? null;

      if (quote && typeof quote.ltp === 'number' && quote.ltp > 0) {
        let changePercent = quote.changePercent;
        if ((changePercent === undefined || changePercent === null || isNaN(changePercent)) && quote.previousClose > 0) {
          changePercent = parseFloat((((quote.ltp - quote.previousClose) / quote.previousClose) * 100).toFixed(2));
        }
        return {
          ...stock,
          ...quote,
          returns: stockRets,
          ebit: resolvedEbit,
          netProfit: resolvedNetProfit,
          changePercent,
          source: quote.source || "YAHOO_FINANCE",
          sourceType: quote.sourceType || "YAHOO_QUOTE",
          dataStatus: quote.dataStatus || (quote.isLive ? "LIVE" : "EOD"),
          isLive: quote.isLive ?? false,
          priceAsOf: quote.priceAsOf || new Date().toISOString(),
          lastUpdatedAt: quote.lastUpdatedAt || new Date().toISOString()
        };
      }
      
      // If quote is completely missing or unavailable, return clean honest null representation
      return {
        ...stock,
        ltp: null,
        open: null,
        previousClose: null,
        change: null,
        changePercent: null,
        dayHigh: null,
        dayLow: null,
        high52: null,
        low52: null,
        volume: null,
        marketCap: null,
        pe: null,
        pb: null,
        eps: null,
        ebit: resolvedEbit,
        netProfit: resolvedNetProfit,
        dividendYield: null,
        vwap: null,
        returns: stockRets,
        source: "UNAVAILABLE",
        sourceType: "UNAVAILABLE",
        dataStatus: "UNAVAILABLE",
        isLive: false,
        priceAsOf: null,
        lastUpdatedAt: new Date().toISOString()
      };
    });
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
      
      if (region === 'india') {
        sectors = sectors.filter(s => s.region === 'india');
      } else if (region === 'global') {
        sectors = sectors.filter(s => s.region === 'global');
      }

      const session = getIndianMarketSession();

      // ──────────────────────────────────────────────────────
      // STEP 1: Determine primary instrument ticker for each sector
      //   - Indian sectors: always use indexTicker (^NSEBANK, ^CNXIT, etc.)
      //     NEVER fall back to etfTicker for index-level data.
      //   - Global sectors: use etfTicker (XLK, XLV, etc.) as the primary 
      //     instrument since there is no separate index ticker.
      // ──────────────────────────────────────────────────────
      const primaryTickerMap = new Map(); // sectorId -> ticker
      for (const s of sectors) {
        if (s.region === 'india') {
          // Indian sectors: indexTicker is the ONLY source
          if (s.indexTicker) {
            primaryTickerMap.set(s.id, s.indexTicker);
          }
        } else {
          // Global sectors: etfTicker IS the primary instrument
          if (s.etfTicker) {
            primaryTickerMap.set(s.id, s.etfTicker);
          } else if (s.indexTicker) {
            primaryTickerMap.set(s.id, s.indexTicker);
          }
        }
      }

      // ──────────────────────────────────────────────────────
      // STEP 2: Batch-fetch index/primary instrument quotes
      // ──────────────────────────────────────────────────────
      const uniquePrimaryTickers = [...new Set([...primaryTickerMap.values()].filter(Boolean))];
      const primaryQuotes = uniquePrimaryTickers.length > 0 ? await this._batchFetchQuotes(uniquePrimaryTickers) : [];
      const primaryQuoteMap = new Map();
      primaryQuotes.forEach(q => primaryQuoteMap.set(q.symbol, q));

      // ──────────────────────────────────────────────────────
      // STEP 3: Fetch index historical returns for all primary tickers in parallel
      // ──────────────────────────────────────────────────────
      const indexReturnsResults = await Promise.allSettled(
        uniquePrimaryTickers.map(async (ticker) => ({
          ticker,
          rets: await yahooFinanceService.getHistoricalReturns(ticker)
        }))
      );
      const indexReturnsMap = new Map();
      indexReturnsResults.forEach(res => {
        if (res.status === 'fulfilled' && res.value && res.value.rets) {
          indexReturnsMap.set(res.value.ticker, res.value.rets);
        }
      });

      // ──────────────────────────────────────────────────────
      // STEP 4: Pre-fetch all constituent stock quotes in ONE unified batch
      // ──────────────────────────────────────────────────────
      const allConstituentSymbols = [...new Set(sectors.flatMap(s => s.stocks.map(st => st.symbol)))];
      if (allConstituentSymbols.length > 0) {
        await this._batchFetchQuotes(allConstituentSymbols);
      }

      // Background pre-warm: constituent financials & returns (non-blocking)
      const nonFinancialSymbols = [...new Set(
        sectors
          .filter(s => !s.id.includes('bank') && !s.id.includes('fin') && !s.id.includes('insurance'))
          .flatMap(s => s.stocks.map(st => st.symbol))
      )].filter(sym => !yahooFinanceService.financialsCache.has(sym));

      const uncalculatedSymbols = allConstituentSymbols.filter(sym => !yahooFinanceService.returnsCache.has(sym));

      if (nonFinancialSymbols.length > 0 || uncalculatedSymbols.length > 0) {
        setTimeout(async () => {
          if (nonFinancialSymbols.length > 0) {
            const finChunkSize = 25;
            for (let i = 0; i < nonFinancialSymbols.length; i += finChunkSize) {
              const chunk = nonFinancialSymbols.slice(i, i + finChunkSize);
              await Promise.allSettled(chunk.map(sym => yahooFinanceService.getStockFinancials(sym)));
            }
          }
          if (uncalculatedSymbols.length > 0) {
            const retChunkSize = 25;
            for (let i = 0; i < uncalculatedSymbols.length; i += retChunkSize) {
              const chunk = uncalculatedSymbols.slice(i, i + retChunkSize);
              await Promise.allSettled(chunk.map(sym => yahooFinanceService.getHistoricalReturns(sym)));
            }
          }
        }, 0);
      }

      // ──────────────────────────────────────────────────────
      // STEP 5: Build sector results
      // ──────────────────────────────────────────────────────
      const results = [];

      for (const sector of sectors) {
        try {
          const stocksWithQuotes = await this._fetchSectorQuotes(sector);
          const validStocks = stocksWithQuotes.filter(s => typeof s.ltp === 'number' && s.ltp > 0);

          // ── Constituent aggregates (kept SEPARATE from index metrics) ──
          const changePercents = validStocks.map(s => s.changePercent).filter(v => typeof v === 'number' && !isNaN(v));
          const avgChangePercent = changePercents.length > 0
            ? parseFloat((changePercents.reduce((sum, v) => sum + v, 0) / changePercents.length).toFixed(2))
            : 0;

          const advances = validStocks.filter(s => typeof s.changePercent === 'number' && s.changePercent > 0).length;
          const declines = validStocks.filter(s => typeof s.changePercent === 'number' && s.changePercent < 0).length;
          const unchanged = validStocks.length - advances - declines;

          // Constituent aggregate metrics (for internal/separate display only)
          const constituentTotalVolume = validStocks.reduce((sum, s) => sum + (s.volume || 0), 0);
          const totalMarketCap = validStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
          
          const validPeStocks = validStocks.filter(s => typeof s.pe === 'number' && s.pe > 0);
          const constituentAvgPe = validPeStocks.length > 0
            ? parseFloat((validPeStocks.reduce((sum, s) => sum + s.pe, 0) / validPeStocks.length).toFixed(2))
            : null;

          const validEpsStocks = validStocks.filter(s => typeof s.eps === 'number' && s.eps > 0);
          const constituentAvgEps = validEpsStocks.length > 0
            ? parseFloat((validEpsStocks.reduce((sum, s) => sum + s.eps, 0) / validEpsStocks.length).toFixed(2))
            : null;

          // Sector EBIT (constituent aggregate — labelled as such)
          const isFinancialSector = sector.id.includes('bank') || sector.id.includes('fin') || sector.id.includes('insurance');
          let totalEbit = null;
          if (!isFinancialSector) {
            const validEbitStocks = validStocks.filter(s => typeof s.ebit === 'number' && s.ebit > 0);
            if (validEbitStocks.length > 0) {
              totalEbit = validEbitStocks.reduce((sum, s) => sum + s.ebit, 0);
            }
          }

          // Sector Net Profit (constituent aggregate)
          const validNetProfitStocks = validStocks.filter(s => typeof s.netProfit === 'number' && s.netProfit > 0);
          let totalNetProfit = validNetProfitStocks.length > 0
            ? validNetProfitStocks.reduce((sum, s) => sum + s.netProfit, 0)
            : null;

          // ── Official index instrument data ──
          const primaryTicker = primaryTickerMap.get(sector.id) || null;
          const indexQuote = primaryTicker ? primaryQuoteMap.get(primaryTicker) : null;
          const indexReturns = primaryTicker ? indexReturnsMap.get(primaryTicker) : null;

          // Index price — exclusively from the index instrument, no fallback
          const indexPrice = (indexQuote && typeof indexQuote.ltp === 'number' && indexQuote.ltp > 0) ? indexQuote.ltp : null;
          const previousClose = (indexQuote && typeof indexQuote.previousClose === 'number' && indexQuote.previousClose > 0) ? indexQuote.previousClose : null;
          const open = (indexQuote && typeof indexQuote.open === 'number' && indexQuote.open > 0) ? indexQuote.open : null;
          const dayHigh = (indexQuote && typeof indexQuote.dayHigh === 'number' && indexQuote.dayHigh > 0) ? indexQuote.dayHigh : null;
          const dayLow = (indexQuote && typeof indexQuote.dayLow === 'number' && indexQuote.dayLow > 0) ? indexQuote.dayLow : null;

          // 52W High/Low — exclusively from the index instrument, NO constituent fallback
          const fiftyTwoWeekHigh = (indexQuote && typeof indexQuote.high52 === 'number' && indexQuote.high52 > 0) ? indexQuote.high52 : null;
          const fiftyTwoWeekLow = (indexQuote && typeof indexQuote.low52 === 'number' && indexQuote.low52 > 0) ? indexQuote.low52 : null;

          // PE, EPS, Volume — exclusively from the index instrument
          // Yahoo does not provide PE/EPS/Volume for NSE indices — this will correctly be null
          const indexPe = (indexQuote && typeof indexQuote.pe === 'number' && indexQuote.pe > 0) ? indexQuote.pe : null;
          const indexEps = (indexQuote && typeof indexQuote.eps === 'number') ? indexQuote.eps : null;
          const indexVolume = (indexQuote && typeof indexQuote.volume === 'number' && indexQuote.volume > 0) ? indexQuote.volume : null;

          // ── Index returns — exclusively from primary instrument, NO constituent fallback ──
          const sectorReturns = {};
          ['1W', '1M', '6M', '1Y', '3Y', '5Y', 'ALL'].forEach(p => {
            const hasIndexVal = indexReturns && typeof indexReturns[p] === 'number' && !isNaN(indexReturns[p]);
            sectorReturns[p] = hasIndexVal ? indexReturns[p] : null;
          });

          // ── ALL return validation: detect data quality issues ──
          if (sectorReturns['ALL'] !== null && Math.abs(sectorReturns['ALL']) > 50000) {
            console.warn(`[DATA QUALITY WARNING] ${sector.id} (${primaryTicker}): ALL return = ${sectorReturns['ALL']}% exceeds 50000% — marking as suspect. Not correcting; logging for investigation.`);
          }

          // sectorChangePercent: for display/sorting
          let sectorChangePercent;
          if (timeframe === '1D') {
            // Use index change% if available, otherwise constituent avg
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

          const sourceBreakdown = {
            live: stocksWithQuotes.filter(s => s.dataStatus === 'LIVE').length,
            eod: stocksWithQuotes.filter(s => s.dataStatus === 'EOD').length,
            unavailable: stocksWithQuotes.filter(s => s.dataStatus === 'UNAVAILABLE' || s.ltp === null).length
          };

          // Determine data status for the index row
          const indexDataStatus = indexPrice !== null
            ? (session.isOpen ? 'LIVE' : 'EOD')
            : 'UNAVAILABLE';

          results.push({
            id: sector.id,
            name: sector.name,
            region: sector.region,
            assetClass: sector.assetClass || 'stocks',
            
            // ── Source provenance ──
            primaryTicker: primaryTicker,
            indexTicker: sector.indexTicker || null,
            etfTicker: sector.etfTicker || null,
            indexDataSource: primaryTicker || null,
            indexDataStatus,
            indexDataTimestamp: new Date().toISOString(),

            // ── Official index metrics (from primary instrument only) ──
            indexPrice,
            previousClose,
            open,
            dayHigh,
            dayLow,
            fiftyTwoWeekHigh,
            fiftyTwoWeekLow,
            pe: indexPe,
            eps: indexEps,
            totalVolume: indexVolume,

            // ── Index returns (exclusively from primary instrument) ──
            changePercent: sectorChangePercent,
            trend,
            returns: sectorReturns,

            // ── Constituent metrics (separate from index, labelled clearly) ──
            advances,
            declines,
            unchanged,
            totalStocks: validStocks.length,
            validStocks: validStocks.length,
            totalMarketCap,
            constituentAvgPe,
            constituentAvgEps,
            constituentTotalVolume,
            ebit: totalEbit,
            netProfit: totalNetProfit,

            sourceBreakdown,
            stocks: stocksWithQuotes
          });
        } catch (err) {
          console.error(`Error processing sector ${sector.id}:`, err.message);
          results.push({
            id: sector.id,
            name: sector.name,
            region: sector.region,
            assetClass: sector.assetClass || 'stocks',
            primaryTicker: primaryTickerMap.get(sector.id) || null,
            indexTicker: sector.indexTicker || null,
            etfTicker: sector.etfTicker || null,
            indexDataSource: primaryTickerMap.get(sector.id) || null,
            indexDataStatus: 'UNAVAILABLE',
            indexDataTimestamp: new Date().toISOString(),
            indexPrice: null,
            previousClose: null,
            open: null,
            dayHigh: null,
            dayLow: null,
            fiftyTwoWeekHigh: null,
            fiftyTwoWeekLow: null,
            pe: null,
            eps: null,
            totalVolume: null,
            changePercent: 0,
            trend: 'Neutral',
            returns: { '1W': null, '1M': null, '6M': null, '1Y': null, '3Y': null, '5Y': null, 'ALL': null },
            advances: 0,
            declines: 0,
            unchanged: 0,
            totalStocks: sector.stocks.length,
            validStocks: 0,
            totalMarketCap: 0,
            constituentAvgPe: null,
            constituentAvgEps: null,
            constituentTotalVolume: 0,
            ebit: null,
            netProfit: null,
            sourceBreakdown: { live: 0, eod: 0, unavailable: sector.stocks.length },
            stocks: []
          });
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
      const stocksWithQuotes = await this._fetchSectorQuotes(sector, true);
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
        const validEbitStocks = validStocks.filter(s => typeof s.ebit === 'number' && s.ebit > 0);
        if (validEbitStocks.length > 0) {
          totalEbit = validEbitStocks.reduce((sum, s) => sum + s.ebit, 0);
        }
      }

      const validNetProfitStocks = validStocks.filter(s => typeof s.netProfit === 'number' && s.netProfit > 0);
      let totalNetProfit = validNetProfitStocks.length > 0
        ? validNetProfitStocks.reduce((sum, s) => sum + s.netProfit, 0)
        : null;

      const totalVolume = validStocks.reduce((sum, s) => sum + (s.volume || 0), 0);
      const totalMarketCap = validStocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);

      return {
        id: sector.id,
        name: sector.name,
        region: sector.region,
        indexSymbol: primaryTicker,
        indexPrice,
        fiftyTwoWeekHigh,
        fiftyTwoWeekLow,
        pe: indexPe,
        eps: indexEps,
        changePercent: sectorChangePercent,
        timeframe,
        trend,
        ebit: totalEbit,
        netProfit: totalNetProfit,
        totalVolume,
        totalMarketCap,
        stocks: sorted,
        gainers,
        losers,
        advanceCount,
        declineCount,
        unchanged: Math.max(0, validStocks.length - advanceCount - declineCount),
        validStocks: validStocks.length,
        totalStocks: validStocks.length,
        aiSummary
      };
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
      etfTicker: sector.etfTicker || null,
      stockCount: sector.stocks.length,
      stocks: sector.stocks.map(s => ({ symbol: s.symbol, name: s.name }))
    }));
  }
}

export default new SectorDataService();
