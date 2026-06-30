const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
let content = fs.readFileSync(envFile, 'utf8');

const replacements = [
  ['TMDB_API_READ_TOKEN_PLACEHOLDER', process.env.TMDB_API_READ_TOKEN],
  ['PASSWORD_HASH_PLACEHOLDER', process.env.PASSWORD_HASH],
];

for (const [placeholder, value] of replacements) {
  if (!value) {
    throw new Error(`${placeholder} was not replaced because its environment variable is empty.`);
  }

  content = content.replaceAll(placeholder, value);
}

fs.writeFileSync(envFile, content);
console.log('Build-time environment injection complete.');
