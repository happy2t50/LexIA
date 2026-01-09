const fs = require('fs');
const file = '/app/dist/services/ConversationService.js';
let content = fs.readFileSync(file, 'utf8');

// Simply add 'Test' as apellido parameter
content = content.replace(
  "testEmail]",
  "'Test', testEmail]"
);

fs.writeFileSync(file, content);
console.log('Parameters fixed!');
