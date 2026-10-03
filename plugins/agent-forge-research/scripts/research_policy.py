"""Scoped file, credential and HTTP operations for an authorized research task.

The policy records human authorization; creating it does not grant host permissions.
Network requests pin a validated address, verify TLS for the original hostname,
ignore ambient proxies/netrc, and never retry a possibly billed operation.
"""
from __future__ import annotations

import contextlib
import hashlib
import http.client
import io
import ipaddress
import json
import math
import os
from pathlib import Path
import socket
import ssl
import tempfile
import time
from urllib.parse import parse_qs, unquote, urlencode, urljoin, urlsplit, urlunsplit


class AuthorizationError(RuntimeError):
    pass


_credential_values: dict[str, str] = {}


def _policy():
    configured = os.environ.get("AGENT_FORGE_RESEARCH_AUTHORIZATION")
    if not configured:
        raise AuthorizationError("An explicit research authorization file is required")
    policy_path = Path(configured).resolve(strict=True)
    if policy_path.stat().st_size > 262144:
        raise AuthorizationError("Authorization file exceeds the size limit")
    policy = json.loads(policy_path.read_text(encoding="utf-8-sig"))
    if policy.get("version") != 1 or not policy.get("authorizationReference") or not policy.get("purpose"):
        raise AuthorizationError("Authorization reference and purpose are required")
    for field in ("readRoots", "writeRoots"):
        roots = policy.get(field, [])
        if not isinstance(roots, list) or any(not isinstance(root, str) or not Path(root).is_absolute() for root in roots):
            raise AuthorizationError("Authorized roots must be absolute paths")
    maximum_cost = policy.get("network", {}).get("maxCost")
    if maximum_cost is not None and (isinstance(maximum_cost, bool) or not isinstance(maximum_cost, (int, float)) or not math.isfinite(maximum_cost) or maximum_cost < 0):
        raise AuthorizationError("Invalid authorized cost limit")
    return policy_path, policy


def _inside(candidate: Path, roots):
    return any(candidate.is_relative_to(Path(root).resolve(strict=True)) for root in roots)


def authorize_read(path):
    _, policy = _policy()
    resolved = Path(path).resolve(strict=True)
    if not resolved.is_file() or not _inside(resolved, policy.get("readRoots", [])):
        raise AuthorizationError("File read is outside the authorized roots")
    if resolved.stat().st_size > policy.get("maxReadBytes", 50 * 1024 * 1024):
        raise AuthorizationError("File exceeds the authorized read limit")
    return resolved


def authorize_write(path):
    _, policy = _policy()
    requested = Path(path).absolute()
    if requested.is_symlink():
        raise AuthorizationError("Writing through a symbolic link is not allowed")
    resolved = requested.resolve()
    if not _inside(resolved, policy.get("writeRoots", [])):
        raise AuthorizationError("File write is outside the authorized roots")
    if resolved.exists() and not policy.get("allowOverwrite", False):
        raise AuthorizationError("Replacing an existing output requires authorization")
    return resolved


