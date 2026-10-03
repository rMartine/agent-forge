import concurrent.futures
import http.server
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import research_policy as policy


class Handler(http.server.BaseHTTPRequestHandler):
    requests_seen = []

    def do_GET(self):
        self.__class__.requests_seen.append((self.path, self.headers.get('Authorization')))
        if self.path == '/redirect-outside':
            self.send_response(302)
            self.send_header('Location', 'http://127.0.0.1:1/forbidden')
            self.end_headers()
        elif self.path == '/large':
            self.send_response(200)
            self.send_header('Content-Length', '99999')
            self.end_headers()
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"value":42}')

    def do_POST(self):
        self.rfile.read(int(self.headers.get('Content-Length', '0')))
        self.do_GET()

    def log_message(self, *_):
        pass


class PolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.allowed = self.root / 'allowed'
        self.allowed.mkdir()
        self.authorization = self.root / 'authorization.json'
        self.old_environment = dict(os.environ)
        os.environ['AGENT_FORGE_RESEARCH_AUTHORIZATION'] = str(self.authorization)
        self.document = {
            'version': 1, 'authorizationReference': 'Unit test fixture only', 'purpose': 'Exercise a local fixture',
            'readRoots': [str(self.allowed)], 'writeRoots': [str(self.allowed)],
            'network': {'rules': [{'origin': self.origin, 'methods': ['GET', 'POST'], 'pathPrefixes': ['/'],
                                   'allowPrivateAddresses': True, 'models': ['fixture-model'], 'credentialNames': ['RESEARCH_TEST_KEY']}],
                        'maxRequests': 10, 'maxResponseBytes': 1024},
            'credentials': {'allowedEnvironmentVariables': ['RESEARCH_TEST_KEY'], 'files': []}}
        self.save()
        Handler.requests_seen = []
        policy._credential_values.clear()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.old_environment)
        self.temporary.cleanup()

    def save(self):
        self.authorization.write_text(json.dumps(self.document))

    def test_files_preserve_original_and_reject_escape(self):
        output = self.allowed / 'result.txt'
        policy.publish_file(b'original', output)
        self.assertEqual(policy.authorize_read(output).read_bytes(), b'original')
        with self.assertRaises(policy.AuthorizationError): policy.publish_file(b'replaced', output)
        with self.assertRaises(policy.AuthorizationError): policy.publish_file(b'x', self.root / 'outside')
        with self.assertRaises(policy.AuthorizationError): policy.authorize_read(self.authorization)
        self.assertEqual(output.read_bytes(), b'original')

    def test_failed_buffered_write_does_not_publish(self):
        target = self.allowed / 'partial.txt'
        with self.assertRaises(ValueError):
            with policy.authorized_open(target, 'w') as stream:
                stream.write('partial')
                raise ValueError('fixture')
        self.assertFalse(target.exists())

    def test_allowed_network_response(self):
        response = policy.authorized_request('GET', self.origin + '/metadata')
        self.assertEqual(response.json(), {'value': 42})
        response.raise_for_status()

    def test_private_addresses_require_explicit_permission(self):
        self.document['network']['rules'][0]['allowPrivateAddresses'] = False
        self.save()
        with self.assertRaises(policy.AuthorizationError): policy.authorized_request('GET', self.origin + '/metadata')
        self.assertEqual(Handler.requests_seen, [])

    def test_redirect_does_not_escape(self):
        with self.assertRaises(policy.AuthorizationError): policy.authorized_request('GET', self.origin + '/redirect-outside')
        self.assertEqual(len(Handler.requests_seen), 1)

    def test_download_limit(self):
        with self.assertRaises(policy.AuthorizationError): policy.authorized_request('GET', self.origin + '/large')

    def test_credentials_only_authorized_header(self):
        os.environ['RESEARCH_TEST_KEY'] = 'a-synthetic-secret-used-only-in-tests'
        key = policy.credential('RESEARCH_TEST_KEY')
        policy.authorized_request('GET', self.origin + '/metadata', headers={'Authorization': 'Bearer ' + key})
        self.assertEqual(Handler.requests_seen[-1][1], 'Bearer ' + key)
        with self.assertRaises(policy.AuthorizationError):
            policy.authorized_request('POST', self.origin + '/model', json={'model': 'fixture-model', 'prompt': key})
        with self.assertRaises(policy.AuthorizationError):
            policy.authorized_request('GET', self.origin + '/metadata', headers={'Authorization': 'Bearer unrelated'})

    def test_environment_files_do_not_search_parents(self):
        env_file = self.root / '.env'
        env_file.write_text('RESEARCH_TEST_KEY=synthetic-file-value')
        with self.assertRaises(policy.AuthorizationError): policy.credential('RESEARCH_TEST_KEY', env_file)
        self.document['credentials']['files'] = [str(env_file)]
        self.save()
        self.assertEqual(policy.credential('RESEARCH_TEST_KEY', env_file), 'synthetic-file-value')

    def test_secret_cannot_travel_in_custom_headers_or_encoded_query(self):
        os.environ['RESEARCH_TEST_KEY'] = 'synthetic-value/fixture'
        key = policy.credential('RESEARCH_TEST_KEY')
        with self.assertRaises(policy.AuthorizationError):
            policy.authorized_request('GET', self.origin + '/metadata', headers={'X-Debug': key})
        with self.assertRaises(policy.AuthorizationError):
            policy.authorized_request('GET', self.origin + '/metadata', params={'token': key})
        self.assertEqual(Handler.requests_seen, [])

    def test_exclusive_publication_preserves_concurrent_output_even_with_overwrite_permission(self):
        self.document['allowOverwrite'] = True
        self.save()
        target = self.allowed / 'concurrent.txt'
        with self.assertRaises(FileExistsError):
            with policy.authorized_open(target, 'x') as stream:
                stream.write('replacement')
                target.write_text('concurrent original')
        self.assertEqual(target.read_text(), 'concurrent original')

    def test_unauthorized_model_rejected_before_request(self):
        with self.assertRaises(policy.AuthorizationError): policy.authorized_request('POST', self.origin + '/model', json={'model': 'other'})
        self.assertEqual(Handler.requests_seen, [])

    def test_raw_json_and_form_data_cannot_change_the_authorized_model(self):
        for data, content_type in [('{"model":"other"}', 'application/json'), ('model=other', 'application/x-www-form-urlencoded')]:
            with self.assertRaises(policy.AuthorizationError):
                policy.authorized_request('POST', self.origin + '/model', data=data, headers={'Content-Type': content_type})
        self.assertEqual(Handler.requests_seen, [])

    def test_encoded_and_literal_parent_paths_are_rejected_before_sending(self):
        self.document['network']['rules'][0]['pathPrefixes'] = ['/allowed/']
        self.save()
        for path in ['/allowed/../private', '/allowed/%2e%2e/private', '/allowed/%252e%252e/private', '/allowed/%2e%2e%2fprivate']:
            with self.assertRaises(policy.AuthorizationError):
                policy.authorized_request('GET', self.origin + path)
        self.assertEqual(Handler.requests_seen, [])

    def test_concurrent_limit_is_shared(self):
        self.document['network']['maxRequests'] = 2
        self.save()
        def run(_):
            try:
                policy.authorized_request('GET', self.origin + '/metadata')
                return True
            except policy.AuthorizationError:
                return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            result = list(executor.map(run, range(6)))
        self.assertEqual(sum(result), 2)
        self.assertEqual(len(Handler.requests_seen), 2)

    def test_paid_cost_is_reserved(self):
        self.document['network']['maxCost'] = 0.5
        self.save()
        with self.assertRaises(policy.AuthorizationError): policy.authorized_request('POST', self.origin + '/model', json={'model': 'fixture-model'})
        policy.authorized_request('POST', self.origin + '/model', json={'model': 'fixture-model'}, estimated_cost=.4)
        with self.assertRaises(policy.AuthorizationError): policy.authorized_request('POST', self.origin + '/model', json={'model': 'fixture-model'}, estimated_cost=.4)

    def test_missing_authorization_never_sends(self):
        del os.environ['AGENT_FORGE_RESEARCH_AUTHORIZATION']
        with self.assertRaises(policy.AuthorizationError): policy.authorized_request('GET', self.origin)
        self.assertEqual(Handler.requests_seen, [])


if __name__ == '__main__':
    unittest.main()
