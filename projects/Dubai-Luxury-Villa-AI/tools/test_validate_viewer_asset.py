"""Regression checks for the evidence and route guarantees of Pool V4."""
import copy
import hashlib
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch

import validate_viewer_asset as validator


class PoolV4ValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.root_patch = patch.object(validator, 'PROJECT_ROOT', self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.raw = b'GLB bytes shared by manifest, promotion and source receipt'
        self.digest = hashlib.sha256(self.raw).hexdigest()
        self.render = b'\x89PNG\r\n\x1a\n' + struct.pack('>I4sII', 13, b'IHDR', 1600, 900)
        self.render_path = self.root / 'renders/villa-v0.4-pool-context-v4.png'
        self.render_path.parent.mkdir()
        self.render_path.write_bytes(self.render)
        self.receipt_path = self.root / 'validation/v0.4-pool-context-v4-receipt.json'
        self.receipt_path.parent.mkdir()
        self.presentation = ['tour_present_pool', 'tour_present_look_pool']
        self.receipt = {
            'version': 'v0.4-pool-context-v4',
            'status': 'RENDERED_NOT_YET_PROMOTED',
            'presentation_nodes': self.presentation,
            'glb': {'bytes': len(self.raw), 'sha256': self.digest},
            'render': {'bytes': len(self.render), 'sha256': hashlib.sha256(self.render).hexdigest(), 'width': 1600, 'height': 900},
        }
        self.save_receipt()
        boundary = 'GUIDED_PRESENTATION_SEPARATE_FROM_EXPLORE_ROUTE'
        self.manifest = {'presentation_nodes': self.presentation, 'navigation_boundary': boundary}
        self.promotion = {
            'version': 'v0.4-pool-context-v4-feature-promotion',
            'source_workflow_run': 123,
            'viewer_asset': 'projects/Dubai-Luxury-Villa-AI/web-viewer/app/public/villa.glb',
            'navigation_boundary': boundary,
        }
        self.document = {
            'scene': 0,
            'scenes': [{'nodes': [0, 1, 2]}],
            'nodes': [
                {'name': 'tour_pool', 'translation': [-0.55, 1.65, -7.05]},
                {'name': 'tour_present_pool', 'translation': [8.80, 2.05, -14.65], 'extras': {'presentation_role': 'guided-camera', 'tour_stop': 'pool', 'navigation_authority': False}},
                {'name': 'tour_present_look_pool', 'translation': [0.35, 2.15, -4.45], 'extras': {'presentation_role': 'guided-look-target', 'tour_stop': 'pool', 'navigation_authority': False}},
            ],
        }

    def save_receipt(self):
        self.receipt_path.write_text(json.dumps(self.receipt), encoding='utf-8')

    def validate(self):
        validator.validate_pool_v4(self.document, self.manifest, self.promotion, self.raw, self.digest)

    def test_valid_source_packet_passes(self):
        self.validate()

    def test_deleted_source_receipt_fails(self):
        self.receipt_path.unlink()
        with self.assertRaisesRegex(SystemExit, 'missing Pool source receipt'):
            self.validate()

    def test_source_glb_digest_mismatch_fails(self):
        self.receipt['glb']['sha256'] = '0' * 64
        self.save_receipt()
        with self.assertRaisesRegex(SystemExit, 'source receipt does not match committed GLB'):
            self.validate()

    def test_changed_render_fails_even_when_dimensions_are_unchanged(self):
        self.render_path.write_bytes(self.render + b'different image data')
        with self.assertRaisesRegex(SystemExit, 'source receipt does not match committed render'):
            self.validate()

    def test_promotion_boundary_must_match_manifest(self):
        self.promotion['navigation_boundary'] = 'SHARED_CAMERA'
        with self.assertRaisesRegex(SystemExit, 'navigation boundary mismatch'):
            self.validate()

    def test_source_run_cannot_be_missing(self):
        del self.promotion['source_workflow_run']
        with self.assertRaisesRegex(SystemExit, 'source workflow run'):
            self.validate()

    def test_presentation_cannot_claim_navigation_authority(self):
        self.document['nodes'][1]['extras']['navigation_authority'] = True
        with self.assertRaisesRegex(SystemExit, 'presentation metadata mismatch'):
            self.validate()

    def test_duplicate_named_anchor_fails(self):
        self.document['nodes'].append(copy.deepcopy(self.document['nodes'][1]))
        with self.assertRaisesRegex(SystemExit, 'anchor must be unique'):
            self.validate()

    def test_orphaned_anchor_fails(self):
        self.document['scenes'][0]['nodes'].remove(1)
        with self.assertRaisesRegex(SystemExit, 'root of the default scene'):
            self.validate()

    def test_reparented_anchor_cannot_bypass_frozen_coordinates(self):
        self.document['nodes'].append({'translation': [20, 0, 0], 'children': [0]})
        self.document['scenes'][0]['nodes'].append(3)
        with self.assertRaisesRegex(SystemExit, 'root of the default scene'):
            self.validate()

    def test_explore_anchor_cannot_move(self):
        self.document['nodes'][0]['translation'][0] += 1
        with self.assertRaisesRegex(SystemExit, 'Explore anchor moved'):
            self.validate()

    def test_guided_camera_cannot_collapse_to_explore_anchor(self):
        self.document['nodes'][1]['translation'] = list(self.document['nodes'][0]['translation'])
        with self.assertRaisesRegex(SystemExit, 'not separated'):
            self.validate()

    def test_guided_target_cannot_collapse_to_camera(self):
        self.document['nodes'][2]['translation'] = list(self.document['nodes'][1]['translation'])
        with self.assertRaisesRegex(SystemExit, 'look target coincide'):
            self.validate()

    def test_non_finite_coordinates_fail(self):
        self.document['nodes'][1]['translation'][0] = float('nan')
        with self.assertRaisesRegex(SystemExit, 'invalid Pool anchor transform'):
            self.validate()


if __name__ == '__main__':
    unittest.main()
