"""Install only the wheel bytes frozen in an Agent Forge provision plan."""
import pathlib
import runpy
import sys

if __name__ == "__main__":
    wheel_directory = pathlib.Path(sys.argv[1]).resolve()
    requirements = pathlib.Path(sys.argv[2]).resolve()
    bootstrap = pathlib.Path(sys.argv[3]).resolve()
    if bootstrap.parent != wheel_directory or bootstrap.suffix != ".whl":
        raise SystemExit("Invalid pip bootstrap wheel")
    sys.path.insert(0, str(bootstrap))
    sys.argv = ["pip", "--isolated", "--disable-pip-version-check", "install", "--no-index",
                "--no-cache-dir", "--no-deps", "--no-compile", "--require-hashes", "--only-binary=:all:",
                "--find-links", str(wheel_directory), "--requirement", str(requirements)]
    # Match `python -m pip` so pip's Windows self-upgrade guard sees __main__.py,
    # rather than mistaking this private bootstrap for a running pip.exe launcher.
    runpy.run_module("pip", run_name="__main__", alter_sys=True)