def publish_file(source_or_bytes, target, *, exclusive=False):
    destination = authorize_write(target)
    data = bytes(source_or_bytes) if isinstance(source_or_bytes, (bytes, bytearray)) else authorize_read(source_or_bytes).read_bytes()
    _, policy = _policy()
    if len(data) > policy.get("maxWriteBytes", 50 * 1024 * 1024):
        raise AuthorizationError("Output exceeds the authorized write limit")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination = authorize_write(destination)
    descriptor, temporary = tempfile.mkstemp(prefix=".research-output-", dir=destination.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        authorize_write(destination)
        if policy.get("allowOverwrite", False) and not exclusive:
            os.replace(temporary, destination)
        else:
            # A hard link publishes atomically and cannot overwrite a raced output.
            os.link(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return destination


@contextlib.contextmanager
def authorized_open(path, mode="r", encoding=None, **kwargs):
    if mode in ("r", "rt", "rb"):
        with authorize_read(path).open(mode, encoding=None if "b" in mode else encoding or "utf-8", **kwargs) as stream:
            yield stream
    elif mode in ("w", "wt", "wb", "x", "xt", "xb"):
        authorize_write(path)
        if "x" in mode and Path(path).exists():
            raise FileExistsError("Output already exists")
        stream = io.BytesIO() if "b" in mode else io.StringIO(newline=kwargs.get("newline"))
        try:
            yield stream
            data = stream.getvalue()
            publish_file(data if isinstance(data, bytes) else data.encode(encoding or "utf-8"), path, exclusive="x" in mode)
        finally:
            stream.close()
    else:
        raise AuthorizationError("Append and update modes are not supported")


def credential(name, env_path=None):
    _, policy = _policy()
    allowed = policy.get("credentials", {})
    value = None
    if env_path is not None:
        resolved = Path(env_path).resolve(strict=True)
        if str(resolved) not in {str(Path(p).resolve(strict=True)) for p in allowed.get("files", [])}:
            raise AuthorizationError("Credential file is not authorized")
        if name not in allowed.get("allowedEnvironmentVariables", []):
            raise AuthorizationError("Credential name is not authorized")
        if resolved.stat().st_size > 65536:
            raise AuthorizationError("Credential file exceeds size limit")
        for line in resolved.read_text(encoding="utf-8-sig").splitlines():
            key, separator, candidate = line.partition("=")
            if separator and key.strip() == name:
                value = candidate.strip().strip("\"'")
                break
    elif name in allowed.get("allowedEnvironmentVariables", []):
        value = os.environ.get(name)
    else:
        raise AuthorizationError("Credential name is not authorized")
    if not value:
        raise AuthorizationError("The authorized credential is unavailable")
    _credential_values[name] = value
    return value


@contextlib.contextmanager
def _locked_usage(policy_path):
    lock_path = policy_path.with_name(policy_path.name + ".usage.lock")
    descriptor = None
    for _ in range(100):
        try:
            descriptor = os.open(lock_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            break
        except FileExistsError:
            time.sleep(.02)
    if descriptor is None:
        raise AuthorizationError("Authorization usage is busy; operation was not sent")
    try:
        yield
    finally:
        os.close(descriptor)
        lock_path.unlink(missing_ok=True)


def _reserve_request(policy_path, policy, estimate):
    network = policy.get("network", {})
    limit = network.get("maxRequests")
    if limit is not None and (not isinstance(limit, int) or isinstance(limit, bool) or limit < 1):
        raise AuthorizationError("The authorized request limit must be positive")
    maximum_cost = network.get("maxCost")
    if maximum_cost is not None and (not isinstance(estimate, (int, float)) or isinstance(estimate, bool) or estimate <= 0):
        raise AuthorizationError("A positive maximum operation cost must be reserved")
    if estimate is not None and (not isinstance(estimate, (int, float)) or estimate < 0 or not math.isfinite(estimate)):
        raise AuthorizationError("Invalid maximum operation cost")
    usage_path = policy_path.with_name(policy_path.name + ".usage.json")
    with _locked_usage(policy_path):
        usage = json.loads(usage_path.read_text()) if usage_path.exists() else {"requestsReserved": 0, "costReserved": 0}
        if limit is not None and usage["requestsReserved"] + 1 > limit:
            raise AuthorizationError("Authorized request limit reached")
        if maximum_cost is not None and usage["costReserved"] + estimate > maximum_cost:
            raise AuthorizationError("Authorized cost limit reached")
        usage["requestsReserved"] += 1
        usage["costReserved"] += estimate or 0
        temporary = usage_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(usage), encoding="utf-8")
        os.replace(temporary, usage_path)
    # Reservation remains after failure/timeout: a remote charge may have occurred.


def _destination(policy, method, url, body):
    parsed = urlsplit(url)
    if parsed.scheme not in ("https", "http") or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise AuthorizationError("Invalid request destination")
    decoded_path = parsed.path
    for _ in range(4):
        decoded = unquote(decoded_path)
        if decoded == decoded_path:
            break
        decoded_path = decoded
    if unquote(decoded_path) != decoded_path or "\\" in decoded_path or any(part in (".", "..") for part in decoded_path.split("/")) or any(ord(char) < 32 for char in decoded_path):
        raise AuthorizationError("Ambiguous request path is not authorized")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    origin = f"{parsed.scheme}://{parsed.hostname.lower()}:{port}"
    rule = None
    for candidate in policy.get("network", {}).get("rules", []):
        configured = urlsplit(candidate.get("origin", ""))
        allowed_origin = f"{configured.scheme}://{(configured.hostname or '').lower()}:{configured.port or (443 if configured.scheme == 'https' else 80)}"
        if origin == allowed_origin and method in candidate.get("methods", []) and any(decoded_path.startswith(p) for p in candidate.get("pathPrefixes", [])):
            rule = candidate
            break
    if rule is None:
        raise AuthorizationError("Destination or operation is outside the authorized scope")
    if isinstance(body, dict) and "model" in body and body["model"] not in rule.get("models", []):
        raise AuthorizationError("External model is not authorized")
    addresses = list(dict.fromkeys(info[4][0] for info in socket.getaddrinfo(parsed.hostname, port, type=socket.SOCK_STREAM)))
    if not addresses or (not rule.get("allowPrivateAddresses", False) and any(not ipaddress.ip_address(ip).is_global for ip in addresses)):
        raise AuthorizationError("Destination resolves outside the authorized network scope")
    return parsed, rule, addresses[0], port


class _PinnedTLS(http.client.HTTPSConnection):
    def __init__(self, hostname, address, port, timeout):
        super().__init__(hostname, port=port, timeout=timeout, context=ssl.create_default_context())
        self._address = address

    def connect(self):
        raw = socket.create_connection((self._address, self.port), self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except Exception:
            raw.close()
            raise


def authorized_request(method, url, **kwargs):
    import requests
    policy_path, policy = _policy()
    method = method.upper()
    headers = dict(kwargs.pop("headers", {}) or {})
    params = kwargs.pop("params", None)
    if params:
        parts = urlsplit(url)
        query = urlencode(params, doseq=True)
        url = urlunsplit(parts._replace(query="&".join(filter(None, [parts.query, query]))))
    json_body = kwargs.pop("json", None)
    data = kwargs.pop("data", None)
    timeout = kwargs.pop("timeout", 30)
    timeout = max(timeout) if isinstance(timeout, tuple) else timeout
    timeout = min(float(timeout), 120)
    redirects = kwargs.pop("allow_redirects", True)
    kwargs.pop("stream", None)
    estimate = kwargs.pop("estimated_cost", None)
    if kwargs.pop("verify", True) is not True or kwargs:
        raise AuthorizationError("Unsupported request options")
    if json_body is not None:
        payload = json.dumps(json_body).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")
    elif isinstance(data, dict):
        payload = urlencode(data, doseq=True).encode("utf-8")
        headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    else:
        payload = data.encode("utf-8") if isinstance(data, str) else data
    operation_body = json_body if json_body is not None else data if isinstance(data, dict) else None
    content_type = next((value for key, value in headers.items() if key.lower() == "content-type"), "").split(";", 1)[0].strip().lower()
    if json_body is None and payload and content_type == "application/json":
        try:
            operation_body = json.loads(payload)
        except (ValueError, UnicodeDecodeError):
            raise AuthorizationError("Invalid JSON operation body") from None
    elif json_body is None and payload and content_type == "application/x-www-form-urlencoded":
        fields = parse_qs(payload.decode("utf-8"), keep_blank_values=True)
        if "model" in fields:
            if len(fields["model"]) != 1:
                raise AuthorizationError("Ambiguous external model selection")
            operation_body = {"model": fields["model"][0]}
    network = policy.get("network", {})
    if len(payload or b"") > network.get("maxRequestBytes", 2 * 1024 * 1024):
        raise AuthorizationError("Request payload exceeds authorization")
    for redirect in range(6):
        try:
            parsed, rule, address, port = _destination(policy, method, url, operation_body)
        except (ValueError, socket.gaierror):
            raise AuthorizationError("Destination validation failed") from None
        if any(k.lower() in ("cookie", "proxy-authorization", "host") for k in headers):
            raise AuthorizationError("Ambient identity or host override is not allowed")
        allowed_names = rule.get("credentialNames", [])
        for name, value in _credential_values.items():
            if value in (payload or b"").decode("utf-8", errors="ignore"):
                raise AuthorizationError("Credentials cannot be sent as model content")
            if value in unquote(url) and (name not in allowed_names or not rule.get("allowCredentialQuery", False)):
                raise AuthorizationError("Credential query is not authorized")
            for header_name, header_value in headers.items():
                if value in str(header_value) and (header_name.lower() not in ("authorization", "x-api-key", "api-key") or name not in allowed_names or header_value not in (value, "Bearer " + value)):
                    raise AuthorizationError("Credentials must use an authorized authentication header")
        for name, value in headers.items():
            if name.lower() in ("authorization", "x-api-key", "api-key"):
                if not any(key in allowed_names and value in (secret, "Bearer " + secret) for key, secret in _credential_values.items()):
                    raise AuthorizationError("Request credential does not match authorized configuration")
        _reserve_request(policy_path, policy, estimate)
        connection = _PinnedTLS(parsed.hostname, address, port, timeout) if parsed.scheme == "https" else http.client.HTTPConnection(address, port=port, timeout=timeout)
        request_headers = {**headers, "Host": parsed.netloc, "Accept-Encoding": "identity"}
        target = urlunsplit(("", "", parsed.path or "/", parsed.query, ""))
        try:
            connection.request(method, target, body=payload, headers=request_headers)
            response = connection.getresponse()
            limit = network.get("maxResponseBytes", 2 * 1024 * 1024)
            content_length = response.getheader("Content-Length")
            if content_length and int(content_length) > limit:
                raise AuthorizationError("Response exceeds authorized download size")
            content = response.read(limit + 1)
            if len(content) > limit:
                raise AuthorizationError("Response exceeds authorized download size")
            result = requests.Response()
            result.status_code = response.status
            result.headers = requests.structures.CaseInsensitiveDict(response.getheaders())
            result._content = content
            result.encoding = requests.utils.get_encoding_from_headers(result.headers)
            result.url = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
            result.reason = response.reason
        except AuthorizationError:
            raise
        except Exception:
            raise requests.RequestException("Authorized request failed; no automatic retry was made") from None
        finally:
            connection.close()
        if result.status_code not in (301, 302, 303, 307, 308) or not redirects:
            return result
        if method not in ("GET", "HEAD"):
            raise AuthorizationError("Redirect of a submitted operation requires a new explicit operation")
        location = result.headers.get("Location")
        if not location or redirect == 5:
            raise AuthorizationError("Redirect limit reached or missing destination")
        redirected = urljoin(url, location)
        if urlsplit(redirected).netloc != parsed.netloc or urlsplit(redirected).scheme != parsed.scheme:
            headers = {k: v for k, v in headers.items() if k.lower() not in ("authorization", "x-api-key", "api-key")}
        url = redirected
    raise AuthorizationError("Redirect limit reached")


class AuthorizedSession:
    def __init__(self):
        self.headers = {}

    def request(self, method, url, **kwargs):
        kwargs["headers"] = {**self.headers, **(kwargs.get("headers") or {})}
        return authorized_request(method, url, **kwargs)

    def get(self, url, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self.request("POST", url, **kwargs)

    def head(self, url, **kwargs):
        return self.request("HEAD", url, **kwargs)

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
