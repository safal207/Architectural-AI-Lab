import hashlib
import json
import struct
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = PROJECT_ROOT / 'web-viewer' / 'app'
GLB_PATH = APP_ROOT / 'public' / 'villa.glb'
MANIFEST_PATH = APP_ROOT / 'public' / 'villa.asset.json'

V04_TOUR_ANCHORS = {
    'tour_graph_root',
    'tour_entry',
    'tour_living',
    'tour_dining',
    'tour_stair_ground',
    'tour_stair_upper',
    'tour_master',
    'tour_pool',
}
V04_LOOK_TARGETS = {
    'tour_look_entry',
    'tour_look_living',
    'tour_look_dining',
    'tour_look_stair_ground',
    'tour_look_stair_upper',
    'tour_look_master',
    'tour_look_pool',
}

INTERIOR3_REQUIRED_NODES = {
    'stair_step_v04_00',
    'stair_landing_v04',
    'stair_top_rail_v04_r2',
    'stair_glass_guard_v04_r2',
    'upper_landing_side_wall_v04_r4',
    'upper_corridor_bridge_v04_r3',
    'kitchen_island_v04',
    'living_media_wall_v04',
    'master_bed_base_v04',
    'master_door_open_v04_r4',
    'master_door_handle_open_v04_r4',
    'private_door_v04',
}

