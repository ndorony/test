"""Vendor pinned CC0 KayKit inputs. Run only during asset preparation."""
import json, pathlib, urllib.request, urllib.parse, hashlib
ROOT = pathlib.Path(__file__).resolve().parents[1] / 'assets' / 'hexkeep'
REPO = 'KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0'
def get(url):
    with urllib.request.urlopen(url) as response: return response.read()
sha = '84fa4e91af6a88989be7c99e0891cede11f2ca38'
base = 'https://raw.githubusercontent.com/' + REPO + '/' + sha + '/'
prefix = 'addons/kaykit_medieval_hexagon_pack/Assets/gltf/'
models = {
    'grass':'tiles/base/hex_grass', 'water':'tiles/base/hex_water',
    'hill':'tiles/base/hex_grass_sloped_low',
    'guard':'buildings/blue/building_barracks_blue',
    'archer':'buildings/blue/building_tower_A_blue',
    'mage':'buildings/red/building_tower_B_red',
    'catapult':'buildings/blue/building_tower_catapult_blue',
    'windmill':'buildings/blue/building_windmill_blue',
    'home':'buildings/blue/building_home_A_blue',
    'blacksmith':'buildings/blue/building_blacksmith_blue',
    'well':'buildings/blue/building_well_blue',
    'lumber':'buildings/blue/building_lumbermill_blue',
    'barricade':'buildings/neutral/fence_stone_straight',
    'bridge':'buildings/neutral/building_bridge_B',
    'site':'buildings/neutral/building_dirt',
    'tree':'decoration/nature/trees_A_small',
    'broadleaf':'decoration/nature/trees_B_small',
    'rock':'decoration/nature/rock_single_A',
    'fence':'buildings/neutral/fence_wood_straight',
    'flag':'decoration/props/flag_blue',
    'crate':'decoration/props/crate_A_big',
}
models.update({'road'+c:'tiles/roads/hex_road_'+c for c in 'ABCD'})
models.update({'river'+c:'tiles/rivers/hex_river_'+c for c in ['A','B','C','crossing_A']})
ROOT.mkdir(parents=True, exist_ok=True)
records = {}
for alias, rel in models.items():
    src = prefix + rel + '.gltf'
    data = json.loads(get(base+src))
    folder = ROOT/'source'; folder.mkdir(exist_ok=True)
    for dep in data.get('buffers',[])+data.get('images',[]):
        uri=dep.get('uri','')
        if not uri or uri.startswith('data:'): continue
        url=urllib.parse.urljoin(base+src,uri)
        name=pathlib.PurePosixPath(uri).name
        payload=get(url)
        (folder/name).write_bytes(payload)
        dep['uri']=name
    (folder/(alias+'.gltf')).write_text(json.dumps(data),encoding='utf8')
    records[alias]={'source':src,'commit':sha}
    print(alias, flush=True)
(ROOT/'LICENSE.txt').write_bytes(get(base+'LICENSE.txt'))
(ROOT/'provenance.json').write_text(json.dumps({'repository':REPO,'models':records},indent=2),encoding='utf8')
