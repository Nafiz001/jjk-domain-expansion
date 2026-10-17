// Downloads raw generation takes listed in a batch JSON (name -> signed URL) into this folder.
import { readFileSync, writeFileSync } from 'node:fs';
const batch = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const [name, url] of Object.entries(batch)) {
  const res = await fetch(url);
  if (!res.ok) { console.error(`${name}: HTTP ${res.status}`); continue; }
  writeFileSync(name, Buffer.from(await res.arrayBuffer()));
  console.log(`${name}`);
}
