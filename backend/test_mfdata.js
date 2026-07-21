import axios from 'axios';
axios.get('https://mfdata.in/api/v1/schemes/122639').then(res => console.log(Object.keys(res.data))).catch(err => console.log(err.message));