VERSION_RULES = {
    'v0.3-life2': {
        'status': 'FORM_MATERIAL_LIGHT_LIFE_GATED',
        'promotion': PROJECT_ROOT / 'validation' / 'v0.3-viewer-promotion.json',
        'required_tour_anchors': set(),
        'required_look_targets': set(),
        'required_interior_nodes': set(),
        'promotion_kind': 'released',
        'forbid_punctual_lights': False,
    },
    'v0.4-interior2': {
        'status': 'FORM_MATERIAL_LIGHT_LIFE_INTERIOR_TOUR_GATED',
        'promotion': PROJECT_ROOT / 'validation' / 'v0.4-viewer-promotion.json',
        'required_tour_anchors': V04_TOUR_ANCHORS,
        'required_look_targets': V04_LOOK_TARGETS,
        'required_interior_nodes': {
            'stair_step_v04_00',
            'stair_landing_v04',
            'stair_top_rail_v04_r2',
            'stair_glass_guard_v04_r2',
            'kitchen_island_v04',
            'living_media_wall_v04',
            'master_bed_base_v04',
            'master_door_v04',
            'private_door_v04',
        },
        'promotion_kind': 'released',
        'forbid_punctual_lights': False,
    },
    'v0.4-interior3-feature-candidate': {
        'status': 'FEATURE_BRANCH_VISUAL_QA_ONLY',
        'promotion': PROJECT_ROOT / 'validation' / 'v0.4-interior3-feature-promotion.json',
        'required_tour_anchors': V04_TOUR_ANCHORS,
        'required_look_targets': V04_LOOK_TARGETS,
        'required_interior_nodes': INTERIOR3_REQUIRED_NODES,
        'promotion_kind': 'feature-candidate',
        'forbid_punctual_lights': True,
    },
    'v0.4-pool-context-v4-feature-candidate': {
        'status': 'FEATURE_BRANCH_VISUAL_QA_ONLY',
        'promotion': PROJECT_ROOT / 'validation' / 'v0.4-pool-context-v4-feature-promotion.json',
        'required_tour_anchors': V04_TOUR_ANCHORS,
        'required_look_targets': V04_LOOK_TARGETS,
        'required_interior_nodes': INTERIOR3_REQUIRED_NODES | {
            'tour_present_pool',
            'tour_present_look_pool',
            'pool_context_ground_v3',
            'pool_context_planter_edge_v3',
            'pool_context_agaves_v3',
            'pool_context_grasses_v3',
        },
        'promotion_kind': 'feature-candidate',
        'forbid_punctual_lights': True,
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


def validate_promotion(version, rules, promotion, raw, digest):
    if promotion.get('bytes') != len(raw):
        fail('promotion receipt byte count does not match committed asset')
    if promotion.get('sha256') != digest:
        fail('promotion receipt SHA-256 does not match committed asset')

    if rules['promotion_kind'] == 'released':
        if promotion.get('promotion') != 'APPROVED_FOR_PORTFOLIO_VIEWER':
            fail(f"viewer promotion not approved: {promotion.get('promotion')}")
        return

    if rules['promotion_kind'] == 'feature-candidate':
        if promotion.get('scope') != 'FEATURE_BRANCH_ONLY':
            fail(f"feature scope mismatch: {promotion.get('scope')}")
        if promotion.get('main_untouched') is not True:
            fail('feature receipt does not preserve main boundary')
        if promotion.get('lighting_boundary') != 'BLENDER_PUNCTUAL_LIGHTS_STRIPPED_BROWSER_OWNS_RUNTIME_LIGHTING':
            fail(f"feature lighting boundary mismatch: {promotion.get('lighting_boundary')}")
        return

    fail(f'unknown promotion kind for {version}: {rules["promotion_kind"]}')


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

    validate_promotion(version, rules, promotion, raw, digest)

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

    required_look = rules['required_look_targets']
    missing_look = sorted(required_look - node_names)
    if missing_look:
        fail(f'missing virtual-tour look targets: {missing_look}')
    if required_look and set(manifest.get('tour_look_targets', [])) != required_look:
        fail(f"manifest tour look targets mismatch: {manifest.get('tour_look_targets')}")

    required_interior = rules['required_interior_nodes']
    missing_interior = sorted(required_interior - node_names)
    if missing_interior:
        fail(f'missing interior-tour nodes: {missing_interior}')

    if rules['promotion_kind'] == 'feature-candidate':
        if 'upper_stone_spine' in node_names:
            fail('feature viewer regressed: legacy upper_stone_spine is present')
        if 'master_door_v04' in node_names:
            fail('feature viewer regressed: closed master_door_v04 is present')

    if rules['forbid_punctual_lights']:
        used_extensions = set(document.get('extensionsUsed') or [])
        top_extensions = document.get('extensions') or {}
        node_light_refs = [
            node.get('name')
            for node in document.get('nodes', [])
            if 'KHR_lights_punctual' in (node.get('extensions') or {})
        ]
        if (
            'KHR_lights_punctual' in used_extensions
            or 'KHR_lights_punctual' in top_extensions
            or node_light_refs
        ):
            fail(f'runtime-lighting boundary violated: {node_light_refs}')

    if version == 'v0.4-pool-context-v4-feature-candidate':
        presentation_nodes = set(manifest.get('presentation_nodes', []))
        if presentation_nodes != {'tour_present_pool', 'tour_present_look_pool'}:
            fail(f'Pool presentation nodes mismatch: {sorted(presentation_nodes)}')
        if manifest.get('navigation_boundary') != 'GUIDED_PRESENTATION_SEPARATE_FROM_EXPLORE_ROUTE':
            fail(f"Pool navigation boundary mismatch: {manifest.get('navigation_boundary')}")

    if version == 'v0.4-interior2':
        if promotion.get('vite_build') != 'PASS':
            fail('v0.4 promotion did not record Vite build PASS')
        if promotion.get('binary_delivery_smoke_test') != 'PASS':
            fail('v0.4 promotion did not record binary delivery PASS')
        if set(promotion.get('tour_anchors_verified', [])) != required_tour:
            fail('v0.4 promotion receipt tour anchors mismatch')
        if set(promotion.get('tour_look_targets_verified', [])) != required_look:
            fail('v0.4 promotion receipt look targets mismatch')

    print(f'Viewer asset OK: {version} · {len(raw)} bytes · sha256={digest}')
    print('Room anchors OK:', ', '.join(sorted(ROOM_ANCHORS)))
    print('Frozen material family OK')
    if required_tour:
        print('Virtual-tour anchors OK:', ', '.join(sorted(required_tour)))
        print('Virtual-tour look targets OK:', ', '.join(sorted(required_look)))
        print('Interior nodes OK:', ', '.join(sorted(required_interior)))
    if rules['forbid_punctual_lights']:
        print('Runtime-lighting boundary OK: GLB has no KHR_lights_punctual')


if __name__ == '__main__':
    main()
