"""Vendor the pinned CC0 Kenney Pirate Kit inputs. Run only during asset preparation.

The medieval hexes, roads and water tiles keep coming from the KayKit pack
(tools/vendor-hexkeep.py); this script only adds what the two water regions
need on top of them: the attacking boats and the shore decorations. Kenney
ships one shared colormap beside the GLBs, so the texture is vendored too and
the relative `Textures/colormap.png` URI inside every GLB keeps resolving.
"""
import io, json, pathlib, urllib.request, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1] / 'assets' / 'hexkeep' / 'source' / 'pirate'
URL = 'https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip'
INSIDE = 'Models/GLB format/'
models = {
    'skiff': 'ship-pirate-small',
    'warship': 'ship-large',
    'palm': 'palm-detailed-straight',
    'palmBend': 'palm-detailed-bend',
    'shoreRock': 'rocks-sand-a',
    'shoreRockB': 'rocks-sand-b',
    'dock': 'structure-platform-dock',
    'wreck': 'ship-wreck',
    'barrel': 'barrel',
    'sandPatch': 'patch-sand',
}
with urllib.request.urlopen(URL) as response:
    archive = zipfile.ZipFile(io.BytesIO(response.read()))
ROOT.mkdir(parents=True, exist_ok=True)
(ROOT / 'Textures').mkdir(exist_ok=True)
(ROOT / 'Textures' / 'colormap.png').write_bytes(archive.read(INSIDE + 'Textures/colormap.png'))
records = {}
for alias, name in models.items():
    (ROOT / (alias + '.glb')).write_bytes(archive.read(INSIDE + name + '.glb'))
    records[alias] = {'source': INSIDE + name + '.glb'}
    print(alias, flush=True)
(ROOT / 'LICENSE.txt').write_bytes(archive.read('License.txt'))
(ROOT / 'provenance.json').write_text(
    json.dumps({'pack': 'Kenney Pirate Kit', 'url': URL, 'models': records}, indent=2), encoding='utf8')
