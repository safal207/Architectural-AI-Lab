"""Regression checks for the evidence and route guarantees of Pool V4."""
import copy
import hashlib
from io import BytesIO
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

import validate_viewer_asset as validator


class PoolV4ValidationTests(unittest.TestCase):
    def setUp(self):
        """Create isolated matching receipts, a real PNG and minimal scene anchors; restore the patched root after each test."""
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.root_patch = patch.object(validator, 'PROJECT_ROOT', self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.raw = b'GLB bytes shared by manifest, promotion and source receipt'
        self.digest = hashlib.sha256(self.raw).hexdigest()
        buffer = BytesIO()
        Image.new('RGB', (1600, 900), (160, 190, 200)).save(buffer, format='PNG')
        self.render = buffer.getvalue()
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
        """Persist the current source receipt so the validator reads the deliberately modified fixture."""
        self.receipt_path.write_text(json.dumps(self.receipt), encoding='utf-8')

    def validate(self):
        """Run the Pool V4 contract against this test packet without invoking unrelated whole-project checks."""
        validator.validate_pool_v4(self.document, self.manifest, self.promotion, self.raw, self.digest)

    def test_valid_source_packet_passes(self):
        """Accept a complete, internally consistent Pool V4 evidence packet."""
        self.validate()

    def assert_invalid_render(self, render):
        """Matching receipts must never make malformed PNG evidence valid."""
        self.render_path.write_bytes(render)
        self.receipt['render'].update(bytes=len(render), sha256=hashlib.sha256(render).hexdigest())
        self.save_receipt()
        with self.assertRaisesRegex(SystemExit, 'invalid Pool source render PNG'):
            self.validate()

    def test_header_only_png_fails_with_matching_receipt(self):
        """Reject a PNG header with no image payload even when its digest and size match the receipt."""
        self.assert_invalid_render(self.render[:24])

    def test_missing_or_truncated_iend_fails_with_matching_receipt(self):
        """Reject missing or partial PNG termination with otherwise matching receipt metadata."""
        for removed in (1, 4, 12):
            with self.subTest(removed=removed):
                self.assert_invalid_render(self.render[:-removed])

    def test_bad_chunk_crc_fails_with_matching_receipt(self):
        """Reject corrupted image data whose chunk checksum was not updated."""
        broken = bytearray(self.render)
        broken[broken.index(b'IDAT') + 4] ^= 1
        self.assert_invalid_render(bytes(broken))

    def test_invalid_compressed_pixels_fail_even_with_valid_chunk_crcs(self):
        """Require actual pixel decoding when chunk structure and checksums alone appear valid."""
        import zlib
        idat = self.render.index(b'IDAT')
        length = struct.unpack_from('>I', self.render, idat - 4)[0]
        # Keep legal PNG chunks but replace DEFLATE with an invalid stream.
        payload = b'not a zlib stream'
        chunk = struct.pack('>I', len(payload)) + b'IDAT' + payload
        chunk += struct.pack('>I', zlib.crc32(b'IDAT' + payload))
        self.assert_invalid_render(self.render[:idat - 4] + chunk + self.render[idat + 4 + length + 4:])

    def test_deleted_source_receipt_fails(self):
        """Require the committed source receipt to exist before accepting a promoted model."""
        self.receipt_path.unlink()
        with self.assertRaisesRegex(SystemExit, 'missing Pool source receipt'):
            self.validate()

    def test_source_glb_digest_mismatch_fails(self):
        """Reject source evidence that identifies different GLB bytes."""
        self.receipt['glb']['sha256'] = '0' * 64
        self.save_receipt()
        with self.assertRaisesRegex(SystemExit, 'source receipt does not match committed GLB'):
            self.validate()

    def test_changed_render_fails_even_when_dimensions_are_unchanged(self):
        """Detect changed image bytes independently of a matching PNG header and dimensions."""
        self.render_path.write_bytes(self.render + b'different image data')
        with self.assertRaisesRegex(SystemExit, 'source receipt does not match committed render'):
            self.validate()

    def test_promotion_boundary_must_match_manifest(self):
        """Reject a promotion that conflates Guided presentation and the Explore route."""
        self.promotion['navigation_boundary'] = 'SHARED_CAMERA'
        with self.assertRaisesRegex(SystemExit, 'navigation boundary mismatch'):
            self.validate()

    def test_source_run_cannot_be_missing(self):
        """Require traceability to a positive source workflow-run identifier."""
        del self.promotion['source_workflow_run']
        with self.assertRaisesRegex(SystemExit, 'source workflow run'):
            self.validate()

    def test_presentation_cannot_claim_navigation_authority(self):
        """Prevent a presentation-only camera from becoming the route authority."""
        self.document['nodes'][1]['extras']['navigation_authority'] = True
        with self.assertRaisesRegex(SystemExit, 'presentation metadata mismatch'):
            self.validate()

    def test_duplicate_named_anchor_fails(self):
        """Reject ambiguous duplicate names for the same presentation anchor."""
        self.document['nodes'].append(copy.deepcopy(self.document['nodes'][1]))
        with self.assertRaisesRegex(SystemExit, 'anchor must be unique'):
            self.validate()

    def test_orphaned_anchor_fails(self):
        """Reject a named anchor that is not reachable as a root of the default scene."""
        self.document['scenes'][0]['nodes'].remove(1)
        with self.assertRaisesRegex(SystemExit, 'root of the default scene'):
            self.validate()

    def test_reparented_anchor_cannot_bypass_frozen_coordinates(self):
        """Reject a parent transform that could move an apparently unchanged local route anchor."""
        self.document['nodes'].append({'translation': [20, 0, 0], 'children': [0]})
        self.document['scenes'][0]['nodes'].append(3)
        with self.assertRaisesRegex(SystemExit, 'root of the default scene'):
            self.validate()

    def test_explore_anchor_cannot_move(self):
        """Keep the Explore anchor at its frozen exported route coordinates."""
        self.document['nodes'][0]['translation'][0] += 1
        with self.assertRaisesRegex(SystemExit, 'Explore anchor moved'):
            self.validate()

    def test_guided_camera_cannot_collapse_to_explore_anchor(self):
        """Require the wider Guided camera to remain spatially separate from the Explore anchor."""
        self.document['nodes'][1]['translation'] = list(self.document['nodes'][0]['translation'])
        with self.assertRaisesRegex(SystemExit, 'not separated'):
            self.validate()

    def test_guided_target_cannot_collapse_to_camera(self):
        """Reject coincident Guided camera and look-target positions."""
        self.document['nodes'][2]['translation'] = list(self.document['nodes'][1]['translation'])
        with self.assertRaisesRegex(SystemExit, 'look target coincide'):
            self.validate()

    def test_non_finite_coordinates_fail(self):
        """Reject NaN anchor coordinates before distance checks can silently accept them."""
        self.document['nodes'][1]['translation'][0] = float('nan')
        with self.assertRaisesRegex(SystemExit, 'invalid Pool anchor transform'):
            self.validate()


if __name__ == '__main__':
    unittest.main()
