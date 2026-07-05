// generate_art.mjs — generates missing adventure background art via the OpenAI
// Images API (gpt-image-2), driven by tools/art_manifest.json.
//
// Run from the project root:
//   node tools/generate_art.mjs                 # generate everything missing
//   node tools/generate_art.mjs --only home_bg  # a single asset (style approval)
//   node tools/generate_art.mjs --force home_bg # regenerate an existing one
//   node tools/generate_art.mjs --force         # regenerate everything
//
// The API key is read from the OPENAI_API_KEY env var, or from
// .secrets/openai_key.txt (gitignored). Existing files are skipped unless
// forced, so the script is safe to re-run.

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'tools', 'art_manifest.json');
const OUT_DIR = path.join(ROOT, 'assets', 'adventure', 'art');
const MODEL = 'gpt-image-2';

function readKey() {
    if (process.env.OPENAI_API_KEY) {
        return process.env.OPENAI_API_KEY.trim();
    }
    const keyFile = path.join(ROOT, '.secrets', 'openai_key.txt');
    if (fs.existsSync(keyFile)) {
        return fs.readFileSync(keyFile, 'utf8').trim();
    }
    console.error('No API key: set OPENAI_API_KEY or create .secrets/openai_key.txt');
    process.exit(1);
}

function parseArgs() {
    const args = process.argv.slice(2);
    let only = null;
    let force = false;
    let forceId = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--only') {
            only = args[i + 1];
            i++;
        } else if (args[i] === '--force') {
            force = true;
            // optional id right after --force
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                forceId = args[i + 1];
                i++;
            }
        }
    }
    return {only, force, forceId};
}

async function generateOne(key, styleBase, asset) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({
            model: MODEL,
            prompt: styleBase + '\n\n' + asset.prompt,
            size: asset.size,
            quality: 'high',
            // JPEG with compression keeps backgrounds tablet-friendly (~100KB)
            // without any local image tooling. Manifest files end in .jpg.
            output_format: 'jpeg',
            output_compression: 75,
        }),
    });
    const json = await res.json();
    if (json.error) {
        console.log('FAIL', asset.id, '-', json.error.message);
        return false;
    }
    if (!json.data || !json.data[0] || !json.data[0].b64_json) {
        console.log('FAIL', asset.id, '- unexpected response');
        return false;
    }
    fs.mkdirSync(OUT_DIR, {recursive: true});
    fs.writeFileSync(path.join(OUT_DIR, asset.file), Buffer.from(json.data[0].b64_json, 'base64'));
    console.log('OK  ', asset.id, '->', 'assets/adventure/art/' + asset.file);
    return true;
}

async function main() {
    const key = readKey();
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const {only, force, forceId} = parseArgs();

    let created = 0, skipped = 0, failed = 0;
    for (const asset of manifest.assets) {
        if (only && asset.id !== only) {
            continue;
        }
        const outPath = path.join(OUT_DIR, asset.file);
        const forcedHere = force && (!forceId || forceId === asset.id);
        if (fs.existsSync(outPath) && !forcedHere && !(only && only === asset.id)) {
            console.log('skip', asset.id, '(exists)');
            skipped++;
            continue;
        }
        const ok = await generateOne(key, manifest.style_base, asset);
        if (ok) { created++; } else { failed++; }
    }
    console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed`);
    process.exit(failed ? 1 : 0);
}

main();
