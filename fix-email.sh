#!/bin/bash
# Fix the email issue in the running container

docker exec lexia-chat sh -c 'cat > /tmp/fix.js << '\''EOF'\''
const fs = require("fs");
const file = "/app/dist/services/ConversationService.js";
let content = fs.readFileSync(file, "utf8");

// Fix the INSERT statement
content = content.replace(
  /INSERT INTO usuarios \(id, nombre\) VALUES \(\$1, \$2\)/g,
  "INSERT INTO usuarios (id, nombre, email) VALUES ($1, $2, $3)"
);

// Fix the parameters array
content = content.replace(
  /\[usuarioId, nombre \|\| '\''Usuario'\''\]/g,
  "[usuarioId, nombre || '\''Usuario'\'', `test-${usuarioId.substring(0,8)}@lexia.test`]"
);

fs.writeFileSync(file, content);
console.log("Fixed!");
EOF
node /tmp/fix.js'

docker restart lexia-chat
sleep 5
echo "Chat service fixed and restarted"
