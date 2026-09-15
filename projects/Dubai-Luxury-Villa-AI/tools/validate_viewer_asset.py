import hashlib
import json
import struct
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = PROJECT_ROOT / 'web-viewer' / 'app'
GLB_PATH = APP_ROOT / 'public' / 'villa.glb'
MANIFEST_PATH = APP_ROOT / 'public' / 'villa.asset.json'

VERSION_RULES = {
    'v0.3-life2': {
        'status': 'FORM_MATERIAL_LIGHT_LIFE_GATED',
        'promotion': PROJECT_ROOT / 'validation' / 'v0.3-viewer-promotion.json',
        'required_tour_anchors': set(),
        'required_interior_nodes': set(),
    },
    'v0.4-interior1': {
        'status': 'FORM_MATERIAL_LIGHT_LIFE_INTERIOR_TOUR_GATED',
        'promotion': PROJECT_ROOT / 'validation' / 'v0.4-viewer-promotion.json',
        'required_tour_anchors': {
            'tour_graph_root',
            'tour_entry',
            'tour_living',
            'tour_dining',
            'tour_stair_ground',
            'tour_stair_upper',
            'tour_master',
            'tour_pool',
        },
        'required_interior_nodes': {
            'stair_step_v04_00',
            'stair_landing_v04',
            'kitchen_island_v04',
            'living_media_wall_v04',
            'master_bed_base_v04',
            'master_door_v04',
            'private_door_v04',
        },
    },
}

ROOM_ANCHORS = {'living_room', 'master_bedroom', 'pool_terrace'}
REQUIRED_MATERIALS = {
    'M4_OrganicWarmLimestone',
    'M3_IvoryPlaster',
    'M2_WalnutTimber',
    'M3_SmokeArchitecturalGlass',
    'M3_MineralAquaWater',
}


def fail(message):
    raise SystemExit(message)


def parse_glb(raw):
    if len(raw) < 20:
        fail('GLB is too small')
    magic, version, length = struct.unpack_from('<4sII', raw, 0)
    if magic != b'glTF':
        fail(f'invalid GLB magic: {magic!r}')
    if version != 2:
        fail(f'unexpected GLB version: {version}')
    if length != len(raw):
        fail(f'GLB container length mismatch: {length} != {len(raw)}')

    json_length, json_type = struct.unpack_from('<II', raw, 12)
    if json_type != 0x4E4F534A:
        fail(f'first GLB chunk is not JSON: {hex(json_type)}')
    return json.loads(raw[20:20 + json_length].decode('utf-8').rstrip('\x00 '))


def main():
    for path in (GLB_PATH, MANIFEST_PATH):
        if not path.is_file() or path.stat().st_size == 0:
            fail(f'missing viewer asset evidence: {path}')

    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    version = manifest.get('version')
    rules = VERSION_RULES.get(version)
    if not rules:
        fail(f'unsupported viewer asset version: {version}')

    promotion_path = rules['promotion']
    if not promotion_path.is_file() or promotion_path.stat().st_size == 0:
        fail(f'missing promotion receipt for {version}: {promotion_path}')

    promotion = json.loads(promotion_path.read_text(encoding='utf-8'))
    raw = GLB_PATH.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()

    if manifest.get('status') != rules['status']:
        fail(f"unexpected manifest status: {manifest.get('status')}")
    if manifest.get('glb', {}).get('bytes') != len(raw):
        fail('manifest GLB byte count does not match committed asset')
    if manifest.get('glb', {}).get('sha256') != digest:
        fail('manifest SHA-256 does not match committed asset')
    if promotion.get('bytes') != len(raw):
        fail('promotion receipt byte count does not match committed asset')
    if promotion.get('sha256') != digest:
        fail('promotion receipt SHA-256 does not match committed asset')
    if promotion.get('promotion') != 'APPROVED_FOR_PORTFOLIO_VIEWER':
        fail(f"viewer promotion not approved: {promotion.get('promotion')}")

    document = parse_glb(raw)
    node_names = {node.get('name') for node in document.get('nodes', []) if node.get('name')}
    material_names = {mat.get('name') for mat in document.get('materials', []) if mat.get('name')}

    missing_rooms = sorted(ROOM_ANCHORS - node_names)
    if missing_rooms:
        fail(f'missing room anchors: {missing_rooms}')
    if set(manifest.get('room_anchors', [])) != ROOM_ANCHORS:
        fail(f"manifest room anchors mismatch: {manifest.get('room_anchors')}")

    missing_materials = sorted(REQUIRED_MATERIALS - material_names)
    if missing_materials:
        fail(f'missing frozen material family: {missing_materials}')

    required_tour = rules['required_tour_anchors']
    missing_tour = sorted(required_tour - node_names)
    if missing_tour:
        fail(f'missing virtual-tour anchors: {missing_tour}')
    if required_tour and set(manifest.get('tour_anchors', [])) != required_tour:
        fail(f"manifest tour anchors mismatch: {manifest.get('tour_anchors')}")

    required_interior = rules['required_interior_nodes']
    missing_interior = sorted(required_interior - node_names)
    if missing_interior:
        fail(f'missing interior-tour nodes: {missing_interior}')

    if version == 'v0.4-interior1':
        if promotion.get('vite_build') != 'PASS':
            fail('v0.4 promotion did not record Vite build PASS')
        if promotion.get('binary_delivery_smoke_test') != 'PASS':
            fail('v0.4 promotion did not record binary delivery PASS')
        if set(promotion.get('tour_anchors_verified', [])) != required_tour:
            fail('v0.4 promotion receipt tour anchors mismatch')

    print(f'Viewer asset OK: {version} · {len(raw)} bytes · sha256={digest}')
    print('Room anchors OK:', ', '.join(sorted(ROOM_ANCHORS)))
    print('Frozen material family OK')
    if required_tour:
        print('Virtual-tour anchors OK:', ', '.join(sorted(required_tour)))
        print('Interior nodes OK:', ', '.join(sorted(required_interior)))


if __name__ == '__main__':
    main()
