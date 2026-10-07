"""Run the reviewed Graphify CLI with network and subprocess audit guards.

This is defense in depth for the pinned Python dependencies, not an operating
system sandbox. No graph, file contents, or credentials are printed by this guard.
"""
import os
import pathlib
import runpy
import sys


def canonical(value):
    result = str(pathlib.Path(value).resolve())
    if os.name == "nt":
        if result.startswith("\\\\?\\UNC\\"):
            result = "\\\\" + result[8:]
        elif result.startswith("\\\\?\\"):
            result = result[4:]
    return pathlib.Path(result)


def extended(value):
    # CPython accepts extended Windows paths even when the host's legacy path
    # limit is enabled. Upstream cache names can otherwise exceed MAX_PATH.
    if os.name != "nt" or not os.path.isabs(value):
        return value
    result = str(canonical(value))
    return "\\\\?\\UNC\\" + result[2:] if result.startswith("\\\\") else "\\\\?\\" + result


def main():
    if len(sys.argv) < 5:
        raise SystemExit("Expected runtime directory, data directory and CLI operation")
    runtime = canonical(sys.argv[1])
    data = canonical(sys.argv[2])
    operation = sys.argv[3]
    if operation not in {"extract", "query", "affected", "path", "explain"}:
        raise SystemExit("Graphify operation is not permitted")
    roots = (runtime, data)

    def inside(value):
        if isinstance(value, int):
            return True
        if value is None:
            return True
        if os.fspath(value).lower() in {"nul", "/dev/null"}:
            return True
        resolved = canonical(value)
        return any(resolved == root or root in resolved.parents for root in roots)

    def audit(event, args):
        if event in {"socket.connect", "socket.bind", "socket.getaddrinfo", "subprocess.Popen", "os.system", "os.posix_spawn", "os.exec"}:
            raise PermissionError("Graphify local analysis forbids network and external processes")
        if event == "open" and not inside(args[0]):
            raise PermissionError("Graphify cannot open a path outside its private runtime and selected data")
        if event in {"os.listdir", "os.scandir", "os.remove", "os.rmdir", "os.mkdir", "os.chmod", "os.truncate"} and not inside(args[0]):
            raise PermissionError("Graphify cannot access a path outside its private runtime and selected data")
        if event in {"os.rename", "os.link", "os.symlink"} and not all(inside(value) for value in args[:2]):
            raise PermissionError("Graphify cannot change paths outside its private runtime and selected data")

    sys.addaudithook(audit)
    sys.argv = ["graphify", operation, *(extended(value) for value in sys.argv[4:])]
    runpy.run_module("graphify", run_name="__main__")


if __name__ == "__main__":
    main()
