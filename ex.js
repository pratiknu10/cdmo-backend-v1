const fs = require("____"); 
const data = 'Hello, World!'; 
fs.('output.txt', data, (err) => { 
    if (err) { 
        console.error('Error writing to file:', __); 
        return; 
    }
console.log('Data written to file successfully'); 
});